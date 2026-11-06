---
id: WI-0011
title: Conquistas derivadas do snapshot
status: draft
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

## Fora de âmbito

Badges que precisam de dados fora da API (Norminette, Valgrind, horas de
commit), badges dadas à mão, raridade ou pontos, ícones desenhados por badge.

## Notas para o agente

- Regra dura 11: sem fonte verificável na API não há badge.
- **Em aberto (humano):** o catálogo inicial. Exemplos possíveis, a decidir:
  primeira validação, nota máxima (125) num projeto, Common Core completo
  (todos os projetos da tabela "mundo real" validados), Alumni, nível 5/10/15.
- As regras do catálogo descrevem-se em dados (tipo de regra + parâmetros),
  não em código arbitrário: assim o ficheiro valida-se por schema.
