import { handleCallback } from '../../../auth/handlers';
import { authDeps } from '../../../server/runtime';

export const GET = (req: Request): Promise<Response> => handleCallback(req, authDeps());
