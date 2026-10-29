---
id: WI-0005
title: Passaporte do próprio utilizador
status: draft
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

Página do Passaporte que lê os dados guardados na última sincronização. A
sincronização corre no login e usa o cliente do WI-0003. Layout inspirado no
cabeçalho do dashboard _minimal_, com números em JetBrains Mono, a cor da
coalition como acento e o roxo Synth-Purple na distinção Alumni
(`docs/canonical/design.md`). Os projetos usam a tradução do WI-0006, quando
existir.

## Fora de âmbito

Ver o Passaporte de outras pessoas, partilha pública ou para recrutadores
(quando vier: visível à comunidade por omissão, link público opt-in, ADR
0003), radar de skills, badges, lanyard, `blackholed_at`, logtime, edição
manual de dados, sincronização em background.

## Notas para o agente

- Regras duras 9 a 12. A distinção Alumni vem só de `alumni?`: não há
  autodeclaração.
- A cor da coalition vem da API e pode ter contraste insuficiente sobre o
  fundo escuro. Se falhar o AA, usa-a só em elementos não textuais ou ajusta
  a luminosidade. Não ignores o contraste.
- Depende de WI-0003 e WI-0004. Integra o WI-0006 se estiver pronto; senão,
  mostra os nomes originais.
