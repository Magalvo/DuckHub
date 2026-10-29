# =============================================================================
# Interface única do projeto — para humanos E agentes.
# O agente não adivinha comandos: lê o AGENTS.md, que aponta para aqui.
# `make check` é o comando que o agente corre obsessivamente até ficar verde.
# =============================================================================

.PHONY: help setup check format format-check typecheck lint test test-unit \
        test-acceptance test-properties validate-specs verify-protected test-guards \
        diff-budget onboard-status eval apply-proposals sync-protected formal-setup \
        formal-check formal-demo-race new-item new-track new-adr

help: ## Lista os comandos disponíveis
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

setup: ## Instala dependências e hooks
	npm install

onboard-status: ## O que falta configurar (o agente usa isto na skill de onboarding)
	@node scripts/onboarding-status.mjs

check: verify-protected validate-specs format-check typecheck lint test ## TUDO, sem alterar nada. O loop do agente: correr até verde.
	@echo ""
	@echo "✓✓✓ Tudo verde. ✓✓✓"

format: ## Formata o código (prettier) — escreve ficheiros
	npx prettier --write . --log-level warn

format-check: ## Verifica formatação sem alterar (o check nunca escreve)
	@npx prettier --check . --log-level warn || (echo "→ corre 'make format'" && exit 1)

typecheck: ## Verificação de tipos (tsc --strict)
	npx tsc --noEmit

lint: ## Linter (eslint, regras estritas, sem comentários de desativação)
	npx eslint src tests scripts .claude/hooks

test: ## Todos os testes (unit + acceptance + properties)
	npx vitest run

test-unit: ## Só testes unitários (loop rápido de TDD)
	npx vitest run tests/unit

test-acceptance: ## Só o contrato (tests/acceptance — intocável pelo agente)
	npx vitest run tests/acceptance

test-properties: ## Só property-based tests
	npx vitest run tests/properties

verify-protected: ## Proteções sincronizadas com .agent/protected-paths
	@node scripts/protected-paths.mjs verify

test-guards: ## Testa as próprias guardas contra tentativas de bypass
	@bash scripts/test-guards.sh

# ---- Ações HUMANAS (o agente está bloqueado de as correr) ------------------

apply-proposals: ## (HUMANO) Revê e aplica propostas do agente a ficheiros protegidos
	@node scripts/apply-proposals.mjs

sync-protected: ## (HUMANO) Regenera CODEOWNERS e regras do agente a partir da lista
	@node scripts/protected-paths.mjs sync

# ---------------------------------------------------------------------------

validate-specs: ## Valida o corpus de specs (schema, refs, órfãos, IDs)
	node scripts/validate-specs.mjs

diff-budget: ## Verifica o orçamento de diff vs origin/main
	node scripts/check-diff-budget.mjs

# ---- Evals (componentes probabilísticos/LLM — ver evals/README.md) ---------

eval: ## Corre os evals contra os thresholds (não incluído no check: custa $$/tempo)
	node scripts/run-evals.mjs

# ---- Métodos formais (OPCIONAL — ver formal/README.md) ---------------------

TLA_JAR := formal/tla2tools.jar
TLA_URL := https://github.com/tlaplus/tlaplus/releases/latest/download/tla2tools.jar

formal-setup: ## Descarrega o model checker TLC (requer Java 11+)
	@test -s $(TLA_JAR) || curl -fL -o $(TLA_JAR) $(TLA_URL)
	@java -version 2>&1 | head -1
	@echo "✓ TLC pronto em $(TLA_JAR)"

formal-check: ## Verifica a spec TLA+ (variante correta — deve passar)
	cd formal && java -XX:+UseParallelGC -cp tla2tools.jar tlc2.TLC \
		-deadlock -workers auto -config OrderLifecycle.cfg OrderLifecycle.tla

formal-demo-race: ## Demo: o TLC encontra a race condition da variante naive
	cd formal && java -XX:+UseParallelGC -cp tla2tools.jar tlc2.TLC \
		-deadlock -workers auto -config OrderLifecycleNaive.cfg OrderLifecycle.tla \
		|| echo "↑ FALHOU COMO ESPERADO: o trace acima é uma race condition. O desenho naive viola AMBOS os invariantes (double-charge e pago→cancelado); o TLC mostra a primeira violação encontrada. Para ver a outra, remove um INVARIANT do .cfg."

# ---- Scaffolding (previne drift estrutural) --------------------------------

new-track: ## Novo work-track: make new-track ID=WT-0002 SLUG=nome-curto
	@test -n "$(ID)" -a -n "$(SLUG)" || (echo "uso: make new-track ID=WT-0002 SLUG=nome" && exit 1)
	@sed "s/{{ID}}/$(ID)/g" .agent/templates/track.md > specs/tracks/$(ID)-$(SLUG).md
	@echo "✓ specs/tracks/$(ID)-$(SLUG).md"

new-item: ## Novo work-item: make new-item ID=WI-0002 SLUG=nome-curto TRACK=WT-0001
	@test -n "$(ID)" -a -n "$(SLUG)" -a -n "$(TRACK)" || (echo "uso: make new-item ID=WI-0002 SLUG=nome TRACK=WT-0001" && exit 1)
	@sed -e "s/{{ID}}/$(ID)/g" -e "s/{{TRACK}}/$(TRACK)/g" .agent/templates/work-item.md > specs/items/$(ID)-$(SLUG).md
	@echo "✓ specs/items/$(ID)-$(SLUG).md"

new-adr: ## Novo ADR: make new-adr NUM=0002 SLUG=nome-curto
	@test -n "$(NUM)" -a -n "$(SLUG)" || (echo "uso: make new-adr NUM=0002 SLUG=nome" && exit 1)
	@sed "s/{{NUM}}/$(NUM)/g" .agent/templates/adr.md > docs/adr/$(NUM)-$(SLUG).md
	@echo "✓ docs/adr/$(NUM)-$(SLUG).md"
