// Cliente só de leitura da API v2 da 42 (WI-0003): o único ponto de contacto do
// servidor com api.intra.42.fr. Só faz GETs, respeita o rate limit da aplicação,
// segue a paginação e devolve tipos de domínio validados por Zod. Nunca lança:
// as falhas vêm como { ok: false, error }. Nunca regista nada: nem o token nem o
// corpo das respostas chegam a mensagens de erro ou logs (AC9).
import type { z } from 'zod';

import { nextLink, retryAfterMs } from './http';
import type { Clock, RateLimiter } from './rate-limiter';
import {
  coalitionSchema,
  describeIssues,
  profileSchema,
  projectSchema,
  projectUserSchema,
  xpFor,
  type Coalition,
  type Profile,
  type ProjectUser,
} from './schemas';

export { createRateLimiter } from './rate-limiter';
export type { Clock, RateLimiter } from './rate-limiter';
export type { Coalition, Profile, ProjectUser } from './schemas';

export type IntraFetch = (
  url: string,
  init: { method: string; headers: Record<string, string> }
) => Promise<Response>;

export interface IntraClient {
  me(): Promise<Result<Profile>>;
  coalitions(userId: number): Promise<Result<Coalition[]>>;
  projectsUsers(userId: number): Promise<Result<ProjectUser[]>>;
  projectXp(
    projectId: number,
    ctx: { campusId: number; cursusId: number }
  ): Promise<Result<number>>;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: IntraError };
export type IntraError =
  | { kind: 'invalid-response'; issues: string[] } // AC3
  | { kind: 'rate-limited' } // AC5
  | { kind: 'http'; status: number }
  | { kind: 'network' };

const ORIGIN = 'https://api.intra.42.fr';
const MAX_RETRIES = 3;
/** Retry-After acima disto falha logo: o cliente corre dentro do login. */
const MAX_RETRY_AFTER_MS = 60_000;
/** Backoff sem Retry-After: 1 s, 2 s, 4 s. */
const backoffMs = (retry: number): number => 1000 * 2 ** retry;
/** Proteção contra ciclos no header Link. */
const MAX_PAGES = 100;

const fail = (error: IntraError): { ok: false; error: IntraError } => ({ ok: false, error });
const invalid = (issues: string[]): { ok: false; error: IntraError } =>
  fail({ kind: 'invalid-response', issues });

/** Liberta a ligação de uma resposta cujo corpo não se lê. */
async function discard(response: Response): Promise<void> {
  await response.body?.cancel().catch(() => undefined);
}

interface Page {
  body: unknown;
  next: string | null;
}

export function createIntraClient(deps: {
  token: string;
  fetch: IntraFetch;
  clock: Clock;
  limiter: RateLimiter;
}): IntraClient {
  const { limiter } = deps;
  const headers = { Authorization: `Bearer ${deps.token}`, Accept: 'application/json' };

  async function get(url: string): Promise<Result<Page>> {
    for (let retry = 0; ; retry += 1) {
      await limiter.acquire();
      let response: Response;
      try {
        response = await deps.fetch(url, { method: 'GET', headers });
      } catch {
        return fail({ kind: 'network' });
      }

      if (response.status === 429) {
        const wait = retryAfterMs(response.headers.get('retry-after'));
        await discard(response);
        if (retry >= MAX_RETRIES || (wait !== null && wait > MAX_RETRY_AFTER_MS)) {
          return fail({ kind: 'rate-limited' });
        }
        // O limite é da aplicação: todos os clientes esperam.
        limiter.pause(wait ?? backoffMs(retry));
        continue;
      }
      if (!response.ok) {
        await discard(response);
        return fail({ kind: 'http', status: response.status });
      }

      let text: string;
      try {
        text = await response.text();
      } catch {
        return fail({ kind: 'network' });
      }
      try {
        return {
          ok: true,
          value: { body: JSON.parse(text), next: nextLink(response.headers.get('link')) },
        };
      } catch {
        return invalid(['(raiz): invalid_json']);
      }
    }
  }

  async function getOne<T>(
    path: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>
  ): Promise<Result<T>> {
    const page = await get(`${ORIGIN}${path}`);
    if (!page.ok) return page;
    const parsed = schema.safeParse(page.value.body);
    return parsed.success
      ? { ok: true, value: parsed.data }
      : invalid(describeIssues(parsed.error));
  }

  async function getList<T>(
    path: string,
    item: z.ZodType<T, z.ZodTypeDef, unknown>
  ): Promise<Result<T[]>> {
    const items: T[] = [];
    let url: string | null = `${ORIGIN}${path}?page[size]=100`;
    for (let pages = 0; url !== null; pages += 1) {
      if (pages === MAX_PAGES) return invalid(['link: too_many_pages']);
      // O token só vai para a API da 42, mesmo que o Link aponte para outro lado.
      if (!URL.canParse(url) || new URL(url).origin !== ORIGIN)
        return invalid(['link: invalid_url']);
      const page: Result<Page> = await get(url);
      if (!page.ok) return page;
      const parsed = item.array().safeParse(page.value.body);
      if (!parsed.success) return invalid(describeIssues(parsed.error));
      items.push(...parsed.data);
      url = page.value.next;
    }
    return { ok: true, value: items };
  }

  return {
    me: () => getOne('/v2/me', profileSchema),
    coalitions: (userId) => getList(`/v2/users/${String(userId)}/coalitions`, coalitionSchema),
    projectsUsers: (userId) =>
      getList(`/v2/users/${String(userId)}/projects_users`, projectUserSchema),
    async projectXp(projectId, ctx) {
      const project = await getOne(`/v2/projects/${String(projectId)}`, projectSchema);
      return project.ok ? { ok: true, value: xpFor(project.value, ctx) } : project;
    },
  };
}
