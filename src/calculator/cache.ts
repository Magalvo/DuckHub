// Cache do XP dos projetos (WI-0007, WI-0023, ADR 0009), por campus, válida
// 24 h. Se o campus não tem linhas ou a mais antiga tem mais de 24 h,
// atualiza-se antes de responder, com um teto de tempo; passado ele, a
// atualização continua em fundo. Se falhar, fica a cache que houver e regista-se
// uma só linha com o campus e o tipo da falha (ADR 0009), nada mais.
import type { AppToken } from '../auth/app-token';
import type { CursusProject, IntraClient, IntraError } from '../intra/client';
import type { CachedProjectXp, ProjectXp, ProjectXpStore } from './store';

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** O 42cursus (confirmado a 2026-11-05, WI-0005). */
export const MAIN_CURSUS_ID = 21;

/** Timeout do pedido da lista de projetos: medido ~12 s a 2026-11-09 (WI-0023). */
export const XP_FETCH_TIMEOUT_MS = 30_000;

/** Porque falhou uma atualização. Só isto vai para o registo (regra 9). */
export type RefreshFailure =
  'token' | 'rate-limited' | `http:${string}` | 'network' | 'invalid-response' | 'empty' | 'store';

/** Os projetos da API, ou o tipo da falha. */
export type FetchProjects = (
  campusId: number
) => Promise<{ ok: true; projects: ProjectXp[] } | { ok: false; reason: RefreshFailure }>;

/** O que a cache tem: projetos (mesmo antigos), uma atualização em curso, ou nada. */
export type CacheRead =
  { kind: 'ready'; projects: CachedProjectXp[] } | { kind: 'loading' } | { kind: 'failed' };

/** O tipo de um erro da Intra, sem os issues do Zod nem nada da resposta. */
function failureOf(error: IntraError): RefreshFailure {
  return error.kind === 'http' ? `http:${String(error.status)}` : error.kind;
}

/** Lê os projetos com o token da aplicação: um pedido do token e um à lista do cursus. */
export function fetchFromApi(deps: {
  appToken: AppToken;
  client: (token: string) => Pick<IntraClient, 'cursusProjects'>;
  slugs: readonly string[];
}): FetchProjects {
  return async (campusId) => {
    const token = await deps.appToken();
    if (!token.ok) return { ok: false, reason: 'token' };
    const result = await deps
      .client(token.token)
      .cursusProjects(MAIN_CURSUS_ID, deps.slugs, { campusId });
    if (!result.ok) return { ok: false, reason: failureOf(result.error) };
    return {
      ok: true,
      projects: result.value.map(({ slug, projectId, name, xp, solo }: CursusProject) => ({
        slug,
        projectId,
        name,
        xp,
        solo,
      })),
    };
  };
}

/** A cache precisa de ser atualizada: sem linhas, ou a mais antiga tem mais de 24 h. */
export function isStale(projects: readonly CachedProjectXp[], now: number): boolean {
  if (projects.length === 0) return true;
  const oldest = Math.min(...projects.map((p) => p.fetchedAt));
  return now - oldest > CACHE_TTL_MS;
}

export interface ProjectXpCache {
  /** Os projetos do campus pela ordem de `slugs` (a do Common Core). */
  projectsFor(campusId: number): Promise<CacheRead>;
  /** Começa a atualização se precisar; nunca lança, nunca rejeita, nunca espera por ela. */
  warm(campusId: number): void;
}

export function createProjectXpCache(deps: {
  store: Pick<ProjectXpStore, 'load' | 'replace'>;
  fetchProjects: FetchProjects;
  clock: { now(): number };
  slugs: readonly string[];
  /** Teto à atualização; passado ele, responde com a cache que houver. */
  deadlineMs: number;
  /** Uma linha por atualização falhada (em produção, console.warn). */
  log: (line: string) => void;
}): ProjectXpCache {
  const { store, clock } = deps;
  const order = new Map(deps.slugs.map((slug, i) => [slug, i]));
  const rank = (slug: string): number => order.get(slug) ?? order.size;
  const sorted = (projects: CachedProjectXp[]): CachedProjectXp[] =>
    [...projects].sort((a, b) => rank(a.slug) - rank(b.slug) || a.name.localeCompare(b.name));

  // Uma só atualização em curso por campus, partilhada por pedidos simultâneos.
  const inFlight = new Map<number, Promise<void>>();

  /** Atualiza a cache; devolve o tipo da falha, ou null. Nunca lança. */
  async function attempt(campusId: number): Promise<RefreshFailure | null> {
    let fetched: Awaited<ReturnType<FetchProjects>>;
    try {
      fetched = await deps.fetchProjects(campusId);
    } catch {
      return 'network';
    }
    if (!fetched.ok) return fetched.reason;
    // Uma lista vazia conta como falha: apagaria a cache que houver.
    if (fetched.projects.length === 0) return 'empty';
    try {
      await store.replace(campusId, fetched.projects, clock.now());
    } catch {
      return 'store';
    }
    return null;
  }

  // Fica a cache que houver; só o campus e o tipo vão para o registo.
  async function refresh(campusId: number): Promise<void> {
    const failure = await attempt(campusId);
    if (failure === null) return;
    try {
      deps.log(`[xp-cache] refresh failed campus=${String(campusId)} reason=${failure}`);
    } catch {
      // Um registo que falha não muda a resposta.
    }
  }

  function refreshOnce(campusId: number): Promise<void> {
    let running = inFlight.get(campusId);
    if (running === undefined) {
      running = refresh(campusId).finally(() => inFlight.delete(campusId));
      inFlight.set(campusId, running);
    }
    return running;
  }

  async function withDeadline(work: Promise<void>): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, deps.deadlineMs);
    });
    try {
      await Promise.race([work, deadline]);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async projectsFor(campusId) {
      const cached = await store.load(campusId);
      if (!isStale(cached, clock.now())) return { kind: 'ready', projects: sorted(cached) };
      await withDeadline(refreshOnce(campusId));
      const after = await store.load(campusId);
      if (after.length > 0) return { kind: 'ready', projects: sorted(after) };
      return inFlight.has(campusId) ? { kind: 'loading' } : { kind: 'failed' };
    },

    warm(campusId) {
      void (async () => {
        try {
          if (isStale(await store.load(campusId), clock.now())) await refreshOnce(campusId);
        } catch {
          // A BD em baixo: o próximo pedido tenta outra vez.
        }
      })();
    },
  };
}
