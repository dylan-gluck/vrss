# Implementation Plan - VRSS Social Platform MVP

## Validation Checklist
- [x] Context Ingestion section complete with all required specs
- [x] Implementation phases logically organized
- [x] Each phase starts with test definition (TDD approach)
- [x] Dependencies between phases identified
- [x] Parallel execution marked where applicable
- [x] Multi-component coordination identified
- [x] Final validation phase included
- [x] No placeholder content remains

## Specification Compliance Guidelines

### How to Ensure Specification Adherence

1. **Before Each Phase**: Complete the Pre-Implementation Specification Gate
2. **During Implementation**: Reference specific SDD sections in each task
3. **After Each Task**: Run Specification Compliance checks
4. **Phase Completion**: Verify all specification requirements are met

### Deviation Protocol

If implementation cannot follow specification exactly:
1. Document the deviation and reason
2. Get approval before proceeding
3. Update SDD if the deviation is an improvement
4. Never deviate without documentation

## Metadata Reference

- `[parallel: true]` - Tasks that can run concurrently
- `[component: component-name]` - For multi-component features
- `[ref: document/section; lines: 1, 2-3]` - Links to specifications, patterns, or interfaces and (if applicable) line(s)
- `[activity: type]` - Activity hint for specialist agent selection
- `[duration: X days/hours]` - Estimated time to complete
- `[priority: P0/P1/P2]` - Priority level (P0=Critical, P1=High, P2=Medium)

---

## Context Priming

*GATE: You MUST fully read all files mentioned in this section before starting any implementation.*

### Specification Documents

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

### Key Design Decisions

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

### Implementation Context

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

## Implementation Phases

### **Phase 1: Foundation Infrastructure** `[duration: 1-2 weeks]` `[priority: P0]`

**Goal:** Establish development environment, monorepo, Docker, database, and testing infrastructure before any feature development.

#### 1.1 Monorepo Structure `[duration: 1-2 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/architecture/MONOLITH_ARCHITECTURE.md` (complete monorepo structure)
    - [ ] Read `docs/INFRASTRUCTURE_SPEC.md` (directory organization)
    - [ ] Read SDD Section: "Building Block View - Directory Map" (lines 795-1000)

- [ ] **Write Tests** `[activity: test-infrastructure]`
    - [ ] Workspace configuration test: `bun install` works
    - [ ] Turborepo pipeline test: `turbo build` executes
    - [ ] Path alias test: TypeScript resolves `@/*` correctly

- [ ] **Implement** `[activity: infrastructure]`
    - [ ] Initialize root `package.json` with Bun workspaces
    - [ ] Configure Turborepo (`turbo.json`) with build pipeline
    - [ ] Create shared TypeScript configs (`packages/config/typescript-config/`)
    - [ ] Set up ESLint/Prettier shared configs
    - [ ] Create `/apps/api/` and `/apps/web/` directories
    - [ ] Create `/packages/api-contracts/` for shared types
    - [ ] Configure path aliases in all `tsconfig.json` files

- [ ] **Validate**
    - [ ] `bun install` completes without errors
    - [ ] `turbo build` runs (empty builds initially)
    - [ ] TypeScript compilation works in all workspaces
    - [ ] ESLint rules apply across packages

**Success Criteria:** Monorepo fully functional, workspaces communicate via shared packages

---

#### 1.2 Docker & Services `[duration: 1-2 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/DOCKER.md` (complete Docker Compose setup)
    - [ ] Read `scripts/dev-setup.sh` (automated setup script)
    - [ ] Read `Makefile` (all development commands)

- [ ] **Write Tests** `[activity: test-infrastructure]`
    - [ ] Service health check tests: PostgreSQL, backend, frontend reachable
    - [ ] Volume persistence test: Database survives container restart
    - [ ] Network connectivity test: Services can communicate

- [ ] **Implement** `[activity: infrastructure]`
    - [ ] Verify `docker-compose.yml` configuration (already exists)
    - [ ] Create PostgreSQL initialization scripts (`docker/db/init/`)
    - [ ] Configure environment variables (`.env.example` → `.env`)
    - [ ] Update Dockerfiles for backend and frontend (hot reload)
    - [ ] Run `./scripts/dev-setup.sh` to generate secrets
    - [ ] Start services with `make start`

- [ ] **Validate**
    - [ ] `make start` brings up all services
    - [ ] `make health` shows all services healthy
    - [ ] `make logs` displays structured logs
    - [ ] Hot reload works for backend and frontend
    - [ ] Database persists data across restarts

**Success Criteria:** Full Docker stack running, services communicate, hot reload functional

---

#### 1.3 Database Schema & Migrations `[duration: 2-3 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md` (all 19 tables, complete DDL)
    - [ ] Read `docs/specs/001-vrss-social-platform/DATA_STORAGE_DOCUMENTATION.md` (storage quotas, triggers)
    - [ ] Read SDD Section: "Data Storage Changes" (lines 1059-1183)

- [ ] **Write Tests** `[activity: test-database]`
    - [ ] Schema validation tests: All 19 tables exist with correct columns
    - [ ] Constraint tests: Foreign keys, unique constraints, check constraints
    - [ ] Index tests: All 30+ indexes created
    - [ ] Trigger tests: Counter updates, storage tracking work

- [ ] **Implement - Phase 1: Foundation Tables** `[activity: database-migration]`
    - [ ] Create Prisma schema: `users`, `user_profiles`, `subscription_tiers`, `storage_usage`
    - [ ] Generate migration: `bunx prisma migrate dev --name foundation-tables`
    - [ ] Create timestamp update trigger
    - [ ] Seed subscription tiers (Free 50MB, Basic 1GB, Pro 5GB, Premium 10GB)

- [ ] **Implement - Phase 2: Content & Social** `[activity: database-migration]`
    - [ ] Add tables: `posts`, `post_media`, `user_follows`, `friendships`, `post_interactions`, `comments`, `reposts`
    - [ ] Generate migration: `bunx prisma migrate dev --name content-social`
    - [ ] Create counter triggers: `update_post_likes_count`, `update_post_comments_count`, `update_post_reposts_count`
    - [ ] Create friendship trigger: `create_friendship_on_mutual_follow`

- [ ] **Implement - Phase 3: Features** `[activity: database-migration]`
    - [ ] Add tables: `profile_sections`, `section_content`, `custom_feeds`, `feed_filters`, `user_lists`, `list_members`
    - [ ] Generate migration: `bunx prisma migrate dev --name profile-feed-features`
    - [ ] Create Tier 1 indexes (8 critical indexes for feeds, social graph)

- [ ] **Implement - Phase 4: Communication** `[activity: database-migration]`
    - [ ] Add tables: `conversations`, `messages`, `notifications`, `user_subscriptions`
    - [ ] Generate migration: `bunx prisma migrate dev --name messaging-notifications`
    - [ ] Create storage triggers: `update_storage_on_media_insert`, `update_storage_on_media_delete`

- [ ] **Validate**
    - [ ] All migration tests pass
    - [ ] `bunx prisma studio` opens and shows all tables
    - [ ] Triggers fire correctly (test with sample data)
    - [ ] Indexes exist: `SELECT * FROM pg_indexes WHERE tablename = 'posts'`
    - [ ] Test coverage: 80%+ on database layer

**Success Criteria:** Complete 19-table schema with indexes, triggers, seeded data

---

#### 1.4 Testing Infrastructure `[duration: 2-3 days]` `[parallel: true]` `[component: testing]`

