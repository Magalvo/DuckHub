# ADR-0006 — Tema, tokens e i18n do esqueleto da app

- **Estado:** aceite
- **Data:** 2026-10-30
- **Decisor(es):** Magalvo

## Contexto

O WI-0002 monta a app Next.js 16 com o tema Cyber Duck. O AC3 obriga a que os pares texto/superfície
se verifiquem sem browser, a partir de um módulo TS. O Tailwind v4 configura-se em CSS (`@theme`),
o que convida a escrever os hex duas vezes. A UI é em inglês, com i18n preparado, mas ainda só há
um idioma. O projeto mantém `moduleResolution: NodeNext`. Dentro do sandbox, o `next dev` e o
Tailwind tentam tocar em ficheiros fora da app.

## Decisão

1. **As cores vivem só em `src/theme/tokens.ts`.** O layout injeta-as como variáveis `--dh-*`
   (`cssVariables()`), e o `globals.css` só as liga ao Tailwind com `@theme inline`. Breakpoints
   (768/1200), raios (4/8/12) e fontes ficam no `@theme`: as media queries não aceitam variáveis e
   nenhum teste precisa deles em TS.
2. **`textSurfacePairs` é a lista de pares permitidos**, derivada de "papel de texto → superfícies".
   O alumni `#A855F7` só serve de texto sobre void, void inset e surface 1; noutras superfícies é
   preenchimento ou borda. O texto secundário é `#8B949E`.
3. **i18n sem biblioteca:** `src/i18n/messages/en.ts` (`as const`) e `src/i18n/messages.ts`, que
   escolhe o idioma ativo. Acesso tipado (`messages.shell.items.home`). O lint
   `react/jsx-no-literals` impede texto escrito nos componentes (AC5). Entra o `next-intl` quando
   houver um segundo idioma ou routing por locale.
4. **Fontes auto-alojadas** (`@fontsource-variable/inter`, `@fontsource-variable/jetbrains-mono`):
   sem rede no `next dev`.
5. **`next.config.ts`:** `devIndicators: false` (o axe analisaria o indicador injetado em dev) e
   `agentRules: false` (o Next 16 acrescentaria instruções ao `AGENTS.md`, que é guardrail).
   **Tailwind:** `source('../')` limita o scan a `src/`.
6. **Sem `next/link` por agora.** Com `NodeNext`, o default export CommonJS do `next/link` fica
   tipado como o módulo inteiro (TS2786). Com uma só rota, a shell usa `<a>`.

## Consequências

Melhor: um só sítio para mudar uma cor, e o contraste fica verificado pela máquina. Nenhum texto
entra na UI sem passar pelo ficheiro de mensagens. O `make check` corre dentro do sandbox.

Pior: as cores chegam ao CSS por uma `<style>` no `<head>` e não por CSS estático. O WI que trouxer
a segunda rota tem de resolver o `next/link`: ou `moduleResolution: Bundler` no `tsconfig.json`
(proposta a um guardrail, com ADR), ou um wrapper tipado.

Obrigatório: um novo par texto/superfície entra em `textOn` (`tokens.ts`), nunca direto no CSS.
