---
id: WI-0005
title: Passaporte do próprio utilizador
status: done
track: WT-0002
owner: Magalvo
acceptance:
  - AC1: o Passaporte mostra login, foto, campus, mês e ano da Piscine, coalition e nível do cursus principal com duas casas decimais, tal como vêm da API
  - AC2: um utilizador marcado como Alumni na API mostra a distinção Alumni e quem não está marcado não a mostra
  - AC3: um utilizador só com o cursus da Piscine vê um Passaporte reduzido com a Piscine e os projetos dela, sem secções que dependam do 42cursus
  - AC4: a cor de destaque do Passaporte é a cor da coalition do utilizador e, sem coalition, é o Cyber-Teal
  - AC5: os projetos concluídos aparecem com a nota final, distinguidos visualmente dos projetos em curso e dos falhados
  - AC6: os dados são sincronizados com a API a cada login e o Passaporte mostra a data e hora da última sincronização
  - AC7: um utilizador autenticado só consegue ver o seu próprio Passaporte
  - AC8: a página não pede nem mostra dados de presença no campus
  - AC9: o Passaporte é navegável só com teclado e não tem violações de acessibilidade de nível AA numa verificação automática
---

# WI-0005 — Passaporte do próprio utilizador

## Problema

É o coração do primeiro incremento. Depois do login, o aluno tem de ver o seu
percurso na 42 sem ter preenchido nada.

## Proposta

Página do Passaporte em `/`, que lê o snapshot guardado na última
sincronização. Layout inspirado no cabeçalho do dashboard _minimal_, com
números em JetBrains Mono e o roxo Synth-Purple na distinção Alumni
(`docs/canonical/design.md`). Decisões do humano (2026-11-04), a registar num
ADR novo no mesmo branch:

- **Snapshot JSONB.** Tabela `passports` (`user_id` com `ON DELETE CASCADE`,
  `snapshot` JSONB, `synced_at`). O snapshot valida-se com Zod ao ler.
- **Sincronização no callback do login**, o único momento com token:
  `AuthDeps` ganha `syncPassport`. Se falhar, o login conclui-se na mesma e o
  Passaporte mostra o snapshot anterior, com a data dele. Nunca se guarda um
  snapshot parcial. Sem snapshot, a página diz que ainda não sincronizou.
- **Cor da coalition só decorativa** (borda, barra, glow). O texto usa sempre
  os tokens do tema. Sem coalition, o acento é o Cyber-Teal `#00BABC`. Com
  várias coalitions, usa-se a primeira que a API devolve.
- **Data da sincronização** em `Europe/Lisbon`, formato `AAAA-MM-DD HH:mm`.
- **Nível** com duas casas decimais, **truncado** e não arredondado: 5.179
  mostra 5.17, para nunca mostrar um nível que ainda não se atingiu.
- **Cursus principal:** `42cursus` (igualdade exata). Sem ele, o Passaporte
  é reduzido e o cursus mostrado é `c-piscine`; sem esse, o primeiro cujo
  slug contém `piscine`. Slugs confirmados com uma chamada real
  (2026-11-05): `42cursus` (id 21) e `c-piscine` (id 9). Há mais de 20 cursus
  com `piscine` no slug (`discovery-piscine-*`, `piscine-embedded`,
  `java-piscine`, `piscine-c`, …) e um `42cursus-warmup-sp`, que não conta
  como 42cursus.
- **Estado dos projetos:** concluído = `finished` e `validated? = true`;
  falhado = `finished` e `validated? = false`; em curso = tudo o resto.
- **Nomes dos projetos originais.** A tradução "mundo real" (WI-0006) entra
  depois, sem mudar este contrato.
- **E2e com sessão em PGlite.** Antes de o Playwright arrancar a app, o seed
  do contrato (`tests/acceptance/e2e/seed.mjs`) cria uma BD PGlite em disco
  com utilizadores, sessões e Passaportes sintéticos. A app usa-a com
  `DATABASE_URL=pglite:<pasta>`, aceite só fora de produção.

## Interface

Fixada pelos testes de aceitação.

