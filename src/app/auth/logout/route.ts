import { handleLogout } from '../../../auth/handlers';
import { authDeps } from '../../../server/runtime';

export const POST = (req: Request): Promise<Response> => handleLogout(req, authDeps());
