#!/usr/bin/env node
/**
 * PreToolUse (Bash) — bloqueia, ANTES de correr, comandos que contornariam as
 * guardas: saltar hooks, autoaprovar alterações ao contrato, desligar o loop
 * de auto-correção, ou escrever em caminhos protegidos.
 *
 * É uma camada de deteção por texto, por isso é contornável por ofuscação.
 * O bloqueio real de escritas é o sandbox do Claude Code (as regras Edit deny
 * entram na configuração do sandbox) e, no fim, o CI com review do code owner.
 * Esta guarda existe para dar ao agente uma explicação clara no momento em que
 * tenta, em vez de um "Operation not permitted" sem contexto.
 *
 * Protocolo: lê o evento em stdin; para negar, escreve JSON com
 * permissionDecision "deny" e sai com 0.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

let input = {};
try {
  input = JSON.parse(readFileSync(0, 'utf8') || '{}');
} catch {
  // sem input válido, não há nada a avaliar
}
if (input.tool_name !== 'Bash') process.exit(0);
const command = String(input.tool_input?.command ?? '');

const root = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();
const { loadList, literalPrefixes } = await import(
  join(root, 'scripts', 'protected-paths.mjs')
).catch(() => ({ loadList: null, literalPrefixes: null }));

const FORBIDDEN = [
  [/--no-verify\b/, 'saltar os hooks de git (--no-verify)'],
  [/\bACCEPT_CONTRACT_CHANGE\b/, 'autoaprovar alterações a caminhos protegidos'],
  [/\bDIFF_BUDGET_OVERRIDE\b/, 'ultrapassar o orçamento de diff'],
  [/\b(CLAUDE_CODE_STOP_HOOK_BLOCK_CAP|SELF_HEAL_\w+)\b/, 'desligar o loop de auto-correção'],
  [/\bapply-proposals\b|protected-paths\.mjs\s+sync\b/, 'aplicar propostas (ação humana)'],
  [/\blefthook\s+uninstall\b|core\.hooksPath/, 'desativar os hooks de git'],
];

// Comandos em que só o DESTINO (último argumento) é escrito.
const COPY_CMD = /^(cp|mv|install|ln)\b/;
// Comandos que escrevem em qualquer caminho que recebam.
const WRITE_CMD =
  /^(sed\s+(-\w+\s+)*-i|perl\s+-\w*i|rm|tee|truncate|dd|chmod|touch|git\s+(checkout|restore|apply|rm|mv))\b/;
// Escrita a partir de código inline (node -e, python -c…): caminhos entre aspas.
const WRITE_API =
  /\b(writeFile|appendFile|rmSync|unlink|renameSync|copyFile)\w*|open\([^)]*['"][wa]/;

function writesProtected(cmd, prefixes) {
  const isProtected = (raw) => {
    const t = raw.replace(/^["']|["']$/g, '').replace(/^\.\//, '');
    return prefixes.some((p) => t === p.replace(/\/$/, '') || t.startsWith(p));
  };
  // Redireções: `> Makefile`, `>> tests/acceptance/x`
  for (const m of cmd.matchAll(/>{1,2}\s*([^\s;|&]+)/g)) {
    if (m[1] !== undefined && isProtected(m[1])) return m[1];
  }
  for (const segment of cmd.split(/&&|\|\||;|\||\n/)) {
    const s = segment.trim().replace(/^(sudo|env\s+(\S+=\S+\s+)*)/, '');
    const args = s
      .split(/\s+/)
      .slice(1)
      .filter((a) => a && !a.startsWith('-'));
    if (COPY_CMD.test(s)) {
      const dest = args.at(-1);
      if (dest !== undefined && isProtected(dest)) return s;
    } else if (WRITE_CMD.test(s)) {
      if (args.some(isProtected)) return s;
    } else if (WRITE_API.test(s)) {
      // Código inline tem aspas aninhadas: parte em fragmentos e testa cada um.
      const fragments = s.split(/[\s"'`(),;]+/).filter(Boolean);
      if (fragments.some(isProtected)) return s;
    }
  }
  return null;
}

const reasons = FORBIDDEN.filter(([re]) => re.test(command)).map(([, why]) => why);

if (loadList && literalPrefixes) {
  try {
    const prefixes = [...literalPrefixes(loadList(root)), '.git/hooks'];
    const hit = writesProtected(command, prefixes);
    if (hit) reasons.push(`escrever num caminho protegido (${hit.slice(0, 80)})`);
  } catch {
    reasons.push('a lista de caminhos protegidos não pôde ser lida');
  }
} else {
  reasons.push('scripts/protected-paths.mjs não pôde ser carregado');
}

if (reasons.length === 0) process.exit(0);

const reason = [
  `Bloqueado pela guarda do projeto: ${reasons.join('; ')}.`,
  'Os caminhos protegidos (.agent/protected-paths) e os mecanismos de verificação',
  'não se alteram para fazer um check passar: corrige o código em causa.',
  'Se achas que um ficheiro protegido precisa mesmo de mudar, escreve a versão',
  'proposta em .agent/proposals/<mesmo caminho> e explica ao utilizador porquê;',
  'é ele que decide e aplica.',
].join(' ');

console.log(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  })
);
process.exit(0);
