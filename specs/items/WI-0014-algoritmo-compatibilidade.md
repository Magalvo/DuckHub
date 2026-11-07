---
id: WI-0014
title: Algoritmo de compatibilidade
status: done
track: WT-0004
owner: Magalvo
acceptance:
  - AC1: a compatibilidade entre duas pessoas é um inteiro em [0,100], para quaisquer perfis de trabalho
  - AC2: a compatibilidade é simétrica — compatibility(a, b) e compatibility(b, a) dão a mesma pontuação e as mesmas razões
  - AC3: uma dimensão sem resposta de qualquer das duas pessoas não conta; os pesos das dimensões restantes renormalizam (voltam a valer 100)
  - AC4: sem nenhuma dimensão respondida pelas duas, a pontuação é 0 e não há razões
  - AC5: a semelhança e o peso de cada dimensão seguem a tabela da spec; no papel ganha o complemento (liderar com seguir) e não a igualdade
  - AC6: cada razão vem de um catálogo fixo com texto em inglês no ficheiro de mensagens, e só aparece quando a regra da tabela a dá
  - AC7: a ordenação de candidatos é pela pontuação inteira decrescente com empates desfeitos pelo login (ordem crescente), exclui a própria pessoa e não depende da ordem de entrada
  - AC8: para as mesmas entradas o resultado é sempre o mesmo (função pura, sem relógio nem aleatoriedade)
---

# WI-0014 — Algoritmo de compatibilidade

## Problema

Para sugerir com quem fazer um projeto, é preciso comparar duas pessoas pela
forma como trabalham. Essa comparação tem de ser previsível, explicável e
testável, e não pode depender de onde vêm os dados (questionário hoje,
presença talvez amanhã).

## Proposta

Uma função pura `compatibility(a, b)` sobre dois perfis de trabalho devolve
uma pontuação inteira de 0 a 100 e as razões. A pontuação é a média ponderada
das semelhanças por dimensão, só sobre as dimensões que as duas pessoas
responderam (os pesos renormalizam), arredondada uma única vez no fim. Uma
segunda função ordena candidatos. Não há UI nem BD neste WI. Decisões no
ADR 0015.

Decisões do humano (2026-11-07):

- **Pontuação inteira** (no espírito da regra dura 5): pesos em pontos
  inteiros que somam 100; arredonda-se uma vez, no fim; ordena-se e desempata-se
  sobre o inteiro.
- **Horário por sobreposição** |A∩B| / min(|A|,|B|), para não castigar quem
  tem horário flexível.
- **"Começar" é peso**, não filtro.

## Interface

```ts
// src/tavern/compatibility.ts
export type DayPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

/** Perfil de trabalho. Campo ausente = sem resposta. */
export interface WorkProfile {
  login: string;
  /** Vazio = sem resposta. Repetidos contam uma vez. A origem não interessa aqui. */
  periods?: readonly DayPeriod[];
  start?: 'this-week' | 'two-weeks' | 'no-rush';
  gradeGoal?: 'pass' | 'bonus' | 'max';
  pace?: 'sprint' | 'steady' | 'relaxed';
  style?: 'pair' | 'split' | 'mixed';
  setting?: 'on-site' | 'hybrid' | 'remote';
  role?: 'lead' | 'follow' | 'either';
}

export type ReasonId =
  | 'shared-hours'
  | 'same-start'
  | 'same-grade-goal'
  | 'same-pace'
  | 'same-style'
  | 'same-setting'
  | 'complementary-roles';

export interface Compatibility {
  /** Inteiro em [0,100]. */
  score: number;
  /** Pela ordem da tabela, sem repetidos. */
  reasons: readonly ReasonId[];
}

export function compatibility(a: WorkProfile, b: WorkProfile): Compatibility;

export interface RankedCandidate {
  login: string;
  compatibility: Compatibility;
}

/**
 * Candidatos ordenados por score desc e login asc (comparação de strings
 * por code units, sem locale). Exclui quem tem o login de `me`.
 * Pré-condição: os logins dos candidatos são únicos.
 */
export function rankCandidates(
  me: WorkProfile,
  candidates: readonly WorkProfile[]
): RankedCandidate[];
```

Os textos das razões ficam em `src/i18n/messages/en.ts`, em
`en.tavern.reasons`, um texto por `ReasonId`.

## Tabela das dimensões

Pela ordem da tabela (é também a ordem das razões):

| Dimensão    | Pontos | Semelhança                                                                                       | Razão (quando)                           |
| ----------- | -----: | ------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `periods`   |     25 | sobreposição: \|A∩B\| / min(\|A\|,\|B\|)                                                         | `shared-hours` se A∩B não é vazio        |
| `start`     |     20 | ordinal `this-week` < `two-weeks` < `no-rush`: igual 1, vizinho ½, extremos 0                    | `same-start` se igual                    |
| `gradeGoal` |     20 | ordinal `pass` < `bonus` < `max`: igual 1, vizinho ½, extremos 0                                 | `same-grade-goal` se igual               |
| `pace`      |     10 | ordinal `sprint` < `steady` < `relaxed`: igual 1, vizinho ½, extremos 0                          | `same-pace` se igual                     |
| `style`     |     10 | igual 1; `mixed` com outro ½; `pair` com `split` 0                                               | `same-style` se igual                    |
| `setting`   |     10 | igual 1; `hybrid` com outro ½; `on-site` com `remote` 0                                          | `same-setting` se igual                  |
| `role`      |      5 | **complemento:** `lead`+`follow` 1; `either` com qualquer ½; `lead`+`lead` e `follow`+`follow` 0 | `complementary-roles` se `lead`+`follow` |

**Pontuação:** com D = dimensões respondidas pelas duas pessoas,
`score = arredonda(100 × Σ_D pontos·semelhança / Σ_D pontos)`, com
arredondamento ao inteiro mais próximo e .5 para cima. Se D é vazio, 0.

## Exemplos (para o contrato)

| a                                     | b                                             | score | razões                                  |
| ------------------------------------- | --------------------------------------------- | ----: | --------------------------------------- |
| tudo igual, `role: 'either'` nos dois | igual                                         |    98 | as 6 `same-*`/`shared-hours`, sem papel |
| tudo igual, `role: 'lead'`            | tudo igual, `role: 'follow'`                  |   100 | as 7                                    |
| só `periods: ['morning','evening']`   | só `periods: ['evening']`                     |   100 | `shared-hours`                          |
| só `periods: ['morning','afternoon']` | só `periods: ['afternoon','evening','night']` |    50 | `shared-hours`                          |
| só `pace: 'sprint'`                   | só `pace: 'relaxed'`                          |     0 | —                                       |
| só `pace: 'sprint'`                   | só `style: 'pair'`                            |     0 | — (AC4)                                 |

O primeiro exemplo dá 97,5, que arredonda para 98.

## Fora de âmbito

De onde vêm os perfis (WI-0015), filtros de projeto e campus (WI-0017),
presença (WI-0016), formar grupos de 3+ pessoas, aprender pesos com dados,
validação Zod da entrada (fica na fronteira, no WI-0015).

## Notas para o agente

- Testes de propriedades (fast-check) para AC1, AC2, AC3, AC7 e AC8; os
  exemplos da tabela nos testes unitários.
- AC3 em propriedade: acrescentar a uma pessoa uma dimensão que a outra não
  respondeu não muda a pontuação.
- **Sem floats na conta:** todas as semelhanças são múltiplos de 1/12
  (denominadores 1, 2, 3, 4), por isso a soma faz-se em inteiros (doze avos)
  e o arredondamento é uma divisão inteira. A simetria e o .5 ficam exatos.
