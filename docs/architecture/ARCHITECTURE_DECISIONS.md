# VRSS Architecture Decision Records

**Status**: Proposal for Review
**Last Updated**: 2025-10-16

## Overview

This document captures the key architectural decisions for the VRSS social platform MVP. Each decision includes rationale, alternatives considered, and trade-offs.

---

## ADR-001: Monorepo with Workspaces

**Status**: ✅ Recommended

**Context**:
Need to organize backend (Bun + Hono) and frontend (React PWA) in a maintainable structure that supports type sharing and atomic changes.

**Decision**:
Use a monorepo with npm/bun workspaces managed by Turborepo.

**Rationale**:
- **Type Safety**: Share TypeScript types between backend/frontend via `packages/shared-types`
- **Atomic Changes**: Update API contract and client in single commit
- **Simplified Tooling**: Single ESLint, TypeScript, Prettier configuration
- **Fast Builds**: Turborepo caches and parallelizes workspace builds
- **Easy Refactoring**: Move code between apps/packages confidently

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Not Chosen |
|------------|------|------|----------------|
| Multi-repo (separate repos) | Clear separation, independent versioning | Type sharing requires npm packages, complex coordination | Too much overhead for MVP, slows iteration |
| Single repo without workspaces | Simple structure | No code sharing, duplicate dependencies | Loses type safety benefits |

**Trade-offs Accepted**:
- Slightly more complex initial setup (mitigated by good tooling)
- All developers need access to full codebase (acceptable for small team)

**Implementation**:
```
vrss/
├── apps/
│   ├── api/              # Backend
│   └── web/              # Frontend
├── packages/
│   ├── shared-types/     # Shared TypeScript types
│   └── config/           # Shared configs
├── turbo.json
└── package.json          # Workspace root
```

---

## ADR-002: Multi-Container Docker Compose

**Status**: ✅ Recommended

**Context**:
Need containerization strategy that supports local development, testing, and production deployment while maintaining separation between services.

**Decision**:
Use multi-container architecture with Docker Compose orchestrating separate containers for NGINX, API, Web, PostgreSQL, and MinIO.

**Rationale**:
- **Separation of Concerns**: Each service isolated in own container
- **Independent Scaling**: Scale API containers without affecting others
- **Clear Boundaries**: Network isolation enforces architectural boundaries
- **Dev/Prod Parity**: Same structure in development and production
- **Service Extraction Path**: Easy to move container to separate host later

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Not Chosen |
|------------|------|------|----------------|
| Single container monolith | Simpler setup, fewer containers | Tight coupling, no independent scaling | Loses scalability path |
| Separate VM/hosts from start | Maximum isolation | Over-engineered for MVP, high complexity | Premature optimization |
| Kubernetes from day one | Production-grade orchestration | Massive complexity overhead | Overkill for MVP |

**Trade-offs Accepted**:
- More containers to manage (mitigated by docker-compose)
- Slight resource overhead vs single container (negligible)

**Container Breakdown**:
- **nginx**: Reverse proxy (port 8080 → 80)
- **api**: Bun + Hono backend (port 3000)
- **web**: Vite dev server (port 5173) or static files
- **postgres**: PostgreSQL 16 (port 5432)
- **minio**: S3-compatible storage (ports 9000, 9001)

---

## ADR-003: RPC-Style API with Hono

**Status**: ✅ Recommended

**Context**:
Need API architecture pattern that provides type safety between backend and frontend while being fast and lightweight.

**Decision**:
Use RPC-style API with Hono framework, generating type-safe client from server routes.

**Rationale**:
- **Type Safety**: TypeScript types flow from server to client automatically
- **Fast Runtime**: Bun + Hono are extremely fast
- **Simple Routing**: RPC-style endpoints like `users.create`, `posts.getById`
- **Minimal Boilerplate**: Less code than REST or GraphQL
- **Auto-Complete**: IDE support for API calls with full type information

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Not Chosen |
|------------|------|------|----------------|
| REST API | Industry standard, well-understood | No built-in type safety, manual client code | Loses type safety advantage |
| GraphQL | Flexible queries, type system | Complexity overhead, requires schema management | Over-engineered for MVP |
| tRPC | Excellent type safety | Opinionated, requires specific setup | Hono RPC provides similar benefits with less lock-in |

**Trade-offs Accepted**:
- Less RESTful (no semantic HTTP methods on resources)
- Less discoverable than GraphQL introspection (acceptable for first-party client)

**Example**:
```typescript
// Backend
app.post('/api/users.create', async (c) => { /* ... */ });

// Frontend (type-safe)
const user = await api.users.create({ username, email });
//                                    ^ Full autocomplete
```

