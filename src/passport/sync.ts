// Sincronização do Passaporte no login (WI-0005, ADR 0008): o callback é o
// único momento com token. Tudo ou nada: se algum pedido falhar, não se guarda
// nada e fica o snapshot anterior. Nunca lança e nunca regista nada.
import type { AuthDeps } from '../auth/handlers';
import type { IntraClient } from '../intra/client';
import { buildSnapshot, type PassportSnapshot } from './passport';

export interface PassportStore {
  save(userId: string, snapshot: PassportSnapshot, syncedAt: number): Promise<void>;
  load(userId: string): Promise<{ snapshot: PassportSnapshot; syncedAt: number } | null>;
}

type SyncPassport = AuthDeps['syncPassport'];

/** Nunca lança. Se algum pedido falhar, não guarda nada. */
export function createPassportSync(deps: {
  client: (accessToken: string) => Pick<IntraClient, 'coalitions' | 'projectsUsers'>;
  store: PassportStore;
  clock: { now(): number };
}): SyncPassport {
  return async ({ accessToken, userId, profile }) => {
    try {
      const api = deps.client(accessToken);
      const [coalitions, projects] = await Promise.all([
        api.coalitions(profile.id),
        api.projectsUsers(profile.id),
      ]);
      if (!coalitions.ok || !projects.ok) return;
      const snapshot = buildSnapshot(profile, coalitions.value, projects.value);
      await deps.store.save(userId, snapshot, deps.clock.now());
    } catch {
      // Uma falha (p. ex. da BD) deixa o snapshot anterior; o login segue.
    }
  };
}

/**
 * Teto à sincronização inteira: os retries de um 429 podem passar dele. Passado
 * o teto, o login segue e a sincronização acaba em segundo plano; como guarda
 * tudo ou nada, nunca deixa um snapshot parcial.
 */
export function withDeadline(sync: SyncPassport, ms: number): SyncPassport {
  return async (input) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<void>((resolve) => {
      timer = setTimeout(resolve, ms);
    });
    try {
      await Promise.race([sync(input), deadline]);
    } finally {
      clearTimeout(timer);
    }
  };
}