- [ ] **Prime Context**
    - [ ] Read `docs/specs/001-vrss-social-platform/TESTING-STRATEGY.md` (complete testing approach)
    - [ ] Read `docs/specs/001-vrss-social-platform/TEST-SPECIFICATIONS.md` (10 critical scenarios)
    - [ ] Read `docs/SECURITY_TESTING.md` (security test cases)

- [ ] **Backend Testing Setup** `[activity: test-infrastructure]`
    - [ ] **Write Tests**: Verify test infrastructure works
        - [ ] Testcontainers starts PostgreSQL
        - [ ] Database cleanup between tests
        - [ ] Test fixtures create valid data
    - [ ] **Implement**:
        - [ ] Configure Bun Test (`bunfig.toml` with coverage)
        - [ ] Install Testcontainers for PostgreSQL
        - [ ] Create `test/setup.ts` (database lifecycle)
        - [ ] Create `test/helpers/` (auth, request, database helpers)
        - [ ] Create `test/fixtures/` (user, post, feed builders)
        - [ ] Add test scripts to `package.json`
    - [ ] **Validate**:
        - [ ] `bun test` runs without errors
        - [ ] Testcontainers starts/stops cleanly
        - [ ] Coverage reports generate (`bun test --coverage`)

- [ ] **Frontend Testing Setup** `[activity: test-infrastructure]` `[parallel: true]`
    - [ ] **Write Tests**: Verify frontend test infrastructure
        - [ ] Vitest runs component tests
        - [ ] MSW mocks API calls
        - [ ] React Testing Library renders components
    - [ ] **Implement**:
        - [ ] Configure Vitest (`vitest.config.ts` with coverage)
        - [ ] Install React Testing Library, MSW, happy-dom
        - [ ] Create `test/setup.ts` (MSW server, global mocks)
        - [ ] Create `test/mocks/handlers.ts` (API mock handlers)
        - [ ] Create `test/utils/render.tsx` (custom render with providers)
        - [ ] Add test scripts to `package.json`
    - [ ] **Validate**:
        - [ ] `bun test` runs Vitest
        - [ ] MSW intercepts API calls
        - [ ] Coverage thresholds configured (80%+)

- [ ] **E2E Testing Setup** `[activity: test-infrastructure]` `[parallel: true]`
    - [ ] **Write Tests**: Verify E2E infrastructure
        - [ ] Playwright launches browsers
        - [ ] Can navigate to localhost:3000
        - [ ] Screenshot capture works
    - [ ] **Implement**:
        - [ ] Create `/e2e/` package with Playwright
        - [ ] Configure `playwright.config.ts` (multi-browser)
        - [ ] Create `helpers/auth-helper.ts` (login utilities)
        - [ ] Create `fixtures/` (test users, test data)
        - [ ] Install Playwright browsers
    - [ ] **Validate**:
        - [ ] `bunx playwright test` runs
        - [ ] Screenshots/videos captured on failure
        - [ ] Tests run on Chromium, Mobile Chrome, Mobile Safari

**Success Criteria:** Complete testing infrastructure ready for TDD workflow

---

### **Phase 2: Authentication & Session Management** `[duration: 1-2 weeks]` `[priority: P0]`

**Goal:** Implement Better-auth with email verification, session management, and auth middleware for RPC routing.

#### 2.1 Better-auth Core Setup `[duration: 2 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/SECURITY_DESIGN.md` (Better-auth integration, session management)
    - [ ] Read SDD Section: "Security & Compliance Constraints" (lines 50-67)
    - [ ] Review Better-auth docs: https://www.better-auth.com/docs

- [ ] **Write Tests** `[activity: test-auth]`
    - [ ] Better-auth initialization test
    - [ ] Prisma adapter connection test
    - [ ] Session table creation test
    - [ ] Configuration validation test