---

## ADR-004: PostgreSQL with Drizzle ORM

**Status**: ✅ Recommended

**Context**:
Need database and ORM that provide reliability, type safety, and support for both relational and semi-structured data.

**Decision**:
Use PostgreSQL 16 as primary database with Drizzle ORM for type-safe database access.

**Rationale**:
- **Battle-Tested**: PostgreSQL is reliable, ACID-compliant, production-proven
- **JSON Support**: JSONB columns for flexible data (profile styles, feed algorithms)
- **Type Safety**: Drizzle provides full TypeScript types for queries
- **Lightweight**: Drizzle has minimal overhead compared to TypeORM/Prisma
- **Migration Management**: Drizzle Kit generates and applies migrations
- **Query Builder**: Type-safe query composition without learning new query language

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Not Chosen |
|------------|------|------|----------------|
| Prisma ORM | Popular, good DX | Heavy runtime, slower than Drizzle | Performance concerns, bundle size |
| TypeORM | Mature, decorator-based | Older patterns, less type-safe | Drizzle offers better DX |
| Raw SQL | Maximum control | No type safety, manual migrations | Too low-level for MVP velocity |
| MongoDB | Flexible schema | No transactions, consistency issues | Need ACID guarantees for social features |

**Trade-offs Accepted**:
- PostgreSQL requires more setup than SQLite (but better for production)
- Drizzle is newer than Prisma/TypeORM (but actively maintained, good community)

**Example Schema**:
```typescript
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').unique().notNull(),
  customStyles: jsonb('custom_styles'), // Flexible JSON
});
```

---

## ADR-005: Feature-Based Frontend Organization

**Status**: ✅ Recommended

**Context**:
Need frontend code organization that supports growing feature set while maintaining clear boundaries.

**Decision**:
Organize frontend by features (auth, profile, feed, posts) rather than technical layers (components, hooks, pages).

**Rationale**:
- **Co-location**: Related code stays together (components, hooks, API client)
- **Feature Isolation**: Easy to understand complete feature without jumping around
- **Scalability**: Add new features without affecting existing structure
- **Team Ownership**: Features can be owned by specific developers
- **Code Splitting**: Natural boundaries for lazy loading

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Not Chosen |
|------------|------|------|----------------|
| Technical layers (components/, hooks/, pages/) | Traditional, simple initially | Poor scalability, hard to navigate | Doesn't scale beyond MVP |
| Domain-driven (user/, post/, feed/) | Business alignment | Can duplicate technical concerns | Feature-based captures benefits while being practical |

**Trade-offs Accepted**:
- Initial setup requires more folders
- Shared components need clear boundaries (solved with `components/ui` and `components/common`)

**Structure**:
```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── api/
│   │   └── pages/
│   ├── profile/
│   └── feed/
├── components/        # Shared components
└── lib/              # Shared utilities
```

---

## ADR-006: PWA with Vite and Workbox

**Status**: ✅ Recommended

**Context**:
MVP requires Progressive Web App capabilities (offline support, installability) with modern development experience.

**Decision**:
Use Vite as build tool with vite-plugin-pwa (powered by Workbox) for PWA functionality.

**Rationale**:
- **Fast HMR**: Vite provides instant hot module replacement
- **Modern Defaults**: ESM, code splitting, tree shaking out of the box
- **PWA Plugin**: vite-plugin-pwa integrates Workbox seamlessly
- **Service Worker Generation**: Auto-generates optimized service workers
- **Offline Support**: Cache strategies for API calls and assets
- **Installability**: Web app manifest and icons configuration

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Not Chosen |
|------------|------|------|----------------|
| Create React App | Stable, well-known | Slow, outdated, deprecated | Vite is faster, more modern |
| Next.js | Full-stack framework, SSR | Heavier, server-required, opinionated | Over-engineered for MVP PWA |
| Manual Webpack config | Full control | Complex setup, maintenance burden | Vite provides better DX |

**Trade-offs Accepted**:
- Vite is newer than Webpack (but mature, widely adopted)
- Service worker debugging can be tricky (standard PWA challenge)

**Configuration**:
```typescript
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.vrss\.app\/.*/i,
        handler: 'NetworkFirst',
      },
    ],
  },
})
```

---

## ADR-007: Better-auth for Authentication

**Status**: ✅ Recommended

**Context**:
Need authentication solution that's secure, modern, and integrates well with Bun + Hono stack.

**Decision**:
Use Better-auth library for authentication and session management.

