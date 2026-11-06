# ADR-0009 — Calculadora de XP: fórmula, token da aplicação e cache de 24 h

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-11-06
- **Decisor(es):** Magalvo (decisões de 2026-11-06, WI-0007)

## Contexto

O WI-0007 junta numa página (`/calculator`) a calculadora de XP que a comunidade usa espalhada
por vários sítios não oficiais. O cálculo tem de ser determinístico e só pode usar dados da API
(regra 11). O XP de cada projeto é público, mas o token do utilizador não se guarda (ADR 0007).
Por isso a página não o tem quando alguém a abre. A tabela de níveis (`/v2/levels` e
`/v2/cursus/21/levels`) responde 403 a uma app de aluno (confirmado a 2026-11-06).

## Decisão

1. **Fórmula:** XP ganho = `floor(XP do projeto × nota / 100)`, com a nota inteira de 0 a 125
   (`MAX_MARK`). Não há bónus de coalition. A nota lê-se do texto do formulário (`parseMark`):
   são aceites espaços à volta e só dígitos ASCII, com `-` opcional. `1e2`, `99.5`, `+5` ou
   `10O` são `not-integer`, e o que estiver fora de 0..125 é `out-of-range`. As regras seguem a
   lógica do [42calculator](https://github.com/lucas-ht/42calculator), que é **GPL-3.0**:
   serviu só de fonte das regras e **nenhum código foi copiado**.
2. **Sem estimativa de nível novo nem de XP em falta.** Sem `/v2/levels`, só haveria uma tabela
   de memória ou de fontes comunitárias, o que a regra 11 proíbe. A página mostra o XP ganho e o
   nível real atual do Passaporte (`mainCursus.level`). Se a 42 abrir os níveis, a estimativa
   volta noutro WI.
3. **XP do projeto com um token da aplicação** (_client credentials_, `src/auth/app-token.ts`).
   O pedido é `POST /oauth/token` com `grant_type=client_credentials` e passa pelo rate limiter
   partilhado. O token fica só em memória, no servidor, até um minuto antes de `expires_in`.
   Pedidos em simultâneo partilham um só pedido, e uma falha não fica em cache. Nunca lança,
   nunca regista nada e não devolve detalhe: o secret, o token e o corpo da resposta não saem
   dali. Só se usa para dados públicos, nunca para dados de utilizadores.
4. **Um único pedido para todos os projetos:**
   `GET /v2/cursus/21/projects?filter[slug]=<slugs>&page[size]=100`, pelo método
   `cursusProjects` do cliente do WI-0003. O contrato dos outros métodos não muda. Os slugs são
   os da tabela "mundo real" (`src/passport/real-world.json`, WI-0006), ou seja, o Common Core.
   O XP de cada projeto segue `xpFor`: a sessão do campus do utilizador no 42cursus, senão o
   `difficulty` do projeto.
5. **Cache na BD** (`project_xp`, chave `(campus_id, slug)`), válida 24 h. Antes de responder, a
   página atualiza a cache se o campus não tem linhas ou se a mais antiga tem mais de 24 h. A
   atualização apaga e insere numa transação, para não ficar para trás um slug que saiu da API.
   Há uma só atualização em curso por campus, e um teto de 10 s, passado o qual a página
   responde com a cache que houver. Se a atualização falhar (sem token, erro da API, lista
   vazia ou BD), fica a cache que houver. Sem cache nenhuma, a página diz que não conseguiu
   carregar o XP (`noData`). A origem mostra a data da cache (`fetched_at`) em `Europe/Lisbon`.
6. **Sem JavaScript obrigatório:** um formulário `GET` (`/calculator?project=<slug>&mark=<nota>`),
   com o resultado calculado no servidor. A nota é um `input type="text"` com
   `inputMode="numeric"`: a validação é a do servidor e todas as mensagens vêm de `en.ts`. Um
   projeto fora da cache dá `unknownProject`. A query passa por Zod, e um parâmetro repetido
   conta pelo primeiro valor.
7. **Só para o 42cursus:** sem Passaporte ou com o Passaporte reduzido (só Piscine), a página
   mostra que a calculadora ainda não está disponível e nem lê a cache.

## Consequências

Melhor: o XP é verificável e vem da API, e a página quase nunca chama a 42 (dois pedidos por
campus por dia). O e2e enche a cache com `fetched_at = now()` e nunca chama a 42 real.

Pior: o primeiro pedido do dia, em cada campus, espera pela 42 (até 10 s). Durante 24 h, a
página pode mostrar um XP que a 42 já mudou. A data da origem diz de quando é o valor.

Obrigatório:

- O token da aplicação nunca chega ao browser, a logs nem a mensagens de erro, e nunca se usa
  para ler dados de utilizadores.
- `project_xp` só guarda dados públicos dos projetos. Se um dia guardar algo de um utilizador,
  entra na `/privacy` e no apagamento de conta.
- Nenhum texto da página estima nível novo ou XP em falta (AC6).
