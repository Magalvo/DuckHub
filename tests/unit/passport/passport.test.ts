// Escolha determinística do cursus mostrado (ADR 0008, ponto 6): slugs
// confirmados com uma chamada real em 2026-11-05.
import { describe, expect, it } from 'vitest';

import { passportView, type PassportSnapshot } from '../../../src/passport/passport.js';

const cPiscine = { slug: 'c-piscine', name: 'C Piscine', level: 8.42 };
const discovery = { slug: 'discovery-piscine-sintetica', name: 'Discovery Sintética', level: 3.5 };
const warmup = { slug: '42cursus-warmup-sp', name: 'Warmup Sintético', level: 1.25 };

function snapshot(cursus: PassportSnapshot['cursus']): PassportSnapshot {
  return {
    login: 'pato-teste',
    campus: 'Campus Sintético',
    piscine: { month: 'september', year: 2023 },
    isAlumni: false,
    coalition: null,
    cursus,
    projects: [],
  };
}

describe('passportView: cursus mostrado', () => {
  it.each([
    ['c-piscine primeiro', [cPiscine, discovery]],
    ['discovery-piscine primeiro', [discovery, cPiscine]],
  ])('sem 42cursus, prefere c-piscine a outras piscines (%s)', (_, cursus) => {
    const view = passportView(snapshot(cursus), 0);
    expect(view.reduced).toBe(true);
    expect(view.mainCursus).toEqual({ name: 'C Piscine', level: '8.42' });
  });

  it('sem c-piscine, usa o primeiro cujo slug contém "piscine"', () => {
    const other = { slug: 'piscine-sintetica', name: 'Outra Piscine', level: 2 };
    const view = passportView(snapshot([warmup, discovery, other]), 0);
    expect(view.mainCursus).toEqual({ name: 'Discovery Sintética', level: '3.50' });
  });

  it('42cursus-warmup-sp não conta como 42cursus: Passaporte reduzido', () => {
    const view = passportView(snapshot([warmup, cPiscine]), 0);
    expect(view.reduced).toBe(true);
    expect(view.mainCursus).toEqual({ name: 'C Piscine', level: '8.42' });
  });

  it('só com 42cursus-warmup-sp: reduzido e sem cursus mostrado', () => {
    const view = passportView(snapshot([warmup]), 0);
    expect(view.reduced).toBe(true);
    expect(view.mainCursus).toBeNull();
  });
});
