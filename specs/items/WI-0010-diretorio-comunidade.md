---
id: WI-0010
title: Diretório da comunidade
status: done
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

Decisões do humano (2026-11-06):

- **Ordem por login, A→Z**, por bytes (`ORDER BY login COLLATE "C"`), para
  ser igual no PGlite, no Docker e em produção, sem depender da collation da
  BD. Sem desempate necessário (o login de cada membro
  mostrado é único: com logins repetidos vale o que sincronizou por último,
  como no WI-0009).
- **24 por página.** A procura encontra **qualquer parte** do login e não
  distingue maiúsculas de minúsculas (`MAG` encontra `dde-maga`).

## Interface

Página `/community` (protegida pelo proxy), formulário `GET` com:

- `q`: parte do login (campo com `label` = `en.community.search`);
- `campus`: id do campus, num `select` (`label` = `en.community.campus`) com a
  opção "todos" (`en.community.allCampuses`, valor vazio) e uma opção por
  campus que tenha membros visíveis, com o nome do campus do snapshot;
- `page`: número da página, a partir de 1. Um valor inválido conta como 1.

O resultado é uma lista (`list`, nome acessível `en.community.listLabel`)
com um `listitem` por membro: uma ligação para `/u/<login>` com o login como
texto, mais o campus e o nível. Por baixo, as ligações
`en.community.previous` e `en.community.next`, só quando há página anterior
ou seguinte, que mantêm `q` e `campus`. Sem resultados:
`en.community.empty`.

Só entram membros com Passaporte sincronizado e não escondidos (AC2). O que
cada item mostra é um subconjunto da vista pública (WI-0009).

## Fora de âmbito

Procura por projeto, stack ou nível (matchmaking é The Tavern), ordenação à
escolha, seguir pessoas, mensagens.

## Notas para o agente

- Depende do WI-0009 (visibilidade e Passaporte público).
- O que aparece no diretório é um subconjunto do Passaporte público: nunca
  mais do que isso.
- O seed do e2e ganha 30 membros sintéticos noutro campus
  (`directoryFillers`), para testar a paginação e o filtro. É contrato.
- A procura faz-se na BD (sem carregar todos os membros para a memória), com
  `ILIKE` e o padrão escapado (`%` e `_` no texto procurado são literais).
