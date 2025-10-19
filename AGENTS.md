# VRSS Agent Guidelines

## Commands
- **Docker**: `make start` (dev), `make stop`, `make logs`, `make build`
- **Local**: `bun run build` (all), `bun run build --filter=@vrss/api` (single)
- **Lint**: `make lint` (Docker), `bun run lint` (local), `make lint-check` (check only)
- **Format**: `make format` (Docker), `bun run format` (local)
- **Type Check**: `make typecheck` (Docker), `bun run type-check` (local)
- **Test**: `make test` (Docker fast), `make test-docker` (isolated), `bun run test` (local)
- **Single Test**: `make test-backend`/`make test-frontend` (Docker), `bun test`/`npx vitest run` (local)
- **E2E**: `bun run test:e2e` (Playwright)
- **Database**: `make db-migrate`, `make db-seed`, `make db-shell`

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