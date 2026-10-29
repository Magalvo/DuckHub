---
name: onboarding
description: Configura este boilerplate para um projeto concreto, perguntando ao utilizador só as decisões que precisam de input humano. Usar no primeiro arranque, quando `make onboard-status` mostra pendentes, ou quando o utilizador pede "faz o onboarding", "configura o projeto" ou /onboarding.
---

# Onboarding do projeto

Guia para o agente (Claude Code, Codex, Cursor ou outro) conduzir a
configuração inicial do boilerplate **em conversa com o utilizador**.
O agente faz o trabalho mecânico; o utilizador toma as decisões que só ele
pode tomar. No fim, as decisões ficam registadas em ADR e o projeto está
pronto para o primeiro work-item real.

Agentes que não sejam o Claude Code: este ficheiro é o guia completo; segue-o
tal como está. Onde se fala de `AskUserQuestion`, usa o mecanismo de perguntas
da tua ferramenta ou, se não houver, perguntas numeradas em texto simples.

## Regras do agente durante o onboarding

1. **Deteta antes de perguntar.** Nunca perguntes o que consegues ler no
   repositório: stack, comandos, nº de commits, se há LLM no código, se há
   remote GitHub. Pergunta para _confirmar_ ("Detetei X. Está certo?") só
   quando a deteção é incerta.
2. **Pergunta só o que é decisão humana.** Propósito, regras de domínio,
   quem é dono do contrato, que camadas ativar, que riscos aceitar.
3. **Um bloco de cada vez.** Faz as perguntas de um bloco (máximo 4 de cada
   vez), aplica as respostas, mostra o que mudou numa linha, e só então passa
   ao bloco seguinte. Nunca despejes 15 perguntas de uma vez.
4. **Opções concretas e curtas, recomendação primeiro.** Rótulos com 1–5
   palavras; o detalhe vai na descrição. Cada pergunta de escolha tem
   2–4 opções. A opção recomendada vem primeiro com "(Recomendado)" e a
   descrição diz a consequência da escolha, não a repete.
5. **Perguntas abertas em texto.** Propósito do projeto, nome do primeiro
   épico: pergunta em texto simples, não inventes opções artificiais.
6. **Os caminhos protegidos são do humano.** Tudo o que está em
   `.agent/protected-paths` (contrato e guardrails) só entra num commit com
   `ACCEPT_CONTRACT_CHANGE=1`, e essa variável define-a o utilizador, nunca
   tu. Prepara as alterações e dá-lhe o comando exato.
   **Ordem:** durante o onboarding ainda podes editar esses ficheiros, com a
   aprovação do utilizador em cada edição. O último passo (Fecho) tranca-os:
   a partir daí, só por proposta em `.agent/proposals/`.
7. **Nada destrutivo sem confirmação.** Apagar pastas, mudar configuração de
   permissões ou correr comandos `gh` que alteram o GitHub: mostra o que vais
   fazer e espera um "sim".
8. **Retoma, não recomeça.** Se o onboarding foi interrompido, o
   `onboarding-status` diz o que falta; continua a partir daí.
9. **Sem resposta, sem decisão irreversível.** Se o utilizador não responde
   (sessão sem ninguém a ver), avança só com o que é reversível, regista a
   leitura que fizeste e deixa o resto marcado como pendente.

## Passo 0 — Diagnóstico (sem perguntas)

1. Corre `node scripts/onboarding-status.mjs --json`. Os itens com
   `"ok": false` dizem que blocos (A–G) têm trabalho.
2. Lê `README.md`, `AGENTS.md` e `docs/adr/`.
3. Recolhe sinais para as perguntas seguintes:
   - `git log --oneline | wc -l` e ficheiros em `src/` que não sejam do
     boilerplate → projeto novo ou existente?
   - dependências e imports de SDKs de LLM (`@anthropic-ai/sdk`, `openai`,
     `langchain`…) → há LLM no produto?
   - padrões de concorrência com estado partilhado (filas, webhooks, locks,
     pagamentos, stock) → candidato a métodos formais?
   - `git remote -v` → GitHub, GitLab, outro, ou nenhum?
4. Diz ao utilizador numa frase o que detetaste e quantos blocos faltam.

## Bloco A — Contexto do projeto

**Pergunta** (uma chamada `AskUserQuestion`, 2 perguntas):

- _"Este é um projeto novo ou vais aplicar o boilerplate a código existente?"_
  — Projeto novo / Código existente. Pré-seleciona como recomendado o que o
  diagnóstico indicar.
