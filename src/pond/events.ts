// Duck Pond (WI-0012, ADR 0013): os eventos de uma sincronização são a
// diferença entre o snapshot anterior e o novo. Funções puras, sobre as mesmas
// regras do Passaporte e das badges (projectState, shownLevel, earnedBadges):
// um evento nunca discorda do que o Passaporte mostra.
import { z } from 'zod';

import { earnedBadges, findBadge } from '../badges/badges';
import type { PassportSnapshot } from '../passport/passport';
import { projectState, shownLevel } from '../passport/rules';

export type PondEvent =
  | { kind: 'project-validated'; slug: string; name: string; finalMark: number | null }
  | { kind: 'level-up'; level: number } // inteiro ≥ 1: o nível mostrado do 42cursus, truncado
  | { kind: 'badge'; badgeId: string }; // id do catálogo do WI-0011

const MAIN_CURSUS = '42cursus';

/** Schema de um evento guardado: só estes três tipos, objetos estritos. */
export const pondEventSchema: z.ZodType<PondEvent> = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('project-validated'),
      slug: z.string().min(1),
      name: z.string(),
      finalMark: z.number().nullable(),
    })
    .strict(),
  z.object({ kind: z.literal('level-up'), level: z.number().int().min(1) }).strict(),
  z.object({ kind: z.literal('badge'), badgeId: z.string().min(1) }).strict(),
]);

/** O nível inteiro mostrado do 42cursus; sem 42cursus, 0. */
function wholeLevel(snapshot: PassportSnapshot): number {
  const main = snapshot.cursus.find((c) => c.slug === MAIN_CURSUS);
  return main === undefined ? 0 : Math.floor(shownLevel(main.level));
}

/**
 * Os eventos de uma sincronização. Sem snapshot anterior: nenhum (AC2).
 * Ordem: projetos (pela ordem do snapshot), a subida de nível, as badges
 * (pela ordem do catálogo).
 */
export function diffEvents(previous: PassportSnapshot | null, next: PassportSnapshot): PondEvent[] {
  if (previous === null) return [];

  const doneBefore = new Set(
    previous.projects.filter((p) => projectState(p) === 'done').map((p) => p.slug)
  );
  const projects: PondEvent[] = next.projects
    .filter((p) => projectState(p) === 'done' && !doneBefore.has(p.slug))
    .map(({ slug, name, finalMark }) => ({ kind: 'project-validated', slug, name, finalMark }));

  const badgesBefore = new Set(earnedBadges(previous).map((b) => b.id));
  const newBadges = earnedBadges(next).filter((b) => !badgesBefore.has(b.id));
  const badges: PondEvent[] = newBadges.map((b) => ({ kind: 'badge', badgeId: b.id }));

  // Um salto de vários níveis dá um só evento, com o nível novo. Se uma badge
  // nova é a desse nível, só aparece a badge (decisão de 2026-11-07).
  const level = wholeLevel(next);
  const levelBadge = newBadges.some((b) => {
    const rule = findBadge(b.id)?.rule;
    return rule?.kind === 'level' && rule.min === level;
  });
  const levelUp: PondEvent[] =
    level > wholeLevel(previous) && level >= 1 && !levelBadge ? [{ kind: 'level-up', level }] : [];

  return [...projects, ...levelUp, ...badges];
}
