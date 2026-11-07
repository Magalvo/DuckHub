// LobbyStore sobre Drizzle (WI-0017, ADR 0016). Uma entrada por pessoa por
// projeto (chave primária); conta durante LOBBY_TTL_DAYS. Os membros de um
// lobby vêm numa só consulta: mesmo projeto e campus, Passaporte visível,
// entrada válida, sem quem vê. Nunca se lê o estado da Intra de ninguém.
import { and, eq, gte, ne, sql } from 'drizzle-orm';

import { lobbyEntries, users, workProfiles } from '../db/schema';
import type { Db } from '../db/store';
import { LOBBY_TTL_DAYS } from './lobby';
import type { WorkAnswers } from './profile';
import { answersFromRow } from './store';

export interface LobbyMember {
  login: string;
  /** {} sem perfil de trabalho (ou com um inválido): entra só com o login. */
  answers: WorkAnswers;
}

export interface LobbyStore {
  /** Os slugs dos lobbies em que a pessoa está, com entrada ainda válida. */
  activeSlugs(userId: string): Promise<Set<string>>;
  /** Cria a entrada, ou renova o joined_at se já existia. */
  join(userId: string, slug: string): Promise<void>;
  /** Apaga a entrada; idempotente. */
  leave(userId: string, slug: string): Promise<void>;
  /** Os outros membros do lobby, no campus de quem vê. */
  members(viewerId: string, slug: string): Promise<LobbyMember[]>;
}

/** A entrada ainda conta: entrou há menos de 14 dias. */
const active = gte(lobbyEntries.joinedAt, sql`now() - make_interval(days => ${LOBBY_TTL_DAYS})`);

export function createDrizzleLobbyStore(db: Db): LobbyStore {
  return {
    async activeSlugs(userId) {
      const rows = await db
        .select({ slug: lobbyEntries.projectSlug })
        .from(lobbyEntries)
        .where(and(eq(lobbyEntries.userId, userId), active));
      return new Set(rows.map((r) => r.slug));
    },

    async join(userId, slug) {
      await db
        .insert(lobbyEntries)
        .values({ userId, projectSlug: slug })
        .onConflictDoUpdate({
          target: [lobbyEntries.userId, lobbyEntries.projectSlug],
          set: { joinedAt: sql`now()` },
        });
    },

    async leave(userId, slug) {
      await db
        .delete(lobbyEntries)
        .where(and(eq(lobbyEntries.userId, userId), eq(lobbyEntries.projectSlug, slug)));
    },

    async members(viewerId, slug) {
      const viewerCampus = db
        .select({ campusId: users.campusId })
        .from(users)
        .where(eq(users.id, viewerId));
      const rows = await db
        .select({
          login: users.login,
          profileUserId: workProfiles.userId,
          periods: workProfiles.periods,
          start: workProfiles.start,
          gradeGoal: workProfiles.gradeGoal,
          pace: workProfiles.pace,
          style: workProfiles.style,
          setting: workProfiles.setting,
          role: workProfiles.role,
        })
        .from(lobbyEntries)
        .innerJoin(users, eq(users.id, lobbyEntries.userId))
        .leftJoin(workProfiles, eq(workProfiles.userId, users.id))
        .where(
          and(
            eq(lobbyEntries.projectSlug, slug),
            active,
            ne(users.id, viewerId),
            eq(users.passportHidden, false),
            eq(users.campusId, sql`(${viewerCampus})`)
          )
        );
      return rows.map(({ login, profileUserId, ...profile }) => ({
        login,
        answers: profileUserId === null ? {} : (answersFromRow(profile) ?? {}),
      }));
    },
  };
}
