// WorkProfileStore sobre Drizzle (WI-0015). Uma linha por pessoa; sem
// respostas não há linha. A linha valida-se com Zod ao ler (regra 4): uma
// linha inválida conta como sem perfil. A cascata de users apaga o perfil
// quando a conta é apagada.
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { workProfiles } from '../db/schema';
import type { Db } from '../db/store';
import { isEmpty, QUESTION_OPTIONS, type WorkAnswers } from './profile';

export interface WorkProfileStore {
  /** As respostas guardadas, ou null se não houver perfil. */
  get(userId: string): Promise<WorkAnswers | null>;
  /** Substitui tudo; respostas vazias apagam a linha. */
  save(userId: string, answers: WorkAnswers): Promise<void>;
  /** Apaga o perfil; idempotente. */
  delete(userId: string): Promise<void>;
}

const rowSchema = z.object({
  periods: z.array(z.enum(QUESTION_OPTIONS.periods)),
  start: z.enum(QUESTION_OPTIONS.start).nullable(),
  gradeGoal: z.enum(QUESTION_OPTIONS.gradeGoal).nullable(),
  pace: z.enum(QUESTION_OPTIONS.pace).nullable(),
  style: z.enum(QUESTION_OPTIONS.style).nullable(),
  setting: z.enum(QUESTION_OPTIONS.setting).nullable(),
  role: z.enum(QUESTION_OPTIONS.role).nullable(),
});

type Row = z.infer<typeof rowSchema>;

function answersFromRow(row: Row): WorkAnswers {
  const answers: WorkAnswers = {};
  // Pela ordem do dia e sem repetidos, como o formulário os guarda.
  const periods = QUESTION_OPTIONS.periods.filter((p) => row.periods.includes(p));
  if (periods.length > 0) answers.periods = periods;
  if (row.start !== null) answers.start = row.start;
  if (row.gradeGoal !== null) answers.gradeGoal = row.gradeGoal;
  if (row.pace !== null) answers.pace = row.pace;
  if (row.style !== null) answers.style = row.style;
  if (row.setting !== null) answers.setting = row.setting;
  if (row.role !== null) answers.role = row.role;
  return answers;
}

export function createDrizzleWorkProfileStore(db: Db): WorkProfileStore {
  const remove = async (userId: string): Promise<void> => {
    await db.delete(workProfiles).where(eq(workProfiles.userId, userId));
  };

  return {
    async get(userId) {
      const [row] = await db
        .select({
          periods: workProfiles.periods,
          start: workProfiles.start,
          gradeGoal: workProfiles.gradeGoal,
          pace: workProfiles.pace,
          style: workProfiles.style,
          setting: workProfiles.setting,
          role: workProfiles.role,
        })
        .from(workProfiles)
        .where(eq(workProfiles.userId, userId));
      if (row === undefined) return null;
      const parsed = rowSchema.safeParse(row);
      return parsed.success ? answersFromRow(parsed.data) : null;
    },

    async save(userId, answers) {
      if (isEmpty(answers)) {
        await remove(userId);
        return;
      }
      // Todas as colunas, para o que ficou sem resposta voltar a NULL.
      const values = {
        periods: QUESTION_OPTIONS.periods.filter((p) => answers.periods?.includes(p)),
        start: answers.start ?? null,
        gradeGoal: answers.gradeGoal ?? null,
        pace: answers.pace ?? null,
        style: answers.style ?? null,
        setting: answers.setting ?? null,
        role: answers.role ?? null,
        updatedAt: new Date(),
      };
      await db
        .insert(workProfiles)
        .values({ userId, ...values })
        .onConflictDoUpdate({ target: workProfiles.userId, set: values });
    },

    delete: remove,
  };
}
