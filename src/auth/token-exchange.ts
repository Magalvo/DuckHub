// Troca do código de autorização por um access token: POST /oauth/token da 42.
// Vive aqui e não no cliente do WI-0003, que é só GET. Nunca lança e nunca
// devolve detalhe: nem o client secret nem o corpo da resposta saem daqui.
// O refresh token, se vier, é ignorado (ADR 0007).
import { z } from 'zod';

import type { AuthConfig, AuthDeps } from './handlers';

export const TOKEN_URL = 'https://api.intra.42.fr/oauth/token';

export type TokenFetch = (
  url: string,
  init: { method: 'POST'; headers: Record<string, string>; body: string }
) => Promise<Response>;

const tokenSchema = z.object({ access_token: z.string().min(1) });

export function createCodeExchange(deps: {
  config: Pick<AuthConfig, 'clientId' | 'clientSecret' | 'redirectUri'>;
  fetch: TokenFetch;
  /** O limiter partilhado da aplicação: o rate limit da 42 conta este pedido. */
  limiter: { acquire(): Promise<void> };
}): AuthDeps['exchangeCode'] {
  const { config } = deps;
  return async (code) => {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.redirectUri,
    }).toString();

    await deps.limiter.acquire();
    let response: Response;
    try {
      response = await deps.fetch(TOKEN_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body,
      });
    } catch {
      return { ok: false };
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      return { ok: false };
    }
    let json: unknown;
    try {
      json = JSON.parse(await response.text());
    } catch {
      return { ok: false };
    }
    const parsed = tokenSchema.safeParse(json);
    return parsed.success ? { ok: true, accessToken: parsed.data.access_token } : { ok: false };
  };
}
