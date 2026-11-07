// Um lobby do The Tavern (WI-0017, ADR 0016): os outros membros do mesmo
// projeto e campus, ordenados pela compatibilidade (WI-0014), com a
// percentagem e as razões. 404 para quem não está no lobby (AC4). Nunca mostra
// o estado da Intra de ninguém nem as respostas do perfil de trabalho.
import { headers } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getSession } from '../../../auth/handlers';
import { messages } from '../../../i18n/messages';
import {
  authDeps,
  lobbyProjectsOf,
  lobbyStore,
  passportStore,
  workProfileStore,
} from '../../../server/runtime';
import { rankCandidates } from '../../../tavern/compatibility';
import { matchLabel, projectSlugSchema } from '../../../tavern/lobby';

const { lobby: t, reasons } = messages.tavern;

export default async function LobbyPage({
  params,
}: {
  readonly params: Promise<{ slug: string }>;
}) {
  const cookie = (await headers()).get('cookie') ?? '';
  const session = await getSession(
    new Request('http://app.internal/tavern', { headers: { cookie } }),
    await authDeps()
  );
  if (session === null) redirect('/login');
  const { userId } = session;

  const slug = projectSlugSchema.safeParse((await params).slug);
  if (!slug.success) notFound();
  if (await (await passportStore()).isHidden(userId)) notFound();
  const store = await lobbyStore();
  const [projects, active] = await Promise.all([
    lobbyProjectsOf(userId),
    store.activeSlugs(userId),
  ]);
  const project = projects.find((p) => p.slug === slug.data);
  if (project === undefined || !active.has(project.slug)) notFound();

  const [members, mine] = await Promise.all([
    store.members(userId, project.slug),
    (await workProfileStore()).get(userId),
  ]);
  // members já exclui quem vê; o login vazio não coincide com nenhum.
  const ranked = rankCandidates(
    { login: '', ...(mine ?? {}) },
    members.map((m) => ({ login: m.login, ...m.answers }))
  );

  return (
    <div className="mx-auto max-w-prose px-4 py-16 md:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{project.name}</h1>
      {ranked.length === 0 ? (
        <p className="mt-8">{t.empty}</p>
      ) : (
        <ul aria-label={t.membersLabel} className="mt-8 flex flex-col gap-4">
          {ranked.map(({ login, compatibility }) => (
            <li key={login} className="rounded-md border border-hairline p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Link
                  href={`/u/${login}`}
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  {login}
                </Link>
                <span className="font-mono text-sm">
                  {matchLabel(compatibility.score, t.match)}
                </span>
              </div>
              {compatibility.reasons.length > 0 && (
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-muted">
                  {compatibility.reasons.map((id) => (
                    <span key={id}>{reasons[id]}</span>
                  ))}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
