import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../../../src/theme/contrast.js';
import { colors, cssVariables, textSurfacePairs } from '../../../src/theme/tokens.js';

const hex = fc
  .array(fc.integer({ min: 0, max: 255 }), { minLength: 3, maxLength: 3 })
  .map((rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`);

describe('contrastRatio', () => {
  it('dá 21 para preto sobre branco e 1 para a mesma cor', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#00BABC', '#00BABC')).toBe(1);
  });

  it('é simétrico e fica entre 1 e 21', () => {
    fc.assert(
      fc.property(hex, hex, (a, b) => {
        const ratio = contrastRatio(a, b);
        expect(ratio).toBe(contrastRatio(b, a));
        expect(ratio).toBeGreaterThanOrEqual(1);
        expect(ratio).toBeLessThanOrEqual(21 + 1e-9);
      })
    );
  });
});

describe('tokens', () => {
  it('a página assenta no void #080B0F (AC2)', () => {
    expect(colors.void).toBe('#080B0F');
  });

  it('o texto alumni só aparece sobre void, void inset e surface 1', () => {
    const surfaces = textSurfacePairs
      .filter(({ text }) => text === colors.alumni)
      .map(({ surface }) => surface);
    expect(surfaces).toEqual([colors.void, colors.voidInset, colors.surface1]);
    expect(contrastRatio(colors.alumni, colors.surface2)).toBeLessThan(4.5);
  });

  it('o texto sobre botões cheios (primary, duck) é o void', () => {
    for (const surface of [colors.primary, colors.duck]) {
      expect(textSurfacePairs).toContainEqual({ text: colors.void, surface });
    }
  });

  it('cssVariables declara uma variável por token', () => {
    const css = cssVariables();
    expect(css.startsWith(':root{')).toBe(true);
    expect(css).toContain('--dh-void:#080B0F;');
    expect(css).toContain('--dh-text-muted:#8B949E;');
    expect(css.match(/--dh-/g)).toHaveLength(Object.keys(colors).length);
  });
});
