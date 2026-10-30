# =============================================================================
# Interface única do projeto — para humanos E agentes.
# O agente não adivinha comandos: lê o AGENTS.md, que aponta para aqui.
# `make check` é o comando que o agente corre obsessivamente até ficar verde.
# =============================================================================

.PHONY: help setup check format format-check typecheck lint test test-unit \
        test-acceptance test-properties test-e2e validate-specs verify-protected \
        test-guards dev db-up db-down diff-budget onboard-status apply-proposals sync-protected \
        new-item new-track new-adr

help: ## Lista os comandos disponíveis
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

setup: ## Instala dependências, hooks e o browser dos testes e2e
	npm install
	npx playwright install chromium

dev: ## Arranca a app localmente (http://localhost:3000); não precisa da DB
	NEXT_TELEMETRY_DISABLED=1 npx next dev --port 3000

db-up: ## Sobe o PostgreSQL local (Docker Compose)
	docker compose up -d --wait db

db-down: ## Pára o PostgreSQL local (os dados ficam no volume)
	docker compose down

onboard-status: ## O que falta configurar (o agente usa isto na skill de onboarding)
	@node scripts/onboarding-status.mjs

check: verify-protected validate-specs format-check typecheck lint test test-e2e ## TUDO, sem alterar nada. O loop do agente: correr até verde.
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

test-e2e: ## Contrato com browser (Playwright + axe, ADR 0005); sobe a app via make dev
	npx playwright test

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
