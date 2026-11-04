import { messages } from '../../i18n/messages';

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { readonly searchParams: SearchParams }) {
  const { login } = messages;
  const { error } = await searchParams;
  const message =
    error === 'campus' ? login.errors.campus : error === 'oauth' ? login.errors.oauth : null;

  return (
    <div className="mx-auto max-w-md px-4 py-16 md:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{login.title}</h1>
      <p className="mt-4 text-text-muted">{login.body}</p>
      {message !== null && (
        <p
          role="alert"
          className="mt-6 rounded-md border border-danger bg-surface-1 px-4 py-3 text-danger"
        >
          {message}
        </p>
      )}
      {/* <a> e não next/link: /auth/login é um route handler que redireciona
          para a 42, e o prefetch do next/link iniciaria o fluxo OAuth. */}
      <a
        href="/auth/login"
        className="mt-8 inline-block rounded-md bg-primary px-5 py-3 font-semibold text-void"
      >
        {login.signIn}
      </a>
      <p className="mt-8 text-sm">
        <a href="/privacy" className="text-primary underline underline-offset-4">
          {login.privacyLink}
        </a>
      </p>
    </div>
  );
}
