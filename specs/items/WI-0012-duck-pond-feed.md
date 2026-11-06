---
id: WI-0012
title: 'Duck Pond: feed de conquistas'
status: draft
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

## Fora de âmbito

Eventos escritos por utilizadores, comentários, notificações, eventos de
projetos falhados ou em curso, feed de outros campus.

## Notas para o agente

- Depende do WI-0009 (visibilidade) e do WI-0011 (badges).
- Um evento só guarda o necessário para o mostrar (regra 9) e entra na
  `/privacy`.
- **Em aberto (humano):** o prazo de retenção (proposta: 90 dias) e o tamanho
  da página.
