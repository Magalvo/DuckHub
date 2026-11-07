// POST /pond/ducks (WI-0013, ADR 0014): a ordem das respostas, a regra do
// próprio e a página de volta, para lá do contrato e2e. Dados inventados.
import { describe, expect, it } from 'vitest';

import { hashToken, SESSION_COOKIE, type AuthDeps } from '../../../src/auth/handlers.js';
import { handleDuck } from '../../../src/pond/ducks.js';

const ORIGIN = 'http://localhost:3000';
const TOKEN = 'token-sintetico-duck';
const NOW = 1_800_000_000_000;
const ME = 'user-1';

/** Eventos que o utilizador vê: 7 é de outra pessoa, 8 é dele. */
const visible = new Map([
  [7, 'user-2'],
  [8, ME],
]);

function setup() {
  const ducks = new Set<string>();
  const auth: AuthDeps = {
    config: {
      clientId: 'id',
      clientSecret: 'segredo',
      redirectUri: `${ORIGIN}/auth/callback`,
      allowedCampusIds: [9001],
      secureCookies: false,
    },
    clock: { now: () => NOW },
    randomToken: () => 'aleatorio',
    exchangeCode: () => Promise.resolve({ ok: false }),
    fetchProfile: () => Promise.resolve({ ok: false, error: { kind: 'network' } }),
    syncPassport: () => Promise.resolve(),
    store: {
      upsertUser: () => Promise.resolve({ userId: ME }),
      createSession: () => Promise.resolve(),
      findSession: (h) =>
        Promise.resolve(h === hashToken(TOKEN) ? { userId: ME, expiresAt: NOW + 1 } : null),
      renewSession: () => Promise.resolve(),
      deleteSession: () => Promise.resolve(),
      deleteUser: () => Promise.resolve(),
    },
  };
  const store = {
    findVisibleEvent: ({ eventId }: { viewerId: string; eventId: number }) => {
      const ownerId = visible.get(eventId);
      return Promise.resolve(ownerId === undefined ? null : { ownerId });
    },
    giveDuck: ({ userId, eventId }: { userId: string; eventId: number }) => {
      ducks.add(`${String(eventId)}:${userId}`);
      return Promise.resolve();
    },
    takeDuck: ({ userId, eventId }: { userId: string; eventId: number }) => {
      ducks.delete(`${String(eventId)}:${userId}`);
      return Promise.resolve();
    },
  };
  return { deps: { auth, store }, ducks };
}

function post(body: string, init: { origin?: string; token?: string | null } = {}): Request {
  const headers = new Headers({ 'content-type': 'application/x-www-form-urlencoded' });
  if (init.token !== null) headers.set('cookie', `${SESSION_COOKIE}=${init.token ?? TOKEN}`);
  if (init.origin !== undefined) headers.set('origin', init.origin);
  return new Request(`${ORIGIN}/pond/ducks`, { method: 'POST', headers, body });
}

describe('handleDuck', () => {
  it('dar e retirar respondem 303 para a página de onde veio', async () => {
    const env = setup();
    const give = await handleDuck(post('event=7&duck=give&page=2', { origin: ORIGIN }), env.deps);
    expect(give.status).toBe(303);
    expect(give.headers.get('location')).toBe('/pond?page=2');
    expect([...env.ducks]).toEqual([`7:${ME}`]);

    const take = await handleDuck(post('event=7&duck=take'), env.deps);
    expect(take.headers.get('location')).toBe('/pond');
    expect(env.ducks.size).toBe(0);
  });

  it.each(['abc', '0', '-1', '99999'])(
    'page=%s inválida ou fora do feed volta à página certa',
    async (page) => {
      const env = setup();
      const res = await handleDuck(post(`event=7&duck=give&page=${page}`), env.deps);
      expect(res.status).toBe(303);
      expect(res.headers.get('location')).toBe('/pond');
    }
  );

  it('um Origin de outro site dá 403 antes de tudo, mesmo sem sessão', async () => {
    const env = setup();
    const res = await handleDuck(
      post('event=x', { origin: 'https://site-malicioso.example', token: null }),
      env.deps
    );
    expect(res.status).toBe(403);
    expect(env.ducks.size).toBe(0);
  });

  it('sem sessão: 303 para /login, antes de validar os campos', async () => {
    const env = setup();
    const res = await handleDuck(post('event=x', { token: 'inventado' }), env.deps);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/login');
  });

  it.each([
    ['sem campos', ''],
    ['sem event', 'duck=give'],
    ['event com letras', 'event=7a&duck=give'],
    ['event com sinal', 'event=-7&duck=give'],
    ['event demasiado grande', `event=${'9'.repeat(16)}&duck=give`],
    ['duck desconhecido', 'event=7&duck=maybe'],
    ['duck em maiúsculas', 'event=7&duck=GIVE'],
  ])('%s: 400 e nada muda', async (_case, body) => {
    const env = setup();
    const res = await handleDuck(post(body), env.deps);
    expect(res.status).toBe(400);
    expect(env.ducks.size).toBe(0);
  });

  it('um evento que não vê (inexistente, expirado ou escondido) dá 404', async () => {
    const env = setup();
    expect((await handleDuck(post('event=999&duck=give'), env.deps)).status).toBe(404);
    expect(env.ducks.size).toBe(0);
  });

  it.each(['give', 'take'])('um evento do próprio dá 403 (%s)', async (duck) => {
    const env = setup();
    expect((await handleDuck(post(`event=8&duck=${duck}`), env.deps)).status).toBe(403);
    expect(env.ducks.size).toBe(0);
  });
});
