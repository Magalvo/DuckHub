# ADR-0008 — Passaporte: snapshot, sincronização no login e e2e com sessão

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-11-04
- **Decisor(es):** Magalvo (decisões de 2026-11-04, WI-0005)

## Contexto

O WI-0005 mostra o Passaporte do próprio utilizador em `/`. Os tokens da 42 não se guardam
(ADR 0007), por isso o único momento em que se pode ler a API em nome do utilizador é o callback
do login. A cor de destaque vem da coalition, que a API devolve em hex e que muitas vezes não tem
contraste para texto (ADR 0003, ponto 11). O e2e do WI-0004 só via páginas sem sessão. O
Passaporte precisa de sessão, sem login real nem rede.

## Decisão

1. **Snapshot JSONB.** Tabela `passports` (`user_id` PK com `ON DELETE CASCADE`, `snapshot` jsonb,
   `synced_at`). Guarda-se só o que a página mostra (`buildSnapshot`). Ao ler, o snapshot passa
   por Zod (`src/passport/store.ts`): a cor só pode ser hex, porque entra numa variável CSS. Um
   snapshot inválido lê-se como "ainda não sincronizado",
   e o conteúdo inválido não se regista em lado nenhum.
2. **Sincronização no callback, sem bloquear o login.** `AuthDeps.syncPassport` corre depois do
   `upsertUser` e o callback espera por ela, para o primeiro acesso já mostrar o Passaporte.
   Tem um **teto de 10 s** para a sincronização inteira (`withDeadline`), porque os retries de um
   429 podem passar disso. Passado o teto, o login segue e a sincronização acaba em segundo plano.
   **Tudo ou nada:** se as coalitions ou os projetos falharem, não se guarda nada e fica o snapshot
   anterior, com a data dele. Nunca lança nem regista.
3. **Cor da coalition só decorativa** (barra de topo, borda da foto, glow), através de `--accent`
   na secção. O texto usa sempre os tokens do tema. Sem coalition, o acento é o Cyber-Teal
   `#00BABC`. Com várias coalitions, vale a primeira que a API devolve.
4. **Data da sincronização** em `Europe/Lisbon`, `AAAA-MM-DD HH:mm`, com `Intl.DateTimeFormat`.
5. **Nível truncado a duas casas**, nunca arredondado: 5.179 mostra 5.17. A implementação
   arredonda primeiro a 6 casas e corta a string, porque `Math.floor(x * 100)` falha com floats
   (0.29 daria 0.28). Há um teste de propriedades que o verifica.
6. **Cursus principal:** `42cursus`, por igualdade exata. Sem ele, o Passaporte é reduzido e
   mostra `c-piscine`; sem esse, o primeiro cursus cujo slug contém `piscine`. A escolha é
   determinística, seja qual for a ordem em que a API devolve os cursus. Slugs confirmados com
   uma chamada real (2026-11-05): `42cursus` (id 21) e `c-piscine` (id 9). Há mais de 20 cursus
   com `piscine` no slug (`discovery-piscine-*`, `piscine-embedded`, `java-piscine`,
   `piscine-c`, …) e um `42cursus-warmup-sp`, que não conta como 42cursus. Estados: concluído = `finished` e `validated? = true`; falhado =
   `finished` e `validated? = false`; em curso = tudo o resto.
7. **A página volta a verificar a sessão** (além do proxy): o `userId` vem sempre do cookie de
   sessão do próprio pedido (AC7).
8. **Avatar com iniciais, sem foto (WI-0008, 2026-11-05).** A primeira versão mostrava a foto da
   42 com `next/image` `unoptimized`. As fotos deixaram de ser acessíveis fora da Intra: todas as
   versões em `cdn.intra.42.fr` respondem 403, com ou sem referer (verificado pelo humano a
   2026-11-05), e o Passaporte mostrava uma imagem partida. Agora é um círculo com as iniciais do
   login (1.ª letra e a 1.ª depois do hífen: `pato-teste` → `PT`), com `role="img"` e nome
   acessível. O fundo é a cor de destaque e as letras são `#000000` ou `#FFFFFF` puros, o de mais
   contraste: para qualquer cor, um dos dois dá pelo menos 4.58:1 (com o preto do tema, não). É a
   única exceção ao ponto 3, porque o contraste fica garantido por construção. **O URL da foto
   saiu do snapshot** (regra 9: se não se mostra, não se guarda) e a migração
   `0002_passports_drop_image_url` tira-o dos snapshots já guardados. O cliente do WI-0003
   continua a ler `image.link`, mas o valor nunca se guarda. Se a 42 voltar a abrir a CDN, a foto
   volta noutro WI.
9. **E2e com sessão em PGlite.** O `webServer` do Playwright corre primeiro o seed do contrato
   (`tests/acceptance/e2e/seed.mjs`), que recria uma BD PGlite em disco (`.e2e/db`) com
   utilizadores, sessões e Passaportes sintéticos, e depois o `next dev` na **porta 3100**, com
   `DATABASE_URL=pglite:.e2e/db` e variáveis sintéticas. Isto **substitui o ponto 3 do ADR 0005**:
   o e2e já não sobe via `make dev` e nunca reaproveita um servidor, porque a BD é recriada a cada
   corrida. Usa um **`distDir` próprio** (`.next-e2e`, via `NEXT_DIST_DIR`), para não colidir com
   um `make dev` a correr na mesma pasta.
10. **`DATABASE_URL=pglite:<pasta>` só fora de produção:** com `NODE_ENV=production` dá
    `ConfigError`. O PGlite e o seu driver Drizzle carregam-se por `import()` dinâmico, só nesse
    ramo: continuam em devDependencies e nunca entram em produção. Uma só instância por
    processo: o runtime guarda a promessa da inicialização, para dois pedidos simultâneos no
    arranque nunca abrirem a mesma pasta duas vezes.

## Consequências

Melhor: o Passaporte abre sem chamar a API e sem token. O e2e cobre páginas com sessão, sem rede
nem Docker. O `make dev` e o `make check` podem correr ao mesmo tempo.

Pior: o Passaporte só é tão recente quanto o último login. O login fica 1–2 s mais lento por causa
do rate limit da 42 (até 10 s, no pior caso). O e2e corre contra PGlite e não contra o
PostgreSQL de produção; as migrações são as mesmas.

Obrigatório:

- **A `/privacy` lista o que o snapshot guarda.** Um campo novo no `PassportSnapshot` entra na
  página de privacidade no mesmo WI (ADR 0007).
- Nada de presença no campus, logtime nem `blackholed_at` no snapshot (regra 9).
- Uma tabela nova que pertença a um utilizador referencia `users.id` com `ON DELETE CASCADE`. O
  teste de apagamento em PGlite percorre todas as tabelas do catálogo, incluindo valores JSONB.

## Em aberto

Confirmar com uma chamada real a ordem das coalitions quando há mais do que uma. Os slugs
`42cursus` e `c-piscine` já estão confirmados (2026-11-05; ADR 0003, "Em aberto" 1).
