// Cache do XP dos projetos (WI-0007, ADR 0009), por campus, válida 24 h. Se o
// campus não tem linhas ou a mais antiga tem mais de 24 h, atualiza-se antes de
// responder, com um teto de tempo. Se a atualização falhar, fica a cache que
// houver. Nunca regista nada.
import type { AppToken } from '../auth/app-token';
import type { CursusProject, IntraClient } from '../intra/client';
import type { CachedProjectXp, ProjectXp, ProjectXpStore } from './store';

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** O 42cursus (confirmado a 2026-11-05, WI-0005). */
export const MAIN_CURSUS_ID = 21;

/** Os projetos da API, ou null se a leitura falhar. */
export type FetchProjects = (campusId: number) => Promise<ProjectXp[] | null>;

/** Lê os projetos com o token da aplicação: um pedido do token e um à lista do cursus. */
export function fetchFromApi(deps: {
  appToken: AppToken;
  client: (token: string) => Pick<IntraClient, 'cursusProjects'>;
  slugs: readonly string[];
}): FetchProjects {
  return async (campusId) => {
    const token = await deps.appToken();
    if (!token.ok) return null;
    const result = await deps
      .client(token.token)
      .cursusProjects(MAIN_CURSUS_ID, deps.slugs, { campusId });
    if (!result.ok) return null;
    return result.value.map(({ slug, projectId, name, xp, solo }: CursusProject) => ({
      slug,
      projectId,
      name,
      xp,
      solo,
    }));
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
  projectsFor(campusId: number): Promise<CachedProjectXp[]>;
}

export function createProjectXpCache(deps: {
  store: Pick<ProjectXpStore, 'load' | 'replace'>;
  fetchProjects: FetchProjects;
  clock: { now(): number };
  slugs: readonly string[];
  /** Teto à atualização; passado ele, responde com a cache que houver. */
  deadlineMs: number;
}): ProjectXpCache {
  const { store, clock } = deps;
  const order = new Map(deps.slugs.map((slug, i) => [slug, i]));
  const rank = (slug: string): number => order.get(slug) ?? order.size;
  const sorted = (projects: CachedProjectXp[]): CachedProjectXp[] =>
    [...projects].sort((a, b) => rank(a.slug) - rank(b.slug) || a.name.localeCompare(b.name));

  // Uma só atualização em curso por campus, partilhada por pedidos simultâneos.
  const inFlight = new Map<number, Promise<void>>();

  async function refresh(campusId: number): Promise<void> {
    try {
      const projects = await deps.fetchProjects(campusId);
      // Uma lista vazia conta como falha: apagaria a cache que houver.
      if (projects === null || projects.length === 0) return;
      await store.replace(campusId, projects, clock.now());
    } catch {
      // Fica a cache que houver.
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
      if (!isStale(cached, clock.now())) return sorted(cached);
      await withDeadline(refreshOnce(campusId));
      return sorted(await store.load(campusId));
    },
  };
}
