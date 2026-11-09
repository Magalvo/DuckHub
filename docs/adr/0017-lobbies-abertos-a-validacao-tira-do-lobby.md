# ADR-0017 — Lobbies abertos: a validação tira do lobby

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-11-07
- **Decisor(es):** Magalvo (decisões de 2026-11-07, WI-0018)
- **Substitui:** os pontos 3 e 4 da decisão do [ADR 0016](0016-lobby-solo-e-limpeza-na-sincronizacao.md)

## Contexto

No WI-0017 (ADR 0016), só havia lobby nos projetos de grupo em que a pessoa já
estava inscrita na Intra. Mas para se inscrever num projeto de grupo é preciso
ter o grupo: o lobby chegava tarde. Quem procura equipa quer encontrá-la antes
de se inscrever.

O ideal seria abrir o lobby só a quem cumpre os pré-requisitos do projeto, mas
a API não os expõe: `/v2/project_sessions/:id/project_sessions_rules` e
`/v2/project_sessions/:id/rules` dão 403 com o token da aplicação (verificado
pelo humano). Uma lista curada de pré-requisitos duplicaria a Intra e ficaria
desatualizada.

A Intra não permite grupos entre campus (confirmado pelo humano): o filtro de
campus do ADR 0016 é uma limitação real.

## Decisão

1. **Os lobbies de uma pessoa** são todos os projetos de grupo do catálogo do
   seu campus (ADR 0016, pontos 1 e 2) que ela ainda não validou, inscrita ou
   não: só `validated === true` no snapshot fecha o lobby; um projeto falhado
   (`validated === false`) continua aberto. O nome vem do catálogo, porque há
   lobbies de projetos que não estão no snapshot. Sem Passaporte sincronizado,
   não há lobbies. `searching_a_group` e `creating_group` continuam a ser uma
   sugestão privada.
2. **Limpeza na sincronização:** na mesma transação que grava o snapshot, saem
   só as entradas da pessoa nos projetos que o snapshot novo tem validados.
   Inscrever-se, falhar ou desaparecer do snapshot não tiram ninguém do lobby.
   As entradas expiradas de toda a gente continuam a sair (ADR 0016).
3. **Antes de entrar vê-se só quantas pessoas estão no lobby:** as outras, com
   entrada válida, Passaporte visível e no campus de quem vê, numa consulta com
   `group by`. Os logins só aparecem dentro do lobby, que continua a dar 404 a
   quem não entrou. Num lobby vazio, o botão de entrar diz "criar".

## Consequências

- O lobby serve para formar o grupo antes da inscrição, que é quando faz falta.
- **Pode aparecer o lobby de um projeto a que a pessoa ainda não tem acesso**
  (pré-requisitos em falta). É o preço de a API não expor as regras; entrar é
  sempre uma ação explícita e a pessoa pode sair.
- **O número revela presença, de forma anónima.** Num campus pequeno, um "1"
  pode deixar adivinhar quem é. A página de privacidade diz que os outros do
  campus veem quantas pessoas estão num lobby.
- Uma entrada num projeto que sai do catálogo fica órfã até expirar (14 dias);
  não se mostra, porque o projeto já não está nos lobbies de ninguém.
- `LOBBY_STATUSES` deixa de decidir quem tem lobby ou sai dele; fica exportado
  porque o contrato do WI-0017 o fixa.

## O mesmo projeto com vários slugs (2026-11-08)

Alguns projetos estão no catálogo com dois slugs, por exemplo `42cursus-cub3d`
e `cub3d`, ou `42cursus-minirt` e `minirt`: são as linhas de
`src/passport/real-world.json` com mais de um slug. Sem regra, quem validou um
dos slugs via e podia entrar no lobby do outro, e quem ainda não fez o projeto
via dois lobbies com o mesmo nome.

Decisão do humano:

1. **Os slugs do mesmo grupo são um só projeto, com um só lobby.** Os grupos
   são `realWorldSlugGroups`, as linhas da tabela com mais de um slug, pela
   ordem do ficheiro. Nenhum slug aparece em dois grupos.
2. **O lobby usa o primeiro slug do grupo**, mesmo que esse slug não esteja no
   catálogo do campus. A posição é a da primeira entrada do grupo no catálogo.
   O nome é o da entrada com o primeiro slug; sem ela, o da primeira entrada
   do grupo.
3. **Validar qualquer slug do grupo fecha o lobby**, e a sincronização tira a
   pessoa dos lobbies de todos os slugs do grupo. A sugestão da Intra vale
   para qualquer dos slugs.
4. **Basta um slug de grupo.** Se os slugs de um grupo tiverem `solo`
   diferente (vêm de sessions diferentes), há lobby se algum deles for
   `solo: false`. É uma exceção ao "na dúvida, não há lobby" do ADR 0016:
   dentro de um grupo, a API já disse que o projeto é de grupo.
5. **Sem migração.** As entradas que já existam com um slug secundário
   (`cub3d`, `minirt`) deixam de se ver e de se contar, porque nenhum lobby usa
   esse slug, e expiram sozinhas em 14 dias.
