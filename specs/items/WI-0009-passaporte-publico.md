---
id: WI-0009
title: Passaporte público e opção de o esconder
status: draft
track: WT-0003
owner: Magalvo
acceptance:
  - AC1: um utilizador autenticado vê o Passaporte de outro membro visível em /u/<login>
  - AC2: no Passaporte de outra pessoa só aparecem os projetos validados, com a nota; os falhados e em curso não aparecem nem no HTML
  - AC3: o Passaporte de outra pessoa não mostra a data da sincronização nem nada que só o próprio deva ver
  - AC4: em /account, o utilizador pode esconder o seu Passaporte e voltar a mostrá-lo; a escolha fica guardada
  - AC5: o Passaporte de quem o escondeu responde como inexistente a outras pessoas (o mesmo que um login que não existe), mas o próprio continua a vê-lo em /
  - AC6: um login que não existe no Duck Hub, ou que só tem a conta sem Passaporte sincronizado, responde como inexistente
  - AC7: /u/<login> exige sessão, como o resto da app
  - AC8: a página de privacidade explica que o Passaporte é visível à comunidade por omissão e como o esconder
  - AC9: /u/<login> é navegável só com teclado e não tem violações de acessibilidade AA
---

# WI-0009 — Passaporte público e opção de o esconder

## Problema

Hoje cada pessoa só vê o seu Passaporte (WI-0005, AC7). Para haver
comunidade, os alunos têm de se poder ver uns aos outros, sem expor o que
cada um prefere guardar.

## Proposta

Página `/u/<login>` com uma vista "pública" do Passaporte: a mesma do
WI-0005, menos os projetos falhados e em curso e menos a data da
sincronização. Uma definição em `/account` ("hide my Passport from the
community"), guardada na BD, esconde o Passaporte de todos menos do próprio.
Escondido e inexistente respondem da mesma forma, para não revelar quem
existe.

## Fora de âmbito

Link público para recrutadores (sem sessão), esconder campos à escolha,
bloquear pessoas específicas, diretório (WI-0010).

## Notas para o agente

- Muda o AC7 do WI-0005: um utilizador já pode ver o Passaporte de outros,
  mas só a vista pública. O contrato do WI-0005 tem de continuar verde.
- A filtragem do que é público faz-se no servidor: o que não se mostra não vai
  no HTML (AC2).
- Regras duras 9 e 12. A `/privacy` e a `/account` mudam (nova definição).
- **Em aberto (humano):** o texto da `/privacy` sobre a visibilidade.
