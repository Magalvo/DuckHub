// Passaporte (WI-0005). A cor da coalition (--accent) só entra em elementos não
// textuais (barra, borda, glow): o texto usa sempre os tokens do tema, porque a
// cor vem da API e pode não ter contraste (ADR 0008). A exceção é o avatar
// (WI-0008): as iniciais são preto ou branco puro, o de mais contraste com o
// fundo, o que garante sempre pelo menos 4.5:1. Números em JetBrains Mono.
import type { CSSProperties, ReactNode } from 'react';

import { messages } from '../i18n/messages';
import type { PassportView, ProjectState, SkillsView } from '../passport/passport';
import type { RadarPoint } from '../passport/skills';
import { realWorldFor } from '../passport/real-world';

const { passport, badges } = messages;

// Ícone comum a todas as badges (WI-0011): uma medalha, decorativa.
const BADGE_ICON = 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.5 14 7 21l5-3 5 3-1.5-7';

const stateLabel: Record<ProjectState, string> = {
  done: passport.states.done,
  failed: passport.states.failed,
  'in-progress': passport.states.inProgress,
};

// O estado distingue-se pelo rótulo e pelo ícone, não só pela cor.
const stateStyle: Record<ProjectState, { className: string; icon: string }> = {
  done: { className: 'text-primary', icon: 'M5 12.5l4.5 4.5L19 7.5' },
  failed: { className: 'text-danger', icon: 'M6 6l12 12M18 6L6 18' },
  'in-progress': {
    className: 'text-text-muted',
    icon: 'M12 6v6l4 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  },
};

function Icon({ d }: { readonly d: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-4 shrink-0 fill-none stroke-current stroke-2"
    >
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Detail({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-xs tracking-wider text-text-muted uppercase">{label}</dt>
      <dd className="mt-1 flex flex-wrap items-baseline gap-x-2">{children}</dd>
    </div>
  );
}

const polygon = (points: readonly RadarPoint[]): string =>
  points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ');

/**
 * Skills (WI-0019). O radar é decoração (aria-hidden) e o único SVG da secção;
 * a informação está na lista, com nome e nível. A forma usa a cor primária do
 * tema, nunca a da coalition: não tem de ter contraste, mas fica legível.
 */
function SkillsSection({ skills }: { readonly skills: SkillsView }) {
  const { radar } = skills;
  return (
    <section aria-labelledby="skills-title" className="mt-8">
      <h2 id="skills-title" className="text-xl font-bold">
        {passport.skills.title}
      </h2>
      <p className="mt-1 text-text-muted">{skills.cursus}</p>
      <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start">
        {radar !== null && (
          <svg
            aria-hidden="true"
            viewBox={`${String(-radar.radius - 4)} ${String(-radar.radius - 4)} ${String(2 * radar.radius + 8)} ${String(2 * radar.radius + 8)}`}
            className="size-56 shrink-0 self-center"
          >
            {radar.rings.map((ring, i) => (
              <polygon
                key={i}
                points={polygon(ring)}
                className="fill-none stroke-hairline"
                strokeWidth={1}
              />
            ))}
            {radar.axes.map((p, i) => (
              <line
                key={i}
                x1={0}
                y1={0}
                x2={p.x}
                y2={p.y}
                className="stroke-hairline"
                strokeWidth={1}
              />
            ))}
            <polygon
              points={polygon(radar.shape)}
              className="fill-primary/25 stroke-primary"
              strokeWidth={2}
              strokeLinejoin="round"
            />
          </svg>
        )}
        <ul aria-label={passport.skills.listLabel} className="flex flex-1 flex-col gap-2">
          {skills.skills.map((s) => (
            <li
              key={s.name}
              className="flex items-baseline justify-between gap-4 rounded-md border border-hairline bg-surface-2 px-4 py-2"
            >
              <span>{s.name}</span>
              <span className="font-mono font-semibold">{s.level}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * O corpo do Passaporte: cabeçalho, detalhes e projetos. Serve as duas vistas,
 * a do próprio e a pública (WI-0009): o que se mostra é o que vem na vista,
 * já filtrada no servidor. A data de sync fica de fora: só o próprio a vê.
 */
export function PassportBody({
  view,
  photoAlt,
}: {
  readonly view: Omit<PassportView, 'syncedAt'>;
  readonly photoAlt: string;
}) {
  const accent: CSSProperties & { '--accent': string } = { '--accent': view.accentColor };

  return (
    <>
      <section
        aria-labelledby="passport-title"
        style={accent}
        className="overflow-hidden rounded-lg border border-hairline bg-surface-1 shadow-[0_0_40px_-16px_var(--accent)]"
      >
        <div aria-hidden="true" className="h-1.5 bg-(--accent)" />
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <div
            role="img"
            aria-label={photoAlt}
            style={{ backgroundColor: view.accentColor, color: view.avatarText }}
            className="flex size-24 shrink-0 items-center justify-center rounded-full"
          >
            <span aria-hidden="true" className="font-mono text-3xl font-extrabold">
              {view.initials}
            </span>
          </div>
          <div>
            <h1 id="passport-title" className="font-mono text-3xl font-extrabold tracking-tight">
              {view.login}
            </h1>
            {view.isAlumni && (
              <p className="mt-2 inline-block rounded-sm border border-alumni px-2 py-0.5 font-mono text-xs font-semibold tracking-wider text-alumni uppercase">
                {passport.alumni}
              </p>
            )}
          </div>
        </div>
        <dl
          aria-label={passport.detailsLabel}
          className="grid gap-6 border-t border-hairline p-6 sm:grid-cols-2 xl:grid-cols-4"
        >
          <Detail label={passport.campus}>
            <span>{view.campus}</span>
          </Detail>
          <Detail label={passport.piscine}>
            <span className="capitalize">{view.piscine.month}</span>
            <span className="font-mono">{view.piscine.year}</span>
          </Detail>
          <Detail label={passport.coalition}>
            {view.coalitionName === null ? (
              <span className="text-text-muted">{passport.noCoalition}</span>
            ) : (
              <span>{view.coalitionName}</span>
            )}
          </Detail>
          {view.mainCursus !== null && (
            <Detail label={passport.level}>
              <span>{view.mainCursus.name}</span>
              <span className="font-mono text-lg font-semibold">{view.mainCursus.level}</span>
            </Detail>
          )}
        </dl>
        {view.reduced && (
          <p className="border-t border-hairline px-6 py-4 text-text-muted">{passport.reduced}</p>
        )}
      </section>

      {view.badges.length > 0 && (
        // WI-0011: etiqueta em maiúsculas monoespaçadas (design.md), com os tokens do
        // tema e nunca a cor da coalition. Sem badges, a secção não aparece.
        <section aria-labelledby="badges-title" className="mt-8">
          <h2 id="badges-title" className="text-xl font-bold">
            {badges.title}
          </h2>
          <ul
            aria-labelledby="badges-title"
            className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
          >
            {view.badges.map((b) => (
              <li
                key={b.id}
                className="flex flex-col gap-1.5 rounded-md border border-hairline bg-surface-2 px-4 py-3"
              >
                <span className="flex w-fit items-center gap-1.5 rounded-sm border border-primary px-2 py-0.5 font-mono text-xs font-semibold tracking-[0.05em] text-primary uppercase">
                  <Icon d={BADGE_ICON} />
                  {b.name}
                </span>
                <span className="text-sm text-text-muted">{b.description}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.skills !== null && <SkillsSection skills={view.skills} />}

      <section aria-labelledby="projects-title" className="mt-8">
        <h2 id="projects-title" className="text-xl font-bold">
          {passport.projects}
        </h2>
        {view.projects.length === 0 ? (
          <p className="mt-4 text-text-muted">{passport.noProjects}</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-2">
            {view.projects.map((p) => {
              const style = stateStyle[p.state];
              // Tradução "mundo real" pelo slug (WI-0006); sem ela, só o nome.
              const realWorld = realWorldFor(p.slug);
              return (
                <li
                  key={p.slug}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-hairline bg-surface-2 px-4 py-3"
                >
                  <span className="flex flex-1 flex-col">
                    <span className="font-medium">{p.name}</span>
                    {realWorld !== null && (
                      <span className="text-sm text-text-muted">{realWorld.title}</span>
                    )}
                  </span>
                  <span className={`flex items-center gap-1.5 text-sm ${style.className}`}>
                    <Icon d={style.icon} />
                    {stateLabel[p.state]}
                  </span>
                  {p.state === 'done' && p.finalMark !== null && (
                    <span className="flex items-baseline gap-1.5 text-sm">
                      <span className="text-text-muted">{passport.mark}</span>
                      <span className="font-mono font-semibold">{p.finalMark}</span>
                    </span>
                  )}
                  {realWorld !== null && (
                    <details className="basis-full text-sm">
                      <summary className="w-fit cursor-pointer rounded-sm text-text-muted hover:text-text">
                        {passport.aboutProject}
                      </summary>
                      <p className="mt-2">{realWorld.description}</p>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}

/** O Passaporte do próprio (WI-0005), com a data da última sincronização. */
export function Passport({ view }: { readonly view: PassportView }) {
  return (
    <>
      <PassportBody view={view} photoAlt={passport.photoAlt} />
      <p className="mt-8 flex flex-wrap gap-x-2 text-sm text-text-muted">
        <span>{passport.syncedAt}</span>
        <span className="font-mono text-text">{view.syncedAt}</span>
        <span>{passport.timeZone}</span>
      </p>
    </>
  );
}
