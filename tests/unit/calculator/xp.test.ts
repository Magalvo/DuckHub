import { describe, expect, it } from 'vitest';

import { parseMark, xpGained } from '../../../src/calculator/xp.js';

describe('parseMark', () => {
  it.each([
    ['007', 7],
    ['-0', 0],
    ['\t42\n', 42],
  ])('aceita "%s" como %d', (input, mark) => {
    expect(parseMark(input)).toEqual({ ok: true, mark });
  });

  it.each([
    ['+5', 'not-integer'],
    ['5 0', 'not-integer'],
    ['٥', 'not-integer'], // dígito árabe
    ['0x10', 'not-integer'],
    ['99999999999999999999999', 'out-of-range'],
    ['-125', 'out-of-range'],
  ])('rejeita "%s" (%s)', (input, error) => {
    expect(parseMark(input)).toEqual({ ok: false, error });
  });
});

describe('xpGained', () => {
  it('arredonda para baixo, nunca para cima', () => {
    expect(xpGained(3, 50)).toBe(1);
    expect(xpGained(1, 99)).toBe(0);
  });
});
