---
id: WI-0006
title: Tradução "mundo real" dos projetos
status: draft
track: WT-0002
owner: Magalvo
acceptance:
  - AC1: um projeto cujo slug está na tabela mostra a descrição "mundo real" correspondente, por exemplo minishell mostra uma descrição de interpretador de linha de comandos em C
  - AC2: um projeto cujo slug não está na tabela mostra apenas o nome original, sem descrição inventada
  - AC3: a tabela é um ficheiro de dados versionado no repositório e validado por schema, com slugs únicos e descrições não vazias
  - AC4: a procura na tabela é feita pelo slug do projeto da API, não pelo nome
---

# WI-0006 — Tradução "mundo real" dos projetos

## Problema

Os nomes dos projetos da 42 (Minishell, Inception, ft_transcendence) não dizem
nada a um recrutador. O Passaporte deve explicá-los na linguagem do mercado.

## Proposta

Uma tabela estática e curada `slug → { title, description }`, em inglês
(língua da UI), validada por Zod no arranque, com uma função pura de procura.
Começa pelos projetos do Common Core e pelos mais comuns do Advanced. Não há
LLM (ADR 0003).

## Fora de âmbito

Geração automática ou por LLM, traduções para português, edição da tabela
pela UI, categorias para o radar de skills.

## Notas para o agente

- **O conteúdo da tabela é do humano.** Propõe uma primeira versão com os
  slugs que conseguires confirmar e marca-a para revisão. Não inventes slugs.
- Não depende de login: pode avançar logo a seguir ao WI-0002.
