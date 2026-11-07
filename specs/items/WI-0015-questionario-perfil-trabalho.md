---
id: WI-0015
title: Questionário de perfil de trabalho
status: done
track: WT-0004
owner: Magalvo
acceptance:
  - AC1: um utilizador autenticado responde a um questionário com uma pergunta por dimensão do WI-0014, todas de resposta fechada e todas opcionais
  - AC6: as respostas nunca são mostradas a outras pessoas; os outros veem só a pontuação e as razões
  - AC2: as respostas guardam-se num perfil de trabalho que o próprio pode editar e apagar; apagar a conta apaga-o
  - AC3: as respostas entram por um schema Zod; um valor fora das opções é rejeitado
  - AC4: o questionário funciona sem JavaScript (formulário POST) e protege-se contra pedidos de outros sites
  - AC5: cada pergunta tem rótulo acessível e navega-se só com o teclado
  - AC7: a página de privacidade lista o perfil de trabalho, o que se guarda e que só o próprio vê as respostas
  - AC8: o menu tem o item Tavern, que leva ao questionário
---

# WI-0015 — Questionário de perfil de trabalho

## Problema

O algoritmo (WI-0014) precisa de saber como cada pessoa gosta de trabalhar, e
a API da 42 não tem esses dados.

## Proposta

Um questionário curto, amigável e fechado em `/tavern/profile`, que preenche
o `WorkProfile` do WI-0014. Sem texto livre. Cada pergunta pode ficar sem
resposta (conta como dimensão em falta).

Perguntas propostas (dimensões do WI-0014): horário (períodos do dia,
escolha múltipla), quando quero começar, ritmo, ambição de nota, estilo,
presencial/remoto, papel.

Decisões do humano (2026-11-07):

- Cada pergunta de escolha única tem a opção "Prefer not to say" (valor
  `""`), marcada quando não há resposta.
- Guardar sem nenhuma resposta apaga o perfil (não fica linha vazia).
- **Apagar funciona sempre** (direito de apagar): não olha para as respostas.
- Qualquer pessoa com sessão responde, mesmo sem Passaporte.
- Item "Tavern" no menu, depois do Duck Pond, para `/tavern/profile` (no
  WI-0017 passa para `/tavern`).

## Interface

**BD** — `work_profiles` (migração `0007_work_profiles`):

| Coluna                                                    | Tipo                                                      |
| --------------------------------------------------------- | --------------------------------------------------------- |
| `user_id`                                                 | `uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE` |
| `periods`                                                 | `text[] NOT NULL DEFAULT '{}'`                            |
| `start`, `grade_goal`, `pace`, `style`, `setting`, `role` | `text NULL` (NULL = sem resposta)                         |
| `updated_at`                                              | `timestamptz NOT NULL DEFAULT now()`                      |

```ts
// src/tavern/profile.ts
export type WorkAnswers = Omit<WorkProfile, 'login'>;

/**
 * Zod. "" ou ausente = sem resposta. null se: valor fora das opções (sem trim
 * nem minúsculas), pergunta de escolha única repetida, período vazio ou
 * desconhecido, ou qualquer valor que seja ficheiro. Ignora campos que não são
 * perguntas (intent). Períodos sem repetidos, pela ordem do dia; nenhum = sem a chave.
 */
export function answersFromForm(form: FormData): WorkAnswers | null;

// src/tavern/store.ts
export interface WorkProfileStore {
  get(userId: string): Promise<WorkAnswers | null>; // a linha passa por Zod
  save(userId: string, answers: WorkAnswers): Promise<void>; // substitui tudo; vazio apaga
  delete(userId: string): Promise<void>; // idempotente
}
export function createDrizzleWorkProfileStore(db: Db): WorkProfileStore;
```

**POST `/tavern/profile/answers`** — campos `periods` (checkboxes), `start`,
`gradeGoal`, `pace`, `style`, `setting`, `role` (rádios) e `intent` (`save`
no botão de guardar; `delete` num form à parte; sem intent = save). Por esta
ordem:

| Caso                                   | Resposta                               |
| -------------------------------------- | -------------------------------------- |
| Origin de outro site                   | 403                                    |
| sem sessão                             | 303 `/login`                           |
| intent desconhecido, repetido ou vazio | 400                                    |
| `delete` (sem olhar para as respostas) | apaga, 303 `/tavern/profile?deleted=1` |
| `save` com respostas inválidas         | 400                                    |
| `save` sem nenhuma resposta            | apaga, 303 `/tavern/profile?deleted=1` |
| `save`                                 | guarda, 303 `/tavern/profile?saved=1`  |

**Página `/tavern/profile`** (protegida): h1 `en.tavern.profile.title` e o
parágrafo `en.tavern.profile.privacy`; com `?saved=1` ou `?deleted=1`, um
`role="status"` com `saved`/`deleted`; um form POST com um `fieldset` +
`legend` (`en.tavern.profile.questions.<chave>.label`) por pergunta:
checkboxes para `periods`, rádios para as outras (uma por opção e a
`en.tavern.profile.skip`, valor `""`); botão `save`; o botão `delete` só
quando há perfil. Sem texto livre.

**Mensagens:** `shell.items.tavern`; `tavern.profile.{title, privacy, skip,
save, delete, saved, deleted}`; `tavern.profile.questions` com as chaves do
WI-0014 pela mesma ordem, cada uma com `label` e `options` (chaves = valores
do WI-0014); um item novo em `privacy.items` com "work profile".

## Fora de âmbito

Texto livre, perguntas sobre idioma ou interesses, presença no campus, mostrar
as respostas em bruto a outras pessoas.

## Notas para o agente

- Depende do WI-0014 (tipos).
- POST com a defesa do WI-0004 (SameSite=Lax e verificação de Origin).
- Decisões do humano (2026-11-07): ficam as 7 dimensões (o limite de 6 era
  indicativo); os outros veem só a pontuação e as razões, nunca as respostas.
- Textos do questionário: rascunho do Claude, revisto pelo humano no PR.
