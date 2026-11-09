import { handleLogin } from '../../../auth/handlers';
import { logPosthogInfo } from '../../../server/posthog-logs';
import { authDeps } from '../../../server/runtime';

export const GET = async (req: Request): Promise<Response> => {
  logPosthogInfo('OAuth login requested', { method: 'GET', route: '/auth/login' });
  return handleLogin(req, await authDeps());
};
