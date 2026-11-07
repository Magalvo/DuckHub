// Questionário do perfil de trabalho (WI-0015). Protegida pelo proxy; a sessão
// volta a verificar-se aqui. Sem JavaScript obrigatório: rádios e checkboxes
// nativos (setas e Tab), um form POST para /tavern/profile/answers. Qualquer
// pessoa com sessão responde, mesmo sem Passaporte. Sem texto livre.
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { getSession } from '../../../auth/handlers';
import { messages } from '../../../i18n/messages';
import { authDeps, workProfileStore } from '../../../server/runtime';
import {
  QUESTION_OPTIONS,
  SINGLE_QUESTIONS,
  type SingleQuestion,
  type WorkAnswers,
} from '../../../tavern/profile';

const { profile: t } = messages.tavern;
const ACTION = '/tavern/profile/answers';

const fieldsetClass = 'mt-8 rounded-md border border-hairline p-4';
const legendClass = 'px-1 font-semibold';
const optionClass = 'flex items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-2';
const inputClass = 'size-5 accent-primary';
const buttonClass =
  'rounded-md px-5 py-3 font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

function Periods({ chosen }: { readonly chosen: readonly string[] }) {
  const question = t.questions.periods;
  return (
    <fieldset className={fieldsetClass}>
      <legend className={legendClass}>{question.label}</legend>
      {QUESTION_OPTIONS.periods.map((value) => (
        <label key={value} className={optionClass}>
          <input
            type="checkbox"
            name="periods"
            value={value}
            defaultChecked={chosen.includes(value)}
            className={inputClass}
          />
          {question.options[value]}
        </label>
      ))}
    </fieldset>
  );
}

function Single({ name, value }: { readonly name: SingleQuestion; readonly value?: string }) {
  const question = t.questions[name];
  const options: Record<string, string> = question.options;
  const choices: readonly (readonly [string, string])[] = [
    ...QUESTION_OPTIONS[name].map((v): [string, string] => [v, options[v] ?? v]),
    ['', t.skip],
  ];
  return (
    <fieldset className={fieldsetClass}>
      <legend className={legendClass}>{question.label}</legend>
      {choices.map(([v, label]) => (
        <label key={v} className={optionClass}>
          <input
            type="radio"
            name={name}
            value={v}
            defaultChecked={(value ?? '') === v}
            className={inputClass}
          />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

export default async function TavernProfilePage({
  searchParams,
}: {
  readonly searchParams: Promise<{ saved?: string | string[]; deleted?: string | string[] }>;
}) {
  const cookie = (await headers()).get('cookie') ?? '';
  const session = await getSession(
    new Request('http://app.internal/tavern/profile', { headers: { cookie } }),
    await authDeps()
  );
  if (session === null) redirect('/login');

  const answers: WorkAnswers | null = await (await workProfileStore()).get(session.userId);
  const params = await searchParams;
  const notice = params.saved === '1' ? t.saved : params.deleted === '1' ? t.deleted : null;

  return (
    <div className="mx-auto max-w-prose px-4 py-16 md:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.title}</h1>
      <p className="mt-4 text-text-muted">{t.privacy}</p>
      {notice !== null && (
        <p role="status" className="mt-6 rounded-md border border-hairline bg-surface-2 px-4 py-3">
          {notice}
        </p>
      )}

      <form method="post" action={ACTION}>
        <Periods chosen={answers?.periods ?? []} />
        {SINGLE_QUESTIONS.map((name) => {
          const value = answers?.[name];
          return value === undefined ? (
            <Single key={name} name={name} />
          ) : (
            <Single key={name} name={name} value={value} />
          );
        })}
        <button
          type="submit"
          name="intent"
          value="save"
          className={`${buttonClass} mt-8 bg-primary text-void`}
        >
          {t.save}
        </button>
      </form>

      {answers !== null && (
        <form method="post" action={ACTION} className="mt-6">
          <input type="hidden" name="intent" value="delete" />
          <button type="submit" className={`${buttonClass} border border-danger text-danger`}>
            {t.delete}
          </button>
        </form>
      )}
    </div>
  );
}
