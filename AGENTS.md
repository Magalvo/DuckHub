# AGENTS.md — Constituição do projeto

> Lê este ficheiro por inteiro antes de qualquer ação. É a tua memória de longo prazo.
> Lido por Claude Code, Codex, Cursor, Aider — qualquer agente.

## Primeiro arranque

Se `node scripts/onboarding-status.mjs` mostra pendentes, o projeto ainda não
foi configurado. Antes de qualquer outra tarefa, propõe ao utilizador fazer o
onboarding e segue `.claude/skills/onboarding/SKILL.md` (no Claude Code:
`/onboarding`). Esse guia diz o que detetar sozinho e o que perguntar.

## Propósito

<!-- SUBSTITUIR: um parágrafo sobre porque é que este código existe. -->

Boilerplate de referência para desenvolvimento AI-driven: SDD + TDD + defesa em
profundidade. O módulo `src/order.ts` é um exemplo de domínio a substituir.

## Stack

- TypeScript 5.x em modo `strict` máximo (Node 22+, ESM)
- Zod para validação de schema nas fronteiras
- Vitest (unit, acceptance, property-based com fast-check)
- ESLint (typescript-eslint strictTypeChecked) + Prettier
- Lefthook para hooks de git · GitHub Actions para CI

## Interface única de comandos

Não adivinhes comandos. Usa o Makefile:

- `make check` — **corre isto até ficar tudo verde antes de dar a tarefa por concluída** (não altera ficheiros)
- `make format` — corrige a formatação quando o check acusar
- `make test-unit` — loop rápido de TDD
- `make validate-specs` — lint do corpus de specs
- `make new-item ID=WI-NNNN SLUG=... TRACK=WT-NNNN` — scaffolding (nunca cries specs à mão)
- `make eval` — evals dos componentes probabilísticos (corre quando mudares prompts/subjects)
- `make onboard-status` — o que falta configurar no projeto
- `make help` — lista completa

## Estrutura

| Pasta                                                | O que é                                                              | Podes editar?        |
| ---------------------------------------------------- | -------------------------------------------------------------------- | -------------------- |
| `specs/tracks/`                                      | Épicos (WT-NNNN)                                                     | Sim, via scaffold    |
| `specs/items/`                                       | Tarefas atómicas com critérios de aceitação (WI-NNNN)                | Sim, via scaffold    |
| `docs/adr/`                                          | Decisões de arquitetura e o porquê                                   | Sim (novos ADRs)     |
| `docs/canonical/`                                    | Convenções e arquitetura — memória longa                             | Com aprovação humana |
| `src/`                                               | Código de produção                                                   | Sim                  |
| `tests/unit/`, `tests/properties/`                   | Testes que escreves e iteras                                         | Sim                  |
| `tests/acceptance/`                                  | **O CONTRATO** (determinístico)                                      | **NÃO. NUNCA.**      |
| `evals/subjects/`                                    | Sistemas probabilísticos sob avaliação (prompts)                     | Sim                  |
| `evals/datasets/`, `evals/thresholds.json`           | **O CONTRATO** (estatístico)                                         | **NÃO. NUNCA.**      |
| `formal/`                                            | Specs TLA+ do núcleo crítico (camada opcional)                       | Só por proposta      |
| Scripts, configs, workflows, `AGENTS.md`, `.claude/` | **GUARDRAILS**: como se verifica (lista em `.agent/protected-paths`) | **Só por proposta**  |
| `.agent/proposals/`                                  | Onde propões alterações a ficheiros protegidos                       | Sim                  |

## Regras duras (violação = trabalho rejeitado)

