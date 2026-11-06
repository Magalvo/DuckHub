// Passaporte público (WI-0009, ADR 0010). Protegida pelo proxy; a sessão volta
// a verificar-se aqui, como em /. Inexistente, sem Passaporte e escondido (para
// outra pessoa) dão todos o mesmo 404, para não revelar quem existe (AC5, AC6).
// O teu próprio /u/<login> mostra a vista pública, com a nota ownPreview.
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';

import { getSession } from '../../../auth/handlers';
import { PassportBody } from '../../../components/passport';
import { messages } from '../../../i18n/messages';
import { passportView } from '../../../passport/passport';
import { publicPassportView } from '../../../passport/public';
import { authDeps, passportStore } from '../../../server/runtime';

/** Logins da 42: minúsculas, dígitos e hífen. O resto é 404 sem ir à BD. */
const loginParam = z.string().regex(/^[a-z0-9-]{1,32}$/);

export default async function PublicPassportPage({
  params,
}: {
  readonly params: Promise<{ login: string }>;
}) {
  const { publicPassport } = messages;
  const cookie = (await headers()).get('cookie') ?? '';
  const session = await getSession(
    new Request('http://app.internal/', { headers: { cookie } }),
    await authDeps()
  );
  if (session === null) redirect('/login');

  const login = loginParam.safeParse((await params).login);
  if (!login.success) notFound();
  const saved = await (await passportStore()).loadPublic(login.data);
  if (saved === null) notFound();
  const own = saved.userId === session.userId;
  if (saved.hidden && !own) notFound();

  const view = publicPassportView(passportView(saved.snapshot, saved.syncedAt));

  return (
    <div className="mx-auto max-w-[1680px] px-4 py-10 md:px-8">
      {own && (
        <p className="mb-6 rounded-md border border-hairline bg-surface-1 px-4 py-3 text-text-muted">
          {publicPassport.ownPreview}
        </p>
      )}
      <PassportBody view={view} photoAlt={publicPassport.photoAlt} />
    </div>
  );
}
