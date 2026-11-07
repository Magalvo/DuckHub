// Vista pública do Passaporte (WI-0009, ADR 0010): para qualquer snapshot, só
// sobrevivem os projetos validados, pela mesma ordem, e nunca a data de sync.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { earnedBadges } from '../../src/badges/badges.js';
import { passportView, projectState, type PassportSnapshot } from '../../src/passport/passport.js';
import { publicPassportView } from '../../src/passport/public.js';

const project = fc.record({
  slug: fc.stringMatching(/^[a-z0-9-]{1,20}$/),
  name: fc.string({ minLength: 1, maxLength: 20 }),
  status: fc.constantFrom('finished', 'in_progress', 'waiting_for_correction', 'searching_a_group'),
  finalMark: fc.option(fc.integer({ min: 0, max: 125 })),
  validated: fc.option(fc.boolean()),
});

const snapshot: fc.Arbitrary<PassportSnapshot> = fc.record({
  login: fc.stringMatching(/^[a-z][a-z0-9-]{0,15}$/),
  campus: fc.constant('Campus Sintético'),
  piscine: fc.record({ month: fc.constant('july'), year: fc.integer({ min: 2013, max: 2030 }) }),
  isAlumni: fc.boolean(),
  coalition: fc.option(fc.record({ name: fc.constant('Os Patos'), color: fc.constant('#0E12B5') })),
  cursus: fc.array(
    fc.record({
      slug: fc.constantFrom('42cursus', 'c-piscine'),
      name: fc.constant('Cursus'),
      level: fc.double({ min: 0, max: 30, noNaN: true }),
    }),
    { maxLength: 2 }
  ),
  projects: fc.array(project, { maxLength: 12 }),
});

const syncedAt = fc.integer({ min: 0, max: 4_000_000_000_000 });

describe('publicPassportView', () => {
  it('fica só com os projetos validados, pela mesma ordem e com a nota', () => {
    fc.assert(
      fc.property(snapshot, syncedAt, (s, at) => {
        const own = passportView(s, at);
        expect(publicPassportView(own).projects).toEqual(
          own.projects.filter((p) => p.state === 'done')
        );
      })
    );
  });

  it('nunca leva a data da sincronização', () => {
    fc.assert(
      fc.property(snapshot, syncedAt, (s, at) => {
        expect(publicPassportView(passportView(s, at))).not.toHaveProperty('syncedAt');
      })
    );
  });

  it('as badges da vista pública são as da vista do próprio (WI-0011)', () => {
    fc.assert(
      fc.property(snapshot, syncedAt, (s, at) => {
        const own = passportView(s, at);
        expect(publicPassportView(own).badges).toEqual(own.badges);
      })
    );
  });
});

describe('earnedBadges (WI-0011, AC4)', () => {
  it('acrescentar ou tirar projetos falhados ou em curso nunca muda as badges', () => {
    const notDone = project.filter((p) => projectState(p) !== 'done');
    fc.assert(
      fc.property(snapshot, fc.array(notDone, { maxLength: 6 }), fc.nat(), (s, extra, seed) => {
        const kept = s.projects.filter((p) => projectState(p) === 'done');
        const withExtra = [...s.projects];
        for (const [i, p] of extra.entries()) {
          withExtra.splice((seed + i) % (withExtra.length + 1), 0, p);
        }
        const base = earnedBadges(s);
        expect(earnedBadges({ ...s, projects: kept })).toEqual(base);
        expect(earnedBadges({ ...s, projects: withExtra })).toEqual(base);
      })
    );
  });
});
