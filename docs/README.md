# VRSS Documentation

Welcome to the VRSS (Virtual Reality Social Space) documentation! This guide will help you navigate our comprehensive documentation structure.

## 📚 Documentation Organization

### Evergreen Documentation (Core Reference)

These 9 authoritative documents serve as the source of truth for the VRSS platform:

#### 🏗️ Architecture & Infrastructure

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - System architecture overview with C4 diagrams, monorepo structure, RPC pattern explanation, and architectural decisions (ADRs)
- **[TECH_STACK.md](./TECH_STACK.md)** - Complete technology inventory with rationale for each choice (Backend: Bun/Hono/Prisma/Better-auth, Frontend: React/Vite/TanStack Query/Zustand, etc.)
- **[INFRASTRUCTURE.md](./INFRASTRUCTURE.md)** - Docker setup, Makefile commands (40+), environment variables, build system, CI/CD pipeline

#### 💾 Data & API

- **[DATA_MODEL.md](./DATA_MODEL.md)** - **Most Critical** - Complete data model with ERD showing all 28 models, Better-auth integration, database triggers, username as primary identifier
- **[API.md](./API.md)** - RPC architecture, all 10 routers (~60 procedures), request/response format, error codes, validation, pagination
- **[DATABASE.md](./DATABASE.md)** - Prisma schema, migrations, indexes (37), triggers (3), JSONB usage, storage quota system

#### 🔐 Authentication & Frontend

- **[AUTHENTICATION.md](./AUTHENTICATION.md)** - Better-auth integration, session management (7-day), auth flows, **username login** (not email), password requirements
- **[FRONTEND.md](./FRONTEND.md)** - React architecture, Zustand stores (3), TanStack Query, routing, shadcn-ui, PWA with offline queue
- **[TESTING.md](./TESTING.md)** - Testing strategy, 928 tests (595 backend, 333 frontend), test patterns, E2E with Playwright

#### 🐳 Additional

- **[DOCKER.md](./DOCKER.md)** - Docker-specific setup and configuration

---

## 🎯 Feature Specifications

Feature-specific documentation for the VRSS Social Platform MVP:

### [specs/001-vrss-social-platform/](./specs/001-vrss-social-platform/)

#### Core Documents
- **[PRD.md](./specs/001-vrss-social-platform/PRD.md)** - Product requirements with implementation status (Phase 1-4 complete, Phase 5.1 next)
- **[DATA_MODEL.md](./specs/001-vrss-social-platform/DATA_MODEL.md)** - Feature-specific data model (references evergreen DATA_MODEL.md)
- **[TESTING.md](./specs/001-vrss-social-platform/TESTING.md)** - Feature test scenarios and acceptance criteria

#### Implementation Plan
- **[plan/](./specs/001-vrss-social-platform/plan/)** - Organized by phase (1-7) with current status
  - [index.md](./specs/001-vrss-social-platform/plan/index.md) - Phase overview
  - [implementation-phases/](./specs/001-vrss-social-platform/plan/implementation-phases/) - Individual phase files

#### Software Design Document
- **[sdd/](./specs/001-vrss-social-platform/sdd/)** - Design decisions and patterns
  - [index.md](./specs/001-vrss-social-platform/sdd/index.md) - Design overview
  - [architecture-decisions.md](./specs/001-vrss-social-platform/sdd/architecture-decisions.md) - 12 ADRs
  - Additional subsystem docs (runtime, deployment, cross-cutting concerns, etc.)

---

## 🧩 Patterns & Domain Knowledge

Reusable patterns and domain-specific knowledge:

- **[patterns/](./patterns/)** - Code patterns, conventions, and best practices
  - [dev-server-management.md](./patterns/dev-server-management.md)
  - [test-lint-workflows.md](./patterns/test-lint-workflows.md)
  - [typescript-typecheck-patterns.md](./patterns/typescript-typecheck-patterns.md)

- **[domain/](./domain/)** - Domain-specific knowledge
  - [agent-bash-coordination.md](./domain/agent-bash-coordination.md)

- **[tasks/](./tasks/)** - Implementation task tracking

---

## 🚀 Quick Start Guides

### For New Developers

