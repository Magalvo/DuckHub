// tests/acceptance/wi-0006-mundo-real.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-05 (JSON validado por Zod, só o Common Core, vários slugs por
// entrada). Revê antes do commit: depois de entrar, isto é o contrato. O
// conteúdo da tabela é do humano; este contrato só fixa a forma e o exemplo
// do AC1. Slugs confirmados com uma chamada real a /v2/cursus/21/projects.
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { realWorldFor, realWorldTableSchema } from '../../src/passport/real-world.js';

const TABLE = 'src/passport/real-world.json';
const MINISHELL = '42cursus-minishell';

describe('WI-0006 — tradução "mundo real"', () => {
  it('AC1: o minishell tem uma tradução de interpretador de linha de comandos em C', () => {
    const minishell = realWorldFor(MINISHELL);
    expect(minishell).not.toBeNull();
    const text = `${minishell?.title ?? ''} ${minishell?.description ?? ''}`;
    expect(text).toMatch(/shell|command[- ]line/i);
    expect(text).toMatch(/\bC\b/);
  });

  it('AC1: os vários slugs do mesmo projeto dão a mesma tradução', () => {
    expect(realWorldFor('cub3d')).not.toBeNull();
    expect(realWorldFor('cub3d')).toEqual(realWorldFor('42cursus-cub3d'));
  });

  it('AC2: um slug fora da tabela não tem tradução', () => {
    expect(realWorldFor('projeto-sintetico-que-nao-existe')).toBeNull();
    expect(realWorldFor('')).toBeNull();
  });

  it('AC3: a tabela versionada é válida, com slugs únicos e textos não vazios', () => {
    const raw: unknown = JSON.parse(readFileSync(TABLE, 'utf8'));
    expect(Array.isArray(raw)).toBe(true);
    const table = realWorldTableSchema.parse(raw);
    expect(table.length).toBeGreaterThan(0);
    const slugs = table.flatMap((e) => e.slugs);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const entry of table) {
      expect(entry.slugs.length).toBeGreaterThan(0);
      expect(entry.title.trim()).not.toBe('');
      expect(entry.description.trim()).not.toBe('');
      for (const slug of entry.slugs) {
        expect(slug.trim()).not.toBe('');
        // Cada slug da tabela dá exatamente a entrada onde está.
        expect(realWorldFor(slug)).toEqual({
          title: entry.title,
          description: entry.description,
        });
      }
    }
  });

  it.each([
    [
      'um slug repetido entre entradas',
      [
        { slugs: ['x'], title: 'T', description: 'D' },
        { slugs: ['y', 'x'], title: 'T2', description: 'D2' },
      ],
    ],
    ['um slug repetido na mesma entrada', [{ slugs: ['x', 'x'], title: 'T', description: 'D' }]],
    ['uma entrada sem slugs', [{ slugs: [], title: 'T', description: 'D' }]],
    ['um slug vazio', [{ slugs: [' '], title: 'T', description: 'D' }]],
    ['título vazio', [{ slugs: ['x'], title: '  ', description: 'D' }]],
    ['descrição vazia', [{ slugs: ['x'], title: 'T', description: '' }]],
    ['campo em falta', [{ slugs: ['x'], title: 'T' }]],
    ['não é uma lista', { x: { title: 'T', description: 'D' } }],
  ])('AC3: o schema recusa uma tabela com %s', (_case, table) => {
    expect(realWorldTableSchema.safeParse(table).success).toBe(false);
  });

  it('AC4: a procura é pelo slug da API, não pelo nome', () => {
    expect(realWorldFor(MINISHELL)).not.toBeNull();
    // O nome do projeto, ou um slug parecido, não chegam.
    expect(realWorldFor('minishell')).toBeNull();
    expect(realWorldFor('Minishell')).toBeNull();
    expect(realWorldFor('42cursus-Minishell')).toBeNull();
    expect(realWorldFor(` ${MINISHELL}`)).toBeNull();
  });
});
