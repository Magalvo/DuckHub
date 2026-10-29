#!/usr/bin/env node
/**
 * Guarda dos caminhos protegidos — lê a fonte única `.agent/protected-paths`.
 *
 * Subcomandos:
 *   check  --staged | --files <ficheiro> | --base <ref>  [--approved true]
 *          Falha (exit 1) se houver alterações em caminhos protegidos sem
 *          aprovação humana (ACCEPT_CONTRACT_CHANGE=1 ou --approved true).
 *   verify Falha se CODEOWNERS / regras do Claude Code divergirem da lista.
 *   sync   [--owner @handle]  Regenera os ficheiros derivados. HUMANO: escreve
 *          em ficheiros protegidos, por isso o sandbox impede o agente de o correr.
 *   list   Mostra a lista interpretada.
 *
 * Também exporta funções usadas por .claude/hooks/bash-guard.mjs.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('..', import.meta.url));
const LIST_FILE = '.agent/protected-paths';

export function loadList(root = ROOT) {
  return readFileSync(join(root, LIST_FILE), 'utf8')
    .split('\n')
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean)
    .map((line) => {
      const [tier, pattern] = line.split(/\s+/);
      if (!['contract', 'guardrail'].includes(tier) || !pattern) {
        throw new Error(`${LIST_FILE}: linha inválida "${line}"`);
      }
      return { tier, pattern, regex: globToRegex(pattern) };
    });
}

function globToRegex(pattern) {
  let re = '';
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    if (ch === '*' && pattern[i + 1] === '*') {
      re += '.*';
      i++;
    } else if (ch === '*') {
      re += '[^/]*';
    } else {
      re += ch.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

export function match(path, list) {
  const clean = path.replace(/^\.\//, '');
  return list.find((entry) => entry.regex.test(clean)) ?? null;
}

/** Parte literal de cada padrão (antes do primeiro `*`), para a guarda de Bash. */
export function literalPrefixes(list) {
  return list.map((e) => e.pattern.split('*')[0]).filter((p) => p.length > 0);
}

// ---------- ficheiros derivados ----------

const CODEOWNERS_HEADER = `# GERADO a partir de .agent/protected-paths — não editar à mão.
# Regenerar: node scripts/protected-paths.mjs sync (humano).
# Com "Require review from Code Owners" ativo na branch protection, qualquer PR
# que toque nestes caminhos precisa da aprovação do dono — inclusive alterações
# aos próprios scripts e workflows que fazem as verificações.
`;

function renderCodeowners(list, owner) {
  const width = Math.max(...list.map((e) => e.pattern.length)) + 2;
  const lines = list.map((e) => `/${e.pattern}`.padEnd(width + 1) + owner);
  return `${CODEOWNERS_HEADER}\n${lines.join('\n')}\n`;
}

function ownerFrom(content) {
  return /\s(@[\w./-]+)\s*$/m.exec(content)?.[1] ?? null;
}

function editDenyRules(list) {
  return list.map((e) => `Edit(/${e.pattern})`);
}

function renderSettings(content, list) {
  const settings = JSON.parse(content);
  const deny = settings.permissions?.deny ?? [];
  const others = deny.filter((rule) => !rule.startsWith('Edit('));
  settings.permissions = { ...settings.permissions, deny: [...editDenyRules(list), ...others] };
  return `${JSON.stringify(settings, null, 2)}\n`;
}

function derivedFiles(root, list, ownerOverride) {
  const out = [];
  out.push({ path: '.agent/templates/CODEOWNERS', content: renderCodeowners(list, '@OWNER') });

  const realOwners = join(root, '.github/CODEOWNERS');
  if (existsSync(realOwners)) {
    const owner = ownerOverride ?? ownerFrom(readFileSync(realOwners, 'utf8')) ?? '@OWNER';
    out.push({ path: '.github/CODEOWNERS', content: renderCodeowners(list, owner) });
  }

  for (const path of ['.agent/templates/claude-settings.json', '.claude/settings.json']) {
    const full = join(root, path);
    if (existsSync(full)) {
      out.push({ path, content: renderSettings(readFileSync(full, 'utf8'), list) });
    }
  }
  return out;
}

