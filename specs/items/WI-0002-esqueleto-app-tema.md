---
id: WI-0002
title: Esqueleto da app com o tema Cyber Duck
status: draft
track: WT-0002
owner: Magalvo
acceptance:
  - AC1: a app arranca localmente com um único comando documentado no Makefile e responde na página inicial
  - AC2: a página inicial renderiza só em dark mode com o fundo, a superfície e a cor primária definidos em docs/canonical/design.md
  - AC3: todos os pares texto/superfície definidos nos tokens têm contraste de pelo menos 4.5 para 1
  - AC4: a shell de navegação mostra rail lateral a partir de 768px e barra inferior abaixo de 768px
  - AC5: todos os textos visíveis da shell vêm de um ficheiro de mensagens em inglês e não estão escritos nos componentes
  - AC6: a página inicial não tem violações de acessibilidade de nível AA numa verificação automática
---

# WI-0002 — Esqueleto da app com o tema Cyber Duck

## Problema

Não existe app. Todos os outros work-items precisam de uma base Next.js com o
tema, a i18n e a base de dados já montados, senão cada um vai improvisar a
sua.

## Proposta

Criar a app Next.js (App Router) em TypeScript estrito dentro deste
repositório, com Tailwind configurado a partir dos tokens de
`docs/canonical/design.md` (a prosa do `DESIGN.md`, não os mockups). Inclui:

- PostgreSQL local via Docker Compose, ainda sem tabelas de domínio;
- shell responsiva de navegação inspirada no dashboard _minimal_;
- mensagens em inglês num ficheiro de i18n.

Os tokens de cor ficam num módulo TS testável, para o AC3 se verificar sem
browser.

## Fora de âmbito

Login, chamadas à API da 42, conteúdo das páginas, deploy, light mode,
componentes de gamificação.

## Notas para o agente

- **Toca em guardrails:** `package.json`, `package-lock.json`, `tsconfig.json`,
  `eslint.config.js`, `vitest.config.ts` e `Makefile` estão em
  `.agent/protected-paths`. Propõe as alterações em `.agent/proposals/` e pára;
  o humano aplica. Sem rebaixar o rigor do `tsconfig` nem do lint (regras 2–3).
- Atenção ao orçamento de diff (15 ficheiros / 800 linhas): o scaffold do
  Next.js pode ultrapassá-lo. Se for o caso, divide em dois PRs ou pede a label
  `diff-budget-override`.
- A ler: ADR 0003, `docs/canonical/design.md`, regra dura 12.