- _"Que tipo de projeto é?"_ — Produto standard / Produto com LLM /
  Sistema crítico / Protótipo. Descrições curtas tiradas da matriz do README
  (ex.: Sistema crítico → "pagamentos, saúde, infraestrutura, concorrência
  com dinheiro ou dados").

**Aplica:**

- Código existente → segue a secção "Projeto existente" no fim deste guia
  antes de continuar.
- Protótipo → confirma que o utilizador quer mesmo dispensar contrato, specs
  e orçamento de diff; mantém tipos estritos e lint (custam zero).

## Bloco B — Propósito, stack e regras de domínio

**Deteta:** stack a partir de `package.json`, `pyproject.toml`, `go.mod`…

**Pergunta em texto:** _"Em uma ou duas frases: porque é que este projeto
existe e para quem?"_

**Pergunta** (`AskUserQuestion`, multiSelect): _"Que regras duras do domínio
devem entrar no AGENTS.md?"_ Exemplos de opções, adapta ao que detetaste:

- Dados pessoais (RGPD): nunca em logs, nunca em fixtures reais
- Dinheiro: cêntimos inteiros, operações idempotentes
- Segurança: segredos só por variáveis de ambiente, input sempre validado
- Acessibilidade: componentes UI com testes de a11y

Se a stack detetada não for TypeScript, pergunta se o utilizador quer portar
os princípios para essa stack (o README lista o equivalente Python) antes de
continuar; não convertas o projeto por iniciativa própria.

**Aplica:** substitui o bloco `<!-- SUBSTITUIR -->` e o parágrafo seguinte
do `AGENTS.md` pelo propósito; acrescenta as regras escolhidas à lista
"Regras duras", numeradas a seguir às existentes. Mantém o ficheiro curto.

## Bloco C — Dono do contrato

**Pergunta** (`AskUserQuestion`):

- _"Quem escreve os testes de aceitação?"_ — Humano escreve (Recomendado) /
  Outro agente, humano aprova / Misto conforme o risco. Descrição
  da segunda opção: "sessão separada, sem acesso à implementação".

**Pergunta em texto:** _"Qual é o teu handle do GitHub (ou de quem aprova
alterações ao contrato)?"_ Usa-o também como `owner` por defeito nas specs.

**Aplica:** cria `.github/CODEOWNERS` copiando
`.agent/templates/CODEOWNERS` e substituindo `@OWNER` pelo handle. O ficheiro
cobre todos os caminhos protegidos, incluindo os scripts e workflows que fazem
as verificações. Confirma com `node scripts/protected-paths.mjs verify`.
Regista a política escolhida na secção "Workflow obrigatório" do `AGENTS.md`.

## Bloco D — Camadas opcionais

**Só pergunta o que o bloco A não decidiu.** Para cada camada, mostra o que
o diagnóstico encontrou:

- _"O produto vai ter um LLM lá dentro (chatbot, classificação, geração)?"_
  — Sim, manter evals / Ainda não, remover por agora / Não sei, manter.
- _"Há concorrência com dinheiro ou dados em jogo (webhooks, stock, locks)?"_
  — Não, remover formal/ / Sim, manter métodos formais / Talvez, manter
  como referência.

**Aplica:**

- Remover `formal/`: apaga a pasta, os alvos `formal-*` do Makefile e a linha
  `formal/**` de `.agent/protected-paths`.
- Remover `evals/`: inclui `evals/datasets/` e `evals/thresholds.json`, que
  são contrato. Prepara a remoção (pasta, `scripts/run-evals.mjs`,
  `.github/workflows/evals.yml`, alvo `eval` do Makefile) e dá ao utilizador
  o commit a fazer: `ACCEPT_CONTRACT_CHANGE=1 git commit -m "..."`. Remove
  também as linhas `evals/...` de `.agent/protected-paths`.
- Depois de mexer na lista: `node scripts/protected-paths.mjs sync` (ainda
  antes do Fecho; depois dele, essa ação passa a ser do humano).

## Bloco E — Ferramenta de agente, sandbox e loop de auto-correção

**Pergunta** (`AskUserQuestion`, multiSelect): _"Que agentes vão trabalhar
neste repositório?"_ — Claude Code / Codex / Cursor / Outro.

**Deteta** o sistema operativo (`uname -s`, WSL em `/proc/version`) e, em
Linux/WSL2, se `bwrap` e `socat` existem.

