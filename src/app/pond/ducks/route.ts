// Dar ou retirar um Rubber Duck (WI-0013, ADR 0014). Protegida pelo proxy; os
// formulários de /pond fazem POST para aqui.
import { handleDuck } from '../../../pond/ducks';
import { logPosthogInfo } from '../../../server/posthog-logs';
import { authDeps, pondStore } from '../../../server/runtime';

export const POST = async (req: Request): Promise<Response> => {
  logPosthogInfo('Rubber Duck reaction requested', { method: 'POST', route: '/pond/ducks' });
  return handleDuck(req, { auth: await authDeps(), store: await pondStore() });
};
