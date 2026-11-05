// tests/acceptance/wi-0008-avatar.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-05 (iniciais do login, fundo da coalition, letras preto/branco,
// URL da foto fora do snapshot). Revê antes do commit: depois de entrar, isto
// é o contrato. Dados inventados.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import type { Profile } from '../../src/intra/client.js';
import { avatarColors, initialsFromLogin } from '../../src/passport/avatar.js';
import { buildSnapshot, DEFAULT_ACCENT, passportView } from '../../src/passport/passport.js';

// Oráculo próprio: contraste da WCAG 2.x
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

const hexColor = fc
  .tuple(fc.nat({ max: 255 }), fc.nat({ max: 255 }), fc.nat({ max: 255 }))
  .map(([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`);

const profile = (login: string): Profile => ({
  id: 90001,
  login,
  imageUrl: 'https://cdn.example.test/foto-sintetica.jpg',
  primaryCampus: { id: 9001, name: 'Campus Sintético' },
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  cursus: [{ id: 21, slug: '42cursus', name: '42cursus', level: 5.17 }],
});

describe('WI-0008 — avatar com iniciais', () => {
  it.each([
    ['dde-maga', 'DM'],
    ['pato-teste', 'PT'],
    ['cisne', 'C'],
    ['a-b-c', 'AB'],
    ['Zeta', 'Z'],
  ])('AC1: o login %s dá as iniciais %s', (login, initials) => {
    expect(initialsFromLogin(login)).toBe(initials);
  });

  it('AC1: a vista do Passaporte traz as iniciais do login', () => {
    const view = passportView(buildSnapshot(profile('pato-teste'), [], []), 0);
    expect(view.initials).toBe('PT');
  });

  it.each([
    ['#0E12B5', '#FFFFFF'],
    ['#670000', '#FFFFFF'],
    ['#00BABC', '#000000'],
    ['#FF6000', '#000000'],
    ['#ffffff', '#000000'],
    ['#000000', '#FFFFFF'],
  ])('AC2: sobre %s as iniciais são %s', (background, text) => {
    expect(avatarColors(background)).toEqual({ background, text });
  });

  it('AC2: para qualquer fundo, as iniciais têm pelo menos 4.5:1', () => {
    fc.assert(
      fc.property(hexColor, (background) => {
        const { text } = avatarColors(background);
        expect(contrast(text, background)).toBeGreaterThanOrEqual(4.5);
      }),
      { numRuns: 2000 }
    );
  });

  it('AC2: o fundo é a cor de destaque, e a vista traz a cor das iniciais', () => {
    const withCoalition = passportView(
      buildSnapshot(
        profile('pato-teste'),
        [{ id: 1, name: 'Os Patos', slug: 'os-patos', color: '#0E12B5' }],
        []
      ),
      0
    );
    expect(withCoalition.accentColor.toUpperCase()).toBe('#0E12B5');
    expect(withCoalition.avatarText).toBe('#FFFFFF');
    const without = passportView(buildSnapshot(profile('pato-teste'), [], []), 0);
    expect(without.accentColor).toBe(DEFAULT_ACCENT);
    expect(without.avatarText).toBe('#000000');
  });

  it('AC3: o URL da foto não entra no snapshot nem na vista', () => {
    const snapshot = buildSnapshot(profile('pato-teste'), [], []);
    expect(snapshot).not.toHaveProperty('imageUrl');
    expect(JSON.stringify(snapshot)).not.toContain('foto-sintetica');
    expect(passportView(snapshot, 0)).not.toHaveProperty('imageUrl');
  });
});
