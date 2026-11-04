---
id: WI-0004
title: Login com OAuth da 42 (Lisboa e Porto)
status: done
track: WT-0002
owner: Magalvo
acceptance:
  - AC1: um visitante sem sessão que abre qualquer página da app, exceto a de privacidade, é encaminhado para o login com a conta da 42
  - AC2: depois de um OAuth bem-sucedido, um utilizador cujo campus principal é 42 Lisboa ou 42 Porto fica com sessão e chega à página inicial, mesmo que só tenha o cursus da Piscine
  - AC3: um utilizador cujo campus principal é outro é recusado com uma mensagem clara e nenhuma sessão é criada
  - AC4: o access token e o refresh token da 42 nunca chegam ao browser, nem em HTML, nem em JSON, nem em cookies legíveis por JavaScript
  - AC5: terminar sessão invalida a sessão no servidor e pedidos seguintes com o cookie antigo são tratados como sem sessão
  - AC6: se a 42 devolver erro ou o utilizador cancelar a autorização, a app mostra uma mensagem de erro e permite tentar de novo
  - AC7: o utilizador pode apagar a sua conta, o que termina a sessão e remove todos os dados guardados sobre ele
  - AC8: existe uma página de privacidade acessível sem sessão que lista os dados guardados e para que servem
  - AC9: uma sessão sem uso durante mais de 30 dias expira e é tratada como sem sessão; cada uso renova o prazo
---

# WI-0004 — Login com OAuth da 42 (Lisboa e Porto)

## Problema

O princípio "zero fricção" exige que se entre só com a conta da Intra. No
primeiro incremento, o acesso é restrito à 42 Portugal e o RGPD fica no
mínimo: guardar só o necessário e deixar apagar tudo.

## Proposta

Implementação própria do Web Application Flow da 42 (scope `public`), sem
biblioteca de autenticação: há um só provider, e assim os tokens e o apagamento
ficam sob controlo total. Decisões do humano (2026-11-04), a registar num ADR
novo no mesmo branch:

- **Sessão** opaca num cookie `HttpOnly`, guardada no PostgreSQL só como hash.
  Expira ao fim de 30 dias sem uso, com renovação a cada uso.
- **Tokens da 42 não se guardam.** Usam-se no callback (perfil e campus, via
  cliente do WI-0003) e descartam-se. A sincronização é só no login (WI-0005).
- **PostgreSQL com Drizzle ORM** (drizzle-orm + drizzle-kit, migrações SQL
  versionadas). Os testes do agente à BD correm em **PGlite**, sem Docker.
- **tsconfig:** proposta para `module: ESNext` + `moduleResolution: Bundler`,
  para o `next/link` compilar (pendente do ADR 0006).
- **Depois do login**, o utilizador vai para `/`. O WI-0005 põe lá o Passaporte.
- **`/login` e `/privacy` usam o AppShell** do WI-0002. Assim o contrato e2e
  do WI-0002, que abre `/` e acaba em `/login`, continua válido.
- **IDs de campus permitidos** em configuração: `ALLOWED_CAMPUS_IDS=38,58`
  (Lisboa e Porto, confirmados no ADR 0003).

## Interface

Fixada pelos testes de aceitação. Os handlers recebem e devolvem objetos
`Request`/`Response` padrão e todas as dependências são injetadas: o contrato
corre sem rede, sem BD e sem a 42 real. As rotas do Next limitam-se a ligá-los.

```ts
// src/auth/handlers.ts
import type { Profile, Result } from '../intra/client.js';

export const SESSION_COOKIE = 'dh_session';
export const STATE_COOKIE = 'dh_oauth_state';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // AC9

export interface AuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string; // ex.: http://localhost:3000/auth/callback
  allowedCampusIds: readonly number[];
  secureCookies: boolean; // true fora de localhost
}

/** Persistência. Em produção: Drizzle sobre PostgreSQL. */
export interface SessionStore {
  upsertUser(user: { intraId: number; login: string; campusId: number }): Promise<{
    userId: string;
  }>;
  createSession(session: { idHash: string; userId: string; expiresAt: number }): Promise<void>;
  findSession(idHash: string): Promise<{ userId: string; expiresAt: number } | null>;
  renewSession(idHash: string, expiresAt: number): Promise<void>;
  deleteSession(idHash: string): Promise<void>;
  /** Apaga o utilizador e tudo o que lhe pertence (sessões incluídas). AC7. */
  deleteUser(userId: string): Promise<void>;
}

export interface AuthDeps {
  config: AuthConfig;
  clock: { now(): number }; // ms
  randomToken: () => string; // em produção: 32 bytes aleatórios, base64url
  /** POST /oauth/token da 42. O refresh token, se vier, é descartado. */
  exchangeCode: (code: string) => Promise<{ ok: true; accessToken: string } | { ok: false }>;
  /** Perfil do utilizador, via cliente do WI-0003. */
  fetchProfile: (accessToken: string) => Promise<Result<Profile>>;
  store: SessionStore;
}

/** GET /auth/login → 302 para o authorize da 42, com cookie de state. */
export function handleLogin(req: Request, deps: AuthDeps): Promise<Response>;
/** GET /auth/callback → 302 para / com sessão, ou para /login?error=… sem sessão. */
export function handleCallback(req: Request, deps: AuthDeps): Promise<Response>;
/** POST /auth/logout → apaga a sessão no servidor, limpa o cookie, 303 para /login. */
export function handleLogout(req: Request, deps: AuthDeps): Promise<Response>;
/** POST /account/delete → apaga o utilizador, limpa o cookie, 303 para /login. */
export function handleDeleteAccount(req: Request, deps: AuthDeps): Promise<Response>;
/** Sessão válida do pedido, renovando o prazo; null se não houver. */
export function getSession(req: Request, deps: AuthDeps): Promise<{ userId: string } | null>;
```

