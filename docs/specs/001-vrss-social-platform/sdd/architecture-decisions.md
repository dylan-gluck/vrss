# Architecture Decisions

**Reference**: Complete ADR documentation in `/docs/architecture/ARCHITECTURE_DECISIONS.md`

**Status**: All decisions below are **Pending** user confirmation before implementation.

---

## ADR-001: Monorepo with Turborepo

- [ ] **Decision**: Use monorepo with Bun workspaces managed by Turborepo
  - **Rationale**:
    - End-to-end type safety with shared TypeScript types (`/packages/api-contracts/`)
    - Atomic commits across backend and frontend (single PR updates both)
    - Simplified tooling with shared ESLint, TypeScript, Prettier configs
    - Fast builds with Turborepo intelligent caching and parallelization
    - Easy refactoring and code movement between packages
  - **Trade-offs**:
    - Slightly more complex initial setup (mitigated by Turborepo tooling)
    - All developers need full codebase access (acceptable for small MVP team)
    - Larger repository size compared to multi-repo (acceptable with proper .gitignore)
  - **Alternatives Rejected**:
    - Multi-repo: Too much coordination overhead, loses type safety benefits
    - Single repo without workspaces: No code sharing, duplicate dependencies
  - **User confirmed**: _Pending_

---

## ADR-002: Multi-Container Docker Architecture

- [ ] **Decision**: Docker Compose with separate containers for nginx, API, web, PostgreSQL, and MinIO
  - **Rationale**:
    - Clear separation of concerns with service isolation
    - Independent scaling (can scale API containers without affecting database)
    - Network isolation enforces architectural boundaries
    - Dev/prod parity (same container structure in all environments)
    - Future extraction path (easy to move container to separate host)
  - **Trade-offs**:
    - More containers to manage (mitigated by docker-compose orchestration)
    - Slight resource overhead vs single container (negligible on modern systems)
    - Network latency between containers (minimal on same host)
  - **Alternatives Rejected**:
    - Single container: Loses scalability path and clear boundaries
    - Kubernetes from start: Massive complexity overkill for MVP
    - Separate VMs: Over-engineered, high operational cost
  - **User confirmed**: _Pending_

---

## ADR-003: RPC-Style API with Hono Framework

- [ ] **Decision**: Single endpoint RPC API (`POST /api/rpc`) with procedure-based routing using Hono
  - **Rationale**:
    - End-to-end type safety with shared procedure contracts
    - Simplified routing (single endpoint, procedure-based naming)
    - Better DX with IDE autocomplete for all procedures
    - Less boilerplate than REST (no HTTP verb/URL design debates)
    - Faster than GraphQL (no query parsing, schema validation overhead)
    - Excellent Bun runtime performance
  - **Trade-offs**:
    - Less RESTful (no semantic HTTP methods on resources)
    - Requires custom client library (but provides type safety)
    - Less discoverable than GraphQL introspection (acceptable for first-party client)
  - **Alternatives Rejected**:
    - REST API: No built-in type safety, more boilerplate
    - GraphQL: Too complex for MVP, requires schema management
    - tRPC: More opinionated, tighter coupling
  - **User confirmed**: _Pending_

---

## ADR-004: PostgreSQL with Prisma ORM

- [ ] **Decision**: PostgreSQL 16 as primary database with Prisma ORM for type-safe queries
  - **Rationale**:
    - Battle-tested reliability with ACID guarantees for social features
    - JSONB support for flexible profile styles and feed algorithm storage
    - Prisma provides excellent TypeScript type generation from schema
    - Robust migration system with `prisma migrate`
    - Great developer experience with Prisma Studio for database exploration
    - Large community and ecosystem
  - **Trade-offs**:
    - Prisma has slight runtime overhead vs raw SQL (acceptable for DX gains)
    - Schema-first approach requires migrations for changes (good discipline)
    - PostgreSQL setup more complex than SQLite (but better for production)
  - **Alternatives Rejected**:
    - Drizzle ORM: Lighter but smaller ecosystem, PLAN.md specifies Prisma
    - Raw SQL: No type safety, manual migrations, error-prone
    - MongoDB: No ACID guarantees, consistency issues for social graph
    - TypeORM: Older patterns, less type-safe than Prisma
  - **User confirmed**: _Pending_

---

## ADR-005: Better-auth for Session-Based Authentication

