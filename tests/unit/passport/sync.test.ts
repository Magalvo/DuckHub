// Para lá do contrato: o teto da sincronização (ADR 0008) e uma BD que falha.
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Profile } from '../../../src/intra/client.js';
import { createPassportSync, withDeadline } from '../../../src/passport/sync.js';

const profile: Profile = {
  id: 90001,
  login: 'pato-teste',
  imageUrl: null,
  primaryCampus: { id: 9001, name: 'Campus Sintético' },
  piscine: { month: 'september', year: 2023 },
  isAlumni: false,
  cursus: [],
};
const input = { accessToken: 'token-sintetico', userId: 'user-1', profile };

afterEach(() => {
  vi.useRealTimers();
});

describe('withDeadline', () => {
  it('passado o teto, resolve sem esperar pela sincronização', async () => {
    vi.useFakeTimers();
    let finished = false;
    const slow = () =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          finished = true;
          resolve();
        }, 30_000);
      });
    const done = withDeadline(slow, 10_000)(input);
    await vi.advanceTimersByTimeAsync(10_000);
    await expect(done).resolves.toBeUndefined();
    expect(finished).toBe(false);
    // A sincronização continua em segundo plano.
    await vi.advanceTimersByTimeAsync(20_000);
    expect(finished).toBe(true);
  });

  it('dentro do teto, espera pela sincronização', async () => {
    const order: string[] = [];
    const quick = () => {
      order.push('sync');
      return Promise.resolve();
    };
    await withDeadline(quick, 10_000)(input);
    expect(order).toEqual(['sync']);
  });
});

describe('createPassportSync', () => {
  it('nunca lança, mesmo que a BD falhe', async () => {
    const sync = createPassportSync({
      client: () => ({
        coalitions: () => Promise.resolve({ ok: true, value: [] }),
        projectsUsers: () => Promise.resolve({ ok: true, value: [] }),
      }),
      store: {
        save: () => Promise.reject(new Error('BD em baixo')),
        load: () => Promise.resolve(null),
      },
      clock: { now: () => 0 },
    });
    await expect(sync(input)).resolves.toBeUndefined();
  });

  it('pede os dados do utilizador pelo ID da 42', async () => {
    const asked: number[] = [];
    const sync = createPassportSync({
      client: () => ({
        coalitions: (id) => {
          asked.push(id);
          return Promise.resolve({ ok: true, value: [] });
        },
        projectsUsers: (id) => {
          asked.push(id);
          return Promise.resolve({ ok: true, value: [] });
        },
      }),
      store: { save: () => Promise.resolve(), load: () => Promise.resolve(null) },
      clock: { now: () => 0 },
    });
    await sync(input);
    expect(asked).toEqual([90001, 90001]);
  });
});