**Rationale**:
- **Modern Stack**: Built for modern JavaScript runtimes (Bun, Node, Deno)
- **Hono Integration**: First-class Hono middleware support
- **Secure Defaults**: Built-in CSRF protection, secure session handling
- **Extensible**: Plugin system for OAuth, 2FA, email verification
- **Type-Safe**: Full TypeScript support with type inference
- **Lightweight**: Minimal dependencies, small bundle size

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Not Chosen |
|------------|------|------|----------------|
| NextAuth.js | Popular, mature | Next.js focused, heavier | Not optimized for Hono/Bun |
| Lucia | Lightweight, flexible | More manual setup, less opinionated | Better-auth provides better DX |
| Auth0 / Clerk | Managed service, features | Vendor lock-in, cost, overkill | Want control for MVP |
| Custom JWT | Full control | Security risks, maintenance burden | Don't reinvent authentication |

**Trade-offs Accepted**:
- Relatively new library compared to NextAuth (but actively maintained)
- Smaller ecosystem than Auth0 (but sufficient for MVP needs)

**Features Used**:
- Email/password authentication
- Session management
- Password hashing (bcrypt/argon2)
- CSRF protection
- Rate limiting

---

## ADR-008: Gradual Service Extraction Path

**Status**: ✅ Recommended

**Context**:
Need architecture that starts simple (monolith) but supports future extraction to services without rewrites.

**Decision**:
Start with monolith organized in modules with clear boundaries, extract to services only when scaling demands it.

**Extraction Order**:
1. **Media Service** (first to extract)
   - Resource-intensive operations
   - Clear boundary (upload, process, store)
   - Independent scaling needs

2. **Feed Algorithm Engine**
   - Complex computation
   - Stateless processing
   - Cache-heavy operations

3. **Notification Service**
   - High-throughput writes
   - Real-time delivery requirements

4. **Messaging Service**
   - WebSocket connections
   - Separate infrastructure needs

**Rationale**:
- **YAGNI Principle**: Don't build services until you need them
- **Avoid Premature Optimization**: Microservices add complexity
- **Clear Migration Path**: Module boundaries make extraction straightforward
- **Proven Pattern**: Shopify, GitHub, Basecamp all started as monoliths

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Not Chosen |
|------------|------|------|----------------|
| Microservices from day one | Future-proof, independent scaling | Massive complexity, slow iteration | Over-engineered for MVP |
| Permanent monolith | Simple forever | May hit scaling limits | Need growth path |
| Serverless functions | Auto-scaling, pay-per-use | Cold starts, vendor lock-in | Not suitable for social platform |

**Trade-offs Accepted**:
- May need refactoring when extracting (but boundaries minimize work)
- Scaling monolith has limits (but can handle 100K+ users)

**Migration Strategy (when needed)**:
1. Identify service boundary in monolith modules
2. Create new service in `apps/` directory
3. Implement API contract with shared types
4. Route traffic gradually (strangler pattern)
5. Migrate data incrementally
6. Remove old code after validation

---

## ADR-009: Repository Pattern for Database Access

**Status**: ✅ Recommended

**Context**:
Need abstraction layer between business logic and database to maintain testability and flexibility.

**Decision**:
Use Repository pattern with Drizzle ORM, separating data access from business logic.

**Rationale**:
- **Testability**: Easy to mock repositories for unit tests
- **Abstraction**: Business logic doesn't know about SQL
- **Flexibility**: Can swap database or ORM without changing business logic
- **Clear Boundaries**: Data access isolated in repository layer
- **Query Reuse**: Common queries in one place

**Structure**:
```typescript
// Repository (data access)
class UserRepository {
  async findById(id: string) { /* Drizzle queries */ }
}

// Service (business logic)
class UserService {
  constructor(private repo: UserRepository) {}
  async getUser(id: string) { /* business logic */ }
}
```

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Not Chosen |
|------------|------|------|----------------|
| Active Record (ORM methods on models) | Simple, less code | Tight coupling, hard to test | Poor testability |
| Direct ORM in services | No extra layer | Tight coupling to ORM | Hard to swap or test |
| Data Mapper (full) | Maximum abstraction | Complex, over-engineered | Too much for MVP |

**Trade-offs Accepted**:
- Extra layer of code (but improves maintainability)
- Need to define repository interfaces (but aids testing)

---

## ADR-010: TanStack Query for State Management

**Status**: ✅ Recommended

**Context**:
Need frontend state management that handles server state (API data) efficiently with caching and synchronization.

**Decision**:
Use TanStack Query (React Query) for server state management. Use React Context or Zustand for minimal client-only state.

