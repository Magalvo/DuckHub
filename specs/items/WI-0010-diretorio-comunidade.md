---
id: WI-0010
title: Diretório da comunidade
status: draft
track: WT-0003
owner: Magalvo
acceptance:
  - AC1: em /community, um utilizador autenticado vê a lista dos membros visíveis com Passaporte, cada um com login, avatar, campus e nível, e ligação para /u/<login>
  - AC2: quem escondeu o Passaporte (WI-0009) não aparece no diretório
  - AC3: a lista pode filtrar-se por campus (Lisboa, Porto) e procurar-se por parte do login
  - AC4: a lista tem uma ordem estável e determinística e divide-se em páginas de tamanho fixo
  - AC5: uma procura sem resultados mostra uma mensagem clara
  - AC6: o diretório é navegável só com teclado e não tem violações de acessibilidade AA
---

# WI-0010 — Diretório da comunidade

## Problema

Para encontrar alguém (colega de projeto, alguém da mesma Piscine) é preciso
saber o login. Um diretório mostra quem está no Duck Hub.

## Proposta

Página `/community` com a lista dos membros visíveis, filtro por campus e
procura por login, com paginação no servidor (formulário GET, sem JavaScript
obrigatório). Cada membro liga ao seu Passaporte público (WI-0009). O item
"Community" entra na navegação.

## Fora de âmbito

Procura por projeto, stack ou nível (matchmaking é The Tavern), ordenação à
escolha, seguir pessoas, mensagens.

## Notas para o agente

- Depende do WI-0009 (visibilidade e Passaporte público).
- O que aparece no diretório é um subconjunto do Passaporte público: nunca
  mais do que isso.
- **Em aberto (humano):** a ordem (por login? por nível?) e o tamanho da
  página.
