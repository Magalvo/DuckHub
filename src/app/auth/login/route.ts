import { handleLogin } from '../../../auth/handlers';
import { authDeps } from '../../../server/runtime';

export const GET = async (req: Request): Promise<Response> => handleLogin(req, await authDeps());
