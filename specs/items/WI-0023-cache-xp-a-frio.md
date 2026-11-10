---
id: WI-0023
title: Cache de XP a frio (estado "a carregar", aquecimento no login e registo da falha)
status: done
track: WT-0002
owner: Magalvo
acceptance:
  - AC1: com a cache do campus vazia e uma atualização ainda em curso quando passa o teto de tempo, projectsFor devolve loading e a calculadora mostra en.calculator.loading em vez de en.calculator.noData
  - AC2: com a cache do campus vazia e a última atualização falhada (sem nenhuma em curso), projectsFor devolve failed e a calculadora mostra en.calculator.noData
  - AC3: uma atualização que passa o teto de tempo continua e, quando acaba com sucesso, grava a cache; o pedido seguinte devolve ready sem nova chamada à API
  - AC4: no The Tavern, com o catálogo do campus em loading, aparece en.tavern.lobby.loading em vez de en.tavern.lobby.noProjects
  - AC5: depois de um login com sucesso, o callback pede o aquecimento da cache do campus da pessoa sem esperar por ele, e uma falha do aquecimento nunca falha o login; warm só chama a API se a cache está vazia ou com mais de 24 h, e partilha a atualização em curso
  - AC6: quando uma atualização falha, o servidor regista uma só linha "[xp-cache] refresh failed campus=<id> reason=<tipo>", com o tipo em token, rate-limited, http:<status>, network, invalid-response, empty ou store, e nada mais
  - AC7: uma atualização com sucesso não regista nada
  - AC8: o pedido da lista de projetos à API tem um timeout próprio de pelo menos 30 s, acima dos ~12 s medidos
---

# WI-0023 — Cache de XP a frio

## Problema

Encontrado ao testar a app no browser (2026-11-09). Com a cache de XP de um
campus vazia (primeira visita, ou BD nova), a calculadora mostra _"We
couldn't load project XP from the 42 API"_ e o The Tavern mostra _"No group
project lobbies are open for you right now"_, embora a API funcione.

Causas medidas:

1. O pedido `GET /v2/cursus/21/projects?filter[slug]=…` (31 slugs, campus 38)
   demorou cerca de **12,3 s** (diagnóstico com um timeout de 15 s).
2. O teto da página, `XP_REFRESH_DEADLINE_MS`, é 10 s: a página desiste e
   trata "ainda a carregar" como "falhou".
3. Pior: o `fetchWithTimeout` de `src/server/runtime.ts` corta **cada pedido
   HTTP aos 10 s** (`FETCH_TIMEOUT_MS`). Um pedido de 12 s nunca acaba dentro
   da app, por isso a atualização em fundo falha sempre que a API está lenta.
   Isto explica porque a primeira visita não gravou nada. A visita seguinte
   funcionou, provavelmente porque a API respondeu mais depressa.
4. O `catch {}` do `refresh` em `src/calculator/cache.ts` engole o erro, por
   isso nada disto era visível.

## Proposta

- `projectsFor` passa a devolver um estado: `ready` (com projetos, mesmo
  antigos), `loading` (sem projetos e uma atualização em curso) ou `failed`
  (sem projetos e nenhuma em curso).
- A calculadora e o The Tavern mostram uma mensagem própria para `loading`.
- A cache ganha `warm(campusId)`: começa a atualização se a cache está velha
  ou vazia, sem esperar por ela. O callback do login chama-a com o campus do
  perfil, depois da sincronização do Passaporte, sem bloquear o redirect.
- O pedido da lista de projetos passa a ter um timeout próprio de 30 s. Os
  outros pedidos (login, sincronização) ficam com os 10 s.
- `FetchProjects` passa a devolver o tipo da falha em vez de `null`, e o
  `refresh` regista uma linha só com o campus e esse tipo (decisão do humano,
  2026-11-09). O ADR 0009 ganha uma secção a explicar a exceção ao "nunca
  regista nada".

## Interface

