import { handleDeleteAccount } from '../../../auth/handlers';
import { authDeps } from '../../../server/runtime';

export const POST = async (req: Request): Promise<Response> =>
  handleDeleteAccount(req, await authDeps());
