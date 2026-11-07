# ADR-0014 — Rubber Ducks: unicidade na BD, sem Ducks ao próprio, só a contagem

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-11-07
- **Decisor(es):** Magalvo (decisões de 2026-11-07, WI-0013)

## Contexto

O WI-0013 deixa reagir a um evento do Duck Pond (ADR 0013) com um Rubber Duck. Um Duck por
pessoa por evento tem de aguentar pedidos repetidos e simultâneos; o feed não pode dizer à
comunidade quem reage a quê (regra 9); e o Duck não é moeda (sem saldo nem limite).

## Decisão

1. **A unicidade é da BD.** `rubber_ducks` tem a chave primária `(event_id, user_id)`. Dar é um
   `INSERT … SELECT … ON CONFLICT DO NOTHING` (o `SELECT` sobre `pond_events` faz de um evento
   apagado entretanto um no-op); retirar é um `DELETE`. Ambos são idempotentes, e dois pedidos
   simultâneos dão um só Duck sem transação nem verificação prévia no código.
2. **Ninguém dá um Duck às próprias conquistas.** A página não mostra o botão nos eventos do
   próprio, e `POST /pond/ducks` responde 403 mesmo a um pedido feito à mão. A verificação vem
   depois da de visibilidade: um evento que quem pede não vê no feed (inexistente, expirado ou de
   alguém escondido) responde 404, como no ADR 0010, e o 403 só revela o que a pessoa já vê.
3. **Só a contagem.** O feed mostra quantos Ducks cada evento tem e se quem vê já deu o seu,
   nunca quem os deu. Os Ducks de quem escondeu o Passaporte contam como os de qualquer pessoa: a
   contagem não diz de quem são.
4. **Na mesma consulta do feed.** A contagem e o "já dei" são subconsultas da consulta do
   `listEvents`, servidas pela chave primária; não há uma consulta por evento.
5. **Cascatas.** As duas chaves estrangeiras têm `ON DELETE CASCADE`: apagar a conta leva os
   Ducks que a pessoa deu e os dos seus eventos; a limpeza dos 90 dias leva os Ducks dos eventos
   expirados. O índice em `user_id` serve a cascata do apagamento de conta.
6. **Sem JavaScript.** Cada botão é um formulário POST com o id do evento, a ação (`give` ou
   `take`, consoante o estado) e a página; o 303 volta à mesma página do feed. O nome do botão é
   fixo e o estado vai no `aria-pressed`. A defesa contra outros sites é a do WI-0004 (SameSite=Lax
   e verificação de `Origin`).

## Consequências

- Não há forma de saber quem deu Ducks, nem para o próprio autor do evento; uma lista de quem
  deu exigiria um novo ADR e uma revisão da `/privacy`.
- Um Duck guarda quem o deu e quando (`created_at`): a `/privacy` ganha um item para isso.
- Sem saldo, um Duck não tem valor fora do evento: não há ranking nem transferência.
