// Configuração do servidor, lida do ambiente com Zod quando é precisa e não no
// arranque: /login e /privacy funcionam sem .env (WI-0004). As mensagens de
// erro só nomeiam as variáveis, nunca os valores (o CLIENT_SECRET incluído).
import { z } from 'zod';

import type { AuthConfig } from './handlers';

const envSchema = z.object({
  CLIENT_ID: z.string().min(1),
  CLIENT_SECRET: z.string().min(1),
  /** Origem pública da app, ex.: http://localhost:3000 */
  APP_URL: z.string().refine((s) => URL.canParse(s) && /^https?:$/.test(new URL(s).protocol)),
  /** IDs de campus separados por vírgulas, ex.: 38,58 (Lisboa e Porto, ADR 0003). */
  ALLOWED_CAMPUS_IDS: z
    .string()
    .regex(/^\s*\d+\s*(,\s*\d+\s*)*$/)
    .transform((s) => s.split(',').map(Number)),
  DATABASE_URL: z.string().min(1),
  NODE_ENV: z.string().optional(),
});

const PGLITE = 'pglite:';

/** PostgreSQL real, ou PGlite em disco (só fora de produção: e2e, ADR 0008). */
export type DatabaseConfig = { kind: 'postgres'; url: string } | { kind: 'pglite'; dir: string };

export interface ServerConfig {
  auth: AuthConfig;
  database: DatabaseConfig;
}

export class ConfigError extends Error {
  override name = 'ConfigError';
}

export function readServerConfig(env: Readonly<Record<string, string | undefined>>): ServerConfig {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) {
    const names = [...new Set(parsed.error.issues.map((i) => String(i.path[0])))];
    throw new ConfigError(`Missing or invalid environment variables: ${names.join(', ')}`);
  }
  const { data } = parsed;
  let database: DatabaseConfig = { kind: 'postgres', url: data.DATABASE_URL };
  if (data.DATABASE_URL.startsWith(PGLITE)) {
    if (data.NODE_ENV === 'production') {
      throw new ConfigError('DATABASE_URL=pglite: is not allowed in production');
    }
    const dir = data.DATABASE_URL.slice(PGLITE.length);
    if (dir === '') throw new ConfigError('Missing or invalid environment variables: DATABASE_URL');
    database = { kind: 'pglite', dir };
  }
  const appUrl = new URL(data.APP_URL);
  return {
    auth: {
      clientId: data.CLIENT_ID,
      clientSecret: data.CLIENT_SECRET,
      redirectUri: new URL('/auth/callback', appUrl).toString(),
      allowedCampusIds: data.ALLOWED_CAMPUS_IDS,
      secureCookies: appUrl.protocol === 'https:',
    },
    database,
  };
}
