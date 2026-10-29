#!/usr/bin/env node
/**
 * Aplica propostas do agente a ficheiros protegidos — AÇÃO HUMANA.
 *
 * O agente não pode escrever em caminhos protegidos (sandbox + regras deny).
 * Quando acha que um precisa de mudar, escreve a versão proposta em
 * .agent/proposals/<mesmo caminho>. Aqui, um humano vê o diff de cada ficheiro
 * e decide, um a um.
 *
 * Exige um terminal interativo: um agente a correr comandos não tem TTY, e o
 * sandbox impediria a escrita de qualquer forma.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { ROOT, loadList, match } from './protected-paths.mjs';

const PROPOSALS = join(ROOT, '.agent', 'proposals');

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error('✗ apply-proposals tem de ser corrido por um humano num terminal interativo.');
  process.exit(1);
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// Exclui o README da pasta e as notas (`<proposta>.md` ao lado da proposta).
const proposals = walk(PROPOSALS).filter(
  (f) => f !== join(PROPOSALS, 'README.md') && !(f.endsWith('.md') && existsSync(f.slice(0, -3)))
);
if (proposals.length === 0) {
  console.log('Sem propostas em .agent/proposals/.');
  process.exit(0);
}

const list = loadList();
const rl = createInterface({ input: process.stdin, output: process.stdout });
const applied = [];

for (const file of proposals) {
  const target = relative(PROPOSALS, file);
  const entry = match(target, list);
  console.log(`\n━━ ${target}  ${entry ? `[${entry.tier}]` : '[não protegido]'}`);
  if (entry?.tier === 'contract') {
    console.log(
      '⚠ O agente propõe mudar o CONTRATO. Isto costuma querer dizer que o código está\n' +
        '  errado, não o teste. Aceita só se o requisito mudou de facto.'
    );
  }
  const note = `${file}.md`;
  if (existsSync(note)) spawnSync('cat', [note], { stdio: 'inherit' });
  const dest = join(ROOT, target);
  if (existsSync(dest)) {
    spawnSync('git', ['--no-pager', 'diff', '--no-index', '--color', dest, file], {
      stdio: 'inherit',
    });
  } else {
    console.log('(ficheiro novo)');
    spawnSync('cat', [file], { stdio: 'inherit' });
  }
  const answer = (await rl.question('Aplicar esta alteração? [s/N] ')).trim().toLowerCase();
  if (answer === 's' || answer === 'sim') {
    mkdirSync(dirname(dest), { recursive: true });
    copyFileSync(file, dest);
    rmSync(file);
    rmSync(note, { force: true });
    applied.push(target);
    console.log('✓ aplicado');
  } else {
    console.log('— ignorado (a proposta fica em .agent/proposals/)');
  }
}
rl.close();

if (applied.length) {
  console.log(`\nAplicados: ${applied.join(', ')}`);
  console.log('Revê, regista o porquê num ADR, e faz commit com:');
  console.log('  ACCEPT_CONTRACT_CHANGE=1 git commit -m "..."');
  if (applied.some((p) => p === '.agent/protected-paths')) {
    console.log('A lista mudou: corre também  node scripts/protected-paths.mjs sync');
  }
}
