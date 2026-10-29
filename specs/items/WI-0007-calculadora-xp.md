---
id: WI-0007
title: Calculadora de XP
status: draft
track: WT-0002
owner: Magalvo
acceptance:
  - AC1: dado um projeto e uma nota, a calculadora mostra o XP ganho, igual ao XP do projeto multiplicado pela nota e dividido por 100, arredondado para baixo
  - AC2: uma nota acima de 100 aumenta o XP ganho na mesma proporção, até à nota máxima de 125
  - AC3: notas abaixo de 0, acima de 125 ou não inteiras são rejeitadas com uma mensagem clara
  - AC4: o XP de cada projeto vem da API e a calculadora mostra a origem do valor
  - AC5: para um utilizador autenticado no 42cursus, a página mostra o nível real atual sincronizado ao lado do resultado
  - AC6: a calculadora não mostra nenhuma estimativa de nível novo nem de XP em falta para o próximo nível
  - AC7: para um utilizador só com o cursus da Piscine, a calculadora mostra que ainda não está disponível
  - AC8: uma nota maior nunca dá menos XP do que uma nota mais baixa no mesmo projeto
---

# WI-0007 — Calculadora de XP

## Problema

A comunidade usa calculadoras de XP não oficiais espalhadas por vários sítios.
O Duck Hub centraliza-a com dados verificáveis da API.

## Proposta

Função pura `xpGained(projectXp, mark) → number`, com página na secção "The
Forge". O XP do projeto é a `difficulty` obtida pelo cliente do WI-0003.
Nesta versão **não** se estima o nível novo: a tabela nível↔XP
(`/v2/levels`) exige o papel Basic staff e não está acessível a uma app de
aluno (ADR 0003). O AC8 fica como teste de propriedade (fast-check).

## Fora de âmbito

Estimativa de nível novo e XP em falta (até haver fonte oficial), bónus de
coalition, simulação de vários projetos em sequência, Skill Tree, previsões
de Black Hole.

## Notas para o agente

- Regra dura 11: o cálculo é determinístico e só usa dados da API. **Não**
  introduzas uma tabela de níveis de memória nem de fontes comunitárias.
- A fórmula do AC1/AC2 tem de ser confirmada pelo humano quando escrever os
  testes de aceitação, sobretudo o arredondamento e a regra de bónus.
- AC8 é um teste de propriedade; AC1–AC7 são de aceitação.
