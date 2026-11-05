// tests/acceptance/wi-0004-login.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-04 (auth própria, tokens da 42 não guardados, sessão de 30 dias).
// Revê antes do commit: depois de entrar, isto é o contrato.
// Corre sem rede, sem BD e sem a 42 real: tudo é injetado. Dados inventados.
import { describe, expect, it } from 'vitest';

import {
  getSession,
  handleCallback,
  handleDeleteAccount,
  handleLogin,
  handleLogout,
  SESSION_COOKIE,
  SESSION_TTL_MS,
  STATE_COOKIE,
  type AuthDeps,
  type SessionStore,
} from '../../src/auth/handlers.js';
import type { Profile, Result } from '../../src/intra/client.js';

const ORIGIN = 'http://localhost:3000';
const ACCESS_TOKEN = 'ACCESS-TOKEN-SINTETICO-5d1e';
const CLIENT_SECRET = 'CLIENT-SECRET-SINTETICO-4c7f';
const ALLOWED = [9001, 9002];
const DAY = 24 * 60 * 60 * 1000;

// ---------- Dublês ----------

interface StoredUser {
  intraId: number;
  login: string;
  campusId: number;
}

/** Store em memória, para o contrato não depender da BD. */
function memoryStore() {
  const users = new Map<string, StoredUser>();
  const sessions = new Map<string, { userId: string; expiresAt: number }>();
  const deletedUsers: string[] = [];
  const store: SessionStore = {
    upsertUser: (user) => {
      const existing = [...users].find(([, u]) => u.intraId === user.intraId)?.[0];
      const userId = existing ?? `user-${String(users.size + 1)}`;
      users.set(userId, user);
      return Promise.resolve({ userId });
    },
    createSession: ({ idHash, userId, expiresAt }) => {
      sessions.set(idHash, { userId, expiresAt });
      return Promise.resolve();
    },
    findSession: (idHash) => Promise.resolve(sessions.get(idHash) ?? null),
    renewSession: (idHash, expiresAt) => {
      const s = sessions.get(idHash);
      if (s !== undefined) sessions.set(idHash, { ...s, expiresAt });
      return Promise.resolve();
    },
    deleteSession: (idHash) => {
      sessions.delete(idHash);
      return Promise.resolve();
    },
    deleteUser: (userId) => {
      users.delete(userId);
      for (const [h, s] of sessions) if (s.userId === userId) sessions.delete(h);
      deletedUsers.push(userId);
      return Promise.resolve();
    },
  };
  return { store, users, sessions, deletedUsers };
}

const profile = (campusId: number, cursus: Profile['cursus']): Profile => ({
  id: 90001,
  login: 'pato-teste',
  imageUrl: null,
  primaryCampus: { id: campusId, name: 'Campus Sintético' },
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  cursus,
});
const piscineOnly: Profile['cursus'] = [
  { id: 9, slug: 'c-piscine', name: 'C Piscine', level: 8.42 },
];

interface Options {
  profile?: Result<Profile>;
  exchangeFails?: boolean;
  secureCookies?: boolean;
}

