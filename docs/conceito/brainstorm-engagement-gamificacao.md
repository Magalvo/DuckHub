# Duck Hub — Brainstorm de engagement, UI e gamificação

Data: 9 de novembro de 2026

Estado: **propostas para discussão.** Este documento não altera requisitos
nem decisões canónicas. Quando diverge de `docs/canonical/produto.md`,
`docs/canonical/design.md` ou de um ADR, mandam esses. Cada ideia só vira
trabalho através de um work-item.

## Ponto de partida

O que já existe em `main` (9 de novembro de 2026) e serve de base:

- **Passaporte 42** (WT-0002, WI-0009): perfil a partir da API, link público
  e opção de esconder.
- **Conquistas** (WI-0011): catálogo de badges derivadas do snapshot.
- **Duck Pond** (WI-0012): eventos gerados na sincronização do login, sem
  backfill na primeira sincronização, retenção de 90 dias.
- **Rubber Ducks** (WI-0013): um Duck por pessoa por item, nunca nas próprias
  conquistas.
- **The Tavern** (WT-0004): lobby LFG por projeto de grupo, compatibilidade com
  razões, expiração de 14 dias, contacto fora da app.
- **Radar de skills** (WI-0019).

Direção: o Duck Hub deve dar vontade de voltar porque há pessoas e
oportunidades à nossa espera, e esse regresso deve ser agradável graças à
identidade visual e à gamificação. A prioridade inclui quem já saiu do Common
Core, para quem a progressão académica deixa de ser motivo para voltar.

Hipótese principal: **ver o progresso de alguém leva a uma interação; a
interação facilita uma ligação; a ligação dá uma razão para regressar.**

## 1. O ciclo de regresso

Numa web app sem notificações push, ninguém volta sozinho. O gatilho mais forte
é o reconhecimento recebido.

- **Caixa de entrada na app:** _"3 people gave you a Duck on minishell"_. Não
  precisa de texto escrito por ninguém.
- **Resumo semanal por email, só com opt-in:** _"This week in your Pond"_, com
  o mínimo de dados (contagens e ligações).
- **Nenhuma conquista fica por ver:** o Pond dá prioridade a conquistas
  recentes ainda sem Duck.
- **Métrica central:** % de conquistas com pelo menos um Duck em 7 dias. Mede
  reconhecimento, não tempo de ecrã.

## 2. Pop-up de celebração e partilha

Quando há uma conquista nova, da Intra (projeto validado, nível) ou do Duck Hub
(badge, coleção, aniversário), aparece uma celebração com a opção de a
partilhar, ao estilo do LinkedIn.

### Quando aparece

- A sincronização acontece no login, por isso a celebração aparece na visita
  seguinte: _"Since your last visit: minishell validated · 125%"_. A surpresa à
  chegada é ela própria um motivo para voltar.
- Várias conquistas juntas aparecem em sequência (1/3, 2/3…), num único
  componente.
- **O primeiro login não celebra o histórico.** Mostra um só resumo, _"Your
  journey so far"_, coerente com a ausência de backfill no Pond (WI-0012,
  AC2).
- As conquistas próprias do Duck Hub usam o mesmo componente, mas só existem se
  forem verificáveis a partir da API (regra dura 11).

### O que a pessoa pode fazer

- **`Share to the Pond`:** hoje o Pond é automático (WI-0012). Esta ideia
  levanta uma **decisão de produto**: manter o automático, ou passar a opt-in
  por conquista, com uma definição global _"share automatically"_. A segunda
  opção é mais respeitosa e mais próxima do LinkedIn.
- **Frase de uma lista fechada:** _"Finally!"_, _"First try"_, _"Took 3
  attempts"_, _"Thanks to my evaluators"_. Dá personalidade sem texto livre,
  logo sem moderação.
- **`Pin to Passport`:** destacar a conquista na montra do Passaporte.
- **`Download card`:** imagem pronta para LinkedIn ou Instagram, gerada no
  servidor, independente do link público.

### Acessibilidade

Modal com foco preso, `Esc` para fechar e anúncio para leitores de ecrã.
Confetti e glow são decoração e desligam-se com `prefers-reduced-motion`. Nunca
bloqueia a navegação mais do que um clique.

## 3. Gamificação verificável

### Progresso

- **Coleções:** conjuntos de projetos que se completam, como _Graphics
  trilogy_ (`so_long` → `cub3d` → `miniRT`) ou _Network stack_. Tabela curada,
  como o "mundo real".
- **Raridade em vez de ranking:** _"14% of Duck Hub members in Lisbon have
  this"_. Calculada só sobre membros do Duck Hub e mostrada só acima de um
  número mínimo de pessoas (k-anonimato).
- **Aniversários:** _"5 years since your Piscine"_. Para Alumni, substitui a
  progressão académica como gancho emocional.

### Reconhecimento

- Os Rubber Ducks mantêm as regras atuais: sem saldo, não são moeda.
- Badges sobre dados do próprio Duck Hub (por exemplo _"gave 50 Ducks"_)
  **exigem ADR**: a regra 11 fala em dados da API.

### Pertença

- **Metas coletivas do campus:** _"Lisboa validated 212 projects this
  month"_, com uma barra conjunta Lisboa e Porto. Competição saudável sem
  classificar ninguém.
- Identidade de campus, Coalition e ano da Piscine (cor da tabela curada, ver
  `design.md`), sem a transformar em classificação de valor pessoal.

### Missões

