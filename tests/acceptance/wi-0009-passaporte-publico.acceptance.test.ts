// tests/acceptance/wi-0009-passaporte-publico.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-06 (os outros só veem o positivo). Revê antes do commit: depois de
// entrar, isto é o contrato. Dados inventados.
import { describe, expect, it } from 'vitest';

import type { Coalition, Profile, ProjectUser } from '../../src/intra/client.js';
import { buildSnapshot, passportView } from '../../src/passport/passport.js';
import { publicPassportView } from '../../src/passport/public.js';

const profile: Profile = {
  id: 90001,
  login: 'pato-teste',
  imageUrl: null,
  primaryCampus: { id: 9001, name: 'Campus Sintético' },
  piscine: { month: 'september', year: 2023 },
  isAlumni: true,
  cursus: [{ id: 21, slug: '42cursus', name: '42cursus', level: 5.179 }],
};
const coalitions: Coalition[] = [{ id: 1, name: 'Os Patos', slug: 'os-patos', color: '#0E12B5' }];
const project = (n: number, status: string, validated: boolean | null, mark: number | null) =>
  ({
    projectId: 1300 + n,
    name: `Projeto ${String(n)}`,
    slug: `projeto-${String(n)}`,
    status,
    finalMark: mark,
    validated,
  }) satisfies ProjectUser;
const projects: ProjectUser[] = [
  project(1, 'finished', true, 115),
  project(2, 'finished', false, 42),
  project(3, 'in_progress', null, null),
  project(4, 'finished', true, 100),
];

const own = passportView(
  buildSnapshot(profile, coalitions, projects),
  Date.UTC(2026, 6, 15, 13, 5)
);
const pub = publicPassportView(own);

describe('WI-0009 — vista pública do Passaporte', () => {
  it('AC1: mantém a identidade, a coalition, o nível e o avatar', () => {
    expect(pub).toMatchObject({
      login: own.login,
      initials: own.initials,
      avatarText: own.avatarText,
      campus: own.campus,
      piscine: own.piscine,
      isAlumni: own.isAlumni,
      coalitionName: own.coalitionName,
      accentColor: own.accentColor,
      reduced: own.reduced,
      mainCursus: own.mainCursus,
    });
  });

  it('AC2: só os projetos validados, com a nota, pela mesma ordem', () => {
    expect(pub.projects).toEqual([
      { slug: 'projeto-1', name: 'Projeto 1', state: 'done', finalMark: 115 },
      { slug: 'projeto-4', name: 'Projeto 4', state: 'done', finalMark: 100 },
    ]);
  });

  it('AC2: nada dos projetos falhados ou em curso fica na vista', () => {
    const json = JSON.stringify(pub);
    expect(json).not.toContain('projeto-2');
    expect(json).not.toContain('projeto-3');
    expect(json).not.toContain('failed');
    expect(json).not.toContain('in-progress');
  });

  it('AC3: a vista pública não tem a data da sincronização', () => {
    expect(pub).not.toHaveProperty('syncedAt');
    expect(JSON.stringify(pub)).not.toContain(own.syncedAt);
  });

  it('AC2: a vista do próprio não muda (o WI-0005 continua igual)', () => {
    expect(own.projects).toHaveLength(4);
    expect(own.syncedAt).toBe('2026-07-15 14:05');
  });
});
