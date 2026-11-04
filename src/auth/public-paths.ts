// Caminhos acessíveis sem sessão (WI-0004, AC1 e AC8). Tudo o resto exige
// sessão: o proxy manda para /login. Os assets ficam de fora pelo matcher.
export function isPublicPath(pathname: string): boolean {
  return (
    pathname === '/login' ||
    pathname === '/privacy' ||
    pathname === '/auth' ||
    pathname.startsWith('/auth/')
  );
}
