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

for (const user of seed.users) {
  const { rows } = await client.query(
    'INSERT INTO users (intra_id, login, campus_id) VALUES ($1, $2, $3) RETURNING id',
    [user.intraId, user.login, user.campusId]
  );
  const userId = rows[0].id;
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

await client.close();
