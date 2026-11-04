// Ligação das dependências reais (WI-0004; o que ficou do WI-0003): relógio do
// sistema, globalThis.fetch com timeout, um único rate limiter por processo e
// um único pool do PostgreSQL. Nada se cria no arranque: a configuração só se
// lê quando um pedido precisa dela, e /login e /privacy funcionam sem .env.
//
// O estado partilhado vive em globalThis para sobreviver ao HMR do `next dev`,
// que reavalia os módulos: dois limiters dobrariam o rate limit da aplicação.
import { randomBytes } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { readServerConfig } from '../auth/config';
import type { AuthDeps } from '../auth/handlers';
import { createCodeExchange } from '../auth/token-exchange';
import { createDrizzleStore } from '../db/store';
import {
  createIntraClient,
  createRateLimiter,
  type Clock,
  type IntraFetch,
  type RateLimiter,
} from '../intra/client';

/** Um pedido à 42 que não responde em 10 s conta como falha de rede. */
const FETCH_TIMEOUT_MS = 10_000;

export const systemClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    }),
};

const fetchWithTimeout = (url: string, init: RequestInit): Promise<Response> =>
  globalThis.fetch(url, { ...init, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

const intraFetch: IntraFetch = fetchWithTimeout;

interface Shared {
  limiter?: RateLimiter;
  deps?: AuthDeps;
}

const shared: Shared = ((globalThis as { __duckHub?: Shared }).__duckHub ??= {});

/** O rate limiter da aplicação para a API da 42: um por processo. */
export function intraLimiter(): RateLimiter {
  shared.limiter ??= createRateLimiter({ clock: systemClock });
  return shared.limiter;
}

/**
 * Dependências reais da autenticação. Lança ConfigError se o ambiente estiver
 * incompleto; não guarda a falha, para o próximo pedido voltar a ler o ambiente.
 */
export function authDeps(): AuthDeps {
  if (shared.deps !== undefined) return shared.deps;
  const config = readServerConfig(process.env);
  const limiter = intraLimiter();
  const pool = new pg.Pool({ connectionString: config.databaseUrl });
  shared.deps = {
    config: config.auth,
    clock: systemClock,
    randomToken: () => randomBytes(32).toString('base64url'),
    exchangeCode: createCodeExchange({ config: config.auth, fetch: fetchWithTimeout, limiter }),
    fetchProfile: (token) =>
      createIntraClient({ token, fetch: intraFetch, clock: systemClock, limiter }).me(),
    store: createDrizzleStore(drizzle(pool)),
  };
  return shared.deps;
}
