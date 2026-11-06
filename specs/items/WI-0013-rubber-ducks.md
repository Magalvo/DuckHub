---
id: WI-0013
title: Rubber Ducks nas conquistas
status: draft
track: WT-0003
owner: Magalvo
acceptance:
  - AC1: um utilizador autenticado pode dar um Rubber Duck a um evento do feed e retirá-lo; cada evento mostra quantos Ducks tem
  - AC2: cada pessoa dá no máximo um Duck por evento, mesmo com pedidos repetidos ou simultâneos
  - AC3: não há saldo nem limite de Ducks por pessoa (não é moeda)
  - AC4: dar e retirar um Duck funciona sem JavaScript (formulário POST) e protege-se contra pedidos de outros sites
  - AC5: os Ducks de e para quem apaga a conta desaparecem; os eventos que expiram levam os seus Ducks
  - AC6: o botão do Duck tem nome acessível e estado (dado ou não) anunciado a leitores de ecrã
---

# WI-0013 — Rubber Ducks nas conquistas

## Problema

O feed mostra conquistas, mas não há forma de reagir. O Rubber Duck é o
"parabéns" da comunidade, no tom do produto.

## Proposta

Um botão de Rubber Duck em cada evento do feed (WI-0012): dar ou retirar,
com contagem. Um por pessoa por evento, garantido pela BD. Sem saldo nem
moeda (regra de domínio do produto).

## Fora de âmbito

Ducks em Passaportes, ranking de quem tem mais Ducks, notificações, outros
tipos de reação.

## Notas para o agente

- Depende do WI-0012.
- A unicidade garante-se na BD (chave única), não só no código (AC2).
- Os POST seguem a defesa do WI-0004 (SameSite=Lax e verificação de Origin).
- **Em aberto (humano):** se uma pessoa pode dar um Duck às suas próprias
  conquistas.
