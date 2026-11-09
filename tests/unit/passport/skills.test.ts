import { describe, expect, it } from 'vitest';

import { buildSnapshot, passportView } from '../../../src/passport/passport.js';
import { radarPoints, shownSkills } from '../../../src/passport/skills.js';
import { snapshotSchema } from '../../../src/passport/store.js';
import type { Profile } from '../../../src/intra/schemas.js';

const s = (name: string, level: number) => ({ name, level });
const cursus = (slug: string, skills?: { name: string; level: number }[]) =>
  skills === undefined ? { slug, name: slug, level: 1 } : { slug, name: slug, level: 1, skills };

describe('shownSkills', () => {
  it('não altera a lista do snapshot ao ordenar', () => {
    const skills = [s('B', 1), s('A', 2)];
    shownSkills([cursus('42cursus', skills)]);
    expect(skills).toEqual([s('B', 1), s('A', 2)]);
  });

  it('o empate por nome não usa locale: "Z" antes de "a"', () => {
    expect(shownSkills([cursus('42cursus', [s('a', 1), s('Z', 1)])])?.skills).toEqual([
      s('Z', 1),
      s('a', 1),
    ]);
  });
});

describe('radarPoints', () => {
  it('um nível 0 fica no centro', () => {
    const got = radarPoints([0, 0, 0], 10);
    for (const p of got ?? []) expect(Math.hypot(p.x, p.y)).toBeCloseTo(0, 9);
  });

  it('o raio de cada ponto é proporcional ao nível', () => {
    const got = radarPoints([5, 10, 15, 20, 40, 2.5], 80) ?? [];
    expect(got.map((p) => Math.hypot(p.x, p.y))).toEqual(
      [20, 40, 60, 80, 80, 10].map((r) => expect.closeTo(r, 9) as unknown)
    );
  });
});

describe('snapshot das skills', () => {
  const profile: Profile = {
    id: 1,
    login: 'x',
    imageUrl: null,
    primaryCampus: { id: 1, name: 'C' },
    piscine: { month: 'july', year: 2024 },
    isAlumni: false,
    cursus: [
      { id: 21, slug: '42cursus', name: '42cursus', level: 2 },
      { id: 9, slug: 'c-piscine', name: 'C Piscine', level: 3, skills: [s('Unix', 1)] },
    ],
  };

  it('um cursus escolhido sem skills na API fica sem o campo', () => {
    const built = buildSnapshot(profile, [], []);
    expect(built.cursus[0]).not.toHaveProperty('skills');
    expect(built.cursus[1]?.skills).toEqual([s('Unix', 1)]);
  });

  it('o schema do store não acrescenta o campo a quem não o tem', () => {
    const parsed = snapshotSchema.parse(buildSnapshot(profile, [], []));
    expect(parsed.cursus[0]).not.toHaveProperty('skills');
  });

  it('o schema do store rejeita um nível negativo', () => {
    const built = buildSnapshot(profile, [], []);
    const bad = { ...built, cursus: [cursus('42cursus', [s('Unix', -1)])] };
    expect(snapshotSchema.safeParse(bad).success).toBe(false);
  });

  it('a vista tem axes e rings com um ponto por skill', () => {
    const view = passportView(
      {
        ...buildSnapshot(profile, [], []),
        cursus: [cursus('42cursus', [s('A', 3), s('B', 2), s('C', 1)])],
      },
      0
    );
    const radar = view.skills?.radar;
    expect(radar?.axes).toEqual(radarPoints([20, 20, 20], radar?.radius ?? 0));
    expect(radar?.rings).toHaveLength(4);
    for (const ring of radar?.rings ?? []) expect(ring).toHaveLength(3);
  });
});
