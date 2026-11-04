---
id: WI-0003
title: Cliente só de leitura da API da 42
status: done
track: WT-0002
owner: Magalvo
acceptance:
  - AC1: uma resposta válida de /v2/me é convertida num perfil tipado com login, imagem, campus principal, mês e ano da Piscine, indicação de Alumni e os cursus do utilizador com o respetivo nível
  - AC2: as coalitions e os projects_users do utilizador são convertidos em listas tipadas com nome, cor, slug, estado e nota final
  - AC3: uma resposta com campos obrigatórios em falta ou com tipos errados é rejeitada com um erro explícito e nunca produz um perfil parcial
  - AC4: o cliente nunca ultrapassa 2 pedidos por segundo nem 1200 pedidos por hora
  - AC5: perante HTTP 429 o cliente espera antes de repetir, usando Retry-After quando vier na resposta, e repete no máximo 3 vezes antes de falhar com um erro de rate limit
  - AC6: listas paginadas são lidas até à última página seguindo o header Link
  - AC7: o XP de um projeto é obtido do campo difficulty, usando o valor da project_session do mesmo campus e cursus do utilizador quando existir e não for nulo; caso contrário, a difficulty do projeto
  - AC8: o cliente só faz pedidos GET
  - AC9: as mensagens de erro e os logs do cliente nunca incluem o token de acesso nem o corpo da resposta da API
---

# WI-0003 — Cliente só de leitura da API da 42

## Problema

Todo o produto depende da API v2 da 42, e os dados dela são input não
confiável. Sem uma fronteira única, cada funcionalidade valida (ou não) à sua
maneira, e é fácil vazar tokens ou dados pessoais para logs.

## Proposta

Criar um módulo servidor que é o único ponto de contacto com
`api.intra.42.fr`. Recebe um token, faz GETs e devolve tipos de domínio
validados por Zod:

- `/v2/me` com `cursus_users`, `campus`, `campus_users`, `alumni?`;
- `/v2/users/:id/coalitions`;
- `/v2/users/:id/projects_users`;
- `/v2/projects/:id` e as respetivas `project_sessions`, para obter a `difficulty`.

O módulo limita o ritmo dos pedidos, segue a paginação e devolve erros
tipados, sem `throw` de strings. O transporte HTTP e o relógio são
injetáveis, para os testes correrem com fixtures sintéticas, sem rede e sem
esperas reais.

## Interface

Fixada pelos testes de aceitação. O agente implementa exatamente isto em
`src/intra/client.ts`:

```ts
export interface Clock {
  now(): number; // ms
  sleep(ms: number): Promise<void>;
}
export type IntraFetch = (
  url: string,
  init: { method: string; headers: Record<string, string> }
) => Promise<Response>;

// O rate limit é por aplicação, não por utilizador: um só limiter partilhado
// por todos os clientes do processo.
export function createRateLimiter(deps: { clock: Clock }): RateLimiter;
export function createIntraClient(deps: {
  token: string;
  fetch: IntraFetch;
  clock: Clock;
  limiter: RateLimiter;
}): IntraClient;

export interface IntraClient {
  me(): Promise<Result<Profile>>;
  coalitions(userId: number): Promise<Result<Coalition[]>>;
  projectsUsers(userId: number): Promise<Result<ProjectUser[]>>;
  projectXp(
    projectId: number,
    ctx: { campusId: number; cursusId: number }
  ): Promise<Result<number>>;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: IntraError };
export type IntraError =
  | { kind: 'invalid-response'; issues: string[] } // AC3
  | { kind: 'rate-limited' } // AC5
  | { kind: 'http'; status: number }
  | { kind: 'network' };

export interface Profile {
  id: number;
  login: string;
  imageUrl: string | null;
  primaryCampus: { id: number; name: string };
  piscine: { month: string; year: number }; // month como vem da API ("september")
  isAlumni: boolean;
  cursus: { id: number; slug: string; name: string; level: number }[];
}
export interface Coalition {
  id: number;
  name: string;
  slug: string;
  color: string;
}
export interface ProjectUser {
  projectId: number;
  name: string;
  slug: string;
  status: string; // como vem da API ("finished", "in_progress", ...)
  finalMark: number | null;
  validated: boolean | null;
}
```

O cliente nunca lança exceções para o chamador: todas as falhas vêm como
`{ ok: false, error }`.

## Fora de âmbito

OAuth e obtenção do token (WI-0004), persistência, `/v2/locations`,
`/v2/scale_teams`, `/v2/levels` e `/v2/alumnized_users` (exigem papéis de
staff), sincronização em background.

## Notas para o agente

- Regras duras 4, 9 e 10. **Fixtures só com dados inventados**, nunca
  respostas reais da Intra, nem as tuas.
- Factos confirmados na apidoc (consultada a 2026-10-29):
  - rate limit por omissão de 2 pedidos/s e 1200/h por aplicação;
  - paginação de 30 itens por omissão, até 100 com `page[size]`, com links no
    header `Link`;
  - campus principal = `campus_users[].is_primary`;
  - Alumni = `alumni?` em `/v2/me`;
  - XP do projeto = `difficulty`.
- A doc **não** menciona `Retry-After`; o AC5 trata-o como opcional. Sem ele,
  o backoff é escolha do agente: o contrato só exige que espere.
- No AC3 também conta como inválido: nenhum `campus_users` com
  `is_primary: true`, e um `pool_year` que não seja um ano de 4 dígitos.
- Os exemplos da apidoc são antigos e incompletos (não têm, por exemplo,
  `blackholed_at`). Confirma os campos obrigatórios com uma chamada real à tua
  conta e regista no PR o que confirmaste, **sem** colar a resposta.
- Cursus principal: o de slug `42cursus` quando existir; senão, a Piscine
  (perfil reduzido, ADR 0003).
