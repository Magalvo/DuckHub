---
id: WI-0022
title: Correções da auditoria (lobby e soloFor)
status: done
track: WT-0004
owner: Magalvo
acceptance:
  - AC1: o join do LobbyStore decide a visibilidade na BD; com o Passaporte visível, insere ou renova a entrada e devolve true; com o Passaporte escondido, ou sem a pessoa, não insere nada e devolve false
  - AC2: esconder o Passaporte entre a verificação do handler e o join nunca deixa uma entrada que reapareça ao mostrar o Passaporte outra vez
  - AC3: o soloFor escolhe, por esta ordem, a session do mesmo campus e cursus, a sem campus do mesmo cursus, a sem campus e sem cursus; sem nenhuma, conta como a solo; nunca usa uma session de outro cursus
---

# WI-0022 — Correções da auditoria (lobby e soloFor)

## Problema

Uma auditoria confirmou duas falhas no The Tavern:

1. O `handleLobby` verificava se o Passaporte estava escondido e só depois
   chamava o `store.join`. Um "esconder" pelo meio apagava as entradas, mas o
   join inseria a seguir: ao mostrar o Passaporte outra vez, a pessoa
   reaparecia no lobby sem novo opt-in (contra o AC8 do WI-0017).
2. Sem session do campus, o `soloFor` usava a primeira session sem campus de
   qualquer cursus. Um projeto do 42cursus com uma session sem campus da
   Piscine seria classificado pela regra da Piscine.

## Proposta

- `LobbyStore.join` devolve `boolean` e decide numa transação: lê a linha da
  pessoa em `users` com `FOR UPDATE`; sem linha ou escondida, devolve false sem
  inserir; senão, insere ou renova e devolve true. O `setHidden` atualiza essa
  linha na sua transação, por isso os dois ficam em série.
- O `handleLobby` responde 403 quando o join devolve false; o `isHidden` fica
  como saída rápida.
- O `soloFor` segue a ordem do AC3.
- ADR 0016 ganha a secção "Correções da auditoria (2026-11-09)".

## Fora de âmbito

- Provar a atomicidade em teste: o PGlite tem uma só ligação. O `FOR UPDATE`
  verifica-se na revisão de código; o raciocínio fica no ADR 0016.
- O `xpFor`: continua a usar só a session do mesmo campus e cursus.

## Notas para o agente

- `src/tavern/lobby-store.ts`, `src/tavern/lobby.ts`, `src/intra/schemas.ts`,
  `src/passport/store.ts` (`setHidden`).
- O contrato do WI-0017 (cub3d: session sem campus e sem cursus) continua a valer.
