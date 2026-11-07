// Guardar ou apagar o perfil de trabalho (WI-0015). Protegida pelo proxy; os
// formulários de /tavern/profile fazem POST para aqui.
import { authDeps, workProfileStore } from '../../../../server/runtime';
import { handleProfileAnswers } from '../../../../tavern/profile';

export const POST = async (req: Request): Promise<Response> =>
  handleProfileAnswers(req, { auth: await authDeps(), store: await workProfileStore() });
