---
id: WI-0019
title: Radar de skills no Passaporte
status: in-progress
track: WT-0005
owner: Magalvo
acceptance:
  - AC1: a secção usa as skills do 42cursus; sem 42cursus, as da c-piscine; os slugs comparam-se por igualdade exata (um cursus que só contém "piscine" no slug não conta); a secção mostra o nome do cursus escolhido
  - AC2: só entram as skills com nível acima de 0, por nível descendente e, em empate, por nome comparado por code units
  - AC3: com 3 ou mais skills há radar e lista; com 1 ou 2 só a lista; sem nenhuma (incluindo o cursus escolhido sem skills acima de 0, ou nenhum dos dois cursus) a secção não aparece
  - AC4: a geometria do radar usa a escala fixa 0–20, o eixo 0 aponta para cima e os seguintes rodam no sentido dos ponteiros do relógio, a passos iguais; um nível acima de 20 fica no limite do radar
  - AC5: a lista mostra sempre o nível real com formatLevel (2 casas), também acima de 20
  - AC6: o radar é decoração (SVG com aria-hidden); a lista, com nome e nível de cada skill, é legível por leitor de ecrã; a secção não tem violações de a11y (contraste AA)
  - AC7: a secção aparece no Passaporte do próprio e no público (/u/[login]), com a visibilidade que o Passaporte já tem
  - AC8: um snapshot guardado sem skills continua válido e conta como lista vazia; não há migração de BD
  - AC9: as skills entram pelo schema Zod de /v2/me, que aceita a falta do campo e rejeita uma skill inválida (nível negativo); o snapshot guarda só o nome e o nível das skills do 42cursus e da c-piscine, e os outros cursus ficam sem o campo
---

# WI-0019 — Radar de skills no Passaporte

## Problema

O Passaporte mostra o nível do cursus, mas não o que a pessoa sabe fazer. A
Intra mede isso nas skills (`cursus_users[].skills`), que já vêm no `/v2/me`
que o Passaporte lê, e que hoje se deitam fora.

## Proposta

Decisões do humano (2026-11-09):

- Usa as skills do 42cursus; sem 42cursus (Passaporte reduzido), as da
  c-piscine. Os slugs são os de `src/passport/passport.ts`, por igualdade
  exata. Mostra o nome do cursus por cima.
- Só skills com nível acima de 0, por nível descendente e depois nome (code
  units). Com menos de 3, só a lista; sem nenhuma, a secção não aparece.
- Escala fixa 0–20. Acima de 20, o radar fica no limite; a lista mostra o
  valor real com `formatLevel`.
- O radar é decoração; a informação está na lista (regra 12).
- Aparece no Passaporte do próprio e no público, com a visibilidade que já
  existe.
- Snapshots antigos sem skills continuam válidos (lista vazia). O snapshot é
  JSONB: não há migração.
- Textos em inglês, nos ficheiros de mensagens.

## Interface

Aprovada a 2026-11-09, com os ajustes do humano.

- `Profile['cursus'][number].skills?: { name: string; level: number }[]` em
  `src/intra/schemas.ts`. O schema de `/v2/me` lê `skills: { id, name,
level ≥ 0 }[]` e descarta o `id`. Sem o campo na API, o `Profile` também
  não o tem (nada de `skills: []`).
- `PassportSnapshot['cursus'][number].skills?: Skill[]`. `buildSnapshot`
  guarda as skills só do 42cursus e da c-piscine (nome e nível); os outros
  cursus ficam sem o campo (o mínimo, RGPD). O `snapshotSchema` aceita a falta
  e mantém as skills que existem (ida e volta sem perdas).
- Em `src/passport/skills.ts`:
  - `SKILL_SCALE_MAX = 20`, `RADAR_MIN_AXES = 3`;
  - `interface Skill { name: string; level: number }`;
  - `shownSkills(cursus: PassportSnapshot['cursus'])`:
    `{ cursus: string; skills: Skill[] } | null`. O 42cursus se existir (mesmo
    sem skills acima de 0, sem recurso à Piscine), senão a c-piscine, por
    igualdade exata. Só níveis acima de 0, por nível descendente e depois nome
    em code units. Sem nenhuma, `null`.
  - `radarPoints(levels: readonly number[], radius: number): RadarPoint[] | null`:
    `null` com menos de 3 níveis. Coordenadas de SVG, origem no centro, y para
    baixo. O eixo `i` tem o ângulo `−π/2 + 2π·i/n`: o eixo 0 aponta para cima e
    os outros rodam no sentido dos ponteiros do relógio. O raio de cada ponto é
    `radius · min(level, 20) / 20`. Sem arredondamentos.
- `PassportView.skills: SkillsView | null` e o mesmo campo, tal e qual, em
  `PublicPassportView` (acrescentado à lista de campos permitidos):
  `{ cursus: string; skills: { name: string; level: string }[]; radar: {
radius; axes; rings; shape } | null }`. O `level` vem de `formatLevel`; o
  `radar` é `null` com menos de 3 skills; `shape` é
  `radarPoints(níveis pela ordem da lista, radius)`.
- Página: `<section aria-labelledby>` com um `h2` (`en.passport.skills.title`,
  "Skills"), o nome do cursus e um `listitem` por skill com nome e nível. O
  único SVG da secção é o radar, com `aria-hidden="true"`. Passa o axe
  (wcag2a, wcag2aa).

## Fora de âmbito

- O catálogo `/v2/cursus/:id/skills` (eixos de skills que a pessoa não tem).
- Skills de outros cursus além do 42cursus e da c-piscine.
- Badges, XP, eventos do Duck Pond ou o diretório a partir das skills.
- Expertises (WI-0020) e "quem sabe X" (WI-0021).

## Notas para o agente

- `passport.ts` já escolhe o cursus mostrado para o nível, mas com um terceiro
  recurso (`slug.includes('piscine')`) que este WI não usa.
- Os testes de aceitação já existentes constroem `Profile` e
  `PassportSnapshot` sem skills: o campo tem de ser opcional no tipo.
- O contrato está em `tests/acceptance/wi-0019-radar-skills.acceptance.test.ts`
  e `tests/acceptance/e2e/wi-0019.e2e.ts` (seed: o pato tem skills, o marreco
  só a Piscine e a cisne um snapshot antigo sem o campo).
- Com `exactOptionalPropertyTypes`, o `.optional()` do Zod dá
  `skills?: X | undefined`: o schema tira a chave quando falta.
