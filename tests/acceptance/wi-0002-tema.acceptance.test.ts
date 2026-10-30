// tests/acceptance/wi-0002-tema.acceptance.test.ts
import { describe, expect, it } from 'vitest';
import { textSurfacePairs } from '../../src/theme/tokens.js';

// Oráculo próprio: fórmula de luminância relativa da WCAG 2.x
const channel = (hex: string, at: number): number => {
  const c = parseInt(hex.slice(at, at + 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex: string): number =>
  0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
const contrast = (a: string, b: string): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
};

describe('WI-0002 — esqueleto da app com o tema Cyber Duck', () => {
  it('AC3: todos os pares texto/superfície têm contraste ≥ 4.5:1', () => {
    expect(textSurfacePairs.length).toBeGreaterThan(0);
    for (const { text, surface } of textSurfacePairs) {
      expect(contrast(text, surface), `${text} sobre ${surface}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
