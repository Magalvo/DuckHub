// O padrão da rota de um pathname (WI-0025, ADR 0019): o page_viewed leva
// /u/[login], nunca o login. Puro.

/** As páginas de src/app/, em padrão. Mais /other para o resto. */
export const ROUTE_TEMPLATES: readonly string[] = [
  '/',
  '/account',
  '/calculator',
  '/community',
  '/login',
  '/pond',
  '/privacy',
  '/tavern',
  '/tavern/profile',
  '/tavern/[slug]',
  '/u/[login]',
];

export const OTHER_ROUTE = '/other';

const DYNAMIC = /^\[[a-z]+\]$/;

function segments(path: string): string[] {
  return path === '/' ? [] : path.slice(1).split('/');
}

function matches(template: string, parts: readonly string[]): boolean {
  const expected = segments(template);
  return (
    expected.length === parts.length &&
    expected.every((segment, i) => {
      const part = parts[i];
      if (part === undefined) return false;
      return DYNAMIC.test(segment) ? part !== '' : segment === part;
    })
  );
}

/** "/u/pato-teste?x=1#y" → "/u/[login]"; rota desconhecida → "/other" (AC6). */
export function routeTemplate(pathname: string): string {
  const path = pathname.split(/[?#]/, 1)[0] ?? '';
  if (!path.startsWith('/')) return OTHER_ROUTE;
  // Uma barra no fim conta como sem ela; "//" não é uma página.
  const trimmed =
    path.length > 1 && path.endsWith('/') && !path.endsWith('//') ? path.slice(0, -1) : path;
  const parts = segments(trimmed);
  // Os padrões estáticos ganham aos dinâmicos: /tavern/profile antes de /tavern/[slug].
  const ordered = [...ROUTE_TEMPLATES].sort(
    (a, b) => Number(a.includes('[')) - Number(b.includes('['))
  );
  return ordered.find((template) => matches(template, parts)) ?? OTHER_ROUTE;
}
