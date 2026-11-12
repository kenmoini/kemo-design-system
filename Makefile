PNPM ?= pnpm
CONTAINER_ENGINE ?= podman
IMAGE ?= kemo-design-system:local

.DEFAULT_GOAL := help

.PHONY: help install codegen lib dev build start lint lint-fix format format-check typecheck test \
	e2e e2e-install gallery check clean container-build container-run park-ui-add park-ui-port

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies and build the design-system manifest
	$(PNPM) install && $(PNPM) --filter @kemo/ui lib

codegen: ## Run Panda codegen for @kemo/ui
	$(PNPM) --filter @kemo/ui codegen

lib: ## Build the @kemo/ui Panda manifest (dist/panda)
	$(PNPM) --filter @kemo/ui lib

dev: ## Run the UI watcher and the preview app (http://localhost:3000)
	$(PNPM) dev

build: ## Build @kemo/ui, then the preview app
	$(PNPM) build

start: ## Serve the built preview app (next start)
	$(PNPM) --filter @kemo/preview start

lint: ## Run ESLint
	$(PNPM) lint

lint-fix: ## Run ESLint with --fix
	$(PNPM) lint:fix

format: ## Format everything with Prettier
	$(PNPM) format

format-check: ## Check formatting with Prettier
	$(PNPM) format:check

typecheck: ## Typecheck all packages
	$(PNPM) typecheck

test: ## Run unit tests (Vitest) and script tests
	$(PNPM) test

e2e: build ## Build, then run the Playwright smoke suite
	$(PNPM) --filter @kemo/preview test:e2e

e2e-install: ## Install the Playwright Chromium browser (once)
	$(PNPM) e2e:install

gallery: build ## Build, then capture the screenshot gallery into docs/gallery (ONLY=blog for one family)
	GALLERY_ONLY="$(ONLY)" $(PNPM) gallery

check: lint format-check typecheck test ## Lint, format check, typecheck and unit tests

clean: ## Remove node_modules and generated output
	$(PNPM) clean

container-build: ## Build the container image (needs network for Google Fonts)
	$(CONTAINER_ENGINE) build -f Containerfile -t $(IMAGE) .

container-run: ## Run the container image on port 8080
	$(CONTAINER_ENGINE) run --rm -p 8080:8080 $(IMAGE)

park-ui-add: ## Add Park UI components: make park-ui-add COMPONENTS="dialog menu"
	@test -n "$(COMPONENTS)" || { echo "COMPONENTS is required, e.g. make park-ui-add COMPONENTS=\"dialog menu\"" >&2; exit 1; }
	node scripts/park-ui/sync.mjs add $(COMPONENTS) && $(PNPM) --filter @kemo/ui codegen

park-ui-port: ## Re-apply the Panda v2 port to the vendored Park UI components
	node scripts/park-ui/sync.mjs port
