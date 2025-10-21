# VRSS Infrastructure

**Last Updated**: 2025-10-21
**Status**: Development environment stable, production deployment planned
**Target Audience**: DevOps engineers, new developers

---

## Table of Contents

- [Overview](#overview)
- [Docker Development Environment](#docker-development-environment)
- [Makefile Command Reference](#makefile-command-reference)
- [Local Development Setup](#local-development-setup)
- [Environment Variables](#environment-variables)
- [Build System](#build-system)
- [Code Quality Tools](#code-quality-tools)
- [CI/CD Pipeline](#cicd-pipeline)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

VRSS infrastructure is designed for **Docker-first development** with **Makefile orchestration**. Developers can choose between Docker (recommended) or local development based on preference.

**Infrastructure Philosophy**:
- **Consistency First**: Same environment for all developers (Docker)
- **Simple Commands**: Unified interface via Makefile (no memorizing Docker commands)
- **Fast Feedback**: Hot reload for API and Web, instant test runs
- **Production Parity**: Development environment mirrors production setup
- **CI/CD Automation**: Automated testing and builds on every commit

**Current State**:
- Development: Docker Compose with hot reload
- CI/CD: GitHub Actions with 4 jobs (lint, test-backend, test-frontend, build)
- Production: Not yet deployed (planned for Phase 7)

---

## Docker Development Environment

### Architecture

```mermaid
graph TB
    subgraph Host_Machine
        Code[Source Code<br/>/Users/dylan/Workspace/projects/vrss]
        Make[Makefile<br/>make start, make test, etc.]
    end

    subgraph Docker_Network[vrss_network]
        DB[(PostgreSQL<br/>vrss_db<br/>Port 5432)]
        Backend[Backend Container<br/>vrss_backend<br/>Port 3030]
        Frontend[Frontend Container<br/>vrss_frontend<br/>Port 5050]
    end

    subgraph Docker_Volumes
        PG_Data[postgres_data<br/>Database files]
        Backend_NM[backend_node_modules<br/>Dependencies]
        Frontend_NM[frontend_node_modules<br/>Dependencies]
    end

    Make --> Docker_Network
    Code -.-> Backend
    Code -.-> Frontend

    DB --> PG_Data
    Backend --> Backend_NM
    Frontend --> Frontend_NM

    Backend --> DB
    Frontend --> Backend

    User[Developer] --> Make
    User -.->|Browser http://localhost:5050| Frontend
    User -.->|API http://localhost:3030| Backend
```

### Services

**docker-compose.yml Services**:

| Service | Image | Purpose | Ports | Dependencies |
|---------|-------|---------|-------|--------------|
| db | postgres:16-alpine | PostgreSQL database | 5432:5432 | None |
| backend | Dockerfile (Bun) | API server | 3030:3030 | db (healthy) |
| frontend | Dockerfile (Node) | Web dev server | 5050:5050 | backend |

### Volume Mounts

**Code Volumes** (read-write, hot reload):
- `.:/app` - Entire workspace mounted in both backend and frontend containers
- Enables hot reload (Bun watches files, Vite HMR)

**Named Volumes** (persistent, fast):
- `postgres_data` - Database files (survives `docker-compose down`)
- `backend_node_modules` - Backend dependencies (faster than host mount)
- `frontend_node_modules` - Frontend dependencies (faster than host mount)

**Why Named Volumes for node_modules?**
- Avoids host/container filesystem sync overhead (faster on macOS)
- Prevents platform compatibility issues (native modules)
- Isolates container dependencies from host

### Networking

**Bridge Network** (`vrss_network`):
- All containers on same network (can resolve by service name)
- Backend connects to database via `postgresql://user:pass@db:5432/vrss`
- Frontend connects to backend via `http://backend:3030` (internal) or `http://localhost:3030` (host)

### Health Checks

**Database Health Check**:
```
pg_isready -U vrss_user -d vrss
Interval: 10s, Timeout: 5s, Retries: 5
```

**Backend Health Check**:
```
curl -f http://localhost:3030/health
Interval: 30s, Timeout: 10s, Retries: 3
```

**Frontend Health Check**:
```
curl -f http://localhost:5050
Interval: 30s, Timeout: 10s, Retries: 3
```

### Dockerfiles

**Backend Dockerfile** (`apps/api/Dockerfile`):
- Base: `oven/bun:1.1-alpine`
- Install dependencies: `bun install`
- Generate Prisma Client: `bun run db:generate`
- Run migrations: `bun run db:migrate:deploy` (on startup)
- Start server: `bun run --watch src/index.ts`

**Frontend Dockerfile** (`apps/web/Dockerfile`):
- Base: `node:20-alpine`
- Install Bun: `curl -fsSL https://bun.sh/install | bash`
- Install dependencies: `bun install`
- Start dev server: `bun run dev`

---

## Makefile Command Reference

All development tasks are orchestrated through **GNU Make** for consistency.

### Development Commands

| Command | Description | Docker Required |
|---------|-------------|-----------------|
| `make help` | Display all available commands with descriptions | No |
| `make setup` | Initial setup (create .env, directories) | No |
| `make start` | Start all services in development mode | Yes |
| `make stop` | Stop all services | Yes |
| `make restart` | Restart all services | Yes |
| `make logs` | View logs from all services (follow mode) | Yes |
| `make logs-backend` | View backend logs only | Yes |
| `make logs-frontend` | View frontend logs only | Yes |
| `make logs-db` | View database logs only | Yes |

**Example Workflow**:
```bash
# First time setup
make setup          # Creates .env file
# Edit .env with your settings

# Start development
make start          # Starts db, backend, frontend
make logs           # Watch logs (Ctrl+C to exit)

# Access services
open http://localhost:5050   # Frontend
open http://localhost:3030   # Backend API
```

### Build & Clean Commands

| Command | Description | Docker Required |
|---------|-------------|-----------------|
| `make build` | Build all Docker images | Yes |
| `make rebuild` | Rebuild all images without cache | Yes |
| `make clean` | Remove all containers, volumes, and images (destructive) | Yes |
| `make clean-volumes` | Remove only volumes (keeps containers) | Yes |

**Warning**: `make clean` and `make clean-volumes` are destructive operations that will delete data.

### Database Commands

| Command | Description | Docker Required |
|---------|-------------|-----------------|
| `make db-shell` | Open PostgreSQL shell (psql) | Yes |
| `make db-backup` | Create database backup in docker/db/backup/ | Yes |
| `make db-restore FILE=<path>` | Restore database from backup file | Yes |
| `make db-migrate` | Run Prisma migrations | Yes |
| `make db-seed` | Seed database with test data | Yes |
| `make db-reset` | Reset database (drop all tables and recreate) | Yes |

**Example Database Workflow**:
```bash
# Run migrations
make db-migrate

# Seed test data
make db-seed

# Open database shell
make db-shell
# In psql: \dt (list tables), \d users (describe table)

# Create backup
make db-backup
# Creates docker/db/backup/vrss_YYYYMMDD_HHMMSS.sql

# Restore backup
make db-restore FILE=docker/db/backup/vrss_20251021_120000.sql
```

### Testing Commands

| Command | Description | Docker Required |
|---------|-------------|-----------------|
| `make test` | Run all tests (backend + frontend) in dev containers | Yes |
| `make test-backend` | Run backend tests only (595 tests) | Yes |
| `make test-frontend` | Run frontend tests only (333 tests) | Yes |
| `make test-coverage` | Generate test coverage reports | Yes |
| `make test-watch` | Run tests in watch mode (TDD) | Yes |
| `make test-ci` | Run tests in CI/CD-compatible mode (isolated) | Yes |

**Test Modes**:
- **Fast** (`make test`): Run tests in existing dev containers (recommended)
- **Isolated** (`make test-ci`): Spin up fresh containers, run tests, tear down (CI/CD)

### Code Quality Commands

| Command | Description | Docker Required |
|---------|-------------|-----------------|
| `make typecheck` | Run TypeScript type checking (local Bun required) | No |
| `make typecheck-docker` | Run TypeScript type checking in Docker | Yes |
| `make lint` | Run Biome linter with auto-fix | No |
| `make lint-check` | Run Biome linter in check-only mode | No |
| `make lint-docker` | Run Biome linter in Docker | Yes |
| `make format` | Format code with Biome | No |
| `make check` | Run all code quality checks (typecheck + lint) | No |

**Pre-Commit Workflow**:
```bash
make format      # Auto-format code
make lint        # Auto-fix lint issues
make typecheck   # Check types
make test        # Run tests
```

### Production Commands (Future)

| Command | Description | Docker Required |
|---------|-------------|-----------------|
| `make prod-build` | Build production Docker images | Yes |
| `make prod-start` | Start services in production mode | Yes |
| `make prod-stop` | Stop production services | Yes |

### Utility Commands

| Command | Description | Docker Required |
|---------|-------------|-----------------|
| `make ps` | Show running containers | Yes |
| `make stats` | Show resource usage statistics | Yes |
| `make shell-backend` | Open shell in backend container | Yes |
| `make shell-frontend` | Open shell in frontend container | Yes |
| `make shell-db` | Open shell in database container | Yes |
| `make ip` | Show container IP addresses | Yes |
| `make health` | Check health status of all services | Yes |
| `make update` | Update all Docker images to latest versions | Yes |

---

## Local Development Setup

For developers preferring **native performance** over Docker.

### Prerequisites

**Required**:
- **Bun** 1.1.0+ ([install instructions](https://bun.sh/docs/installation))
- **PostgreSQL** 16 ([postgres.app](https://postgresapp.com/) or Homebrew)
- **Git** (version control)

**Optional**:
- **Node.js** 20+ (for some tooling compatibility)
- **Docker** (for PostgreSQL only)

### Setup Steps

**1. Clone Repository**:
```bash
git clone https://github.com/your-org/vrss.git
cd vrss
```

**2. Create Environment File**:
```bash
cp .env.example .env
# Edit .env with your settings
```

**3. Install Dependencies**:
```bash
bun install
```

**4. Setup Database**:

**Option A: Local PostgreSQL**:
```bash
# Create database and user
createdb vrss
createuser vrss_user -P  # Enter password when prompted

# Update .env
DATABASE_URL=postgresql://vrss_user:your_password@localhost:5432/vrss
```

**Option B: Docker PostgreSQL Only**:
```bash
docker run -d \
  --name vrss_db \
  -e POSTGRES_DB=vrss \
  -e POSTGRES_USER=vrss_user \
  -e POSTGRES_PASSWORD=vrss_dev_password \
  -p 5432:5432 \
  postgres:16-alpine
```

**5. Run Migrations**:
```bash
cd apps/api
bun run db:migrate:deploy
bun run db:seed  # Optional: seed test data
```

**6. Build Shared Packages**:
```bash
cd ../..
bun run build --filter=@vrss/api-contracts
```

**7. Start Development Servers**:

**Terminal 1 (Backend)**:
```bash
cd apps/api
bun run dev
# API running on http://localhost:3030
```

**Terminal 2 (Frontend)**:
```bash
cd apps/web
bun run dev
# Web running on http://localhost:5050
```

**Or use Turborepo to start both**:
```bash
# From root
bun run dev  # Starts both API and Web in parallel
```

### Local Commands

| Task | Command |
|------|---------|
| Install dependencies | `bun install` |
| Build all packages | `bun run build` |
| Build single package | `bun run build --filter=@vrss/api` |
| Start dev servers | `bun run dev` |
| Run tests | `bun run test` |
| Run type check | `bun run type-check` |
| Run linter | `bun run lint` |
| Format code | `bun run format` |

---

## Environment Variables

Complete list of environment variables with descriptions.

### Required Variables

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db:5432/vrss` | Yes |
| `BETTER_AUTH_SECRET` | Secret for Better-auth token signing (min 32 chars) | `your-secret-minimum-32-characters-long` | Yes |

### Database Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_HOST` | Database host | `db` (Docker), `localhost` (local) |
| `DB_PORT` | Database port | `5432` |
| `DB_NAME` | Database name | `vrss` |
| `DB_USER` | Database user | `vrss_user` |
| `DB_PASSWORD` | Database password | `vrss_dev_password` |
| `DB_POOL_MIN` | Minimum connection pool size | `2` |
| `DB_POOL_MAX` | Maximum connection pool size | `10` |

### Backend Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production/test) | `development` |
| `BACKEND_PORT` | API server port | `3030` |
| `BETTER_AUTH_URL` | Better-auth base URL | `http://localhost:5050` |
| `FRONTEND_URL` | Frontend URL (for CORS) | `http://localhost:5050` |
| `CORS_ORIGINS` | Allowed CORS origins (comma-separated) | `http://localhost:5050` |

### Frontend Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `FRONTEND_PORT` | Frontend dev server port | `5050` |
| `VITE_API_URL` | Backend API URL | `http://localhost:3030` |
| `VITE_APP_NAME` | PWA app name | `VRSS` |
| `VITE_ENABLE_DEBUG` | Enable debug mode | `true` (dev), `false` (prod) |

### Storage Configuration (Future)

| Variable | Description | Default |
|----------|-------------|---------|
| `STORAGE_TYPE` | Storage backend (local/s3) | `local` |
| `STORAGE_LOCAL_PATH` | Local storage path | `/app/storage/media` |
| `STORAGE_MAX_SIZE_MB` | Max upload size (MB) | `50` |
| `S3_ENDPOINT` | S3 endpoint URL | - |
| `S3_BUCKET` | S3 bucket name | - |
| `S3_ACCESS_KEY` | S3 access key | - |
| `S3_SECRET_KEY` | S3 secret key | - |

### Logging Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Log level (error/warn/info/debug/trace) | `debug` (dev), `info` (prod) |
| `LOG_FORMAT` | Log format (json/pretty) | `pretty` (dev), `json` (prod) |

### CI/CD Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `CI` | CI environment indicator | `true` (in GitHub Actions) |
| `CODECOV_TOKEN` | Codecov upload token (secret) | - |

**See .env.example for complete list with comments.**

---

## Build System

VRSS uses **Turborepo** for monorepo build orchestration.

### Turborepo Configuration

**turbo.json**:
```json
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"],           // Build dependencies first
      "outputs": ["dist/**", "build/**"],
      "env": ["NODE_ENV"]
    },
    "dev": {
      "cache": false,                    // Never cache dev servers
      "persistent": true                 // Keep running
    },
    "test": {
      "dependsOn": ["build"],            // Build before testing
      "outputs": ["coverage/**"],
      "cache": true                      // Cache test results
    },
    "lint": {
      "cache": true                      // Cache lint results
    },
    "type-check": {
      "dependsOn": ["^build"],
      "cache": true
    }
  }
}
```

### Build Pipeline

**Dependency Graph**:
```mermaid
graph TB
    Root[Root Workspace]
    Contracts[packages/api-contracts]
    TSConfig[packages/typescript-config]
    API[apps/api]
    Web[apps/web]

    Root --> Contracts
    Root --> TSConfig
    Contracts --> API
    Contracts --> Web
    TSConfig --> API
    TSConfig --> Web

    API -.->|build| Contracts
    Web -.->|build| Contracts
```

**Build Order** (Turborepo determines automatically):
1. `packages/typescript-config` (no dependencies)
2. `packages/api-contracts` (depends on typescript-config)
3. `apps/api` (depends on api-contracts, typescript-config)
4. `apps/web` (depends on api-contracts, typescript-config)

### Build Outputs

| Package | Output Directory | Contents |
|---------|-----------------|----------|
| api-contracts | `packages/api-contracts/dist/` | Compiled TypeScript types |
| api | `apps/api/dist/` | Bundled Bun server |
| web | `apps/web/dist/` | Static HTML/JS/CSS |

### Build Commands

**Build All**:
```bash
bun run build           # Build all packages (respects dependencies)
```

**Build Specific Package**:
```bash
bun run build --filter=@vrss/api           # Build API only (and dependencies)
bun run build --filter=@vrss/web           # Build Web only (and dependencies)
```

**Watch Mode** (development):
```bash
bun run dev             # Start all dev servers with hot reload
```

### Caching

Turborepo caches task outputs to skip redundant work:

**Local Cache**:
- Location: `.turbo/cache/`
- Automatic based on file hashes
- Shared across all workspaces

**Remote Cache** (Future):
- Vercel Remote Cache (shared across team)
- GitHub Actions cache

---

## Code Quality Tools

### Biome (Linter & Formatter)

**Configuration**: `biome.json` at root

**Key Settings**:
- **Indentation**: 2 spaces
- **Line Width**: 100 characters
- **Quote Style**: Double quotes
- **Semicolons**: Always
- **Trailing Commas**: ES5 (objects, arrays)

**Rules**:
- Recommended rules enabled
- `noExplicitAny`: Off (allowed in tests only)
- `noUnusedVariables`: Warn (not error)

**Commands**:
```bash
bun run lint              # Auto-fix issues
bun run lint:check        # Check only (no changes)
bun run format            # Format code
```

**IDE Integration**:
- VS Code: Install "Biome" extension
- Auto-format on save: Enabled

### TypeScript

**Configuration**: `packages/typescript-config/base.json`

**Strict Settings**:
- `strict`: true (all strict checks enabled)
- `noUncheckedIndexedAccess`: true (array access safety)
- `noImplicitAny`: true (explicit types required)
- `strictNullChecks`: true (null/undefined safety)

**Module Settings**:
- `module`: ESNext (modern ESM)
- `target`: ES2020 (browser compatibility)
- `moduleResolution`: bundler (Vite/Bun)

**Commands**:
```bash
bun run type-check        # Check all packages
```

### Pre-Commit Workflow

**Recommended Workflow**:
1. `bun run format` - Auto-format code
2. `bun run lint` - Fix lint issues
3. `bun run type-check` - Check types
4. `bun run test` - Run tests
5. Commit changes

**Future**: Pre-commit hooks with Husky (planned).

---

## CI/CD Pipeline

### GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

**Triggers**:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`

**Concurrency**: Cancels in-progress runs for same ref (saves CI minutes)

### Jobs

**1. Lint & Type Check** (10 min timeout):
```mermaid
graph LR
    Checkout --> Setup_Bun
    Setup_Bun --> Cache_Deps
    Cache_Deps --> Install
    Install --> Generate_Prisma
    Generate_Prisma --> Build_Contracts
    Build_Contracts --> Lint
    Lint --> TypeCheck
```

**Steps**:
- Checkout code
- Setup Bun 1.2.20
- Cache dependencies (Bun install cache, node_modules)
- Install dependencies (`bun install --frozen-lockfile`)
- Generate Prisma Client
- Build api-contracts package
- Run linter (`bun run lint:check`)
- Run type check (`bun run type-check`)

**2. Test Backend** (15 min timeout):
```mermaid
graph LR
    Checkout --> Setup_Bun
    Setup_Bun --> Setup_Postgres
    Setup_Postgres --> Install
    Install --> Generate_Prisma
    Generate_Prisma --> Migrate
    Migrate --> Build_Contracts
    Build_Contracts --> Test
    Test --> Upload_Coverage
```

**Steps**:
- Checkout code
- Setup Bun 1.2.20
- Start PostgreSQL 16 service container
- Install dependencies
- Generate Prisma Client
- Run migrations (`bun run db:migrate:deploy`)
- Build api-contracts package
- Run tests (`bun run test` in apps/api)
- Upload coverage to Codecov

**PostgreSQL Service**:
- Image: `postgres:16-alpine`
- Database: `vrss_test`
- User: `test_user`
- Password: `test_pass`
- Port: `5432`
- Health check: `pg_isready` (10s interval, 5 retries)

**3. Test Frontend** (15 min timeout):
```mermaid
graph LR
    Checkout --> Setup_Bun
    Setup_Bun --> Install
    Install --> Build_Contracts
    Build_Contracts --> Test
    Test --> Upload_Coverage
```

**Steps**:
- Checkout code
- Setup Bun 1.2.20
- Install dependencies
- Build api-contracts package
- Run tests (`bun run test` in apps/web)
- Upload coverage to Codecov

**4. Build** (15 min timeout):
```mermaid
graph LR
    Checkout --> Setup_Bun
    Setup_Bun --> Install
    Install --> Build_All
    Build_All --> Upload_Artifacts
```

**Steps**:
- Checkout code
- Setup Bun 1.2.20
- Install dependencies
- Build all packages (`bun run build`)
- Upload build artifacts (7 day retention)

**Job Dependencies**:
- Build job requires: lint-and-typecheck, test-backend, test-frontend (all must pass)

### Optimizations

**Dependency Caching**:
- Cache key: `${{ runner.os }}-bun-${{ hashFiles('**/bun.lock') }}`
- Cached paths: `~/.bun/install/cache`, `node_modules`, `apps/*/node_modules`, `packages/*/node_modules`
- Saves ~30s per job

**Parallel Execution**:
- Lint, test-backend, test-frontend run in parallel (independent)
- Build waits for all 3 to pass

**E2E Tests Disabled**:
- Playwright E2E tests exist but disabled in CI (manual QA for MVP)
- Reason: Slow (adds 5+ minutes), flaky in CI environment
- Re-enable post-MVP for regression testing

---

## Production Deployment

**Status**: Not yet implemented (planned for Phase 7)

### Planned Architecture

**Cloud Provider**: AWS or similar

**Services**:
- **Frontend**: Static hosting (S3 + CloudFront or Vercel)
- **Backend**: Container service (ECS or Fly.io)
- **Database**: Managed PostgreSQL (RDS or Supabase)
- **Storage**: S3-compatible object storage

**Deployment Pipeline**:
1. GitHub Actions builds Docker images
2. Push images to container registry (ECR or Docker Hub)
3. Deploy to production (rolling update)
4. Run migrations (Prisma migrate deploy)
5. Health checks confirm deployment

**Environment Variables** (production overrides):
- `NODE_ENV=production`
- `BETTER_AUTH_SECRET`: Secure random string (64+ chars)
- `DB_PASSWORD`: Secure password (not dev password)
- `STORAGE_TYPE=s3`
- `LOG_LEVEL=info`
- `VITE_ENABLE_DEBUG=false`

---

## Troubleshooting

### Common Issues

**Issue**: `make start` fails with "port already in use"

**Solution**:
```bash
# Check what's using the port
lsof -i :3030  # Backend
lsof -i :5050  # Frontend
lsof -i :5432  # PostgreSQL

# Kill the process or stop Docker
make stop
docker ps -a  # Check for orphaned containers
docker-compose down -v
```

---

**Issue**: Database connection fails

**Solution**:
```bash
# Check database is running
make ps

# Check database health
docker-compose exec db pg_isready -U vrss_user -d vrss

# Check database logs
make logs-db

# Reset database (destructive)
make db-reset
```

---

**Issue**: Hot reload not working

**Solution**:
```bash
# Restart containers
make restart

# Check volume mounts
docker inspect vrss_backend | grep Mounts -A 10

# For macOS: Check file watcher limits
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

---

**Issue**: Tests fail in CI but pass locally

**Solution**:
```bash
# Run tests in CI mode locally
make test-ci

# Check environment variables
# CI uses different DATABASE_URL, ensure migrations are up to date

# Check for timing issues (tests may need retries)
```

---

**Issue**: `bun install` fails with native module errors

**Solution**:
```bash
# Clear Bun cache
rm -rf ~/.bun/install/cache

# Remove node_modules and reinstall
rm -rf node_modules apps/*/node_modules packages/*/node_modules
bun install

# For Docker: Rebuild without cache
make rebuild
```

---

**Issue**: Biome linter errors on save

**Solution**:
```bash
# Check Biome configuration
cat biome.json

# Run linter manually
bun run lint:check

# Auto-fix issues
bun run lint
```

---

### Debugging Tools

**Docker Logs**:
```bash
make logs              # All services
make logs-backend      # Backend only
make logs-frontend     # Frontend only
make logs-db           # Database only
```

**Container Shell Access**:
```bash
make shell-backend     # Backend container shell
make shell-frontend    # Frontend container shell
make shell-db          # Database container shell
```

**Database Inspection**:
```bash
make db-shell          # psql shell
# Commands:
# \dt              - List tables
# \d users         - Describe users table
# SELECT * FROM users LIMIT 10;
```

**Network Debugging**:
```bash
make ip                # Show container IPs
make health            # Check health status
make stats             # Resource usage
```

**Test Debugging**:
```bash
make test-watch        # Watch mode (TDD)
# In container:
make shell-backend
cd /app/apps/api
bun test --filter="auth"  # Run specific test file
```

---

## References

**Related Documentation**:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture overview
- [TECH_STACK.md](./TECH_STACK.md) - Technology choices and rationale
- [DATABASE.md](./DATABASE.md) - Database schema and migrations
- [TESTING.md](./TESTING.md) - Testing strategy and patterns

**External Resources**:
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Bun Documentation](https://bun.sh/docs)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

**Scripts**:
- `Makefile` - All development commands
- `.github/workflows/ci.yml` - CI/CD pipeline
- `docker-compose.yml` - Service definitions
- `turbo.json` - Build configuration
