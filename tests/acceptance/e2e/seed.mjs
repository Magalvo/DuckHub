// tests/acceptance/e2e/seed.mjs
//
// Seed da BD do e2e (WI-0005). Cria do zero uma BD PGlite em disco, com as
// migrações de produção e os utilizadores, sessões e Passaportes sintéticos de
// seed-data.json. O Playwright corre-o antes de arrancar a app, que usa a mesma
// pasta via DATABASE_URL=pglite:<pasta>. Faz parte do CONTRATO.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname } from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';

const url = process.env.DATABASE_URL ?? '';
if (!url.startsWith('pglite:')) {
  throw new Error('seed: DATABASE_URL tem de ser pglite:<pasta>');
}
const dir = url.slice('pglite:'.length);
const seed = JSON.parse(readFileSync(new URL('./seed-data.json', import.meta.url), 'utf8'));

rmSync(dir, { recursive: true, force: true });
mkdirSync(dirname(dir), { recursive: true });
const client = new PGlite(dir);
await migrate(drizzle(client), { migrationsFolder: 'drizzle' });

/** O id de cada utilizador do seed, pela key (para os eventos do WI-0012). */
const userIds = new Map();

for (const user of seed.users) {
  const { rows } = await client.query(
    'INSERT INTO users (intra_id, login, campus_id, passport_hidden) VALUES ($1, $2, $3, $4) RETURNING id',
    [user.intraId, user.login, user.campusId, user.passportHidden === true]
  );
  const userId = rows[0].id;
  userIds.set(user.key, userId);
  const idHash = createHash('sha256').update(user.sessionToken).digest('hex');
  await client.query(
    "INSERT INTO sessions (id_hash, user_id, expires_at) VALUES ($1, $2, now() + interval '1 day')",
    [idHash, userId]
  );
  if (user.snapshot !== null) {
    await client.query(
      'INSERT INTO passports (user_id, snapshot, synced_at) VALUES ($1, $2::jsonb, $3)',
      [userId, JSON.stringify(user.snapshot), user.syncedAt]
    );
  }
}

// Cache de XP da calculadora (WI-0007), fresca: a app não chama a 42 real.
for (const p of seed.projectXp) {
  await client.query(
    'INSERT INTO project_xp (campus_id, slug, project_id, name, xp, fetched_at) VALUES ($1, $2, $3, $4, $5, now())',
    [p.campusId, p.slug, p.projectId, p.name, p.xp]
  );
}

// Membros sintéticos para o diretório (WI-0010): pinguim-01 … pinguim-30,
// noutro campus, visíveis, com Passaporte e sem sessão.
const fillers = seed.directoryFillers;
for (let i = 1; i <= fillers.count; i += 1) {
  const login = `${fillers.loginPrefix}-${String(i).padStart(2, '0')}`;
  const { rows } = await client.query(
    'INSERT INTO users (intra_id, login, campus_id, passport_hidden) VALUES ($1, $2, $3, false) RETURNING id',
    [fillers.intraIdStart + i, login, fillers.campusId]
  );
  const snapshot = {
    login,
    campus: fillers.campusName,
    piscine: { month: 'october', year: 2024 },
    isAlumni: false,
    coalition: null,
    cursus: [{ slug: '42cursus', name: '42cursus', level: fillers.level }],
    projects: [],
  };
  await client.query(
    "INSERT INTO passports (user_id, snapshot, synced_at) VALUES ($1, $2::jsonb, '2026-11-04T14:30:00Z')",
    [rows[0].id, JSON.stringify(snapshot)]
  );
  userIds.set(login, rows[0].id);
}

// Eventos do Duck Pond (WI-0012), com a idade em minutos em relação a agora:
// a retenção de 90 dias conta a partir do relógio real. Pela ordem do ficheiro,
// para os eventos com a mesma idade ficarem com ids crescentes.
async function pondEvent(userId, minutesAgo, event) {
  await client.query(
    'INSERT INTO pond_events (user_id, event, created_at) VALUES ($1, $2::jsonb, now() - make_interval(mins => $3))',
    [userId, JSON.stringify(event), minutesAgo]
  );
}

for (const e of seed.pondEvents) {
  const userId = userIds.get(e.user);
  if (userId === undefined) throw new Error(`seed: pondEvents sem o utilizador ${e.user}`);
  await pondEvent(userId, e.minutesAgo, e.event);
}

// Um evento por pinguim: o pinguim-01 é o mais recente (1 minuto), o
// pinguim-30 o mais antigo (30 minutos), todos mais novos do que os de cima.
for (let i = 1; i <= fillers.count; i += 1) {
  const login = `${fillers.loginPrefix}-${String(i).padStart(2, '0')}`;
  await pondEvent(userIds.get(login), i, { kind: 'level-up', level: Math.floor(fillers.level) });
}

await client.close();
