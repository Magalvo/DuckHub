// Vista da página /calculator (WI-0007). Dados inventados.
import { describe, expect, it } from 'vitest';

import type { CachedProjectXp } from '../../../src/calculator/store.js';
import { calculatorView, isAvailable } from '../../../src/calculator/view.js';
import type { PassportSnapshot } from '../../../src/passport/passport.js';

const FETCHED = Date.UTC(2026, 6, 15, 13, 5); // 14:05 em Lisboa (verão)

const snapshot = (cursus: PassportSnapshot['cursus']): PassportSnapshot => ({
  login: 'pato-teste',
  campus: 'Campus Sintético',
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  coalition: null,
  cursus,
  projects: [],
});
const core = {
  snapshot: snapshot([{ slug: '42cursus', name: '42cursus', level: 5.179 }]),
  syncedAt: 0,
};
const piscine = {
  snapshot: snapshot([{ slug: 'c-piscine', name: 'C Piscine', level: 8.42 }]),
  syncedAt: 0,
};
const projects: CachedProjectXp[] = [
  {
    slug: 'projeto-a',
    projectId: 7001,
    name: 'Projeto A',
    xp: 2814,
    solo: true,
    fetchedAt: FETCHED,
  },
];

describe('isAvailable', () => {
  it('só com o 42cursus no Passaporte', () => {
    expect(isAvailable(core)).toBe(true);
    expect(isAvailable(piscine)).toBe(false);
    expect(isAvailable(null)).toBe(false);
  });
});

describe('calculatorView', () => {
  it('sem Passaporte ou só com a Piscine: indisponível', () => {
    expect(calculatorView({ saved: null, projects, query: {} })).toEqual({ kind: 'unavailable' });
    expect(calculatorView({ saved: piscine, projects, query: {} })).toEqual({
      kind: 'unavailable',
    });
  });

  it('sem cache: no-data', () => {
    expect(calculatorView({ saved: core, projects: [], query: {} })).toEqual({ kind: 'no-data' });
  });

  it('formulário por submeter: sem erros nem resultado, com o nível atual', () => {
    expect(calculatorView({ saved: core, projects, query: {} })).toEqual({
      kind: 'form',
      projects: [{ slug: 'projeto-a', name: 'Projeto A' }],
      selected: null,
      markInput: '',
      currentLevel: '5.17',
      projectError: null,
      markError: null,
      result: null,
    });
  });

  it('projeto e nota válidos: o XP ganho e a data da cache em Lisboa', () => {
    const view = calculatorView({
      saved: core,
      projects,
      query: { project: 'projeto-a', mark: ' 125 ' },
    });
    expect(view).toMatchObject({
      selected: 'projeto-a',
      markInput: ' 125 ',
      projectError: null,
      markError: null,
      result: { gained: 3517, source: '2026-07-15 14:05' },
    });
  });

  it.each([
    [{ project: 'projeto-a', mark: '126' }, null, 'outOfRange'],
    [{ project: 'projeto-a', mark: '99.5' }, null, 'notInteger'],
    [{ project: 'projeto-a' }, null, 'notInteger'],
    [{ project: 'projeto-x', mark: '100' }, 'unknownProject', null],
    [{ mark: '100' }, 'unknownProject', null],
    [{ project: 'projeto-x', mark: 'abc' }, 'unknownProject', 'notInteger'],
  ] as const)('%o: erros %s / %s, sem resultado', (query, projectError, markError) => {
    expect(calculatorView({ saved: core, projects, query })).toMatchObject({
      projectError,
      markError,
      result: null,
    });
  });

  it('um parâmetro repetido conta pelo primeiro valor', () => {
    const view = calculatorView({
      saved: core,
      projects,
      query: { project: ['projeto-a', 'projeto-x'], mark: ['100', '0'] },
    });
    expect(view).toMatchObject({ result: { gained: 2814 } });
  });
});
