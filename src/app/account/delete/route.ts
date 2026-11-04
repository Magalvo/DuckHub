import { handleDeleteAccount } from '../../../auth/handlers';
import { authDeps } from '../../../server/runtime';

export const POST = (req: Request): Promise<Response> => handleDeleteAccount(req, authDeps());
