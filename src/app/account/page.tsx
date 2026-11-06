// A conta (WI-0004, WI-0009). Protegida pelo proxy; a sessão volta a
// verificar-se aqui para ler a visibilidade do Passaporte. Os forms fazem POST
// para os route handlers /account/visibility e /account/delete.
import { headers } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getSession } from '../../auth/handlers';
import { messages } from '../../i18n/messages';
import { authDeps, passportStore } from '../../server/runtime';

export default async function AccountPage() {
  const { account, privacy } = messages;
  const cookie = (await headers()).get('cookie') ?? '';
  const session = await getSession(
    new Request('http://app.internal/', { headers: { cookie } }),
    await authDeps()
  );
  if (session === null) redirect('/login');
  const hidden = await (await passportStore()).isHidden(session.userId);

  return (
    <div className="mx-auto max-w-prose px-4 py-16 md:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{account.title}</h1>

      <section aria-labelledby="visibility-title" className="mt-8">
        <h2 id="visibility-title" className="text-xl font-bold">
          {account.visibility.title}
        </h2>
        <p className="mt-4 text-text-muted">
          {hidden ? account.visibility.hiddenState : account.visibility.visibleState}
        </p>
        <form method="post" action="/account/visibility" className="mt-4">
          <input type="hidden" name="hidden" value={hidden ? 'false' : 'true'} />
          <button
            type="submit"
            className="rounded-md border border-hairline px-5 py-3 font-semibold hover:bg-surface-2"
          >
            {hidden ? account.visibility.show : account.visibility.hide}
          </button>
        </form>
      </section>

      <section aria-labelledby="delete-title" className="mt-12">
        <h2 id="delete-title" className="text-xl font-bold">
          {account.deleteTitle}
        </h2>
        <p className="mt-4 text-text-muted">{account.body}</p>
        <ul className="mt-4 list-disc pl-6">
          {privacy.items.map((item) => (
            <li key={item.data}>{item.data}</li>
          ))}
        </ul>
        <p className="mt-4 text-text-muted">{account.note}</p>
        <form method="post" action="/account/delete" className="mt-8 flex flex-wrap gap-4">
          <button
            type="submit"
            className="rounded-md border border-danger px-5 py-3 font-semibold text-danger hover:bg-surface-2"
          >
            {account.confirm}
          </button>
          <Link href="/" className="px-5 py-3 text-primary underline underline-offset-4">
            {account.cancel}
          </Link>
        </form>
      </section>
    </div>
  );
}
