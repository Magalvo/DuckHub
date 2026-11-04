// Login com o OAuth da 42 (WI-0004, ADR 0007). Web Application Flow próprio,
// sem biblioteca: um só provider, e assim os tokens e o apagamento ficam sob
// controlo. Os handlers recebem e devolvem Request/Response padrão e todas as
// dependências vêm injetadas; as rotas do Next limitam-se a ligá-los.
//
// O access token da 42 só existe dentro do handleCallback: serve para ler o
// perfil e descarta-se. Nunca vai para cookies, respostas, BD ou logs (AC4).
import { createHash, timingSafeEqual } from 'node:crypto';

import type { Profile, Result } from '../intra/client';

export const SESSION_COOKIE = 'dh_session';
export const STATE_COOKIE = 'dh_oauth_state';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // AC9
/** O prazo só se escreve na BD quando avança mais do que isto (ADR 0007). */
export const RENEW_AFTER_MS = 60 * 60 * 1000;

const STATE_TTL_S = 10 * 60;
const AUTHORIZE_URL = 'https://api.intra.42.fr/oauth/authorize';

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string; // ex.: http://localhost:3000/auth/callback
  allowedCampusIds: readonly number[];
  secureCookies: boolean; // true fora de localhost
}

/** Persistência. Em produção: Drizzle sobre PostgreSQL (src/db/store.ts). */
export interface SessionStore {
  upsertUser(user: { intraId: number; login: string; campusId: number }): Promise<{
    userId: string;
  }>;
  createSession(session: { idHash: string; userId: string; expiresAt: number }): Promise<void>;
  findSession(idHash: string): Promise<{ userId: string; expiresAt: number } | null>;
  renewSession(idHash: string, expiresAt: number): Promise<void>;
  deleteSession(idHash: string): Promise<void>;
  /** Apaga o utilizador e tudo o que lhe pertence (sessões incluídas). AC7. */
  deleteUser(userId: string): Promise<void>;
}

export interface AuthDeps {
  config: AuthConfig;
  clock: { now(): number }; // ms
  randomToken: () => string; // em produção: 32 bytes aleatórios, base64url
  /** POST /oauth/token da 42. O refresh token, se vier, é descartado. */
  exchangeCode: (code: string) => Promise<{ ok: true; accessToken: string } | { ok: false }>;
  /** Perfil do utilizador, via cliente do WI-0003. */
  fetchProfile: (accessToken: string) => Promise<Result<Profile>>;
  store: SessionStore;
}

// ---------- Cookies ----------

function readCookie(req: Request, name: string): string | null {
  for (const part of (req.headers.get('cookie') ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq !== -1 && part.slice(0, eq).trim() === name) {
      const value = part.slice(eq + 1).trim();
      return value === '' ? null : value;
    }
  }
  return null;
}

/** Todos os cookies da app são HttpOnly e SameSite=Lax (AC4). */
function setCookie(
  name: string,
  value: string,
  opts: { maxAge: number; path: string; secure: boolean }
): string {
  const secure = opts.secure ? '; Secure' : '';
  return `${name}=${value}; Path=${opts.path}; Max-Age=${String(opts.maxAge)}; HttpOnly; SameSite=Lax${secure}`;
}

/** Set-Cookie da sessão; o proxy reenvia-o quando o prazo é renovado. */
export const sessionCookie = (token: string, config: AuthConfig): string =>
  setCookie(SESSION_COOKIE, token, {
    maxAge: SESSION_TTL_MS / 1000,
    path: '/',
    secure: config.secureCookies,
  });

export const clearSessionCookie = (config: AuthConfig): string =>
  setCookie(SESSION_COOKIE, '', { maxAge: 0, path: '/', secure: config.secureCookies });

const clearStateCookie = (config: AuthConfig): string =>
  setCookie(STATE_COOKIE, '', { maxAge: 0, path: '/auth', secure: config.secureCookies });

/** Location relativa: o browser resolve-a contra a origem pública da app. */
function redirect(location: string, status: 302 | 303, cookies: readonly string[]): Response {
  const headers = new Headers({ location, 'cache-control': 'no-store' });
  for (const c of cookies) headers.append('set-cookie', c);
  return new Response(null, { status, headers });
}

// ---------- Utilitários ----------

/** A BD só guarda isto, nunca o token do cookie (AC4). */
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