```ts
// src/passport/passport.ts — funções puras
import type { Coalition, Profile, ProjectUser } from '../intra/client.js';

export const DEFAULT_ACCENT = '#00BABC'; // Cyber-Teal (AC4)

/** O que se guarda em passports.snapshot (JSONB). */
export interface PassportSnapshot {
  login: string;
  imageUrl: string | null;
  campus: string;
  piscine: { month: string; year: number };
  isAlumni: boolean;
  coalition: { name: string; color: string } | null;
  cursus: { slug: string; name: string; level: number }[];
  projects: {
    slug: string;
    name: string;
    status: string;
    finalMark: number | null;
    validated: boolean | null;
  }[];
}

export type ProjectState = 'done' | 'failed' | 'in-progress';

/** O que a página mostra. */
export interface PassportView {
  login: string;
  imageUrl: string | null;
  campus: string;
  piscine: { month: string; year: number };
  isAlumni: boolean;
  coalitionName: string | null;
  accentColor: string; // cor da coalition ou DEFAULT_ACCENT
  reduced: boolean; // sem 42cursus (AC3)
  mainCursus: { name: string; level: string } | null; // level: "5.17"
  projects: { slug: string; name: string; state: ProjectState; finalMark: number | null }[];
  syncedAt: string; // "AAAA-MM-DD HH:mm", Europe/Lisbon
}

export function buildSnapshot(
  profile: Profile,
  coalitions: Coalition[],
  projects: ProjectUser[]
): PassportSnapshot;
export function passportView(snapshot: PassportSnapshot, syncedAt: number): PassportView;
```

```ts
// src/passport/sync.ts
export interface PassportStore {
  save(userId: string, snapshot: PassportSnapshot, syncedAt: number): Promise<void>;
  load(userId: string): Promise<{ snapshot: PassportSnapshot; syncedAt: number } | null>;
}

/** Nunca lança. Se algum pedido falhar, não guarda nada. */
export function createPassportSync(deps: {
  client: (accessToken: string) => Pick<IntraClient, 'coalitions' | 'projectsUsers'>;
  store: PassportStore;
  clock: { now(): number };
}): AuthDeps['syncPassport'];
```

```ts
// src/auth/handlers.ts — AuthDeps ganha:
/** Chamado no callback depois de criar o utilizador; uma falha não impede o login. */
syncPassport: (input: { accessToken: string; userId: string; profile: Profile }) => Promise<void>;
```

**Base de dados** (o seed do e2e escreve-a diretamente):

- `passports(user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
snapshot jsonb NOT NULL, synced_at timestamptz NOT NULL)`;
- `sessions.id_hash` é o SHA-256 do token do cookie, em hexadecimal.

**Página `/`** (com sessão), todo o texto em `src/i18n/messages/en.ts`:

- `<section aria-labelledby=…>` com a variável CSS `--accent` igual a
  `accentColor`;
- o login como título (`heading`), a foto com `alt` = `en.passport.photoAlt`,
  o campus, a Piscine (`month` e `year`), a coalition e o nível;
- `en.passport.alumni` só para Alumni; `en.passport.reduced` só no Passaporte
  reduzido;
- a lista de projetos (`list` > `listitem`), cada um com o nome, o rótulo do
  estado (`en.passport.states.done | failed | inProgress`) e, se concluído, a
  nota final;
- `en.passport.syncedAt` seguido da data;
- sem snapshot: `en.passport.notSynced`.

## Fora de âmbito

Ver o Passaporte de outras pessoas, partilha pública ou para recrutadores
(quando vier: visível à comunidade por omissão, link público opt-in, ADR
0003), radar de skills, badges, lanyard, `blackholed_at`, logtime, edição
manual de dados, sincronização em background, tradução "mundo real" (WI-0006).

## Notas para o agente

- Regras duras 9 a 12. A distinção Alumni vem só de `alumni?`: não há
  autodeclaração.
- **A `/privacy` tem de listar o que o snapshot guarda** (ADR 0007).
- **Propostas a guardrails:** `playwright.config.ts` (o `webServer` corre o seed
  antes da app, numa porta própria, com `DATABASE_URL=pglite:…` e variáveis de
  ambiente sintéticas), `.gitignore` (a pasta da BD do e2e),
  `eslint.config.js` (o `seed.mjs` do contrato entra no bloco dos scripts de
  Node, sem type-checking) e o que mais for preciso no `package.json`.
- O contrato do WI-0004 ganha uma linha (`syncPassport` no-op no `setup()`):
  é o humano que a faz.
- Slugs `42cursus` e `c-piscine` confirmados com uma chamada real
  (2026-11-05). Continua por confirmar a ordem das coalitions quando há mais
  do que uma.
- Depende de WI-0003 e WI-0004.
