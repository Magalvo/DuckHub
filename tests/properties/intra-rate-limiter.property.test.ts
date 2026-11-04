// AC4 (WI-0003): para qualquer sequência de pedidos, sequenciais ou em paralelo,
// de vários clientes que partilham o mesmo limiter, nunca saem mais de 2 pedidos
// numa janela de 1 s nem 1200 numa hora. Dados todos sintéticos.
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  createIntraClient,
  createRateLimiter,
  type Clock,
  type IntraClient,
  type IntraFetch,
} from '../../src/intra/client.js';

/** Relógio virtual: o tempo só avança quando não há trabalho pendente, e salta para o próximo despertar. */
function virtualClock(): Clock {
  let t = 0;
  let scheduled = false;
  const sleepers: { wake: number; resolve: () => void }[] = [];
  const tick = (): void => {
    scheduled = false;
    if (sleepers.length === 0) return;
    t = Math.max(t, Math.min(...sleepers.map((s) => s.wake)));
    for (const s of sleepers.filter((x) => x.wake <= t)) {
      sleepers.splice(sleepers.indexOf(s), 1);
      s.resolve();
    }
    schedule();
  };
  const schedule = (): void => {
    if (!scheduled && sleepers.length > 0) {
      scheduled = true;
      setImmediate(tick);
    }
  };
  return {
    now: () => t,
    sleep: (ms) =>
      new Promise<void>((resolve) => {
        sleepers.push({ wake: t + ms, resolve });
        schedule();
      }),
  };
}

const step = fc.record({
  gapMs: fc.oneof(
    fc.constant(0),
    fc.integer({ min: 0, max: 3000 }),
    fc.integer({ min: 0, max: 4_000_000 })
  ),
  parallel: fc.integer({ min: 1, max: 40 }),
  client: fc.nat(),
  awaited: fc.boolean(),
});

const scenario = fc.record({
  clients: fc.integer({ min: 1, max: 3 }),
  // Rajada inicial: às vezes passa dos 1200 pedidos, para exercitar a janela de 1 hora.
  burst: fc.oneof(fc.constant(0), fc.integer({ min: 1150, max: 1400 })),
  steps: fc.array(step, { minLength: 1, maxLength: 60 }),
  // De quantos em quantos pedidos a API responde 429 (sem Retry-After); null = nunca.
  rateLimitedEvery: fc.option(fc.integer({ min: 2, max: 10 })),
});

describe('rate limiter partilhado (AC4)', () => {
  it('nunca mais de 2 pedidos/s nem 1200/h, para qualquer sequência', async () => {
    await fc.assert(
      fc.asyncProperty(scenario, async ({ clients, burst, steps, rateLimitedEvery }) => {
        const clock = virtualClock();
        const limiter = createRateLimiter({ clock });
        const at: number[] = [];
        const fetch: IntraFetch = () => {
          at.push(clock.now());
          const limited = rateLimitedEvery !== null && at.length % rateLimitedEvery === 0;
          return Promise.resolve(
            limited
              ? new Response('', { status: 429 })
              : new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } })
          );
        };
        const pool: IntraClient[] = Array.from({ length: clients }, (_, i) =>
          createIntraClient({ token: `TOKEN-SINTETICO-${String(i)}`, fetch, clock, limiter })
        );

        const request = (i: number): Promise<unknown> => {
          const client = pool[i % clients];
          return client === undefined
            ? Promise.reject(new Error('sem cliente'))
            : client.coalitions(90001);
        };

        const pending: Promise<unknown>[] = [
          Promise.all(Array.from({ length: burst }, (_, i) => request(i))),
        ];
        for (const s of steps) {
          if (s.gapMs > 0) await clock.sleep(s.gapMs);
          const batch = Promise.all(
            Array.from({ length: s.parallel }, (_, i) => request(s.client + i))
          );
          if (s.awaited) await batch;
          else pending.push(batch);
        }
        await Promise.all(pending);

        for (let i = 2; i < at.length; i += 1) {
          expect((at[i] ?? 0) - (at[i - 2] ?? 0)).toBeGreaterThanOrEqual(1000);
        }
        for (let i = 1200; i < at.length; i += 1) {
          expect((at[i] ?? 0) - (at[i - 1200] ?? 0)).toBeGreaterThanOrEqual(3_600_000);
        }
      }),
      { numRuns: 15 }
    );
  }, 60_000);
});
