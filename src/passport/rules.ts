// Regras partilhadas pelo Passaporte (WI-0005) e pelas badges (WI-0011, ADR
// 0011): o estado de um projeto e o nível que se mostra. Num módulo à parte
// para as badges as usarem sem um ciclo de imports com passport.ts.

export type ProjectState = 'done' | 'failed' | 'in-progress';

export function projectState(p: { status: string; validated: boolean | null }): ProjectState {
  if (p.status !== 'finished') return 'in-progress';
  if (p.validated === true) return 'done';
  if (p.validated === false) return 'failed';
  return 'in-progress';
}

/**
 * O nível que o Passaporte mostra, como número: duas casas, truncado, nunca um
 * nível que ainda não se atingiu. `Math.floor(x * 100)` falharia com floats
 * (0.29 * 100 = 28.99…): arredonda-se primeiro a 6 casas, muito abaixo da
 * precisão da API, e corta-se a string. As badges de nível usam este número,
 * para nunca discordarem do que se vê (ADR 0011).
 */
export function shownLevel(level: number): number {
  const [int = '0', frac = ''] = level.toFixed(6).split('.');
  return Number(`${int}.${frac.slice(0, 2)}`);
}

/** O nível mostrado, como texto: "5.17", "10.00". */
export function formatLevel(level: number): string {
  return shownLevel(level).toFixed(2);
}
