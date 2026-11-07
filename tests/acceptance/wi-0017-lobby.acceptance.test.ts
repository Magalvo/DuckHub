// tests/acceptance/wi-0017-lobby.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-07: "projeto de grupo" é a project_session com solo: false
// (confirmado numa resposta real da API); quem não tem perfil de trabalho
// entra na mesma; cada sugestão mostra a percentagem e as razões; as entradas
// em projetos onde a pessoa já não está inscrita saem na sincronização.
// Revê antes do commit: depois de entrar, isto é o contrato. As regras puras,
// o solo da API e os efeitos na BD (PGlite com as migrações); o resto está em
// e2e/wi-0017.e2e.ts. Dados inventados.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { cursusProjectSchema, soloFor } from '../../src/intra/schemas.js';
import type { PassportSnapshot } from '../../src/passport/passport.js';
import { createDrizzlePassportStore } from '../../src/passport/store.js';
import { LOBBY_STATUSES, LOBBY_TTL_DAYS, lobbyProjects } from '../../src/tavern/lobby.js';

const project = (slug: string, status: string) => ({
  slug,
  name: `Nome de ${slug}`,
  status,
  finalMark: null,
  validated: null,
});

const snapshot = (projects: PassportSnapshot['projects']): PassportSnapshot => ({
  login: 'pato-teste',
  campus: 'Campus Sintético',
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  coalition: null,
  cursus: [{ slug: '42cursus', name: '42cursus', level: 4.2 }],
  projects,
});

// O catálogo do campus (a cache do WI-0007), pela ordem do Common Core.
const CATALOG = [
  { slug: '42cursus-libft', solo: true },
  { slug: '42cursus-minishell', solo: false },
  { slug: '42cursus-cub3d', solo: false },
  { slug: 'webserv', solo: false },
] as const;

describe('WI-0017 — projetos de grupo onde a pessoa está inscrita', () => {
  it('AC1: só os estados de inscrição em curso contam', () => {
    expect([...LOBBY_STATUSES].sort()).toEqual(
      ['creating_group', 'in_progress', 'searching_a_group'].sort()
    );
  });

  it('AC1: só projetos de grupo do catálogo, em que a API diz que está inscrita', () => {
    const got = lobbyProjects(
      snapshot([
        project('42cursus-libft', 'in_progress'), // a solo
        project('42cursus-minishell', 'in_progress'),
        project('webserv', 'finished'), // já acabou
        project('42cursus-cub3d', 'waiting_for_correction'), // não está à procura
        project('projeto-fora-do-catalogo', 'in_progress'), // sem session conhecida
      ]),
      CATALOG
    );
    expect(got).toEqual([
      { slug: '42cursus-minishell', name: 'Nome de 42cursus-minishell', suggested: false },
    ]);
  });

  it('AC2: searching_a_group e creating_group vêm marcados como sugestão', () => {
    const got = lobbyProjects(
      snapshot([
        project('webserv', 'creating_group'),
        project('42cursus-minishell', 'searching_a_group'),
        project('42cursus-cub3d', 'in_progress'),
      ]),
      CATALOG
    );
    // Pela ordem do catálogo, não pela da API.
    expect(got).toEqual([
      { slug: '42cursus-minishell', name: 'Nome de 42cursus-minishell', suggested: true },
      { slug: '42cursus-cub3d', name: 'Nome de 42cursus-cub3d', suggested: false },
      { slug: 'webserv', name: 'Nome de webserv', suggested: true },
    ]);
  });

  it('AC1: sem Passaporte sincronizado não há projetos', () => {
    expect(lobbyProjects(null, CATALOG)).toEqual([]);
  });

  it('AC5: a entrada expira 14 dias depois', () => {
    expect(LOBBY_TTL_DAYS).toBe(14);
  });
});

describe('WI-0017 — o solo vem da project_session da API', () => {
  const api = (
    sessions: { campus_id: number | null; cursus_id: number | null; solo: boolean | null }[]
  ) =>
    cursusProjectSchema.parse({
      id: 1331,
      name: 'minishell',
      slug: '42cursus-minishell',
      difficulty: 2814,
      project_sessions: sessions.map((s) => ({ ...s, difficulty: null })),
    });
  const ctx = { campusId: 38, cursusId: 21 };

  it('AC1: vale a session do mesmo campus e cursus', () => {
    const project = api([
      { campus_id: null, cursus_id: null, solo: true },
      { campus_id: 38, cursus_id: 21, solo: false },
    ]);
    expect(soloFor(project, ctx)).toBe(false);
  });

  it('AC1: sem session do campus, vale a session sem campus (como o cub3d)', () => {
    const project = api([
      { campus_id: 1, cursus_id: 21, solo: true },
      { campus_id: null, cursus_id: null, solo: false },
    ]);
    expect(soloFor(project, ctx)).toBe(false);
  });

  it('AC1: sem session aplicável ou com solo desconhecido, conta como a solo', () => {
    expect(soloFor(api([{ campus_id: 1, cursus_id: 21, solo: false }]), ctx)).toBe(true);
    expect(soloFor(api([{ campus_id: 38, cursus_id: 21, solo: null }]), ctx)).toBe(true);
  });
});

