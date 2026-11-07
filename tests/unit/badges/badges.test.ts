// Badges (WI-0011, ADR 0011) para lá do contrato: limites do schema, o nível
// mostrado (não o bruto) e o que conta como validado. Dados inventados.
import { describe, expect, it } from 'vitest';

import { badgeCatalogSchema, earnedBadges } from '../../../src/badges/badges.js';
import {
  formatLevel,
  passportView,
  type PassportSnapshot,
} from '../../../src/passport/passport.js';
import { publicPassportView } from '../../../src/passport/public.js';

const snapshot = (overrides: Partial<PassportSnapshot> = {}): PassportSnapshot => ({
  login: 'pato-teste',
  campus: 'Campus Sintético',
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  coalition: null,
  cursus: [],
  projects: [],
  ...overrides,
});
const ids = (s: PassportSnapshot): string[] => earnedBadges(s).map((b) => b.id);
const at42 = (level: number) =>
  snapshot({ cursus: [{ slug: '42cursus', name: '42cursus', level }] });
const entry = (rule: unknown, extra: Record<string, unknown> = {}) => [
  { id: 'x', name: 'X', description: 'D', rule, ...extra },
];

describe('badgeCatalogSchema', () => {
  it.each([
    ['campo a mais na entrada', entry({ kind: 'alumni' }, { icon: 'pato' })],
    ['campo a mais na regra', entry({ kind: 'alumni', min: 1 })],
    ['validated-count com min 0', entry({ kind: 'validated-count', min: 0 })],
    ['validated-count com min decimal', entry({ kind: 'validated-count', min: 1.5 })],
    ['level com min 0', entry({ kind: 'level', min: 0 })],
    ['level com min negativo', entry({ kind: 'level', min: -5 })],
    ['id vazio', [{ id: ' ', name: 'X', description: 'D', rule: { kind: 'alumni' } }]],
    ['não é uma lista', { id: 'x' }],
  ])('recusa %s', (_case, catalog) => {
    expect(badgeCatalogSchema.safeParse(catalog).success).toBe(false);
  });

  it('aceita as quatro regras', () => {
    const catalog = [
      { id: 'a', name: 'A', description: 'D', rule: { kind: 'validated-count', min: 3 } },
      { id: 'b', name: 'B', description: 'D', rule: { kind: 'max-mark' } },
      { id: 'c', name: 'C', description: 'D', rule: { kind: 'level', min: 7.5 } },
      { id: 'd', name: 'D', description: 'D', rule: { kind: 'alumni' } },
    ];
    expect(badgeCatalogSchema.parse(catalog)).toEqual(catalog);
  });
});

describe('earnedBadges: o nível é o que o Passaporte mostra', () => {
  it('9.999999 mostra "9.99" e não dá Level 10', () => {
    expect(formatLevel(9.999999)).toBe('9.99');
    expect(ids(at42(9.999999))).not.toContain('level-10');
  });

  it('9.9999999 mostra "10.00" e dá Level 10', () => {
    expect(formatLevel(9.9999999)).toBe('10.00');
    expect(ids(at42(9.9999999))).toContain('level-10');
  });

  it('o slug tem de ser exatamente 42cursus', () => {
    const warmup = snapshot({
      cursus: [{ slug: '42cursus-warmup-sp', name: 'Warmup', level: 12 }],
    });
    expect(ids(warmup)).toEqual([]);
  });
});

describe('earnedBadges: validado = projectState "done"', () => {
  it('validated true sem status finished não conta', () => {
    const s = snapshot({
      projects: [{ slug: 'p', name: 'P', status: 'in_progress', finalMark: 125, validated: true }],
    });
    expect(ids(s)).toEqual([]);
  });

  it('finished e validado com 125 dá primeira validação e nota máxima', () => {
    const s = snapshot({
      projects: [{ slug: 'p', name: 'P', status: 'finished', finalMark: 125, validated: true }],
    });
    expect(ids(s)).toEqual(['first-validation', 'max-mark']);
  });
});

describe('as vistas levam as badges', () => {
  it('passportView e publicPassportView têm as mesmas badges', () => {
    const own = passportView(snapshot({ isAlumni: true }), 0);
    expect(own.badges.map((b) => b.id)).toEqual(['alumni']);
    expect(publicPassportView(own).badges).toEqual(own.badges);
  });
});
