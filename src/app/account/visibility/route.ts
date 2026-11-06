// Esconder ou mostrar o Passaporte (WI-0009, ADR 0010). Protegida pelo proxy;
// o form de /account faz POST para aqui.
import { handleSetVisibility } from '../../../passport/visibility';
import { authDeps, passportStore } from '../../../server/runtime';

export const POST = async (req: Request): Promise<Response> =>
  handleSetVisibility(req, { auth: await authDeps(), store: await passportStore() });
