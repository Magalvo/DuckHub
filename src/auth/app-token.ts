// Token da aplicação (WI-0007, ADR 0009): client credentials no POST
// /oauth/token da 42, só para dados públicos (o XP dos projetos). Vive só no
// servidor e só em memória, até expirar. O pedido passa pelo rate limiter
// partilhado. Nunca lança e nunca devolve detalhe: nem o client secret, nem o
// token, nem o corpo da resposta chegam a erros ou logs (regra 10).
import { z } from 'zod';

import type { AuthConfig } from './handlers';
import { TOKEN_URL, type TokenFetch } from './token-exchange';

export type AppTokenResult = { ok: true; token: string } | { ok: false };
export type AppToken = () => Promise<AppTokenResult>;

/** O token deixa de se usar um minuto antes de expirar. */
export const EXPIRY_MARGIN_MS = 60_000;

const tokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(), // segundos
});

export function createAppToken(deps: {
  config: Pick<AuthConfig, 'clientId' | 'clientSecret'>;
  fetch: TokenFetch;
  limiter: { acquire(): Promise<void> };
  clock: { now(): number };
}): AppToken {
  const { config, clock } = deps;
  let cached: { token: string; validUntil: number } | null = null;
  // Pedidos em simultâneo partilham o mesmo pedido à 42.
  let pending: Promise<AppTokenResult> | null = null;

  async function request(): Promise<AppTokenResult> {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.clientId,
      client_secret: config.clientSecret,
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
    if (!parsed.success) return { ok: false };
    const { access_token: token, expires_in: seconds } = parsed.data;
    cached = { token, validUntil: clock.now() + seconds * 1000 - EXPIRY_MARGIN_MS };
    return { ok: true, token };
  }

  return async () => {
    if (cached !== null && clock.now() < cached.validUntil) {
      return { ok: true, token: cached.token };
    }
    cached = null;
    pending ??= request()
      .catch((): AppTokenResult => ({ ok: false }))
      .finally(() => {
        pending = null;
      });
    return pending;
  };
}
