// Rate limiter da aplicação para a API da 42 (AC4): 2 pedidos/s e 1200/h.
// O limite é por aplicação: um só limiter partilhado por todos os clientes.

export interface Clock {
  now(): number; // ms
  sleep(ms: number): Promise<void>;
}

export interface RateLimiter {
  /** Resolve quando o pedido pode sair; a saída fica registada nesse instante. */
  acquire(): Promise<void>;
  /** Suspende todos os pedidos durante `ms` (p. ex. depois de um 429). */
  pause(ms: number): void;
}

const WINDOWS = [
  { size: 1000, max: 2 },
  { size: 3_600_000, max: 1200 },
] as const;
const KEEP = Math.max(...WINDOWS.map((w) => w.max));

export function createRateLimiter(deps: { clock: Clock }): RateLimiter {
  const { clock } = deps;
  // Instantes das últimas saídas, por ordem crescente.
  const sent: number[] = [];
  let pausedUntil = 0;

  const earliest = (): number =>
    WINDOWS.reduce((at, w) => {
      const oldest = sent[sent.length - w.max];
      return oldest === undefined ? at : Math.max(at, oldest + w.size);
    }, pausedUntil);

  return {
    async acquire() {
      // Sem reserva: quem acorda volta a verificar, porque entretanto outro
      // pedido pode ter saído ou o limiter pode ter sido pausado.
      for (;;) {
        const now = clock.now();
        const at = earliest();
        if (at <= now) {
          sent.push(now);
          if (sent.length > KEEP) sent.splice(0, sent.length - KEEP);
          return;
        }
        await clock.sleep(at - now);
      }
    },
    pause(ms) {
      pausedUntil = Math.max(pausedUntil, clock.now() + ms);
    },
  };
}
