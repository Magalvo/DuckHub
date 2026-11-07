// Feed do Duck Pond (WI-0012, ADR 0013): funções puras da página. A query da
// página passa por Zod (regra 4); um valor inválido conta como a página 1.
import { z } from 'zod';

import { findBadge } from '../badges/badges';
import type { PondRow } from './store';

export const PAGE_SIZE = 20;
/** Um evento mais antigo do que isto não aparece e apaga-se (AC6). */
export const RETENTION_DAYS = 90;
const MAX_PAGE = 10_000;

const pageSchema = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => {
    const raw = Array.isArray(v) ? v[0] : v;
    if (raw === undefined || !/^[0-9]{1,9}$/.test(raw)) return 1;
    const n = Number(raw);
    return n >= 1 && n <= MAX_PAGE ? n : 1;
  });

export interface PondSearchParams {
  page?: string | string[] | undefined;
}

/** O endereço de uma página do feed: `/pond` na primeira. */
export const pondHref = (page: number): string =>
  page > 1 ? `/pond?page=${String(page)}` : '/pond';

export function parsePondPage(params: PondSearchParams): number {
  const parsed = pageSchema.safeParse(params.page);
  return parsed.success ? parsed.data : 1;
}

const lisbonDay = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Lisbon',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * "AAAA-MM-DD" na hora de Lisboa. Só o dia: o evento nasce no login, e a hora
 * diria à comunidade quando cada pessoa entra no Duck Hub (regra 9, ADR 0013).
 */
export function formatDay(at: number): string {
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    lisbonDay.formatToParts(at).find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export type PondEventView =
  | { kind: 'project-validated'; name: string; finalMark: number | null }
  | { kind: 'level-up'; level: number }
  | { kind: 'badge'; badgeName: string };

export interface PondItem {
  id: number;
  login: string;
  day: string;
  event: PondEventView;
  /** Rubber Ducks (WI-0013): a contagem, se quem vê já deu, e se o evento é seu. */
  ducks: { count: number; given: boolean; own: boolean };
}

/** O que o feed mostra de um evento; uma badge que já não está no catálogo não aparece. */
export function pondItem(row: PondRow): PondItem | null {
  const { event } = row;
  let view: PondEventView;
  switch (event.kind) {
    case 'project-validated':
      view = { kind: event.kind, name: event.name, finalMark: event.finalMark };
      break;
    case 'level-up':
      view = event;
      break;
    case 'badge': {
      const badge = findBadge(event.badgeId);
      if (badge === null) return null;
      view = { kind: 'badge', badgeName: badge.name };
      break;
    }
  }
  return {
    id: row.id,
    login: row.login,
    day: formatDay(row.createdAt),
    event: view,
    ducks: { count: row.ducks, given: row.ducked, own: row.own },
  };
}

/** "1 Rubber Duck", "0 Rubber Ducks", "2 Rubber Ducks": um espaço entre o número e a palavra. */
export function duckCount(count: number, words: { countOne: string; countMany: string }): string {
  return `${String(count)} ${count === 1 ? words.countOne : words.countMany}`;
}
