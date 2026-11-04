import { describe, expect, it } from 'vitest';

import { ConfigError, readServerConfig } from '../../../src/auth/config.js';

const SECRET = 'segredo-sintetico-8b2e';
const env = {
  CLIENT_ID: 'id-sintetico',
  CLIENT_SECRET: SECRET,
  APP_URL: 'http://localhost:3000',
  ALLOWED_CAMPUS_IDS: '9001, 9002',
  DATABASE_URL: 'postgres://pato:pato@localhost:5432/pato',
};

describe('readServerConfig', () => {
  it('lê o ambiente e deriva o redirectUri e os cookies seguros', () => {
    expect(readServerConfig(env)).toEqual({
      auth: {
        clientId: 'id-sintetico',
        clientSecret: SECRET,
        redirectUri: 'http://localhost:3000/auth/callback',
        allowedCampusIds: [9001, 9002],
        secureCookies: false,
      },
      database: { kind: 'postgres', url: env.DATABASE_URL },
    });
    const https = readServerConfig({ ...env, APP_URL: 'https://duckhub.example/' });
    expect(https.auth.redirectUri).toBe('https://duckhub.example/auth/callback');
    expect(https.auth.secureCookies).toBe(true);
  });

  it.each([
    ['CLIENT_ID em falta', { ...env, CLIENT_ID: undefined }, 'CLIENT_ID'],
    ['APP_URL inválida', { ...env, APP_URL: 'localhost' }, 'APP_URL'],
    ['APP_URL sem http(s)', { ...env, APP_URL: 'ftp://localhost' }, 'APP_URL'],
    ['campus não numérico', { ...env, ALLOWED_CAMPUS_IDS: '38,porto' }, 'ALLOWED_CAMPUS_IDS'],
    ['campus vazio', { ...env, ALLOWED_CAMPUS_IDS: '' }, 'ALLOWED_CAMPUS_IDS'],
  ])('%s → ConfigError que nomeia a variável', (_case, bad, name) => {
    expect(() => readServerConfig(bad)).toThrow(ConfigError);
    expect(() => readServerConfig(bad)).toThrow(name);
  });

  it('DATABASE_URL=pglite:<pasta> dá PGlite fora de produção e erro em produção', () => {
    const pglite = { ...env, DATABASE_URL: 'pglite:.e2e/db' };
    expect(readServerConfig(pglite).database).toEqual({ kind: 'pglite', dir: '.e2e/db' });
    expect(readServerConfig({ ...pglite, NODE_ENV: 'development' }).database.kind).toBe('pglite');
    expect(() => readServerConfig({ ...pglite, NODE_ENV: 'production' })).toThrow(
      'not allowed in production'
    );
    expect(() => readServerConfig({ ...env, DATABASE_URL: 'pglite:' })).toThrow('DATABASE_URL');
  });

  it('a mensagem de erro nunca contém valores, nem o client secret', () => {
    const bad = { ...env, APP_URL: SECRET, DATABASE_URL: '' };
    let message = '';
    try {
      readServerConfig(bad);
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain('APP_URL');
    expect(message).toContain('DATABASE_URL');
    expect(message).not.toContain(SECRET);
  });
});
