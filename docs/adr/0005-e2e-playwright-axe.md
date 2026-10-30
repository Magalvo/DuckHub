# ADR-0005 — Testes de aceitação com browser: Playwright + axe

- **Estado:** aceite
- **Data:** 2026-10-30
- **Decisor(es):** Magalvo

## Contexto

O WI-0002 tem critérios que só se verificam num browser real: a app arranca
e responde (AC1), renderiza em dark mode com os tokens (AC2), troca rail
lateral por barra inferior aos 768px (AC4) e não tem violações AA numa
verificação automática (AC6). A regra dura 12 exige testes de a11y para
componentes de UI, e os work-items seguintes (passaporte, login) vão ter o
mesmo tipo de critério. O Vitest corre em Node e não chega lá: jsdom não
calcula layout, media queries nem contraste real.

Alternativas consideradas: Vitest browser mode (ainda novo e sem integração
madura com o axe), Cypress (mais pesado, corre fora do processo de teste e
encaixa pior no `make check`), e jsdom + axe (não calcula estilos nem
breakpoints, dava falsos verdes no AC4 e no AC6).

## Decisão

Os critérios que precisam de browser são testados com **Playwright**
(`@playwright/test`) e as verificações de acessibilidade com **axe**
(`@axe-core/playwright`, tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`).

1. Os testes vivem em `tests/acceptance/e2e/*.e2e.ts`. Fazem parte do
   **contrato** (já cobertos por `tests/acceptance/**`). A extensão `.e2e.ts`
   mantém-nos fora do Vitest (`tests/**/*.test.ts`).
2. `playwright.config.ts` é **guardrail** em `.agent/protected-paths`.
3. O servidor sobe via `make dev` (o comando do AC1), através do `webServer`
   do Playwright. Localmente reutiliza um servidor já a correr; no CI arranca
   sempre um novo.
4. `make test-e2e` entra no `make check`. O CI instala o Chromium e corre o
   Playwright como passo próprio.
5. Determinismo: só Chromium, `retries: 0` e `forbidOnly` no CI. Um teste
   instável corrige-se, não se repete até passar. O Playwright falha com
   "No tests found" quando não encontra testes, o que funciona como guarda
   contra uma config que deixe de os incluir (o mesmo papel da corrida
   separada do contrato no Vitest).

## Consequências

Melhor: os critérios de UI passam a ter um verificador real e
determinístico, e a regra 12 fica verificada pela máquina em vez de por
revisão.

Pior: o `make check` fica mais lento (arranque do servidor e do browser) e
exige `npx playwright install chromium` uma vez por máquina (passa a fazer
parte do `make setup`). O CI ganha o download do browser.

Obrigatório: até o WI-0002 trazer a app e os testes e2e, `make test-e2e` falha
("No tests found" ou falta do `next`). As propostas desta decisão aplicam-se
juntamente com o WI-0002, não antes. O sandbox do Claude Code tem de permitir
abrir a porta 3000 e lançar o Chromium para o loop de auto-correção conseguir
correr o check.

Proibido: `retries` acima de 0, `test.only` no contrato, e desligar regras do
axe nos testes de aceitação sem um ADR que o justifique.
