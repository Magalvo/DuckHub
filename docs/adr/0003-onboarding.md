# ADR-0003 — Onboarding do Duck Hub

- **Estado:** proposto (aceite quando o humano fizer o commit)
- **Data:** 2026-10-29
- **Decisor(es):** Magalvo (decisões tomadas em sessão de onboarding com o agente)

## Contexto

O repositório tinha o boilerplate AI-DD e os documentos do autor em
`docs/conceito/` (README, brainstorm, integração com a API da 42) e
`docs/design/` (`DESIGN.md` "Cyber Duck Terminal" e 6 mockups HTML). Não havia
código da app. Os documentos tinham contradições: público-alvo, âmbito
geográfico, duas paletas de cores, dois raios de canto, duas versões do
dashboard, o significado de "Rubber Duck" e a língua da UI. Havia também
funcionalidades que só aparecem nos mockups. As capturas `screen.png` estão
corrompidas (o download falhou) e não foram usadas.

## Decisão

### Produto (detalhe em `docs/canonical/produto.md`)

- **Público:** todos os alunos da 42, com prioridade de conteúdo para quem já
  saiu do Common Core. **Âmbito:** 42 Portugal. O 1.º incremento só aceita
  contas com campus principal Lisboa ou Porto.
- **Rubber Duck** = kudos ilimitado, sem saldo, não é moeda.
- **Privacidade:** presença no campus e `blackholed_at` de terceiros ficam
  fora do 1.º incremento. Quando entrarem, é só com opt-in.
- **Funcionalidades que só estão nos mockups** (Quests, Showcase, Lanyard,
  streaks, ranking, posts com CV) ficam no backlog, não decididas.
- **Badges** só se forem deriváveis da API v2.
- **"Mundo real"** = tabela estática curada. Não há LLM no produto.
- **UI em inglês** com i18n preparado. **Web responsiva**, sem posts livres no
  1.º incremento.

### Design (detalhe em `docs/canonical/design.md`)

- A fonte de verdade é a prosa do `DESIGN.md`. Raios de 4/8/12px. Dashboard
  _minimal_ como referência. Só dark mode.

### Stack

- **Next.js full-stack** (App Router), **PostgreSQL**, **Tailwind** com os
  tokens do design, **Auth.js** com o provider OAuth da 42, sobre a base
  TypeScript estrita, Zod e Vitest do boilerplate.
- **Alojamento:** adiado. O 1.º incremento corre localmente com Docker.

### Configuração do boilerplate

- **Tipo de projeto:** novo, produto standard.
- **Camadas removidas:** `evals/` (não há LLM) e `formal/` (não há dinheiro nem
  concorrência crítica). Foram também apagados `scripts/run-evals.mjs`,
  `.github/workflows/evals.yml`, os alvos `eval`/`formal-*` do Makefile e as
  entradas em `.agent/protected-paths`. O `scripts/test-guards.sh` passou a
  usar `tests/acceptance/` e `scripts/validate-specs.mjs` como alvos dos
  cenários que antes usavam os evals. Se um dia houver LLM, recupera-se do
  git e reavalia-se o ADR 0002.
- **Contrato:** o humano escreve os testes de aceitação. Dono: **@Magalvo**
  (`.github/CODEOWNERS`, owner das specs).
- **Regras duras de domínio** acrescentadas ao `AGENTS.md`: 9 (RGPD), 10 (API
  da 42 como fonte única, só leitura), 11 (conquistas verificáveis), 12
  (acessibilidade).
- **Agentes:** Claude Code (com `CLAUDE.md` → `@AGENTS.md`) e Codex. O Codex lê
  o `AGENTS.md` nativamente. As permissões **não** foram traduzidas para o
  formato do Codex, porque o agente não tinha a certeza do formato; ver a
  documentação oficial do Codex (sandbox/approval). No Codex, o loop de
  auto-correção depende de o agente seguir o `AGENTS.md`: não há Stop hook
  equivalente.
- **Sandbox:** a decisão é passar a trabalhar em **WSL2**. Ainda não está
  ativo: esta sessão correu em Windows nativo, sem sandbox e sem `make`.
- **Orçamento de diff:** 15 ficheiros / 800 linhas, o valor por omissão. Não há
  histórico para calibrar.
- **Domínio de exemplo** (encomendas): removido depois do primeiro WI real.

### Bugs do boilerplate corrigidos no onboarding (Windows)

- `scripts/validate-specs.mjs` e `scripts/onboarding-status.mjs` usavam
  `new URL(...).pathname`, que em Windows dá `\C:\...`. O validador falhava
  sempre e o estado do onboarding dava leituras falsas. Corrigido com
  `fileURLToPath`.

## Consequências

- O primeiro work-track é o **WT-0002 Passaporte 42**, com os WI-0002 a 0007
  em `draft`. O humano escreve os testes de aceitação a partir dos critérios
  em rascunho.
- O WI-0002 mexe em `package.json` e noutros configs protegidos, por isso
  passa por proposta e aplicação humana.
- Toda a funcionalidade que use dados de terceiros (feed, presença,
  matchmaking com urgência) exige antes uma decisão sobre consentimento.

