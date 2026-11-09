// Skills do Passaporte (WI-0019): funções puras sobre as skills que a API dá
// (regra 11). shownSkills escolhe o cursus e ordena; radarPoints é a geometria
// do radar, que é só decoração: a informação está na lista (regra 12).
import type { Skill } from '../intra/client';
import type { PassportSnapshot } from './passport';

export type { Skill } from '../intra/client';

export const SKILL_SCALE_MAX = 20;
export const RADAR_MIN_AXES = 3;

// Os mesmos slugs do Passaporte (passport.ts), por igualdade exata.
export const SKILLS_CURSUS = ['42cursus', 'c-piscine'] as const;

export interface RadarPoint {
  x: number;
  y: number;
}

/**
 * As skills que o Passaporte mostra: as do 42cursus se existir (mesmo sem
 * nenhuma acima de 0: não se recorre à Piscine), senão as da c-piscine. Só
 * níveis acima de 0, por nível descendente e depois nome em code units (sem
 * locale). Sem nenhuma, null.
 */
export function shownSkills(
  cursus: PassportSnapshot['cursus']
): { cursus: string; skills: Skill[] } | null {
  const chosen =
    cursus.find((c) => c.slug === SKILLS_CURSUS[0]) ??
    cursus.find((c) => c.slug === SKILLS_CURSUS[1]);
  if (chosen === undefined) return null;
  const skills = (chosen.skills ?? [])
    .filter((s) => s.level > 0)
    .map(({ name, level }) => ({ name, level }))
    .sort((a, b) => {
      if (a.level !== b.level) return b.level - a.level;
      if (a.name === b.name) return 0;
      return a.name < b.name ? -1 : 1;
    });
  return skills.length === 0 ? null : { cursus: chosen.name, skills };
}

/**
 * Um ponto por nível, em coordenadas de SVG: origem no centro, y para baixo.
 * O eixo 0 aponta para cima e os outros rodam no sentido dos ponteiros do
 * relógio, a passos iguais. Escala fixa de 0 a 20: acima de 20, o ponto fica
 * no limite (raio = radius). Com menos de 3 níveis não há radar.
 */
export function radarPoints(levels: readonly number[], radius: number): RadarPoint[] | null {
  if (levels.length < RADAR_MIN_AXES) return null;
  const n = levels.length;
  return levels.map((level, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const r = (radius * Math.min(level, SKILL_SCALE_MAX)) / SKILL_SCALE_MAX;
    return { x: r * Math.cos(angle), y: r * Math.sin(angle) };
  });
}
