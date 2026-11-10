// Calculadora de XP (WI-0007, ADR 0009). Sem JavaScript obrigatório: um
// formulário GET, e o resultado vem do servidor. A sessão volta a verificar-se
// aqui, além do proxy; o campus vem do utilizador da sessão, nunca da query.
// Sem estimativa de nível novo nem de XP em falta (AC6).
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

import { getSession } from '../../auth/handlers';
import type { CachedProjectXp } from '../../calculator/store';
import { calculatorView, isAvailable, type CalculatorQuery } from '../../calculator/view';
import { messages } from '../../i18n/messages';
import { authDeps, calculatorDeps, passportStore } from '../../server/runtime';

const { calculator: t } = messages;

const fieldClass =
  'mt-2 block w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-danger';

function FieldError({ id, children }: { readonly id: string; readonly children: ReactNode }) {
  return (
    <p id={id} role="alert" className="mt-2 text-sm text-danger">
      {children}
    </p>
  );
}

function Stat({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-xs tracking-wider text-text-muted uppercase">{label}</dt>
      <dd className="mt-1 font-mono text-3xl font-extrabold">{children}</dd>
    </div>
  );
}

export default async function CalculatorPage({
  searchParams,
}: {
  readonly searchParams: Promise<CalculatorQuery>;
}) {
  const cookie = (await headers()).get('cookie') ?? '';
  const session = await getSession(
    new Request('http://app.internal/calculator', { headers: { cookie } }),
    await authDeps()
  );
  if (session === null) redirect('/login');

  const saved = await (await passportStore()).load(session.userId);
  let projects: CachedProjectXp[] = [];
  let loading = false;
  // Só se lê (e talvez atualiza) a cache para quem pode usar a calculadora.
  if (isAvailable(saved)) {
    const deps = await calculatorDeps();
    const campusId = await deps.campusOf(session.userId);
    if (campusId !== null) {
      const read = await deps.cache.projectsFor(campusId);
      if (read.kind === 'ready') projects = read.projects;
      loading = read.kind === 'loading';
    }
  }
  const view = calculatorView({ saved, projects, query: await searchParams, loading });

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-10 md:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.title}</h1>

      {view.kind === 'unavailable' && (
        <p className="mt-4 max-w-prose text-text-muted">{t.unavailable}</p>
      )}
      {view.kind === 'no-data' && <p className="mt-4 max-w-prose text-text-muted">{t.noData}</p>}
      {view.kind === 'loading' && (
        <p role="status" className="mt-4 max-w-prose text-text-muted">
          {t.loading}
        </p>
      )}

      {view.kind === 'form' && (
        <>
          <p className="mt-4 max-w-prose text-text-muted">{t.intro}</p>
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
            <form
              method="get"
              action="/calculator"
              className="rounded-lg border border-hairline bg-surface-1 p-6"
            >
              <div>
                <label htmlFor="project" className="font-semibold">
                  {t.project}
                </label>
                <select
                  id="project"
                  name="project"
                  defaultValue={view.selected ?? undefined}
                  aria-invalid={view.projectError !== null}
                  aria-describedby={view.projectError === null ? undefined : 'project-error'}
                  className={fieldClass}
                >
                  {view.projects.map((p) => (
                    <option key={p.slug} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {view.projectError !== null && (
                  <FieldError id="project-error">{t.errors[view.projectError]}</FieldError>
                )}
              </div>
              <div className="mt-6">
                <label htmlFor="mark" className="font-semibold">
                  {t.mark}
                </label>
                <input
                  id="mark"
                  name="mark"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  defaultValue={view.markInput}
                  aria-invalid={view.markError !== null}
                  aria-describedby={view.markError === null ? undefined : 'mark-error'}
                  className={`${fieldClass} font-mono`}
                />
                {view.markError !== null && (
                  <FieldError id="mark-error">{t.errors[view.markError]}</FieldError>
                )}
              </div>
              <button
                type="submit"
                className="mt-6 rounded-md bg-primary px-4 py-2 font-semibold text-void hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {t.submit}
              </button>
            </form>

            <div className="grid content-start gap-6 rounded-lg border border-hairline bg-surface-1 p-6 sm:grid-cols-2">
              {view.result !== null && (
                <div className="sm:col-span-2">
                  <dl>
                    <Stat label={t.gained}>{view.result.gained}</Stat>
                  </dl>
                  <p className="mt-2 text-sm text-text-muted">
                    {t.source} <span className="font-mono">{view.result.source}</span>
                  </p>
                </div>
              )}
              <dl>
                <Stat label={t.currentLevel}>{view.currentLevel}</Stat>
              </dl>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
