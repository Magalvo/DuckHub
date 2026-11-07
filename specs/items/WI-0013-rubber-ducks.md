---
id: WI-0013
title: Rubber Ducks nas conquistas
status: done
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

Decisões do humano (2026-11-07):

- **Ninguém dá um Duck às próprias conquistas.** Nos eventos do próprio
  aparece a contagem, sem botão, e o servidor recusa um Duck a um evento
  próprio, mesmo num pedido feito à mão.
- **Só se mostra quantos Ducks cada evento tem, nunca quem os deu** (regra 9).
- Quem escondeu o Passaporte continua a poder dar Ducks; os Ducks dele contam
  como os de qualquer pessoa.

## Interface

**Base de dados** (o seed do e2e escreve-a diretamente):

```sql
rubber_ducks (
  event_id   bigint NOT NULL REFERENCES pond_events(id) ON DELETE CASCADE,  -- AC5
  user_id    uuid   NOT NULL REFERENCES users(id)       ON DELETE CASCADE,  -- AC5
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)                                           -- AC2
)
```

**`POST /pond/ducks`** (route handler), formulário com:

- `event`: o id do evento (só dígitos);
- `duck`: `"give"` ou `"take"`;
- `page`: a página do feed de onde veio (opcional; um valor inválido conta
  como 1).

Respostas, por esta ordem:

| Caso                                                                                      | Resposta                                      |
| ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| `Origin` de outro site                                                                    | 403                                           |
| sem sessão                                                                                | 303 para `/login`                             |
| `event` ou `duck` inválidos                                                               | 400                                           |
| evento inexistente, expirado ou que quem pede não vê no feed (dono escondido)             | 404                                           |
| evento do próprio                                                                         | 403                                           |
| dar ou retirar (idempotente: dar duas vezes conta uma, retirar sem ter dado não faz nada) | 303 para `/pond?page=N` (`/pond` na página 1) |

**Página** `/pond` (WI-0012), em cada `listitem`, todo o texto em
`src/i18n/messages/en.ts`:

- a contagem, com o texto `"<N> <en.pond.ducks.countOne>"` para 1 e
  `"<N> <en.pond.ducks.countMany>"` para os outros números, com um espaço
  entre o número e a palavra (ex.: `"2 Rubber Ducks"`, `"0 Rubber Ducks"`);
- nos eventos dos outros, um formulário POST para `/pond/ducks` com um
  `button` de nome acessível `en.pond.ducks.button` e `aria-pressed` `"true"`
  (já deste) ou `"false"`. O nome não muda com o estado: muda o
  `aria-pressed`. O botão dá ou retira consoante o estado;
- nos eventos do próprio, só a contagem, sem botão.

## Fora de âmbito

Ducks em Passaportes, ranking de quem tem mais Ducks, notificações, outros
tipos de reação, lista de quem deu Ducks.

## Notas para o agente

- Depende do WI-0012.
- A unicidade garante-se na BD (chave primária), não só no código (AC2): dar
  é um `INSERT … ON CONFLICT DO NOTHING`.
- Os POST seguem a defesa do WI-0004 (SameSite=Lax e verificação de Origin),
  como o `/account/visibility` do WI-0009.
- O 404 e o 403 seguem a regra do ADR 0010: um evento que quem pede não vê
  responde como inexistente.
- A contagem e o estado do botão vêm da mesma consulta do feed (sem uma
  consulta por evento).
- A `/privacy` ganha um item para os Ducks que a pessoa dá.
- O seed do e2e ganha Ducks (`ducks` em cada `pondEvents`, com as keys de
  quem os deu). É contrato.
- O teste de teclado do WI-0012 (`wi-0012.e2e.ts`) deixa de contar os
  `<input type="hidden">` como focáveis: com os formulários dos Ducks na
  página, o seletor antigo contava campos que nunca recebem foco. É uma
  correção ao contrato do WI-0012, aprovada com este WI.
