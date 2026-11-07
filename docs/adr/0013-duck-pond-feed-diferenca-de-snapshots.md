# ADR-0013 — Duck Pond: o feed como diferença de snapshots

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-11-07
- **Decisor(es):** Magalvo (decisões de 2026-11-07, WI-0012)

## Contexto

O WI-0012 traz `/pond`, um feed de conquistas da comunidade: projetos validados, subidas de nível
e badges novas. Ninguém escreve nada: os eventos têm de sair dos dados da API (regra 11), que só
lemos no login (ADR 0008). O feed não pode inundar-se com o passado de quem entra pela primeira
vez, nem repetir eventos, nem mostrar o que o Passaporte esconde (ADR 0010).

## Decisão

1. **Um evento é a diferença entre dois snapshots.** `diffEvents(anterior, novo)` em
   `src/pond/events.ts` é uma função pura sobre as regras que já existem: `projectState` (só
   `done`, comparado pelo `slug`), `shownLevel` do `42cursus` truncado ao inteiro, e
   `earnedBadges`. Sem snapshot anterior não há eventos (a primeira sincronização não traz o
   passado). Um evento guarda só o necessário para se mostrar: o tipo e o `slug`/nome/nota do
   projeto, o nível, ou o id da badge (regra 9). O login vem de `users`, nunca do evento.
2. **A badge substitui o nível quando coincidem.** Se a subida para o nível N traz uma badge
   nova de nível com `min` N, só aparece a badge. Um salto de vários níveis dá um só evento,
   com o nível novo. A primeira validação dá o evento do projeto e o da badge.
3. **Uma só transação na sincronização** (`save` do store do Passaporte): lê o snapshot anterior
   com `SELECT … FOR UPDATE`, grava o novo, insere os eventos e apaga os expirados. Dois logins
   em simultâneo esperam um pelo outro e o segundo já compara com o snapshot do primeiro, por
   isso não há eventos repetidos. Uma falha desfaz tudo, e nunca ficam eventos sem snapshot. A
   sincronização continua a nunca lançar e a nunca registar nada (ADR 0008). Um snapshot
   anterior inválido (falha o schema) conta como primeira sincronização.
   **Limite conhecido:** na primeira sincronização não há linha para o `FOR UPDATE` bloquear. Não
   faz mal: sem snapshot anterior não há eventos, e o upsert do Passaporte resolve o conflito.
4. **Retenção de 90 dias.** O feed nunca mostra eventos com mais de 90 dias (filtro na query),
   e a sincronização apaga os expirados de toda a gente na mesma transação, de forma oportunista,
   como as sessões expiradas (ADR 0007). O índice `(created_at, id)` serve a ordem do feed e esse
   `DELETE`; o de `user_id` serve a cascata e os eventos do próprio. Apagar a conta apaga os
   eventos (`ON DELETE CASCADE`).
5. **Ordem e paginação na BD:** `created_at DESC, id DESC`, 20 por página com `LIMIT 21`, como
   no diretório (ADR 0012). Os eventos da mesma sincronização têm o mesmo `created_at` e
   aparecem pela ordem inversa do diff (a badge antes do projeto); é aceitável. Cada evento
   valida-se com `pondEventSchema` ao ler; um inválido, ou uma badge que já não está no
   catálogo, não aparece, mas conta para o `hasNext`.
6. **Visibilidade:** os eventos de quem escondeu o Passaporte não aparecem a ninguém senão ao
   próprio, incluindo os antigos (filtro por `users.passport_hidden` no momento da leitura).
7. **Só o dia, nunca a hora.** Cada evento mostra a data em `AAAA-MM-DD`, na hora de Lisboa, num
   `<time>`. O evento nasce no login: a hora diria à comunidade quando cada pessoa entra no Duck
   Hub (regra 9).

## Consequências

- Um projeto validado entre dois logins aparece com a data do login seguinte, não a da validação.
- Quem não volta a entrar não gera eventos; o feed mede atividade no Duck Hub, não só na 42.
- A `/privacy` ganha um item para os eventos e a visibilidade passa a mencionar o feed.
- O WI-0013 (Rubber Ducks) acrescenta ações por evento ao lado da data, sem mudar o evento.