1. **NUNCA alteres o CONTRATO nem os GUARDRAILS** (`.agent/protected-paths`).
   Contrato: testes de aceitação, datasets e thresholds de evals. Guardrails:
   scripts de verificação, configs, workflows, hooks e estas regras. Se um
   teste ou eval falha, o erro está no teu código: corrige o código, nunca o
   que o verifica. Estes caminhos estão bloqueados para ti (sandbox, hooks e
   CI); tentar contorná-los é a falha mais grave possível. Se achas que um
   deles precisa mesmo de mudar, escreve a versão proposta em
   `.agent/proposals/<mesmo caminho>` com uma nota `<ficheiro>.md` a explicar
   porquê, e pára: o humano decide e aplica.
2. **Nunca uses `any`, `@ts-ignore`, `@ts-expect-error` ou `!` (non-null assertion).**
   Se o tipo não encaixa, o desenho está errado — corrige o desenho.
3. **Nunca desligues regras de lint nem baixes o rigor do `tsconfig.json`.**
   Exceções exigem ADR aprovado por humano.
4. **Dados externos entram SEMPRE por um schema Zod.** Nada de `as Tipo` em
   input não confiável.
5. **Dinheiro em cêntimos inteiros.** Nunca floats para valores monetários.
6. **Nunca comites segredos.** Nada de chaves, tokens ou credenciais no código.
7. **Nunca trabalhes diretamente em `main`.** Branch por work-item
   (`wi/WI-NNNN-slug`), commits pequenos e frequentes.
8. **Âmbito é sagrado.** Só tocas nos ficheiros necessários ao work-item.
   O orçamento de diff (15 ficheiros / 800 linhas) é verificado no CI.

## Workflow obrigatório

1. Lê o work-item em `specs/items/` (ou pede um ao humano se não existir).
2. **Antes de escrever código: apresenta o teu plano e as tuas perguntas.**
   Que assunções estás a fazer? Que casos-limite vês? Espera aprovação.
3. TDD sobre os critérios de aceitação: teste vermelho → código mínimo → refactor.
4. Corre `make check` até tudo verde.
5. Atualiza docs afetados (ADR se houve decisão de arquitetura) no mesmo branch.
6. Atualiza o `status` do work-item.

## Loop de auto-correção

Quando dás o trabalho por terminado e alteraste ficheiros desde o último pedido
do utilizador, um hook corre `make check`. Se falhar, não podes parar: recebes
todas as falhas e corriges. Se não alteraste nada (só apresentaste um plano ou
fizeste perguntas), podes parar mesmo com testes vermelhos. As regras:

1. **Lê a falha toda** antes de mexer. O primeiro erro de tipos explica muitas
   vezes os testes que falham a seguir.
2. **Corrige a causa no código** (`src/`, `evals/subjects/`, ou os testes
   unitários que tu escreveste, se estavam errados). Nunca o contrato.
3. **Proibido "ficar verde" por atalho**: casos especiais para os inputs dos
   testes, detetar se está a correr em teste, enfraquecer as asserções dos
   teus testes unitários, apanhar e engolir exceções. Isto é reward hacking e
   conta como trabalho rejeitado, mesmo com tudo verde.
4. **Tens 4 tentativas.** Se a mesma falha se repete 3 vezes ou esgotas as
   tentativas, o hook manda-te parar. Escreves então ao utilizador: o que
   falha, o que tentaste, a tua hipótese, e que decisão precisas dele.
5. **Precisas de uma decisão do utilizador a meio?** Pergunta e termina a
   mensagem com `[INPUT-HUMANO]`: o hook deixa-te parar com o check
   vermelho. Usa-o só para decisões reais, nunca para fugir a uma correção.
6. **Parar e perguntar não é falhar.** Um relatório honesto ao fim de 4
   tentativas vale mais do que um verde conseguido a contornar.

## Referências

- Schema das specs: `specs/_schema/README.md`
- Decisões existentes: `docs/adr/` — **lê antes de propor mudanças de arquitetura**
- Convenções: `docs/canonical/conventions.md`
- Evals (componentes LLM): `evals/README.md`
- Métodos formais (núcleo crítico, opcional): `formal/README.md`
- Caminhos protegidos e como propor alterações: `.agent/protected-paths`, `.agent/proposals/README.md`