```ts
// src/calculator/cache.ts
export type RefreshFailure =
  | 'token'
  | 'rate-limited'
  | `http:${string}` // o status HTTP, ex.: http:429
  | 'network'
  | 'invalid-response'
  | 'empty'
  | 'store';

/** Timeout do pedido da lista de projetos (AC8). */
export const XP_FETCH_TIMEOUT_MS: number; // ≥ 30_000

export type FetchProjects = (
  campusId: number
) => Promise<{ ok: true; projects: ProjectXp[] } | { ok: false; reason: RefreshFailure }>;

export type CacheRead =
  { kind: 'ready'; projects: CachedProjectXp[] } | { kind: 'loading' } | { kind: 'failed' };

export interface ProjectXpCache {
  projectsFor(campusId: number): Promise<CacheRead>;
  /** Começa a atualização se precisar; nunca lança, nunca rejeita, nunca espera por ela. */
  warm(campusId: number): void;
}

// createProjectXpCache ganha a dependência `log: (line: string) => void`
// (em produção, console.warn). Linha: `[xp-cache] refresh failed campus=<id> reason=<RefreshFailure>`.
// Uma exceção do fetchProjects conta como `network`; uma do store.replace, como `store`;
// uma lista vazia, como `empty`.

// fetchFromApi: o token falhado dá `token`; os IntraError dão `rate-limited`,
// `http:<status>`, `network` e `invalid-response`.

// src/calculator/view.ts — a assinatura ganha um campo opcional
export function calculatorView(input: {
  saved: Saved;
  projects: readonly CachedProjectXp[];
  query: CalculatorQuery;
  /** Sem projetos e com a atualização em curso: { kind: 'loading' }. */
  loading?: boolean;
}): CalculatorView; // CalculatorView ganha { kind: 'loading' }

// src/tavern/lobby.ts — novo; o loadLobbyProjects fica como está
export async function loadLobbyState(
  userId: string,
  deps: {
    loadSnapshot(userId: string): Promise<PassportSnapshot | null>;
    campusOf(userId: string): Promise<number | null>;
    catalog(campusId: number): Promise<CacheRead>;
  }
): Promise<{ kind: 'loading' } | { kind: 'ready'; projects: LobbyProject[] }>;
// `failed` dá `ready` com a lista vazia (en.tavern.lobby.noProjects, como hoje).

// src/auth/handlers.ts — AuthDeps ganha um campo opcional
//   warmXpCache?: (campusId: number) => void;
// Chamado no callback depois do syncPassport, com profile.primaryCampus.id.
```

Mensagens novas em `src/i18n/messages/en.ts`:

- `calculator.loading`: "Loading project XP from the 42 API. Refresh the page in a few seconds."
- `tavern.lobby.loading`: "Loading group projects from the 42 API. Refresh the page in a few seconds."

## Fora de âmbito

- Tornar o pedido à API mais rápido (menos campos, outro endpoint).
- Mudar o teto de 10 s da página, a validade de 24 h ou o timeout dos outros
  pedidos.
- Recarregar a página sozinha (sem JavaScript obrigatório, como no WI-0007).
- Aquecer as caches de todos os campus no arranque.
- Uma mensagem própria para `failed` no The Tavern.

## Notas para o agente

- Lê o ADR 0009 e o WI-0007. O `inFlight` já partilha uma atualização por
  campus: o `warm` e o `projectsFor` usam o mesmo.
- Os campos novos (`loading`, `warmXpCache`) são opcionais para não partir
  os contratos do WI-0004, do WI-0005 e do WI-0024, que constroem estes
  objetos.
- O `lobbyProjectsOf` (`src/server/runtime.ts`) continua a servir a rota do
  lobby e a página `/tavern/[slug]`; a página `/tavern` passa a usar o
  `loadLobbyState`.
- O timeout de 30 s precisa de um `fetch` próprio para o cliente da
  calculadora em `src/server/runtime.ts`; o rate limiter continua o mesmo.
- Regra 9: a linha de registo leva só o campus e o tipo da falha. Nada do
  corpo, do token, do login ou de Issues do Zod.
- Os testes nunca chamam a 42 real: usa um `fetchProjects` e um relógio falsos.
- Contrato: `tests/acceptance/wi-0023-cache-xp-a-frio.acceptance.test.ts`.
