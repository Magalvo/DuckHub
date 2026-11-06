---
id: WT-0003
title: Comunidade
status: draft
owner: Magalvo
---

# WT-0003 — Comunidade

## Objetivo

Transformar o Duck Hub numa praça: cada aluno de 42 Lisboa e 42 Porto vê os
Passaportes dos outros, as conquistas aparecem num feed (Duck Pond) e
qualquer pessoa pode dar um Rubber Duck a uma conquista. Tudo continua
derivado da API da 42, sem texto escrito por utilizadores, o que mantém o
produto sem moderação (`docs/canonical/produto.md`).

Decisões do humano (2026-11-06):

- **Visível à comunidade por omissão**, com a opção de esconder o Passaporte
  em `/account` (direito de oposição, RGPD). Quem esconde sai do diretório,
  do feed e dos Passaportes públicos.
- **Os outros só veem o positivo:** login, avatar, campus, Piscine,
  coalition, Alumni, nível, projetos validados com nota e badges. Os projetos
  falhados e em curso só os vê o próprio.
- **Feed gerado pela sincronização:** no login, a diferença entre o snapshot
  anterior e o novo gera eventos (projeto validado, subida de nível inteiro,
  badge nova), guardados com prazo.
- **Rubber Ducks nas conquistas do feed:** um por pessoa por conquista, sem
  saldo e sem moeda (regra de domínio do produto).

## Âmbito

**Dentro:**

- Passaporte público em `/u/<login>` e a opção de o esconder;
- diretório da comunidade;
- conquistas (badges) derivadas do snapshot;
- feed Duck Pond;
- Rubber Ducks nas conquistas do feed.

**Fora:**

- texto escrito por utilizadores (posts, comentários, bios);
- link público para recrutadores (fora da comunidade autenticada);
- notificações (email, push);
- radar de skills e Skill Tree;
- presença no campus, logtime, `blackholed_at`;
- outros campus.

## Work-items

- WI-0009 — Passaporte público e opção de o esconder
- WI-0010 — Diretório da comunidade
- WI-0011 — Conquistas derivadas do snapshot
- WI-0012 — Duck Pond: feed de conquistas
- WI-0013 — Rubber Ducks nas conquistas

Ordem sugerida: 0009 → 0010 e 0011 em paralelo → 0012 → 0013.
