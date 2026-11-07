// tests/acceptance/wi-0015-questionario.acceptance.test.ts
//
// Rascunho preparado pelo Claude a pedido do humano, com as decisões do humano
// de 2026-11-07 (opção "Prefer not to say" em cada pergunta de escolha única,
// guardar tudo vazio apaga o perfil, qualquer pessoa com sessão responde).
// Revê antes do commit: depois de entrar, isto é o contrato. O schema do
// formulário, o store sobre uma BD real (PGlite com as migrações) e as
// mensagens; o resto está em e2e/wi-0015.e2e.ts. Dados inventados.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import fc from 'fast-check';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { en } from '../../src/i18n/messages/en.js';
import { answersFromForm, type WorkAnswers } from '../../src/tavern/profile.js';
import { createDrizzleWorkProfileStore, type WorkProfileStore } from '../../src/tavern/store.js';

// As opções de cada pergunta, pela ordem do questionário (as do WI-0014).
const OPTIONS = {
  periods: ['morning', 'afternoon', 'evening', 'night'],
  start: ['this-week', 'two-weeks', 'no-rush'],
  gradeGoal: ['pass', 'bonus', 'max'],
  pace: ['sprint', 'steady', 'relaxed'],
  style: ['pair', 'split', 'mixed'],
  setting: ['on-site', 'hybrid', 'remote'],
  role: ['lead', 'follow', 'either'],
} as const;
const SINGLE = ['start', 'gradeGoal', 'pace', 'style', 'setting', 'role'] as const;

const form = (entries: readonly (readonly [string, string])[]): FormData => {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
};

const FULL: WorkAnswers = {
  periods: ['evening', 'night'],
  start: 'this-week',
  gradeGoal: 'max',
  pace: 'steady',
  style: 'pair',
  setting: 'hybrid',
  role: 'either',
};

/** Como o browser envia as respostas: checkboxes repetidas, um campo por rádio. */
const toEntries = (a: WorkAnswers): [string, string][] => [
  ...(a.periods ?? []).map((p): [string, string] => ['periods', p]),
  ...SINGLE.flatMap((key): [string, string][] => {
    const value = a[key];
    return value === undefined ? [] : [[key, value]];
  }),
];

const answersArb: fc.Arbitrary<WorkAnswers> = fc.record(
  {
    periods: fc.subarray([...OPTIONS.periods], { minLength: 1 }),
    start: fc.constantFrom(...OPTIONS.start),
    gradeGoal: fc.constantFrom(...OPTIONS.gradeGoal),
    pace: fc.constantFrom(...OPTIONS.pace),
    style: fc.constantFrom(...OPTIONS.style),
    setting: fc.constantFrom(...OPTIONS.setting),
    role: fc.constantFrom(...OPTIONS.role),
  },
  { requiredKeys: [] }
);

describe('WI-0015 — respostas do formulário', () => {
  it('AC1/AC3: todas as perguntas são opcionais; sem respostas dá um perfil vazio', () => {
    expect(answersFromForm(form([]))).toEqual({});
    // "Prefer not to say" envia o campo vazio.
    expect(answersFromForm(form(SINGLE.map((key) => [key, ''])))).toEqual({});
  });

  it('AC3: um formulário completo dá o perfil do WI-0014', () => {
    expect(answersFromForm(form(toEntries(FULL)))).toEqual(FULL);
  });

  it('AC3: os períodos repetidos contam uma vez e ficam pela ordem do dia', () => {
    const got = answersFromForm(
      form([
        ['periods', 'night'],
        ['periods', 'morning'],
        ['periods', 'night'],
      ])
    );
    expect(got).toEqual({ periods: ['morning', 'night'] });
  });

  it('AC3: campos que não são perguntas (como o botão) não entram no perfil', () => {
    expect(
      answersFromForm(
        form([
          ['intent', 'save'],
          ['pace', 'sprint'],
        ])
      )
    ).toEqual({ pace: 'sprint' });
  });

  it.each([
    ['um valor fora das opções', [['pace', 'fast']]],
    ['um período desconhecido', [['periods', 'noon']]],
    ['um período vazio', [['periods', '']]],
    [
      'a mesma pergunta duas vezes',
      [
        ['start', 'this-week'],
        ['start', 'this-week'],
      ],
    ],
    ['uma maiúscula', [['role', 'Lead']]],
    ['espaços à volta', [['style', ' pair ']]],
  ] as const)('AC3: rejeita %s', (_case, entries) => {
    expect(answersFromForm(form(entries))).toBeNull();
  });

  it('AC3: rejeita um ficheiro em vez de texto', () => {
    const data = new FormData();
    data.append('pace', new Blob(['sprint']), 'pace.txt');
    expect(answersFromForm(data)).toBeNull();
  });

  it('AC3: o que o browser envia volta a dar as mesmas respostas, em qualquer ordem', () => {
    fc.assert(
      fc.property(answersArb, fc.func(fc.integer()), (answers, key) => {
        const entries = toEntries(answers);
        const shuffled = [...entries].sort((x, y) => key(x.join('=')) - key(y.join('=')));
        const expected: WorkAnswers = { ...answers };
        if (answers.periods !== undefined) {
          expected.periods = OPTIONS.periods.filter((p) => answers.periods?.includes(p));
        }
        expect(answersFromForm(form(shuffled))).toEqual(expected);
      })
    );
  });
});

