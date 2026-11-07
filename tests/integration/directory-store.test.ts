// Diretório (WI-0010, ADR 0012) contra PostgreSQL real em memória (PGlite),
// com as migrações de drizzle/. Dados inventados.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { PAGE_SIZE, likePattern } from '../../src/community/directory.js';
import { createDrizzleDirectoryStore, type DirectoryStore } from '../../src/community/store.js';
import type { PassportSnapshot } from '../../src/passport/passport.js';

let client: PGlite;
let directory: DirectoryStore;
let nextIntraId = 90000;

const T0 = '2026-11-04T14:30:00Z';
const T1 = '2026-11-05T14:30:00Z';

const snapshot = (login: string, campus = 'Campus Sintético'): PassportSnapshot => ({
  login,
  campus,
  piscine: { month: 'july', year: 2022 },
  isAlumni: false,
  coalition: null,
  cursus: [{ slug: '42cursus', name: '42cursus', level: 3.5 }],
  projects: [],
});

/** Um membro: users + (opcionalmente) passports, por SQL direto. */
async function member(
  login: string,
  opts: {
    campusId?: number;
    campus?: string;
    hidden?: boolean;
    syncedAt?: string | null;
    snapshot?: unknown;
  } = {}
): Promise<string> {
  nextIntraId += 1;
  const { rows } = await client.query<{ id: string }>(
    'INSERT INTO users (intra_id, login, campus_id, passport_hidden) VALUES ($1, $2, $3, $4) RETURNING id',
    [nextIntraId, login, opts.campusId ?? 9001, opts.hidden ?? false]
  );
  const [row] = rows;
  if (row === undefined) throw new Error('INSERT users sem linha');
  if (opts.syncedAt !== null) {
    await client.query(
      'INSERT INTO passports (user_id, snapshot, synced_at) VALUES ($1, $2::jsonb, $3)',
      [row.id, JSON.stringify(opts.snapshot ?? snapshot(login, opts.campus)), opts.syncedAt ?? T0]
    );
  }
  return row.id;
}

const list = async (filter: { q?: string; campusId?: number; page?: number } = {}) =>
  directory.listMembers({
    pattern: filter.q === undefined ? null : likePattern(filter.q),
    campusId: filter.campusId ?? null,
    page: filter.page ?? 1,
  });
const logins = async (filter: Parameters<typeof list>[0] = {}) =>
  (await list(filter)).members.map((m) => m.snapshot.login);

beforeAll(async () => {
  client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: 'drizzle' });
  directory = createDrizzleDirectoryStore(db);
});

beforeEach(async () => {
  await client.exec('TRUNCATE users CASCADE');
});

describe('listMembers (PGlite)', () => {
  it('só membros visíveis com Passaporte', async () => {
    await member('pato-teste');
    await member('garca-teste', { hidden: true });
    await member('ganso-teste', { syncedAt: null });
    expect(await logins()).toEqual(['pato-teste']);
  });

  it('devolve o snapshot validado e a data de sync', async () => {
    await member('pato-teste', { syncedAt: T1 });
    expect((await list()).members).toEqual([
      { snapshot: snapshot('pato-teste'), syncedAt: Date.parse(T1) },
    ]);
  });

  it('ordem por bytes (COLLATE "C"), igual em qualquer BD', async () => {
    for (const login of ['ab', 'a0', 'a-b', 'b', 'Z']) await member(login);
    expect(await logins()).toEqual(['Z', 'a-b', 'a0', 'ab', 'b']);
  });

  it('logins repetidos: vale o que sincronizou por último', async () => {
    await member('pato-teste', { syncedAt: T0, campus: 'Antigo' });
    await member('pato-teste', { syncedAt: T1, campus: 'Novo' });
    const { members } = await list();
    expect(members.map((m) => m.snapshot.campus)).toEqual(['Novo']);
  });

  it('logins repetidos: se o mais recente está escondido, o login não aparece', async () => {
    await member('pato-teste', { syncedAt: T0 });
    await member('pato-teste', { syncedAt: T1, hidden: true });
    expect(await logins()).toEqual([]);
  });

  it('páginas de 24; a seguinte só existe se a BD devolveu a 25.ª linha', async () => {
    for (let i = 1; i <= PAGE_SIZE + 1; i += 1) await member(`m-${String(i).padStart(2, '0')}`);
    const first = await list();
    expect(first.members).toHaveLength(PAGE_SIZE);
    expect(first.hasNext).toBe(true);
    const second = await list({ page: 2 });
    expect(second.members.map((m) => m.snapshot.login)).toEqual(['m-25']);
    expect(second.hasNext).toBe(false);
  });

  it('exatamente 24: sem página seguinte', async () => {
    for (let i = 1; i <= PAGE_SIZE; i += 1) await member(`m-${String(i).padStart(2, '0')}`);
    expect((await list()).hasNext).toBe(false);
  });

  it('um snapshot inválido fica de fora, sem esconder a página seguinte nem saltar membros', async () => {
    for (let i = 1; i <= PAGE_SIZE + 1; i += 1) {
      const login = `m-${String(i).padStart(2, '0')}`;
      // O 24.º é inválido: a página 1 mostra 23, mas a 25.ª linha diz que há mais.
      await member(login, i === PAGE_SIZE ? { snapshot: { login } } : {});
    }
    const first = await list();
    expect(first.members).toHaveLength(PAGE_SIZE - 1);
    expect(first.members.map((m) => m.snapshot.login)).not.toContain('m-24');
    expect(first.hasNext).toBe(true);
    expect(await logins({ page: 2 })).toEqual(['m-25']);
  });

  it('procura por qualquer parte do login, sem distinguir maiúsculas', async () => {
    await member('dde-maga');
    await member('marreco-teste');
    expect(await logins({ q: 'MAG' })).toEqual(['dde-maga']);
    expect(await logins({ q: 'arreco' })).toEqual(['marreco-teste']);
  });

  it.each([
    ['%', 'pato'],
    ['_', 'pato'],
    ['\\', 'pato'],
  ])('"%s" procura-se como texto, não como padrão', async (q, other) => {
    await member(other);
    await member(`a${q}b`);
    expect(await logins({ q })).toEqual([`a${q}b`]);
  });

  it('filtro por campus, com o campus_id de users', async () => {
    await member('pato-teste', { campusId: 9001 });
    await member('pinguim-01', { campusId: 9002, campus: 'Campus Sintético B' });
    expect(await logins({ campusId: 9002 })).toEqual(['pinguim-01']);
    expect(await logins({ campusId: 9002, q: 'pato' })).toEqual([]);
  });
});

describe('campusOptions (PGlite)', () => {
  it('só campus com membros visíveis, com o nome do snapshot mais recente, A→Z', async () => {
    await member('pinguim-01', { campusId: 9002, campus: 'Nome Antigo', syncedAt: T0 });
    await member('pinguim-02', { campusId: 9002, campus: 'Campus Sintético B', syncedAt: T1 });
    await member('pato-teste', { campusId: 9001 });
    await member('garca-teste', { campusId: 9003, campus: 'Só Escondidos', hidden: true });
    await member('ganso-teste', { campusId: 9004, syncedAt: null });
    expect(await directory.campusOptions()).toEqual([
      { id: 9001, name: 'Campus Sintético' },
      { id: 9002, name: 'Campus Sintético B' },
    ]);
  });
});
