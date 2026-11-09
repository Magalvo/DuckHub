// tests/acceptance/wi-0019-radar-skills.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-09: as skills do 42cursus (sem ele, as da c-piscine, por
// igualdade exata de slug); só níveis acima de 0, por nível descendente e
// depois nome; radar só com 3 ou mais skills; escala fixa de 0 a 20; a lista
// mostra o nível real. Só se guardam o nome e o nível das skills desses dois
// cursus (o mínimo, RGPD). A página está em e2e/wi-0019.e2e.ts. Revê antes do
// commit: depois de entrar, isto é o contrato. Dados inventados.
import { describe, expect, it } from 'vitest';

import { profileSchema, type Profile } from '../../src/intra/schemas.js';
import { buildSnapshot, passportView, type PassportSnapshot } from '../../src/passport/passport.js';
import { publicPassportView } from '../../src/passport/public.js';
import {
  RADAR_MIN_AXES,
  SKILL_SCALE_MAX,
  radarPoints,
  shownSkills,
} from '../../src/passport/skills.js';
import { snapshotSchema } from '../../src/passport/store.js';

// ---------- Fixtures sintéticas ----------

const skill = (id: number, name: string, level: number) => ({ id, name, level });

const me = {
  id: 90001,
  login: 'pato-teste',
  image: null,
  pool_month: 'september',
  pool_year: '2023',
  'alumni?': false,
  campus: [{ id: 9001, name: 'Campus Sintético A' }],
  campus_users: [{ campus_id: 9001, is_primary: true }],
  cursus_users: [
    {
      level: 8.42,
      cursus: { id: 9, name: 'C Piscine', slug: 'c-piscine' },
      skills: [skill(4, 'Unix', 8.03), skill(14, 'Adaptation & creativity', 4.37)],
    },
    {
      level: 5.17,
      cursus: { id: 21, name: '42cursus', slug: '42cursus' },
      skills: [
        skill(3, 'Rigor', 6.42),
        skill(4, 'Unix', 4.5),
        skill(1, 'Algorithms & AI', 4.5),
        skill(6, 'Web', 1.2),
        skill(26, 'Shell', 0),
      ],
    },
    {
      level: 1.5,
      cursus: { id: 3, name: 'Discovery Piscine', slug: 'discovery-piscine-web' },
      skills: [skill(99, 'Skill Só Da Discovery', 3)],
    },
  ],
};

function parseMe(raw: unknown): Profile {
  return profileSchema.parse(raw);
}

const snapshot = (cursus: PassportSnapshot['cursus']): PassportSnapshot => ({
  login: 'pato-teste',
  campus: 'Campus Sintético A',
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  coalition: null,
  cursus,
  projects: [],
});

const s = (name: string, level: number) => ({ name, level });
const main = (skills: { name: string; level: number }[]) => ({
  slug: '42cursus',
  name: '42cursus',
  level: 5.17,
  skills,
});
const piscine = (skills: { name: string; level: number }[]) => ({
  slug: 'c-piscine',
  name: 'C Piscine',
  level: 8.42,
  skills,
});

const SYNCED = Date.UTC(2026, 10, 9, 10, 0);

// ---------- /v2/me ----------

describe('WI-0019 — as skills entram pelo schema de /v2/me', () => {
  it('AC9: lê as skills de cada cursus e guarda só o nome e o nível', () => {
    const profile = parseMe(me);
    const cursus42 = profile.cursus.find((c) => c.slug === '42cursus');
    expect(cursus42?.skills?.[0]).toEqual({ name: 'Rigor', level: 6.42 });
    for (const c of profile.cursus) {
      for (const sk of c.skills ?? []) expect(Object.keys(sk).sort()).toEqual(['level', 'name']);
    }
  });

  it('AC9: um cursus_user sem o campo skills conta como lista vazia', () => {
    const without = {
      ...me,
      cursus_users: me.cursus_users.map(({ level, cursus }) => ({ level, cursus })),
    };
    const profile = parseMe(without);
    for (const c of profile.cursus) expect(c.skills ?? []).toEqual([]);
  });

  it.each([
    ['nível negativo', skill(4, 'Unix', -1)],
    ['nível que não é número', { id: 4, name: 'Unix', level: '4.5' }],
    ['sem nome', { id: 4, level: 4.5 }],
  ])('AC9: rejeita a resposta com uma skill inválida (%s)', (_case, bad) => {
    const raw = {
      ...me,
      cursus_users: [{ ...me.cursus_users[1], skills: [bad] }],
    };
    expect(profileSchema.safeParse(raw).success).toBe(false);
  });
});

