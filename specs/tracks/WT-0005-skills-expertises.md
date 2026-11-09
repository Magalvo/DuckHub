---
id: WT-0005
title: Skills e expertises
status: draft
owner: Magalvo
---

# WT-0005 — Skills e expertises

## Objetivo

O Passaporte mostra o que cada pessoa sabe fazer: as skills que a 42 mede
(verificáveis) e, separadas delas, as expertises que a pessoa declara na Intra.
Por cima disso, o campus consegue responder a "quem sabe X?" sem mensagens no
Slack.

Decisões do humano (2026-11-09):

- **Três work-items na v1:** radar (0019) → expertises (0020) → "quem sabe X"
  (0021).
- **As expertises são autodeclaradas na Intra, logo não são verificáveis.**
  Aparecem separadas das skills, com o rótulo "declared on the Intra", e nunca
  dão badges nem XP (regra dura 11).
- **Editam-se na Intra.** O Duck Hub só lê (regra dura 10).
- **"Quem sabe X" é só um filtro, sem ranking:** mostra quem passa o limiar,
  por ordem de login, como o diretório. Um ranking de níveis é uma decisão de
  produto que ainda não foi tomada.

Factos da API (chamada real a 2026-11-09; referência completa em
`docs/API_42_endpoints.md`):

- `/v2/me` → `cursus_users[].skills`: `{ id, name, level }[]`, só as skills
  que a pessoa tem, por nível descendente, com 2 casas decimais (ex.: 9 skills
  no 42cursus e 4 na c-piscine).
- `/v2/expertises`: catálogo de 78 entradas, `kind` em `languages`,
  `frameworks`, `databases`, `admin_sys`, `other`.
- `/v2/users/:id/expertises_users` (token da aplicação): `{ expertise_id,
interested, value 1–5, contact_me, … }`, com `user` e `expertise` aninhados
  que o schema descarta. `filter[user_id]=a,b,c` funciona.
- Uso em Lisboa (amostra de 293 alunos ativos): 35 (~12%) declaram pelo menos
  uma expertise, 257 linhas, 115 delas de 2026. As mais declaradas: C, Python,
  Shell, CSS, HTML, JavaScript, Unix, Docker, PostgreSQL, Java. Só com
  expertises, o "quem sabe X" fica pobre.

## Âmbito

**Dentro:**

- radar e lista das skills do cursus no Passaporte (próprio e público);
- expertises declaradas na Intra, só leitura, separadas das skills;
- filtro "quem sabe X" no campus.

**Fora:**

- editar expertises no Duck Hub (edita-se na Intra);
- badges, XP ou pontuação a partir de expertises;
- ranking de pessoas por nível de skill ou expertise;
- o catálogo `/v2/cursus/:id/skills` (o radar mostra só as skills que a
  pessoa tem).

## Work-items

- WI-0019 — Radar de skills no Passaporte
- WI-0020 — Expertises no Passaporte (por abrir)
- WI-0021 — "Quem sabe X" no campus (por abrir)

Ordem: 0019 → 0020 → 0021. Os WI-0020 e WI-0021 abrem-se depois de
verificarmos quantas pessoas de Lisboa declaram expertises.

## Em aberto

- Abrir os WI-0020 e WI-0021 (depende da verificação do uso em Lisboa).
