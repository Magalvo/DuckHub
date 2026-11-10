# Duck Hub

O Hub digital da comunidade 42. Uma app web gamificada onde alunos e Alumni
da 42 mantêm o convívio, encontram equipa e usam ferramentas úteis. O perfil
constrói-se sozinho a partir da API da 42: entra-se com a conta da Intra e não
há formulários para dados que a Intra já tem.

**Estado:** em desenvolvimento, ainda sem lançamento público. Começa pela 42
Portugal: só entram contas com campus principal em Lisboa ou no Porto. O
lançamento espera pela autorização da 42 / 42 Portugal para o nome, as cores
das Coalitions e a API.

## O que já faz

| Área                   | O que é                                                                                                   | Rota                   |
| ---------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------- |
| **Login**              | OAuth da 42; os tokens ficam no servidor                                                                  | `/login`               |
| **Passaporte**         | Identidade da Intra, Coalition, nível, projetos com a tradução "mundo real", conquistas e radar de skills | `/`                    |
| **Passaporte público** | O que a comunidade vê de cada pessoa, com opção de o esconder                                             | `/u/[login]`           |
| **Comunidade**         | Diretório de quem partilha o Passaporte, com pesquisa por login e campus                                  | `/community`           |
| **Duck Pond**          | Feed das conquistas da comunidade e Rubber Ducks (kudos, um por pessoa por conquista)                     | `/pond`                |
| **The Tavern**         | Encontrar equipa: perfil de trabalho, lobbies por projeto de grupo e compatibilidade entre pessoas        | `/tavern`              |
| **XP Calculator**      | XP ganho num projeto do Common Core para uma nota, com o nível real ao lado                               | `/calculator`          |
| **Conta**              | Visibilidade do Passaporte e apagamento da conta                                                          | `/account`, `/privacy` |

O que vem a seguir está em `specs/tracks/` e em
[`docs/canonical/produto.md`](docs/canonical/produto.md).

## Princípios

1. **Zero fricção.** Tudo o que a Intra já sabe vem da Intra.
2. **A API da 42 é a única fonte dos dados académicos.** Só leitura: o Duck
   Hub nunca escreve na Intra.
3. **Conquistas verificáveis.** Uma badge ou um número só existe se for
   derivável de dados da API, com funções puras e determinísticas.
4. **Privacidade por omissão (RGPD).** Guarda-se o mínimo. Dados da Intra
   nunca vão para logs nem para fixtures. A presença no campus e a data de
   Black Hole de outras pessoas nunca aparecem sem opt-in.
5. **Acessível.** Contraste WCAG AA e navegação por teclado; os testes e2e
   correm o axe em todas as páginas.
6. **O Rubber Duck é o tom.** Não se leva a sério na forma, leva-se a sério
   na utilidade.

## Stack

Next.js (App Router, full-stack) · PostgreSQL com Drizzle · Tailwind com os
tokens de [`docs/canonical/design.md`](docs/canonical/design.md) · OAuth da
42 · TypeScript em modo `strict` máximo (Node 22+, ESM) · Zod em todas as
fronteiras · Vitest e fast-check · Playwright com axe · ESLint
(typescript-eslint strictTypeChecked) e Prettier · Lefthook · GitHub Actions.

## Correr localmente

Requisitos: Node 22+, Docker, `make` e `git`. Em Windows, usa o WSL2.

1. **Dependências** (instala também os hooks de git e o Chromium dos testes
   e2e):

   ```bash
   make setup
   ```

2. **Uma aplicação OAuth registada na Intra**, na secção de API das
   definições do teu perfil, com o _redirect URI_
   `http://localhost:3000/auth/callback`.

3. **Um ficheiro `.env`** na raiz (está no `.gitignore`):

   | Variável             | Exemplo                                                 |
   | -------------------- | ------------------------------------------------------- |
   | `CLIENT_ID`          | o UID da aplicação da Intra                             |
   | `CLIENT_SECRET`      | o secret da aplicação da Intra                          |
   | `APP_URL`            | `http://localhost:3000`                                 |
   | `ALLOWED_CAMPUS_IDS` | `38,58` (Lisboa e Porto)                                |
   | `DATABASE_URL`       | `postgres://duckhub:duckhub_dev@127.0.0.1:5432/duckhub` |
   | `POSTGRES_PORT`      | opcional; outra porta se a 5432 estiver ocupada         |

