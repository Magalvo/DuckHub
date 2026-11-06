// tests/acceptance/wi-0007-calculadora.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-06 (floor, nota inteira de 0 a 125, sem bónus de coalition, sem
// estimativa de nível). Revê antes do commit: depois de entrar, isto é o
// contrato. Os valores de XP (462, 2814) são os reais de libft e minishell.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { MAX_MARK, parseMark, xpGained } from '../../src/calculator/xp.js';

describe('WI-0007 — calculadora de XP', () => {
  it.each([
    [462, 100, 462],
    [2814, 100, 2814],
    [4200, 85, 3570],
    [2814, 75, 2110], // 2110.5 → 2110
    [462, 0, 0],
    [0, 100, 0],
  ])('AC1: %d XP com nota %d dá %d (arredondado para baixo)', (xp, mark, gained) => {
    expect(xpGained(xp, mark)).toBe(gained);
  });

  it.each([
    [1000, 110, 1100],
    [1000, 125, 1250],
    [2814, 125, 3517], // 3517.5 → 3517
    [462, 125, 577], // 577.5 → 577
  ])('AC2: acima de 100 sobe na mesma proporção (%d XP, nota %d → %d)', (xp, mark, gained) => {
    expect(MAX_MARK).toBe(125);
    expect(xpGained(xp, mark)).toBe(gained);
  });

  it.each([
    ['0', 0],
    ['100', 100],
    ['125', 125],
    [' 80 ', 80],
  ])('AC3: a nota "%s" é aceite', (input, mark) => {
    expect(parseMark(input)).toEqual({ ok: true, mark });
  });

  it.each([
    ['-1', 'out-of-range'],
    ['126', 'out-of-range'],
    ['1000', 'out-of-range'],
    ['99.5', 'not-integer'],
    ['abc', 'not-integer'],
    ['', 'not-integer'],
    ['1e2', 'not-integer'],
    ['10O', 'not-integer'],
  ])('AC3: a nota "%s" é rejeitada (%s)', (input, error) => {
    expect(parseMark(input)).toEqual({ ok: false, error });
  });

  it('AC8: uma nota maior nunca dá menos XP no mesmo projeto', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30_000 }),
        fc.integer({ min: 0, max: MAX_MARK }),
        fc.integer({ min: 0, max: MAX_MARK }),
        (xp, a, b) => {
          const [low, high] = a <= b ? [a, b] : [b, a];
          expect(xpGained(xp, low)).toBeLessThanOrEqual(xpGained(xp, high));
        }
      ),
      { numRuns: 2000 }
    );
  });

  it('AC1: o XP ganho é sempre um inteiro entre 0 e o XP da nota máxima', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 30_000 }),
        fc.integer({ min: 0, max: MAX_MARK }),
        (xp, mark) => {
          const gained = xpGained(xp, mark);
          expect(Number.isInteger(gained)).toBe(true);
          expect(gained).toBeGreaterThanOrEqual(0);
          expect(gained).toBeLessThanOrEqual((xp * MAX_MARK) / 100);
        }
      ),
      { numRuns: 2000 }
    );
  });
});