1. **Understand the System**: Start with [ARCHITECTURE.md](./ARCHITECTURE.md) for overall system design
2. **Learn the Tech**: Read [TECH_STACK.md](./TECH_STACK.md) to understand technology choices
3. **Setup Environment**: Follow [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for Docker or local setup
4. **Explore Data Model**: Review [DATA_MODEL.md](./DATA_MODEL.md) - the most critical doc for understanding the system

### For Feature Development

1. **Check Current Phase**: See [PRD.md](./specs/001-vrss-social-platform/PRD.md) implementation status
2. **Review Data Model**: Check [DATA_MODEL.md](./specs/001-vrss-social-platform/DATA_MODEL.md) for feature-specific models
3. **Understand API**: Read [API.md](./API.md) for RPC patterns and procedures
4. **Frontend Patterns**: Review [FRONTEND.md](./FRONTEND.md) for React/state management patterns
5. **Write Tests**: Follow [TESTING.md](./TESTING.md) for test patterns

### For Specific Tasks

#### Setting Up Authentication
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Better-auth integration
- Username login: 3-30 chars, alphanumeric + underscore
- Session management: 7-day cookies with sliding window

#### Working with Database
- [DATABASE.md](./DATABASE.md) - Prisma, migrations, triggers
- [DATA_MODEL.md](./DATA_MODEL.md) - All 28 models with relationships
- Username is PRIMARY identifier (not email)

#### Building API Endpoints
- [API.md](./API.md) - RPC pattern, routers, procedures
- All requests: POST /api/rpc
- Zod validation for all inputs
- Error codes: 1000-1999

#### Frontend Development
- [FRONTEND.md](./FRONTEND.md) - React, Zustand, TanStack Query
- Feature-based organization
- shadcn-ui components
- Offline queue with retry

#### Running Tests
- [TESTING.md](./TESTING.md) - Backend (Bun), Frontend (Vitest), E2E (Playwright)
- 928 tests passing
- Builder pattern for test data

---

## 📊 Current Implementation Status

**Phase Completion**:
- ✅ Phase 1: Foundation & Infrastructure (COMPLETE)
- ✅ Phase 2: Authentication & Session Management (COMPLETE)
- ✅ Phase 3: Backend API Implementation (COMPLETE)
- ✅ Phase 4: Frontend Foundation (COMPLETE)
- 🔵 **Phase 5.1: Core Features - Posts, Media, Feeds UI** (NEXT)
- ⏳ Phase 5.2-5.3: Social Features & Advanced Features (PENDING)
- ⏳ Phase 6: Advanced Features (PENDING)
- ⏳ Phase 7: Polish & Launch Readiness (PENDING)

**Test Coverage**: 928 tests passing
- Backend: 595 tests (Bun test)
- Frontend: 333 tests (Vitest)
- E2E: Disabled in CI (Playwright available for local testing)

**Key Architecture**:
- **Authentication**: Better-auth with username plugin (username is primary identifier)
- **API**: RPC pattern (POST /api/rpc), not REST
- **Database**: 28 Prisma models, 3 triggers (friendship, counters, storage)
- **Frontend**: React PWA with Zustand + TanStack Query
- **Testing**: 928 passing tests, comprehensive coverage

---

## 🔍 Document Index by Topic

### Authentication & Security
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Better-auth, session management, username login
- [API.md](./API.md) - Authentication/authorization, session validation
- [FRONTEND.md](./FRONTEND.md) - Frontend auth state (authStore)

### Data & Database
- [DATA_MODEL.md](./DATA_MODEL.md) - Complete data model (28 models)
- [DATABASE.md](./DATABASE.md) - Prisma schema, migrations, triggers
- [specs/001-vrss-social-platform/DATA_MODEL.md](./specs/001-vrss-social-platform/DATA_MODEL.md) - Feature-specific models

### API Development
- [API.md](./API.md) - RPC architecture, all procedures
- [ARCHITECTURE.md](./ARCHITECTURE.md) - RPC pattern explanation

### Frontend Development
- [FRONTEND.md](./FRONTEND.md) - React architecture, state management
- [TECH_STACK.md](./TECH_STACK.md) - Frontend technology choices

### Infrastructure & DevOps
- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - Docker, Make, CI/CD
- [DOCKER.md](./DOCKER.md) - Docker-specific configuration
- [TECH_STACK.md](./TECH_STACK.md) - Build tools (Turbo, Biome, TypeScript)

### Testing
- [TESTING.md](./TESTING.md) - Overall testing strategy
- [specs/001-vrss-social-platform/TESTING.md](./specs/001-vrss-social-platform/TESTING.md) - Feature test scenarios

### Project Planning
- [specs/001-vrss-social-platform/PRD.md](./specs/001-vrss-social-platform/PRD.md) - Product requirements
- [specs/001-vrss-social-platform/plan/](./specs/001-vrss-social-platform/plan/) - Implementation phases
- [specs/001-vrss-social-platform/sdd/](./specs/001-vrss-social-platform/sdd/) - Design decisions

---

## 🎓 Learning Path

### Week 1: Foundations
1. Read [ARCHITECTURE.md](./ARCHITECTURE.md) - Understand system design
2. Read [TECH_STACK.md](./TECH_STACK.md) - Learn technology choices
3. Setup environment using [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)
4. Run tests following [TESTING.md](./TESTING.md)

### Week 2: Core Concepts
1. Study [DATA_MODEL.md](./DATA_MODEL.md) - Master the data model
2. Read [AUTHENTICATION.md](./AUTHENTICATION.md) - Understand auth flows
3. Explore [API.md](./API.md) - Learn RPC pattern
4. Review [FRONTEND.md](./FRONTEND.md) - Understand frontend architecture

### Week 3: Feature Development
1. Read feature [PRD.md](./specs/001-vrss-social-platform/PRD.md)
2. Review current phase in [plan/](./specs/001-vrss-social-platform/plan/)
3. Study design decisions in [sdd/](./specs/001-vrss-social-platform/sdd/)
4. Implement features following patterns in docs

---

## 🛠️ Common Commands

### Development
```bash
make start          # Start all services (Docker)
make stop           # Stop all services
make logs           # View logs
bun run dev         # Start local dev server
```

### Testing
```bash
make test           # Run all tests
make test-backend   # Backend tests only
make test-frontend  # Frontend tests only
bun run test:e2e    # E2E tests (local only)
```

### Code Quality
```bash
make lint           # Run linter
make format         # Format code
make typecheck      # TypeScript type checking
```

### Database
```bash
make db-migrate     # Run migrations
make db-seed        # Seed database
make db-shell       # Open database shell
```

See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) for complete command reference (40+ commands).

