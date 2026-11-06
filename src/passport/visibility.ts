// Visibilidade do Passaporte (WI-0009, ADR 0010): visível à comunidade por
// omissão, com a opção de o esconder em /account. POST /account/visibility é
// um route handler, como o /account/delete: sessão do cookie, Origin da app.
import { z } from 'zod';

import { crossOrigin, getSession, type AuthDeps } from '../auth/handlers';
import type { PassportSnapshot } from './passport';

export interface PassportVisibilityStore {
  /**
   * O Passaporte de um login, para a vista pública. Null se não houver
   * utilizador com esse login ou se ainda não sincronizou. Com logins
   * repetidos (o login não é único na BD), vale o que sincronizou por último.
   */
  loadPublic(login: string): Promise<{
    userId: string;
    hidden: boolean;
    snapshot: PassportSnapshot;
    syncedAt: number;
  } | null>;
  isHidden(userId: string): Promise<boolean>;
  setHidden(userId: string, hidden: boolean): Promise<void>;
}

/** O campo do formulário: só "true" ou "false". */
const visibilityForm = z.object({ hidden: z.enum(['true', 'false']) });

const seeOther = (location: string): Response =>
  new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

/** POST /account/visibility → muda a definição e responde 303 para /account. */
export async function handleSetVisibility(
  req: Request,
  deps: { auth: AuthDeps; store: PassportVisibilityStore }
): Promise<Response> {
  if (crossOrigin(req, deps.auth.config)) return new Response(null, { status: 403 });
  const session = await getSession(req, deps.auth);
  if (session === null) return seeOther('/login');

  const form = visibilityForm.safeParse(Object.fromEntries(await formFields(req)));
  if (!form.success) return new Response(null, { status: 400 });
  await deps.store.setHidden(session.userId, form.data.hidden === 'true');
  return seeOther('/account');
}

/** Os campos de texto do formulário; um corpo que não é formulário fica vazio. */
async function formFields(req: Request): Promise<[string, string][]> {
  let data: FormData;
  try {
    data = await req.formData();
  } catch {
    return []; // o Zod recusa a seguir: 400
  }
  const fields: [string, string][] = [];
  for (const [key, value] of data.entries()) {
    if (typeof value === 'string') fields.push([key, value]);
  }
  return fields;
}
