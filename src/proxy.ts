// Proxy do Next (WI-0004, AC1): sem sessão válida, tudo vai para /login, exceto
// os caminhos públicos e os assets. Sem cookie decide logo, sem ler a
// configuração nem a BD: /login e /privacy funcionam sem .env.
import { NextResponse, type NextRequest } from 'next/server';

import { clearSessionCookie, resolveSession, SESSION_COOKIE, sessionCookie } from './auth/handlers';
import { isPublicPath } from './auth/public-paths';
import { authDeps } from './server/runtime';

// 303: um POST sem sessão (p. ex. /account/delete) chega ao login como GET.
const toLogin = (request: NextRequest): NextResponse =>
  NextResponse.redirect(new URL('/login', request.url), 303);

export async function proxy(request: NextRequest): Promise<NextResponse> {
  if (isPublicPath(request.nextUrl.pathname)) return NextResponse.next();
  if (!request.cookies.has(SESSION_COOKIE)) return toLogin(request);

  const deps = authDeps();
  const session = await resolveSession(request, deps);
  if (session === null) {
    const response = toLogin(request);
    response.headers.append('set-cookie', clearSessionCookie(deps.config));
    return response;
  }
  const response = NextResponse.next();
  // O prazo avançou na BD: o cookie do browser acompanha-o (AC9).
  if (session.renewed) {
    response.headers.append('set-cookie', sessionCookie(session.token, deps.config));
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
