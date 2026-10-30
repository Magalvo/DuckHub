# AI-Driven Development Boilerplate

Ponto de partida para desenvolvimento de software com coding agents (Claude Code,
Codex, Cursor, Aider), combinando **SDD** (spec-driven development), **TDD** e
**defesa em profundidade**. A filosofia completa está em
`docs/adr/0001-defesa-em-profundidade.md`; as regras para o agente em `AGENTS.md`.

A premissa: nenhum sistema previne todos os erros de um modelo probabilístico.
Este desenha o ambiente onde os erros **não sobrevivem** — baratos de detetar,
impossíveis de esconder, triviais de reverter.

## Setup

```bash
git init
npm install        # instala deps + hooks do lefthook (via "prepare")
make check         # tudo deve ficar verde à primeira
make onboard-status
```

Depois, abre o teu agente na pasta do projeto e pede _"faz o onboarding deste
projeto"_ (no Claude Code: `/onboarding`). O agente segue
`.claude/skills/onboarding/SKILL.md`: deteta sozinho o que consegue ler no
repositório e pergunta-te só as decisões que são tuas, um bloco de cada vez:

| Bloco | O que decides                                                        |
| ----- | -------------------------------------------------------------------- |
| A     | Projeto novo ou existente; tipo de projeto                           |
| B     | Propósito e regras duras do domínio para o `AGENTS.md`               |
| C     | Quem escreve os testes de aceitação; dono do contrato (`CODEOWNERS`) |
| D     | Que camadas opcionais ficam (evals, métodos formais)                 |
| E     | Que agentes usas; permissões reais da ferramenta                     |
| F     | Proteção da branch e orçamento de diff                               |
| G     | Primeiro épico e work-item; quando sai o domínio de exemplo          |

No fim, as decisões ficam em `docs/adr/0003-onboarding.md`. Tudo o que mexe
no contrato fica preparado pelo agente mas é commitado por ti, com
`ACCEPT_CONTRACT_CHANGE=1`.

Requisitos: Node 22+, make, git.

## As cinco camadas (e onde vivem)

| #   | Camada                             | Neste repo                                                                                        |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1   | Estados inválidos irrepresentáveis | `tsconfig.json` estrito · Zod nas fronteiras (regra dura 4 do `AGENTS.md`)                        |
| 2   | Portão de planeamento              | Workflow obrigatório no `AGENTS.md` (plano + perguntas antes de código)                           |
| 3   | Loop determinístico                | `make check` · `lefthook.yml` · caminhos protegidos · Stop hook de auto-correção · property tests |
| 4   | Isolamento e reversibilidade       | Branch por work-item · `.agent/permissions.json` · worktrees                                      |
| 5   | Assumir falha                      | `.github/workflows/ci.yml` — verificação independente + orçamento de diff                         |

## O fluxo de trabalho

1. `make new-track ID=WT-0002 SLUG=meu-epico` — define a iniciativa
2. `make new-item ID=WI-0002 SLUG=minha-tarefa TRACK=WT-0002` — tarefa atómica com critérios de aceitação
3. Humano escreve (ou aprova) os testes de aceitação em `tests/acceptance/`
4. Agente lê o work-item, **apresenta plano e perguntas**, humano aprova
5. Agente faz TDD (`make test-unit` no loop) até `make check` verde
6. PR → CI independente → review humano do diff → merge

Com componentes LLM: passo extra — alterou prompt/modelo/subject? `make eval`
antes do merge. Com núcleo crítico formalizado: o desenho muda primeiro na spec
TLA+ (`make formal-check`), só depois no código.

## Decisões estruturais que interessam

- **Contrato e guardrails são intocáveis pelo agente.** A lista está em
  `.agent/protected-paths`: o contrato (testes de aceitação, datasets e
  thresholds) e tudo o que define como se verifica (scripts, configs,
  workflows, hooks, regras). Ver a secção seguinte.
- **Testes de aceitação vêm de fonte independente do código.** Escritos pelo
  humano, ou por outro modelo/sessão sem acesso à implementação — testes do
  mesmo modelo partilham os mesmos pontos cegos.
- **Orçamento de diff** (15 ficheiros / 800 linhas por defeito): scope creep
  de agente falha o CI em vez de passar despercebido.
- **Specs têm lint** (`make validate-specs`): schema, IDs únicos, refs
  quebradas, tracks órfãos. SDD sem validação não escala.
- **Makefile como interface única**: o agente nunca adivinha comandos.

## Anti reward hacking e loop de auto-correção

O objetivo: quando um teste falha, o único caminho para verde é corrigir o
código. Mudar o teste, o threshold, o script que verifica, a config do linter
ou o workflow de CI não pode funcionar. E o agente não pode dar a tarefa por
terminada com o check vermelho.

**Fonte única:** `.agent/protected-paths` lista os caminhos protegidos em dois
níveis, contrato e guardrail. Todas as camadas leem dessa lista ou são geradas
a partir dela, e `make check` falha se divergirem.

| Tentativa do agente                                          | O que a trava                                                                    |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Editar um teste de aceitação, dataset ou threshold           | Regra deny do Claude Code (ferramenta Edit)                                      |
| Fazer o mesmo por Bash (`sed -i`, `>`, `rm`, `node -e`)      | Sandbox (as regras deny entram no sandbox) + guarda de Bash                      |
| Enfraquecer o script de verificação em vez do teste          | Mesmas regras: `scripts/` é guardrail                                            |
| Silenciar o linter com `eslint-disable`                      | `noInlineConfig`: comentários de desativação não têm efeito                      |
| Commit com `--no-verify` ou `ACCEPT_CONTRACT_CHANGE=1`       | Guarda de Bash nega o comando                                                    |
| PR que muda o contrato **e** o guarda ao mesmo tempo         | `guard.yml` corre a partir da base, não do PR                                    |
| Qualquer coisa que escape a tudo o resto                     | CODEOWNERS + branch protection: review humana obrigatória                        |
| Terminar com `make check` vermelho depois de mexer no código | Stop hook: devolve todas as falhas e obriga a continuar                          |
| Forjar o contador do loop para escapar                       | O estado vive em `.claude/hooks/.state/`, fora do alcance do agente              |
| Insistir sem progresso                                       | O hook escala ao fim de 4 tentativas ou 3 falhas iguais: o agente pára e reporta |

