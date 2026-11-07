// Diretório da comunidade (WI-0010, ADR 0012): funções puras. A query da
// página passa por Zod (regra 4); parâmetros inválidos não dão erro, contam
// como o valor por omissão. Cada item é tirado da vista pública do WI-0009,
// por isso nunca mostra mais do que ela (ADR 0010, "Obrigatório").
import { z } from 'zod';

import { passportView, type PassportSnapshot } from '../passport/passport';
import { publicPassportView } from '../passport/public';

export const PAGE_SIZE = 24;
/** O mesmo limite dos logins em /u/<login>: mais do que isto não encontra ninguém. */
export const MAX_QUERY_LENGTH = 32;
const MAX_PAGE = 10_000;

export interface DirectoryQuery {
  q: string | null;
  campusId: number | null;
  page: number;
  /** q com mais de MAX_QUERY_LENGTH: zero resultados, sem ir à BD e sem cortar o q. */
  tooLong: boolean;
}

/** O primeiro valor de um parâmetro (um parâmetro repetido conta pelo primeiro). */
const first = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (Array.isArray(v) ? v[0] : v));

const positiveInt = (max: number) =>
  first.transform((v) => {
    if (v === undefined || !/^[0-9]{1,9}$/.test(v)) return null;
    const n = Number(v);
    return n >= 1 && n <= max ? n : null;
  });

const querySchema = z.object({
  q: first.transform((v) => {
    const trimmed = v?.trim() ?? '';
    return trimmed === '' ? null : trimmed;
  }),
  campus: positiveInt(2 ** 31 - 1),
  page: positiveInt(MAX_PAGE),
});

export type DirectorySearchParams = z.input<typeof querySchema>;

export function parseDirectoryQuery(params: DirectorySearchParams): DirectoryQuery {
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) return { q: null, campusId: null, page: 1, tooLong: false };
  const { q, campus, page } = parsed.data;
  return {
    q,
    campusId: campus,
    page: page ?? 1,
    tooLong: q !== null && q.length > MAX_QUERY_LENGTH,
  };
}

export interface CampusOption {
  id: number;
  name: string;
}

/** Um campus que não está nas opções é ignorado: lista e select mostram todos. */
export function resolveCampus(campusId: number | null, options: CampusOption[]): number | null {
  return campusId !== null && options.some((o) => o.id === campusId) ? campusId : null;
}

/** Padrão do ILIKE para "contém q": \, % e _ do texto procurado são literais. */
export function likePattern(q: string): string {
  return `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

export interface DirectoryItem {
  login: string;
  initials: string;
  avatarText: '#000000' | '#FFFFFF';
  accentColor: string;
  campus: string;
  level: string | null;
}

/** O que o diretório mostra de um membro: um subconjunto da vista pública. */
export function directoryItem(snapshot: PassportSnapshot, syncedAt: number): DirectoryItem {
  const view = publicPassportView(passportView(snapshot, syncedAt));
  return {
    login: view.login,
    initials: view.initials,
    avatarText: view.avatarText,
    accentColor: view.accentColor,
    campus: view.campus,
    level: view.mainCursus?.level ?? null,
  };
}
