// O soloFor (WI-0022, ADR 0016) nunca usa uma session de outro cursus: o
// resultado vem de uma session aplicável (mesmo campus e cursus, ou sem campus
// do mesmo cursus ou sem cursus) ou é true; e juntar sessions de outro cursus,
// em qualquer posição, nunca o muda. Dados inventados.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { soloFor, type projectSchema } from '../../src/intra/schemas.js';
import type { z } from 'zod';

type Session = z.infer<typeof projectSchema>['project_sessions'][number];

const CTX = { campusId: 38, cursusId: 21 };
const OTHER_CURSUS = 9;

const session = (cursus: fc.Arbitrary<number | null>): fc.Arbitrary<Session> =>
  fc.record({
    campus_id: fc.constantFrom(38, 39, null),
    cursus_id: cursus,
    difficulty: fc.constant(null),
    solo: fc.constantFrom(true, false, null, undefined),
  });

const anySession = session(fc.constantFrom(CTX.cursusId, OTHER_CURSUS, null));
const otherCursus = session(fc.constant(OTHER_CURSUS));

const project = (sessions: Session[]) => ({ difficulty: 0, project_sessions: sessions });

/** As sessions que o soloFor pode usar. */
const applicable = (s: Session): boolean =>
  (s.campus_id === CTX.campusId && s.cursus_id === CTX.cursusId) ||
  (s.campus_id === null && (s.cursus_id === CTX.cursusId || s.cursus_id === null));

describe('soloFor', () => {
  it('o resultado é o de uma session aplicável, ou true sem nenhuma', () => {
    fc.assert(
      fc.property(fc.array(anySession, { maxLength: 8 }), (sessions) => {
        const allowed = sessions.filter(applicable).map((s) => s.solo ?? true);
        const result = soloFor(project(sessions), CTX);
        if (allowed.length === 0) expect(result).toBe(true);
        else expect(allowed).toContain(result);
      })
    );
  });

  it('sessions de outro cursus, em qualquer posição, não mudam o resultado', () => {
    fc.assert(
      fc.property(
        fc.array(anySession, { maxLength: 8 }),
        fc.array(fc.tuple(fc.nat(), otherCursus), { maxLength: 6 }),
        (sessions, extras) => {
          const mixed = [...sessions];
          for (const [pos, extra] of extras) mixed.splice(pos % (mixed.length + 1), 0, extra);
          expect(soloFor(project(mixed), CTX)).toBe(soloFor(project(sessions), CTX));
        }
      )
    );
  });
});
