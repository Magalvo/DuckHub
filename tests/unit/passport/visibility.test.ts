// POST /account/visibility (WI-0009, ADR 0010): Origin, sessão e o campo do
// formulário, para lá do contrato e2e. Dados inventados.
import { describe, expect, it } from 'vitest';

import { hashToken, SESSION_COOKIE, type AuthDeps } from '../../../src/auth/handlers.js';
import {
  handleSetVisibility,
  type PassportVisibilityStore,
} from '../../../src/passport/visibility.js';

const ORIGIN = 'http://localhost:3000';
const TOKEN = 'token-sintetico-v1s';
const NOW = 1_800_000_000_000;

function setup() {
  const hidden = new Map<string, boolean>();
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
      upsertUser: () => Promise.resolve({ userId: 'user-1' }),
      createSession: () => Promise.resolve(),
      findSession: (h) =>
        Promise.resolve(h === hashToken(TOKEN) ? { userId: 'user-1', expiresAt: NOW + 1 } : null),
      renewSession: () => Promise.resolve(),
      deleteSession: () => Promise.resolve(),
      deleteUser: () => Promise.resolve(),
    },
  };
  const store: PassportVisibilityStore = {
    loadPublic: () => Promise.resolve(null),
    isHidden: (id) => Promise.resolve(hidden.get(id) ?? false),
    setHidden: (id, value) => {
      hidden.set(id, value);
      return Promise.resolve();
    },
  };
  return { deps: { auth, store }, hidden };
}

function post(
  body: string,
  init: { origin?: string; token?: string | null; type?: string } = {}
): Request {
  const headers = new Headers({
    'content-type': init.type ?? 'application/x-www-form-urlencoded',
  });
  if (init.token !== null) headers.set('cookie', `${SESSION_COOKIE}=${init.token ?? TOKEN}`);
  if (init.origin !== undefined) headers.set('origin', init.origin);
  return new Request(`${ORIGIN}/account/visibility`, { method: 'POST', headers, body });
}

describe('handleSetVisibility', () => {
  it.each([
    ['true', true],
    ['false', false],
  ])('hidden=%s guarda a escolha e responde 303 para /account', async (value, expected) => {
    const env = setup();
    const res = await handleSetVisibility(post(`hidden=${value}`, { origin: ORIGIN }), env.deps);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/account');
    expect(env.hidden.get('user-1')).toBe(expected);
  });

  it('sem Origin (cliente que não o envia) aceita, como o logout', async () => {
    const env = setup();
    const res = await handleSetVisibility(post('hidden=true'), env.deps);
    expect(res.status).toBe(303);
    expect(env.hidden.get('user-1')).toBe(true);
  });

  it('um Origin de outro site é recusado com 403 e nada muda', async () => {
    const env = setup();
    const res = await handleSetVisibility(
      post('hidden=true', { origin: 'https://site-malicioso.example' }),
      env.deps
    );
    expect(res.status).toBe(403);
    expect(env.hidden.size).toBe(0);
  });

  it.each([
    ['sem cookie', null],
    ['sessão que não existe', 'inventado'],
  ])('%s: 303 para /login e nada muda', async (_case, token) => {
    const env = setup();
    const res = await handleSetVisibility(post('hidden=true', { token }), env.deps);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/login');
    expect(env.hidden.size).toBe(0);
  });

  it.each([
    ['sem o campo', ''],
    ['valor que não é true nem false', 'hidden=sim'],
    ['maiúsculas', 'hidden=TRUE'],
  ])('%s: 400 e nada muda', async (_case, body) => {
    const env = setup();
    const res = await handleSetVisibility(post(body), env.deps);
    expect(res.status).toBe(400);
    expect(env.hidden.size).toBe(0);
  });

  it('um corpo que não é formulário dá 400', async () => {
    const env = setup();
    const res = await handleSetVisibility(
      post('{"hidden":"true"}', { type: 'application/json' }),
      env.deps
    );
    expect(res.status).toBe(400);
    expect(env.hidden.size).toBe(0);
  });
});