function setup(options: Options = {}) {
  let now = 1_800_000_000_000;
  let n = 0;
  const mem = memoryStore();
  const exchanged: string[] = [];
  const deps: AuthDeps = {
    config: {
      clientId: 'client-id-sintetico',
      clientSecret: CLIENT_SECRET,
      redirectUri: `${ORIGIN}/auth/callback`,
      allowedCampusIds: ALLOWED,
      secureCookies: options.secureCookies ?? false,
    },
    clock: { now: () => now },
    randomToken: () => {
      n += 1;
      return `aleatorio-${String(n)}-q7Zk2mW9xPa4LrT8vBn3`;
    },
    exchangeCode: (code) => {
      exchanged.push(code);
      return Promise.resolve(
        options.exchangeFails === true ? { ok: false } : { ok: true, accessToken: ACCESS_TOKEN }
      );
    },
    fetchProfile: (token) =>
      Promise.resolve(
        token === ACCESS_TOKEN
          ? (options.profile ?? { ok: true, value: profile(9001, piscineOnly) })
          : { ok: false, error: { kind: 'http', status: 401 } }
      ),
    // WI-0005: a sincronização do Passaporte tem contrato próprio.
    syncPassport: () => Promise.resolve(),
    store: mem.store,
  };
  return {
    deps,
    mem,
    exchanged,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

type Env = ReturnType<typeof setup>;

const request = (
  path: string,
  init: { method?: string; cookies?: Record<string, string> } = {}
): Request =>
  new Request(`${ORIGIN}${path}`, {
    method: init.method ?? 'GET',
    headers:
      init.cookies === undefined
        ? {}
        : {
            cookie: Object.entries(init.cookies)
              .map(([k, v]) => `${k}=${v}`)
              .join('; '),
          },
  });

/** Um cookie da resposta: valor e atributos (em minúsculas). */
function cookie(res: Response, name: string): { value: string; attrs: string[] } | undefined {
  for (const line of res.headers.getSetCookie()) {
    const [pair = '', ...attrs] = line.split(';').map((p) => p.trim());
    const eq = pair.indexOf('=');
    if (pair.slice(0, eq) === name) {
      return { value: pair.slice(eq + 1), attrs: attrs.map((a) => a.toLowerCase()) };
    }
  }
  return undefined;
}

/** O cookie foi apagado (Max-Age=0 ou data no passado). */
const cleared = (c: { value: string; attrs: string[] } | undefined): boolean =>
  c !== undefined &&
  (c.value === '' ||
    c.attrs.includes('max-age=0') ||
    c.attrs.some((a) => a.startsWith('expires=') && Date.parse(a.slice(8)) < Date.now()));

const location = (res: Response): URL => new URL(res.headers.get('location') ?? '', ORIGIN);

/** Faz o fluxo completo: /auth/login e depois o callback com o state certo. */
async function login(env: Env, code = 'codigo-sintetico') {
  const start = await handleLogin(request('/auth/login'), env.deps);
  const state = cookie(start, STATE_COOKIE)?.value ?? '';
  const res = await handleCallback(
    request(`/auth/callback?code=${code}&state=${encodeURIComponent(state)}`, {
      cookies: { [STATE_COOKIE]: state },
    }),
    env.deps
  );
  return { start, res, session: cookie(res, SESSION_COOKIE)?.value ?? '' };
}

const withSession = (token: string) => ({ cookies: { [SESSION_COOKIE]: token } });

// ---------- Contrato ----------

describe('WI-0004 — login com OAuth da 42', () => {
  it('AC1: o login encaminha para a autorização da 42 com state', async () => {
    const env = setup();
    const res = await handleLogin(request('/auth/login'), env.deps);
    expect([302, 303, 307]).toContain(res.status);
    const to = location(res);
    expect(`${to.origin}${to.pathname}`).toBe('https://api.intra.42.fr/oauth/authorize');
    expect(to.searchParams.get('client_id')).toBe('client-id-sintetico');
    expect(to.searchParams.get('redirect_uri')).toBe(`${ORIGIN}/auth/callback`);
    expect(to.searchParams.get('response_type')).toBe('code');
    expect(to.searchParams.get('scope')).toBe('public');
    const state = cookie(res, STATE_COOKIE);
    expect(state?.value).toBeTruthy();
    expect(to.searchParams.get('state')).toBe(state?.value);
    expect(state?.attrs).toContain('httponly');
    expect(state?.attrs).toContain('samesite=lax');
  });

  it('AC1: sem cookie de sessão não há sessão', async () => {
    const env = setup();
    expect(await getSession(request('/'), env.deps)).toBeNull();
    expect(await getSession(request('/', withSession('inventado')), env.deps)).toBeNull();
  });

  it('AC2: campus permitido, só com a Piscine: fica com sessão e vai para /', async () => {
    const env = setup();
    const { res, session } = await login(env);
    expect([302, 303, 307]).toContain(res.status);
    expect(location(res).pathname).toBe('/');
    expect(env.exchanged).toEqual(['codigo-sintetico']);
    expect(session).not.toBe('');
    const attrs = cookie(res, SESSION_COOKIE)?.attrs ?? [];
    expect(attrs).toContain('httponly');
    expect(attrs).toContain('samesite=lax');
    expect(attrs).toContain('path=/');
    expect(attrs).toContain(`max-age=${String(SESSION_TTL_MS / 1000)}`);
    expect(await getSession(request('/', withSession(session)), env.deps)).not.toBeNull();
    expect([...env.mem.users.values()]).toEqual([
      { intraId: 90001, login: 'pato-teste', campusId: 9001 },
    ]);
  });

  it('AC2: o segundo campus permitido, com 42cursus, também entra', async () => {
    const cursus = [...piscineOnly, { id: 21, slug: '42cursus', name: '42cursus', level: 5.17 }];
    const env = setup({ profile: { ok: true, value: profile(9002, cursus) } });
    const { session } = await login(env);
    expect(await getSession(request('/', withSession(session)), env.deps)).not.toBeNull();
  });

  it('AC3: outro campus é recusado, sem sessão e sem dados guardados', async () => {
    const env = setup({ profile: { ok: true, value: profile(4242, piscineOnly) } });
    const { res } = await login(env);
    const to = location(res);
    expect(to.pathname).toBe('/login');
    expect(to.searchParams.get('error')).toBe('campus');
    expect(cookie(res, SESSION_COOKIE)?.value ?? '').toBe('');
    expect(env.mem.sessions.size).toBe(0);
    expect(env.mem.users.size).toBe(0);
  });

  it('AC4: os tokens da 42 e o client secret nunca chegam ao browser nem à BD', async () => {
    const env = setup();
    const { start, res, session } = await login(env);
    const after = await handleLogout(
      request('/auth/logout', { method: 'POST', ...withSession(session) }),
      env.deps
    );
    for (const r of [start, res, after]) {
      const headers = [...r.headers].map(([k, v]) => `${k}: ${v}`).join('\n');
      const body = await r.clone().text();
      for (const secret of [ACCESS_TOKEN, CLIENT_SECRET]) {
        expect(headers).not.toContain(secret);
        expect(body).not.toContain(secret);
      }
      for (const line of r.headers.getSetCookie()) {
        expect(line.toLowerCase()).toContain('httponly');
      }
    }
    const stored = JSON.stringify([[...env.mem.users], [...env.mem.sessions]]);
    expect(stored).not.toContain(ACCESS_TOKEN);
  });

  it('AC4: a BD guarda só o hash do token de sessão', async () => {
    const env = setup();
    const { session } = await login(env);
    expect(env.mem.sessions.size).toBe(1);
    expect(env.mem.sessions.has(session)).toBe(false);
    expect(JSON.stringify([...env.mem.sessions])).not.toContain(session);
  });

  it('AC4: com secureCookies, o cookie de sessão é Secure', async () => {
    const env = setup({ secureCookies: true });
    const { res } = await login(env);
    expect(cookie(res, SESSION_COOKIE)?.attrs).toContain('secure');
  });

  it('AC5: terminar sessão invalida-a no servidor', async () => {
    const env = setup();
    const { session } = await login(env);
    const res = await handleLogout(
      request('/auth/logout', { method: 'POST', ...withSession(session) }),
      env.deps
    );
    expect(location(res).pathname).toBe('/login');
    expect(cleared(cookie(res, SESSION_COOKIE))).toBe(true);
    expect(env.mem.sessions.size).toBe(0);
    // O cookie antigo, reenviado, já não vale.
    expect(await getSession(request('/', withSession(session)), env.deps)).toBeNull();
  });

  it('AC5: terminar sessão sem sessão não falha', async () => {
    const env = setup();
    const res = await handleLogout(request('/auth/logout', { method: 'POST' }), env.deps);
    expect(location(res).pathname).toBe('/login');
  });

  const failures: [string, (env: Env) => Promise<Response>][] = [
    [
      'o utilizador cancelou (error=access_denied)',
      (env) =>
        handleCallback(
          request('/auth/callback?error=access_denied&state=s1', {
            cookies: { [STATE_COOKIE]: 's1' },
          }),
          env.deps
        ),
    ],
    [
      'state diferente do cookie',
      (env) =>
        handleCallback(
          request('/auth/callback?code=c&state=s1', { cookies: { [STATE_COOKIE]: 's2' } }),
          env.deps
        ),
    ],
    [
      'sem cookie de state',
      (env) => handleCallback(request('/auth/callback?code=c&state=s1'), env.deps),
    ],
    [
      'sem código',
      (env) =>
        handleCallback(
          request('/auth/callback?state=s1', { cookies: { [STATE_COOKIE]: 's1' } }),
          env.deps
        ),
    ],
  ];
  it.each(failures)('AC6: %s → /login?error=oauth, sem sessão', async (_case, run) => {
    const env = setup();
    const res = await run(env);
    const to = location(res);
    expect(to.pathname).toBe('/login');
    expect(to.searchParams.get('error')).toBe('oauth');
    expect(env.exchanged).toEqual([]);
    expect(env.mem.sessions.size).toBe(0);
  });

  it('AC6: a troca do código falha → /login?error=oauth, sem sessão', async () => {
    const env = setup({ exchangeFails: true });
    const { res } = await login(env);
    expect(location(res).searchParams.get('error')).toBe('oauth');
    expect(env.mem.sessions.size).toBe(0);
  });

  it('AC6: o perfil não chega → /login?error=oauth, sem sessão', async () => {
    const env = setup({ profile: { ok: false, error: { kind: 'network' } } });
    const { res } = await login(env);
    expect(location(res).searchParams.get('error')).toBe('oauth');
    expect(env.mem.sessions.size).toBe(0);
    expect(env.mem.users.size).toBe(0);
  });

  it('AC7: apagar a conta remove o utilizador e termina a sessão', async () => {
    const env = setup();
    const { session } = await login(env);
    const [userId] = [...env.mem.users.keys()];
    const res = await handleDeleteAccount(
      request('/account/delete', { method: 'POST', ...withSession(session) }),
      env.deps
    );
    expect(location(res).pathname).toBe('/login');
    expect(cleared(cookie(res, SESSION_COOKIE))).toBe(true);
    expect(env.mem.deletedUsers).toEqual([userId]);
    expect(env.mem.users.size).toBe(0);
    expect(await getSession(request('/', withSession(session)), env.deps)).toBeNull();
  });

  it('AC7: sem sessão, apagar conta não apaga nada', async () => {
    const env = setup();
    await login(env);
    const res = await handleDeleteAccount(
      request('/account/delete', { method: 'POST', ...withSession('inventado') }),
      env.deps
    );
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(env.mem.deletedUsers).toEqual([]);
    expect(env.mem.users.size).toBe(1);
  });

  it('AC9: a sessão expira ao fim de 30 dias sem uso e cada uso renova o prazo', async () => {
    const env = setup();
    const { session } = await login(env);
    const req = () => request('/', withSession(session));
    env.advance(20 * DAY);
    expect(await getSession(req(), env.deps)).not.toBeNull(); // renova
    env.advance(20 * DAY); // 40 dias desde o login, 20 desde o último uso
    expect(await getSession(req(), env.deps)).not.toBeNull();
    env.advance(31 * DAY);
    expect(await getSession(req(), env.deps)).toBeNull();
  });
});