**Aplica** (prepara agora; a ativação é o último passo do Fecho):

- Claude Code:
  - cria `CLAUDE.md` com uma linha, `@AGENTS.md`, para haver uma só fonte
    de verdade;
  - prepara `.claude/settings.json` a partir de
    `.agent/templates/claude-settings.json`. Esse ficheiro liga quatro coisas:
    regras deny geradas da lista de caminhos protegidos, que o sandbox aplica
    também aos comandos de Bash; modo bypass desligado; a guarda de Bash
    (`.claude/hooks/bash-guard.mjs`); e o loop de auto-correção
    (`.claude/hooks/self-heal.mjs`), que corre `make check` sempre que o
    agente quer terminar e o devolve ao trabalho até 4 vezes antes de
    escalar para o humano.
  - Sandbox: em Linux/WSL2 sem `bwrap`/`socat`, diz ao utilizador o comando
    para instalar (`sudo apt-get install bubblewrap socat`). Em Windows
    nativo não há sandbox: pergunta se prefere correr o Claude Code em WSL2
    (Recomendado) ou aceitar ficar sem sandbox, e nesse caso muda
    `failIfUnavailable` para `false` e regista no ADR que a escrita por Bash
    fica protegida só pela guarda de Bash, pelo pre-commit e pelo CI.
- Outras ferramentas: traduz `.agent/permissions.json` e a lista
  `.agent/protected-paths` para o formato delas. Se não souberes o formato
  com certeza, diz isso e aponta para a documentação em vez de adivinhar.
  Diz ao utilizador que, nelas, o loop de auto-correção depende de o agente
  seguir a secção do `AGENTS.md`, porque não há um Stop hook equivalente.

## Bloco F — Repositório, hooks e proteção no servidor

**Deteta:** `.git`, hooks instalados, remote, se `gh` está autenticado.

**Aplica sem perguntar** (reversível): `git init`, `npm install`,
`npx lefthook install`.

**Explica numa frase** porque é que este bloco importa: tudo o que é local
(regras do agente, hooks, sandbox) apanha erros cedo, mas só o servidor
garante. A garantia é o merge em `main` exigir review do code owner e os
checks obrigatórios, sem exceção para admins.

**Pergunta** (`AskUserQuestion`):

- _"Configuro a proteção da branch main no GitHub?"_ — Mostra-me os comandos
  (Recomendado) / Faz tu com o gh / Faço eu depois. Só ofereces a segunda se
  `gh` estiver autenticado. A configurar:
  - PR obrigatório, 1 review, **"Require review from Code Owners"**;
  - checks obrigatórios: `check`, `diff-budget` e `protected-paths` (este
    último vem de `guard.yml`, que corre a partir da base);
  - "Do not allow bypassing the above settings" (inclui admins);
  - force-push bloqueado;
  - labels `contract-change-approved` e `diff-budget-override`
    (`gh label create ...`).
- Projeto existente: calcula o percentil 90 do tamanho dos PRs/commits no
  histórico e pergunta _"O orçamento de diff fica em N ficheiros / M linhas,
  calculado do teu histórico?"_ — Usar valores calculados (Recomendado) /
  Manter 15/800 / Definir outros. Aplica em `DIFF_BUDGET_FILES` e
  `DIFF_BUDGET_LINES` no workflow de CI.

**Verifica** (só leitura, se `gh` estiver autenticado), e reporta cada ponto
como ✓ ou ✗:

```bash
gh api repos/{owner}/{repo}/branches/main/protection \
  --jq '{codeowners: .required_pull_request_reviews.require_code_owner_reviews,
         checks: .required_status_checks.contexts,
         admins: .enforce_admins.enabled}'
gh api repos/{owner}/{repo} --jq .permissions.admin
```

Se o token com que o agente trabalha tiver `admin: true` e `admins` estiver
desligado, avisa: esse agente consegue fazer merge sem review. Sem `gh`, diz
claramente que a proteção no servidor **não foi verificada** e regista isso
como pendente no ADR.

## Bloco G — Exemplo e primeiro trabalho real

**Pergunta em texto:** _"Qual é a primeira coisa que este projeto tem de
fazer? Um título curto e o resultado que queres ver."_

**Aplica:**

1. Cria o primeiro épico e work-item: `make new-track ID=WT-0002 SLUG=...` e
   `make new-item ID=WI-0002 SLUG=... TRACK=WT-0002`, preenchidos com a
   resposta. Status `draft`: os critérios de aceitação ficam por escrever.
