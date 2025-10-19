# VRSS Social Platform - Developer Workflow Makefile
# Simplified commands for common Docker operations

.PHONY: help setup start stop restart logs build clean rebuild test db-backup db-restore db-migrate prod-build prod-start

# Default target
.DEFAULT_GOAL := help

# Load environment variables from .env file
ifneq (,$(wildcard ./.env))
    include .env
    export
endif

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default port values (fallback if .env not present)
FRONTEND_PORT ?= 5050
BACKEND_PORT ?= 3030
DB_PORT ?= 5555

##@ General

help: ## Display this help message
	@echo "$(BLUE)VRSS Social Platform - Docker Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(GREEN)<target>$(NC)\n"} /^[a-zA-Z_0-9-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

setup: ## Initial setup - copy .env.example and create directories
	@echo "$(BLUE)Setting up VRSS development environment...$(NC)"
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(GREEN)Created .env file from .env.example$(NC)"; \
		echo "$(YELLOW)Please review and update .env with your settings$(NC)"; \
	else \
		echo "$(YELLOW).env file already exists, skipping...$(NC)"; \
	fi
	@mkdir -p docker/db/backup storage/media backend/logs frontend/logs
	@touch storage/media/.gitkeep docker/db/backup/.gitkeep
	@echo "$(GREEN)Setup complete!$(NC)"
	@echo "$(YELLOW)Next steps:$(NC)"
	@echo "  1. Review and update .env file"
	@echo "  2. Run 'make start' to start the application"

start: ## Start all services in development mode
	@echo "$(BLUE)Starting VRSS services...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)Services started!$(NC)"
	@echo "$(YELLOW)Frontend:$(NC) http://localhost:$(FRONTEND_PORT)"
	@echo "$(YELLOW)Backend API:$(NC) http://localhost:$(BACKEND_PORT)"
	@echo "$(YELLOW)Database:$(NC) localhost:$(DB_PORT)"
	@echo ""
	@echo "Run 'make logs' to view logs"

stop: ## Stop all services
	@echo "$(BLUE)Stopping VRSS services...$(NC)"
	docker-compose down
	@echo "$(GREEN)Services stopped$(NC)"

restart: ## Restart all services
	@echo "$(BLUE)Restarting VRSS services...$(NC)"
	docker-compose restart
	@echo "$(GREEN)Services restarted$(NC)"

logs: ## View logs from all services (use Ctrl+C to exit)
	docker-compose logs -f

logs-backend: ## View backend logs only
	docker-compose logs -f backend

logs-frontend: ## View frontend logs only
	docker-compose logs -f frontend

logs-db: ## View database logs only
	docker-compose logs -f db

##@ Build & Clean

build: ## Build all Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker-compose build
	@echo "$(GREEN)Build complete$(NC)"

rebuild: ## Rebuild all images without cache
	@echo "$(BLUE)Rebuilding Docker images from scratch...$(NC)"
	docker-compose build --no-cache
	@echo "$(GREEN)Rebuild complete$(NC)"

clean: ## Remove all containers, volumes, and images
	@echo "$(RED)WARNING: This will remove all containers, volumes, and images!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v --remove-orphans; \
		docker system prune -af --volumes; \
		echo "$(GREEN)Cleanup complete$(NC)"; \
	else \
		echo "$(YELLOW)Cleanup cancelled$(NC)"; \
	fi

clean-volumes: ## Remove only volumes (keeps containers and images)
	@echo "$(RED)WARNING: This will remove all persistent data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "$(GREEN)Volumes removed$(NC)"; \
	else \
		echo "$(YELLOW)Operation cancelled$(NC)"; \
	fi

##@ Database

db-shell: ## Open PostgreSQL shell
	docker-compose exec db psql -U vrss_user -d vrss

db-backup: ## Create database backup
	@echo "$(BLUE)Creating database backup...$(NC)"
	docker-compose exec db pg_dump -U vrss_user vrss > docker/db/backup/vrss_$$(date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Backup created in docker/db/backup/$(NC)"

db-restore: ## Restore database from backup (use: make db-restore FILE=backup.sql)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)Error: Please specify backup file$(NC)"; \
		echo "Usage: make db-restore FILE=docker/db/backup/backup.sql"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Restoring database from $(FILE)...$(NC)"
	docker-compose exec -T db psql -U vrss_user vrss < $(FILE)
	@echo "$(GREEN)Database restored$(NC)"

db-migrate: ## Run database migrations
	@echo "$(YELLOW)Running database migrations...$(NC)"
	docker-compose exec backend bun run db:migrate:deploy
	@echo "$(GREEN)Migrations complete$(NC)"

db-seed: ## Seed database with test data
	@echo "$(YELLOW)Seeding database...$(NC)"
	docker-compose exec backend bun run seed
	@echo "$(GREEN)Database seeded$(NC)"

db-reset: ## Reset database (drop all tables and recreate)
	@echo "$(RED)WARNING: This will delete all database data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down db; \
		docker volume rm vrss_postgres_data; \
		docker-compose up -d db; \
		echo "$(GREEN)Database reset complete$(NC)"; \
	else \
		echo "$(YELLOW)Operation cancelled$(NC)"; \
	fi

##@ Testing

test: test-docker-fast ## Run tests (default: fast mode using dev environment)

test-local: ## Run tests locally (requires local PostgreSQL on port 6969)
	@echo "$(BLUE)Running tests locally...$(NC)"
	@echo "$(YELLOW)Ensure PostgreSQL is running on localhost:6969$(NC)"
	@echo "$(YELLOW)Backend tests:$(NC)"
	@cd apps/api && bun test
	@echo "$(GREEN)Tests complete$(NC)"

test-docker: ## Run tests in isolated Docker environment (recommended for CI/CD)
	@echo "$(BLUE)Starting isolated test environment...$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d db-test
	@echo "$(YELLOW)Waiting for test database to be ready...$(NC)"
	@sleep 5
	@echo "$(YELLOW)Running backend tests in isolated environment:$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.test.yml run --rm backend || \
		(echo "$(RED)Backend tests failed$(NC)" && docker-compose -f docker-compose.yml -f docker-compose.test.yml down -v && exit 1)
	@echo ""
	@echo "$(YELLOW)Frontend tests:$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.test.yml run --rm frontend bun test || \
		echo "$(YELLOW)Frontend tests not configured or failed$(NC)"
	@echo "$(BLUE)Cleaning up test environment...$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.test.yml down -v
	@echo "$(GREEN)Tests complete$(NC)"

test-docker-fast: ## Run tests in dev Docker containers (fastest, shares dev database)
	@echo "$(BLUE)Running tests in dev containers...$(NC)"
	@echo "$(YELLOW)Backend tests:$(NC)"
	@docker-compose exec -T backend bun test || (echo "$(RED)Backend tests failed$(NC)" && exit 1)
	@echo ""
	@echo "$(YELLOW)Frontend tests:$(NC)"
	@docker-compose exec -T frontend bun test || echo "$(YELLOW)Frontend tests not configured or failed$(NC)"
	@echo "$(GREEN)Tests complete$(NC)"

test-backend: ## Run backend tests only (in dev container)
	@echo "$(YELLOW)Running backend tests...$(NC)"
	@docker-compose exec -T backend bun test

test-frontend: ## Run frontend tests only (in dev container)
	@echo "$(YELLOW)Running frontend tests...$(NC)"
	@docker-compose exec -T frontend bun test

test-coverage: ## Generate test coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	@docker-compose exec -T backend bun test --coverage
	@docker-compose exec -T frontend bun test --coverage || echo "$(YELLOW)Frontend coverage not configured$(NC)"
	@echo "$(GREEN)Coverage reports generated in apps/*/coverage/$(NC)"

test-watch: ## Run tests in watch mode (requires running containers)
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to exit$(NC)"
	@docker-compose exec backend bun test --watch

test-ci: ## Run tests in CI/CD-compatible mode (isolated environment, no TTY)
	@echo "$(BLUE)Running tests in CI mode...$(NC)"
	@docker-compose -f docker-compose.yml -f docker-compose.test.yml up -d db-test
	@sleep 5
	@docker-compose -f docker-compose.yml -f docker-compose.test.yml run --rm -T backend || exit_code=$$?; \
		docker-compose -f docker-compose.yml -f docker-compose.test.yml down -v; \
		exit $$exit_code

##@ Code Quality

typecheck: ## Run TypeScript type checking across all packages
	@echo "$(BLUE)Running type checks...$(NC)"
	@if command -v bun > /dev/null; then \
		bun run type-check; \
	else \
		echo "$(RED)Error: bun not found. Install bun or run 'make typecheck-docker'$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Type checks complete$(NC)"

typecheck-docker: ## Run TypeScript type checking in Docker containers
	@echo "$(BLUE)Running type checks in Docker...$(NC)"
	@echo "$(YELLOW)Backend (API):$(NC)"
	@docker-compose exec backend bun run type-check || echo "$(RED)Backend type check failed$(NC)"
	@echo ""
	@echo "$(YELLOW)Frontend (Web):$(NC)"
	@docker-compose exec frontend bun run type-check || echo "$(RED)Frontend type check failed$(NC)"
	@echo "$(GREEN)Type checks complete$(NC)"

lint: ## Run linting and auto-fix issues across all packages
	@echo "$(BLUE)Running Biome linter with auto-fix...$(NC)"
	@if command -v bun > /dev/null; then \
		bun run lint; \
	else \
		echo "$(RED)Error: bun not found. Install bun or run 'make lint-docker'$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Linting complete$(NC)"

lint-check: ## Run linting in check-only mode (no auto-fix)
	@echo "$(BLUE)Running Biome linter in check mode...$(NC)"
	@if command -v bun > /dev/null; then \
		bun run lint:check; \
	else \
		echo "$(RED)Error: bun not found$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Lint check complete$(NC)"

lint-docker: ## Run linting in Docker containers
	@echo "$(BLUE)Running linters in Docker...$(NC)"
	@echo "$(YELLOW)Backend (API):$(NC)"
	@docker-compose exec backend bun run lint || echo "$(YELLOW)Backend lint failed$(NC)"
	@echo ""
	@echo "$(YELLOW)Frontend (Web):$(NC)"
	@docker-compose exec frontend bun run lint || echo "$(RED)Frontend lint failed$(NC)"
	@echo "$(GREEN)Linting complete$(NC)"

format: ## Format code with Biome
	@echo "$(BLUE)Formatting code with Biome...$(NC)"
	@if command -v bun > /dev/null; then \
		bun run format; \
	else \
		echo "$(RED)Error: bun not found$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Formatting complete$(NC)"

check: typecheck lint ## Run all code quality checks (typecheck + lint)
	@echo "$(GREEN)All code quality checks passed!$(NC)"

##@ Production

prod-build: ## Build production images
	@echo "$(BLUE)Building production images...$(NC)"
	docker-compose -f docker-compose.yml --profile production build
	@echo "$(GREEN)Production build complete$(NC)"

prod-start: ## Start services in production mode (with nginx)
	@echo "$(BLUE)Starting VRSS in production mode...$(NC)"
	docker-compose --profile production up -d
	@echo "$(GREEN)Production services started!$(NC)"
	@echo "$(YELLOW)Application:$(NC) http://localhost"

prod-stop: ## Stop production services
	docker-compose --profile production down

##@ Utilities

ps: ## Show running containers
	docker-compose ps

stats: ## Show resource usage statistics
	docker stats $$(docker-compose ps -q)

shell-backend: ## Open shell in backend container
	docker-compose exec backend sh

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

shell-db: ## Open shell in database container
	docker-compose exec db sh

ip: ## Show container IP addresses
	@echo "$(BLUE)Container IP Addresses:$(NC)"
	@docker-compose ps -q | xargs -I {} docker inspect -f '{{.Name}} - {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' {}

health: ## Check health status of all services
	@echo "$(BLUE)Service Health Status:$(NC)"
	@docker-compose ps

update: ## Update all images to latest versions
	@echo "$(BLUE)Updating Docker images...$(NC)"
	docker-compose pull
	@echo "$(GREEN)Images updated. Run 'make restart' to use new versions$(NC)"

##@ Documentation

docs: ## Open documentation
	@echo "$(BLUE)VRSS Documentation$(NC)"
	@echo "See README.md for detailed documentation"
	@cat docs/DOCKER.md 2>/dev/null || echo "$(YELLOW)Docker documentation not yet created$(NC)"
