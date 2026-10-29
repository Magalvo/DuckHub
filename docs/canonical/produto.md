# Duck Hub — Produto

> Conceito consolidado a partir de `docs/conceito/` (README, brainstorm de
> funcionalidades, integração com a API da 42) e das decisões do onboarding
> (ADR 0003). Quando este ficheiro e os documentos de conceito divergem, manda
> este.

## O que é

Duck Hub é a praça digital da comunidade 42: uma app web
gamificada onde alunos e Alumni mantêm o convívio, encontram equipa e usam
ferramentas úteis. O perfil constrói-se sozinho a partir da API da 42.

## Para quem e porquê

Alunos da 42 em qualquer fase (Common Core, Advanced, Alumni). A prioridade
de conteúdo é quem já saiu do Common Core: nessa fase perde-se o convívio
diário nos clusters e a urgência partilhada, e o Duck Hub quer preencher esse
vazio. **Âmbito inicial: 42 Portugal (Lisboa e Porto).** O primeiro incremento
só aceita contas desses dois campus.

## Princípios

1. **Zero fricção.** Entra-se com o OAuth da 42; nada de formulários para
   dados que a Intra já tem.
2. **A API da 42 é a fonte da verdade académica.** Só leitura; o Duck Hub
   nunca escreve na Intra.
3. **Conquistas verificáveis.** Uma badge ou número só existe se for
   derivável de dados da API.
4. **Privacidade por omissão.** Presença no campus e data de Black Hole de
   terceiros nunca aparecem sem opt-in explícito.
5. **Não se leva a sério na forma, leva-se a sério na utilidade.** O Rubber
   Duck é o tom.

## Pilares e funcionalidades

| Pilar                       | Funcionalidades (brainstorm)                                                | Estado                    |
| --------------------------- | --------------------------------------------------------------------------- | ------------------------- |
| **Passaporte 42** (perfil)  | Identidade da Intra, cores da Coalition, tradução "mundo real" dos projetos | **1.º incremento**        |
|                             | Radar de skills, montra de badges (só deriváveis da API)                    | Planeado                  |
| **The Forge** (ferramentas) | Calculadora de XP                                                           | **1.º incremento**        |
|                             | Skill Tree, modo "Norminette" (easter egg)                                  | Planeado                  |
| **Duck Pond** (feed)        | Conquistas automáticas, Rubber Ducks (kudos), widget de logtime             | Planeado                  |
| **The Tavern** (equipas)    | Matchmaking por projeto/stack/ritmo, lobby LFG, Bounty Board / mentoria     | Planeado                  |
| **Oportunidades** (Alumni)  | Job & Referral Board                                                        | Planeado                  |
|                             | Mapa de presença no cluster, Nomad Tracker                                  | Planeado, exige opt-in    |
| Só nos mockups              | Quests/QP/títulos, Showcase/Hype Board, Lanyard por ano, streaks, ranking   | Backlog, **não decidido** |

## Regras de domínio já decididas

- **Rubber Duck = kudos ilimitado.** Não há saldo: um Duck por pessoa por
  item. Não é moeda. Se um dia houver moeda de bounties, terá outro nome e
  regras próprias (ADR).
- **"Mundo real" é uma tabela estática** curada (slug do projeto →
  descrição). Não há LLM no produto.
- **Badges que precisam de dados fora da API** (erros de Norminette, Valgrind,
  horas de commit) ficam no backlog até haver fonte verificável.
- **No 1.º incremento não há conteúdo escrito por utilizadores.** Sem posts,
  sem moderação.
- **Interface em inglês**, com textos em ficheiros de mensagens (i18n
  preparado). A documentação do projeto é em português.
- **Web responsiva**, mobile-first, sem app nativa.
- **Quem entra:** contas com campus principal 42 Lisboa ou 42 Porto,
  incluindo quem só tem a Piscine (Passaporte reduzido).
- **Alumni** reconhece-se só pelo campo `alumni?` da API, sem autodeclaração.
- **Calculadora de XP** mostra o XP ganho (`difficulty` × nota) e o nível
  real. Não estima o nível novo enquanto a tabela de níveis não estiver
  acessível (`/v2/levels` exige o papel de staff).
- **Visibilidade (futura) do Passaporte:** comunidade autenticada por
  omissão; link público para recrutadores só com opt-in.
- **RGPD:** guardar o mínimo, página de privacidade e apagamento de conta
  desde o 1.º incremento.
- **Lançamento público** só depois de autorização da 42 / 42 Portugal para o
  nome, as cores das Coalitions e a API.

## Fora do produto (por agora)

App móvel nativa, escrita na Intra, LLMs, moeda virtual, campus fora de
Portugal, dados de presença em tempo real.

## Em aberto

Ver a secção "Em aberto" do ADR 0003.
