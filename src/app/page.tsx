import { messages } from '../i18n/messages';

export default function HomePage() {
  const { home } = messages;

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-10 md:px-8">
      <p className="font-mono text-xs font-semibold tracking-wider text-primary uppercase">
        {home.eyebrow}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">{home.title}</h1>
      <p className="mt-4 max-w-prose text-text-muted">{home.body}</p>
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
