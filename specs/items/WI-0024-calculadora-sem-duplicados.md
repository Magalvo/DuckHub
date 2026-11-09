---
id: WI-0024
title: Calculadora sem projetos duplicados
status: done
track: WT-0002
owner: Magalvo
acceptance:
  - AC1: na lista de projetos da calculadora, cada grupo de slugs de realWorldSlugGroups aparece uma só vez, com o primeiro slug do grupo que está na cache do campus
  - AC2: um projeto com um só slug aparece como hoje, e a ordem da lista não muda
  - AC3: um pedido com outro slug do mesmo grupo (por exemplo ?project=cub3d&mark=100) calcula com o XP do slug escolhido no AC1 e deixa essa opção selecionada
  - AC4: um slug que não está na cache nem num grupo continua a dar en.calculator.errors.unknownProject
---

# WI-0024 — Calculadora sem projetos duplicados

## Problema

Encontrado ao testar a app no browser (2026-11-09). A lista de projetos da
calculadora mostra "cub3d" e "miniRT" duas vezes. A API tem dois slugs para
cada um (`42cursus-cub3d` e `cub3d`, `42cursus-minirt` e `minirt`), e a tabela
`src/passport/real-world.json` já os junta num grupo. O The Tavern já usa os
grupos (`realWorldSlugGroups`, ADR 0017); a calculadora não.

## Proposta

A vista da calculadora junta as linhas da cache pelos grupos de
`realWorldSlugGroups`: uma opção por grupo, com o primeiro slug do grupo que
está na cache do campus (decisão do humano, 2026-11-09). Um pedido com
qualquer slug do grupo resolve para essa opção, para os links antigos
continuarem a funcionar.

## Interface

```ts
// src/calculator/view.ts — função pura
/**
 * Uma linha por projeto: os slugs do mesmo grupo dão uma só, a do primeiro
 * slug do grupo que está em `projects`. Devolve uma subsequência de
 * `projects`: as linhas que ficam não mudam nem mudam de lugar.
 */
export function distinctProjects(
  projects: readonly CachedProjectXp[],
  groups: readonly (readonly string[])[]
): CachedProjectXp[];
```

## Fora de âmbito

- Mudar a cache (`project_xp`) ou o que se guarda nela: a junção é só na vista.
- Mudar o The Tavern.
- Escolher o slug pelo XP mais alto.

## Notas para o agente

- Lê o WI-0007, o ADR 0017 e o `primaryOf` em `src/tavern/lobby.ts`. A regra
  aqui é diferente: o primeiro slug do grupo **que está na cache**, não sempre
  o primeiro do grupo.
- `src/calculator/view.ts` (`calculatorView`) e `src/app/calculator/page.tsx`.
- O `calculatorView` usa o `distinctProjects` com os `realWorldSlugGroups` e
  mantém a sua assinatura. O `selected` passa a ser o slug resolvido (AC3).
- Contrato: `tests/acceptance/wi-0024-calculadora-sem-duplicados.acceptance.test.ts`
  e `tests/acceptance/e2e/wi-0024.e2e.ts`. O seed não muda: a cache do campus
  9003 já tem `42cursus-cub3d` e `cub3d`, e o e2e usa a pega.
