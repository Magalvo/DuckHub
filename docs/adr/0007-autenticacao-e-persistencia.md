# ADR-0007 — Autenticação própria, sessões e persistência

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-11-04
- **Decisor(es):** Magalvo (decisões de 2026-11-04, WI-0004)

## Contexto

O WI-0004 traz o login com o OAuth da 42, restrito a 42 Lisboa e 42 Porto, com o RGPD no mínimo:
guardar só o necessário e deixar apagar tudo (regra 9). É a primeira funcionalidade com base de
dados. O ADR 0003 tinha apontado o Auth.js. Com `moduleResolution: NodeNext`, o `next/link` não
compila (ADR 0006, ponto 6), e o WI-0004 traz as primeiras rotas a ligar entre si.

## Decisão

1. **Auth própria, sem biblioteca** (substitui o Auth.js do ADR 0003). Web Application Flow da 42,
   scope `public`, `state` num cookie `HttpOnly` de 10 minutos. Há um só provider: assim os
   tokens, as sessões e o apagamento ficam sob controlo total, em `src/auth/handlers.ts`, com
   todas as dependências injetadas.
2. **Sessão opaca.** O cookie `dh_session` (`HttpOnly`, `SameSite=Lax`, `Secure` com `APP_URL` em
   https) leva 32 bytes aleatórios em base64url. A BD guarda só o SHA-256. A sessão expira ao fim
   de 30 dias sem uso. Cada uso renova o prazo, mas só se escreve na BD quando o prazo avança mais
   de 1 hora, para não haver uma escrita por pedido. Quando há renovação, o proxy reenvia o cookie
   com o `Max-Age` novo. Uma sessão expirada apaga-se quando é lida, e cada sessão criada apaga
   todas as já expiradas (`expires_at < now()`), de qualquer utilizador. Os POST recusam um `Origin`
   diferente do da app, além do `SameSite=Lax`.
3. **Os tokens da 42 não se guardam.** O access token serve no callback para ler o perfil (cliente
   do WI-0003) e descarta-se; o refresh token é ignorado. A troca do código (POST
   `/oauth/token`) vive em `src/auth/token-exchange.ts`, porque o cliente do WI-0003 é só GET, e
   passa pelo mesmo rate limiter. Nem o `CLIENT_SECRET` nem os tokens chegam a logs ou mensagens
   de erro.
4. **PostgreSQL com Drizzle ORM** (`drizzle-orm` + `pg` em runtime, `drizzle-kit` em dev).
   Migrações SQL versionadas em `drizzle/` (`make db-generate`, `make db-migrate`). Tudo o que
   pertence a um utilizador referencia `users.id` com `ON DELETE CASCADE`, por isso apagar a conta
   é um só `DELETE` (AC7).
5. **PGlite nos testes da BD** (`tests/integration/`): PostgreSQL em WASM, sem Docker, com as
   mesmas migrações de produção. O teste do apagamento percorre todas as tabelas do catálogo, e
   não as do código, para apanhar tabelas novas sem cascata.
6. **`module: ESNext` + `moduleResolution: Bundler`** no `tsconfig.json`. O código é sempre
   compilado pelo Next ou pelo Vitest, nunca pelo `tsc`, e o Bundler é a resolução que eles usam.
   Resolve o `next/link` (ADR 0006). **Em `src/`, os imports relativos são sem extensão**: com
   Bundler, o Turbopack não resolve `./x.js` para `./x.ts`. Os testes podem manter o `.js`.
7. **Configuração lida quando é precisa**, com Zod (`src/auth/config.ts`): `CLIENT_ID`,
   `CLIENT_SECRET`, `APP_URL`, `ALLOWED_CAMPUS_IDS` e `DATABASE_URL`. O proxy só a lê se houver
   cookie de sessão, por isso `/login` e `/privacy` funcionam sem `.env`. O estado partilhado (um
   rate limiter e um pool por processo) vive em `globalThis`, para sobreviver ao HMR do
   `next dev`.

## Consequências

Melhor: nenhum segredo da 42 persiste, e uma fuga da BD não dá sessões utilizáveis. O apagamento
fica verificado contra PostgreSQL real.

Pior: sem tokens guardados, a sincronização com a 42 só acontece no login (WI-0005). A segurança da
auth é toda nossa, sem uma biblioteca auditada por trás. O teste em PGlite junta cerca de 5 s ao
`make test`.

Obrigatório:

- **Os nomes dos campus nas mensagens** (`en.login.body`, `en.login.errors.campus`: "42 Lisboa e
  42 Porto") **acompanham o `ALLOWED_CAMPUS_IDS`**: mudar um obriga a mudar o outro.
- **A lista de `en.privacy.items` bate com as colunas de `src/db/schema.ts`**: uma coluna nova
  sobre o utilizador entra na página de privacidade no mesmo WI e referencia `users.id` com
  `ON DELETE CASCADE`.
- Uma tabela nova entra por `make db-generate`, nunca SQL escrito à mão.
