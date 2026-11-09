// tests/acceptance/wi-0022-correcoes-auditoria.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano (2026-11-09), a partir de
// duas falhas confirmadas numa auditoria:
// 1. Entrar num lobby verificava a visibilidade e só depois inseria. Um
//    "esconder o Passaporte" pelo meio deixava a entrada, que voltava a
//    aparecer ao mostrar o Passaporte outra vez (contra o AC8 do WI-0017).
//    Agora quem decide é o próprio join, na BD: com o Passaporte escondido
//    não insere nada e diz que não.
// 2. O soloFor, sem session do campus, usava a primeira session sem campus de
//    qualquer cursus. Agora só vale a do mesmo cursus ou a sem cursus.
// Revê antes do commit: depois de entrar, isto é o contrato. Dados inventados.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { cursusProjectSchema, soloFor } from '../../src/intra/schemas.js';
import { createDrizzlePassportStore } from '../../src/passport/store.js';
import { createDrizzleLobbyStore } from '../../src/tavern/lobby-store.js';

// ---------- 1. Entrar num lobby com o Passaporte escondido ----------

let client: PGlite;
let passports: ReturnType<typeof createDrizzlePassportStore>;
let lobby: ReturnType<typeof createDrizzleLobbyStore>;

beforeAll(async () => {
  client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: 'drizzle' });
  passports = createDrizzlePassportStore(db);
  lobby = createDrizzleLobbyStore(db);
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

async function lobbies(userId: string): Promise<string[]> {
  const { rows } = await client.query<{ project_slug: string }>(
    'SELECT project_slug FROM lobby_entries WHERE user_id = $1 ORDER BY project_slug',
    [userId]
  );
  return rows.map((r) => r.project_slug);
}

describe('WI-0022 — o join decide a visibilidade na BD', () => {
  it('AC1: com o Passaporte visível, entra e devolve true', async () => {
    const id = await user();
    expect(await lobby.join(id, '42cursus-minishell')).toBe(true);
    expect(await lobbies(id)).toEqual(['42cursus-minishell']);
  });

  it('AC1: entrar outra vez renova a entrada e devolve true', async () => {
    const id = await user();
    await lobby.join(id, '42cursus-minishell');
    expect(await lobby.join(id, '42cursus-minishell')).toBe(true);
    expect(await lobbies(id)).toEqual(['42cursus-minishell']);
  });

  it('AC1: com o Passaporte escondido, não insere nada e devolve false', async () => {
    const id = await user();
    await passports.setHidden(id, true);
    expect(await lobby.join(id, '42cursus-minishell')).toBe(false);
    expect(await lobbies(id)).toEqual([]);
  });

  it('AC2: a sequência da auditoria não deixa entrada ao mostrar outra vez', async () => {
    // O handler já viu o Passaporte visível; a pessoa esconde-o noutro
    // separador antes de o join chegar à BD.
    const id = await user();
    await passports.setHidden(id, true);
    expect(await lobby.join(id, 'webserv')).toBe(false);
    await passports.setHidden(id, false);
    expect(await lobbies(id)).toEqual([]);
  });

  it('AC1: uma pessoa que não existe não entra', async () => {
    const id = await user();
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    expect(await lobby.join(id, 'webserv')).toBe(false);
    const { rows } = await client.query<{ n: number }>(
      'SELECT count(*)::int AS n FROM lobby_entries'
    );
    expect(rows[0]?.n).toBe(0);
  });
});

// ---------- 2. O solo nunca vem de outro cursus ----------

describe('WI-0022 — o soloFor ignora as sessions de outro cursus', () => {
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

  it('AC3: a session sem campus de outro cursus não conta', () => {
    expect(soloFor(api([{ campus_id: null, cursus_id: 9, solo: false }]), ctx)).toBe(true);
  });

  it('AC3: a session sem campus do mesmo cursus vale, mesmo depois de uma de outro cursus', () => {
    const project = api([
      { campus_id: null, cursus_id: 9, solo: true },
      { campus_id: null, cursus_id: 21, solo: false },
    ]);
    expect(soloFor(project, ctx)).toBe(false);
  });

  it('AC3: a session sem campus e sem cursus vale, mesmo depois de uma de outro cursus', () => {
    const project = api([
      { campus_id: null, cursus_id: 9, solo: true },
      { campus_id: null, cursus_id: null, solo: false },
    ]);
    expect(soloFor(project, ctx)).toBe(false);
  });

  it('AC3: sem campus, a do mesmo cursus ganha à sem cursus', () => {
    const sameFirst = api([
      { campus_id: null, cursus_id: null, solo: true },
      { campus_id: null, cursus_id: 21, solo: false },
    ]);
    expect(soloFor(sameFirst, ctx)).toBe(false);
    const nullFirst = api([
      { campus_id: null, cursus_id: 21, solo: true },
      { campus_id: null, cursus_id: null, solo: false },
    ]);
    expect(soloFor(nullFirst, ctx)).toBe(true);
  });

  it('AC3: a session do campus e do cursus continua a ganhar a tudo', () => {
    const project = api([
      { campus_id: null, cursus_id: 21, solo: true },
      { campus_id: 38, cursus_id: 21, solo: false },
    ]);
    expect(soloFor(project, ctx)).toBe(false);
  });
});
