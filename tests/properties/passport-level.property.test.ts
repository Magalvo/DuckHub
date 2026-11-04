// O nível mostra-se com duas casas, truncado (ADR 0008). Com floats, a
// truncatura ingénua falha (0.29 * 100 = 28.99…): estas propriedades apanham-no.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { formatLevel } from '../../src/passport/passport.js';

const cents = fc.integer({ min: 0, max: 3000_00 });
const show = (c: number) => `${String(Math.floor(c / 100))}.${String(c % 100).padStart(2, '0')}`;

describe('formatLevel', () => {
  it('um nível com duas casas mostra-se exatamente', () => {
    fc.assert(
      fc.property(cents, (c) => {
        expect(formatLevel(c / 100)).toBe(show(c));
      })
    );
  });

  it('nunca arredonda para cima: casas extra são cortadas', () => {
    fc.assert(
      fc.property(cents, fc.integer({ min: 1, max: 9999 }), (c, extra) => {
        expect(formatLevel(c / 100 + extra / 1_000_000)).toBe(show(c));
      })
    );
  });
});
