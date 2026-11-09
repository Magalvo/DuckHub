// tests/acceptance/wi-0024-calculadora-sem-duplicados.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com a decisão do humano
// de 2026-11-09: os slugs do mesmo projeto (os grupos de
// src/passport/real-world.json, por exemplo 42cursus-cub3d e cub3d) dão uma só
// opção na calculadora, a do primeiro slug do grupo que está na cache do
// campus. Um pedido com outro slug do grupo resolve para essa opção. O resto em
// e2e/wi-0024.e2e.ts. Revê antes do commit: depois de entrar, isto é o
// contrato. Dados inventados (os XP dos dois cub3d são diferentes de
// propósito, para se ver qual deles conta).
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { CachedProjectXp } from '../../src/calculator/store.js';
import { calculatorView, distinctProjects } from '../../src/calculator/view.js';
import type { PassportSnapshot } from '../../src/passport/passport.js';
import { realWorldSlugGroups } from '../../src/passport/real-world.js';

const FETCHED_AT = Date.UTC(2026, 10, 9, 12, 0);

const row = (slug: string, xp: number, name = slug): CachedProjectXp => ({
  slug,
  projectId: xp,
  name,
  xp,
  solo: false,
  fetchedAt: FETCHED_AT,
});

const LIBFT = row('42cursus-libft', 462, 'Libft');
const CUB_NEW = row('42cursus-cub3d', 2109, 'cub3d');
const CUB_OLD = row('cub3d', 1000, 'cub3d');
const MINISHELL = row('42cursus-minishell', 2814, 'minishell');

const GROUPS = [['42cursus-cub3d', 'cub3d']] as const;

const slugs = (projects: readonly CachedProjectXp[]) => projects.map((p) => p.slug);

describe('WI-0024 — distinctProjects', () => {
  it('AC1: os dois slugs do cub3d dão uma só linha, a do primeiro slug do grupo', () => {
    expect(slugs(distinctProjects([LIBFT, CUB_NEW, CUB_OLD, MINISHELL], GROUPS))).toEqual([
      '42cursus-libft',
      '42cursus-cub3d',
      '42cursus-minishell',
    ]);
  });

  it('AC1: só com o segundo slug do grupo na cache, fica esse', () => {
    expect(slugs(distinctProjects([LIBFT, CUB_OLD, MINISHELL], GROUPS))).toEqual([
      '42cursus-libft',
      'cub3d',
      '42cursus-minishell',
    ]);
  });

  it('AC1: o escolhido é o primeiro do grupo, mesmo que venha depois na cache; fica no seu lugar', () => {
    expect(slugs(distinctProjects([CUB_OLD, LIBFT, CUB_NEW], GROUPS))).toEqual([
      '42cursus-libft',
      '42cursus-cub3d',
    ]);
  });

  it('AC1: a linha escolhida é a da cache, sem mudanças', () => {
    expect(distinctProjects([CUB_NEW, CUB_OLD], GROUPS)).toEqual([CUB_NEW]);
  });

  it('AC2: sem grupos, ou sem slugs de grupos, nada muda', () => {
    expect(distinctProjects([LIBFT, CUB_NEW, CUB_OLD], [])).toEqual([LIBFT, CUB_NEW, CUB_OLD]);
    expect(distinctProjects([LIBFT, MINISHELL], GROUPS)).toEqual([LIBFT, MINISHELL]);
    expect(distinctProjects([], GROUPS)).toEqual([]);
  });

  it('AC1, AC2: em qualquer cache, uma linha por grupo presente e todas as outras pela ordem', () => {
    const pool = ['a', 'b', 'c', 'd', 'e', 'f'];
    const groups = [
      ['a', 'b'],
      ['c', 'd', 'e'],
    ];
    const groupOf = (slug: string) => groups.find((g) => g.includes(slug));
    fc.assert(
      fc.property(
        fc.shuffledSubarray(pool).map((picked) => picked.map((slug, i) => row(slug, i + 1))),
        (projects) => {
          const out = distinctProjects(projects, groups);
          // uma subsequência da entrada: nada novo, nada mudado, a mesma ordem
          const kept = projects.filter((p) => out.includes(p));
          expect(out).toEqual(kept);
          for (const p of projects) {
            const group = groupOf(p.slug);
            if (group === undefined) {
              expect(out).toContain(p);
            } else {
              const first = group.find((s) => projects.some((q) => q.slug === s));
              expect(out.filter((q) => group.includes(q.slug)).map((q) => q.slug)).toEqual([first]);
            }
          }
        }
      ),
      { numRuns: 500 }
    );
  });
});

// ---------- A página: calculatorView com os grupos reais ----------

const saved = {
  snapshot: {
    login: 'pato-teste',
    campus: 'Campus Sintético',
    piscine: { month: 'september', year: 2023 },
    isAlumni: false,
    coalition: null,
    cursus: [{ slug: '42cursus', name: '42cursus', level: 6.1 }],
    projects: [],
  } satisfies PassportSnapshot,
  syncedAt: FETCHED_AT,
};

describe('WI-0024 — calculadora com os grupos de real-world.json', () => {
  it('os grupos reais incluem o cub3d e o miniRT', () => {
    expect(realWorldSlugGroups).toContainEqual(['42cursus-cub3d', 'cub3d']);
    expect(realWorldSlugGroups).toContainEqual(['42cursus-minirt', 'minirt']);
  });

  it('AC1: a lista do formulário tem um só cub3d', () => {
    const view = calculatorView({ saved, projects: [LIBFT, CUB_NEW, CUB_OLD], query: {} });
    if (view.kind !== 'form') throw new Error(`esperava o formulário, veio ${view.kind}`);
    expect(view.projects).toEqual([
      { slug: '42cursus-libft', name: 'Libft' },
      { slug: '42cursus-cub3d', name: 'cub3d' },
    ]);
  });

  it.each([
    ['cub3d', [LIBFT, CUB_NEW, CUB_OLD], '42cursus-cub3d', 2109],
    ['42cursus-cub3d', [LIBFT, CUB_NEW, CUB_OLD], '42cursus-cub3d', 2109],
    ['42cursus-cub3d', [LIBFT, CUB_OLD], 'cub3d', 1000],
    ['cub3d', [LIBFT, CUB_OLD], 'cub3d', 1000],
  ])(
    'AC3: ?project=%s com nota 100 calcula com o slug escolhido e deixa-o selecionado',
    (project, projects, selected, gained) => {
      const view = calculatorView({ saved, projects, query: { project, mark: '100' } });
      if (view.kind !== 'form') throw new Error(`esperava o formulário, veio ${view.kind}`);
      expect(view.selected).toBe(selected);
      expect(view.projectError).toBeNull();
      expect(view.result?.gained).toBe(gained);
    }
  );

  it.each(['nope', 'minirt', '42cursus-minirt'])(
    'AC4: ?project=%s (fora da cache) continua a dar unknownProject',
    (project) => {
      const view = calculatorView({
        saved,
        projects: [LIBFT, CUB_NEW, CUB_OLD],
        query: { project, mark: '100' },
      });
      if (view.kind !== 'form') throw new Error(`esperava o formulário, veio ${view.kind}`);
      expect(view.projectError).toBe('unknownProject');
      expect(view.result).toBeNull();
    }
  );
});
