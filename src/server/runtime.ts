// Ligação das dependências reais (WI-0004; o que ficou do WI-0003): relógio do
// sistema, globalThis.fetch com timeout, um único rate limiter por processo e
// uma única BD (pool do PostgreSQL ou PGlite). Nada se cria no arranque: a configuração só se
// lê quando um pedido precisa dela, e /login e /privacy funcionam sem .env.
//
// O estado partilhado vive em globalThis para sobreviver ao HMR do `next dev`,
// que reavalia os módulos: dois limiters dobrariam o rate limit da aplicação.
import { randomBytes } from 'node:crypto';

import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

import { readServerConfig, type DatabaseConfig } from '../auth/config';
import type { AuthDeps } from '../auth/handlers';
import { createCodeExchange } from '../auth/token-exchange';
import { createDrizzleStore, type Db } from '../db/store';
import {
  createIntraClient,
  createRateLimiter,
  type Clock,
  type IntraFetch,
  type RateLimiter,
} from '../intra/client';
import { createPassportSync, withDeadline, type PassportStore } from '../passport/sync';
import { createDrizzlePassportStore } from '../passport/store';

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

interface App {
  auth: AuthDeps;
  passports: PassportStore;
}

interface Shared {
  limiter?: RateLimiter;
  app?: Promise<App> | undefined;
}

const shared: Shared = ((globalThis as { __duckHub?: Shared }).__duckHub ??= {});

/** Teto à sincronização do Passaporte no login (ADR 0008). */
const SYNC_DEADLINE_MS = 10_000;

/** O rate limiter da aplicação para a API da 42: um por processo. */
export function intraLimiter(): RateLimiter {
  shared.limiter ??= createRateLimiter({ clock: systemClock });
  return shared.limiter;
}

/**
 * Base de dados: um pool do PostgreSQL ou, fora de produção, uma instância
 * PGlite em disco (e2e). O PGlite e o seu driver só se carregam nesse ramo:
 * são dependências de desenvolvimento e nunca entram em produção.
 */
async function openDb(database: DatabaseConfig): Promise<Db> {
  if (database.kind === 'postgres') {
    return drizzle(new pg.Pool({ connectionString: database.url }));
  }
  const [{ PGlite }, pglite] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
  ]);
  return pglite.drizzle(new PGlite(database.dir));
}

async function createApp(): Promise<App> {
  const config = readServerConfig(process.env);
  const limiter = intraLimiter();
  const db = await openDb(config.database);
  const client = (token: string) =>
    createIntraClient({ token, fetch: intraFetch, clock: systemClock, limiter });
  const passports = createDrizzlePassportStore(db);
  return {
    passports,
    auth: {
      config: config.auth,
      clock: systemClock,
      randomToken: () => randomBytes(32).toString('base64url'),
      exchangeCode: createCodeExchange({ config: config.auth, fetch: fetchWithTimeout, limiter }),
      fetchProfile: (token) => client(token).me(),
      syncPassport: withDeadline(
        createPassportSync({ client, store: passports, clock: systemClock }),
        SYNC_DEADLINE_MS
      ),
      store: createDrizzleStore(db),
    },
  };
}

/**
 * A app partilhada. Guarda-se a promessa e não o resultado: dois pedidos em
 * simultâneo no arranque nunca abrem duas BDs. Uma falha (p. ex. ConfigError)
 * não fica guardada, para o próximo pedido voltar a ler o ambiente.
 */
function app(): Promise<App> {
  shared.app ??= createApp().catch((error: unknown) => {
    shared.app = undefined;
    throw error;
  });
  return shared.app;
}

/** Dependências reais da autenticação. Rejeita com ConfigError se faltar ambiente. */
export const authDeps = async (): Promise<AuthDeps> => (await app()).auth;

/** O store dos Passaportes, sobre a mesma BD. */
export const passportStore = async (): Promise<PassportStore> => (await app()).passports;
