// Rubber Ducks (WI-0013, ADR 0014): POST /pond/ducks dá ou retira um Duck a um
// evento do feed. Route handler como o /account/visibility (WI-0009): Origin
// da app, sessão do cookie, formulário com Zod. Sem saldo nem limite (AC3).
import { z } from 'zod';

import { crossOrigin, getSession, type AuthDeps } from '../auth/handlers';
import { formFields } from '../passport/visibility';
import { parsePondPage, pondHref } from './feed';
import type { PondStore } from './store';

/** Só dígitos; 15 no máximo, para caber num inteiro exato de JavaScript. */
const duckForm = z.object({
  event: z
    .string()
    .regex(/^[0-9]{1,15}$/)
    .transform(Number),
  duck: z.enum(['give', 'take']),
  page: z.string().optional(),
});

const status = (code: number): Response => new Response(null, { status: code });

const seeOther = (location: string): Response =>
  new Response(null, { status: 303, headers: { location, 'cache-control': 'no-store' } });

/**
 * POST /pond/ducks → 303 para a página do feed de onde veio. As respostas
 * seguem a ordem da spec: Origin, sessão, campos, evento visível, evento próprio.
 */
export async function handleDuck(
  req: Request,
  deps: { auth: AuthDeps; store: Pick<PondStore, 'findVisibleEvent' | 'giveDuck' | 'takeDuck'> }
): Promise<Response> {
  if (crossOrigin(req, deps.auth.config)) return status(403);
  const session = await getSession(req, deps.auth);
  if (session === null) return seeOther('/login');

  const form = duckForm.safeParse(Object.fromEntries(await formFields(req)));
  if (!form.success) return status(400);
  const { event: eventId, duck, page } = form.data;

  // Um evento que quem pede não vê responde como inexistente (ADR 0010).
  const event = await deps.store.findVisibleEvent({ viewerId: session.userId, eventId });
  if (event === null) return status(404);
  if (event.ownerId === session.userId) return status(403);

  const input = { userId: session.userId, eventId };
  await (duck === 'give' ? deps.store.giveDuck(input) : deps.store.takeDuck(input));
  // Volta à página de onde veio; um valor inválido conta como 1.
  return seeOther(pondHref(parsePondPage({ page })));
}
