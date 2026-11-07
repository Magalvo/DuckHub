// Entrar ou sair de um lobby (WI-0017, ADR 0016). Protegida pelo proxy; os
// formulários de /tavern fazem POST para aqui.
import { authDeps, lobbyProjectsOf, lobbyStore, passportStore } from '../../../server/runtime';
import { handleLobby } from '../../../tavern/lobby';

export const POST = async (req: Request): Promise<Response> => {
  const passports = await passportStore();
  return handleLobby(req, {
    auth: await authDeps(),
    isHidden: (userId) => passports.isHidden(userId),
    projectsOf: lobbyProjectsOf,
    store: await lobbyStore(),
  });
};
