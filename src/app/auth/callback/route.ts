import { handleCallback } from '../../../auth/handlers';
import { authDeps } from '../../../server/runtime';

export const GET = async (req: Request): Promise<Response> => handleCallback(req, await authDeps());