- [ ] **Decision**: Better-auth library with database-backed sessions (not JWT)
  - **Rationale**:
    - Built for Bun + Hono stack (first-class integration)
    - Secure defaults (CSRF protection, HTTP-only cookies, bcrypt hashing)
    - Session-based auth more secure than JWT for web apps (can revoke sessions)
    - Email verification built-in
    - Extensible plugin system (future OAuth, 2FA)
    - Full TypeScript support with type inference
  - **Trade-offs**:
    - Sessions require database lookups (acceptable at MVP scale, can add Redis later)
    - Relatively new library vs NextAuth/Auth0 (but actively maintained)
    - Server-side sessions not suitable for mobile apps (will add JWT endpoints if needed)
  - **Alternatives Rejected**:
    - JWT-only: Can't revoke tokens, security risks
    - NextAuth: Next.js focused, not optimized for Hono
    - Auth0/Clerk: Vendor lock-in, cost, overkill for MVP
    - Custom auth: High security risk, reinventing the wheel
  - **User confirmed**: _Pending_

---

## ADR-006: Feature-Based Frontend Organization

- [ ] **Decision**: Organize frontend by features (`/features/auth/`, `/features/feed/`) not technical layers
  - **Rationale**:
    - Co-location of related code (components, hooks, API client stay together)
    - Feature isolation makes understanding complete flows easier
    - Scalability without structural changes (add features without refactoring)
    - Natural boundaries for code splitting and lazy loading
    - Team ownership (features can be owned by specific developers)
  - **Trade-offs**:
    - Initial setup requires more directory structure
    - Need clear boundaries for shared components (solved with `/components/ui` and `/components/common`)
    - Can have some code duplication (acceptable, prefer duplication over coupling)
  - **Alternatives Rejected**:
    - Technical layers (components/, hooks/, pages/): Doesn't scale beyond MVP
    - Domain-driven (user/, post/): Can duplicate technical concerns
  - **User confirmed**: _Pending_

---

## ADR-007: PWA with Vite and vite-plugin-pwa

- [ ] **Decision**: Vite as build tool with vite-plugin-pwa (Workbox) for PWA capabilities
  - **Rationale**:
    - Instant HMR and fast development experience
    - Modern defaults (ESM, code splitting, tree shaking)
    - vite-plugin-pwa seamlessly integrates Workbox service workers
    - Auto-generates optimized service workers with cache strategies
    - Offline support with Network First / Cache First strategies
    - Web app manifest generation for installability
  - **Trade-offs**:
    - Vite newer than Webpack (but mature, widely adopted, better DX)
    - Service worker debugging complex (standard PWA challenge, good devtools exist)
    - No SSR out of the box (acceptable, not needed for PWA)
  - **Alternatives Rejected**:
    - Create React App: Deprecated, slow, outdated
    - Next.js: Over-engineered for PWA, requires server
    - Manual Webpack: Too much configuration complexity
  - **User confirmed**: _Pending_

---

## ADR-008: Zustand + TanStack Query for State Management

- [ ] **Decision**: TanStack Query for server state, Zustand for client-only global state
  - **Rationale**:
    - TanStack Query excels at server state (caching, refetching, background sync)
    - Automatic cache invalidation and background refetching
    - Optimistic updates for instant UI feedback
    - Excellent DevTools for debugging queries
    - Zustand simpler than Redux for client state (theme, UI modals, offline queue)
    - Both work seamlessly with RPC client types
  - **Trade-offs**:
    - Two state solutions instead of one (but each optimized for its use case)
    - Learning curve for TanStack Query (but excellent documentation)
    - Most state is server state, so minimal Zustand usage
  - **Alternatives Rejected**:
    - Redux Toolkit: Too much boilerplate, not optimized for server state
    - SWR: Less features than TanStack Query, smaller ecosystem
    - Plain fetch + useState: Too much manual work, no caching
    - Apollo Client: Requires GraphQL, heavier
  - **User confirmed**: _Pending_

---

## ADR-009: Two-Phase S3 File Upload with Presigned URLs

