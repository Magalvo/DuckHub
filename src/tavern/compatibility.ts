// Compatibilidade entre duas pessoas para fazerem um projeto juntas (WI-0014,
// ADR 0015). Função pura sobre dois perfis de trabalho: não sabe de onde vêm
// os dados (questionário hoje, presença talvez amanhã).
//
// A conta é feita em inteiros: todas as semelhanças são múltiplos de 1/12
// (os denominadores possíveis são 1, 2, 3 e 4), por isso cada semelhança é
// guardada em doze avos e o arredondamento final é uma divisão inteira. Assim
// a simetria e o meio (.5 para cima) não dependem de erros de vírgula
// flutuante.

export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

type Start = 'this-week' | 'two-weeks' | 'no-rush';
type GradeGoal = 'pass' | 'bonus' | 'max';
type Pace = 'sprint' | 'steady' | 'relaxed';
type Style = 'pair' | 'split' | 'mixed';
type Setting = 'on-site' | 'hybrid' | 'remote';
type Role = 'lead' | 'follow' | 'either';

/** Perfil de trabalho. Campo ausente = sem resposta. */
export interface WorkProfile {
  login: string;
  /** Vazio = sem resposta. Repetidos contam uma vez. */
  periods?: readonly DayPeriod[];
  start?: Start;
  gradeGoal?: GradeGoal;
  pace?: Pace;
  style?: Style;
  setting?: Setting;
  role?: Role;
}

export type ReasonId =
  | 'shared-hours'
  | 'same-start'
  | 'same-grade-goal'
  | 'same-pace'
  | 'same-style'
  | 'same-setting'
  | 'complementary-roles';

export interface Compatibility {
  /** Inteiro em [0,100]. */
  score: number;
  /** Pela ordem da tabela, sem repetidos. */
  reasons: readonly ReasonId[];
}

export interface RankedCandidate {
  login: string;
  compatibility: Compatibility;
}

/** Semelhança em doze avos (0..12). */
const TWELFTHS = 12;

/** Resultado de comparar uma dimensão respondida pelas duas pessoas. */
interface Match {
  twelfths: number;
  reason: boolean;
}

interface Dimension {
  points: number;
  reason: ReasonId;
  /** undefined quando alguma das duas pessoas não respondeu. */
  compare: (a: WorkProfile, b: WorkProfile) => Match | undefined;
}

/** Igual 1, vizinho ½, extremos 0. Razão quando é igual. */
function ordinal<T>(order: readonly T[], x: T, y: T): Match {
  const distance = Math.abs(order.indexOf(x) - order.indexOf(y));
  const twelfths = distance === 0 ? TWELFTHS : distance === 1 ? TWELFTHS / 2 : 0;
  return { twelfths, reason: distance === 0 };
}

/** Igual 1; o valor do meio com outro ½; os dois extremos 0. Razão quando é igual. */
function withMiddle<T>(middle: T, x: T, y: T): Match {
  if (x === y) return { twelfths: TWELFTHS, reason: true };
  if (x === middle || y === middle) return { twelfths: TWELFTHS / 2, reason: false };
  return { twelfths: 0, reason: false };
}

/** Complemento: liderar com seguir 1; `either` com qualquer ½; iguais 0. */
function roles(x: Role, y: Role): Match {
  if (x === 'either' || y === 'either') return { twelfths: TWELFTHS / 2, reason: false };
  if (x !== y) return { twelfths: TWELFTHS, reason: true };
  return { twelfths: 0, reason: false };
}

/** Sobreposição |A∩B| / min(|A|,|B|), sem repetidos. */
function periods(x: readonly DayPeriod[], y: readonly DayPeriod[]): Match | undefined {
  const a = new Set(x);
  const b = new Set(y);
  if (a.size === 0 || b.size === 0) return undefined;
  let shared = 0;
  for (const p of a) if (b.has(p)) shared++;
  const smaller = Math.min(a.size, b.size);
  return { twelfths: (shared * TWELFTHS) / smaller, reason: shared > 0 };
}

/** `undefined` se alguma das duas não respondeu; senão, a comparação. */
function both<T>(
  x: T | undefined,
  y: T | undefined,
  cmp: (x: T, y: T) => Match
): Match | undefined {
  return x === undefined || y === undefined ? undefined : cmp(x, y);
}

// A ordem da tabela da spec: é a ordem da soma e a ordem das razões.
const DIMENSIONS: readonly Dimension[] = [
  {
    points: 25,
    reason: 'shared-hours',
    compare: (a, b) =>
      a.periods === undefined || b.periods === undefined
        ? undefined
        : periods(a.periods, b.periods),
  },
  {
    points: 20,
    reason: 'same-start',
    compare: (a, b) =>
      both(a.start, b.start, (x, y) => ordinal(['this-week', 'two-weeks', 'no-rush'], x, y)),
  },
  {
    points: 20,
    reason: 'same-grade-goal',
    compare: (a, b) =>
      both(a.gradeGoal, b.gradeGoal, (x, y) => ordinal(['pass', 'bonus', 'max'], x, y)),
  },
  {
    points: 10,
    reason: 'same-pace',
    compare: (a, b) =>
      both(a.pace, b.pace, (x, y) => ordinal(['sprint', 'steady', 'relaxed'], x, y)),
  },
  {
    points: 10,
    reason: 'same-style',
    compare: (a, b) => both(a.style, b.style, (x, y) => withMiddle('mixed', x, y)),
  },
  {
    points: 10,
    reason: 'same-setting',
    compare: (a, b) => both(a.setting, b.setting, (x, y) => withMiddle('hybrid', x, y)),
  },
  {
    points: 5,
    reason: 'complementary-roles',
    compare: (a, b) => both(a.role, b.role, roles),
  },
];

export function compatibility(a: WorkProfile, b: WorkProfile): Compatibility {
  let points = 0; // Σ pontos das dimensões respondidas pelas duas
  let weighted = 0; // Σ pontos · semelhança em doze avos
  const reasons: ReasonId[] = [];
  for (const dim of DIMENSIONS) {
    const match = dim.compare(a, b);
    if (match === undefined) continue;
    points += dim.points;
    weighted += dim.points * match.twelfths;
    if (match.reason) reasons.push(dim.reason);
  }
  if (points === 0) return { score: 0, reasons: [] };
  // round(100 · weighted / (12 · points)), com o meio para cima, em inteiros:
  // floor((2 · 100 · weighted + d) / (2 · d)), com d = 12 · points.
  const d = TWELFTHS * points;
  const score = Math.floor((200 * weighted + d) / (2 * d));
  return { score, reasons };
}

/**
 * Candidatos ordenados por pontuação decrescente e login crescente (code
 * units, sem locale). Exclui quem tem o login de `me`. Pré-condição: os
 * logins dos candidatos são únicos.
 */
export function rankCandidates(
  me: WorkProfile,
  candidates: readonly WorkProfile[]
): RankedCandidate[] {
  return candidates
    .filter((c) => c.login !== me.login)
    .map((c) => ({ login: c.login, compatibility: compatibility(me, c) }))
    .sort((x, y) => {
      if (x.compatibility.score !== y.compatibility.score) {
        return y.compatibility.score - x.compatibility.score;
      }
      if (x.login === y.login) return 0;
      return x.login < y.login ? -1 : 1;
    });
}
