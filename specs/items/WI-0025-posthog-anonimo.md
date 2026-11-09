---
id: WI-0025
title: PostHog anónimo, sem cookies (ajustar o PR #30 ao ADR 0019)
status: draft
track: WT-0006
owner: Magalvo
acceptance:
  - AC1: sem NEXT_PUBLIC_POSTHOG_KEY, posthogConfig devolve null e a app não lança erro nem faz pedidos ao PostHog
  - AC2: com um NEXT_PUBLIC_POSTHOG_HOST diferente de https://eu.i.posthog.com, posthogConfig devolve null
  - AC3: as opções do posthog.init são as do ADR 0019 (persistence memory, autocapture, pageview e pageleave desligados, sem gravação de sessões, performance, surveys nem exceções, person_profiles never, respect_dnt, before_send)
  - AC4: o before_send tira de qualquer evento $current_url, $pathname, $referrer, $referring_domain e todas as propriedades $initial_*, e nunca deixa uma query string em nenhum valor
  - AC5: só os 9 eventos da tabela do ADR 0019 são aceites, com as propriedades da tabela; um nome ou uma propriedade fora da lista não é enviado
  - AC6: routeTemplate devolve o padrão da rota (/u/[login], /tavern/[slug]) e nunca um segmento dinâmico nem a query; uma rota desconhecida dá /other
  - AC7: no browser, com o PostHog configurado, a navegação de uma pessoa do seed pelo seu Passaporte público e pela pesquisa da comunidade não deixa nenhum pedido ao PostHog com o seu login, nenhum cookie e nada em localStorage ou sessionStorage com o prefixo ph_
  - AC8: nenhuma chamada a posthog.identify, alias, group ou register, nem exportação de logs do servidor (sem dependências @opentelemetry/* no package.json)
---

# WI-0025 — PostHog anónimo, sem cookies

## Problema

O PR #30 integrou o PostHog com o assistente oficial. Na revisão de
2026-11-09 o CI só falhava na formatação, mas a integração mandava para o
PostHog URLs com logins de outras pessoas, guardava cookies sem
consentimento, identificava as pessoas e exportava os logs do servidor. O
[ADR 0019](../../docs/adr/0019-analytics-de-produto.md) decidiu como deve
ser: PostHog na UE, só no browser, sem armazenamento, anónimo, com uma lista
fechada de eventos.

## Proposta

- Um módulo `src/analytics/` com funções puras: a configuração a partir do
  ambiente, o `before_send`, a validação dos eventos e o padrão da rota.
- O `instrumentation-client.ts` só chama `posthog.init` quando
  `posthogConfig` devolve uma configuração; sem ela, não faz nada.
- O `AppShell` envia `page_viewed` com `routeTemplate(pathname)` e os eventos
  das ações (os do PR #30), sempre através da validação.
- Sai do PR #30: `instrumentation.ts` (OpenTelemetry),
  `src/server/posthog-logs.ts` e as chamadas nas rotas, o `identify` e o
  `reset`, a leitura da sessão no `layout.tsx` e o `captureException` no
  `global-error.tsx`.

## Interface

```ts
// src/analytics/config.ts
import type { PostHogConfig } from 'posthog-js';

export const POSTHOG_EU_HOST = 'https://eu.i.posthog.com';

/** null sem chave ou com outro host (AC1, AC2). */
export function posthogConfig(env: {
  key: string | undefined;
  host: string | undefined;
}): { key: string; options: Partial<PostHogConfig> } | null;

// src/analytics/privacy.ts
export const DENIED_PROPERTIES: readonly string[]; // os do AC4, sem os $initial_*
/** O before_send (AC4). Não muda o evento de entrada. */
export function stripPersonalData<E extends { properties: Record<string, unknown> }>(event: E): E;

// src/analytics/events.ts
export const ANALYTICS_EVENTS: readonly string[]; // os 9 do ADR 0019
/** O evento validado com Zod, ou null se o nome ou as propriedades não são da lista (AC5). */
export function analyticsEvent(
  name: string,
  properties?: Record<string, unknown>
): { name: string; properties: Record<string, string> } | null;

// src/analytics/routes.ts
/** "/u/pato-teste?x=1" → "/u/[login]"; rota desconhecida → "/other" (AC6). */
export function routeTemplate(pathname: string): string;
```

As rotas conhecidas são as páginas de `src/app/`: `/`, `/account`,
`/calculator`, `/community`, `/login`, `/pond`, `/privacy`, `/tavern`,
`/tavern/profile`, `/tavern/[slug]` e `/u/[login]`.

## Fora de âmbito

- Banner de consentimento, `identify` ou contagem de quem volta (ADR 0019).
- Sentry e erros (outro WI do WT-0006).
- Dashboards e configuração do projeto no PostHog, além de ligar "Discard
  client IP data" (passo do humano).
- Eventos novos além dos 9 do ADR.

## Notas para o agente

- Lê o ADR 0019 e o ADR 0018. Parte de um branch novo a partir de `main`
  (`wi/WI-0025-posthog-anonimo`); aproveita o que servir do branch
  `posthog/wizard-01a1c0d720e6` (PR #30). O PR #30 fecha-se sem merge.
- O `package.json` é guardrail: a dependência `posthog-js` e a saída das
  `@opentelemetry/*` entram por proposta em `.agent/proposals/package.json`,
  com o `package-lock.json`. O mesmo para o `tsconfig.json`, se precisar de
  incluir o `instrumentation-client.ts`.
- AC7 (e2e): o `webServer` do `playwright.config.ts` precisa de
  `NEXT_PUBLIC_POSTHOG_KEY` sintético e do host da UE. O
  `playwright.config.ts` é guardrail: proposta também. O teste interceta
  `https://eu.i.posthog.com/**` com `page.route` e responde 200, por isso
  nada sai para a rede.
- Os pedidos do `posthog-js` podem ir comprimidos (gzip ou base64): o AC7
  verifica o corpo depois de o descomprimir no teste. Nunca se muda o código
  de produção para facilitar o teste.
- O `stripPersonalData` usa-se como `before_send` (`BeforeSendFn` do
  `posthog-js`): adapta a assinatura se precisares, mantendo-a pura.
- Regra 9: nenhum dado da Intra em eventos, logs ou fixtures.
