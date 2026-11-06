// Vista pública do Passaporte (WI-0009, ADR 0010): para qualquer snapshot, só
// sobrevivem os projetos validados, pela mesma ordem, e nunca a data de sync.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { passportView, type PassportSnapshot } from '../../src/passport/passport.js';
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
  cursus: fc.constant([{ slug: '42cursus', name: '42cursus', level: 4.2 }]),
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
});
