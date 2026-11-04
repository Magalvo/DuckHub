import { messages } from '../../i18n/messages';

export default function PrivacyPage() {
  const { privacy } = messages;

  return (
    <div className="mx-auto max-w-prose px-4 py-16 md:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{privacy.title}</h1>
      <p className="mt-4 text-text-muted">{privacy.intro}</p>
      <dl aria-label={privacy.itemsLabel} className="mt-8 flex flex-col gap-4">
        {privacy.items.map((item) => (
          <div key={item.data} className="rounded-md border border-hairline bg-surface-1 p-4">
            <dt className="font-semibold">{item.data}</dt>
            <dd className="mt-1 text-text-muted">{item.purpose}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 text-text-muted">{privacy.deletion}</p>
      <p className="mt-2">
        <a href="/account" className="text-primary underline underline-offset-4">
          {privacy.accountLink}
        </a>
      </p>
    </div>
  );
}
