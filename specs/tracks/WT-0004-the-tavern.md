---
id: WT-0004
title: The Tavern — encontrar equipa
status: draft
owner: Magalvo
---

# WT-0004 — The Tavern: encontrar equipa

## Objetivo

Encontrar equipa para um projeto de grupo da 42 deixa de custar dias de
mensagens no Slack. Quem procura equipa entra no lobby do projeto e vê, por
ordem, as pessoas do mesmo campus com quem é mais compatível, com o porquê de
cada sugestão.

Decisões do humano (2026-11-07):

- **Três work-items na v1:** algoritmo (0014) → questionário (0015) → lobby
  (0017). O WI-0016 fica reservado para a presença (backlog).
- **Horário só do questionário na v1.** O algoritmo recebe "períodos do dia"
  sem saber de onde vêm, para as `locations` entrarem mais tarde sem mudar o
  WI-0014.
- **Entra-se no lobby sempre à mão**, só em projetos de grupo em que a API diz
  que a pessoa está inscrita. Entrar é o opt-in para revelar esse projeto a
  quem está no mesmo lobby. Os estados `searching_a_group`/`creating_group`
  servem só de sugestão privada, vista pelo próprio.
- **Mesmo campus é filtro obrigatório.** "Remoto" é uma preferência dentro do
  campus.
- **Sentido único na v1:** vejo sugestões e contacto pelo login (Slack/Intra).
  O lobby tem "sair" e expira sozinho aos 14 dias.
- **Questionário fechado**, no máximo 6 perguntas, sem texto livre (o produto
  não tem conteúdo escrito por utilizadores).

## Âmbito

**Dentro:**

- algoritmo de compatibilidade entre duas pessoas, puro e explicável;
- questionário de perfil de trabalho (opcional, editável, apagável);
- lobby LFG por projeto, com sugestões ordenadas.

**Fora:**

- presença no campus e logtime como sinal de horário (backlog, WI-0016, exige
  opt-in e ADR — regra dura 9);
- interesse mútuo (o contacto só aparece quando os dois querem);
- formar o grupo completo (otimizar 3+ pessoas de uma vez);
- mensagens dentro da app, notificações;
- grupos entre campus.

## Work-items

- WI-0014 — Algoritmo de compatibilidade
- WI-0015 — Questionário de perfil de trabalho
- WI-0017 — Lobby LFG por projeto

Ordem: 0014 → 0015 → 0017. As decisões do algoritmo estão no ADR 0015.

## Em aberto

- **Grupos entre campus:** não encontrei documentação pública que diga se a
  Intra permite grupos entre campus. Confirmar com uma conta real ou com o
  staff da 42 Portugal. Se permitir, o filtro de campus é decisão de produto,
  não limitação técnica.
