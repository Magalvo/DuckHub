// Calculadora de XP (WI-0007, ADR 0009): funções puras e determinísticas sobre
// o XP que vem da API (regra 11). Sem bónus de coalition e sem estimativa de
// nível: não há fonte oficial para a tabela de níveis.

/** A nota máxima de um projeto com bónus. */
export const MAX_MARK = 125;

/** floor(projectXp × mark / 100). */
export function xpGained(projectXp: number, mark: number): number {
  return Math.floor((projectXp * mark) / 100);
}

export type MarkResult =
  { ok: true; mark: number } | { ok: false; error: 'not-integer' | 'out-of-range' };

/** Lê a nota do formulário: inteiro de 0 a MAX_MARK, com espaços à volta aceites. */
export function parseMark(input: string): MarkResult {
  const value = input.trim();
  // Só dígitos ASCII, com sinal opcional: "1e2", "99.5", "+5" e "10O" ficam de fora.
  if (!/^-?\d+$/.test(value)) return { ok: false, error: 'not-integer' };
  const mark = Number(value);
  if (mark < 0 || mark > MAX_MARK) return { ok: false, error: 'out-of-range' };
  // "-0" é zero.
  return { ok: true, mark: mark === 0 ? 0 : mark };
}
