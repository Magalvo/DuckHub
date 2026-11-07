---
id: WI-0011
title: Conquistas derivadas do snapshot
status: done
track: WT-0003
owner: Magalvo
acceptance:
  - AC1: cada badge tem uma regra que é uma função pura do snapshot do Passaporte, sem outros dados
  - AC2: a lista de badges é um ficheiro de dados versionado e validado por schema, com identificadores únicos, nome e descrição não vazios
  - AC3: o Passaporte próprio e o público mostram as badges conquistadas, com nome e descrição acessíveis
  - AC4: uma badge que depende de projetos falhados ou em curso não existe (só o positivo é público)
  - AC5: para o mesmo snapshot, as badges conquistadas são sempre as mesmas (determinismo)
---

# WI-0011 — Conquistas derivadas do snapshot

## Problema

O Passaporte mostra dados, mas não celebra nada. As badges dão reconhecimento
e alimentam o feed (WI-0012), desde que sejam verificáveis (regra dura 11).

## Proposta

Um catálogo de badges num ficheiro de dados (identificador, nome, descrição,
regra) e um avaliador puro sobre o snapshot. As regras usam só o que o
snapshot tem: projetos validados, notas, nível, Alumni, Piscine. As badges
aparecem nos dois Passaportes (próprio e público).

Decisões do humano (2026-11-06):

- **Catálogo inicial** (7 badges): primeira validação; nota máxima (125 num
  projeto validado); nível 5, 10, 15 e 21 no 42cursus; Alumni.
- **O nível conta só no 42cursus**: o nível da Piscine não dá badges. Os
  projetos validados contam todos, incluindo os da Piscine.
- **A badge Alumni chama-se "42 Alumni"**, para não se confundir com a
  etiqueta Alumni do Passaporte (contrato do WI-0005).
- **Aspeto:** etiqueta em maiúsculas monoespaçadas com um ícone comum, e a
  descrição acessível. Sem ícones desenhados por badge.
- **Textos:** os nomes e descrições do catálogo são rascunho do Claude,
  revisto pelo humano.

## Interface

```ts
// src/badges/catalog.json — lista de { id, name, description, rule }
// rule é um destes (nenhum depende de projetos falhados ou em curso, AC4):
//   { "kind": "validated-count", "min": number }  // projetos validados ≥ min
//   { "kind": "max-mark" }                       // um projeto validado com 125
//   { "kind": "level", "min": number }           // nível do 42cursus ≥ min
//   { "kind": "alumni" }                         // isAlumni

// src/badges/badges.ts
export interface Badge {
  id: string;
  name: string;
  description: string;
}

/** Schema do catálogo: ids únicos, textos não vazios, só os tipos de regra acima. */
export const badgeCatalogSchema: z.ZodType<(Badge & { rule: BadgeRule })[]>;

/** As badges conquistadas, pela ordem do catálogo. Função pura do snapshot. */
export function earnedBadges(snapshot: PassportSnapshot): Badge[];
```

As vistas ganham as badges: `PassportView.badges: Badge[]` e, por
consequência, `PublicPassportView.badges` (são positivas por construção).

Na página, nos dois Passaportes: uma lista (`list`, nome acessível
`en.badges.title`) com um `listitem` por badge, com o nome visível e a
descrição. Sem badges, a lista não aparece.

## Fora de âmbito

Badges que precisam de dados fora da API (Norminette, Valgrind, horas de
commit), badges dadas à mão, raridade ou pontos, ícones desenhados por badge.

## Notas para o agente

- Regra dura 11: sem fonte verificável na API não há badge.
- O seed do e2e ganha o `pombo` (42cursus abaixo do nível 5, só um projeto
  em curso), o caso sem badges. É contrato.
- O conteúdo do catálogo é do humano: não acrescentes badges sem pedido.
- O `privacy.visibility` (WI-0009) lista o que os outros veem: passa a
  mencionar as badges (ADR 0010).
- As regras do catálogo descrevem-se em dados (tipo de regra + parâmetros),
  não em código arbitrário: assim o ficheiro valida-se por schema.
