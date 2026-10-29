#!/usr/bin/env node
/**
 * Estado do onboarding — o que já está configurado e o que ainda precisa
 * de decisão humana.
 *
 * Usado pelo agente no início da skill de onboarding
 * (.claude/skills/onboarding/SKILL.md) para perguntar só o que falta,
 * e por humanos via `make onboard-status`.
 *
 * Uso:
 *   node scripts/onboarding-status.mjs           → lista legível
 *   node scripts/onboarding-status.mjs --json    → para agentes
 *   node scripts/onboarding-status.mjs --strict  → exit 1 se houver pendentes
 *
 * Cada verificação tem o `block` da skill que a resolve (A–G).
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const at = (...p) => join(ROOT, ...p);
const read = (...p) => (existsSync(at(...p)) ? readFileSync(at(...p), 'utf8') : '');
const list = (...p) => (existsSync(at(...p)) ? readdirSync(at(...p)) : []);

function locked() {
  try {
    const s = JSON.parse(read('.claude', 'settings.json'));
    return (
      s.sandbox?.enabled === true &&
      s.permissions?.disableBypassPermissionsMode === 'disable' &&
      Array.isArray(s.hooks?.Stop) &&
      Array.isArray(s.hooks?.PreToolUse)
    );
  } catch {
    return false;
  }
}

const checks = [
  {
    id: 'git',
    block: 'F',
    label: 'Repositório git inicializado',
    ok: existsSync(at('.git')),
    fix: 'git init',
  },
  {
    id: 'deps',
    block: 'F',
    label: 'Dependências instaladas',
    ok: existsSync(at('node_modules')),
    fix: 'npm install',
  },
  {
    id: 'hooks',
    block: 'F',
    label: 'Hooks de git ativos (lefthook)',
    ok: read('.git', 'hooks', 'pre-commit').includes('lefthook'),
    fix: 'npx lefthook install (depois de git init)',
  },
  {
    id: 'agents-purpose',
    block: 'B',
    label: 'AGENTS.md adaptado ao projeto (sem marcador SUBSTITUIR)',
    ok: !read('AGENTS.md').includes('SUBSTITUIR'),
    fix: 'Bloco B da skill de onboarding',
  },
  {
    id: 'claude-md',
    block: 'E',
    label: 'CLAUDE.md a apontar para o AGENTS.md',
    ok: existsSync(at('CLAUDE.md')),
    fix: 'Bloco E (só se usares Claude Code)',
    optional: true,
  },
  {
    id: 'locked',
    block: 'fecho',
    label: 'Projeto trancado: sandbox, guarda de Bash e loop de auto-correção ativos',
    ok: locked(),
    fix: 'Fecho da skill — escrever .claude/settings.json a partir do template',
  },
  {
    id: 'protection-sync',
    block: 'C',
    label: 'CODEOWNERS e regras do agente sincronizados com .agent/protected-paths',
    ok: spawnSync('node', [at('scripts', 'protected-paths.mjs'), 'verify']).status === 0,
    fix: 'node scripts/protected-paths.mjs sync (humano)',
  },
  {
    id: 'codeowners',
    block: 'C',
    label: 'CODEOWNERS a proteger o contrato',
    ok: existsSync(at('.github', 'CODEOWNERS')),
    fix: 'Bloco C — precisa do handle GitHub do dono do contrato',
  },
  {
    id: 'example-domain',
    block: 'G',
    label: 'Domínio de exemplo removido (src/order.ts)',
    ok: !existsSync(at('src', 'order.ts')),
    fix: 'Bloco G — exige commit humano com ACCEPT_CONTRACT_CHANGE=1',
  },
  {
    id: 'real-track',
    block: 'G',
    label: 'Pelo menos um work-track real (além do exemplo WT-0001)',
    ok: list('specs', 'tracks').some((f) => f.endsWith('.md') && !f.startsWith('WT-0001-exemplo')),
    fix: 'Bloco G — make new-track',
  },
  {
    id: 'onboarding-adr',
    block: 'fecho',
    label: 'Decisões do onboarding registadas em ADR',
    ok: list('docs', 'adr').some((f) => f.includes('onboarding')),
    fix: 'Fecho da skill — docs/adr/0003-onboarding.md',
  },
];

// Camadas opcionais: informativo, não pendente. A decisão fica no ADR.
const layers = {
  evals: existsSync(at('evals')),
  formal: existsSync(at('formal')),
};

const pending = checks.filter((c) => !c.ok && !c.optional);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ checks, layers, pendingCount: pending.length }, null, 2));
} else {
  console.log('\nEstado do onboarding\n');
  for (const c of checks) {
    const icon = c.ok ? '✓' : c.optional ? '○' : '✗';
    console.log(`  ${icon} [${c.block}] ${c.label}${c.ok ? '' : `\n        → ${c.fix}`}`);
  }
  console.log(
    `\n  Camadas opcionais presentes: evals=${layers.evals ? 'sim' : 'não'}, ` +
      `formal=${layers.formal ? 'sim' : 'não'} (decisão do bloco D)`
  );
  console.log(
    pending.length === 0
      ? '\n✓ Onboarding completo.\n'
      : `\n${pending.length} pendente(s). Pede ao teu agente: "faz o onboarding deste projeto".\n`
  );
}

if (process.argv.includes('--strict') && pending.length > 0) process.exit(1);
