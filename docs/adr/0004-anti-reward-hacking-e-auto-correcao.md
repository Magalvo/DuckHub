# ADR-0004 — Anti reward hacking e loop de auto-correção

- **Estado:** aceite
- **Data:** 2026-10-29
- **Decisor(es):** equipa fundadora

## Contexto

O ADR-0001 protegia o contrato (testes de aceitação) com um hook local e um job
de CI. Uma revisão mostrou que isso não chegava: os scripts que fazem as
verificações não estavam protegidos, e o CI corria-os a partir da branch do
próprio PR. Um agente podia deixar o contrato intacto e enfraquecer o
verificador, ou mudar os dois no mesmo PR. As regras deny do Claude Code
também só cobriam a ferramenta Edit, não o Bash. Faltava ainda o outro lado:
garantir que o agente não termina uma tarefa com o check vermelho, mas sem o
deixar em loop infinito nem empurrá-lo para atalhos.

## Decisão

1. **Fonte única** em `.agent/protected-paths`, com dois níveis: contrato (o
   que define "correto") e guardrail (o que define como se verifica). Hook de
   pre-commit, guarda de CI, CODEOWNERS e regras do agente leem dessa lista ou
   são gerados dela; `make check` falha se divergirem.
2. **Guarda de CI a partir da base** (`guard.yml`, `pull_request_target`): o
   workflow, o script e a lista vêm da branch base; do PR só se leem nomes de
   ficheiros, nunca se executa código.
3. **Claude Code trancado** no fim do onboarding: regras deny geradas da lista
   (que o sandbox aplica também ao Bash), sandbox estrito sem fuga
   para comandos não isolados, modo bypass desligado, e uma guarda de Bash que
   explica ao agente porque foi bloqueado.
4. **Propostas** em `.agent/proposals/` para alterações a ficheiros
   protegidos; só um humano as aplica (`make apply-proposals`, exige TTY).
5. **Loop de auto-correção** num Stop hook: corre `make -k check` quando o
   agente quer terminar e devolve-lhe todas as falhas. Escala para o humano
   ao fim de 4 tentativas ou 3 falhas iguais seguidas; o agente pára e
   escreve um relatório. `make check` passou a nunca escrever ficheiros.
6. **Lint sem desativação inline** (`noInlineConfig`).
7. **As guardas têm testes** (`make test-guards`), também no CI.

## Consequências

Melhor: o único caminho para verde é corrigir o código; o agente não fica
preso a tentar indefinidamente; um PR não consegue aprovar-se a si próprio.
Pior: mais fricção para mudar configuração (proposta + aplicação humana +
commit aprovado); o sandbox exige `bubblewrap` e `socat` em Linux e não
existe em Windows nativo. Limite assumido: proteções locais são
contornáveis por um processo determinado; a garantia é a branch protection
com review do code owner, que tem de ser configurada no servidor.
