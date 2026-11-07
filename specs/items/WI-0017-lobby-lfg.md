---
id: WI-0017
title: Lobby LFG por projeto
status: draft
track: WT-0004
owner: Magalvo
acceptance:
  - AC1: um utilizador só entra no lobby de um projeto de grupo em que a API diz que está inscrito; entrar é sempre uma ação explícita
  - AC2: os estados searching_a_group e creating_group aparecem só ao próprio, como sugestão de lobby
  - AC3: no lobby, a pessoa vê só quem está no mesmo lobby e no mesmo campus, ordenado pelo algoritmo do WI-0014, com as razões
  - AC4: quem não está no lobby nunca é mostrado, e o projeto de quem está só é visível a quem está no mesmo lobby
  - AC5: a pessoa pode sair do lobby; a entrada expira sozinha 14 dias depois
  - AC6: cada sugestão mostra o login com ligação ao Passaporte, para o contacto acontecer fora da app
  - AC7: entrar e sair funcionam sem JavaScript (formulário POST) e protegem-se contra pedidos de outros sites
  - AC8: quem tem o Passaporte escondido não pode entrar no lobby, e escondê-lo tira-o dos lobbies em que estava
---

# WI-0017 — Lobby LFG por projeto

## Problema

Quem precisa de equipa não sabe quem mais está à procura para o mesmo projeto,
nem com quem trabalharia bem.

## Proposta

Em `/tavern`, a pessoa vê os seus projetos de grupo (da API) e entra no lobby
de um. Dentro, vê as outras pessoas do mesmo lobby e campus, ordenadas por
compatibilidade (WI-0014), com as razões. Sentido único: o contacto é pelo
login. Sair ou deixar passar 14 dias tira a pessoa do lobby.

## Fora de âmbito

Interesse mútuo, mensagens, notificações, formar o grupo completo, campus
diferentes, presença.

## Notas para o agente

- Depende do WI-0014 e do WI-0015.
- "Projeto de grupo" sai da `project_session` do campus (tamanho da equipa);
  confirmar no schema da Intra antes de desenhar.
- Decisão do humano (2026-11-07): quem tem o Passaporte escondido (WI-0009)
  não pode entrar no lobby (AC8); esconder o Passaporte tira a pessoa dos
  lobbies em que estava.
- Expiração: o mesmo mecanismo de prazo que os eventos do feed (WI-0012).
