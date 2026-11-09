# ADR-0019 — Analytics de produto (PostHog anónimo, sem cookies)

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-11-09
- **Decisor(es):** Magalvo (decisões de 2026-11-09: sem cookies nem banner,
  eventos anónimos, erros no Sentry como no ADR 0018)
- **Completa:** o [ADR 0018](0018-alojamento-deploy-observabilidade.md), que
  não tratava analytics de produto

## Contexto

Queremos saber que partes do Duck Hub são usadas (que páginas, que ações,
onde as pessoas desistem) para decidir o que construir a seguir. O PR #30
integrou o PostHog com o assistente oficial (_wizard_). Na revisão de
2026-11-09 o CI só falhava na formatação, mas a integração tinha problemas de
fundo:

1. **Captura automática com o URL completo.** Os `defaults: '2025-05-24'`
   ligam os pageviews e os cliques automáticos. URLs como `/u/<login>` e
   `/community?q=<login>` levariam logins de outras pessoas para o PostHog:
   dados da Intra a sair para terceiros (regra 9).
2. **Cookies sem consentimento.** O PostHog guarda um identificador no
   browser logo no arranque. Na UE isso exige consentimento, e não havia
   banner.
3. **`posthog.identify` com o id do utilizador**, o que obrigava o
   `layout.tsx` a ler a sessão da BD em todas as páginas, públicas incluídas,
   e engolia os erros num `catch {}`.
4. **Logs do servidor exportados para o PostHog** (`instrumentation.ts` com
   OpenTelemetry). O ADR 0018 já decidiu: erros no Sentry, logs no stdout da
   plataforma.
5. **Exceções do browser no PostHog** (`capture_exceptions`), também em
   sobreposição com o Sentry.
6. **Nada fixava a região UE** do PostHog.

### Alternativas consideradas

- **Sem analytics até ao lançamento.** Simples, mas chega-se ao lançamento
  sem forma de medir nada.
- **Banner de consentimento com opt-in.** Reconhece quem volta, mas obriga a
  um banner acessível, a guardar a escolha e a perder os dados de quem não
  aceita (normalmente a maioria).
- **Identificar com o UUID interno.** Dá a jornada de cada pessoa, mas cada
  pedido de apagar a conta passa a ter de apagar também no PostHog.
- **Sem cookies e anónimo** (escolhida): nada fica guardado no browser e
  nenhum evento aponta para uma pessoa. Perde-se a contagem de quem volta.

## Decisão

O Duck Hub usa o **PostHog Cloud na região UE**, só no browser, **sem
cookies nem armazenamento local**, com **eventos anónimos** e uma **lista
fechada de eventos**. Erros e logs ficam como no ADR 0018.

### 1. Configuração do cliente

- Host fixo da UE: `https://eu.i.posthog.com`. Um `NEXT_PUBLIC_POSTHOG_HOST`
  com outro valor é rejeitado e o PostHog não arranca.
- A chave do projeto vem de `NEXT_PUBLIC_POSTHOG_KEY` (é pública por
  desenho). Sem chave, o PostHog não arranca e **nada falha**: nem
  `throw`, nem aviso em produção. O dev local, o e2e e o CI correm sem ela.
- Opções obrigatórias no `posthog.init`:
  - `persistence: 'memory'`: nada em cookies, localStorage ou
    sessionStorage;
  - `autocapture: false`, `capture_pageview: false`,
    `capture_pageleave: false`;
  - `disable_session_recording: true`, `capture_performance: false`,
    `disable_surveys: true`, `capture_exceptions: false`;
  - `person_profiles: 'never'` e nenhuma chamada a `identify`, `alias`,
    `group` ou `register` com dados da pessoa;
  - `respect_dnt: true`;
  - um `before_send` que tira de todos os eventos `$current_url`,
    `$pathname`, `$referrer`, `$referring_domain`, as propriedades
    `$initial_*` e qualquer query string.
- No projeto do PostHog: "Discard client IP data" ligado.

### 2. Eventos

Só os de uma lista fechada, num módulo próprio, cada um com propriedades de
valores fixos (enums validados com Zod). Nunca logins, nomes, slugs de
pessoas, texto escrito pela pessoa, ids da Intra nem URLs.

| Evento                            | Propriedades                                            |
| --------------------------------- | ------------------------------------------------------- |
| `page_viewed`                     | `route`: o padrão da rota (`/u/[login]`, nunca o login) |
| `auth_login_started`              | —                                                       |
| `auth_logout_requested`           | —                                                       |
| `account_deletion_requested`      | —                                                       |
| `passport_visibility_changed`     | `visibility`: `hidden` \| `visible`                     |
| `duck_reaction_changed`           | `action`: `give` \| `take`                              |
| `tavern_lobby_membership_changed` | `action`: `join` \| `leave`                             |
| `work_profile_saved`              | —                                                       |
| `work_profile_deleted`            | —                                                       |

Um evento novo, ou uma propriedade nova, entra por work-item e atualiza
esta tabela.

### 3. O que fica de fora

- Sem exportação de logs do servidor para o PostHog: sai o
  `instrumentation.ts` com OpenTelemetry, o `src/server/posthog-logs.ts` e as
  chamadas nas rotas.
- Sem leitura da sessão no `layout.tsx` para analytics.
- Sem `captureException` no `global-error.tsx`: os erros vão para o Sentry
  (ADR 0018).

## Consequências

- **Melhor:** nenhum dado pessoal nem da Intra sai para o PostHog; não há
  banner; apagar uma conta não tem nada a apagar no PostHog; o dev, o CI e o
  e2e funcionam sem configuração.
- **Pior:** não se conta quem volta nem se segue a jornada de uma pessoa
  entre sessões. Os funis valem só dentro de uma visita. Se isso fizer falta,
  muda-se para opt-in com banner, num ADR que substitua este.
- **Obrigatório:** a lista de eventos acima; o `before_send`; testes que
  provam que nenhum pedido ao PostHog leva um login, um URL ou uma query
  string; a política de privacidade descreve o analytics anónimo.
- **Proibido:** `identify`, captura automática, gravação de sessões e
  exportação de logs para o PostHog.
- **O PR #30 não entra como está.** Um work-item ajusta-o a este ADR, com
  critérios de aceitação testáveis (por exemplo, um e2e que interceta os
  pedidos ao host do PostHog e verifica que nenhum corpo contém o login da
  pessoa do seed). As dependências do OpenTelemetry saem do `package.json`;
  fica só o `posthog-js`.
