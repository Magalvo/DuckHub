// tests/acceptance/wi-0014-compatibilidade.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-07 (pesos 25/20/20/10/10/10/5, horário por sobreposição,
// pontuação inteira com meio para cima, ADR 0015). Revê antes do commit:
// depois de entrar, isto é o contrato. Dados inventados.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/messages/en.js';
import {
  compatibility,
  rankCandidates,
  type ReasonId,
  type WorkProfile,
} from '../../src/tavern/compatibility.js';

// Ordem da tabela da spec.
const REASON_IDS: readonly ReasonId[] = [
  'shared-hours',
  'same-start',
  'same-grade-goal',
  'same-pace',
  'same-style',
  'same-setting',
  'complementary-roles',
];

const full = (login: string, overrides: Partial<WorkProfile> = {}): WorkProfile => ({
  login,
  periods: ['evening'],
  start: 'two-weeks',
  gradeGoal: 'bonus',
  pace: 'steady',
  style: 'pair',
  setting: 'on-site',
  role: 'lead',
  ...overrides,
});

const score = (a: Partial<WorkProfile>, b: Partial<WorkProfile>): number =>
  compatibility({ login: 'pato-a', ...a }, { login: 'pato-b', ...b }).score;

const reasons = (a: Partial<WorkProfile>, b: Partial<WorkProfile>): readonly ReasonId[] =>
  compatibility({ login: 'pato-a', ...a }, { login: 'pato-b', ...b }).reasons;

const periodArb = fc.constantFrom(...(['morning', 'afternoon', 'evening', 'night'] as const));
const profileArb = (login: fc.Arbitrary<string>): fc.Arbitrary<WorkProfile> =>
  fc.record(
    {
      login,
      periods: fc.array(periodArb, { maxLength: 6 }),
      start: fc.constantFrom(...(['this-week', 'two-weeks', 'no-rush'] as const)),
      gradeGoal: fc.constantFrom(...(['pass', 'bonus', 'max'] as const)),
      pace: fc.constantFrom(...(['sprint', 'steady', 'relaxed'] as const)),
      style: fc.constantFrom(...(['pair', 'split', 'mixed'] as const)),
      setting: fc.constantFrom(...(['on-site', 'hybrid', 'remote'] as const)),
      role: fc.constantFrom(...(['lead', 'follow', 'either'] as const)),
    },
    { requiredKeys: ['login'] }
  );
const loginArb = fc.stringMatching(/^[a-z][a-z0-9-]{0,7}$/);
const anyProfile = profileArb(loginArb);

