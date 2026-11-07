---
id: WI-0012
title: 'Duck Pond: feed de conquistas'
status: done
track: WT-0003
owner: Magalvo
acceptance:
  - AC1: em cada sincronização, a diferença entre o snapshot anterior e o novo gera um evento por projeto que passou a validado, por subida de nível inteiro no cursus principal e por badge nova
  - AC2: a primeira sincronização de uma pessoa não gera eventos do passado (não inunda o feed)
  - AC3: sincronizar duas vezes sem mudanças não gera eventos repetidos
  - AC4: em /pond, um utilizador autenticado vê os eventos dos membros visíveis, do mais recente para o mais antigo, paginados
  - AC5: os eventos de quem escondeu o Passaporte não aparecem a outras pessoas, nem os antigos
  - AC6: os eventos guardam-se só durante um prazo fixo e depois apagam-se
  - AC7: apagar a conta apaga os eventos da pessoa
  - AC8: o feed é navegável só com teclado e não tem violações de acessibilidade AA
---

# WI-0012 — Duck Pond: feed de conquistas

## Problema

A comunidade não vê o que os outros conquistam. O feed mostra-o sem ninguém
ter de escrever nada.

## Proposta

A sincronização do login (WI-0005) compara o snapshot anterior com o novo e
grava eventos (tipo, pessoa, dados mínimos, data). A página `/pond` lista os
eventos dos membros visíveis. Os eventos expiram ao fim de um prazo fixo. O
item "Duck Pond" entra na navegação.

Decisões do humano (2026-11-07):

- **Retenção de 90 dias.** Um evento mais antigo não aparece e apaga-se.
- **20 eventos por página**, do mais recente para o mais antigo.
- **A badge substitui a subida de nível quando coincidem:** se a subida para
  o nível N traz uma badge de nível com `min` N (5, 10, 15, 21), só aparece a
  badge. A primeira validação continua a dar o evento do projeto e o da badge
  (o projeto diz qual foi).
- **Um salto de vários níveis dá um só evento**, com o nível novo (3.9 → 6.1
  dá "nível 6"; a badge do nível 5 entra como badge).
- **O próprio vê os seus eventos** no feed mesmo escondido, como vê o seu
  Passaporte em `/` (WI-0009). Os outros nunca.

## Interface

```ts
// src/pond/events.ts — funções puras
import type { PassportSnapshot } from '../passport/passport.js';

export type PondEvent =
  | { kind: 'project-validated'; slug: string; name: string; finalMark: number | null }
  | { kind: 'level-up'; level: number } // inteiro ≥ 1: o nível mostrado do 42cursus, truncado
  | { kind: 'badge'; badgeId: string }; // id do catálogo do WI-0011

/** Schema de um evento guardado: só estes três tipos, objetos estritos. */
export const pondEventSchema: z.ZodType<PondEvent>;

/**
 * Os eventos de uma sincronização. Sem snapshot anterior: nenhum (AC2).
 * Ordem: projetos (pela ordem do snapshot), a subida de nível, as badges
 * (pela ordem do catálogo).
 */
export function diffEvents(previous: PassportSnapshot | null, next: PassportSnapshot): PondEvent[];
```

Regras do `diffEvents`:

- **Projeto validado:** está `done` (`projectState`) no novo e não estava
  `done` no anterior (comparado pelo `slug`). Guarda `slug`, `name` e
  `finalMark`, que já são públicos (WI-0009).
- **Subida de nível:** `Math.floor(shownLevel(...))` do `42cursus` no novo é
  maior do que no anterior (sem `42cursus` conta como 0). Um evento, com o
  nível novo, se for ≥ 1 e não houver uma badge nova de nível com esse `min`.
- **Badge nova:** está em `earnedBadges(novo)` e não em
  `earnedBadges(anterior)`.

**Base de dados** (o seed do e2e escreve-a diretamente):

```sql
pond_events (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- AC7
  event      jsonb NOT NULL,                                        -- um PondEvent
  created_at timestamptz NOT NULL DEFAULT now()
)
```

O `event` valida-se com `pondEventSchema` ao ler; um evento inválido não
aparece. Ordem do feed: `created_at DESC, id DESC`.

**Página** `/pond` (protegida pelo proxy), todo o texto em
`src/i18n/messages/en.ts`:

- uma lista (`list`, nome acessível `en.pond.listLabel`) com um `listitem`
  por evento: uma ligação para `/u/<login>` com o login como texto e a frase
  do evento:
  - projeto: `en.pond.events.projectValidated`, o nome do projeto e a nota;
  - nível: `en.pond.events.levelUp` e o número do nível;
  - badge: `en.pond.events.badge` e o nome da badge (do catálogo).
- as ligações `en.pond.previous` e `en.pond.next`, só quando há página
  anterior ou seguinte (`?page=N`; um valor inválido conta como 1);
- sem eventos: `en.pond.empty`.
- O item `en.shell.items.pond` ("Duck Pond") entra na navegação.

## Fora de âmbito

Eventos escritos por utilizadores, comentários, notificações, eventos de
projetos falhados ou em curso, feed de outros campus, Rubber Ducks (WI-0013).

## Notas para o agente

- Depende do WI-0009 (visibilidade) e do WI-0011 (badges).
- A sincronização grava o snapshot novo e os eventos na **mesma transação**,
  a partir do snapshot anterior lido nessa transação: dois logins seguidos
  sem mudanças não repetem eventos (AC3), e uma falha não deixa eventos sem
  snapshot. Um snapshot anterior inválido conta como primeira sincronização.
- Retenção (AC6): o feed nunca mostra eventos com mais de 90 dias, e os mais
  antigos apagam-se na BD (por exemplo, de forma oportunista ao gravar
  eventos, como as sessões expiradas no WI-0004).
- Um evento só guarda o necessário para o mostrar (regra 9). A `/privacy`
  ganha um item para os eventos (o que se guarda e durante quanto tempo) e o
  `en.privacy.visibility` passa a mencionar o feed (ADR 0010, decisão 7).
- O seed do e2e ganha eventos (`pondEvents`, com a idade em minutos) e um
  evento por `pinguim` (o mais novo é o `pinguim-01`). É contrato.
