import { handleLogout } from '../../../auth/handlers';
import { authDeps } from '../../../server/runtime';

export const POST = async (req: Request): Promise<Response> => handleLogout(req, await authDeps());