// ---------- Snapshot ----------

describe('WI-0019 — o que se guarda no snapshot', () => {
  const built = buildSnapshot(parseMe(me), [], []);
  const bySlug = (slug: string) => built.cursus.find((c) => c.slug === slug);

  it('AC9: guarda as skills do 42cursus e da c-piscine, só com nome e nível', () => {
    expect(bySlug('42cursus')?.skills).toEqual([
      s('Rigor', 6.42),
      s('Unix', 4.5),
      s('Algorithms & AI', 4.5),
      s('Web', 1.2),
      s('Shell', 0),
    ]);
    expect(bySlug('c-piscine')?.skills).toEqual([
      s('Unix', 8.03),
      s('Adaptation & creativity', 4.37),
    ]);
  });

  it('AC9: não guarda as skills dos outros cursus (o mínimo)', () => {
    expect(bySlug('discovery-piscine-web')?.skills ?? []).toEqual([]);
    expect(JSON.stringify(built)).not.toContain('Skill Só Da Discovery');
  });

  it('AC9: o snapshot com skills sobrevive ao schema do store sem perder nada', () => {
    expect(snapshotSchema.parse(built)).toEqual(built);
  });

  it('AC8: um snapshot guardado sem skills continua válido e não tem a secção', () => {
    const old = {
      ...snapshot([]),
      cursus: [{ slug: '42cursus', name: '42cursus', level: 5.17 }],
    };
    const parsed = snapshotSchema.safeParse(old);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.cursus[0]?.skills ?? []).toEqual([]);
    expect(passportView(parsed.data, SYNCED).skills).toBeNull();
  });
});

// ---------- Que skills se mostram ----------

describe('WI-0019 — que skills se mostram', () => {
  it('AC1: usa o 42cursus, mesmo havendo c-piscine', () => {
    const got = shownSkills([piscine([s('Unix', 8.03)]), main([s('Rigor', 6.42)])]);
    expect(got).toEqual({ cursus: '42cursus', skills: [s('Rigor', 6.42)] });
  });

  it('AC1: sem 42cursus, usa a c-piscine', () => {
    const got = shownSkills([
      piscine([s('Unix', 2.1), s('Rigor', 1.5), s('Shell', 0.8), s('Basics', 3)]),
    ]);
    expect(got).toEqual({
      cursus: 'C Piscine',
      skills: [s('Basics', 3), s('Unix', 2.1), s('Rigor', 1.5), s('Shell', 0.8)],
    });
  });

  it('AC1: com 42cursus sem skills, não recorre à c-piscine', () => {
    expect(shownSkills([main([]), piscine([s('Unix', 8.03)])])).toBeNull();
    expect(
      shownSkills([main([s('Rigor', 0), s('Unix', 0)]), piscine([s('Unix', 8.03)])])
    ).toBeNull();
  });

  it('AC1: os slugs comparam-se por igualdade exata', () => {
    const discovery = {
      slug: 'discovery-piscine-web',
      name: 'Discovery',
      level: 1.5,
      skills: [s('Web', 3)],
    };
    const warmup = { slug: '42cursus-warmup-sp', name: 'Warmup', level: 1, skills: [s('Web', 3)] };
    expect(shownSkills([discovery, warmup])).toBeNull();
    expect(shownSkills([])).toBeNull();
  });

  it('AC2: só níveis acima de 0, por nível descendente e depois nome em code units', () => {
    const got = shownSkills([
      main([
        s('Unix', 4.5),
        s('Rigor', 0),
        s('Algorithms & AI', 4.5),
        s('Web', 1.2),
        s('adaptation', 4.5),
      ]),
    ]);
    // "A" (65) < "U" (85) < "a" (97): as maiúsculas vêm primeiro em code units.
    expect(got?.skills).toEqual([
      s('Algorithms & AI', 4.5),
      s('Unix', 4.5),
      s('adaptation', 4.5),
      s('Web', 1.2),
    ]);
  });

  it('AC2: um cursus sem o campo skills (snapshot antigo) não tem skills', () => {
    expect(shownSkills([{ slug: '42cursus', name: '42cursus', level: 5.17 }])).toBeNull();
  });
});

