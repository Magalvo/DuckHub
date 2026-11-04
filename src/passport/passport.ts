// Passaporte (WI-0005, ADR 0008): funções puras e determinísticas sobre os
// dados da API (regra 11). buildSnapshot decide o que se guarda; passportView
// decide o que a página mostra. Nada de presença no campus, logtime nem
// blackholed_at (regra 9, AC8).
import type { Coalition, Profile, ProjectUser } from '../intra/client';

export const DEFAULT_ACCENT = '#00BABC'; // Cyber-Teal (AC4)

/** O que se guarda em passports.snapshot (JSONB). */
export interface PassportSnapshot {
  login: string;
  imageUrl: string | null;
  campus: string;
  piscine: { month: string; year: number };
  isAlumni: boolean;
  coalition: { name: string; color: string } | null;
  cursus: { slug: string; name: string; level: number }[];
  projects: {
    slug: string;
    name: string;
    status: string;
    finalMark: number | null;
    validated: boolean | null;
  }[];
}

export type ProjectState = 'done' | 'failed' | 'in-progress';

/** O que a página mostra. */
export interface PassportView {
  login: string;
  imageUrl: string | null;
  campus: string;
  piscine: { month: string; year: number };
  isAlumni: boolean;
  coalitionName: string | null;
  accentColor: string; // cor da coalition ou DEFAULT_ACCENT
  reduced: boolean; // sem 42cursus (AC3)
  mainCursus: { name: string; level: string } | null; // level: "5.17"
  projects: { slug: string; name: string; state: ProjectState; finalMark: number | null }[];
  syncedAt: string; // "AAAA-MM-DD HH:mm", Europe/Lisbon
}

const MAIN_CURSUS = '42cursus';
const TIME_ZONE = 'Europe/Lisbon';

export function buildSnapshot(
  profile: Profile,
  coalitions: Coalition[],
  projects: ProjectUser[]
): PassportSnapshot {
  // Com várias coalitions, vale a primeira que a API devolve (ADR 0008).
  const [coalition] = coalitions;
  return {
    login: profile.login,
    imageUrl: profile.imageUrl,
    campus: profile.primaryCampus.name,
    piscine: { month: profile.piscine.month, year: profile.piscine.year },
    isAlumni: profile.isAlumni,
    coalition: coalition === undefined ? null : { name: coalition.name, color: coalition.color },
    cursus: profile.cursus.map(({ slug, name, level }) => ({ slug, name, level })),
    projects: projects.map(({ slug, name, status, finalMark, validated }) => ({
      slug,
      name,
      status,
      finalMark,
      validated,
    })),
  };
}

/**
 * Nível com duas casas, truncado: nunca mostra um nível que ainda não se
 * atingiu. `Math.floor(x * 100)` falharia com floats (0.29 * 100 = 28.99…):
 * arredonda-se primeiro a 6 casas, muito abaixo da precisão da API, e corta-se
 * a string.
 */
export function formatLevel(level: number): string {
  const [int = '0', frac = ''] = level.toFixed(6).split('.');
  return `${int}.${frac.slice(0, 2)}`;
}

export function projectState(p: { status: string; validated: boolean | null }): ProjectState {
  if (p.status !== 'finished') return 'in-progress';
  if (p.validated === true) return 'done';
  if (p.validated === false) return 'failed';
  return 'in-progress';
}

const lisbon = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** "AAAA-MM-DD HH:mm" na hora de Lisboa (AC6). */
export function formatSyncedAt(at: number): string {
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    lisbon.formatToParts(at).find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')} ${part('hour')}:${part('minute')}`;
}

export function passportView(snapshot: PassportSnapshot, syncedAt: number): PassportView {
  const main = snapshot.cursus.find((c) => c.slug === MAIN_CURSUS);
  const shown = main ?? snapshot.cursus.find((c) => c.slug.includes('piscine'));
  return {
    login: snapshot.login,
    imageUrl: snapshot.imageUrl,
    campus: snapshot.campus,
    piscine: snapshot.piscine,
    isAlumni: snapshot.isAlumni,
    coalitionName: snapshot.coalition?.name ?? null,
    accentColor: snapshot.coalition?.color ?? DEFAULT_ACCENT,
    reduced: main === undefined,
    mainCursus: shown === undefined ? null : { name: shown.name, level: formatLevel(shown.level) },
    projects: snapshot.projects.map((p) => ({
      slug: p.slug,
      name: p.name,
      state: projectState(p),
      finalMark: p.finalMark,
    })),
    syncedAt: formatSyncedAt(syncedAt),
  };
}