function sameString(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Defesa contra CSRF nos POST, além do SameSite=Lax: um Origin presente tem de
 * ser o da app. Sem Origin (clientes que não o enviam) decide o SameSite.
 */
function crossOrigin(req: Request, config: AuthConfig): boolean {
  const origin = req.headers.get('origin');
  return origin !== null && origin !== new URL(config.redirectUri).origin;
}

const forbidden = (): Response => new Response(null, { status: 403 });

// ---------- Handlers ----------

/** GET /auth/login → 302 para o authorize da 42, com cookie de state. */
export function handleLogin(_req: Request, deps: AuthDeps): Promise<Response> {
  const { config } = deps;
  const state = deps.randomToken();
  const to = new URL(AUTHORIZE_URL);
  to.searchParams.set('client_id', config.clientId);
  to.searchParams.set('redirect_uri', config.redirectUri);
  to.searchParams.set('response_type', 'code');
  to.searchParams.set('scope', 'public');
  to.searchParams.set('state', state);
  const stateCookie = setCookie(STATE_COOKIE, state, {
    maxAge: STATE_TTL_S,
    path: '/auth',
    secure: config.secureCookies,
  });
  return Promise.resolve(redirect(to.toString(), 302, [stateCookie]));
}

/** GET /auth/callback → 302 para / com sessão, ou para /login?error=… sem sessão. */
export async function handleCallback(req: Request, deps: AuthDeps): Promise<Response> {
  const { config, store } = deps;
  const fail = (error: 'oauth' | 'campus'): Response =>
    redirect(`/login?error=${error}`, 302, [clearStateCookie(config)]);

  const params = new URL(req.url).searchParams;
  const code = params.get('code');
  const state = params.get('state');
  const expected = readCookie(req, STATE_COOKIE);
  if (
    params.has('error') ||
    code === null ||
    code === '' ||
    state === null ||
    expected === null ||
    !sameString(state, expected)
  ) {
    return fail('oauth');
  }

  const token = await deps.exchangeCode(code);
  if (!token.ok) return fail('oauth');
  const profile = await deps.fetchProfile(token.accessToken);
  if (!profile.ok) return fail('oauth');

  const { id: intraId, login, primaryCampus } = profile.value;
  if (!config.allowedCampusIds.includes(primaryCampus.id)) return fail('campus');

  const { userId } = await store.upsertUser({ intraId, login, campusId: primaryCampus.id });
  const session = deps.randomToken();
  await store.createSession({
    idHash: hashToken(session),
    userId,
    expiresAt: deps.clock.now() + SESSION_TTL_MS,
  });
  return redirect('/', 302, [clearStateCookie(config), sessionCookie(session, config)]);
}

/**
 * Sessão válida do pedido, ou null. Apaga-a se expirou (AC9) e renova o prazo
 * quando avança mais de RENEW_AFTER_MS; `renewed` diz se o cookie deve ser
 * reenviado com o Max-Age novo.
 */
export async function resolveSession(
  req: Request,
  deps: AuthDeps
): Promise<{ userId: string; token: string; renewed: boolean } | null> {
  const token = readCookie(req, SESSION_COOKIE);
  if (token === null) return null;
  const idHash = hashToken(token);
  const session = await deps.store.findSession(idHash);
  if (session === null) return null;

  const now = deps.clock.now();
  if (session.expiresAt <= now) {
    await deps.store.deleteSession(idHash);
    return null;
  }
  const expiresAt = now + SESSION_TTL_MS;
  const renewed = expiresAt - session.expiresAt > RENEW_AFTER_MS;
  if (renewed) await deps.store.renewSession(idHash, expiresAt);
  return { userId: session.userId, token, renewed };
}

/** Sessão válida do pedido, renovando o prazo; null se não houver. */
export async function getSession(req: Request, deps: AuthDeps): Promise<{ userId: string } | null> {
  const session = await resolveSession(req, deps);
  return session === null ? null : { userId: session.userId };
}

/** POST /auth/logout → apaga a sessão no servidor, limpa o cookie, 303 para /login. */
export async function handleLogout(req: Request, deps: AuthDeps): Promise<Response> {
  if (crossOrigin(req, deps.config)) return forbidden();
  const token = readCookie(req, SESSION_COOKIE);
  if (token !== null) await deps.store.deleteSession(hashToken(token));
  return redirect('/login', 303, [clearSessionCookie(deps.config)]);
}

/** POST /account/delete → apaga o utilizador, limpa o cookie, 303 para /login. */
export async function handleDeleteAccount(req: Request, deps: AuthDeps): Promise<Response> {
  if (crossOrigin(req, deps.config)) return forbidden();
  const session = await resolveSession(req, deps);
  if (session !== null) await deps.store.deleteUser(session.userId);
  return redirect('/login', 303, [clearSessionCookie(deps.config)]);
}
