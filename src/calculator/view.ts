// O que a página /calculator mostra (WI-0007): uma função pura sobre o
// Passaporte, a cache e a query do formulário GET. A query é input do browser:
// passa por Zod e nunca se confia nela.
import { z } from 'zod';

import { formatSyncedAt, passportView, type PassportSnapshot } from '../passport/passport';
import { realWorldSlugGroups } from '../passport/real-world';
import type { CachedProjectXp } from './store';
import { parseMark, xpGained } from './xp';

export type CalculatorView =
  | { kind: 'unavailable' } // só Piscine ou sem Passaporte (AC7)
  | { kind: 'no-data' } // sem cache e a atualização falhou
  | {
      kind: 'form';
      projects: { slug: string; name: string }[];
      /** Valores a repor no formulário. */
      selected: string | null;
      markInput: string;
      currentLevel: string; // "5.17" (AC5)
      projectError: 'unknownProject' | null;
      markError: 'notInteger' | 'outOfRange' | null;
      result: { gained: number; source: string } | null; // source: "AAAA-MM-DD HH:mm", Lisboa
    };

/** Um parâmetro repetido (?mark=1&mark=2) conta pelo primeiro valor. */
const param = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (Array.isArray(v) ? v[0] : v));

export const querySchema = z.object({ project: param, mark: param });

export type CalculatorQuery = z.input<typeof querySchema>;

const markErrors = { 'not-integer': 'notInteger', 'out-of-range': 'outOfRange' } as const;

type Saved = { snapshot: PassportSnapshot; syncedAt: number } | null;

/** Só com o 42cursus no Passaporte (AC7). Decide-se antes de ler a cache. */
export function isAvailable(saved: Saved): boolean {
  return saved !== null && !passportView(saved.snapshot, saved.syncedAt).reduced;
}

/**
 * Uma linha por projeto (WI-0024): os slugs do mesmo grupo dão uma só, a do
 * primeiro slug do grupo que está em `projects`. Devolve uma subsequência de
 * `projects`: as linhas que ficam não mudam nem mudam de lugar.
 */
export function distinctProjects(
  projects: readonly CachedProjectXp[],
  groups: readonly (readonly string[])[]
): CachedProjectXp[] {
  const present = new Set(projects.map((p) => p.slug));
  return projects.filter((p) => {
    const group = groups.find((g) => g.includes(p.slug));
    return group === undefined || group.find((s) => present.has(s)) === p.slug;
  });
}

export function calculatorView(input: {
  saved: Saved;
  projects: readonly CachedProjectXp[];
  query: CalculatorQuery;
}): CalculatorView {
  const { saved } = input;
  if (saved === null) return { kind: 'unavailable' };
  const passport = passportView(saved.snapshot, saved.syncedAt);
  if (passport.reduced || passport.mainCursus === null) return { kind: 'unavailable' };
  if (input.projects.length === 0) return { kind: 'no-data' };

  const parsedQuery = querySchema.safeParse(input.query);
  const { project, mark } = parsedQuery.success ? parsedQuery.data : {};
  const rows = distinctProjects(input.projects, realWorldSlugGroups);
  // Qualquer slug do grupo resolve para a linha que ficou (links antigos, AC3).
  const sameProject = realWorldSlugGroups.find((g) => project !== undefined && g.includes(project));
  const chosen = rows.find((p) => p.slug === project || sameProject?.includes(p.slug) === true);
  const base = {
    kind: 'form' as const,
    projects: rows.map(({ slug, name }) => ({ slug, name })),
    selected: chosen?.slug ?? project ?? null,
    markInput: mark ?? '',
    currentLevel: passport.mainCursus.level,
  };

  // Formulário por submeter: nada a validar.
  if (project === undefined && mark === undefined) {
    return { ...base, projectError: null, markError: null, result: null };
  }

  const parsed = parseMark(mark ?? '');
  const projectError = chosen === undefined ? 'unknownProject' : null;
  const markError = parsed.ok ? null : markErrors[parsed.error];
  const result =
    chosen !== undefined && parsed.ok
      ? { gained: xpGained(chosen.xp, parsed.mark), source: formatSyncedAt(chosen.fetchedAt) }
      : null;
  return { ...base, projectError, markError, result };
}
