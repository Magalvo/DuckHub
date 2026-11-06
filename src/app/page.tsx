// Página inicial: o Passaporte do próprio utilizador (WI-0005). A sessão volta a
// verificar-se aqui, além do proxy (AC7): o userId vem sempre do cookie de
// sessão do pedido, nunca de um parâmetro ou header que se possa forjar.
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSession } from '../auth/handlers';
import { Passport } from '../components/passport';
import { messages } from '../i18n/messages';
import { passportView } from '../passport/passport';
import { authDeps, passportStore } from '../server/runtime';

export default async function HomePage() {
  const { home, passport } = messages;
  const cookie = (await headers()).get('cookie') ?? '';
  const deps = await authDeps();
  const session = await getSession(
    new Request('http://app.internal/', { headers: { cookie } }),
    deps
  );
  if (session === null) redirect('/login');

  const store = await passportStore();
  const [saved, hidden] = await Promise.all([
    store.load(session.userId),
    store.isHidden(session.userId),
  ]);

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-10 md:px-8">
      {hidden && (
        // WI-0009: o aviso num elemento próprio, a ligação para /account ao lado.
        <p className="mb-6 flex flex-wrap gap-x-2 rounded-md border border-hairline bg-surface-1 px-4 py-3">
          <span className="text-text-muted">{passport.hiddenNotice}</span>
          <Link href="/account" className="text-primary underline underline-offset-4">
            {passport.hiddenLink}
          </Link>
        </p>
      )}
      {saved === null ? (
        <section aria-labelledby="passport-title">
          <h1 id="passport-title" className="text-3xl font-extrabold tracking-tight">
            {passport.title}
          </h1>
          <p className="mt-4 max-w-prose text-text-muted">{passport.notSynced}</p>
        </section>
      ) : (
        <Passport view={passportView(saved.snapshot, saved.syncedAt)} />
      )}
      <form method="post" action="/auth/logout" className="mt-8">
        <button
          type="submit"
          className="rounded-md border border-hairline px-4 py-2 text-sm hover:bg-surface-2"
        >
          {home.signOut}
        </button>
      </form>
    </div>
  );
}