---

## 📝 Contributing to Documentation

When updating documentation:

1. **Evergreen docs** are the source of truth - update these first
2. **Spec docs** should reference evergreen docs, not duplicate
3. Use **Mermaid diagrams** for architecture and flows
4. Use **pseudocode**, not actual code snippets
5. Keep docs **scannable** with tables, lists, and headings
6. **Cross-reference** liberally to avoid duplication
7. Update **implementation status** in PRD when phases complete

### Documentation Principles

- **DRY (Don't Repeat Yourself)**: Reference other docs instead of duplicating
- **Source of Truth**: Implementation is always correct - docs should match code
- **Clarity over Brevity**: Explain concepts thoroughly
- **Actionable**: Every doc should enable specific tasks
- **Maintainable**: Keep structure organized and easy to update

---

## 🔗 External Resources

- [Bun Documentation](https://bun.sh/docs)
- [Hono Documentation](https://hono.dev/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Better-auth Documentation](https://www.better-auth.com/docs)
- [React Documentation](https://react.dev/)
- [TanStack Query Documentation](https://tanstack.com/query/latest)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [shadcn-ui Documentation](https://ui.shadcn.com/)

---

## 📧 Questions or Feedback?

For questions about:
- **Architecture**: See [ARCHITECTURE.md](./ARCHITECTURE.md) and [ADRs](./specs/001-vrss-social-platform/sdd/architecture-decisions.md)
- **Data Model**: See [DATA_MODEL.md](./DATA_MODEL.md)
- **Setup Issues**: See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)
- **Testing**: See [TESTING.md](./TESTING.md)

---

**Last Updated**: October 21, 2025
**Current Phase**: Phase 5.1 (Core Features - Posts, Media, Feeds UI)
**Documentation Version**: 2.0 (Post-refactor)
