// 404 do Passaporte público (WI-0009): o mesmo texto para inexistente, sem
// Passaporte e escondido, para não revelar quem existe (AC5, AC6).
import Link from 'next/link';

import { messages } from '../../../i18n/messages';

export default function PublicPassportNotFound() {
  const { publicPassport } = messages;

  return (
    <div className="mx-auto max-w-prose px-4 py-16 md:px-8">
      <h1 className="text-3xl font-extrabold tracking-tight">{publicPassport.notFoundTitle}</h1>
      <p className="mt-4 text-text-muted">{publicPassport.notFound}</p>
      <p className="mt-8">
        <Link href="/" className="text-primary underline underline-offset-4">
          {publicPassport.backHome}
        </Link>
      </p>
    </div>
  );
}
