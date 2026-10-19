BACKEND  := backend
FRONTEND := frontend

.DEFAULT_GOAL := help
.PHONY: help setup dev dev-backend dev-frontend test test-backend test-frontend \
        coverage lint fmt build docker-up docker-down clean

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*## "} /^[a-zA-Z_-]+:.*## / {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

setup: ## Install backend and frontend dependencies
	cd $(BACKEND) && go mod download
	cd $(FRONTEND) && pnpm install --frozen-lockfile

dev: ## Run backend (:8080) and frontend (:5173) together
	@$(MAKE) -j2 dev-backend dev-frontend

dev-backend: ## Run the API with live config from env
	cd $(BACKEND) && ALLOWED_ORIGINS=http://localhost:5173 go run ./cmd/api

dev-frontend: ## Run the Vite dev server (proxies /api to :8080)
	cd $(FRONTEND) && pnpm dev

test: test-backend test-frontend ## Run all unit tests

test-backend:
	cd $(BACKEND) && go test -race ./...

test-frontend:
	cd $(FRONTEND) && pnpm test

coverage: ## Generate coverage reports for both layers
	cd $(BACKEND) && go test -race -coverprofile=coverage.out ./... && \
		go tool cover -func=coverage.out | tail -1 && \
		go tool cover -html=coverage.out -o coverage.html
	cd $(FRONTEND) && pnpm test:coverage

lint: ## Lint both layers
	cd $(BACKEND) && golangci-lint run ./...
	cd $(FRONTEND) && pnpm lint && pnpm typecheck

fmt: ## Format both layers
	cd $(BACKEND) && gofmt -w . && go mod tidy
	cd $(FRONTEND) && pnpm format

build: ## Build the API binary and the frontend bundle
	cd $(BACKEND) && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o bin/api ./cmd/api
	cd $(FRONTEND) && pnpm build

docker-up: ## Build and run the full stack at http://localhost:8080
	docker compose up --build

docker-down: ## Stop the full stack
	docker compose down

clean: ## Remove build and coverage output
	rm -rf $(BACKEND)/bin $(BACKEND)/coverage.out $(BACKEND)/coverage.html
	rm -rf $(FRONTEND)/dist $(FRONTEND)/coverage
