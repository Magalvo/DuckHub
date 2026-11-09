// Fronteira com a API da 42: schemas Zod das respostas e conversão para os
// tipos de domínio. Nada daqui confia no formato do que vem da rede.
import { z } from 'zod';

export interface Profile {
  id: number;
  login: string;
  imageUrl: string | null;
  primaryCampus: { id: number; name: string };
  piscine: { month: string; year: number }; // month como vem da API ("september")
  isAlumni: boolean;
  // WI-0019: sem o campo na API, o cursus também não o tem.
  cursus: { id: number; slug: string; name: string; level: number; skills?: Skill[] }[];
}
/** Uma skill de um cursus (WI-0019): o id da API não se guarda. */
export interface Skill {
  name: string;
  level: number;
}
export interface Coalition {
  id: number;
  name: string;
  slug: string;
  color: string;
}
export interface ProjectUser {
  projectId: number;
  name: string;
  slug: string;
  status: string; // como vem da API ("finished", "in_progress", ...)
  finalMark: number | null;
  validated: boolean | null;
}

const id = z.number().int().positive();

/** WI-0019: `{ id, name, level }` da API; o z.object deixa só o nome e o nível. */
export const skillSchema: z.ZodType<Skill> = z.object({
  name: z.string(),
  level: z.number().nonnegative(),
});

export const profileSchema = z
  .object({
    id,
    login: z.string().min(1),
    image: z.object({ link: z.string().nullable() }).nullable().optional(),
    pool_month: z.string().min(1),
    pool_year: z.string().regex(/^\d{4}$/),
    'alumni?': z.boolean(),
    campus: z.array(z.object({ id, name: z.string() })),
    campus_users: z.array(z.object({ campus_id: id, is_primary: z.boolean() })),
    cursus_users: z.array(
      z.object({
        level: z.number().nonnegative(),
        cursus: z.object({ id, name: z.string(), slug: z.string() }),
        skills: z.array(skillSchema).optional(),
      })
    ),
  })
  .transform((me, ctx): Profile => {
    const primaryId = me.campus_users.find((cu) => cu.is_primary)?.campus_id;
    const primary = me.campus.find((c) => c.id === primaryId);
    if (primary === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['campus_users'] });
      return z.NEVER;
    }
    return {
      id: me.id,
      login: me.login,
      imageUrl: me.image?.link ?? null,
      primaryCampus: { id: primary.id, name: primary.name },
      piscine: { month: me.pool_month, year: Number(me.pool_year) },
      isAlumni: me['alumni?'],
      cursus: me.cursus_users.map((cu) => {
        const c = { id: cu.cursus.id, slug: cu.cursus.slug, name: cu.cursus.name, level: cu.level };
        return cu.skills === undefined ? c : { ...c, skills: cu.skills };
      }),
    };
  });

export const coalitionSchema = z
  .object({
    id,
    name: z.string(),
    slug: z.string(),
    color: z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i),
  })
  .transform(({ id, name, slug, color }): Coalition => ({ id, name, slug, color }));

export const projectUserSchema = z
  .object({
    final_mark: z.number().nullable(),
    status: z.string(),
    'validated?': z.boolean().nullable(),
    project: z.object({ id, name: z.string(), slug: z.string() }),
  })
  .transform((pu): ProjectUser => ({
    projectId: pu.project.id,
    name: pu.project.name,
    slug: pu.project.slug,
    status: pu.status,
    finalMark: pu.final_mark,
    validated: pu['validated?'],
  }));

const xp = z.number().int().nonnegative();

export const projectSchema = z.object({
  difficulty: xp,
  project_sessions: z.array(
    z.object({
      campus_id: id.nullable(),
      cursus_id: id.nullable(),
      difficulty: xp.nullable(),
      /** WI-0017: projeto a solo; pode faltar ou vir a null (ADR 0016). */
      solo: z.boolean().nullable().optional(),
    })
  ),
});

/** Um projeto de um cursus (WI-0007), com o XP já escolhido por xpFor. */
export interface CursusProject {
  projectId: number;
  slug: string;
  name: string;
  xp: number;
  /** Projeto a solo (WI-0017), escolhido por soloFor. */
  solo: boolean;
}

export const cursusProjectSchema = projectSchema.extend({
  id,
  name: z.string().min(1),
  slug: z.string().min(1),
});

/**
 * XP de um projeto (AC7): a difficulty da project_session do mesmo campus e
 * cursus, quando existe e não é nula; senão, a difficulty do projeto.
 */
export function xpFor(
  project: z.infer<typeof projectSchema>,
  ctx: { campusId: number; cursusId: number }
): number {
  const session = project.project_sessions.find(
    (s) => s.campus_id === ctx.campusId && s.cursus_id === ctx.cursusId && s.difficulty !== null
  );
  return session?.difficulty ?? project.difficulty;
}

/**
 * Projeto a solo (WI-0017, WI-0022, ADR 0016), pela primeira session que houver
 * nesta ordem: a do mesmo campus e cursus; a sem campus do mesmo cursus; a sem
 * campus e sem cursus (o cub3d só tem essa). Nunca uma de outro cursus. Sem
 * session aplicável ou com solo desconhecido, conta como a solo: na dúvida,
 * não há lobby.
 */
export function soloFor(
  project: z.infer<typeof projectSchema>,
  ctx: { campusId: number; cursusId: number }
): boolean {
  const sessions = project.project_sessions;
  const session =
    sessions.find((s) => s.campus_id === ctx.campusId && s.cursus_id === ctx.cursusId) ??
    sessions.find((s) => s.campus_id === null && s.cursus_id === ctx.cursusId) ??
    sessions.find((s) => s.campus_id === null && s.cursus_id === null);
  return session?.solo ?? true;
}

/**
 * Issues de validação sem valores: só o caminho e o código. As mensagens do Zod
 * podem ecoar o que veio na resposta (AC9).
 */
export function describeIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join('.') || '(raiz)'}: ${i.code}`);
}