**O loop não atrapalha o TDD.** Só verifica quando o agente alterou ficheiros
desde o teu último pedido: com testes de aceitação novos e vermelhos, o agente
pode parar para te mostrar o plano. A meio do trabalho, se precisar de uma
decisão tua, termina a mensagem com `[INPUT-HUMANO]` e pode parar.

**Quando um ficheiro protegido precisa mesmo de mudar**, o agente escreve a
proposta em `.agent/proposals/` e explica porquê. Tu revês e aplicas com
`make apply-proposals` (exige terminal interativo), e fazes commit com
`ACCEPT_CONTRACT_CHANGE=1`.

**As guardas têm testes.** `make test-guards` corre 38 cenários numa cópia do
projeto: tentativas de bypass que têm de falhar e casos legítimos que não
podem ser bloqueados. Também corre no CI.

**Limites honestos:**

- Tudo o que é local pode ser contornado por um processo determinado na tua
  máquina. A garantia está no servidor: branch protection com review do code
  owner, sem exceção para admins (bloco F do onboarding).
- O sandbox existe em macOS, Linux e WSL2; em Windows nativo, a escrita por
  Bash fica protegida só pela guarda de Bash (deteção por texto), pelo
  pre-commit e pelo CI.
- A guarda de Bash é deteção por padrões de texto. Serve para explicar ao
  agente porque foi bloqueado; o bloqueio real é o sandbox.
- O loop de auto-correção automático é do Claude Code (Stop hook). Noutros
  agentes depende de seguirem o protocolo do `AGENTS.md`; o CI continua a
  ser a rede.
- Nenhuma guarda impede código feito à medida dos testes (casos especiais
  para os inputs). Isso apanha-se com property tests, testes de aceitação
  escritos por quem não escreveu o código, e review do diff.

## All-in-one: o que ativar no TEU projeto

Este boilerplate traz todas as camadas instaladas, mas nem todas se pagam em
todos os projetos. Guia de decisão por tipo de projeto:

| Camada                          | Protótipo / PoC | Produto standard | Produto com LLM | Sistema crítico\* |
| ------------------------------- | --------------- | ---------------- | --------------- | ----------------- |
| Tipos estritos + Zod (1)        | ✓ (grátis)      | ✓                | ✓               | ✓                 |
| Portão de planeamento (2)       | —               | ✓                | ✓               | ✓                 |
| `make check` + hooks (3)        | parcial\*\*     | ✓                | ✓               | ✓                 |
| Contrato protegido (3)          | —               | ✓                | ✓               | ✓                 |
| Specs SDD + validador (2/3)     | —               | ✓                | ✓               | ✓                 |
| Orçamento de diff (5)           | —               | ✓                | ✓               | ✓                 |
| Property-based tests (3)        | —               | recomendado      | recomendado     | ✓                 |
| **Evals** (`evals/`)            | —               | —                | **✓**           | se tiver LLM      |
| **Métodos formais** (`formal/`) | —               | —                | —               | **✓ no núcleo**   |

\* Pagamentos, saúde, infraestrutura, concorrência/distribuição não-trivial.
\*\* Num protótipo, mantém tipos+lint (custam zero) e dispensa o resto — código
que vive três dias não justifica cerimónia. O erro simétrico também existe:
levar hábitos de protótipo para produção.

Como desativar o que não precisas:

- **Evals**: apaga `evals/`, `scripts/run-evals.mjs` e `.github/workflows/evals.yml`.
- **Métodos formais**: apaga `formal/` (não tem dependências no resto).
- **Contrato/hooks** (só em protótipos): `npx lefthook uninstall` e ignora `tests/acceptance/`.
- Cada pasta opcional tem o seu `README.md` com o racional completo de
  quando ativar — decide com base no custo do erro, não no entusiasmo.

E o inverso — sinais de que está na hora de ativar uma camada que deixaste fora:

- O produto ganhou um LLM (chatbot, classificação, geração) → ativa `evals/`
- Apareceu concorrência com dinheiro/dados em jogo (webhooks, stock, locks) → ativa `formal/`
- O protótipo "temporário" vai fazer seis meses e tem utilizadores → ativa tudo o resto

## Adaptar ao teu projeto

1. Substitui o domínio de exemplo pelo teu — mantém os padrões. No Duck Hub
   já foi removido (o `order` e os exemplos WT/WI-0001).
2. Reescreve o `AGENTS.md`: propósito, stack, regras duras específicas.
3. Cria o teu primeiro track e work-item reais.
4. Configura branch protection no GitHub (instruções no topo do `ci.yml`).
5. Opcional mas recomendado: mutation testing (Stryker) como job noturno no
   CI — mede se os testes realmente falham quando o código muda.

## Stack

TypeScript 5 (`strict` máximo) · Zod · Vitest · fast-check · ESLint
(typescript-eslint strictTypeChecked) · Prettier · Lefthook · GitHub Actions.

A metodologia é agnóstica de linguagem: para Python, o equivalente é
mypy `--strict` + Pydantic + pytest + Hypothesis + ruff + pre-commit.