**Rationale**:
- **Server State Management**: Built for fetching, caching, syncing server data
- **Automatic Caching**: Reduces unnecessary API calls
- **Background Refetching**: Keeps data fresh automatically
- **Optimistic Updates**: Instant UI updates while API calls resolve
- **DevTools**: Excellent debugging experience
- **Type-Safe**: Works seamlessly with RPC client types

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Not Chosen |
|------------|------|------|----------------|
| Redux Toolkit | Predictable state, mature | Boilerplate, not optimized for server state | Over-engineered for MVP |
| SWR | Similar to React Query | Less features, smaller community | React Query more feature-complete |
| Plain fetch + useState | Simple | Manual caching, refetching, loading states | Too much boilerplate |
| Apollo Client | GraphQL integration | Requires GraphQL, heavier | Not using GraphQL |

**Trade-offs Accepted**:
- Learning curve for devs unfamiliar with React Query (but excellent docs)
- Need separate solution for client state (but most state is server state)

**Usage**:
```typescript
function useProfile(userId: string) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: () => api.users.getById(userId),
  });
}
```

---

## ADR-011: Test-Driven Development from Day One

**Status**: ✅ Recommended

**Context**:
Need testing strategy that provides confidence for MVP and supports rapid iteration.

**Decision**:
Implement test pyramid from start: Unit tests (Vitest/Bun test) → Integration tests (API tests) → E2E tests (Playwright).

**Coverage Strategy**:
- **Unit Tests**: All business logic, utilities, validation
- **Integration Tests**: API endpoints, database operations
- **E2E Tests**: Critical user journeys only (auth, post creation, feed viewing)

**Rationale**:
- **Confidence**: Refactor without breaking functionality
- **Documentation**: Tests document expected behavior
- **Regression Prevention**: Catch bugs before production
- **Fast Feedback**: Fast unit tests, slower E2E tests
- **MVP Quality**: Solid foundation prevents technical debt

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Not Chosen |
|------------|------|------|----------------|
| Tests after MVP launch | Faster initial development | Technical debt accumulates, hard to add tests later | Not sustainable |
| Only E2E tests | Comprehensive coverage | Slow, brittle, hard to debug | Poor feedback loop |
| Manual testing only | No code overhead | Not scalable, error-prone | Can't iterate quickly |

**Trade-offs Accepted**:
- Slower initial development (but prevents slowdown later)
- Test maintenance overhead (but pays dividends)

**Test Pyramid**:
```
        /\
       /  \          E2E (5-10 critical flows)
      /____\         Playwright
     /      \
    /        \
   / Integr.  \      Integration (~50 tests)
  /____________\     Vitest + test DB
 /              \
/   Unit Tests   \   Unit (~200+ tests)
/________________\   Vitest/Bun test
```

---

## Scalability Decision Matrix

| User Count | Architecture | Database | Caching | Infrastructure |
|-----------|-------------|----------|---------|----------------|
| **0-10K** (Phase 1) | Monolith | Single PostgreSQL | None (optional Redis) | VPS + Docker Compose |
| **10K-100K** (Phase 2) | Optimized Monolith | PostgreSQL + read replica | Redis (sessions, feeds) | Load balancer + multiple API instances |
| **100K-1M** (Phase 3) | Hybrid (monolith + extracted services) | PostgreSQL + read replicas | Redis + CDN | Cloud platform (Railway/Fly.io) or VPS cluster |
| **1M+** (Phase 4) | Microservices (if needed) | Sharded PostgreSQL | Redis + CDN + edge cache | Kubernetes (only if necessary) |

**Key Principle**: Stay in Phase 2 as long as possible. Most applications never need Phase 4.

---

## Decision Status Legend

- ✅ **Recommended**: Proposed decision for approval
- 🟢 **Approved**: Decision confirmed, ready for implementation
- 🟡 **In Discussion**: Needs team discussion
- 🔴 **Rejected**: Decision rejected, alternative chosen

---

## Questions for Review

Before implementation, please confirm:

1. **Monorepo Structure**: ✅ Approved / ❌ Needs changes
2. **Multi-Container Docker**: ✅ Approved / ❌ Needs changes
3. **RPC-Style API**: ✅ Approved / ❌ Needs changes (REST/GraphQL instead?)
4. **PostgreSQL + Drizzle**: ✅ Approved / ❌ Needs changes
5. **Better-auth**: ✅ Approved / ❌ Needs changes (alternative auth?)
6. **TDD Approach**: ✅ Approved / ❌ Needs changes

**Any concerns or modifications needed?** Let's discuss before proceeding to implementation.