4. **Base de dados e app:**

   ```bash
   make db-up        # PostgreSQL em Docker, só em 127.0.0.1
   make db-migrate   # aplica as migrações de drizzle/
   make dev          # http://localhost:3000
   ```

As páginas `/login` e `/privacy` funcionam sem `.env`. As outras precisam da
configuração completa. Depois de fazer pull de um PR com migrações novas,
corre outra vez `make db-migrate`.

## Comandos

O `Makefile` é a interface única. `make help` lista todos.

| Comando                | O que faz                                                           |
| ---------------------- | ------------------------------------------------------------------- |
| `make check`           | Tudo o que o CI verifica, sem alterar ficheiros. Tem de ficar verde |
| `make format`          | Corrige a formatação (Prettier)                                     |
| `make test-unit`       | Testes unitários (o loop rápido de TDD)                             |
| `make test-acceptance` | Só o contrato (`tests/acceptance/`)                                 |
| `make test-e2e`        | Contrato com browser (Playwright e axe)                             |
| `make validate-specs`  | Lint das specs (`specs/`)                                           |
| `make new-item`        | Novo work-item: `make new-item ID=WI-NNNN SLUG=nome TRACK=WT-NNNN`  |
| `make new-adr`         | Novo ADR: `make new-adr NUM=NNNN SLUG=nome`                         |

## Como se desenvolve

O Duck Hub é feito com coding agents (Claude Code e outros), com specs, TDD e
defesa em profundidade. As regras para os agentes estão no
[`AGENTS.md`](AGENTS.md); a filosofia, no
[ADR 0001](docs/adr/0001-defesa-em-profundidade.md).

1. Cada iniciativa é um **track** (`specs/tracks/WT-NNNN`) e cada tarefa é
   um **work-item** (`specs/items/WI-NNNN`) com critérios de aceitação.
2. Os **testes de aceitação** (`tests/acceptance/`) são o contrato. São
   escritos ou aprovados por uma pessoa, antes do código.
3. O agente lê o work-item, **apresenta o plano e as perguntas** e espera
   aprovação.
4. TDD até `make check` ficar verde, num branch `wi/WI-NNNN-slug`.
5. PR → CI independente → review humana → merge.

**O que o agente não pode mudar.** O contrato e tudo o que define como se
verifica (scripts, configs, workflows, hooks, `AGENTS.md`) estão listados em
[`.agent/protected-paths`](.agent/protected-paths). O sandbox, os hooks e o CI
bloqueiam essas alterações. Quando um destes ficheiros precisa mesmo de mudar,
o agente escreve a proposta em `.agent/proposals/` e uma pessoa aplica-a com
`make apply-proposals`.

**No CI**, um PR precisa de:

- `check` verde: o mesmo que o `make check`. Os testes das próprias guardas só
  correm quando o PR muda uma guarda;
- `protected-paths`: um PR que muda o contrato ou uma guarda precisa da label
  `contract-change-approved`;
- `diff-budget`: até 15 ficheiros e 800 linhas. Acima disso, só com a label
  `diff-budget-override` e uma justificação no PR.

## Estrutura

| Pasta                                                    | O que tem                                                 |
| -------------------------------------------------------- | --------------------------------------------------------- |
| `src/app/`                                               | Páginas e rotas (Next.js App Router)                      |
| `src/`                                                   | Domínio, cliente da API da 42, base de dados, componentes |
| `drizzle/`                                               | Migrações da base de dados                                |
| `specs/`                                                 | Tracks e work-items                                       |
| `tests/acceptance/`                                      | O contrato: testes de aceitação e e2e                     |
| `tests/unit/`, `tests/properties/`, `tests/integration/` | Os outros testes                                          |
| `docs/adr/`                                              | Decisões de arquitetura e o porquê                        |
| `docs/canonical/`                                        | Produto, design e convenções                              |

## Documentação

- [Produto](docs/canonical/produto.md): o que é, para quem, pilares e regras
  de domínio.
- [Design](docs/canonical/design.md): o tema Cyber Duck e os tokens.
- [Convenções](docs/canonical/conventions.md).
- [Decisões de arquitetura](docs/adr/): do onboarding (ADR 0003) ao
  alojamento (ADR 0018) e ao analytics (ADR 0019).
- [Endpoints da API da 42](docs/API_42_endpoints.md): o que cada endpoint dá
  e com que tipo de token.
