# Duck Hub — Design

> Fontes: `docs/design/stitch_duck_hub_developer_platform/cyber_duck_terminal/DESIGN.md`
> (sistema "Cyber Duck Terminal") e os 6 mockups HTML na mesma pasta. As
> capturas `screen.png` estão corrompidas (o download falhou) e não serviram
> de fonte. As decisões abaixo foram tomadas no onboarding (ADR 0003).

## Decidido

### Fonte de verdade

- **Os tokens vêm da prosa do `DESIGN.md`.** Ignoram-se os tokens do
  front-matter (Material 3 gerado) e do Tailwind dos mockups.
- **O dashboard de referência é a versão _minimal_.** A versão completa fica
  como inspiração.

### Identidade

- **Só dark mode.** Ambiente de "terminal de desenvolvimento" com mascote
  Rubber Duck: técnico, mas com humor.
- Glassmorphism discreto: painéis translúcidos com blur, bordas de 1px e
  brilhos de cor ténues.

### Cores

| Papel                    | Token       | Valor                    | Uso                                                 |
| ------------------------ | ----------- | ------------------------ | --------------------------------------------------- |
| Fundo                    | `void`      | `#080B0F` / `#0D1117`    | Canvas                                              |
| Superfície 1             | `surface-1` | `#12161E`                | Rails, painéis estruturais                          |
| Superfície 2             | `surface-2` | `#161B22`                | Cartões                                             |
| Superfície 3             | `surface-3` | `#21262D`                | Inputs, destaques de lista                          |
| Vidro                    | `glass`     | `rgba(22, 27, 34, 0.72)` | Com `backdrop-filter: blur(12px)`                   |
| Primária (Cyber-Teal)    | `primary`   | `#00BABC`                | Ações, estado ativo                                 |
| Secundária (Duck Gold)   | `duck`      | `#FFC700`                | **Só** gamificação: Ducks, marcos, conquistas       |
| Terciária (Synth-Purple) | `alumni`    | `#A855F7`                | Estatuto Alumni, distinções lendárias               |
| Micro-acento             | `cyan`      | `#00F0FF`                | Foco, cursores                                      |
| Perigo (Vampire Red)     | `danger`    | `#F85149`                | Erros, Black Hole                                   |
| Coalition                | `coalition` | da API                   | Cor de destaque do Passaporte; sem Coalition → teal |

### Tipografia

- **Inter** para texto e controlos; **JetBrains Mono** para todos os números
  dinâmicos (XP, nível, Ducks), tags e etiquetas.
- Etiquetas e badges em maiúsculas monoespaçadas, com tracking de 0.04 a 0.06em.
- A escala de tamanhos (headline-xl 40px … label-sm 10px) segue o `DESIGN.md`.

### Forma e espaço

- Raios: **4px** (badges, tags) · **8px** (botões, inputs) · **12px**
  (cartões, modais). Pills só para estado em tempo real e contadores; círculos
  só para avatares e anéis de progresso.
- Grelha de 4/8px. Breakpoints: < 768px (4 colunas, navegação em barra
  inferior) · 768–1199px (8 colunas, rail de 64px) · ≥ 1200px (12 colunas,
  rail de 240px, conteúdo, gaveta de 320px, largura máxima de 1680px).

### Acessibilidade (regra dura 12 do AGENTS.md)

- Contraste WCAG AA (texto ≥ 4.5:1, texto grande e UI ≥ 3:1) em todos os
  pares texto/superfície dos tokens.
- Glow, blur e transparência são decoração e nunca a única forma de
  distinguir estado. Foco visível (contorno cyan) em tudo o que é interativo.
- Respeitar `prefers-reduced-motion` nas micro-animações.

## Sugestões (não decididas)

Vêm dos mockups e do `DESIGN.md`. Nenhuma é requisito até um work-item a
pedir.

- Componentes de gamificação: anel "Black Hole Defense", contador de pontos
  de avaliação, matriz do mapa do cluster.
- Paleta de comandos `Ctrl+K`.
- Breadcrumbs de "telemetria" nos cartões (`ROOT // CLUSTER_B1 // ROW_04`) e
  textos decorativos do tipo `SYS_PING 12ms`. **Atenção:** só podem mostrar
  dados reais ou ser claramente decorativos, nunca números inventados.
- Diretório "Lanyard" com cores por ano da Piscine. **A tradição é real**
  (confirmada pelo humano): cada ano tem uma cor nova, revelada no primeiro
  kick-off do ano, por isso tem de ser uma tabela curada ano→cor e não uma
  regra. Cores conhecidas: preto, vermelho, azul, verde, laranja, amarelo.
- Ecrãs de Quests/Achievements, Showcase/Hype Board e o layout completo de
  Matchmaking.
- Fundo com grelha de pontos a 5%, micro-springs, pulsos de brilho no hover.
- Tema "Norminette" (easter egg minimalista).

## Contradições resolvidas nas fontes

| Tema   | Divergência                                                                              | Decisão               |
| ------ | ---------------------------------------------------------------------------------------- | --------------------- |
| Cores  | Front-matter (`#10141a`, `#48dadc`, `#ddb7ff`) ≠ prosa (`#080B0F`, `#00BABC`, `#A855F7`) | Prosa                 |
| Raios  | `DESIGN.md` 4/8/12px ≠ Tailwind dos mockups 2/4/8px                                      | `DESIGN.md` 4/8/12px  |
| Layout | Dashboard completo vs. minimal                                                           | Minimal               |
| Idioma | Documentos em PT, mockups em EN                                                          | UI em EN, i18n pronto |