Estão em _"backlog, não decidido"_ no `produto.md`. Se entrarem, têm de ser
verificáveis pela API e sem prazo diário, para não virarem streaks disfarçadas.

### A evitar

Streaks diárias, ranking global, contagem do Black Hole visível a terceiros,
notificações de culpa (_"you haven't visited in 3 days"_) e números decorativos
que pareçam dados reais.

## 4. The Tavern

O lobby LFG (WI-0017) já é a versão estruturada que este brainstorm defendia:
projeto da API, compatibilidade, expiração e nenhum texto livre. Próximas
ideias, todas com listas fechadas:

- **Intenções temporárias** fora dos projetos da Intra:
  `Up for a side project`, `Open to mentoring`, com papel, ritmo e modo
  escolhidos de listas e expiração automática.
- O texto livre e a mentoria aberta ficam para um incremento com moderação, com
  ADR próprio.

## 5. Momentos que se partilham

- **Duck Hub Wrapped anual** e **Piscine Wrapped:** projetos, XP, coleções e
  Ducks recebidos, com cartão de imagem para partilhar, só com opt-in.
- **Cartão partilhável** quando alguém valida um projeto marcante.

## 6. UI polida através de pequenos momentos

- **Primeiro login como "boot sequence":**
  `Fetching your journey… 23 projects found…` enquanto o Passaporte
  sincroniza. Pode-se saltar e respeita `prefers-reduced-motion`.
- **Duck otimista:** muda logo no ecrã, com um pequeno _squish_ dourado e o
  contador em JetBrains Mono.
- **Indicador de atualização** (`synced 2h ago`) que separa "loading" de "no
  data".
- **`Ctrl+K`** para encontrar pessoas e projetos (sugestão já em `design.md`).
- **Cor com significado:** teal para agir, dourado para celebrar, roxo para
  Alumni, dentro dos pares de contraste aprovados.
- **Estados vazios úteis:** o perfil de quem só fez a Piscine deve parecer
  intencional, não falhado.
- **Mobile:** navegação inferior e nada que dependa de hover.
- **O pato com moderação:** em celebrações e estados vazios, não em todos os
  cartões.
- **Tema Norminette** como easter egg escondido.

## 7. Mais à frente: o quarto pixel e o Rubber Duck como pet

Uma camada de jogo: cada pessoa tem uma personagem em pixel art (estilo
portátil retro) num mundo isométrico, com uma mesa ou quarto que decora com
recompensas de conquistas e missões, e um Rubber Duck como pet que também se
personaliza.

### O quarto como vista do Passaporte

Os mesmos dados viram objetos: o quadro na parede é o diploma do Common Core, o
monitor CRT é o `minishell`, a planta cresce com os anos desde a Piscine.

### Regras

1. **Recompensas desbloqueiam-se, não se compram.** Cada objeto está ligado a
   uma conquista verificável (_"Complete the Graphics trilogy → retro arcade
   cabinet"_). Sem moeda nem loja; os Ducks continuam a não ser moeda. Cada
   objeto conta uma história real.
2. **O pet nunca castiga.** Não fica triste nem morre por ausência. Reage com
   alegria: dança quando recebes Ducks, chapéu de formatura ao chegar a
   Alumni, dorme tranquilo quando não estás.
3. **Acessórios do pato** saem das coleções e conquistas: chapéu da
   Coalition, cachecol da cor do ano da Piscine (tabela curada).
4. **Visitar o quarto dos outros** é o ciclo social: vês a história da pessoa
   e deixas um Duck no tapete, que é o mesmo Duck de sempre.

### Riscos e custos

- **Arte:** é o maior custo. Pixel art isométrica original exige um artista ou
  muito tempo. Hipótese: concurso de pixel art na comunidade 42.
- **Identidade visual:** o design decidido é Cyber Duck Terminal. A pixel art
  pode conviver se o quarto for um "programa" que corre dentro do terminal,
  mas a decisão tem de ficar no `design.md`.
- **Acessibilidade:** a cena precisa de um equivalente acessível, uma lista de
  objetos navegável por teclado com a mesma informação.
- **Mobile:** vista isométrica fixa, sem câmara livre.

### Sequência para começar pequeno

1. **Mesa 2D estática:** ilustração SVG no Passaporte com 6 a 8 objetos ligados
   a conquistas. Testa se as pessoas ligam ao conceito.
2. **Pato** com 3 ou 4 acessórios e reações simples.
3. **Quarto isométrico** com disposição dos objetos e visitas.
4. **"Mundo":** corredor ou campus com os quartos da tua Piscine, só se os
   passos anteriores tiverem tração.

## 8. Sequência proposta

1. Celebração, caixa de entrada de Ducks e cartões partilháveis.
2. Coleções, aniversários e metas coletivas do campus.
3. Intenções estruturadas na Tavern, além dos projetos da Intra.
4. Wrapped anual.
5. Mesa 2D e pato; depois, quarto isométrico.
6. Texto livre com moderação.

Medir as transições entre descoberta, interação, ligação e regresso,
separando alunos e Alumni. Qualquer instrumentação respeita a minimização de
dados e a privacidade por omissão.

## Decisões em aberto

- O Pond continua automático ou passa a opt-in por conquista?
- Badges sobre dados do próprio Duck Hub entram (ADR)?
- Missões entram no produto, e com que fonte verificável?
- A pixel art cabe na identidade Cyber Duck Terminal, e quem faz a arte?
- Que fontes da API servem as coleções, os aniversários e as metas do campus?
  Confirmar acesso (token da app ou do utilizador) em
  `docs/API_42_endpoints.md`.