2. Pergunta (`AskUserQuestion`): _"Removo já o domínio de exemplo
   (encomendas)?"_ — Após o primeiro WI (Recomendado) / Remover
   agora / Manter como referência. Remover significa `src/order.ts`, os
   testes `tests/**/order*`, os exemplos WT-0001/WI-0001 e, se `formal/`
   ficou, a spec continua como exemplo isolado. Como toca no contrato,
   preparas as alterações e o utilizador faz o commit com
   `ACCEPT_CONTRACT_CHANGE=1`.
3. Recorda a regra do bloco C: os testes de aceitação do WI-0002 são
   escritos por quem foi escolhido lá, não por ti.

## Fecho

1. Escreve `docs/adr/0003-onboarding.md` (usa `make new-adr NUM=0003
SLUG=onboarding`) com: tipo de projeto, camadas ativas e removidas e
   porquê, dono do contrato e política de aceitação, agentes em uso,
   sandbox (ativo ou não, e porquê), orçamento de diff, estado da proteção no
   servidor, o que ficou pendente.
2. Corre `make check`, `make test-guards` e
   `node scripts/onboarding-status.mjs`.
3. **Trancar.** Mostra ao utilizador o que muda a partir daqui: o agente
   deixa de conseguir alterar os caminhos protegidos (só propõe em
   `.agent/proposals/`), e passa a não poder terminar uma tarefa com
   `make check` vermelho. Pede confirmação e só então escreve
   `.claude/settings.json` (a partir do template) e corre
   `node scripts/protected-paths.mjs verify`. Diz-lhe para reiniciar a
   sessão do Claude Code e confirmar com `/permissions`, `/hooks` e
   `/sandbox` que tudo carregou.
4. Resume em poucas linhas o que ficou configurado e o que **só ele** pode
   fazer: commits com `ACCEPT_CONTRACT_CHANGE=1`, `make apply-proposals`,
   `make sync-protected`, proteção de branch se não foi feita, escrever os
   primeiros testes de aceitação.

## Projeto existente

Não copies o boilerplate inteiro para cima de código existente. Antes do
bloco B:

1. **Arqueologia, só leitura.** Analisa arquitetura, comandos de build e
   teste, convenções e zonas frágeis. Escreve rascunhos de `AGENTS.md` e
   `docs/canonical/` e pede ao utilizador que os reveja: diz explicitamente
   que podes ter inferido convenções que não existem.
2. **Pergunta** (`AskUserQuestion`): _"Até onde queres ir neste
   onboarding?"_ — Só interface (Recomendado; AGENTS.md e Makefile) /
   Interface + rigor gradual / Tudo, por fases. As fases seguem o guia de
   adoção: interface → ratchet de rigor → testes de caracterização → SDD
   daqui para a frente → orçamento calibrado → camadas opcionais.
3. **Ratchet, nunca big bang.** Não ligues `strict` nem lint estrito no
   código todo: modo estrito para código novo, baseline de erros que só pode
   descer para o legado.
4. **Hooks:** se o repositório já usa husky ou pre-commit, pergunta qual
   sistema fica e não instales o segundo.

## Exemplo de chamada

```json
{
  "questions": [
    {
      "question": "Este é um projeto novo ou vais aplicar o boilerplate a código existente?",
      "header": "Partida",
      "multiSelect": false,
      "options": [
        {
          "label": "Projeto novo (Recomendado)",
          "description": "O diagnóstico só encontrou o código de exemplo."
        },
        {
          "label": "Código existente",
          "description": "Começo por uma análise só de leitura antes de mudar nada."
        }
      ]
    },
    {
      "question": "Que tipo de projeto é?",
      "header": "Tipo",
      "multiSelect": false,
      "options": [
        {
          "label": "Produto standard",
          "description": "Todas as camadas base; evals e formal saem."
        },
        {
          "label": "Produto com LLM",
          "description": "Base + evals para os componentes probabilísticos."
        },
        {
          "label": "Sistema crítico",
          "description": "Base + métodos formais no núcleo com concorrência."
        },
        { "label": "Protótipo", "description": "Só tipos e lint; sem contrato nem specs." }
      ]
    }
  ]
}
```

Nota: o `header` tem no máximo 12 caracteres e cada pergunta 2–4 opções; o
utilizador pode sempre escrever outra resposta.