describe('WI-0015 — textos do questionário', () => {
  it('AC1: uma pergunta por dimensão do WI-0014, com as opções do WI-0014', () => {
    const { questions } = en.tavern.profile;
    expect(Object.keys(questions)).toEqual(Object.keys(OPTIONS));
    for (const [key, values] of Object.entries(OPTIONS)) {
      const question: { label: string; options: Record<string, string> } =
        questions[key as keyof typeof questions];
      expect(question.label.trim()).not.toBe('');
      expect(Object.keys(question.options)).toEqual(values);
      for (const text of Object.values(question.options)) expect(text.trim()).not.toBe('');
    }
  });

  it('AC1/AC5: os rótulos das opções de cada pergunta são únicos, e diferentes de "não responder"', () => {
    const { questions, skip } = en.tavern.profile;
    for (const question of Object.values(questions)) {
      const labels: string[] = Object.values(question.options);
      expect(new Set(labels).size).toBe(labels.length);
      expect(labels).not.toContain(skip);
    }
  });

  it('AC2: a página de privacidade diz que se guarda o perfil de trabalho', () => {
    expect(en.privacy.items.some((item) => /work profile/i.test(item.data))).toBe(true);
  });
});

// ---------- Store sobre a BD real ----------

let client: PGlite;
let store: WorkProfileStore;

beforeAll(async () => {
  client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: 'drizzle' });
  store = createDrizzleWorkProfileStore(db);
}, 30_000);

afterAll(async () => {
  await client.close();
});

beforeEach(async () => {
  await client.query('DELETE FROM users');
});

let nextIntraId = 1;
async function user(login: string): Promise<string> {
  nextIntraId += 1;
  const { rows } = await client.query<{ id: string }>(
    'INSERT INTO users (intra_id, login, campus_id) VALUES ($1, $2, 9001) RETURNING id',
    [nextIntraId, login]
  );
  const row = rows[0];
  if (row === undefined) throw new Error('insert sem id');
  return row.id;
}

const profileRows = async (): Promise<number> => {
  const { rows } = await client.query<{ n: number }>(
    'SELECT count(*)::int AS n FROM work_profiles'
  );
  return rows[0]?.n ?? -1;
};

describe('WI-0015 — perfil de trabalho guardado', () => {
  it('AC2: sem respostas guardadas não há perfil', async () => {
    const id = await user('pato-teste');
    expect(await store.get(id)).toBeNull();
  });

  it('AC2: guardar e ler devolve as mesmas respostas', async () => {
    const id = await user('pato-teste');
    await store.save(id, FULL);
    expect(await store.get(id)).toEqual(FULL);
  });

  it('AC2: guardar outra vez substitui tudo, incluindo o que ficou sem resposta', async () => {
    const id = await user('pato-teste');
    await store.save(id, FULL);
    await store.save(id, { pace: 'relaxed' });
    expect(await store.get(id)).toEqual({ pace: 'relaxed' });
    expect(await profileRows()).toBe(1);
  });

  it('AC2: guardar tudo vazio apaga o perfil', async () => {
    const id = await user('pato-teste');
    await store.save(id, FULL);
    await store.save(id, {});
    expect(await store.get(id)).toBeNull();
    expect(await profileRows()).toBe(0);
  });

  it('AC2: apagar remove o perfil e não falha se já não existir', async () => {
    const id = await user('pato-teste');
    await store.save(id, FULL);
    await store.delete(id);
    expect(await store.get(id)).toBeNull();
    await store.delete(id);
    expect(await profileRows()).toBe(0);
  });

  it('AC2: cada pessoa tem o seu perfil', async () => {
    const pato = await user('pato-teste');
    const cisne = await user('cisne-teste');
    await store.save(pato, FULL);
    await store.save(cisne, { role: 'lead' });
    await store.delete(pato);
    expect(await store.get(cisne)).toEqual({ role: 'lead' });
  });

  it('AC2: apagar a conta apaga o perfil de trabalho', async () => {
    const id = await user('pato-teste');
    await store.save(id, FULL);
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    expect(await profileRows()).toBe(0);
  });

  it('AC2: o que se guarda volta igual, para quaisquer respostas', async () => {
    const id = await user('pato-teste');
    await fc.assert(
      fc.asyncProperty(answersArb, async (answers) => {
        await store.save(id, answers);
        const got = await store.get(id);
        if (Object.keys(answers).length === 0) {
          expect(got).toBeNull();
          return;
        }
        const expected: WorkAnswers = { ...answers };
        if (answers.periods !== undefined) {
          expected.periods = OPTIONS.periods.filter((p) => answers.periods?.includes(p));
        }
        expect(got).toEqual(expected);
      }),
      { numRuns: 40 }
    );
  });
});