- [ ] **Implement** `[activity: security-implementation]`
    - [ ] Install Better-auth and Prisma adapter
    - [ ] Create `apps/api/src/lib/auth.ts` (Better-auth config)
    - [ ] Update Prisma schema with auth tables (`sessions`, `verification_tokens`)
    - [ ] Generate migration: `bunx prisma migrate dev --name better-auth`
    - [ ] Configure email verification handler (placeholder for now)
    - [ ] Set environment variables (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
    - [ ] Generate secure secret: `openssl rand -base64 32`

- [ ] **Validate**
    - [ ] Better-auth config loads without errors
    - [ ] Sessions table exists in database
    - [ ] Environment variables validated
    - [ ] Test coverage: 100% (critical path)

**Success Criteria:** Better-auth configured, session tables created, ready for procedures

---

#### 2.2 Auth Procedures & Email Verification `[duration: 2-3 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/api-architecture.md` Section: "Auth Router" (procedures: register, login, logout, getSession)
    - [ ] Read PRD Section: "F1: User Authentication and Registration" (lines 133-142)

- [ ] **Write Tests** `[activity: test-auth]`
    - [ ] Registration tests: Valid input, weak password, duplicate username/email
    - [ ] Login tests: Valid credentials, unverified email, invalid credentials
    - [ ] Email verification tests: Valid token, expired token, invalid token
    - [ ] Session tests: Get session, expired session, invalid token
    - [ ] Logout tests: Valid logout, no session

- [ ] **Implement - Auth Procedures** `[activity: api-development]`
    - [ ] Create `apps/api/src/rpc/routers/auth.ts`
    - [ ] Implement `auth.register` procedure (with username uniqueness check)
    - [ ] Implement `auth.login` procedure (with email verification check)
    - [ ] Implement `auth.logout` procedure
    - [ ] Implement `auth.getSession` procedure
    - [ ] Add Zod validation schemas for all procedures
    - [ ] Create RPC error responses with proper codes (1000-1099)

- [ ] **Implement - Email Service** `[activity: security-implementation]`
    - [ ] Create `apps/api/src/lib/email.ts` (Nodemailer or SendGrid)
    - [ ] Implement `sendVerificationEmail` function
    - [ ] Create HTML email template for verification
    - [ ] Implement `auth.resendVerification` procedure
    - [ ] Implement `auth.verifyEmail` procedure
    - [ ] Configure SMTP in `.env` (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`)

- [ ] **Validate**
    - [ ] All auth procedure tests pass
    - [ ] Email verification flow works end-to-end
    - [ ] Password complexity enforced
    - [ ] Sessions created on successful login
    - [ ] Test coverage: 100% (auth is critical)

**Success Criteria:** Complete auth flow (register → verify → login → logout) functional

---

#### 2.3 Auth Middleware & RPC Integration `[duration: 2 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/api-architecture.md` Section: "Auth Middleware" (session validation, public procedures)
    - [ ] Read SDD Section: "Auth Middleware" (lines 748-749)

- [ ] **Write Tests** `[activity: test-auth]`
    - [ ] Public procedure tests: Accessible without auth
    - [ ] Protected procedure tests: Require authentication
    - [ ] Session validation tests: Cookie and Bearer token
    - [ ] Session refresh tests: Sliding window (24h)
    - [ ] Email verification enforcement tests

- [ ] **Implement** `[activity: security-implementation]`
    - [ ] Create `apps/api/src/middleware/auth.ts`
    - [ ] Implement session validation (cookie + Bearer token support)
    - [ ] Implement sliding window refresh (update session every 24h)
    - [ ] Define `PUBLIC_PROCEDURES` set (auth.*, user.getProfile, post.getById, discovery.*)
    - [ ] Attach `user` and `session` to Hono context
    - [ ] Integrate middleware into RPC router (`apps/api/src/index.ts`)
    - [ ] Update `ProcedureContext` type with `user` and `session` fields

- [ ] **Validate**
    - [ ] Middleware tests pass
    - [ ] Public procedures work without auth
    - [ ] Protected procedures return 401 without auth
    - [ ] Session refresh works (verify updated timestamp)
    - [ ] Both cookie and Bearer token auth work

**Success Criteria:** Auth middleware integrated, all RPC procedures protected or public correctly

---

### **Phase 3: Backend API Implementation** `[duration: 3-4 weeks]` `[priority: P1]`

**Goal:** Implement all 10 RPC routers with 50+ procedures following dependency order.

#### 3.1 RPC Foundation & Type Contracts `[duration: 2-3 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/api-architecture.md` (complete RPC pattern, all procedures)
    - [ ] Read `docs/api-implementation-guide.md` (implementation examples)
    - [ ] Read SDD Section: "Internal API Changes" (lines 1185-1285)

- [ ] **Write Tests** `[activity: test-api]`
    - [ ] RPC router setup test: POST /api/rpc works
    - [ ] Error handling test: Invalid procedure returns error
    - [ ] Type contract test: Procedure types match implementation
    - [ ] Validation middleware test: Zod schemas validate input

- [ ] **Implement - Type Contracts** `[activity: api-development]`
    - [ ] Create `packages/api-contracts/src/index.ts` (main export)
    - [ ] Create `packages/api-contracts/src/rpc.ts` (RPCRequest, RPCResponse types)
    - [ ] Create `packages/api-contracts/src/errors.ts` (ErrorCode enum 1000-1999)
    - [ ] Create `packages/api-contracts/src/types.ts` (shared domain types: User, Post, Feed)
    - [ ] Create `packages/api-contracts/src/procedures/` (10 namespace files for all routers)
    - [ ] Define all 50+ procedure input/output types

- [ ] **Implement - RPC Router** `[activity: api-development]`
    - [ ] Create `apps/api/src/rpc/index.ts` (router setup)
    - [ ] Implement RPC request parsing and validation
    - [ ] Implement error handling middleware (catch all errors, return RPCErrorResponse)
    - [ ] Implement request logging middleware
    - [ ] Create `apps/api/src/rpc/types.ts` (ProcedureContext, ProcedureHandler)

- [ ] **Validate**
    - [ ] Type contracts compile without errors
    - [ ] RPC router handles requests
    - [ ] Error responses follow standard format
    - [ ] Logging captures request/response

**Success Criteria:** RPC foundation ready, type contracts defined for all 50+ procedures

---

#### 3.2 User & Profile Router `[duration: 2-3 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/api-architecture.md` Section: "User Router" (6 procedures)
    - [ ] Read PRD Section: "F2: Customizable User Profiles" (lines 144-155)
    - [ ] Read DATABASE_SCHEMA.md: `user_profiles`, `profile_sections`, `section_content`

- [ ] **Write Tests** `[activity: test-api]`
    - [ ] `user.getProfile` tests: By username, public/private visibility
    - [ ] `user.updateProfile` tests: Display name, bio, avatar, visibility
    - [ ] `user.updateStyle` tests: JSONB validation, background/colors/fonts
    - [ ] `user.updateSections` tests: Add/remove/reorder sections
    - [ ] Storage quota tests: Profile updates respect quota

- [ ] **Implement** `[activity: api-development]`
    - [ ] Create `apps/api/src/rpc/routers/user.ts`
    - [ ] Implement `user.getProfile` (handle visibility: public/private/unlisted)
    - [ ] Implement `user.updateProfile` (display name, bio, avatar, visibility)
    - [ ] Implement `user.updateStyle` (JSONB: background, music, style)
    - [ ] Implement `user.updateSections` (add, remove, reorder profile sections)
    - [ ] Implement `user.getSections` (fetch profile sections)
    - [ ] Add Zod validation for JSONB schemas (profileConfig, styleConfig)
    - [ ] Create business logic in `apps/api/src/features/user/`

- [ ] **Validate**
    - [ ] All user router tests pass
    - [ ] Profile visibility controls work
    - [ ] JSONB updates validate correctly
    - [ ] Test coverage: 90%+

**Success Criteria:** Users can view and customize profiles

---

#### 3.3 Post Router `[duration: 2-3 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/api-architecture.md` Section: "Post Router" (8 procedures)
    - [ ] Read PRD Section: "F3: Content Creation and Post Types" (lines 157-167)
    - [ ] Read DATABASE_SCHEMA.md: `posts`, `post_media`, `comments`, `reposts`, `post_interactions`

- [ ] **Write Tests** `[activity: test-api]`
    - [ ] `post.create` tests: Text, image, video, song post types
    - [ ] `post.getById` tests: Public post, private post, deleted post
    - [ ] `post.update` tests: Edit content, change visibility
    - [ ] `post.delete` tests: Soft delete, cascade to comments
    - [ ] `post.like/unlike` tests: Optimistic updates, counter increments
    - [ ] `post.comment` tests: Create comment, thread depth
    - [ ] Storage quota tests: Image/video posts respect user quota

- [ ] **Implement** `[activity: api-development]`
    - [ ] Create `apps/api/src/rpc/routers/post.ts`
    - [ ] Implement `post.create` (validate type, content, media, check storage quota)
    - [ ] Implement `post.getById` (check visibility, include comments)
    - [ ] Implement `post.update` (owner only, validate changes)
    - [ ] Implement `post.delete` (soft delete, set `deleted_at`)
    - [ ] Implement `post.like` / `post.unlike` (trigger updates counter)
    - [ ] Implement `post.comment` (create comment, update counter)
    - [ ] Implement `post.getComments` (with cursor pagination)
    - [ ] Add cursor-based pagination for post lists
    - [ ] Create business logic in `apps/api/src/features/post/`

- [ ] **Validate**
    - [ ] All post router tests pass
    - [ ] Post types (text, image, video, song) create correctly
    - [ ] Soft delete works
    - [ ] Like/comment counters update via triggers
    - [ ] Test coverage: 90%+

**Success Criteria:** Full CRUD for posts with all types, likes, comments

---

#### 3.4 Social Router `[duration: 2 days]` `[parallel: true]`

- [ ] **Prime Context**
    - [ ] Read `docs/api-architecture.md` Section: "Social Router" (6 procedures)
    - [ ] Read PRD Section: "F6: Social Interactions" (lines 192-201)
    - [ ] Read DATABASE_SCHEMA.md: `user_follows`, `friendships`

- [ ] **Write Tests** `[activity: test-api]`
    - [ ] `social.follow/unfollow` tests: Create/delete follow, friendship creation
    - [ ] `social.getFollowers` tests: Cursor pagination, count
    - [ ] `social.getFollowing` tests: Cursor pagination, count
    - [ ] Friendship creation test: Mutual follow creates friendship

- [ ] **Implement** `[activity: api-development]`
    - [ ] Create `apps/api/src/rpc/routers/social.ts`
    - [ ] Implement `social.follow` (check not already following, create follow record)
    - [ ] Implement `social.unfollow` (delete follow, delete friendship if mutual)
    - [ ] Implement `social.getFollowers` (with cursor pagination)
    - [ ] Implement `social.getFollowing` (with cursor pagination)
    - [ ] Implement `social.getFriends` (mutual follows)
    - [ ] Trigger: Auto-create friendship on mutual follow (database trigger)
    - [ ] Create business logic in `apps/api/src/features/social/`

- [ ] **Validate**
    - [ ] Follow/unfollow tests pass
    - [ ] Friendship auto-created on mutual follow
    - [ ] Pagination works correctly
    - [ ] Test coverage: 85%+

**Success Criteria:** Users can follow/unfollow, friendships created automatically

---

#### 3.5 Feed Router `[duration: 2-3 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/api-architecture.md` Section: "Feed Router" (4 procedures)
    - [ ] Read PRD Section: "F4: Custom Feed Builder (Visual Algorithm)" (lines 169-181)
    - [ ] Read DATABASE_SCHEMA.md: `custom_feeds`, `feed_filters`

- [ ] **Write Tests** `[activity: test-api]`
    - [ ] `feed.get` tests: Default feed (chronological), custom feed execution
    - [ ] `feed.create` tests: Create custom feed with filters
    - [ ] `feed.update` tests: Modify feed name, add/remove filters
    - [ ] `feed.delete` tests: Delete custom feed
    - [ ] Algorithm execution tests: AND/OR/NOT logic, type filters, author filters

- [ ] **Implement** `[activity: api-development]`
    - [ ] Create `apps/api/src/rpc/routers/feed.ts`
    - [ ] Implement `feed.get` (execute feed algorithm, return posts with cursor pagination)
    - [ ] Implement `feed.create` (save custom feed with filters)
    - [ ] Implement `feed.update` (update feed name, filters)
    - [ ] Implement `feed.delete`
    - [ ] Create `apps/api/src/features/feed/feed-algorithm.ts` (filter, sort, paginate)
    - [ ] Support filter types: post type, author, tags, date range
    - [ ] Support logical operators: AND, OR, NOT
    - [ ] Default feed: "Following - Chronological" (all followed users, newest first)

- [ ] **Validate**
    - [ ] Feed algorithm tests pass
    - [ ] Custom feeds execute correctly
    - [ ] AND/OR/NOT logic works
    - [ ] Pagination performs well (<50ms for 20 posts)
    - [ ] Test coverage: 90%+

**Success Criteria:** Custom feed builder functional, algorithms execute queries correctly

---

#### 3.6 Media Router `[duration: 2 days]` `[parallel: true]`

- [ ] **Prime Context**
    - [ ] Read `docs/api-architecture.md` Section: "Media Router" (4 procedures: initiateUpload, completeUpload, deleteMedia, getStorageUsage)
    - [ ] Read DATA_STORAGE_DOCUMENTATION.md (S3 upload flow, storage quotas)

- [ ] **Write Tests** `[activity: test-api]`
    - [ ] `media.initiateUpload` tests: Generate presigned URL, check quota
    - [ ] `media.completeUpload` tests: Validate upload, update storage used
    - [ ] `media.deleteMedia` tests: Delete from S3, update storage used
    - [ ] `media.getStorageUsage` tests: Return used/quota/percentage
    - [ ] Storage quota enforcement tests: Block upload if quota exceeded

- [ ] **Implement** `[activity: api-development]`
    - [ ] Create `apps/api/src/rpc/routers/media.ts`
    - [ ] Create `apps/api/src/lib/s3.ts` (S3 client initialization)
    - [ ] Implement `media.initiateUpload` (check quota with FOR UPDATE lock, generate presigned URL)
    - [ ] Implement `media.completeUpload` (validate upload, create post_media record, update storage)
    - [ ] Implement `media.deleteMedia` (delete from S3, update storage via trigger)
    - [ ] Implement `media.getStorageUsage`
    - [ ] Configure S3 in `.env` (MinIO for dev, AWS S3 for prod)

- [ ] **Validate**
    - [ ] Presigned URLs generated correctly (15min expiry)
    - [ ] Storage quota enforced (atomic check with FOR UPDATE)
    - [ ] Storage triggers update `storage_usage` table
    - [ ] S3 delete works
    - [ ] Test coverage: 90%+

**Success Criteria:** Two-phase file upload working, storage quotas enforced

---

#### 3.7 Message, Notification, Discovery, Settings Routers `[duration: 3-4 days]` `[parallel: true]`

- [ ] **Message Router** `[duration: 2 days]` `[parallel: true]` `[component: messaging]`
    - [ ] **Prime Context**: Read `docs/api-architecture.md` Section "Message Router"
    - [ ] **Write Tests**: Send message, get conversations, get messages, mark read
    - [ ] **Implement**: 5 procedures (sendMessage, getConversations, getMessages, markAsRead, deleteConversation)
    - [ ] **Validate**: Messaging flow works, pagination efficient

- [ ] **Notification Router** `[duration: 1 day]` `[parallel: true]` `[component: notifications]`
    - [ ] **Prime Context**: Read `docs/api-architecture.md` Section "Notification Router"
    - [ ] **Write Tests**: Get notifications, mark read, delete
    - [ ] **Implement**: 3 procedures (getNotifications, markAsRead, deleteNotification)
    - [ ] **Validate**: Notifications poll correctly, unread count accurate

- [ ] **Discovery Router** `[duration: 1-2 days]` `[parallel: true]` `[component: discovery]`
    - [ ] **Prime Context**: Read `docs/api-architecture.md` Section "Discovery Router"
    - [ ] **Write Tests**: Search users, search posts, get discover feed
    - [ ] **Implement**: 3 procedures (searchUsers, searchPosts, getDiscoverFeed)
    - [ ] **Validate**: Search works, discover feed uses algorithm

- [ ] **Settings Router** `[duration: 1-2 days]` `[parallel: true]` `[component: settings]`
    - [ ] **Prime Context**: Read `docs/api-architecture.md` Section "Settings Router"
    - [ ] **Write Tests**: Update account, update privacy, delete account, export data
    - [ ] **Implement**: 5 procedures (updateAccount, updatePrivacy, deleteAccount, exportData, getAccountSettings)
    - [ ] **Validate**: Account management works, GDPR export functional

**Success Criteria:** All 10 routers complete, all 50+ procedures functional

---

### **Phase 4: Frontend Foundation** `[duration: 2-3 weeks]` `[priority: P1]`

**Goal:** Build React PWA with core UI, state management, routing, and authentication.

#### 4.1 PWA Setup & Core UI `[duration: 2-3 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-architecture.md` (PWA design, service worker strategy)
    - [ ] Read `docs/frontend-implementation-guide.tribes` Phase 1 & 2
    - [ ] Read SDD Section: "Frontend PWA" directory structure

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] PWA manifest validation test
    - [ ] Service worker registration test
    - [ ] Layout component render tests
    - [ ] Theme switching test

- [ ] **Implement - PWA Foundation** `[activity: component-development]`
    - [ ] Initialize Vite + React + TypeScript project
    - [ ] Install vite-plugin-pwa and configure
    - [ ] Create `public/manifest.json` (PWA metadata, icons)
    - [ ] Configure service worker (Workbox strategies)
    - [ ] Set up environment variables (`.env.local`, `.env.production`)

- [ ] **Implement - Shadcn-ui & Tailwind** `[activity: component-development]`
    - [ ] Run `npx shadcn-ui@latest init`
    - [ ] Install core components: button, input, card, dialog, dropdown, tabs, toast, avatar, badge
    - [ ] Configure Tailwind CSS (`tailwind.config.js`)
    - [ ] Create `src/styles/globals.css` (CSS variables for light/dark themes)

- [ ] **Implement - Layout Components** `[activity: component-development]`
    - [ ] Create `src/components/layout/AppShell.tsx` (main wrapper)
    - [ ] Create `src/components/layout/NavBar.tsx` (desktop sidebar)
    - [ ] Create `src/components/layout/BottomNav.tsx` (mobile bottom nav)
    - [ ] Create `src/components/layout/MobileHeader.tsx`
    - [ ] Implement responsive breakpoints (640px, 768px, 1024px)

- [ ] **Validate**
    - [ ] PWA installs on Chrome/Edge
    - [ ] Service worker caches API responses
    - [ ] Layout switches mobile/desktop at 768px
    - [ ] Theme toggle works (light/dark)
    - [ ] Test coverage: 80%+

**Success Criteria:** React PWA running, responsive layout, service worker caching

---

#### 4.2 State Management Setup `[duration: 2 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-architecture.md` Section: "State Management Layers"
    - [ ] Read `docs/frontend-data-models.md` (Zustand stores, TanStack Query patterns)

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] AuthStore persistence test (localStorage)
    - [ ] OfflineStore queue test (add, process, retry)
    - [ ] TanStack Query cache test (stale time, refetch)

- [ ] **Implement - TanStack Query** `[activity: component-development]`
    - [ ] Install `@tanstack/react-query`
    - [ ] Create `src/lib/queryClient.ts` (configure stale time, gc time)
    - [ ] Wrap app with `QueryClientProvider` in `src/main.tsx`

- [ ] **Implement - Zustand Stores** `[activity: component-development]`
    - [ ] Install `zustand`
    - [ ] Create `src/stores/authStore.ts` (user, token, isAuthenticated, persist to localStorage)
    - [ ] Create `src/stores/uiStore.ts` (theme, sidebarOpen, activeModal, notifications)
    - [ ] Create `src/stores/offlineStore.ts` (isOnline, queue, addToQueue, processQueue)

- [ ] **Validate**
    - [ ] AuthStore persists across page refresh
    - [ ] OfflineStore queues actions when offline
    - [ ] TanStack Query caches API responses
    - [ ] Test coverage: 85%+

**Success Criteria:** State management configured, stores functional

---

#### 4.3 RPC Client & API Integration `[duration: 2 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-architecture.md` Section: "API Client Layer"
    - [ ] Read `packages/api-contracts/src/` (type contracts for all procedures)

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] RPC client request test (POST /api/rpc)
    - [ ] Auth token attachment test (Bearer header)
    - [ ] Error handling test (401, 403, 500)
    - [ ] Offline queue test (add mutation to queue when offline)

- [ ] **Implement** `[activity: component-development]`
    - [ ] Create `src/lib/api/client.ts` (RPC client with fetch wrapper)
    - [ ] Implement request builder (serialize procedure + input)
    - [ ] Implement response parser (deserialize data, throw on error)
    - [ ] Attach auth token from AuthStore (Bearer header or cookie)
    - [ ] Create TanStack Query hooks in `src/lib/api/hooks/`
    - [ ] Generate hooks for each procedure (useLogin, useCreatePost, useFeed, etc.)
    - [ ] Integrate offline queue (catch network errors, add to OfflineStore)

- [ ] **Validate**
    - [ ] RPC client calls backend successfully
    - [ ] Auth token attached to requests
    - [ ] Errors handled correctly (toast notifications)
    - [ ] Offline queue captures failed mutations
    - [ ] Test coverage: 90%+

**Success Criteria:** Type-safe RPC client functional, API calls work, offline queue ready

---

#### 4.4 Authentication UI `[duration: 2-3 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 4 Section: "Authentication Module"
    - [ ] Read PRD Section: "F1: User Authentication and Registration"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] LoginForm component tests (render, validation, submit)
    - [ ] RegisterForm component tests (password strength, duplicate username)
    - [ ] Auth flow integration tests (login → redirect, logout → redirect)
    - [ ] Email verification UI tests

- [ ] **Implement** `[activity: component-development]`
    - [ ] Create `src/features/auth/components/LoginForm.tsx`
    - [ ] Create `src/features/auth/components/RegisterForm.tsx`
    - [ ] Create `src/features/auth/components/AuthGuard.tsx` (route protection)
    - [ ] Create `src/features/auth/hooks/useAuth.ts` (login, register, logout mutations)
    - [ ] Create `src/pages/auth/LoginPage.tsx`
    - [ ] Create `src/pages/auth/RegisterPage.tsx`
    - [ ] Install React Hook Form for form handling
    - [ ] Add Zod validation (email, password strength, username format)
    - [ ] Implement password strength indicator
    - [ ] Handle email verification flow (show "check your email" message)

- [ ] **Validate**
    - [ ] User can register and receive verification email
    - [ ] User can login after email verification
    - [ ] Protected routes redirect to login
    - [ ] Logout clears session and redirects
    - [ ] Test coverage: 90%+

**Success Criteria:** Complete auth UI functional, users can register/login/logout

---

### **Phase 5: Core Features** `[duration: 3-4 weeks]` `[priority: P1]`

**Goal:** Implement feed system, profile display/editing, messaging, and notifications.

#### 5.1 Feed System `[duration: 4-5 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 4 Section: "Feed System"
    - [ ] Read `docs/component-specifications.md` Section: "Feed Components"
    - [ ] Read PRD Section: "F4: Custom Feed Builder"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] FeedView infinite scroll tests
    - [ ] PostCard render tests (all post types: text, image, video, song)
    - [ ] CreatePost component tests
    - [ ] Like/bookmark optimistic update tests

- [ ] **Implement - Feed Display** `[activity: component-development]`
    - [ ] Create `src/features/feed/components/FeedView.tsx` (infinite scroll with TanStack Query)
    - [ ] Create `src/features/feed/components/PostCard/` (container + type-specific renderers)
    - [ ] Install `@tanstack/react-virtual` for virtual scrolling (>100 posts)
    - [ ] Implement optimistic updates for like/bookmark (TanStack Query mutations)
    - [ ] Create `src/features/feed/hooks/useFeed.ts` (infinite query)
    - [ ] Create `src/features/feed/hooks/useLikePost.ts` (optimistic mutation)

- [ ] **Implement - Post Creation** `[activity: component-development]`
    - [ ] Create `src/features/feed/components/CreatePost/PostComposer.tsx`
    - [ ] Create `src/features/feed/components/CreatePost/MediaUpload.tsx` (drag-drop)
    - [ ] Implement post type selector (text, image, video, song)
    - [ ] Install `react-dropzone` for file upload
    - [ ] Implement two-phase upload: initiate → upload to S3 → complete
    - [ ] Show upload progress bar
    - [ ] Queue failed posts in OfflineStore

- [ ] **Validate**
    - [ ] Feed loads with pagination
    - [ ] Infinite scroll works smoothly
    - [ ] User can create posts (all types)
    - [ ] Like/bookmark updates instantly (optimistic)
    - [ ] Virtual scrolling performs well (1000+ posts)
    - [ ] Test coverage: 85%+

**Success Criteria:** Users can view feed, create posts, like/bookmark with optimistic UI

---

#### 5.2 Profile Display & Editing `[duration: 4-5 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/component-specifications.md` Section: "Profile Editor Components"
    - [ ] Read PRD Section: "F2: Customizable User Profiles"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] ProfileView render tests (custom styles, sections)
    - [ ] ProfileStyleEditor tests (background, colors, fonts)
    - [ ] SectionManager tests (add, remove, reorder)
    - [ ] Profile visibility tests

- [ ] **Implement - Profile Display** `[activity: component-development]`
    - [ ] Create `src/features/profile/components/ProfileView.tsx`
    - [ ] Create `src/features/profile/components/ProfileHeader.tsx` (avatar, bio, stats)
    - [ ] Create `src/features/profile/components/ProfileSection.tsx` (render different section types)
    - [ ] Render custom styles (background, colors, fonts) from JSONB
    - [ ] Implement background music player (if configured)

- [ ] **Implement - Profile Style Editor** `[activity: component-development]`
    - [ ] Create `src/features/profile/components/ProfileStyleEditor/`
    - [ ] Create `BackgroundPicker.tsx` (color, gradient, image upload)
    - [ ] Create `ColorPicker.tsx` (color harmony, contrast checker for WCAG AA)
    - [ ] Create `FontSelector.tsx` (font family, sizes)
    - [ ] Create `MusicSelector.tsx` (background music URL, autoplay)
    - [ ] Real-time preview of style changes

- [ ] **Implement - Section Manager** `[activity: component-development]`
    - [ ] Create `src/features/profile/components/ProfileLayoutEditor/`
    - [ ] Install `@dnd-kit/core` and `@dnd-kit/sortable` for drag-drop
    - [ ] Create `SectionManager.tsx` (list sections, add/remove/reorder)
    - [ ] Implement drag-drop reordering
    - [ ] Section types: feed, gallery, links, text, image, video, friends

- [ ] **Validate**
    - [ ] Profile loads with custom styles
    - [ ] User can edit styles (background, colors, fonts)
    - [ ] Contrast checker validates accessibility
    - [ ] User can add/remove/reorder sections
    - [ ] Drag-drop works smoothly
    - [ ] Test coverage: 85%+

**Success Criteria:** Users can view and fully customize profiles

---

#### 5.3 Messaging `[duration: 3-4 days]` `[parallel: true]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 4 Section: "Messaging"
    - [ ] Read PRD Section: "F7: Direct Messaging"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] MessageList render tests
    - [ ] MessageThread tests (infinite scroll, real-time updates)
    - [ ] MessageInput tests (send, drafts)
    - [ ] Typing indicator tests

- [ ] **Implement** `[activity: component-development]`
    - [ ] Create `src/features/messages/components/MessageList.tsx` (inbox view)
    - [ ] Create `src/features/messages/components/MessageThread.tsx` (conversation)
    - [ ] Create `src/features/messages/components/MessageInput.tsx` (compose)
    - [ ] Create `src/features/messages/hooks/useThreads.ts` (polling 30s)
    - [ ] Create `src/features/messages/hooks/useMessages.ts` (infinite messages, polling 10s)
    - [ ] Create `src/features/messages/hooks/useSendMessage.ts` (optimistic mutation)
    - [ ] Store message drafts in messageStore (Zustand)
    - [ ] Implement typing indicators

- [ ] **Validate**
    - [ ] Messages load with pagination
    - [ ] Real-time updates via polling
    - [ ] Typing indicators work
    - [ ] Message drafts persist
    - [ ] Optimistic message sending
    - [ ] Test coverage: 80%+

**Success Criteria:** Users can send/receive messages with real-time updates

---

#### 5.4 Notifications `[duration: 2 days]` `[parallel: true]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 4 Section: "Notifications"
    - [ ] Read PRD Section: "F8: Notifications"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] NotificationList render tests
    - [ ] Unread count badge tests
    - [ ] Mark as read tests

- [ ] **Implement** `[activity: component-development]`
    - [ ] Create `src/features/notifications/components/NotificationList.tsx`
    - [ ] Create `src/features/notifications/components/NotificationItem.tsx`
    - [ ] Create `src/features/notifications/components/NotificationBadge.tsx` (unread count)
    - [ ] Create `src/features/notifications/hooks/useNotifications.ts` (polling 30s)
    - [ ] Create `src/features/notifications/hooks/useUnreadCount.ts`
    - [ ] Implement navigation to target (post, profile, etc.) on click

- [ ] **Validate**
    - [ ] Notifications poll every 30s
    - [ ] Unread count badge displays correctly
    - [ ] Click marks as read and navigates
    - [ ] Test coverage: 80%+

**Success Criteria:** Users receive notifications for likes, comments, follows

---

### **Phase 6: Advanced Features** `[duration: 2-3 weeks]` `[priority: P2]`

**Goal:** Implement visual feed algorithm builder, search/discovery, and PWA offline capabilities.

#### 6.1 Visual Feed Algorithm Builder `[duration: 4-5 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/component-specifications.md` Section: "Feed Algorithm Builder"
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 5 Section: "Complex Components"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] AlgorithmBuilder render tests
    - [ ] Drag-drop block reordering tests
    - [ ] Block configuration tests
    - [ ] Algorithm preview tests (live feed updates)

- [ ] **Implement** `[activity: component-development]`
    - [ ] Create `src/features/feed/components/FeedBuilder/AlgorithmBuilder.tsx`
    - [ ] Create `src/features/feed/components/FeedBuilder/FilterBlock.tsx` (8 block types)
    - [ ] Create `src/features/feed/components/FeedBuilder/BlockLibrary.tsx` (modal to add blocks)
    - [ ] Install `@dnd-kit/core` and `@dnd-kit/sortable`
    - [ ] Implement drag-drop block reordering
    - [ ] Block types: filter-author, filter-type, filter-hashtag, filter-date, sort-popular, sort-recent, sort-random, limit
    - [ ] Visual data flow connectors between blocks
    - [ ] Live preview: Feed updates as algorithm changes
    - [ ] Save/load custom algorithms to feedStore

- [ ] **Validate**
    - [ ] User can add/remove blocks
    - [ ] Drag-drop reordering works
    - [ ] Block configuration UI functional
    - [ ] Preview shows algorithm results
    - [ ] Algorithm saves to backend
    - [ ] Test coverage: 80%+

**Success Criteria:** Visual feed builder functional, users can create custom algorithms

---

#### 6.2 Search & Discovery `[duration: 2-3 days]` `[parallel: true]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 4 Section: "Search & Discovery"
    - [ ] Read PRD Section: "F5: Custom Discovery/Search Algorithm"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] SearchBar autocomplete tests
    - [ ] Search results filter tests
    - [ ] DiscoverFeed tests

- [ ] **Implement** `[activity: component-development]`
    - [ ] Create `src/features/search/components/SearchBar.tsx` (autocomplete, debounced)
    - [ ] Create `src/features/search/components/SearchResults.tsx` (tabbed: users, posts)
    - [ ] Create `src/features/search/components/DiscoverFeed.tsx`
    - [ ] Create `src/features/search/hooks/useSearch.ts` (debounced 300ms)
    - [ ] Create `src/features/search/hooks/useDiscoverFeed.ts`
    - [ ] Store recent searches in localStorage

- [ ] **Validate**
    - [ ] Search debounces at 300ms
    - [ ] Autocomplete suggests users
    - [ ] Results filter by type (users, posts)
    - [ ] Discover feed uses custom algorithm
    - [ ] Test coverage: 80%+

**Success Criteria:** Search and discover functional

---

#### 6.3 PWA Offline Capabilities `[duration: 3-4 days]` `[parallel: false]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-architecture.md` Section: "Offline-First Strategy"
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 6: "PWA Offline Capabilities"

- [ ] **Write Tests** `[activity: test-frontend]`
    - [ ] Service worker caching tests
    - [ ] Offline queue tests (add, process, retry)
    - [ ] IndexedDB storage tests
    - [ ] Online/offline indicator tests

- [ ] **Implement - Service Worker** `[activity: component-development]`
    - [ ] Configure Workbox strategies in `vite.config.ts`
    - [ ] NetworkFirst for API calls (24h cache, 10s network timeout)
    - [ ] CacheFirst for images (30d expiration, 100 entries)
    - [ ] CacheFirst for videos (7d expiration, 20 entries)
    - [ ] Precache critical app shell files

- [ ] **Implement - IndexedDB Storage** `[activity: component-development]`
    - [ ] Install `idb` library (type-safe IndexedDB)
    - [ ] Create `src/lib/utils/storage.ts`
    - [ ] Stores: `posts` (last 50 feed posts), `profiles` (viewed profiles), `drafts` (offline post drafts)
    - [ ] Implement TTL cleanup (30-day expiration)

- [ ] **Implement - Offline Queue** `[activity: component-development]`
    - [ ] Update `offlineStore.ts` with queue processing logic
    - [ ] Detect online/offline: `navigator.onLine` + `window.addEventListener('online')`
    - [ ] Queue failed mutations (CREATE_POST, SEND_MESSAGE, LIKE_POST, etc.)
    - [ ] Process queue on reconnect (exponential backoff, max 3 retries)
    - [ ] Show toast notifications for queue status

- [ ] **Implement - PWA Install Prompt** `[activity: component-development]`
    - [ ] Create `src/lib/hooks/usePWA.ts`
    - [ ] Detect `beforeinstallprompt` event
    - [ ] Show install banner (dismissible)
    - [ ] "Install App" button in settings
    - [ ] iOS Safari install instructions (different flow)

- [ ] **Validate**
    - [ ] App works offline (cached content)
    - [ ] Offline queue syncs when online
    - [ ] IndexedDB stores data correctly
    - [ ] Install prompt shows (Chrome/Edge)
    - [ ] PWA scores 100 on Lighthouse
    - [ ] Test coverage: 75%+

**Success Criteria:** Full offline-first PWA functional, installs on mobile

---

### **Phase 7: Polish & Launch Readiness** `[duration: 1-2 weeks]` `[priority: P2]`

**Goal:** Performance optimization, accessibility enhancements, security audit, and final testing.

#### 7.1 Performance Optimization `[duration: 3-4 days]` `[parallel: true]`

- [ ] **Prime Context**
    - [ ] Read `docs/frontend-implementation-guide.md` Phase 7: "Performance Optimization"

- [ ] **Implement - Frontend Optimization** `[activity: performance-optimization]`
    - [ ] Virtual scrolling for feeds (already using `@tanstack/react-virtual`)
    - [ ] Memoize expensive components (React.memo with comparison function)
    - [ ] Image optimization: lazy loading, responsive srcset, WebP
    - [ ] Code splitting: lazy load routes with `React.lazy()`
    - [ ] Preload routes on hover
    - [ ] Bundle analysis: `vite-plugin-bundle-analyzer`

- [ ] **Implement - Backend Optimization** `[activity: performance-tuning]`
    - [ ] Database query optimization (add missing indexes from Tier 2)
    - [ ] Implement Redis for session caching (production)
    - [ ] Enable gzip compression in Nginx
    - [ ] Add database connection pooling tuning

- [ ] **Validate**
    - [ ] Lighthouse Performance: 90+
    - [ ] Feed renders <50ms (20 posts)
    - [ ] API p95 <200ms
    - [ ] Database queries p95 <50ms
    - [ ] Bundle size <500KB initial load

**Success Criteria:** Performance targets met, Lighthouse scores 90+

---

#### 7.2 Accessibility & Security Audit `[duration: 2-3 days]` `[parallel: true]`

- [ ] **Accessibility** `[activity: accessibility-implementation]` `[parallel: true]`
    - [ ] **Prime Context**: Read PRD accessibility requirements (WCAG 2.1 AA)
    - [ ] **Implement**:
        - [ ] Keyboard navigation for all features (arrow keys, Enter, Escape)
        - [ ] Focus trap in modals/dialogs
        - [ ] Screen reader announcements (ARIA live regions)
        - [ ] Color contrast checker (all text 4.5:1 minimum)
        - [ ] Skip to main content link
    - [ ] **Validate**:
        - [ ] Run axe-core accessibility audit (0 violations)
        - [ ] Lighthouse Accessibility: 100
        - [ ] Manual keyboard navigation testing
        - [ ] Screen reader testing (NVDA, JAWS, VoiceOver)

- [ ] **Security Audit** `[activity: security-assessment]` `[parallel: true]`
    - [ ] **Prime Context**: Read `docs/SECURITY_DESIGN.md` and `docs/SECURITY_TESTING.md`
    - [ ] **Implement**:
        - [ ] Run security tests (auth, session, injection, XSS, CSRF)
        - [ ] Validate password hashing (bcrypt, no plain text)
        - [ ] Verify session security (HttpOnly, Secure, SameSite cookies)
        - [ ] Check rate limiting (login, registration, API endpoints)
        - [ ] SQL injection prevention (Prisma ORM parameterized queries)
        - [ ] XSS prevention (React auto-escaping, no dangerouslySetInnerHTML)
    - [ ] **Validate**:
        - [ ] All security tests pass
        - [ ] No critical vulnerabilities (`npm audit`)
        - [ ] HTTPS enforced in production
        - [ ] Security headers set (HSTS, CSP, X-Frame-Options)

**Success Criteria:** Accessibility 100, 0 security vulnerabilities

---

#### 7.3 Final Testing & Documentation `[duration: 2-3 days]` `[parallel: false]`

- [ ] **E2E Testing** `[activity: test-e2e]`
    - [ ] Write critical user journey tests (10 scenarios from TEST-SPECIFICATIONS.md)
    - [ ] Registration → Email Verify → Login → Create Post → View Feed
    - [ ] Profile Customization → Save → View Public Profile
    - [ ] Send Message → Receive → Reply
    - [ ] Create Custom Feed → Execute Algorithm → View Results
    - [ ] Offline Mode → Queue Post → Go Online → Post Publishes
    - [ ] Run E2E suite on all browsers (Chromium, Mobile Chrome, Mobile Safari)

- [ ] **Documentation** `[activity: documentation]`
    - [ ] Update API documentation (OpenAPI spec generated)
    - [ ] Create deployment guide (`docs/DEPLOYMENT.md`)
    - [ ] Create user guide (how to use VRSS)
    - [ ] Document environment variables (production checklist)
    - [ ] Create troubleshooting guide

- [ ] **Validate**
    - [ ] All E2E tests pass (10 critical scenarios)
    - [ ] Test execution time <4 minutes
    - [ ] Documentation complete and accurate
    - [ ] Deployment guide tested on staging

**Success Criteria:** All tests pass, documentation complete, ready for production

---

## Integration & End-to-End Validation

**Final Validation Gate** - Must pass before production launch:

- [ ] **All Unit Tests Pass** (backend + frontend)
    - [ ] Backend: 80%+ coverage, 100% critical paths (auth, storage, payments)
    - [ ] Frontend: 80%+ coverage, 100% auth forms and feed builder

- [ ] **All Integration Tests Pass**
    - [ ] RPC API integration tests (all 50+ procedures)
    - [ ] Database integration tests (schema, triggers, migrations)
    - [ ] S3 upload integration tests (two-phase upload)

- [ ] **All E2E Tests Pass**
    - [ ] 10 critical user journeys (from TEST-SPECIFICATIONS.md)
    - [ ] Multi-browser testing (Chrome, Mobile Chrome, Mobile Safari)
    - [ ] Offline mode tests (queue, sync, IndexedDB)

- [ ] **Performance Benchmarks Met**
    - [ ] Lighthouse Performance: 90+
    - [ ] Lighthouse Accessibility: 100
    - [ ] Lighthouse PWA: 100
    - [ ] API p95 response time: <200ms
    - [ ] Database p95 query time: <50ms
    - [ ] Feed render time: <50ms (20 posts)

- [ ] **Security Validation**
    - [ ] All security tests pass (auth, session, injection)
    - [ ] Password hashing verified (bcrypt, no plain text)
    - [ ] Session security validated (HttpOnly, Secure, SameSite)
    - [ ] Rate limiting enforced (login, registration, API)
    - [ ] HTTPS/TLS configured for production
    - [ ] No critical vulnerabilities (`npm audit`, `bun audit`)

- [ ] **Acceptance Criteria Verified Against PRD**
    - [ ] All F1-F10 (Must Have) features implemented
    - [ ] All acceptance criteria met for each feature
    - [ ] Success metrics tracking implemented
    - [ ] Storage quotas enforced (50MB free, 1GB+ paid)

- [ ] **Test Coverage Meets Standards**
    - [ ] Overall project coverage: 80%+
    - [ ] Critical paths coverage: 100% (auth, storage, data integrity, security)
    - [ ] Backend services: 90%+
    - [ ] Frontend components: 80%+

- [ ] **Documentation Updated**
    - [ ] API documentation complete (OpenAPI + reference)
    - [ ] Deployment guide created
    - [ ] User guide created
    - [ ] Architecture documentation updated (any ADR changes)

- [ ] **Build and Deployment Verified**
    - [ ] Production Docker images build successfully
    - [ ] All services start with `make prod-start`
    - [ ] Health checks pass (`make prod-health`)
    - [ ] Database migrations run (`make prod-migrate`)
    - [ ] Environment variables validated (production .env checklist)

- [ ] **All PRD Requirements Implemented**
    - [ ] F1: User Authentication ✓
    - [ ] F2: Customizable User Profiles ✓
    - [ ] F3: Content Creation (4 post types) ✓
    - [ ] F4: Custom Feed Builder ✓
    - [ ] F5: Custom Discovery Algorithm ✓
    - [ ] F6: Social Interactions (follow, like, comment, repost) ✓
    - [ ] F7: Direct Messaging ✓
    - [ ] F8: Notifications ✓
    - [ ] F9: Account Settings ✓
    - [ ] F10: Storage Management & Subscription ✓

- [ ] **Implementation Follows SDD Design**
    - [ ] Monolith architecture with clear module boundaries ✓
    - [ ] RPC API pattern with 50+ procedures ✓
    - [ ] PostgreSQL with 19 tables, indexes, triggers ✓
    - [ ] Better-auth session management ✓
    - [ ] React PWA with offline-first strategy ✓
    - [ ] Zustand + TanStack Query state management ✓
    - [ ] Two-phase S3 file upload ✓
    - [ ] Cursor-based pagination ✓

---

## Estimated Timeline

**Total Duration: 8-12 weeks**

| Phase | Duration | Team Size | Notes |
|-------|----------|-----------|-------|
| **Phase 1: Foundation** | 1-2 weeks | 2-3 devs | Infrastructure, database, testing setup |
| **Phase 2: Authentication** | 1-2 weeks | 1-2 devs | Better-auth, email verification, middleware |
| **Phase 3: Backend API** | 3-4 weeks | 2-3 devs | 10 routers, 50+ procedures (parallelizable) |
| **Phase 4: Frontend Foundation** | 2-3 weeks | 2-3 devs | PWA, state, RPC client, auth UI |
| **Phase 5: Core Features** | 3-4 weeks | 3-4 devs | Feed, profile, messages, notifications (parallelizable) |
| **Phase 6: Advanced Features** | 2-3 weeks | 2-3 devs | Algorithm builder, search, offline sync |
| **Phase 7: Polish & Launch** | 1-2 weeks | 2-3 devs | Performance, accessibility, security, docs |

**Critical Path:** Phase 1 → Phase 2 → Phase 3 (auth, user, post) → Phase 4 → Phase 5

**Parallelization Opportunities:**
- Phase 3: Multiple routers (message, notification, discovery, settings) can be built in parallel
- Phase 4 & 5: Frontend features can be built alongside backend routers
- Phase 6: Algorithm builder, search, and offline sync are independent
- Phase 7: Performance, accessibility, and security audits can run in parallel

**Minimum Viable Product (MVP) Scope:**
- Phases 1-5 = Core MVP (6-8 weeks)
- Phase 6-7 = Enhanced MVP (additional 2-4 weeks)

---

## Success Metrics

**Code Quality:**
- Test coverage: 80%+ overall, 100% critical paths
- TypeScript strict mode: 0 errors
- ESLint: 0 errors, 0 warnings
- Zero `any` types in production code

**Performance:**
- Lighthouse Performance: 90+
- Lighthouse Accessibility: 100
- Lighthouse PWA: 100
- API p95: <200ms
- Database p95: <50ms
- Feed render: <50ms (20 posts)

**Security:**
- 0 critical vulnerabilities
- HTTPS enforced
- Password hashing (bcrypt)
- Session security (HttpOnly, Secure, SameSite)
- Rate limiting active

**Functionality:**
- All 10 must-have features (F1-F10) implemented
- All acceptance criteria met
- 10 critical user journeys pass E2E tests
- PWA installs on mobile devices

---

## Risk Mitigation

**Risk 1: Timeline Slippage**
- **Mitigation:** Prioritize P0/P1 features first, defer P2 to post-MVP
- **Fallback:** Ship Phase 1-4 as minimal MVP, iterate on Phase 5-7

**Risk 2: Testcontainers Performance**
- **Mitigation:** Use Testcontainers only for integration tests, unit tests use mocks
- **Fallback:** Shared test database with aggressive cleanup

**Risk 3: Complex Drag-and-Drop UI**
- **Mitigation:** Use proven library (@dnd-kit), extensive testing
- **Fallback:** Manual reorder buttons if drag-drop too complex

**Risk 4: Offline Sync Conflicts**
- **Mitigation:** Last-write-wins for MVP, show conflict UI
- **Fallback:** Queue only idempotent operations (likes, follows)

**Risk 5: Better-auth Integration Issues**
- **Mitigation:** Follow official docs, test heavily, fallback to custom JWT
- **Fallback:** Implement session management manually with JWT

---

## Deployment Checklist

Before deploying to production:

- [ ] Generate all secrets (`openssl rand -base64 32`)
- [ ] Set production environment variables (`.env.production`)
- [ ] Run database migrations (`make prod-migrate`)
- [ ] Build Docker images (`make prod-build`)
- [ ] Start services (`make prod-start`)
- [ ] Verify health checks (`make prod-health`)
- [ ] Run smoke tests (login, create post, view feed)
- [ ] Configure SSL/TLS certificates
- [ ] Set up monitoring (Sentry, logs)
- [ ] Configure backups (database, S3)
- [ ] Set up alerts (downtime, errors)
- [ ] Load testing (100 concurrent users)
- [ ] Security scan (OWASP ZAP, npm audit)
- [ ] Review privacy policy and terms of service
- [ ] Test email delivery (verification, notifications)
- [ ] Verify S3 storage quota enforcement
- [ ] Test payment processing (if applicable)
- [ ] Final E2E tests on production environment

---

## Appendix: Quick Reference

**Key Commands:**
```bash
# Start everything
make start

# Run all tests
make test

# Run with coverage
make test-coverage

# Backend dev mode
cd apps/api && bun run dev

# Frontend dev mode
cd apps/web && bun run dev

# Database migrations
cd apps/api && bunx prisma migrate dev

# E2E tests
cd e2e && bunx playwright test
```

**Critical Paths (100% Coverage Required):**
1. Authentication flow (register, verify, login, logout)
2. Storage quota enforcement (check, upload, delete)
3. Session management (create, refresh, expire, logout)
4. Data integrity (post creation, profile updates, messages)

**Specification Compliance:**
- Always reference PRD for business requirements
- Always reference SDD for technical design
- Never deviate without documenting reason
- Update specs if implementation improves design
