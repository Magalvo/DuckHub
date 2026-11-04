import { describe, expect, it } from 'vitest';

import {
  createCodeExchange,
  TOKEN_URL,
  type TokenFetch,
} from '../../../src/auth/token-exchange.js';

const SECRET = 'segredo-sintetico-3a9d';
const config = {
  clientId: 'id-sintetico',
  clientSecret: SECRET,
  redirectUri: 'http://localhost:3000/auth/callback',
};

function setup(respond: () => Promise<Response>) {
  const calls: { url: string; init: Parameters<TokenFetch>[1] }[] = [];
  let acquired = 0;
  const exchange = createCodeExchange({
    config,
    fetch: (url, init) => {
      calls.push({ url, init });
      return respond();
    },
    limiter: {
      acquire: () => {
        acquired += 1;
        return Promise.resolve();
      },
    },
  });
  return { exchange, calls, acquired: () => acquired };
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

describe('createCodeExchange', () => {
  it('faz POST form-urlencoded ao /oauth/token e devolve só o access token', async () => {
    const env = setup(() =>
      json({ access_token: 'acesso-sintetico', refresh_token: 'refresh-sintetico' })
    );
    const result = await env.exchange('codigo-sintetico');
    expect(result).toEqual({ ok: true, accessToken: 'acesso-sintetico' });
    expect(env.acquired()).toBe(1);
    const [call] = env.calls;
    expect(call?.url).toBe(TOKEN_URL);
    expect(call?.init.method).toBe('POST');
    expect(call?.init.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(Object.fromEntries(new URLSearchParams(call?.init.body))).toEqual({
      grant_type: 'authorization_code',
      client_id: 'id-sintetico',
      client_secret: SECRET,
      code: 'codigo-sintetico',
      redirect_uri: config.redirectUri,
    });
  });

  it.each([
    ['HTTP 401', () => json({ error: 'invalid_grant', secret: SECRET }, 401)],
    ['sem access_token', () => json({ token_type: 'bearer' })],
    ['JSON inválido', () => Promise.resolve(new Response('<html>'))],
    ['falha de rede', () => Promise.reject(new TypeError('fetch failed'))],
  ])('%s → { ok: false }, sem detalhe', async (_case, respond) => {
    const result = await setup(respond).exchange('c');
    expect(result).toEqual({ ok: false });
    expect(JSON.stringify(result)).not.toContain(SECRET);
  });
});