// ---------- Efeitos na BD ----------

let client: PGlite;
let passports: ReturnType<typeof createDrizzlePassportStore>;

beforeAll(async () => {
  client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: 'drizzle' });
  passports = createDrizzlePassportStore(db);
}, 30_000);

afterAll(async () => {
  await client.close();
});

beforeEach(async () => {
  await client.query('DELETE FROM users');
});

let nextIntraId = 1;
async function user(): Promise<string> {
  nextIntraId += 1;
  const { rows } = await client.query<{ id: string }>(
    'INSERT INTO users (intra_id, login, campus_id) VALUES ($1, $2, 9001) RETURNING id',
    [nextIntraId, `pato-${String(nextIntraId)}`]
  );
  const row = rows[0];
  if (row === undefined) throw new Error('insert sem id');
  return row.id;
}

async function join(userId: string, slug: string): Promise<void> {
  await client.query('INSERT INTO lobby_entries (user_id, project_slug) VALUES ($1, $2)', [
    userId,
    slug,
  ]);
}

async function lobbies(userId: string): Promise<string[]> {
  const { rows } = await client.query<{ project_slug: string }>(
    'SELECT project_slug FROM lobby_entries WHERE user_id = $1 ORDER BY project_slug',
    [userId]
  );
  return rows.map((r) => r.project_slug);
}

const NOW = Date.UTC(2026, 10, 7, 12, 0);

describe('WI-0017 — entradas no lobby', () => {
  it('AC1: uma pessoa entra uma vez em cada lobby', async () => {
    const id = await user();
    await join(id, '42cursus-minishell');
    await expect(join(id, '42cursus-minishell')).rejects.toThrow();
  });

  it('AC1: sincronizar tira a pessoa dos lobbies onde já não está inscrita', async () => {
    const id = await user();
    await passports.save(
      id,
      snapshot([
        project('42cursus-minishell', 'in_progress'),
        project('webserv', 'creating_group'),
      ]),
      NOW
    );
    await join(id, '42cursus-minishell');
    await join(id, 'webserv');

    await passports.save(
      id,
      snapshot([
        project('42cursus-minishell', 'finished'),
        project('webserv', 'searching_a_group'),
      ]),
      NOW + 1000
    );
    expect(await lobbies(id)).toEqual(['webserv']);

    await passports.save(id, snapshot([]), NOW + 2000);
    expect(await lobbies(id)).toEqual([]);
  });

  it('AC1: a sincronização de uma pessoa não mexe nos lobbies das outras', async () => {
    const pato = await user();
    const cisne = await user();
    await join(pato, '42cursus-minishell');
    await join(cisne, '42cursus-minishell');
    await passports.save(pato, snapshot([]), NOW);
    expect(await lobbies(pato)).toEqual([]);
    expect(await lobbies(cisne)).toEqual(['42cursus-minishell']);
  });

  it('AC8: esconder o Passaporte tira a pessoa de todos os lobbies, e mostrá-lo não a põe de volta', async () => {
    const id = await user();
    const other = await user();
    await join(id, '42cursus-minishell');
    await join(id, 'webserv');
    await join(other, 'webserv');
    await passports.setHidden(id, true);
    expect(await lobbies(id)).toEqual([]);
    expect(await lobbies(other)).toEqual(['webserv']);
    await passports.setHidden(id, false);
    expect(await lobbies(id)).toEqual([]);
  });

  it('AC5: apagar a conta apaga as entradas', async () => {
    const id = await user();
    await join(id, '42cursus-minishell');
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    const { rows } = await client.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM lobby_entries'
    );
    expect(rows[0]?.n).toBe(0);
  });

  it('AC1: o catálogo de projetos guarda o solo, a solo por omissão', async () => {
    await client.query(
      "INSERT INTO project_xp (campus_id, slug, project_id, name, xp, fetched_at) VALUES (9001, 'x', 1, 'X', 10, now())"
    );
    const { rows } = await client.query<{ solo: boolean }>(
      "SELECT solo FROM project_xp WHERE slug = 'x'"
    );
    expect(rows[0]?.solo).toBe(true);
  });
});
