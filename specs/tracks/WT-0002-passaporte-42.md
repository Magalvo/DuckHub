---
id: WT-0002
title: Passaporte 42
status: draft
owner: Magalvo
---

# WT-0002 — Passaporte 42

## Objetivo

Primeiro incremento utilizável do Duck Hub. Um aluno da 42 Lisboa ou da 42
Porto entra com a conta da Intra e, sem preencher nada, vê o seu Passaporte:
identidade, Piscine, Coalition, nível e projetos traduzidos para "mundo real".
Também pode simular na Calculadora de XP quanto sobe com o próximo projeto.
Prova o princípio "zero fricção" e a integração com a API da 42, que é o
maior risco técnico do produto (`docs/canonical/produto.md`).

## Âmbito

**Dentro:**

- esqueleto da app (Next.js, Tailwind com os tokens de
  `docs/canonical/design.md`, PostgreSQL local);
- cliente só de leitura da API v2;
- login OAuth restrito a Lisboa e Porto;
- Passaporte do próprio utilizador;
- tabela "mundo real";
- Calculadora de XP.

**Fora:**

- feed / Duck Pond e Rubber Ducks;
- matchmaking;
- conteúdo escrito por utilizadores;
- Passaportes de outras pessoas e partilha pública;
- presença no campus e `blackholed_at` de terceiros;
- radar de skills e badges;
- outros campus;
- deploy (decisão adiada).

## Work-items

- WI-0002 — Esqueleto da app com o tema Cyber Duck
- WI-0003 — Cliente só de leitura da API da 42
- WI-0004 — Login com OAuth da 42 (Lisboa e Porto)
- WI-0005 — Passaporte do próprio utilizador
- WI-0006 — Tradução "mundo real" dos projetos
- WI-0007 — Calculadora de XP

Ordem sugerida: 0002 → 0003 → 0004 → 0005. O 0006 e o 0007 podem avançar em
paralelo depois do 0003.
