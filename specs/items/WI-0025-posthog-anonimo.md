---
id: WI-0025
title: PostHog anónimo, sem cookies
status: done
track: WT-0006
owner: Magalvo
acceptance:
  - AC1: sem NEXT_PUBLIC_POSTHOG_KEY (ou só com espaços), posthogConfig devolve null e nada arranca nem falha
  - AC2: em produção, só o host da UE é aceite (também quando o host não está definido); fora de produção aceita-se também um host em localhost ou 127.0.0.1; qualquer outro host dá null
  - AC3: as opções do posthog.init são as do ADR 0019, com o stripPersonalData como before_send
  - AC4: o stripPersonalData tira $current_url, $pathname, $referrer, $referring_domain e todas as propriedades $initial_*, $session_entry_* e $prev_pageview_* de properties, $set e $set_once, corta qualquer valor de texto no primeiro ?, e não muda o evento de entrada
  - AC5: analyticsEvent só aceita os 9 eventos da tabela do ADR 0019, com as propriedades e os valores da tabela; tudo o resto dá null
  - AC6: routeTemplate devolve o padrão da rota (/u/[login], /tavern/[slug]), sem segmentos dinâmicos, query nem fragmento; uma rota desconhecida dá /other
  - AC7: no browser, com o PostHog ligado ao host local do e2e, ver o próprio Passaporte público, pesquisar a comunidade pelo próprio login e abrir o Pond envia eventos page_viewed com o padrão da rota, nenhum pedido ao PostHog leva o login, e não fica nenhum cookie nem nada em localStorage ou sessionStorage com o prefixo ph_
  - AC8: o código não chama identify, alias, group nem register do PostHog e não exporta logs do servidor (nada de @opentelemetry no package.json nem no src/)
---

# WI-0025 — PostHog anónimo, sem cookies

## Problema

O PR #30 integrou o PostHog com o assistente oficial, mas mandava para o
PostHog URLs com logins de outras pessoas, guardava cookies sem
consentimento, identificava as pessoas e exportava os logs do servidor. Foi
fechado sem merge. O
[ADR 0019](../../docs/adr/0019-analytics-de-produto.md) decidiu como deve
ser: PostHog na UE, só no browser, sem armazenamento, anónimo, com uma lista
fechada de eventos.

## Proposta

- Um módulo `src/analytics/` com funções puras: a configuração a partir do
  ambiente, o `before_send`, a validação dos eventos e o padrão da rota.
- `src/instrumentation-client.ts` chama `posthog.init` só quando
  `posthogConfig` devolve uma configuração; sem ela, não faz nada.
- O `AppShell` envia `page_viewed` com `routeTemplate(pathname)` em cada
  navegação, e os eventos das ações (os mesmos do PR #30), sempre através do
  `analyticsEvent`.

## Interface

```ts
// src/analytics/config.ts
import type { PostHogConfig } from 'posthog-js';

export const POSTHOG_EU_HOST = 'https://eu.i.posthog.com';

/**
 * null sem chave (AC1) ou com um host não aceite (AC2). Um host vazio ou
 * indefinido é o da UE. `production` vem de process.env.NODE_ENV.
 */
export function posthogConfig(env: {
  key: string | undefined;
  host: string | undefined;
  production: boolean;
}): { key: string; options: Partial<PostHogConfig> } | null;

// src/analytics/privacy.ts
/** As propriedades que saem sempre (AC4). */
export const DENIED_PROPERTIES: readonly string[];
/** As que começam por estes prefixos saem também: $initial_, $session_entry_, $prev_pageview_. */
export const DENIED_PREFIXES: readonly string[];
/** O before_send (AC4). Puro: devolve um evento novo. */
export function stripPersonalData<
  E extends {
    properties: Record<string, unknown>;
    $set?: Record<string, unknown>;
    $set_once?: Record<string, unknown>;
  },
>(event: E): E;

// src/analytics/events.ts
/** Os 9 eventos do ADR 0019, por esta ordem. */
export const ANALYTICS_EVENTS: readonly string[];
/** O evento validado com Zod, ou null (AC5). */
export function analyticsEvent(
  name: string,
  properties?: Record<string, unknown>
): { name: string; properties: Record<string, string> } | null;

// src/analytics/routes.ts
/** As páginas de src/app/, em padrão. Mais /other para o resto. */
export const ROUTE_TEMPLATES: readonly string[];
/** "/u/pato-teste?x=1#y" → "/u/[login]"; rota desconhecida → "/other" (AC6). */
export function routeTemplate(pathname: string): string;
```

`ROUTE_TEMPLATES`: `/`, `/account`, `/calculator`, `/community`, `/login`,
`/pond`, `/privacy`, `/tavern`, `/tavern/profile`, `/tavern/[slug]` e
`/u/[login]`. O `page_viewed` só aceita estes e `/other`.

Uma barra no fim conta como sem ela (`/community/` → `/community`). Um
segmento a mais dá `/other` (`/u/a/b` → `/other`).

## Fora de âmbito

- Banner de consentimento, `identify` ou contagem de quem volta (ADR 0019).
- Sentry e erros (outro WI do WT-0006).
- Dashboards e configuração do projeto no PostHog, além de ligar "Discard
  client IP data" (passo do humano).
- Eventos novos além dos 9 do ADR.

## Notas para o agente

- Lê o ADR 0019. O branch `posthog/wizard-01a1c0d720e6` (PR #30, fechado)
  tem os eventos das ações no `AppShell`; aproveita só isso. Nada de
  `instrumentation.ts` com OpenTelemetry, `posthog-logs`, `identify`,
  `reset`, leitura da sessão no `layout.tsx` nem `captureException`.
- Ficheiros protegidos, já preparados pelo humano antes de começares:
  - `package.json` e `package-lock.json`: só o `posthog-js`;
  - `playwright.config.ts`: o `webServer` do e2e passa a ter
    `NEXT_PUBLIC_POSTHOG_KEY` sintético e `NEXT_PUBLIC_POSTHOG_HOST` em
    `http://localhost:3100/ingest-e2e`.
- Os outros testes e2e também carregam o PostHog, que manda pedidos para a
  própria app e recebe 404. Nada sai para a rede, e nenhum teste verifica a
  consola.
- O `before_send` recebe um `CaptureResult` (`BeforeSendFn` do
  `posthog-js`); o `stripPersonalData` é genérico para servir aí.
- Regra 9: nenhum dado da Intra em eventos, logs ou fixtures.
- Contrato: `tests/acceptance/wi-0025-posthog-anonimo.acceptance.test.ts` e
  `tests/acceptance/e2e/wi-0025.e2e.ts`.
