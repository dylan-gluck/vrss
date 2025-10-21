# VRSS Agent Guidelines

VRSS social platform. MVP build. Monorepo.

## Commands (From Monorepo Root)
- Start/Stop/Restart services: `make start`, `make stop`, `make restart`
- Tail logs: `make logs`
- Typecheck & Lint: `make check`
- Tests: `make test`
- Rebuild: `make rebuild`

## Code Style
- **Formatter**: Biome (2 spaces, 100 char width, double quotes, semicolons)
- **Imports**: Auto-organized, use workspace packages (`@vrss/*`)
- **Types**: TypeScript strict mode, Zod for validation
- **Naming**: camelCase for variables/functions, PascalCase for components/types
- **Error Handling**: Use Result patterns, avoid `any` (except in tests)
- **Testing**: Bun test for API, Vitest for Web, Playwright for E2E
- **Database**: Prisma with migrations, use `@prisma/client`

## Architecture
- Docker-based development with Makefile orchestration
- Monorepo with Turbo, workspaces in apps/* and packages/*
- API: Hono + Bun + Prisma + Better Auth
- Web: Vite + React + TanStack Query + Zustand + Tailwind
- Database: PostgreSQL with Docker volumes

## Documentation
Evergreen Docs (source of truth). MUST Keep updated with any changes.
- `docs/API.md`
- `docs/ARCHITECTURE.md`
- `docs/AUTHENTICATION.md`
- `docs/DATA_MODEL.md`
- `docs/DATABASE.md`
- `docs/DOCKER.md`
- `docs/FRONTEND.md`
- `docs/INFRASTRUCTURE.md`
- `docs/TECH_STACK.md`
- `docs/TESTING.md`
