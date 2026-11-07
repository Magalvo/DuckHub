// Questionário do perfil de trabalho (WI-0015). As respostas do formulário
// entram por Zod (regra 4) e dão o WorkProfile do WI-0014 sem o login. O POST
// /tavern/profile/answers segue o /pond/ducks: Origin da app, sessão do
// cookie, formulário validado. Apagar funciona sempre (direito de apagar).
import { z } from 'zod';

import { crossOrigin, getSession, type AuthDeps } from '../auth/handlers';
import type { WorkProfile } from './compatibility';

export type WorkAnswers = Omit<WorkProfile, 'login'>;

/** As opções de cada pergunta, pela ordem do questionário e do WI-0014. */
export const QUESTION_OPTIONS = {
  periods: ['morning', 'afternoon', 'evening', 'night'],
  start: ['this-week', 'two-weeks', 'no-rush'],
  gradeGoal: ['pass', 'bonus', 'max'],
  pace: ['sprint', 'steady', 'relaxed'],
  style: ['pair', 'split', 'mixed'],
  setting: ['on-site', 'hybrid', 'remote'],
  role: ['lead', 'follow', 'either'],
} as const;

export type SingleQuestion = Exclude<keyof WorkAnswers, 'periods'>;

export const SINGLE_QUESTIONS: readonly SingleQuestion[] = [
  'start',
  'gradeGoal',
  'pace',
  'style',
  'setting',
  'role',
];

const isSingle = (key: string): key is SingleQuestion =>
  (SINGLE_QUESTIONS as readonly string[]).includes(key);

const answersSchema = z.strictObject({
  periods: z.array(z.enum(QUESTION_OPTIONS.periods)).optional(),
  start: z.enum(QUESTION_OPTIONS.start).optional(),
  gradeGoal: z.enum(QUESTION_OPTIONS.gradeGoal).optional(),
  pace: z.enum(QUESTION_OPTIONS.pace).optional(),
  style: z.enum(QUESTION_OPTIONS.style).optional(),
  setting: z.enum(QUESTION_OPTIONS.setting).optional(),
  role: z.enum(QUESTION_OPTIONS.role).optional(),
});

/**
 * As respostas de um formulário, ou null se for inválido: um valor fora das
 * opções (sem trim nem minúsculas), uma pergunta de escolha única repetida, um
 * período vazio ou desconhecido, ou um valor que seja ficheiro. "" ou ausente
 * = sem resposta; campos que não são perguntas (como intent) ignoram-se. Os
 * períodos ficam sem repetidos, pela ordem do dia; nenhum = sem a chave.
 */
export function answersFromForm(form: FormData): WorkAnswers | null {
  const raw: Record<string, string | string[]> = {};
  const seen = new Set<string>();
  const periods: string[] = [];
  for (const [key, value] of form.entries()) {
    if (typeof value !== 'string') return null;
    if (key === 'periods') {
      periods.push(value);
    } else if (isSingle(key)) {
      // Repetida conta mesmo com valores vazios.
      if (seen.has(key)) return null;
      seen.add(key);
      // "Prefer not to say" envia "": a pergunta fica sem resposta.
      if (value !== '') raw[key] = value;
    }
  }
  if (periods.length > 0) raw.periods = periods;

  const parsed = answersSchema.safeParse(raw);
  if (!parsed.success) return null;

  // Só as chaves respondidas (exactOptionalPropertyTypes: nada de undefined).
  const data = parsed.data;
  const answers: WorkAnswers = {};
  if (data.periods !== undefined) {
    const chosen = data.periods;
    answers.periods = QUESTION_OPTIONS.periods.filter((p) => chosen.includes(p));
  }
  if (data.start !== undefined) answers.start = data.start;
  if (data.gradeGoal !== undefined) answers.gradeGoal = data.gradeGoal;
  if (data.pace !== undefined) answers.pace = data.pace;
  if (data.style !== undefined) answers.style = data.style;
  if (data.setting !== undefined) answers.setting = data.setting;
  if (data.role !== undefined) answers.role = data.role;
  return answers;
}

/** Sem nenhuma resposta: guardar apaga o perfil. */
export const isEmpty = (answers: WorkAnswers): boolean => Object.keys(answers).length === 0;

const status = (code: number): Response => new Response(null, { status: code });

const seeOther = (location: string): Response =>
  new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

const PAGE = '/tavern/profile';

/** "save" ou "delete"; sem intent = save; repetido, vazio ou outro = null. */
function intentOf(form: FormData): 'save' | 'delete' | null {
  const values = form.getAll('intent');
  if (values.length === 0) return 'save';
  const [only] = values;
  if (values.length > 1 || (only !== 'save' && only !== 'delete')) return null;
  return only;
}

/**
 * POST /tavern/profile/answers, por esta ordem: Origin de outro site → 403;
 * sem sessão → 303 /login; intent inválido → 400; delete → apaga sem olhar
 * para as respostas; save inválido → 400; save vazio → apaga; save → guarda.
 */
export async function handleProfileAnswers(
  req: Request,
  deps: {
    auth: AuthDeps;
    store: {
      save(userId: string, answers: WorkAnswers): Promise<void>;
      delete(userId: string): Promise<void>;
    };
  }
): Promise<Response> {
  if (crossOrigin(req, deps.auth.config)) return status(403);
  const session = await getSession(req, deps.auth);
  if (session === null) return seeOther('/login');

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return status(400); // um corpo que não é formulário
  }

  const intent = intentOf(form);
  if (intent === null) return status(400);
  if (intent === 'delete') {
    await deps.store.delete(session.userId);
    return seeOther(`${PAGE}?deleted=1`);
  }

  const answers = answersFromForm(form);
  if (answers === null) return status(400);
  await deps.store.save(session.userId, answers);
  return seeOther(isEmpty(answers) ? `${PAGE}?deleted=1` : `${PAGE}?saved=1`);
}
