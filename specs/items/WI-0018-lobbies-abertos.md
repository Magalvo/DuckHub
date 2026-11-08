---
id: WI-0018
title: Lobbies abertos
status: done
track: WT-0004
owner: Magalvo
acceptance:
  - AC1: há lobby em todos os projetos de grupo do campus que a pessoa ainda não validou, inscrita ou não; um projeto validado não tem lobby e um falhado tem (substitui o AC1 do WI-0017)
  - AC2: antes de entrar, cada lobby mostra só quantas outras pessoas lá estão, nunca os logins; o lobby continua a dar 404 a quem não entrou
  - AC3: num lobby vazio, entrar é criá-lo; o botão diz "criar" em vez de "entrar"
  - AC4: a sincronização tira a pessoa só dos lobbies dos projetos que validou; inscrever-se, falhar ou sair do snapshot não a tiram
  - AC5: os slugs do mesmo projeto são um só lobby, com o primeiro slug do grupo; validar qualquer deles fecha-o e tira a pessoa do lobby na sincronização
---

# WI-0018 — Lobbies abertos

## Problema

No WI-0017, o lobby de um projeto de grupo só aparecia depois de a pessoa se
inscrever na Intra. Mas para se inscrever é preciso já ter o grupo: o lobby
chegava tarde. E quem olhava para a lista não sabia se valia a pena entrar.

## Proposta

Decisões do humano (2026-11-07, ADR 0017):

- Os lobbies abrem-se a todos os projetos de grupo do catálogo do campus que a
  pessoa ainda não validou, inscrita ou não. A API não expõe os pré-requisitos
  (`/v2/project_sessions/:id/project_sessions_rules` e `/rules` dão 403 com o
  token da aplicação).
- Só validar o projeto tira a pessoa do lobby na sincronização.
- Antes de entrar vê-se quantas pessoas estão no lobby, nunca os logins.
- Num lobby vazio, entrar é criá-lo.
- A Intra não permite grupos entre campus (confirmado): o filtro de campus fica.

Substitui o AC1 do WI-0017, que fica como registo histórico.

## Interface

- `lobbyProjects(snapshot | null, catalog: { slug, name, solo }[])` em
  `src/tavern/lobby.ts`: os projetos com `solo: false`, pela ordem do catálogo,
  exceto os que o snapshot tem com `validated === true`. O nome vem do
  catálogo; `suggested` é `searching_a_group` ou `creating_group` no snapshot.
  Sem snapshot, `[]`. O POST `/tavern/lobby` e `/tavern/<slug>` usam-no, por
  isso aceitam projetos sem inscrição.
- `realWorldSlugGroups` em `src/passport/real-world.ts`: as linhas da tabela
  com mais de um slug, pela ordem do ficheiro. O terceiro argumento do
  `lobbyProjects` (`groups = []`) trata os slugs de um grupo como um só
  projeto, e o `loadLobbyProjects` passa-lhe estes grupos (AC5, ADR 0017).
  `sameProjectSlugs(slugs, groups)` junta os outros slugs do grupo; a
  sincronização usa-o para os projetos validados.
- `lookingLabel(count, one, many)` em `src/tavern/lobby.ts`: `"<count> <one>"`
  para 1, `"<count> <many>"` para os outros números (0 incluído).
- `LobbyStore.counts(viewerId): Map<slug, number>`: os outros com entrada
  válida, Passaporte visível e no campus de quem vê, por projeto (`group by`),
  sem contar quem vê. Um lobby sem mais ninguém não aparece no mapa.
- `createDrizzlePassportStore.save`: apaga as entradas da pessoa nos projetos
  validados do snapshot novo e, como antes, as expiradas de toda a gente.
- Página `/tavern`: cada `listitem` tem o `lookingLabel` com `lookingOne` e
  `lookingMany` num `<p>` só seu. Fora do lobby, o botão é `create` com n = 0 e
  `join` nos outros casos; dentro, "abrir" e "sair", como no WI-0017.
- Mensagens: `en.tavern.lobby.lookingOne`, `lookingMany` e `create`; o
  `noProjects` e a finalidade do item de privacidade dos lobbies seguem a regra
  nova (sai-se ao validar o projeto; os outros do campus veem quantas pessoas
  estão num lobby).

## Fora de âmbito

- Os pré-requisitos dos projetos (a API não os expõe).
- Mostrar o número a quem tem o Passaporte escondido (continua a ver só o
  aviso).
- Grupos entre campus (a Intra não os permite).

## Notas para o agente

- ADRs 0016 e 0017. O contrato está em
  `tests/acceptance/wi-0017-lobby.acceptance.test.ts`,
  `tests/acceptance/wi-0018-lobbies-abertos.acceptance.test.ts` e
  `tests/acceptance/e2e/wi-0018.e2e.ts`.
- `LOBBY_STATUSES` fica exportado porque o contrato do WI-0017 o fixa, mas já
  não decide quem tem lobby.
