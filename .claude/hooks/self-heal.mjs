#!/usr/bin/env node
/**
 * Stop hook — o loop de auto-correção (self-healing loop).
 *
 * Quando o agente quer dar o trabalho por terminado e ALTEROU ficheiros desde
 * o teu último pedido, corre `make check`. Se falhar, impede-o de parar e
 * devolve-lhe as falhas, para corrigir o CÓDIGO. As guardas (sandbox,
 * caminhos protegidos) garantem que o único caminho para verde é esse.
 *
 * Dois modos:
 *   --mark  (UserPromptSubmit) regista o estado do working tree no início de
 *           cada pedido e recomeça a contagem de tentativas.
 *   (Stop)  só verifica se o working tree mudou desde a marca. Assim o agente
 *           pode parar para apresentar um plano ou fazer perguntas, mesmo com
 *           testes de aceitação vermelhos escritos por ti (TDD).
 *
 * Saída explícita: se a mensagem final do agente contiver [INPUT-HUMANO], ele
 * pode parar com o check vermelho. Não deixa nada verde por atalho: só
 * devolve a decisão ao humano.
 *
 * Limites, para o loop nunca virar teimosia nem reward hacking:
 *   - no máximo SELF_HEAL_MAX tentativas (4) por sessão;
 *   - se a MESMA falha se repete 3 vezes seguidas, escala mais cedo;
 *   - ao escalar, manda o agente parar e escrever um relatório ao humano:
 *     o que falha, o que tentou, a hipótese, e que decisão precisa.
 * O total de bloqueios (MAX + 1 = 5) fica abaixo do corte automático do
 * Claude Code (8 bloqueios seguidos).
 *
 * Protocolo: lê o evento em stdin; para bloquear, escreve
 * {"decision":"block","reason":...} e sai com 0.
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const MAX = 4;
const STUCK_REPEATS = 3;

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  // sem input válido: segue com valores por defeito
}

const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
// O estado fica dentro de .claude/hooks/, que o agente não consegue escrever
// (regra deny + sandbox): assim não pode forjar o contador para escapar ao loop.
// Os hooks correm fora do sandbox. A variável serve só os testes das guardas,
// e o agente está proibido de a definir (bash-guard).
const stateDir = process.env.SELF_HEAL_TEST_STATE_DIR ?? join(root, '.claude', 'hooks', '.state');
const session = String(input.session_id ?? 'default').replace(/[^\w-]/g, '_');
const stateFile = join(stateDir, `${session}.json`);

const loadState = () => {
  try {
    return JSON.parse(readFileSync(stateFile, 'utf8'));
  } catch {
    return { attempts: 0, signatures: [], escalated: false };
  }
};
const saveState = (s) => {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify(s));
};
const block = (reason) => {
  console.log(JSON.stringify({ decision: 'block', reason }));
  process.exit(0);
};

/** Hash do conteúdo de todo o working tree (respeita .gitignore), sem tocar no índice real. */
function workingTreeHash() {
  mkdirSync(stateDir, { recursive: true });
  const env = { ...process.env, GIT_INDEX_FILE: join(stateDir, `${session}.index`) };
  const opts = { cwd: root, encoding: 'utf8', env };
  if (spawnSync('git', ['add', '-A'], opts).status !== 0) return null;
  const tree = spawnSync('git', ['write-tree'], opts);
  return tree.status === 0 ? tree.stdout.trim() : null;
}

const isRepo = spawnSync('git', ['rev-parse', '--git-dir'], { cwd: root }).status === 0;
if (!isRepo) process.exit(0);

if (process.argv.includes('--mark')) {
  saveState({ baseline: workingTreeHash(), attempts: 0, signatures: [], escalated: false });
  process.exit(0);
}

const state = loadState();

