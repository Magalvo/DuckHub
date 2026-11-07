// The Tavern (WI-0017, WI-0018, ADRs 0016 e 0017): os projetos de grupo que a
// pessoa ainda não validou, cada um com o seu lobby e quantas pessoas lá estão
// (os logins só se veem lá dentro). Protegida pelo proxy; a sessão volta a verificar-se
// aqui. Sem JavaScript obrigatório: entrar e sair são forms POST. A sugestão
// da Intra (searching_a_group/creating_group) só a vê o próprio.
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSession } from '../../auth/handlers';
import { messages } from '../../i18n/messages';
import {
  authDeps,
  lobbyProjectsOf,
  lobbyStore,
  passportStore,
  workProfileStore,
} from '../../server/runtime';
import { lookingLabel, type LobbyProject } from '../../tavern/lobby';

const { lobby: t } = messages.tavern;
const ACTION = '/tavern/lobby';

const buttonClass =
  'rounded-md px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';
const linkClass = 'text-primary underline underline-offset-4';

function LobbyForm({
  slug,
  intent,
  label,
}: {
  readonly slug: string;
  readonly intent: 'join' | 'leave';
  readonly label: string;
}) {
  return (
    <form method="post" action={ACTION}>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="project" value={slug} />
      <button
        type="submit"
        className={`${buttonClass} ${
          intent === 'join'
            ? 'bg-primary text-void'
            : 'border border-hairline bg-surface-2 text-text'
        }`}
      >
        {label}
      </button>
    </form>
  );
}

function Project({
  project,
  inside,
  others,
}: {
  readonly project: LobbyProject;
  readonly inside: boolean;
  /** Os outros com entrada válida no lobby, no campus de quem vê. */
  readonly others: number;
}) {
  return (
    <li className="rounded-md border border-hairline p-4">
      <p className="font-semibold">{project.name}</p>
      {project.suggested && <p className="mt-1 text-sm text-text-muted">{t.suggested}</p>}
      <p className="mt-1 text-sm">{lookingLabel(others, t.lookingOne, t.lookingMany)}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {inside ? (
          <>
            <Link href={`/tavern/${project.slug}`} className={linkClass}>
              {t.open}
            </Link>
            <LobbyForm slug={project.slug} intent="leave" label={t.leave} />
          </>
        ) : (
          // Num lobby vazio, entrar é criá-lo.
          <LobbyForm slug={project.slug} intent="join" label={others === 0 ? t.create : t.join} />
        )}
      </div>
    </li>
  );
}

export default async function TavernPage() {
  const cookie = (await headers()).get('cookie') ?? '';
  const session = await getSession(
    new Request('http://app.internal/tavern', { headers: { cookie } }),
    await authDeps()
  );
  if (session === null) redirect('/login');
  const { userId } = session;

  const [hidden, profile] = await Promise.all([
    (await passportStore()).isHidden(userId),
    (await workProfileStore()).get(userId),
  ]);

  return (
    <div className="mx-auto max-w-prose px-4 py-16 md:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.title}</h1>
      <p className="mt-4">
        <Link href="/tavern/profile" className={linkClass}>
          {t.editProfile}
        </Link>
      </p>
      {profile === null && <p className="mt-4 text-text-muted">{t.noProfile}</p>}
      {hidden ? <p className="mt-8">{t.hiddenPassport}</p> : <Projects userId={userId} />}
    </div>
  );
}

async function Projects({ userId }: { readonly userId: string }) {
  const store = await lobbyStore();
  const [projects, active, counts] = await Promise.all([
    lobbyProjectsOf(userId),
    store.activeSlugs(userId),
    store.counts(userId),
  ]);
  if (projects.length === 0) return <p className="mt-8">{t.noProjects}</p>;
  return (
    <ul aria-label={t.projectsLabel} className="mt-8 flex flex-col gap-4">
      {projects.map((project) => (
        <Project
          key={project.slug}
          project={project}
          inside={active.has(project.slug)}
          others={counts.get(project.slug) ?? 0}
        />
      ))}
    </ul>
  );
}