// ---------- Geometria do radar ----------

function expectPoints(got: readonly { x: number; y: number }[] | null, want: [number, number][]) {
  expect(got).not.toBeNull();
  expect(got).toHaveLength(want.length);
  want.forEach(([x, y], i) => {
    expect(got?.[i]?.x, `x do eixo ${String(i)}`).toBeCloseTo(x, 5);
    expect(got?.[i]?.y, `y do eixo ${String(i)}`).toBeCloseTo(y, 5);
  });
}

describe('WI-0019 — geometria do radar', () => {
  it('AC4: as constantes da decisão', () => {
    expect(SKILL_SCALE_MAX).toBe(20);
    expect(RADAR_MIN_AXES).toBe(3);
  });

  it('AC3: com menos de 3 níveis não há radar', () => {
    expect(radarPoints([], 100)).toBeNull();
    expect(radarPoints([5], 100)).toBeNull();
    expect(radarPoints([5, 3], 100)).toBeNull();
  });

  it('AC4: eixo 0 para cima, sentido dos ponteiros do relógio, escala 0–20, acima de 20 no limite', () => {
    // Coordenadas de SVG: origem no centro, y a crescer para baixo.
    expectPoints(radarPoints([25, 10, 5], 100), [
      [0, -100],
      [43.30127, 25],
      [-21.650635, 12.5],
    ]);
  });

  it('AC4: quatro eixos, a passos de 90 graus', () => {
    expectPoints(radarPoints([8.25, 8.25, 4, 2], 100), [
      [0, -41.25],
      [41.25, 0],
      [0, 20],
      [-10, 0],
    ]);
  });

  it('AC4: cinco eixos no máximo ficam no círculo do raio', () => {
    expectPoints(radarPoints([20, 20, 20, 20, 20], 100), [
      [0, -100],
      [95.105652, -30.901699],
      [58.778525, 80.901699],
      [-58.778525, 80.901699],
      [-95.105652, -30.901699],
    ]);
  });

  it('AC4: o raio escala tudo', () => {
    expectPoints(radarPoints([10, 10, 10], 50), [
      [0, -25],
      [21.650635, 12.5],
      [-21.650635, 12.5],
    ]);
  });
});

// ---------- Vista do Passaporte ----------

describe('WI-0019 — a secção no Passaporte', () => {
  const own = (cursus: PassportSnapshot['cursus']) => passportView(snapshot(cursus), SYNCED);

  it('AC3/AC5: com 3 ou mais skills há radar e lista, com o nível real em 2 casas', () => {
    const view = own([main([s('Rigor', 25), s('Unix', 4.456), s('Web', 1.2), s('Shell', 0)])]);
    expect(view.skills?.cursus).toBe('42cursus');
    expect(view.skills?.skills).toEqual([
      { name: 'Rigor', level: '25.00' },
      { name: 'Unix', level: '4.45' },
      { name: 'Web', level: '1.20' },
    ]);
    const radar = view.skills?.radar;
    expect(radar).not.toBeNull();
    if (radar === null || radar === undefined) return;
    expect(radar.radius).toBeGreaterThan(0);
    expect(radar.shape).toEqual(radarPoints([25, 4.456, 1.2], radar.radius));
  });

  it('AC3: com 1 ou 2 skills só há lista', () => {
    const view = own([main([s('Rigor', 6.42), s('Unix', 4.5)])]);
    expect(view.skills?.skills).toHaveLength(2);
    expect(view.skills?.radar).toBeNull();
  });

  it('AC3: sem skills acima de 0, a secção não aparece', () => {
    expect(own([main([s('Rigor', 0)])]).skills).toBeNull();
    expect(own([]).skills).toBeNull();
  });

  it('AC7: a vista pública tem a mesma secção', () => {
    const view = own([main([s('Rigor', 6.42), s('Unix', 4.5), s('Web', 1.2)])]);
    expect(publicPassportView(view).skills).toEqual(view.skills);
  });
});
