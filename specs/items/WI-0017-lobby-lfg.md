---
id: WI-0017
title: Lobby LFG por projeto
status: done
track: WT-0004
owner: Magalvo
acceptance:
  - AC1: um utilizador só entra no lobby de um projeto de grupo em que a API diz que está inscrito; entrar é sempre uma ação explícita
  - AC2: os estados searching_a_group e creating_group aparecem só ao próprio, como sugestão de lobby
  - AC3: no lobby, a pessoa vê só quem está no mesmo lobby e no mesmo campus, ordenado pelo algoritmo do WI-0014, com as razões
  - AC4: quem não está no lobby nunca é mostrado, e o projeto de quem está só é visível a quem está no mesmo lobby
  - AC5: a pessoa pode sair do lobby; a entrada expira sozinha 14 dias depois
  - AC6: cada sugestão mostra o login com ligação ao Passaporte, para o contacto acontecer fora da app
  - AC7: entrar e sair funcionam sem JavaScript (formulário POST) e protegem-se contra pedidos de outros sites
  - AC8: quem tem o Passaporte escondido não pode entrar no lobby, e escondê-lo tira-o dos lobbies em que estava
---

# WI-0017 — Lobby LFG por projeto

## Problema

Quem precisa de equipa não sabe quem mais está à procura para o mesmo projeto,
nem com quem trabalharia bem.

## Proposta

Em `/tavern`, a pessoa vê os seus projetos de grupo (da API) e entra no lobby
de um. Dentro, vê as outras pessoas do mesmo lobby e campus, ordenadas por
compatibilidade (WI-0014), com as razões. Sentido único: o contacto é pelo
login. Sair ou deixar passar 14 dias tira a pessoa do lobby.

Decisões do humano (2026-11-07):

- **Projeto de grupo** = `project_session` com `solo: false` (confirmado numa
  resposta real da API). O `max_people` vem sempre a `null`.
- **Quem não tem perfil de trabalho entra**, com um aviso; os outros veem-no
  com 0 %.
- Cada sugestão mostra `<N>% match` e as razões.
- As entradas em projetos onde a pessoa já não está inscrita, e as expiradas,
  saem na sincronização do Passaporte (ADR 0016).
- Com o Passaporte escondido, `/tavern` mostra só o aviso, sem a lista.

## Interface

**BD** (migração `0008_lobby`): `project_xp.solo boolean NOT NULL DEFAULT true`;
`lobby_entries (user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
project_slug text NOT NULL, joined_at timestamptz NOT NULL DEFAULT now(),
PRIMARY KEY (user_id, project_slug))`.

**API e cache:** as `project_sessions` ganham `solo` (boolean nullable, pode
faltar); `soloFor(project, { campusId, cursusId })` em `src/intra/schemas.ts`
(session do campus e cursus, senão a sem campus; sem session ou `null` → a
solo). `CursusProject`, `ProjectXp`, a store e o `fetchFromApi` levam o `solo`.

```ts
// src/tavern/lobby.ts
export const LOBBY_STATUSES: readonly string[]; // in_progress, searching_a_group, creating_group
export const LOBBY_TTL_DAYS = 14;
export interface LobbyProject {
  slug: string;
  name: string;
  suggested: boolean;
}
/** Projetos do snapshot em LOBBY_STATUSES e com solo false, pela ordem do catálogo. */
export function lobbyProjects(
  snapshot: PassportSnapshot | null,
  catalog: readonly { slug: string; solo: boolean }[]
): LobbyProject[];
```

**`createDrizzlePassportStore`:** `save` apaga, na mesma transação, as
entradas da pessoa cujo slug não está no snapshot novo com um estado de
`LOBBY_STATUSES`, e as expiradas de toda a gente; `setHidden(true)` apaga
todas as entradas da pessoa.

**POST `/tavern/lobby`** — campos `intent` (`join`/`leave`) e `project` (slug,
`/^[a-z0-9][a-z0-9_-]*$/`, um só). Por esta ordem:

| Caso                                                          | Resposta                             |
| ------------------------------------------------------------- | ------------------------------------ |
| Origin de outro site                                          | 403                                  |
| sem sessão                                                    | 303 `/login`                         |
| intent ou project inválidos, em falta ou repetidos            | 400                                  |
| `leave`                                                       | apaga, 303 `/tavern`                 |
| `join` com o Passaporte escondido ou fora dos `lobbyProjects` | 403                                  |
| `join`                                                        | cria ou renova, 303 `/tavern/<slug>` |

**Página `/tavern`:** h1 `en.tavern.lobby.title`; ligação `editProfile` para
`/tavern/profile`; sem perfil, `noProfile`; com o Passaporte escondido, só
`hiddenPassport`; senão, uma lista (`projectsLabel`) com um item por projeto:
o nome, `suggested` se for sugestão e, dentro do lobby, a ligação `open` e o
botão `leave`; fora, o botão `join`. Sem projetos, `noProjects`.

**Página `/tavern/[slug]`:** 404 a não ser que o Passaporte esteja visível, o
slug esteja nos `lobbyProjects` da pessoa e a entrada tenha menos de 14 dias.
h1 com o nome do projeto; uma lista (`membersLabel`) com os outros membros
(mesmo slug e campus, entrada válida, Passaporte visível), ordenados com
`rankCandidates`; cada um com a ligação para `/u/<login>`, `<N>% match` e as
razões (`en.tavern.reasons`). Vazio → `empty`.

**Menu:** o item Tavern leva a `/tavern`. **Mensagens:** `tavern.lobby.*` e
um item novo em `privacy.items` sobre os lobbies.

## Fora de âmbito

Interesse mútuo, mensagens, notificações, formar o grupo completo, campus
diferentes, presença.

## Notas para o agente

- Depende do WI-0014 e do WI-0015.
- "Projeto de grupo" sai da `project_session` do campus (tamanho da equipa);
  confirmar no schema da Intra antes de desenhar.
- Decisão do humano (2026-11-07): quem tem o Passaporte escondido (WI-0009)
  não pode entrar no lobby (AC8); esconder o Passaporte tira a pessoa dos
  lobbies em que estava.
- Expiração: o mesmo mecanismo de prazo que os eventos do feed (WI-0012).
