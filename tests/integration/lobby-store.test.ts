// LobbyStore (WI-0017, ADR 0016) sobre PGlite com as migrações: quem aparece
// num lobby, a renovação ao entrar outra vez e o prazo de 14 dias. Dados
// inventados.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createDrizzleLobbyStore, type LobbyStore } from '../../src/tavern/lobby-store.js';
import { createDrizzleWorkProfileStore } from '../../src/tavern/store.js';

const SLUG = '42cursus-minishell';
let client: PGlite;
let lobby: LobbyStore;
let profiles: ReturnType<typeof createDrizzleWorkProfileStore>;

beforeAll(async () => {
  client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: 'drizzle' });
  lobby = createDrizzleLobbyStore(db);
  profiles = createDrizzleWorkProfileStore(db);
}, 30_000);

afterAll(async () => {
  await client.close();
});

beforeEach(async () => {
  await client.query('DELETE FROM users');
});

let nextIntraId = 1;
async function user(login: string, campusId = 9001, hidden = false): Promise<string> {
  nextIntraId += 1;
  const { rows } = await client.query<{ id: string }>(
    'INSERT INTO users (intra_id, login, campus_id, passport_hidden) VALUES ($1, $2, $3, $4) RETURNING id',
    [nextIntraId, login, campusId, hidden]
  );
  const row = rows[0];
  if (row === undefined) throw new Error('insert sem id');
  return row.id;
}

async function joinedDaysAgo(userId: string, days: number): Promise<void> {
  await client.query(
    'UPDATE lobby_entries SET joined_at = now() - make_interval(days => $2) WHERE user_id = $1',
    [userId, days]
  );
}

const logins = async (viewerId: string): Promise<string[]> =>
  (await lobby.members(viewerId, SLUG)).map((m) => m.login).sort();

describe('createDrizzleLobbyStore', () => {
  it('members: mesmo projeto e campus, Passaporte visível, entrada válida, sem quem vê', async () => {
    const me = await user('pato-teste');
    const same = await user('melro-teste');
    const otherCampus = await user('corvo-teste', 9003);
    const hidden = await user('rola-teste', 9001, true);
    const expired = await user('gaivota-teste');
    const otherProject = await user('tordo-teste');
    for (const id of [me, same, otherCampus, hidden, expired]) await lobby.join(id, SLUG);
    await lobby.join(otherProject, 'webserv');
    await joinedDaysAgo(expired, 15);

    expect(await logins(me)).toEqual(['melro-teste']);
    expect(await logins(otherCampus)).toEqual([]);
  });

  it('members: o perfil de trabalho de cada um; sem perfil, respostas vazias', async () => {
    const me = await user('pato-teste');
    const withProfile = await user('melro-teste');
    const without = await user('tordo-teste');
    for (const id of [me, withProfile, without]) await lobby.join(id, SLUG);
    await profiles.save(withProfile, { periods: ['night', 'evening'], role: 'follow' });

    const members = await lobby.members(me, SLUG);
    expect(members.sort((a, b) => (a.login < b.login ? -1 : 1))).toEqual([
      { login: 'melro-teste', answers: { periods: ['evening', 'night'], role: 'follow' } },
      { login: 'tordo-teste', answers: {} },
    ]);
  });

  it('members: um perfil inválido na BD conta como sem perfil', async () => {
    const me = await user('pato-teste');
    const broken = await user('melro-teste');
    for (const id of [me, broken]) await lobby.join(id, SLUG);
    await client.query("INSERT INTO work_profiles (user_id, pace) VALUES ($1, 'fast')", [broken]);
    expect(await lobby.members(me, SLUG)).toEqual([{ login: 'melro-teste', answers: {} }]);
  });

  it('activeSlugs: só as entradas com menos de 14 dias', async () => {
    const me = await user('pato-teste');
    await lobby.join(me, SLUG);
    await lobby.join(me, 'webserv');
    await client.query(
      "UPDATE lobby_entries SET joined_at = now() - make_interval(days => 14, mins => 1) WHERE project_slug = 'webserv'"
    );
    expect([...(await lobby.activeSlugs(me))]).toEqual([SLUG]);
  });

  it('join outra vez renova a entrada expirada; leave é idempotente', async () => {
    const me = await user('pato-teste');
    await lobby.join(me, SLUG);
    await joinedDaysAgo(me, 20);
    expect((await lobby.activeSlugs(me)).size).toBe(0);
    await lobby.join(me, SLUG);
    expect([...(await lobby.activeSlugs(me))]).toEqual([SLUG]);

    await lobby.leave(me, SLUG);
    await lobby.leave(me, SLUG);
    expect((await lobby.activeSlugs(me)).size).toBe(0);
  });
});
