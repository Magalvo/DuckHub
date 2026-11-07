// Conquistas (WI-0011, ADR 0011): um catálogo de dados (catalog.json, conteúdo
// do humano) e um avaliador puro sobre o snapshot do Passaporte (regra 11).
// As regras são dados de uma união fechada, não código: o ficheiro valida-se
// por schema quando o módulo carrega, e um catálogo inválido falha logo
// (teste e arranque), nunca em silêncio. Nenhum tipo de regra olha para
// projetos falhados ou em curso (AC4): as badges são públicas.
import { z } from 'zod';

import type { PassportSnapshot } from '../passport/passport';
import { projectState, shownLevel } from '../passport/rules';
import rawCatalog from './catalog.json';

export interface Badge {
  id: string;
  name: string;
  description: string;
}

export type BadgeRule =
  | { kind: 'validated-count'; min: number } // projetos validados ≥ min
  | { kind: 'max-mark' } // um projeto validado com MAX_MARK
  | { kind: 'level'; min: number } // nível mostrado do 42cursus ≥ min
  | { kind: 'alumni' }; // isAlumni

const MAX_MARK = 125;
const MAIN_CURSUS = '42cursus';

const text = z.string().refine((s) => s.trim() !== '', { message: 'texto vazio' });

const ruleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('validated-count'), min: z.number().int().positive() }).strict(),
  z.object({ kind: z.literal('max-mark') }).strict(),
  z.object({ kind: z.literal('level'), min: z.number().positive() }).strict(),
  z.object({ kind: z.literal('alumni') }).strict(),
]);

const entrySchema = z
  .object({ id: text, name: text, description: text, rule: ruleSchema })
  .strict();

/** Schema do catálogo: ids únicos, textos não vazios, só os tipos de regra acima. */
export const badgeCatalogSchema: z.ZodType<(Badge & { rule: BadgeRule })[]> = z
  .array(entrySchema)
  .superRefine((catalog, ctx) => {
    const seen = new Set<string>();
    for (const [index, { id }] of catalog.entries()) {
      if (seen.has(id)) {
        ctx.addIssue({ code: 'custom', message: `id repetido: ${id}`, path: [index, 'id'] });
      }
      seen.add(id);
    }
  });

const catalog = badgeCatalogSchema.parse(rawCatalog);

function earns(rule: BadgeRule, snapshot: PassportSnapshot): boolean {
  // Validado é o mesmo "done" que o Passaporte mostra, nunca outra condição.
  const done = snapshot.projects.filter((p) => projectState(p) === 'done');
  switch (rule.kind) {
    case 'validated-count':
      return done.length >= rule.min;
    case 'max-mark':
      return done.some((p) => p.finalMark === MAX_MARK);
    case 'level': {
      // Só o 42cursus (slug exato); o nível da Piscine não dá badges.
      const main = snapshot.cursus.find((c) => c.slug === MAIN_CURSUS);
      return main !== undefined && shownLevel(main.level) >= rule.min;
    }
    case 'alumni':
      return snapshot.isAlumni;
  }
}

/** As badges conquistadas, pela ordem do catálogo. Função pura do snapshot. */
export function earnedBadges(snapshot: PassportSnapshot): Badge[] {
  return catalog
    .filter((badge) => earns(badge.rule, snapshot))
    .map(({ id, name, description }) => ({ id, name, description }));
}
