// Duck Pond (WI-0012, ADR 0013). Protegida pelo proxy; a sessão volta a
// verificar-se aqui. Sem JavaScript obrigatório: a lista e a paginação vêm do
// servidor. Os eventos de quem se escondeu só aparecem ao próprio (AC5).
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSession } from '../../auth/handlers';
import { messages } from '../../i18n/messages';
import { parsePondPage, pondItem, type PondItem, type PondSearchParams } from '../../pond/feed';
import { authDeps, pondStore } from '../../server/runtime';

const { pond: t, passport } = messages;

const pageHref = (page: number): string => (page > 1 ? `/pond?page=${String(page)}` : '/pond');

/**
 * A frase depois do login e a nota, como texto. O espaço à cabeça separa as
 * palavras para leitores de ecrã; num item flex, o browser não o mostra.
 */
function sentence(event: PondItem['event']): { text: string; mark: string | null } {
  switch (event.kind) {
    case 'project-validated':
      return {
        text: ` ${t.events.projectValidated} ${event.name}`,
        mark: event.finalMark === null ? null : ` ${passport.mark} ${String(event.finalMark)}`,
      };
    case 'level-up':
      return { text: ` ${t.events.levelUp} ${String(event.level)}`, mark: null };
    case 'badge':
      return { text: ` ${t.events.badge} ${event.badgeName}`, mark: null };
  }
}

function PondEntry({ item }: { readonly item: PondItem }) {
  const { text, mark } = sentence(item.event);
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-md border border-hairline bg-surface-1 px-4 py-3">
      <p className="flex min-w-0 flex-wrap items-baseline gap-x-1.5">
        <Link
          href={`/u/${item.login}`}
          className="font-mono font-semibold text-primary underline-offset-4 hover:underline"
        >
          {item.login}
        </Link>
        <span>{text}</span>
        {mark !== null && (
          <span className="rounded-sm bg-surface-3 px-1.5 font-mono text-sm">{mark}</span>
        )}
      </p>
      {/* Ações por evento (WI-0013) entram aqui, ao lado da data. */}
      <div className="flex shrink-0 items-center gap-3">
        <time dateTime={item.day} className="font-mono text-sm text-text-muted">
          {item.day}
        </time>
      </div>
    </li>
  );
}

export default async function PondPage({
  searchParams,
}: {
  readonly searchParams: Promise<PondSearchParams>;
}) {
  const cookie = (await headers()).get('cookie') ?? '';
  const session = await getSession(
    new Request('http://app.internal/pond', { headers: { cookie } }),
    await authDeps()
  );
  if (session === null) redirect('/login');

  const page = parsePondPage(await searchParams);
  const result = await (await pondStore()).listEvents({ viewerId: session.userId, page });
  const items = result.events.flatMap((row) => {
    const item = pondItem(row);
    return item === null ? [] : [item];
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.title}</h1>
      <p className="mt-4 max-w-prose text-text-muted">{t.intro}</p>

      <ul aria-label={t.listLabel} className="mt-8 flex flex-col gap-2">
        {items.map((item) => (
          <PondEntry key={item.id} item={item} />
        ))}
      </ul>
      {items.length === 0 && <p className="mt-4 text-text-muted">{t.empty}</p>}

      {(page > 1 || result.hasNext) && (
        <nav aria-label={t.pagination} className="mt-8 flex gap-4">
          {page > 1 && (
            <Link href={pageHref(page - 1)} className="text-primary underline underline-offset-4">
              {t.previous}
            </Link>
          )}
          {result.hasNext && (
            <Link href={pageHref(page + 1)} className="text-primary underline underline-offset-4">
              {t.next}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