// ---------- alterações a verificar ----------

function changedFiles(args) {
  const git = (...a) => execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' });
  let raw;
  if (args.includes('--staged')) raw = git('diff', '--cached', '--name-only', '--no-renames');
  else if (args.includes('--base'))
    raw = git('diff', '--name-only', '--no-renames', `${argValue(args, '--base')}...HEAD`);
  else if (args.includes('--files')) raw = readFileSync(argValue(args, '--files'), 'utf8');
  else throw new Error('check precisa de --staged, --base <ref> ou --files <ficheiro>');
  return raw
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function argValue(args, flag) {
  const value = args[args.indexOf(flag) + 1];
  if (!value) throw new Error(`${flag} precisa de um valor`);
  return value;
}

// ---------- CLI ----------

function main(argv) {
  const [cmd, ...args] = argv;
  const list = loadList();

  if (cmd === 'list') {
    for (const e of list) console.log(`${e.tier.padEnd(10)} ${e.pattern}`);
    return 0;
  }

  if (cmd === 'check') {
    const hits = changedFiles(args)
      .map((path) => ({ path, entry: match(path, list) }))
      .filter((h) => h.entry);
    if (hits.length === 0) {
      console.log('✓ Nenhum caminho protegido alterado.');
      return 0;
    }
    const approved =
      process.env.ACCEPT_CONTRACT_CHANGE === '1' ||
      (args.includes('--approved') && argValue(args, '--approved') === 'true');
    const tiers = { contract: 'CONTRATO', guardrail: 'GUARDRAIL' };
    if (approved) console.log('⚠ Caminhos protegidos alterados (aprovado por humano):');
    else console.error('✗ BLOQUEADO — alterações a caminhos protegidos:');
    for (const h of hits) {
      const line = `    [${tiers[h.entry.tier]}] ${h.path}`;
      if (approved) console.log(line);
      else console.error(line);
    }
    if (approved) return 0;
    console.error(`
  Contrato: o que define "correto" (testes de aceitação, datasets e thresholds).
  Guardrail: o que define como se verifica (scripts, configs, workflows, regras).
  Um agente não muda nenhum dos dois: se um teste falha, corrige-se o código.

  Se foste TU (humano) a decidir esta alteração:
    local:  ACCEPT_CONTRACT_CHANGE=1 git commit ...
    no PR:  label "contract-change-approved" + review do code owner
  e regista o porquê num ADR (docs/adr/).
`);
    return 1;
  }

  if (cmd === 'verify' || cmd === 'sync') {
    const ownerOverride = args.includes('--owner') ? argValue(args, '--owner') : undefined;
    const files = derivedFiles(ROOT, list, ownerOverride);
    const same = (path, a, b) =>
      path.endsWith('.json')
        ? JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b))
        : a === b;
    const drifted = files.filter(
      (f) => !same(f.path, readFileSync(join(ROOT, f.path), 'utf8'), f.content)
    );
    if (cmd === 'sync') {
      for (const f of drifted) writeFileSync(join(ROOT, f.path), f.content);
      console.log(
        drifted.length
          ? `✓ Atualizados: ${drifted.map((f) => f.path).join(', ')}`
          : '✓ Já sincronizado.'
      );
      return 0;
    }
    if (drifted.length) {
      console.error('✗ Ficheiros derivados fora de sincronia com .agent/protected-paths:');
      for (const f of drifted) console.error(`    ${f.path}`);
      console.error('  Um humano deve correr: node scripts/protected-paths.mjs sync');
      return 1;
    }
    console.log(`✓ Proteções sincronizadas (${list.length} padrões, ${files.length} ficheiros).`);
    return 0;
  }

  console.error('uso: protected-paths.mjs <check|verify|sync|list> [opções]');
  return 2;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    process.exit(main(process.argv.slice(2)));
  } catch (err) {
    console.error(`✗ ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
}
