// Apagamento de conta (AC7). Protegida pelo proxy; o form faz POST para o
// route handler /account/delete.
import Link from 'next/link';

import { messages } from '../../i18n/messages';

export default function AccountPage() {
  const { account, privacy } = messages;

  return (
    <div className="mx-auto max-w-prose px-4 py-16 md:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{account.title}</h1>
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
    </div>
  );
}
