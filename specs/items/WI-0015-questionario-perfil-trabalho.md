---
id: WI-0015
title: Questionário de perfil de trabalho
status: draft
track: WT-0004
owner: Magalvo
acceptance:
  - AC1: um utilizador autenticado responde a um questionário com uma pergunta por dimensão do WI-0014, todas de resposta fechada e todas opcionais
  - AC6: as respostas nunca são mostradas a outras pessoas; os outros veem só a pontuação e as razões
  - AC2: as respostas guardam-se num perfil de trabalho que o próprio pode editar e apagar; apagar a conta apaga-o
  - AC3: as respostas entram por um schema Zod; um valor fora das opções é rejeitado
  - AC4: o questionário funciona sem JavaScript (formulário POST) e protege-se contra pedidos de outros sites
  - AC5: cada pergunta tem rótulo acessível e navega-se só com o teclado
---

# WI-0015 — Questionário de perfil de trabalho

## Problema

O algoritmo (WI-0014) precisa de saber como cada pessoa gosta de trabalhar, e
a API da 42 não tem esses dados.

## Proposta

Um questionário curto, amigável e fechado em `/tavern/profile`, que preenche
o `WorkProfile` do WI-0014. Sem texto livre. Cada pergunta pode ficar sem
resposta (conta como dimensão em falta).

Perguntas propostas (dimensões do WI-0014): horário (períodos do dia,
escolha múltipla), quando quero começar, ritmo, ambição de nota, estilo,
presencial/remoto, papel.

## Fora de âmbito

Texto livre, perguntas sobre idioma ou interesses, presença no campus, mostrar
as respostas em bruto a outras pessoas.

## Notas para o agente

- Depende do WI-0014 (tipos).
- POST com a defesa do WI-0004 (SameSite=Lax e verificação de Origin).
- Decisões do humano (2026-11-07): ficam as 7 dimensões (o limite de 6 era
  indicativo); os outros veem só a pontuação e as razões, nunca as respostas.
