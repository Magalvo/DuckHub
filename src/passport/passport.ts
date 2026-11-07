// Passaporte (WI-0005, ADR 0008): funções puras e determinísticas sobre os
// dados da API (regra 11). buildSnapshot decide o que se guarda; passportView
// decide o que a página mostra. Nada de presença no campus, logtime nem
// blackholed_at (regra 9, AC8).
import { earnedBadges, type Badge } from '../badges/badges';
import type { Coalition, Profile, ProjectUser } from '../intra/client';
import { avatarColors, initialsFromLogin } from './avatar';
import { formatLevel, projectState, type ProjectState } from './rules';

export { formatLevel, projectState, shownLevel, type ProjectState } from './rules';

export const DEFAULT_ACCENT = '#00BABC'; // Cyber-Teal (AC4)

/** O que se guarda em passports.snapshot (JSONB). */
// A foto da 42 não se guarda nem se mostra (WI-0008): a CDN responde 403.
export interface PassportSnapshot {
  login: string;
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

/** O que a página mostra. */
export interface PassportView {
  login: string;
  initials: string; // do login, no avatar (WI-0008)
  avatarText: '#000000' | '#FFFFFF'; // a de mais contraste com accentColor
  campus: string;
  piscine: { month: string; year: number };
  isAlumni: boolean;
  coalitionName: string | null;
  accentColor: string; // cor da coalition ou DEFAULT_ACCENT
  reduced: boolean; // sem 42cursus (AC3)
  mainCursus: { name: string; level: string } | null; // level: "5.17"
  projects: { slug: string; name: string; state: ProjectState; finalMark: number | null }[];
  badges: Badge[]; // WI-0011: as conquistadas, pela ordem do catálogo
  syncedAt: string; // "AAAA-MM-DD HH:mm", Europe/Lisbon
}

// Slugs confirmados com uma chamada real (2026-11-05): 42cursus (id 21) e
// c-piscine (id 9). Há mais de 20 cursus com "piscine" no slug e um
// "42cursus-warmup-sp", por isso o 42cursus compara-se por igualdade exata.
const MAIN_CURSUS = '42cursus';
const PISCINE_CURSUS = 'c-piscine';
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
  const shown =
    main ??
    snapshot.cursus.find((c) => c.slug === PISCINE_CURSUS) ??
    snapshot.cursus.find((c) => c.slug.includes('piscine'));
  const accentColor = snapshot.coalition?.color ?? DEFAULT_ACCENT;
  return {
    login: snapshot.login,
    initials: initialsFromLogin(snapshot.login),
    avatarText: avatarColors(accentColor).text,
    campus: snapshot.campus,
    piscine: snapshot.piscine,
    isAlumni: snapshot.isAlumni,
    coalitionName: snapshot.coalition?.name ?? null,
    accentColor,
    reduced: main === undefined,
    mainCursus: shown === undefined ? null : { name: shown.name, level: formatLevel(shown.level) },
    projects: snapshot.projects.map((p) => ({
      slug: p.slug,
      name: p.name,
      state: projectState(p),
      finalMark: p.finalMark,
    })),
    badges: earnedBadges(snapshot),
    syncedAt: formatSyncedAt(syncedAt),
  };
}
