// Tradução "mundo real" dos projetos (WI-0006): uma tabela estática e curada
// em real-world.json, validada por Zod quando o módulo carrega. Um ficheiro
// inválido falha logo (teste e arranque), nunca em silêncio. A procura é pelo
// slug exato da API, nunca pelo nome (AC4).
import { z } from 'zod';

import rawTable from './real-world.json';

export interface RealWorld {
  title: string;
  description: string;
}

const text = z.string().refine((s) => s.trim() !== '', { message: 'texto vazio' });

const entrySchema = z
  .object({
    slugs: z.array(text).min(1),
    title: text,
    description: text,
  })
  .strict();

/**
 * Schema da tabela: lista de { slugs, title, description }. Cada entrada tem
 * pelo menos um slug; nenhum slug se repete na tabela; textos não vazios.
 */
export const realWorldTableSchema: z.ZodType<
  { slugs: string[]; title: string; description: string }[]
> = z.array(entrySchema).superRefine((table, ctx) => {
  const seen = new Set<string>();
  for (const [index, entry] of table.entries()) {
    for (const slug of entry.slugs) {
      if (seen.has(slug)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [index, 'slugs'],
          message: `slug repetido: ${slug}`,
        });
      }
      seen.add(slug);
    }
  }
});

const table = realWorldTableSchema.parse(rawTable);

const bySlug = new Map<string, RealWorld>(
  table.flatMap(({ slugs, title, description }) =>
    slugs.map((slug): [string, RealWorld] => [slug, { title, description }])
  )
);

/** Tradução de um projeto pelo slug da API (nunca pelo nome); null se não houver. */
export function realWorldFor(slug: string): RealWorld | null {
  return bySlug.get(slug) ?? null;
}

/** Todos os slugs da tabela, pela ordem do ficheiro: os projetos do Common Core (WI-0007). */
export const realWorldSlugs: readonly string[] = [...bySlug.keys()];

/**
 * Os slugs do mesmo projeto: as linhas da tabela com mais de um slug, pela
 * ordem do ficheiro (por exemplo 42cursus-cub3d e cub3d). Nenhum slug aparece
 * em dois grupos (o schema garante). O lobby usa o primeiro (WI-0018, ADR 0017).
 */
export const realWorldSlugGroups: readonly (readonly string[])[] = table
  .filter(({ slugs }) => slugs.length > 1)
  .map(({ slugs }) => slugs);