// O agente não alterou nada desde o teu pedido: pode parar (plano, perguntas).
// Sem marca (hook de início de pedido ausente), usa o git status como antes.
if (typeof state.baseline === 'string') {
  if (workingTreeHash() === state.baseline) process.exit(0);
} else {
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' });
  if (status.stdout.trim() === '') process.exit(0);
}

// Pedido explícito de input humano: pode parar, mesmo com o check vermelho.
if (String(input.last_assistant_message ?? '').includes('[INPUT-HUMANO]')) process.exit(0);

// Já escalou e o agente escreveu o relatório: deixa parar e recomeça a contagem.
if (state.escalated) {
  saveState({ baseline: state.baseline, attempts: 0, signatures: [], escalated: false });
  process.exit(0);
}

// -k: continua depois de uma etapa falhar, para o agente ver TODAS as falhas
// (formatação, tipos, lint, testes) numa só ronda.
const run = spawnSync('make', ['-k', 'check'], {
  cwd: root,
  encoding: 'utf8',
  env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  maxBuffer: 50 * 1024 * 1024,
});

if (run.status === 0) {
  saveState({ baseline: state.baseline, attempts: 0, signatures: [], escalated: false });
  process.exit(0);
}

// Resumo das falhas: linhas com marcadores de erro, sem códigos de cor.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const clean = `${run.stdout}\n${run.stderr}`.replace(ANSI, '');
const lines = clean.split('\n');
const failureLines = lines.filter((l) =>
  /(✗|×|FAIL|Error|error|AssertionError|Expected|Received|expected|Code style issues|\[warn\])/.test(
    l
  )
);
const summary = (failureLines.length ? failureLines : lines.slice(-40)).slice(0, 40).join('\n');
// Assinatura da falha sem durações nem números de linha/coluna, que mudam de
// corrida para corrida: a mesma falha tem de dar a mesma assinatura.
const normalized = failureLines
  .map((l) => l.replace(/\d+(\.\d+)?\s*m?s\b/g, '').replace(/:\d+:\d+/g, ''))
  .join('\n');
const signature = createHash('sha256').update(normalized).digest('hex').slice(0, 12);

state.attempts += 1;
state.signatures = [...state.signatures, signature].slice(-STUCK_REPEATS);
const stuck =
  state.signatures.length === STUCK_REPEATS && state.signatures.every((s) => s === signature);

if (state.attempts > MAX || stuck) {
  state.escalated = true;
  saveState(state);
  block(
    [
      stuck
        ? `A mesma falha repetiu-se ${STUCK_REPEATS} vezes seguidas.`
        : `make check continua a falhar ao fim de ${MAX} tentativas.`,
      'PÁRA de tentar corrigir e não alteres mais nada.',
      'Escreve ao utilizador um relatório curto com:',
      '(1) o que falha, (2) o que tentaste, (3) a tua hipótese da causa,',
      '(4) que decisão precisas dele. Se achas que o contrato (teste de aceitação,',
      'dataset ou threshold) está errado, explica porquê: a decisão é dele.',
      '',
      'Falhas atuais:',
      summary,
    ].join('\n')
  );
}

saveState(state);
block(
  [
    `make check falhou (tentativa ${state.attempts} de ${MAX}). Corrige o CÓDIGO e volta a correr make check.`,
    '',
    'Regras deste loop:',
    '- A falha está no teu código (src/, os testes unitários que escreveste), nunca no contrato.',
    '- Não tentes alterar testes de aceitação, datasets, thresholds, scripts ou configuração: estão protegidos.',
    '- Não faças casos especiais para os inputs dos testes nem enfraqueças asserções dos teus testes para ficar verde.',
    '- Se a falha for de formatação, corre make format.',
    '- Se precisas mesmo de mudar um ficheiro protegido, escreve a proposta em .agent/proposals/ e explica ao utilizador.',
    '- Se não consegues avançar sem uma decisão do utilizador, pergunta-lhe e termina a mensagem com [INPUT-HUMANO].',
    '',
    'Falhas:',
    summary,
  ].join('\n')
);
