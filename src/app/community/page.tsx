// Diretório da comunidade (WI-0010, ADR 0012). Protegida pelo proxy; a sessão
// volta a verificar-se aqui. Sem JavaScript obrigatório: um formulário GET, e a
// lista e a paginação vêm do servidor. Só membros visíveis com Passaporte, e
// cada item é um subconjunto da vista pública (ADR 0010).
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSession } from '../../auth/handlers';
import {
  directoryItem,
  likePattern,
  MAX_QUERY_LENGTH,
  parseDirectoryQuery,
  resolveCampus,
  type DirectoryItem,
  type DirectorySearchParams,
} from '../../community/directory';
import { messages } from '../../i18n/messages';
import { authDeps, directoryStore } from '../../server/runtime';

const { community: t } = messages;

const fieldClass =
  'mt-2 block w-full rounded-md border border-hairline bg-surface-2 px-3 py-2 text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary';

/** URL de uma página que mantém q e campus. */
function pageHref(q: string | null, campusId: number | null, page: number): string {
  const params = new URLSearchParams();
  if (q !== null) params.set('q', q);
  if (campusId !== null) params.set('campus', String(campusId));
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query === '' ? '/community' : `/community?${query}`;
}

function Member({ item }: { readonly item: DirectoryItem }) {
  return (
    <li className="flex items-center gap-4 rounded-md border border-hairline bg-surface-1 px-4 py-3">
      {/* As iniciais ficam fora da ligação: o nome acessível é só o login. */}
      <span
        aria-hidden="true"
        style={{ backgroundColor: item.accentColor, color: item.avatarText }}
        className="flex size-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-extrabold"
      >
        {item.initials}
      </span>
      <span className="flex min-w-0 flex-col">
        <Link
          href={`/u/${item.login}`}
          className="truncate font-mono font-semibold text-primary underline-offset-4 hover:underline"
        >
          {item.login}
        </Link>
        <span className="flex flex-wrap gap-x-3 text-sm text-text-muted">
          <span>{item.campus}</span>
          {item.level !== null && (
            <span className="flex gap-1.5">
              <span>{t.level}</span>
              <span className="font-mono text-text">{item.level}</span>
            </span>
          )}
        </span>
      </span>
    </li>
  );
}

export default async function CommunityPage({
  searchParams,
}: {
  readonly searchParams: Promise<DirectorySearchParams>;
}) {
  const cookie = (await headers()).get('cookie') ?? '';
  const session = await getSession(
    new Request('http://app.internal/community', { headers: { cookie } }),
    await authDeps()
  );
  if (session === null) redirect('/login');

  const query = parseDirectoryQuery(await searchParams);
  const store = await directoryStore();
  const campuses = await store.campusOptions();
  const campusId = resolveCampus(query.campusId, campuses);
  // Um q mais longo do que qualquer login não encontra ninguém: nem se vai à BD.
  const result = query.tooLong
    ? { members: [], hasNext: false }
    : await store.listMembers({
        pattern: query.q === null ? null : likePattern(query.q),
        campusId,
        page: query.page,
      });
  const items = result.members.map((m) => directoryItem(m.snapshot, m.syncedAt));

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-10 md:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{t.title}</h1>
      <p className="mt-4 max-w-prose text-text-muted">{t.intro}</p>

      <form method="get" action="/community" className="mt-8 flex flex-wrap items-end gap-4">
        <div className="min-w-56 flex-1">
          <label htmlFor="community-q" className="font-semibold">
            {t.search}
          </label>
          <input
            id="community-q"
            name="q"
            type="search"
            defaultValue={query.q ?? ''}
            maxLength={MAX_QUERY_LENGTH}
            autoComplete="off"
            className={fieldClass}
          />
        </div>
        <div className="min-w-48">
          <label htmlFor="community-campus" className="font-semibold">
            {t.campus}
          </label>
          <select
            id="community-campus"
            name="campus"
            defaultValue={campusId === null ? '' : String(campusId)}
            className={fieldClass}
          >
            <option value="">{t.allCampuses}</option>
            {campuses.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-5 py-2.5 font-semibold text-void hover:opacity-90"
        >
          {t.submit}
        </button>
      </form>

      <ul aria-label={t.listLabel} className="mt-8 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Member key={item.login} item={item} />
        ))}
      </ul>
      {items.length === 0 && <p className="mt-4 text-text-muted">{t.empty}</p>}

      {(query.page > 1 || result.hasNext) && (
        <nav aria-label={t.pagination} className="mt-8 flex gap-4">
          {query.page > 1 && (
            <Link
              href={pageHref(query.q, campusId, query.page - 1)}
              className="text-primary underline underline-offset-4"
            >
              {t.previous}
            </Link>
          )}
          {result.hasNext && (
            <Link
              href={pageHref(query.q, campusId, query.page + 1)}
              className="text-primary underline underline-offset-4"
            >
              {t.next}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
