# Context Priming

*GATE: You MUST fully read all files mentioned in this section before starting any implementation.*

## Specification Documents

**Core Specifications:**
- `docs/specs/001-vrss-social-platform/PRD.md` - Product requirements for VRSS social platform (10 must-have features)
- `docs/specs/001-vrss-social-platform/SDD.md` - Complete solution design (architecture, patterns, tech stack)
- `docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md` - PostgreSQL schema (19 tables with indexes, triggers)
- `docs/specs/001-vrss-social-platform/DATA_STORAGE_DOCUMENTATION.md` - Storage quotas, media handling
- `docs/specs/001-vrss-social-platform/TESTING-STRATEGY.md` - Comprehensive testing approach (80%+ coverage)

**Architecture Documentation:**
- `docs/architecture/MONOLITH_ARCHITECTURE.md` - Monolith design with scalability path
- `docs/architecture/VISUAL_SUMMARY.md` - System architecture diagrams
- `docs/architecture/ARCHITECTURE_DECISIONS.md` - 11 ADRs with rationale
- `docs/INFRASTRUCTURE_SPEC.md` - Complete infrastructure specification
- `docs/DOCKER.md` - Docker Compose setup and containerization

**API & Integration:**
- `docs/api-architecture.md` - RPC API design (50+ procedures, 10 routers)
- `docs/api-implementation-guide.md` - Implementation patterns and examples
- `docs/INTEGRATION_POINTS.md` - Component communication and S3 uploads
- `docs/SECURITY_DESIGN.md` - Better-auth integration and security patterns

**Frontend Architecture:**
- `docs/frontend-architecture.md` - PWA design, state management, offline strategy
- `docs/component-specifications.md` - Feed Builder and Profile Editor specs
- `docs/frontend-implementation-guide.md` - 7-phase implementation roadmap
- `docs/frontend-data-models.md` - Zustand stores and TanStack Query patterns

## Key Design Decisions

**Architecture Pattern:** Monolith with clear module boundaries
- Single deployment unit for MVP simplicity
- Feature-based organization (auth, feed, profile, messages)
- Scalability path to microservices at 100K+ users
- **Rationale:** Faster iteration, type safety across stack, cost-effective for MVP

**Technology Stack:**
- **Runtime:** Bun (TypeScript-native, fast)
- **Backend:** Hono framework with RPC-style API
- **Frontend:** React 18 + Vite PWA
- **Database:** PostgreSQL 16 with Prisma ORM
- **Auth:** Better-auth (session-based, database-backed)
- **UI:** Shadcn-ui (Radix + Tailwind)
- **State:** Zustand (global) + TanStack Query (server)

**RPC API Pattern:** Single endpoint `/api/rpc` with procedure routing
- Type-safe end-to-end (shared TypeScript types in `/packages/api-contracts/`)
- Procedure-based naming matches domain actions
- Better DX than REST, simpler than GraphQL
- **Trade-off:** Less standardized but gains in type safety and DX

**Database Design:** PostgreSQL with JSONB for flexibility
- 19 tables covering users, posts, feeds, messages, notifications, storage
- JSONB columns for profile customization and feed algorithms (no migrations needed)
- Database triggers for denormalized counters (likes, comments, storage)
- **Rationale:** Relational model + flexibility for custom user data

**PWA Offline-First:** Service worker with intelligent caching
- NetworkFirst for API (24h cache), CacheFirst for media (7-30d)
- Offline queue for mutations (posts, messages, likes)
- IndexedDB for persistent storage (last 50 posts, viewed profiles)
- **Rationale:** Works on mobile without native apps, improves UX

## Implementation Context

**Development Commands:**
```bash
# Monorepo setup
bun install                          # Install all dependencies
turbo build                          # Build all packages
turbo dev                            # Dev mode all packages

# Infrastructure
./scripts/dev-setup.sh               # One-command setup
make start                           # Start all services (Docker)
make stop                            # Stop all services
make logs                            # View all logs
make health                          # Health checks

# Backend (Bun + Hono + Prisma)
cd apps/api
bun run dev                          # Hot reload backend
bun test                             # Run tests
bun test --watch                     # TDD mode
bunx prisma migrate dev              # Create migration
bunx prisma studio                   # Database GUI

# Frontend (React + Vite PWA)
cd apps/web
bun run dev                          # HMR frontend
bun test                             # Vitest tests
bun test:e2e                         # Playwright E2E

# Testing
make test                            # All tests
make test-coverage                   # With coverage report
```

**Patterns to Follow:**
- TDD approach: Tests before features (80%+ coverage, 100% critical paths)
- Feature-based organization: `/src/features/{domain}/`
- Builder pattern for test fixtures
- Optimistic updates for mutations (TanStack Query)
- Cursor-based pagination for feeds
- Two-phase file upload (presigned S3 URLs)

**Interfaces to Implement:**
- 50+ RPC procedures across 10 routers (auth, user, post, feed, social, discovery, message, notification, media, settings)
- Better-auth session management (7-day expiry, sliding window)
- S3-compatible storage (MinIO dev, AWS S3 prod)
- Email verification flow (SMTP/SendGrid)

---
