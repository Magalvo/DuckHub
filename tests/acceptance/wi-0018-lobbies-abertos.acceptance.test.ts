// tests/acceptance/wi-0018-lobbies-abertos.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-07: os lobbies abrem-se a todos os projetos de grupo que a pessoa
// ainda não validou (a API não expõe os pré-requisitos: as regras das sessions
// dão 403 com o token da aplicação); antes de entrar vê-se só quantas pessoas
// estão no lobby. E de 2026-11-08: os slugs do mesmo projeto (por exemplo
// 42cursus-cub3d e cub3d, os grupos de src/passport/real-world.json) são um só
// projeto, com um só lobby; validar qualquer deles fecha-o. As regras de quem
// tem lobby estão também em wi-0017-lobby.acceptance.test.ts; o resto em
// e2e/wi-0018.e2e.ts. Revê antes do commit: depois de entrar, isto é o
// contrato. Dados inventados.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/messages/en.js';
import type { PassportSnapshot } from '../../src/passport/passport.js';
import { realWorldSlugGroups } from '../../src/passport/real-world.js';
import { createDrizzlePassportStore } from '../../src/passport/store.js';
import { lobbyProjects, lookingLabel } from '../../src/tavern/lobby.js';

describe('WI-0018 — quantas pessoas estão no lobby', () => {
  const { lookingOne, lookingMany } = en.tavern.lobby;

  it('AC2: singular só para 1, com um espaço entre o número e a palavra', () => {
    expect(lookingLabel(0, lookingOne, lookingMany)).toBe(`0 ${lookingMany}`);
    expect(lookingLabel(1, lookingOne, lookingMany)).toBe(`1 ${lookingOne}`);
    expect(lookingLabel(2, lookingOne, lookingMany)).toBe(`2 ${lookingMany}`);
    expect(lookingLabel(14, lookingOne, lookingMany)).toBe(`14 ${lookingMany}`);
  });

  it('AC2: os textos existem e são diferentes', () => {
    expect(lookingOne.trim()).not.toBe('');
    expect(lookingMany.trim()).not.toBe('');
    expect(lookingOne).not.toBe(lookingMany);
    expect(en.tavern.lobby.create.trim()).not.toBe('');
    expect(en.tavern.lobby.create).not.toBe(en.tavern.lobby.join);
  });
});

// ---------- O mesmo projeto com vários slugs ----------

const project = (slug: string, status: string, validated: boolean | null = null) => ({
  slug,
  name: `Nome de ${slug}`,
  status,
  finalMark: null,
  validated,
});

const snapshot = (projects: PassportSnapshot['projects']): PassportSnapshot => ({
  login: 'pato-teste',
  campus: 'Campus Sintético',
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  coalition: null,
  cursus: [{ slug: '42cursus', name: '42cursus', level: 6.1 }],
  projects,
});

const GROUPS = [['42cursus-cub3d', 'cub3d']] as const;
const CATALOG = [
  { slug: '42cursus-minishell', name: 'minishell', solo: false },
  { slug: '42cursus-cub3d', name: 'cub3d', solo: false },
  { slug: 'cub3d', name: 'cub3d (antigo)', solo: false },
  { slug: 'webserv', name: 'webserv', solo: false },
] as const;

describe('WI-0018 — um projeto, um lobby, mesmo com vários slugs', () => {
  it('os grupos vêm de real-world.json e incluem o cub3d e o miniRT', () => {
    expect(realWorldSlugGroups).toContainEqual(['42cursus-cub3d', 'cub3d']);
    expect(realWorldSlugGroups).toContainEqual(['42cursus-minirt', 'minirt']);
    // Só grupos com mais de um slug, e nenhum slug em dois grupos.
    const all = realWorldSlugGroups.flat();
    expect(new Set(all).size).toBe(all.length);
    for (const group of realWorldSlugGroups) expect(group.length).toBeGreaterThan(1);
  });

  it('AC1: os slugs do mesmo projeto dão um só lobby, com o primeiro slug do grupo', () => {
    expect(lobbyProjects(snapshot([]), CATALOG, GROUPS)).toEqual([
      { slug: '42cursus-minishell', name: 'minishell', suggested: false },
      { slug: '42cursus-cub3d', name: 'cub3d', suggested: false },
      { slug: 'webserv', name: 'webserv', suggested: false },
    ]);
  });

  it('AC1: validar qualquer dos slugs fecha o lobby do projeto', () => {
    for (const validated of ['cub3d', '42cursus-cub3d']) {
      const got = lobbyProjects(snapshot([project(validated, 'finished', true)]), CATALOG, GROUPS);
      expect(
        got.map((p) => p.slug),
        validated
      ).toEqual(['42cursus-minishell', 'webserv']);
    }
  });

  it('AC2: a sugestão da Intra vale para qualquer dos slugs', () => {
    const got = lobbyProjects(snapshot([project('cub3d', 'searching_a_group')]), CATALOG, GROUPS);
    expect(got.find((p) => p.slug === '42cursus-cub3d')?.suggested).toBe(true);
  });

  it('AC1: com só um slug do grupo no catálogo, o lobby usa na mesma o primeiro slug do grupo', () => {
    const got = lobbyProjects(
      snapshot([]),
      [{ slug: 'cub3d', name: 'cub3d', solo: false }],
      GROUPS
    );
    expect(got).toEqual([{ slug: '42cursus-cub3d', name: 'cub3d', suggested: false }]);
  });
});

// ---------- Sincronização ----------

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

async function user(intraId: number): Promise<string> {
  const { rows } = await client.query<{ id: string }>(
    'INSERT INTO users (intra_id, login, campus_id) VALUES ($1, $2, 9001) RETURNING id',
    [intraId, `pato-${String(intraId)}`]
  );
  const row = rows[0];
  if (row === undefined) throw new Error('insert sem id');
  return row.id;
}

async function lobbies(userId: string): Promise<string[]> {
  const { rows } = await client.query<{ project_slug: string }>(
    'SELECT project_slug FROM lobby_entries WHERE user_id = $1 ORDER BY project_slug',
    [userId]
  );
  return rows.map((r) => r.project_slug);
}

describe('WI-0018 — validar um dos slugs tira do lobby do projeto', () => {
  it('AC1: validar o cub3d antigo tira a pessoa do lobby 42cursus-cub3d', async () => {
    const id = await user(1);
    await client.query(
      "INSERT INTO lobby_entries (user_id, project_slug) VALUES ($1, '42cursus-cub3d'), ($1, '42cursus-minishell')",
      [id]
    );
    await passports.save(id, snapshot([project('cub3d', 'finished', true)]), Date.UTC(2026, 10, 8));
    expect(await lobbies(id)).toEqual(['42cursus-minishell']);
  });
});