## Pendente (ações humanas)

1. **Commit do onboarding**, com `ACCEPT_CONTRACT_CHANGE=1`: toca em guardrails
   e apaga contrato (`evals/datasets`, `evals/thresholds.json`).
2. **Proteção da branch `main` no GitHub:** não configurada e **não
   verificada**. Comandos no resumo da sessão.
3. **Trancar o projeto** (`.claude/settings.json` a partir do template). Deve
   ser feito já dentro do WSL2, para o sandbox ficar ativo
   (`failIfUnavailable: true`).
4. **Registar a aplicação OAuth na Intra** (necessário para o WI-0004).
5. **`make test-guards` em Windows nativo:** 31 passam e 7 falham, todas por
   causa do ambiente e não das alterações deste onboarding. O
   `.claude/hooks/bash-guard.mjs` faz `import()` de um caminho `C:\...` em vez
   de um URL `file://`: falha fechado e nega todos os comandos (5 falhas). O
   Stop hook precisa de `make`, que não existe neste Windows (2 falhas).
   Confirmar que passa tudo em WSL2. Se o projeto também for usado em Windows
   nativo, corrigir com `pathToFileURL` (por proposta).
6. **Bug dos templates:** em `.agent/templates/track.md` e `work-item.md`, o
   Prettier reformatou `{{ID}}`/`{{TRACK}}` do frontmatter para `{ { ID } }`.
   O scaffold gera por isso frontmatter inválido. Nesta sessão os campos foram
   corrigidos à mão. Correção sugerida: acrescentar `.agent/templates/` ao
   `.prettierignore` e repor os marcadores.

## Resolvido depois do onboarding (mesma data)

Para as questões de API, a fonte foi a apidoc oficial
(`api.intra.42.fr/apidoc`, consultada com sessão na Intra). As restantes foram
decididas pelo humano.

1. **XP por projeto:** vem do campo público `difficulty` (`/v2/projects`,
   `project_sessions`). **A tabela nível↔XP** (`/v2/levels`) exige o papel
   Basic staff. Por isso, a Calculadora (WI-0007) mostra só o XP ganho e o
   nível real atual, sem estimar o nível novo.
2. **Cursus principal:** o de slug `42cursus`. Quem só tem a Piscine entra
   com um Passaporte reduzido e a calculadora indisponível.
3. **Alumni:** reconhece-se só pelo campo `alumni?` de `/v2/me`, sem
   autodeclaração. `/v2/alumnized_users` exige o papel Advanced tutor.
4. **Rate limit e paginação:** 2 pedidos/s e 1200/h por aplicação; 30 itens
   por página por omissão, até 100; header `Link`. A doc não fala de
   `Retry-After`.
5. **Visibilidade futura do Passaporte:** visível à comunidade autenticada
   por omissão; link público para recrutadores só com opt-in; dados
   sensíveis nunca.
6. **Nome:** Duck Hub.
7. **Marca e termos:** o humano pede autorização à 42 / 42 Portugal **antes
   do lançamento público**. O desenvolvimento local não espera por isso.
8. **RGPD:** guardar o mínimo, página de privacidade e apagamento de conta
   no 1.º incremento (WI-0004). Base legal: execução do serviço pedido.
9. **Lanyards:** a tradição é real. Cada ano de Piscine tem uma cor nova,
   que só se conhece no primeiro kick-off desse ano, por isso não há regra
   que a calcule. Cores conhecidas: preto, vermelho, azul, verde, laranja e
   amarelo. Quando a funcionalidade vier, será uma tabela curada ano→cor,
   atualizada pelo humano.
10. **Fecho (feito, 2026-10-29, em WSL2):** `.claude/settings.json` escrito
    a partir do template, com o sandbox ativo (`bwrap` e `socat` presentes,
    `failIfUnavailable: true`), a guarda de Bash e o loop de
    auto-correção. Isto resolve o pendente 3. O `make check` está verde e o
    `make test-guards` dá 38/38 em WSL2. O pendente 5 fica resolvido para
    WSL2; a correção para Windows nativo só é precisa se o projeto voltar a
    ser usado lá. Efeito lateral: dentro do sandbox, o `format-check` falha
    com EACCES nos stubs `/dev/null` do `bwrap` (`.zshrc`, `.vscode`…).
    A correção está proposta em `.agent/proposals/.prettierignore`, que também
    resolve o pendente 6.

## Em aberto

1. **Confirmar com chamadas reais à API** os campos obrigatórios dos schemas,
   os IDs de campus de Lisboa e Porto e o slug `42cursus`. Os exemplos da
   apidoc são antigos. Feito no WI-0003 e no WI-0004.
2. **Alumni e OAuth:** confirmar com uma conta Alumni real que o login
   continua a funcionar e qual é o campus principal.
3. **Fórmula do XP ganho:** confirmar o arredondamento e a regra de bónus
   quando o humano escrever os testes do WI-0007.
4. **Ano→cor dos lanyards:** a lista completa, quando a funcionalidade entrar.
5. **Alojamento** e base de dados gerida.
6. **Permissões do Codex:** traduzir `.agent/permissions.json` para o formato
   do Codex, com a documentação oficial à frente.