Comportamento:

- **`handleLogin`** redireciona para `https://api.intra.42.fr/oauth/authorize`
  com `client_id`, `redirect_uri`, `response_type=code`, `scope=public` e um
  `state` aleatório. O `state` também vai para o cookie `dh_oauth_state`
  (`HttpOnly`, `SameSite=Lax`, 10 minutos).
- **`handleCallback`** exige que o `state` da query seja igual ao do cookie.
  Qualquer falha (parâmetro `error`, `state` errado, troca do código, perfil)
  leva a `/login?error=oauth`. Um campus principal fora de
  `allowedCampusIds` leva a `/login?error=campus`. Em ambos os casos não se
  cria sessão. Em caso de sucesso: `upsertUser`, `createSession` e cookie
  `dh_session` (`HttpOnly`, `SameSite=Lax`, `Path=/`, `Max-Age` de 30 dias,
  `Secure` quando `secureCookies`).
- O cookie leva o token aleatório. A BD só guarda o **hash** (SHA-256) dele.
- **`handleLogout`** e **`handleDeleteAccount`** respondem com **303** para
  `/login` (o browser segue com GET depois do POST) e limpam o cookie.
  Sem sessão válida, o apagamento não apaga nada.
- **Verificação de `Origin`** nos POST: um `Origin` presente e diferente da
  origem da app (a do `redirectUri`) dá 403, sem efeitos. Sem `Origin`, a
  proteção é o `SameSite=Lax`.
- **Renovação:** o prazo só se escreve na BD quando avança mais de 1 hora;
  nesse caso o proxy reenvia o cookie com o `Max-Age` novo. Uma sessão
  expirada apaga-se quando é lida, e cada `createSession` apaga as já
  expiradas (ADR 0007).

Páginas (`src/app/`), com todo o texto em `src/i18n/messages/en.ts`:

- `/login`: link com o texto `en.login.signIn` para `/auth/login`. Com
  `?error=campus` mostra `en.login.errors.campus`; com `?error=oauth` mostra
  `en.login.errors.oauth`. O link para tentar de novo está sempre presente.
- `/privacy`: pública. Mostra `en.privacy.title` e cada item de
  `en.privacy.items` (`{ data, purpose }[]`): os dados guardados e para que
  servem. Tem um link para `/account`.
- `/account`: protegida. Confirmação do apagamento (AC7): lista o que é
  apagado (`en.privacy.items`) e um form com `en.account.confirm`
  ("Yes, delete my account") que faz POST para `/account/delete`, mais um
  link para voltar sem apagar. Não há `page.tsx` em `/account/delete`: o Next
  não deixa ter página e route handler no mesmo caminho.
- `/` (página inicial): botão `en.home.signOut` ("Sign out"), num form que
  faz POST para `/auth/logout`.
- O proxy do Next (`src/proxy.ts`) manda para `/login` qualquer pedido sem
  sessão, exceto `/login`, `/privacy`, `/auth/*` e os assets.

## Fora de âmbito

Outros métodos de login, perfis de administração, contas de outros campus,
partilha pública de perfis, exportação de dados, sincronização do Passaporte
(WI-0005).

## Notas para o agente

- **Pré-requisito humano:** registar `http://localhost:3000/auth/callback`
  como redirect URI da aplicação na Intra e pôr `CLIENT_ID`, `CLIENT_SECRET`,
  `ALLOWED_CAMPUS_IDS` e a URL da BD no `.env` (fora do git). Nunca no
  repositório (regra 6). Os testes não dependem destas credenciais.
- Regras duras 9 e 10. Base legal: execução do serviço que o utilizador
  pediu (ADR 0003). **O texto da página de privacidade é revisto pelo humano**,
  e a lista tem de bater com as tabelas que criares.
- A configuração lê-se do ambiente com Zod quando é precisa, não no arranque:
  `/login` e `/privacy` têm de funcionar mesmo sem as variáveis definidas
  (o e2e corre assim).
- O cliente do WI-0003 é só GET (AC8 dele). A troca do código (POST
  `/oauth/token`) vive em `src/auth/`, não no cliente. O `CLIENT_SECRET` e os
  tokens nunca vão para logs nem para mensagens de erro.
- AC7 no contrato só prova que o handler pede o apagamento e que a sessão
  morre. O apagamento real na BD (sem restos, em cascata) cobre-se com testes
  de integração em PGlite.
- Depende de WI-0002 e WI-0003.
