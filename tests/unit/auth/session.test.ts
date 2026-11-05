// Detalhes da sessão para lá do contrato: limiar de renovação (ADR 0007),
// limpeza de sessões expiradas, CSRF nos POST e caminhos públicos do proxy.
import { describe, expect, it } from 'vitest';

import {
  handleDeleteAccount,
  handleLogout,
  hashToken,
  RENEW_AFTER_MS,
  resolveSession,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  type AuthDeps,
} from '../../../src/auth/handlers.js';
import { isPublicPath } from '../../../src/auth/public-paths.js';

const ORIGIN = 'http://localhost:3000';
const TOKEN = 'token-sintetico-7f1c';

function setup(expiresAt: number) {
  let now = 1_800_000_000_000;
  const sessions = new Map([[hashToken(TOKEN), { userId: 'user-1', expiresAt: now + expiresAt }]]);
  const renewals: number[] = [];
  const deletedUsers: string[] = [];
  const deps: AuthDeps = {
    config: {
      clientId: 'id',
      clientSecret: 'segredo',
      redirectUri: `${ORIGIN}/auth/callback`,
      allowedCampusIds: [9001],
      secureCookies: false,
    },
    clock: { now: () => now },
    randomToken: () => 'aleatorio',
    exchangeCode: () => Promise.resolve({ ok: false }),
    fetchProfile: () => Promise.resolve({ ok: false, error: { kind: 'network' } }),
    syncPassport: () => Promise.resolve(),
    store: {
      upsertUser: () => Promise.resolve({ userId: 'user-1' }),
      createSession: () => Promise.resolve(),
      findSession: (h) => Promise.resolve(sessions.get(h) ?? null),
      renewSession: (h, at) => {
        renewals.push(at);
        const s = sessions.get(h);
        if (s !== undefined) sessions.set(h, { ...s, expiresAt: at });
        return Promise.resolve();
      },
      deleteSession: (h) => {
        sessions.delete(h);
        return Promise.resolve();
      },
      deleteUser: (id) => {
        deletedUsers.push(id);
        return Promise.resolve();
      },
    },
  };
  return {
    deps,
    sessions,
    renewals,
    deletedUsers,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

const req = (path = '/', init: { method?: string; origin?: string } = {}) =>
  new Request(`${ORIGIN}${path}`, {
    method: init.method ?? 'GET',
    headers: {
      cookie: `${SESSION_COOKIE}=${TOKEN}`,
      ...(init.origin === undefined ? {} : { origin: init.origin }),
    },
  });

describe('resolveSession', () => {
  it('não escreve na BD enquanto o prazo avança menos de 1 h', async () => {
    const env = setup(SESSION_TTL_MS);
    env.advance(RENEW_AFTER_MS - 1000);
    expect(await resolveSession(req(), env.deps)).toEqual({
      userId: 'user-1',
      token: TOKEN,
      renewed: false,
    });
    expect(env.renewals).toEqual([]);
  });

  it('renova quando o prazo avança mais de 1 h', async () => {
    const env = setup(SESSION_TTL_MS);
    env.advance(RENEW_AFTER_MS + 1000);
    expect((await resolveSession(req(), env.deps))?.renewed).toBe(true);
    expect(env.renewals).toHaveLength(1);
  });

  it('apaga a sessão expirada na BD', async () => {
    const env = setup(1000);
    env.advance(1000);
    expect(await resolveSession(req(), env.deps)).toBeNull();
    expect(env.sessions.size).toBe(0);
  });
});

describe('CSRF nos POST', () => {
  it('recusa logout e apagamento vindos de outra origem', async () => {
    const env = setup(SESSION_TTL_MS);
    const evil = { method: 'POST', origin: 'https://evil.example' };
    expect((await handleLogout(req('/auth/logout', evil), env.deps)).status).toBe(403);
    expect((await handleDeleteAccount(req('/account/delete', evil), env.deps)).status).toBe(403);
    expect(env.sessions.size).toBe(1);
    expect(env.deletedUsers).toEqual([]);
  });

  it('aceita a origem da app', async () => {
    const env = setup(SESSION_TTL_MS);
    const res = await handleDeleteAccount(
      req('/account/delete', { method: 'POST', origin: ORIGIN }),
      env.deps
    );
    expect(res.status).toBe(303);
    expect(env.deletedUsers).toEqual(['user-1']);
  });
});

describe('isPublicPath', () => {
  it.each(['/login', '/privacy', '/auth/login', '/auth/callback'])('%s é público', (p) => {
    expect(isPublicPath(p)).toBe(true);
  });
  it.each(['/', '/account', '/account/delete', '/loginx', '/privacy/x', '/authx'])(
    '%s exige sessão',
    (p) => {
      expect(isPublicPath(p)).toBe(false);
    }
  );
});