- [ ] **Decision**: Direct client-to-S3 upload using presigned URLs (not backend proxy)
  - **Rationale**:
    - Avoids backend bottleneck (files don't pass through API server)
    - Better performance (direct upload to S3/MinIO)
    - Lower backend resource usage (no file buffering in memory)
    - Storage quota enforcement before presigned URL generation
    - Security through presigned URL expiration (1 hour)
  - **Trade-offs**:
    - Two-phase flow complexity (initiate → upload → complete)
    - Client needs S3 SDK or fetch for upload (acceptable, standard practice)
    - Failed uploads leave orphaned S3 objects (mitigated with lifecycle policies)
  - **Alternatives Rejected**:
    - Backend proxy upload: Creates bottleneck, poor scalability
    - Direct public bucket upload: Security nightmare, no quota control
  - **Implementation**:
    1. Client calls `media.initiateUpload` → Backend validates quota → Returns presigned URL + mediaId
    2. Client uploads directly to S3 using presigned URL
    3. Client calls `media.completeUpload` → Backend validates upload success
  - **User confirmed**: _Pending_

---

## ADR-010: Cursor-Based Pagination for Feeds

- [ ] **Decision**: Cursor-based pagination (not offset/limit) for all infinite scrolling feeds
  - **Rationale**:
    - Stable pagination (no duplicate/missing items when data changes)
    - Better performance (no OFFSET scanning in database)
    - Works well with infinite scroll UX
    - Compatible with real-time updates
    - Industry standard for social feeds (Twitter, Facebook use cursor pagination)
  - **Trade-offs**:
    - Can't jump to arbitrary page numbers (acceptable, feeds don't need page numbers)
    - Slightly more complex implementation than offset (but better UX)
    - Cursor tokens are opaque (users can't manipulate, which is good)
  - **Alternatives Rejected**:
    - Offset/limit: Performance degrades with large datasets, unstable during updates
    - Keyset pagination: Similar to cursor but less flexible for complex sorts
  - **API Response Format**:
    ```typescript
    {
      items: Post[],
      nextCursor: string | null,
      hasMore: boolean
    }
    ```
  - **User confirmed**: _Pending_

---

## ADR-011: JSONB for Profile Customization and Feed Algorithms

- [ ] **Decision**: Store flexible data (profile styles, feed filters) as JSONB in PostgreSQL
  - **Rationale**:
    - Profile customization requires flexible schema (colors, fonts, layout vary widely)
    - Feed algorithms are user-defined logical blocks (Apple Shortcuts-style)
    - JSONB provides structure validation while allowing schema evolution
    - PostgreSQL JSONB supports indexing and querying (better than JSON text)
    - Avoids EAV (Entity-Attribute-Value) anti-pattern
    - No need for separate tables per customization field
  - **Trade-offs**:
    - Less normalized than relational tables (acceptable for this use case)
    - Querying JSONB more complex than SQL columns (but PostgreSQL has good JSONB operators)
    - Requires Zod/JSON schema validation in application code (already doing this)
  - **Alternatives Rejected**:
    - Separate tables per field: Too many tables, complex schema
    - EAV pattern: Query nightmare, poor performance
    - NoSQL database: Don't want separate database just for this
  - **Example Schema**:
    ```typescript
    profileConfig: {
      background: { type: 'color' | 'image', value: string },
      music: { url: string, autoplay: boolean },
      style: { colors: {}, fonts: {} },
      layout: { sections: [...] }
    }
    ```
  - **User confirmed**: _Pending_

---

## ADR-012: Gradual Service Extraction Path (Monolith First)

- [ ] **Decision**: Start with monolith, extract services only when scaling demands it
  - **Rationale**:
    - YAGNI principle (don't build microservices until needed)
    - Monolith faster to develop and iterate on for MVP
    - Single deployment unit simpler to operate
    - Clear module boundaries enable future extraction
    - Proven pattern (Shopify, GitHub, Basecamp started as monoliths)
    - Can handle 100K+ users before needing services
  - **Trade-offs**:
    - Will need refactoring when extracting services (but module boundaries minimize work)
    - Scaling monolith has limits (acceptable, can add read replicas and caching first)
    - All code in single process (but containerized for some isolation)
  - **Alternatives Rejected**:
    - Microservices from day one: Massive complexity, slow MVP iteration
    - Permanent monolith: No growth path for 1M+ users
    - Serverless functions: Cold starts unsuitable for social platform
  - **Extraction Priority** (when needed at 100K+ users):
    1. **Media Service** (resource-intensive uploads/processing)
    2. **Feed Algorithm Engine** (CPU-intensive, stateless)
    3. **Notification Service** (high-throughput writes)
    4. **Messaging Service** (WebSocket connections)
  - **User confirmed**: _Pending_

---