describe('WI-0014 — compatibilidade', () => {
  it('AC1: a pontuação é um inteiro em [0,100]', () => {
    fc.assert(
      fc.property(anyProfile, anyProfile, (a, b) => {
        const { score: s } = compatibility(a, b);
        expect(Number.isInteger(s)).toBe(true);
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThanOrEqual(100);
      })
    );
  });

  it('AC2: é simétrica, na pontuação e nas razões', () => {
    fc.assert(
      fc.property(anyProfile, anyProfile, (a, b) => {
        expect(compatibility(b, a)).toEqual(compatibility(a, b));
      })
    );
  });

  it('AC3: uma dimensão respondida por só uma das pessoas não conta', () => {
    expect(score({ pace: 'sprint' }, { pace: 'relaxed', start: 'this-week' })).toBe(0);
    expect(score({ pace: 'sprint', start: 'no-rush' }, { pace: 'sprint' })).toBe(100);
    fc.assert(
      fc.property(anyProfile, anyProfile, (a, b) => {
        // Retirar a b uma dimensão que a não respondeu não muda nada.
        const { login, ...rest } = b;
        const trimmed: WorkProfile = { login };
        for (const key of ['start', 'gradeGoal', 'pace', 'style', 'setting', 'role'] as const) {
          if (a[key] !== undefined && rest[key] !== undefined) {
            Object.assign(trimmed, { [key]: rest[key] });
          }
        }
        const aHasPeriods = a.periods !== undefined && a.periods.length > 0;
        if (aHasPeriods && rest.periods !== undefined) trimmed.periods = rest.periods;
        expect(compatibility(a, trimmed)).toEqual(compatibility(a, b));
      })
    );
  });

  it('AC3: os pesos restantes voltam a somar 1', () => {
    // Só ritmo (10) e papel (5): 10·1 + 5·0 = 10 em 15.
    expect(score({ pace: 'steady', role: 'lead' }, { pace: 'steady', role: 'lead' })).toBe(67);
    // Só horário (25) e começar (20): 25·0.5 + 20·1 = 32.5 em 45 → 72.2…
    expect(
      score(
        { periods: ['morning', 'afternoon'], start: 'no-rush' },
        { periods: ['afternoon', 'evening'], start: 'no-rush' }
      )
    ).toBe(72);
  });

  it('AC3: periods vazio conta como sem resposta; repetidos contam uma vez', () => {
    expect(score({ periods: [], pace: 'sprint' }, { periods: ['night'], pace: 'sprint' })).toBe(
      100
    );
    // {morning, afternoon} ∩ {afternoon, evening, night} = 1 em min(2,3); sem
    // tirar repetidos seria 1 em 3.
    expect(
      score(
        { periods: ['morning', 'morning', 'afternoon'] },
        { periods: ['afternoon', 'evening', 'night'] }
      )
    ).toBe(50);
  });

  it('AC4: sem nenhuma dimensão em comum, 0 e sem razões', () => {
    expect(compatibility({ login: 'pato-a' }, { login: 'pato-b' })).toEqual({
      score: 0,
      reasons: [],
    });
    expect(
      compatibility(
        { login: 'pato-a', pace: 'sprint', periods: [] },
        { login: 'pato-b', start: 'no-rush' }
      )
    ).toEqual({ score: 0, reasons: [] });
  });

  it('AC5: exemplos da spec', () => {
    // Tudo igual, either com either: 97.5 arredonda para cima.
    expect(compatibility(full('a', { role: 'either' }), full('b', { role: 'either' })).score).toBe(
      98
    );
    // Tudo igual, lead com follow.
    expect(compatibility(full('a'), full('b', { role: 'follow' })).score).toBe(100);
    expect(score({ periods: ['morning', 'evening'] }, { periods: ['evening'] })).toBe(100);
    expect(
      score({ periods: ['morning', 'afternoon'] }, { periods: ['afternoon', 'evening', 'night'] })
    ).toBe(50);
    expect(score({ pace: 'sprint' }, { pace: 'relaxed' })).toBe(0);
  });

  it('AC5: horário por sobreposição |A∩B| / min(|A|,|B|)', () => {
    expect(score({ periods: ['morning'] }, { periods: ['night'] })).toBe(0);
    expect(
      score(
        { periods: ['morning', 'afternoon', 'evening'] },
        { periods: ['afternoon', 'evening', 'night'] }
      )
    ).toBe(67);
    expect(
      score({ periods: ['morning', 'afternoon', 'evening', 'night'] }, { periods: ['night'] })
    ).toBe(100);
  });

  it.each([
    ['start', 'this-week', 'this-week', 100],
    ['start', 'this-week', 'two-weeks', 50],
    ['start', 'this-week', 'no-rush', 0],
    ['gradeGoal', 'pass', 'bonus', 50],
    ['gradeGoal', 'bonus', 'max', 50],
    ['gradeGoal', 'pass', 'max', 0],
    ['pace', 'steady', 'relaxed', 50],
    ['style', 'pair', 'pair', 100],
    ['style', 'mixed', 'split', 50],
    ['style', 'pair', 'split', 0],
    ['setting', 'remote', 'remote', 100],
    ['setting', 'hybrid', 'on-site', 50],
    ['setting', 'on-site', 'remote', 0],
    ['role', 'lead', 'follow', 100],
    ['role', 'either', 'lead', 50],
    ['role', 'either', 'either', 50],
    ['role', 'lead', 'lead', 0],
    ['role', 'follow', 'follow', 0],
  ] as const)('AC5: %s %s com %s vale %i', (key, x, y, expected) => {
    expect(score({ [key]: x }, { [key]: y })).toBe(expected);
  });

  it('AC1/AC5: o meio arredonda sempre para cima, sem erro de float', () => {
    // 25·0.5 + 10·0.5 + 5·1 = 22.5 em 100. Normalizar os pesos antes de somar
    // dá 22.499… e arredonda para 22; a resposta certa é 23 (ADR 0015).
    const a = full('a', {
      periods: ['morning', 'afternoon'],
      start: 'this-week',
      gradeGoal: 'pass',
      pace: 'sprint',
      style: 'pair',
      setting: 'hybrid',
      role: 'lead',
    });
    const b = full('b', {
      periods: ['afternoon', 'evening'],
      start: 'no-rush',
      gradeGoal: 'max',
      pace: 'relaxed',
      style: 'split',
      setting: 'on-site',
      role: 'follow',
    });
    expect(compatibility(a, b)).toEqual({
      score: 23,
      reasons: ['shared-hours', 'complementary-roles'],
    });
  });

  it('AC6: razões só quando a regra as dá', () => {
    expect(reasons({ periods: ['morning'] }, { periods: ['night'] })).toEqual([]);
    expect(reasons({ periods: ['morning', 'night'] }, { periods: ['night'] })).toEqual([
      'shared-hours',
    ]);
    expect(reasons({ start: 'this-week' }, { start: 'two-weeks' })).toEqual([]);
    expect(reasons({ style: 'mixed' }, { style: 'mixed' })).toEqual(['same-style']);
    expect(reasons({ setting: 'hybrid' }, { setting: 'remote' })).toEqual([]);
    expect(reasons({ role: 'lead' }, { role: 'lead' })).toEqual([]);
    expect(reasons({ role: 'either' }, { role: 'either' })).toEqual([]);
    expect(reasons({ role: 'follow' }, { role: 'lead' })).toEqual(['complementary-roles']);
  });

  it('AC6: com tudo igual e papéis complementares, todas as razões pela ordem da tabela', () => {
    expect(compatibility(full('a', { role: 'follow' }), full('b')).reasons).toEqual(REASON_IDS);
  });

  it('AC6: as razões vêm do catálogo, sem repetidos e pela ordem da tabela', () => {
    fc.assert(
      fc.property(anyProfile, anyProfile, (a, b) => {
        const got = compatibility(a, b).reasons;
        const positions = got.map((r) => REASON_IDS.indexOf(r));
        expect(positions.every((p) => p >= 0)).toBe(true);
        expect(positions).toEqual([...new Set(positions)].sort((x, y) => x - y));
      })
    );
  });

  it('AC6: cada razão tem texto em inglês no ficheiro de mensagens', () => {
    const texts: Record<string, string> = en.tavern.reasons;
    expect(Object.keys(texts).sort()).toEqual([...REASON_IDS].sort());
    for (const id of REASON_IDS) expect(texts[id]?.trim()).toBeTruthy();
  });

  it('AC7: ordena por pontuação decrescente e exclui a própria pessoa', () => {
    const me = full('me');
    const ranked = rankCandidates(me, [
      full('low', { start: 'no-rush', gradeGoal: 'pass', role: 'lead' }),
      full('me'),
      full('top', { role: 'follow' }),
      full('mid', { pace: 'relaxed' }),
    ]);
    expect(ranked.map((r) => r.login)).toEqual(['top', 'mid', 'low']);
    expect(ranked[0]).toEqual({
      login: 'top',
      compatibility: compatibility(me, full('top', { role: 'follow' })),
    });
  });

  it('AC7: empates desfeitos pelo login, por code units e sem locale', () => {
    const me = full('me');
    const ranked = rankCandidates(me, [full('bea'), full('Zoe'), full('ana'), full('ana-b')]);
    // 'Z' (90) vem antes de 'a' (97); com localeCompare viria no fim.
    expect(ranked.map((r) => r.login)).toEqual(['Zoe', 'ana', 'ana-b', 'bea']);
  });

  it('AC7: a ordem de entrada não muda o resultado', () => {
    fc.assert(
      fc.property(
        anyProfile,
        fc.uniqueArray(anyProfile, { selector: (p) => p.login, maxLength: 12 }),
        fc.func(fc.integer()),
        (me, candidates, key) => {
          const shuffled = [...candidates].sort((x, y) => key(x.login) - key(y.login));
          const ranked = rankCandidates(me, candidates);
          expect(rankCandidates(me, shuffled)).toEqual(ranked);
          expect(ranked.some((r) => r.login === me.login)).toBe(false);
          for (let i = 1; i < ranked.length; i++) {
            const prev = ranked[i - 1];
            const cur = ranked[i];
            if (prev === undefined || cur === undefined) throw new Error('índice fora');
            const ordered =
              prev.compatibility.score > cur.compatibility.score ||
              (prev.compatibility.score === cur.compatibility.score && prev.login < cur.login);
            expect(ordered).toBe(true);
          }
        }
      )
    );
  });

  it('AC8: função pura, que não altera as entradas', () => {
    fc.assert(
      fc.property(
        anyProfile,
        fc.uniqueArray(anyProfile, { selector: (p) => p.login, maxLength: 8 }),
        (me, candidates) => {
          const frozenMe = Object.freeze({ ...me });
          const frozen = Object.freeze(candidates.map((c) => Object.freeze({ ...c })));
          const before = structuredClone(candidates);
          const first = rankCandidates(frozenMe, frozen);
          expect(rankCandidates(frozenMe, frozen)).toEqual(first);
          expect(candidates).toEqual(before);
        }
      )
    );
  });
});
