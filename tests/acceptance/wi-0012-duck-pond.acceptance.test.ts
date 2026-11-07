// tests/acceptance/wi-0012-duck-pond.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-07 (a badge substitui a subida de nível quando coincidem; um
// salto de vários níveis dá um só evento). Revê antes do commit: depois de
// entrar, isto é o contrato. Dados inventados.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { PassportSnapshot } from '../../src/passport/passport.js';
import { diffEvents, pondEventSchema, type PondEvent } from '../../src/pond/events.js';

type Project = PassportSnapshot['projects'][number];

const project = (
  slug: string,
  status: string,
  validated: boolean | null,
  finalMark: number | null
): Project => ({ slug, name: `Projeto ${slug}`, status, validated, finalMark });

const done = (slug: string, mark = 100) => project(slug, 'finished', true, mark);

const snapshot = (overrides: Partial<PassportSnapshot> = {}): PassportSnapshot => ({
  login: 'pato-teste',
  campus: 'Campus Sintético',
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  coalition: null,
  cursus: [{ slug: '42cursus', name: '42cursus', level: 3.5 }],
  projects: [done('libft')],
  ...overrides,
});

const at = (level: number) => [{ slug: '42cursus', name: '42cursus', level }];

describe('WI-0012 — eventos de uma sincronização', () => {
  it('AC2: a primeira sincronização não gera eventos do passado', () => {
    const rich = snapshot({ isAlumni: true, cursus: at(21), projects: [done('a', 125)] });
    expect(diffEvents(null, rich)).toEqual([]);
  });

  it('AC3: sem mudanças, nenhum evento', () => {
    const s = snapshot();
    expect(diffEvents(s, structuredClone(s))).toEqual([]);
  });

  it('AC1: um projeto que passou a validado dá um evento com nome e nota', () => {
    const before = snapshot({
      projects: [done('libft'), project('gnl', 'in_progress', null, null)],
    });
    const after = snapshot({ projects: [done('libft'), done('gnl', 112)] });
    expect(diffEvents(before, after)).toEqual([
      { kind: 'project-validated', slug: 'gnl', name: 'Projeto gnl', finalMark: 112 },
    ]);
  });

  it('AC1: falhados, em curso e os que já estavam validados não dão eventos', () => {
    const before = snapshot({ projects: [done('libft'), done('printf')] });
    const after = snapshot({
      projects: [
        done('libft'),
        project('printf', 'finished', false, 42), // reavaliado e falhado
        project('gnl', 'finished', false, 30),
        project('pipex', 'in_progress', null, null),
        project('minitalk', 'waiting_for_correction', null, 125),
      ],
    });
    expect(diffEvents(before, after)).toEqual([]);
  });

  it('AC1: a primeira validação dá o evento do projeto e o da badge', () => {
    const before = snapshot({ projects: [project('libft', 'in_progress', null, null)] });
    const after = snapshot({ projects: [done('libft', 100)] });
    expect(diffEvents(before, after)).toEqual([
      { kind: 'project-validated', slug: 'libft', name: 'Projeto libft', finalMark: 100 },
      { kind: 'badge', badgeId: 'first-validation' },
    ]);
  });

  it('AC1: subida de nível inteiro no 42cursus', () => {
    expect(diffEvents(snapshot({ cursus: at(3.9) }), snapshot({ cursus: at(4.2) }))).toEqual([
      { kind: 'level-up', level: 4 },
    ]);
    // Dentro do mesmo inteiro, ou a descer: nada.
    expect(diffEvents(snapshot({ cursus: at(4.1) }), snapshot({ cursus: at(4.9) }))).toEqual([]);
    expect(diffEvents(snapshot({ cursus: at(4.2) }), snapshot({ cursus: at(3.9) }))).toEqual([]);
  });

  it('AC1: o nível é o mostrado (truncado), como nas badges', () => {
    // 3.9999999 mostra "4.00": a subida para 4 conta já.
    expect(diffEvents(snapshot({ cursus: at(3.5) }), snapshot({ cursus: at(3.9999999) }))).toEqual([
      { kind: 'level-up', level: 4 },
    ]);
    expect(diffEvents(snapshot({ cursus: at(3.5) }), snapshot({ cursus: at(3.999999) }))).toEqual(
      []
    );
  });

  it('decisão: um salto de vários níveis dá um só evento, com o nível novo', () => {
    expect(diffEvents(snapshot({ cursus: at(3.9) }), snapshot({ cursus: at(6.1) }))).toEqual([
      { kind: 'level-up', level: 6 },
      { kind: 'badge', badgeId: 'level-5' },
    ]);
  });

  it('decisão: quando a subida traz a badge desse nível, só aparece a badge', () => {
    expect(diffEvents(snapshot({ cursus: at(4.5) }), snapshot({ cursus: at(5.2) }))).toEqual([
      { kind: 'badge', badgeId: 'level-5' },
    ]);
    expect(diffEvents(snapshot({ cursus: at(9.5) }), snapshot({ cursus: at(10) }))).toEqual([
      { kind: 'badge', badgeId: 'level-10' },
    ]);
  });

  it('AC1: só o 42cursus conta; entrar no Common Core a partir da Piscine dá o nível', () => {
    const piscineAt = (level: number) => [{ slug: 'c-piscine', name: 'C Piscine', level }];
    const piscine = piscineAt(8.42);
    expect(diffEvents(snapshot({ cursus: piscine }), snapshot({ cursus: piscineAt(9.1) }))).toEqual(
      []
    );
    expect(diffEvents(snapshot({ cursus: piscine }), snapshot({ cursus: at(0.4) }))).toEqual([]);
    expect(diffEvents(snapshot({ cursus: piscine }), snapshot({ cursus: at(1.3) }))).toEqual([
      { kind: 'level-up', level: 1 },
    ]);
  });

  it('AC1: badges novas, pela ordem do catálogo, depois dos projetos e do nível', () => {
    const before = snapshot({ cursus: at(3.2) });
    const after = snapshot({
      isAlumni: true,
      cursus: at(4.1),
      projects: [done('libft'), done('minishell', 125)],
    });
    expect(diffEvents(before, after)).toEqual([
      { kind: 'project-validated', slug: 'minishell', name: 'Projeto minishell', finalMark: 125 },
      { kind: 'level-up', level: 4 },
      { kind: 'badge', badgeId: 'max-mark' },
      { kind: 'badge', badgeId: 'alumni' },
    ]);
  });

  it('AC1/AC3: para quaisquer snapshots, é determinístico e só fala do positivo', () => {
    const arbitraryProject = fc.record({
      slug: fc.constantFrom('a', 'b', 'c', 'd'),
      status: fc.constantFrom('finished', 'in_progress', 'waiting_for_correction'),
      validated: fc.option(fc.boolean(), { nil: null }),
      finalMark: fc.option(fc.integer({ min: 0, max: 125 }), { nil: null }),
    });
    const arbitrarySnapshot = fc
      .record({
        isAlumni: fc.boolean(),
        level: fc.double({ min: 0, max: 30, noNaN: true }),
        projects: fc.uniqueArray(arbitraryProject, { selector: (p) => p.slug, maxLength: 4 }),
      })
      .map(({ isAlumni, level, projects }) =>
        snapshot({
          isAlumni,
          cursus: at(level),
          projects: projects.map((p) => project(p.slug, p.status, p.validated, p.finalMark)),
        })
      );
    fc.assert(
      fc.property(arbitrarySnapshot, arbitrarySnapshot, (before, after) => {
        const events = diffEvents(before, after);
        expect(diffEvents(structuredClone(before), structuredClone(after))).toEqual(events);
        expect(diffEvents(after, after)).toEqual([]);
        for (const e of events) {
          expect(pondEventSchema.safeParse(e).success).toBe(true);
          if (e.kind === 'project-validated') {
            const p = after.projects.find((x) => x.slug === e.slug);
            expect(p?.status).toBe('finished');
            expect(p?.validated).toBe(true);
          }
        }
      }),
      { numRuns: 300 }
    );
  });
});

describe('WI-0012 — schema de um evento guardado', () => {
  it.each<PondEvent>([
    { kind: 'project-validated', slug: 'libft', name: 'Libft', finalMark: 100 },
    { kind: 'project-validated', slug: 'libft', name: 'Libft', finalMark: null },
    { kind: 'level-up', level: 6 },
    { kind: 'badge', badgeId: 'alumni' },
  ])('aceita %j', (event) => {
    expect(pondEventSchema.parse(event)).toEqual(event);
  });

  it.each([
    ['tipo desconhecido', { kind: 'project-failed', slug: 'x', name: 'X', finalMark: 0 }],
    ['campo a mais', { kind: 'level-up', level: 6, login: 'pato-teste' }],
    ['nível decimal', { kind: 'level-up', level: 5.5 }],
    ['nível 0', { kind: 'level-up', level: 0 }],
    ['badge sem id', { kind: 'badge' }],
    ['não é um objeto', 'level-up'],
  ])('recusa %s', (_case, event) => {
    expect(pondEventSchema.safeParse(event).success).toBe(false);
  });
});
