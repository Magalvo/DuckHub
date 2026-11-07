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

import { createAppToken } from '../auth/app-token';
import { readServerConfig, type DatabaseConfig } from '../auth/config';
import type { AuthDeps } from '../auth/handlers';
import { createCodeExchange } from '../auth/token-exchange';
import { createProjectXpCache, fetchFromApi, type ProjectXpCache } from '../calculator/cache';
import { createDrizzleProjectXpStore } from '../calculator/store';
import { createDrizzleDirectoryStore, type DirectoryStore } from '../community/store';
import { createDrizzleStore, type Db } from '../db/store';
import {
  createIntraClient,
  createRateLimiter,
  type Clock,
  type IntraFetch,
  type RateLimiter,
} from '../intra/client';
import { createPassportSync, withDeadline, type PassportStore } from '../passport/sync';
import { realWorldSlugs } from '../passport/real-world';
import { createDrizzlePassportStore } from '../passport/store';
import { createDrizzlePondStore, type PondStore } from '../pond/store';
import type { PassportVisibilityStore } from '../passport/visibility';

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

/** O que a calculadora (WI-0007) precisa do servidor. */
export interface CalculatorDeps {
  cache: ProjectXpCache;
  campusOf(userId: string): Promise<number | null>;
}

interface App {
  auth: AuthDeps;
  passports: PassportStore & PassportVisibilityStore;
  calculator: CalculatorDeps;
  directory: DirectoryStore;
  pond: PondStore;
}

interface Shared {
  limiter?: RateLimiter;
  app?: Promise<App> | undefined;
}

const shared: Shared = ((globalThis as { __duckHub?: Shared }).__duckHub ??= {});

/** Teto à sincronização do Passaporte no login (ADR 0008). */
const SYNC_DEADLINE_MS = 10_000;
/** Teto à atualização da cache de XP antes de responder (ADR 0009). */
const XP_REFRESH_DEADLINE_MS = 10_000;

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
  const projectXp = createDrizzleProjectXpStore(db);
  // Token da aplicação (client credentials): só em memória, dentro desta app.
  const appToken = createAppToken({
    config: config.auth,
    fetch: fetchWithTimeout,
    limiter,
    clock: systemClock,
  });
  return {
    passports,
    directory: createDrizzleDirectoryStore(db),
    pond: createDrizzlePondStore(db),
    calculator: {
      campusOf: (userId) => projectXp.campusOf(userId),
      cache: createProjectXpCache({
        store: projectXp,
        fetchProjects: fetchFromApi({ appToken, client, slugs: realWorldSlugs }),
        clock: systemClock,
        slugs: realWorldSlugs,
        deadlineMs: XP_REFRESH_DEADLINE_MS,
      }),
    },
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

/** O store dos Passaportes e da sua visibilidade (WI-0009), sobre a mesma BD. */
export const passportStore = async (): Promise<PassportStore & PassportVisibilityStore> =>
  (await app()).passports;

/** O diretório da comunidade (WI-0010), sobre a mesma BD. */
export const directoryStore = async (): Promise<DirectoryStore> => (await app()).directory;

/** O feed do Duck Pond (WI-0012), sobre a mesma BD. */
export const pondStore = async (): Promise<PondStore> => (await app()).pond;

/** A cache de XP e o campus do utilizador, para a calculadora (WI-0007). */
export const calculatorDeps = async (): Promise<CalculatorDeps> => (await app()).calculator;
