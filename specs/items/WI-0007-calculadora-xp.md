---
id: WI-0007
title: Calculadora de XP
status: done
track: WT-0002
owner: Magalvo
acceptance:
  - AC1: dado um projeto e uma nota, a calculadora mostra o XP ganho, igual ao XP do projeto multiplicado pela nota e dividido por 100, arredondado para baixo
  - AC2: uma nota acima de 100 aumenta o XP ganho na mesma proporção, até à nota máxima de 125
  - AC3: notas abaixo de 0, acima de 125 ou não inteiras são rejeitadas com uma mensagem clara
  - AC4: o XP de cada projeto vem da API e a calculadora mostra a origem do valor
  - AC5: para um utilizador autenticado no 42cursus, a página mostra o nível real atual sincronizado ao lado do resultado
  - AC6: a calculadora não mostra nenhuma estimativa de nível novo nem de XP em falta para o próximo nível
  - AC7: para um utilizador só com o cursus da Piscine, a calculadora mostra que ainda não está disponível
  - AC8: uma nota maior nunca dá menos XP do que uma nota mais baixa no mesmo projeto
---

# WI-0007 — Calculadora de XP

## Problema

A comunidade usa calculadoras de XP não oficiais espalhadas por vários sítios.
O Duck Hub centraliza-a com dados verificáveis da API.

## Proposta

Página `/calculator` (protegida pelo proxy), ligada no item "XP Calculator"
da navegação, que deixa de estar marcado como "Soon". Decisões do humano
(2026-11-06):

- **Fórmula:** XP ganho = `floor(difficulty × nota / 100)`, com a nota inteira
  entre 0 e 125. Sem bónus de coalition. Referência: a lógica do
  [42calculator](https://github.com/lucas-ht/42calculator), usada só como
  fonte das regras (é GPL-3.0: nenhum código copiado).
- **Sem estimativa de nível novo** (AC6, regra 11): `/v2/levels` e
  `/v2/cursus/21/levels` respondem 403 a uma app de aluno (confirmado a
  2026-11-06). A página mostra o XP ganho e o nível real atual do Passaporte.
- **O XP vem da API com um token da aplicação** (_client credentials_, só
  dados públicos), nunca do utilizador. Um único pedido,
  `GET /v2/cursus/21/projects?filter[slug]=<slugs>&page[size]=100`, traz o
  `difficulty` e as `project_sessions` de todos os projetos do Common Core
  (confirmado a 2026-11-06). O XP de cada projeto segue a regra do WI-0003
  (`xpFor`): a sessão do campus e cursus do utilizador, senão o do projeto.
- **Cache na BD** (`project_xp`), por campus, válida 24 horas. Se o campus não
  tem linhas ou a mais antiga tem mais de 24 h, a página atualiza a cache antes
  de responder. Se a atualização falhar, mostra a cache que houver.
- **Projetos da calculadora:** os do Common Core, ou seja, os slugs da tabela
  "mundo real" (`src/passport/real-world.json`, WI-0006).
- **Sem JavaScript obrigatório:** um formulário `GET` com o projeto e a nota.
  O resultado vem do servidor, em `/calculator?project=<slug>&mark=<nota>`.

## Interface

```ts
// src/calculator/xp.ts — funções puras
export const MAX_MARK = 125;

/** floor(projectXp × mark / 100). */
export function xpGained(projectXp: number, mark: number): number;

export type MarkResult =
  { ok: true; mark: number } | { ok: false; error: 'not-integer' | 'out-of-range' };

/** Lê a nota do formulário: inteiro de 0 a MAX_MARK, com espaços à volta aceites. */
export function parseMark(input: string): MarkResult;
```

**Base de dados** (o seed do e2e escreve-a diretamente):

- `project_xp(campus_id integer, slug text, project_id integer, name text,
xp integer, fetched_at timestamptz, PRIMARY KEY (campus_id, slug))`.

**Página `/calculator`**, todo o texto em `src/i18n/messages/en.ts`:

- título `en.calculator.title`;
- um formulário `GET` com um `select` (`label` = `en.calculator.project`,
  `name="project"`, um `option` por projeto em cache, com o nome) e um campo
  numérico (`label` = `en.calculator.mark`, `name="mark"`), e um botão
  `en.calculator.submit`;
- com `project` e `mark` válidos, o resultado: `en.calculator.gained` seguido
  do XP ganho (JetBrains Mono), e a origem: `en.calculator.source` seguido da
  data da cache em `Europe/Lisbon`, `AAAA-MM-DD HH:mm`;
- ao lado, o nível real atual: `en.calculator.currentLevel` e o nível do
  Passaporte (`mainCursus.level`);
- com uma nota inválida: `en.calculator.errors.notInteger` ou
  `en.calculator.errors.outOfRange`, sem resultado;
- só com a Piscine (Passaporte reduzido) ou sem Passaporte: só
  `en.calculator.unavailable`, sem formulário.

## Fora de âmbito

Estimativa de nível novo e XP em falta (até haver fonte oficial), bónus de
coalition, simulação de vários projetos em sequência, projetos fora do Common
Core, Skill Tree, previsões de Black Hole.

## Notas para o agente

- Regra dura 11: o cálculo é determinístico e só usa dados da API. **Não**
  introduzas uma tabela de níveis de memória nem de fontes comunitárias.
- O token da aplicação vive só no servidor (regra 10), guarda-se em memória
  até expirar e nunca chega ao browser nem aos logs. O pedido do token passa
  pelo rate limiter partilhado.
- O cliente do WI-0003 ganha um método GET para a lista do cursus; o contrato
  dele não muda.
- Os testes e2e nunca chamam a 42 real: o seed enche a cache com
  `fetched_at = now()`, por isso a página não a atualiza.
- O seed do e2e ganha a cache: é contrato.
