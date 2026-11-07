// tests/acceptance/wi-0011-conquistas.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-06 (7 badges, nível só no 42cursus). Revê antes do commit: depois
// de entrar, isto é o contrato. O conteúdo do catálogo é do humano; este
// contrato fixa a forma, as regras e os ids. Dados inventados.
import { readFileSync } from 'node:fs';

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { badgeCatalogSchema, earnedBadges } from '../../src/badges/badges.js';
import type { PassportSnapshot } from '../../src/passport/passport.js';

const CATALOG = 'src/badges/catalog.json';

const project = (
  slug: string,
  status: string,
  validated: boolean | null,
  finalMark: number | null
) => ({ slug, name: slug, status, validated, finalMark });

const snapshot = (overrides: Partial<PassportSnapshot> = {}): PassportSnapshot => ({
  login: 'pato-teste',
  campus: 'Campus Sintético',
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  coalition: null,
  cursus: [{ slug: '42cursus', name: '42cursus', level: 5.179 }],
  projects: [project('p1', 'finished', true, 115), project('p2', 'finished', false, 42)],
  ...overrides,
});

const ids = (s: PassportSnapshot): string[] => earnedBadges(s).map((b) => b.id);

describe('WI-0011 — conquistas', () => {
  it('AC2: o catálogo versionado é válido, com ids únicos e textos não vazios', () => {
    const raw: unknown = JSON.parse(readFileSync(CATALOG, 'utf8'));
    const catalog = badgeCatalogSchema.parse(raw);
    expect(catalog.map((b) => b.id)).toEqual([
      'first-validation',
      'max-mark',
      'level-5',
      'level-10',
      'level-15',
      'level-21',
      'alumni',
    ]);
    for (const badge of catalog) {
      expect(badge.name.trim()).not.toBe('');
      expect(badge.description.trim()).not.toBe('');
    }
  });

  it.each([
    [
      'ids repetidos',
      [
        { id: 'x', name: 'X', description: 'D', rule: { kind: 'alumni' } },
        { id: 'x', name: 'Y', description: 'D', rule: { kind: 'alumni' } },
      ],
    ],
    ['nome vazio', [{ id: 'x', name: ' ', description: 'D', rule: { kind: 'alumni' } }]],
    ['descrição vazia', [{ id: 'x', name: 'X', description: '', rule: { kind: 'alumni' } }]],
    ['regra desconhecida', [{ id: 'x', name: 'X', description: 'D', rule: { kind: 'magic' } }]],
    // AC4: nenhuma regra pode olhar para projetos falhados ou em curso
    [
      'regra sobre projetos falhados',
      [{ id: 'x', name: 'X', description: 'D', rule: { kind: 'failed-count', min: 1 } }],
    ],
    [
      'regra sobre projetos em curso',
      [{ id: 'x', name: 'X', description: 'D', rule: { kind: 'in-progress-count', min: 1 } }],
    ],
    ['nível sem mínimo', [{ id: 'x', name: 'X', description: 'D', rule: { kind: 'level' } }]],
  ])('AC2/AC4: o schema recusa um catálogo com %s', (_case, catalog) => {
    expect(badgeCatalogSchema.safeParse(catalog).success).toBe(false);
  });

  it('AC1: primeira validação e nível 5, pela ordem do catálogo', () => {
    expect(ids(snapshot())).toEqual(['first-validation', 'level-5']);
  });

  it('AC1: nota máxima só com 125 num projeto validado', () => {
    expect(ids(snapshot({ projects: [project('p', 'finished', true, 125)] }))).toContain(
      'max-mark'
    );
    expect(ids(snapshot({ projects: [project('p', 'finished', true, 124)] }))).not.toContain(
      'max-mark'
    );
    // 125 num projeto não validado não conta
    expect(ids(snapshot({ projects: [project('p', 'finished', false, 125)] }))).not.toContain(
      'max-mark'
    );
  });

  it('AC1: os marcos de nível contam só o 42cursus', () => {
    const level = (l: number) =>
      ids(snapshot({ projects: [], cursus: [{ slug: '42cursus', name: '42cursus', level: l }] }));
    expect(level(4.99)).toEqual([]);
    expect(level(5)).toEqual(['level-5']);
    expect(level(14.99)).toEqual(['level-5', 'level-10']);
    expect(level(21)).toEqual(['level-5', 'level-10', 'level-15', 'level-21']);
    const piscineOnly = snapshot({
      projects: [],
      cursus: [{ slug: 'c-piscine', name: 'C Piscine', level: 12 }],
    });
    expect(ids(piscineOnly)).toEqual([]);
  });

  it('AC1: Alumni vem só de isAlumni', () => {
    expect(ids(snapshot({ isAlumni: true, projects: [] }))).toContain('alumni');
    expect(ids(snapshot({ isAlumni: false, projects: [] }))).not.toContain('alumni');
  });

  it('AC4: projetos falhados ou em curso nunca dão badges', () => {
    const onlyBad = snapshot({
      cursus: [],
      projects: [
        project('a', 'finished', false, 125),
        project('b', 'in_progress', null, null),
        project('c', 'waiting_for_correction', null, 125),
      ],
    });
    expect(ids(onlyBad)).toEqual([]);
  });

  it('AC3: cada badge conquistada traz nome e descrição do catálogo', () => {
    for (const badge of earnedBadges(snapshot({ isAlumni: true }))) {
      expect(badge.name.trim()).not.toBe('');
      expect(badge.description.trim()).not.toBe('');
      expect(badge).not.toHaveProperty('rule');
    }
  });

  it('AC5: o mesmo snapshot dá sempre as mesmas badges', () => {
    const arbitrarySnapshot = fc.record({
      isAlumni: fc.boolean(),
      level: fc.double({ min: 0, max: 30, noNaN: true }),
      marks: fc.array(
        fc.record({
          validated: fc.option(fc.boolean(), { nil: null }),
          mark: fc.option(fc.integer({ min: 0, max: 125 }), { nil: null }),
          finished: fc.boolean(),
        }),
        { maxLength: 8 }
      ),
    });
    fc.assert(
      fc.property(arbitrarySnapshot, ({ isAlumni, level, marks }) => {
        const s = snapshot({
          isAlumni,
          cursus: [{ slug: '42cursus', name: '42cursus', level }],
          projects: marks.map((m, i) =>
            project(`p${String(i)}`, m.finished ? 'finished' : 'in_progress', m.validated, m.mark)
          ),
        });
        const first = earnedBadges(s);
        expect(earnedBadges(structuredClone(s))).toEqual(first);
        // E nunca muda a ordem do catálogo.
        const order = [
          'first-validation',
          'max-mark',
          'level-5',
          'level-10',
          'level-15',
          'level-21',
          'alumni',
        ];
        const got = first.map((b) => b.id);
        expect(got).toEqual(order.filter((id) => got.includes(id)));
      }),
      { numRuns: 500 }
    );
  });
});
