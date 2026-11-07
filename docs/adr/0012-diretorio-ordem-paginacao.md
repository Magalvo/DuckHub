# ADR-0012 — Diretório: ordem, logins repetidos e paginação na BD

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-11-07
- **Decisor(es):** Magalvo (decisões de 2026-11-06 e 2026-11-07, WI-0010)

## Contexto

O WI-0010 traz `/community`, a lista dos membros visíveis com filtro por campus e procura por
login. Tem de ter uma ordem estável e igual em todos os ambientes (PGlite nos testes, Docker,
produção), páginas de tamanho fixo e nunca mostrar mais do que o Passaporte público (ADR 0010).
A lista vai crescer com a comunidade, por isso não se pode carregar toda para a memória.

## Decisão

1. **Ordem por login, por bytes**: `ORDER BY login COLLATE "C"`. Não depende da collation da
   BD, que muda entre ambientes. Sem desempate: cada login aparece uma vez (decisão 2).
2. **Logins repetidos**: o login não é único na BD (só o `intra_id`). Uma CTE com
   `DISTINCT ON (login) … ORDER BY login, synced_at DESC` escolhe o Passaporte sincronizado por
   último, como o `loadPublic` do ADR 0010. O `passport_hidden` filtra-se **depois**: se o mais
   recente estiver escondido, o login não aparece.
3. **Paginação na BD**: 24 por página, com `LIMIT 25 OFFSET (page − 1) × 24`. A 25.ª linha só
   diz se há página seguinte, sem um `COUNT`. O `hasNext` conta as linhas da BD **antes** de
   tirar os snapshots inválidos (que falham o schema do store e ficam de fora): uma página pode
   mostrar menos de 24, mas a paginação nunca salta membros.
4. **Procura**: `login ILIKE $padrão ESCAPE '\'`, com `\`, `%` e `_` do texto escapados
   (`likePattern`): encontram-se como texto. Todos os valores (padrão, campus, `LIMIT`,
   `OFFSET`) vão como parâmetros ligados do Drizzle, nunca concatenados.
5. **Campus**: o filtro usa `users.campus_id`; o nome da opção vem do snapshot mais recente
   desse campus. As opções são só os campus com membros visíveis.
6. **Parâmetros da página** (Zod, primeiro valor de um parâmetro repetido):
   - `page` fora de 1..10 000 ou que não é um inteiro conta como 1;
   - `campus` inválido, ou que não está nas opções, é ignorado: lista e `select` mostram todos;
   - `q` sem espaços nas pontas; vazio é sem procura. Com mais de 32 caracteres (o limite dos
     logins em `/u/<login>`) dá zero resultados sem ir à BD, e **não se corta**: uma procura
     cortada mostraria resultados para um texto que a pessoa não escreveu.
7. **Cada item é um subconjunto da vista pública**: `directoryItem` tira login, avatar, campus e
   nível de `publicPassportView(passportView(…))` (testado por propriedade).

## Consequências

Melhor: a mesma ordem em todo o lado, uma consulta por página e nada carregado a mais. A regra
do ADR 0010 (quem esconde, sai) cumpre-se na BD.

Pior: o `OFFSET` fica mais lento em páginas muito altas (aceitável à escala de dois campus;
por isso o teto de 10 000). A CTE agrupa todos os logins antes de filtrar; se a escala crescer,
um índice ou um cursor por login substituem o `OFFSET`.

Obrigatório:

- Uma superfície nova que liste membros usa a mesma CTE (um Passaporte por login, o mais
  recente, e o `hidden` filtrado depois) e parâmetros ligados.
- O `en.privacy.visibility` diz que o Passaporte aparece também no diretório.
