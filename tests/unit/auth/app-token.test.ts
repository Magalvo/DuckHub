import { describe, expect, it } from 'vitest';

import { createAppToken, EXPIRY_MARGIN_MS } from '../../../src/auth/app-token.js';
import { TOKEN_URL, type TokenFetch } from '../../../src/auth/token-exchange.js';

const SECRET = 'segredo-sintetico-app-91c2';
const config = { clientId: 'id-sintetico', clientSecret: SECRET };

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status }));

function setup(respond: () => Promise<Response>) {
  let now = 1_000_000;
  let acquired = 0;
  const calls: { url: string; init: Parameters<TokenFetch>[1] }[] = [];
  const appToken = createAppToken({
    config,
    clock: { now: () => now },
    limiter: {
      acquire: () => {
        acquired += 1;
        return Promise.resolve();
      },
    },
    fetch: (url, init) => {
      calls.push({ url, init });
      return respond();
    },
  });
  return {
    appToken,
    calls,
    acquired: () => acquired,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('createAppToken', () => {
  it('pede client_credentials por POST form-urlencoded, pelo rate limiter', async () => {
    const env = setup(() => json({ access_token: 'app-sintetico', expires_in: 7200 }));
    expect(await env.appToken()).toEqual({ ok: true, token: 'app-sintetico' });
    expect(env.acquired()).toBe(1);
    const [call] = env.calls;
    expect(call?.url).toBe(TOKEN_URL);
    expect(call?.init.method).toBe('POST');
    expect(call?.init.headers['content-type']).toBe('application/x-www-form-urlencoded');
    expect(Object.fromEntries(new URLSearchParams(call?.init.body))).toEqual({
      grant_type: 'client_credentials',
      client_id: 'id-sintetico',
      client_secret: SECRET,
    });
  });

  it('guarda o token em memória até um minuto antes de expirar, e depois renova', async () => {
    let n = 0;
    const env = setup(() => {
      n += 1;
      return json({ access_token: `app-${String(n)}`, expires_in: 7200 });
    });
    expect(await env.appToken()).toEqual({ ok: true, token: 'app-1' });
    env.advance(7200 * 1000 - EXPIRY_MARGIN_MS - 1);
    expect(await env.appToken()).toEqual({ ok: true, token: 'app-1' });
    expect(env.calls).toHaveLength(1);
    env.advance(1);
    expect(await env.appToken()).toEqual({ ok: true, token: 'app-2' });
    expect(env.calls).toHaveLength(2);
  });

  it('pedidos em simultâneo partilham um só pedido à 42', async () => {
    const env = setup(() => json({ access_token: 'app-sintetico', expires_in: 7200 }));
    const results = await Promise.all([env.appToken(), env.appToken(), env.appToken()]);
    expect(results).toEqual(Array(3).fill({ ok: true, token: 'app-sintetico' }));
    expect(env.calls).toHaveLength(1);
  });

  it.each([
    ['HTTP 401', () => json({ error: 'invalid_client', secret: SECRET }, 401)],
    ['HTTP 500', () => Promise.resolve(new Response(SECRET, { status: 500 }))],
    ['rede', () => Promise.reject(new Error(`falhou com ${SECRET}`))],
    ['JSON inválido', () => Promise.resolve(new Response(`{${SECRET}`, { status: 200 }))],
    ['sem expires_in', () => json({ access_token: 'app-sintetico' })],
    ['token vazio', () => json({ access_token: '', expires_in: 7200 })],
  ])('%s dá { ok: false }, sem detalhe nem segredo', async (_, respond) => {
    const env = setup(respond);
    const result = await env.appToken();
    expect(result).toEqual({ ok: false });
    expect(JSON.stringify(result)).not.toContain(SECRET);
  });

  it('uma falha não fica em cache: o pedido seguinte tenta outra vez', async () => {
    let fail = true;
    const env = setup(() =>
      fail ? json({}, 503) : json({ access_token: 'app-sintetico', expires_in: 7200 })
    );
    expect(await env.appToken()).toEqual({ ok: false });
    fail = false;
    expect(await env.appToken()).toEqual({ ok: true, token: 'app-sintetico' });
    expect(env.calls).toHaveLength(2);
  });
});
