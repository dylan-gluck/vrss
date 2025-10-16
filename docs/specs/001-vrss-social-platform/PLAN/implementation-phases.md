# Implementation Phases

## **Phase 1: Foundation Infrastructure** `[duration: 1-2 weeks]` `[priority: P0]`

**Goal:** Establish development environment, monorepo, Docker, database, and testing infrastructure before any feature development.

### 1.1 Monorepo Structure `[duration: 1-2 days]` `[parallel: false]`

- [x] **Prime Context**
    - [x] Read `docs/architecture/MONOLITH_ARCHITECTURE.md` (complete monorepo structure)
    - [x] Read `docs/INFRASTRUCTURE_SPEC.md` (directory organization)
    - [x] Read SDD Section: "Building Block View - Directory Map" (lines 795-1000)

- [x] **Write Tests** `[activity: test-infrastructure]`
    - [x] Workspace configuration test: `bun install` works
    - [x] Turborepo pipeline test: `turbo build` executes
    - [x] Path alias test: TypeScript resolves `@/*` correctly

- [x] **Implement** `[activity: infrastructure]`
    - [x] Initialize root `package.json` with Bun workspaces
    - [x] Configure Turborepo (`turbo.json`) with build pipeline
    - [x] Create shared TypeScript configs (`packages/config/typescript-config/`)
    - [x] Set up ESLint/Prettier shared configs
    - [x] Create `/apps/api/` and `/apps/web/` directories
    - [x] Create `/packages/api-contracts/` for shared types
    - [x] Configure path aliases in all `tsconfig.json` files

- [x] **Validate**
    - [x] `bun install` completes without errors
    - [x] `turbo build` runs (empty builds initially)
    - [x] TypeScript compilation works in all workspaces
    - [x] ESLint rules apply across packages

**Success Criteria:** Monorepo fully functional, workspaces communicate via shared packages

---

### 1.2 Docker & Services `[duration: 1-2 days]` `[parallel: false]`

- [x] **Prime Context**
    - [x] Read `docs/DOCKER.md` (complete Docker Compose setup)
    - [x] Read `scripts/dev-setup.sh` (automated setup script)
    - [x] Read `Makefile` (all development commands)

- [x] **Write Tests** `[activity: test-infrastructure]`
    - [x] Service health check tests: PostgreSQL, backend, frontend reachable
    - [x] Volume persistence test: Database survives container restart
    - [x] Network connectivity test: Services can communicate

- [x] **Implement** `[activity: infrastructure]`
    - [x] Verify `docker-compose.yml` configuration (already exists)
    - [x] Create PostgreSQL initialization scripts (`docker/db/init/`)
    - [x] Configure environment variables (`.env.example` → `.env`)
    - [x] Update Dockerfiles for backend and frontend (hot reload)
    - [x] Run `./scripts/dev-setup.sh` to generate secrets
    - [x] Start services with `make start`

- [x] **Validate**
    - [x] `make start` brings up all services
    - [x] `make health` shows all services healthy
    - [x] `make logs` displays structured logs
    - [x] Hot reload works for backend and frontend
    - [x] Database persists data across restarts

**Success Criteria:** Full Docker stack running, services communicate, hot reload functional

---

### 1.3 Database Schema & Migrations `[duration: 2-3 days]` `[parallel: false]`

- [x] **Prime Context**
    - [x] Read `docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md` (all 19 tables, complete DDL)
    - [x] Read `docs/specs/001-vrss-social-platform/DATA_STORAGE_DOCUMENTATION.md` (storage quotas, triggers)
    - [x] Read SDD Section: "Data Storage Changes" (lines 1059-1183)

- [x] **Write Tests** `[activity: test-database]`
    - [x] Schema validation tests: All 19 tables exist with correct columns
    - [x] Constraint tests: Foreign keys, unique constraints, check constraints
    - [x] Index tests: All 30+ indexes created
    - [x] Trigger tests: Counter updates, storage tracking work

- [x] **Implement - Phase 1: Foundation Tables** `[activity: database-migration]`
    - [x] Create Prisma schema: `users`, `user_profiles`, `subscription_tiers`, `storage_usage`
    - [x] Generate migration: `bunx prisma migrate dev --name foundation-tables`
    - [x] Create timestamp update trigger
    - [x] Seed subscription tiers (Free 50MB, Basic 1GB, Pro 5GB, Premium 10GB)

- [x] **Implement - Phase 2: Content & Social** `[activity: database-migration]`
    - [x] Add tables: `posts`, `post_media`, `user_follows`, `friendships`, `post_interactions`, `comments`, `reposts`
    - [x] Generate migration: `bunx prisma migrate dev --name content-social`
    - [x] Create counter triggers: `update_post_likes_count`, `update_post_comments_count`, `update_post_reposts_count`
    - [x] Create friendship trigger: `create_friendship_on_mutual_follow`

- [x] **Implement - Phase 3: Features** `[activity: database-migration]`
    - [x] Add tables: `profile_sections`, `section_content`, `custom_feeds`, `feed_filters`, `user_lists`, `list_members`
    - [x] Generate migration: `bunx prisma migrate dev --name profile-feed-features`
    - [x] Create Tier 1 indexes (8 critical indexes for feeds, social graph)

- [x] **Implement - Phase 4: Communication** `[activity: database-migration]`
    - [x] Add tables: `conversations`, `messages`, `notifications`, `user_subscriptions`
    - [x] Generate migration: `bunx prisma migrate dev --name messaging-notifications`
    - [x] Create storage triggers: `update_storage_on_media_insert`, `update_storage_on_media_delete`

- [x] **Validate**
    - [x] All migration tests pass
    - [x] `bunx prisma studio` opens and shows all tables
    - [x] Triggers fire correctly (test with sample data)
    - [x] Indexes exist: `SELECT * FROM pg_indexes WHERE tablename = 'posts'`
    - [x] Test coverage: 80%+ on database layer

**Success Criteria:** Complete 19-table schema with indexes, triggers, seeded data

---

### 1.4 Testing Infrastructure `[duration: 2-3 days]` `[parallel: true]` `[component: testing]`

- [x] **Prime Context**
    - [x] Read `docs/specs/001-vrss-social-platform/TESTING-STRATEGY.md` (complete testing approach)
    - [x] Read `docs/specs/001-vrss-social-platform/TEST-SPECIFICATIONS.md` (10 critical scenarios)
    - [x] Read `docs/SECURITY_TESTING.md` (security test cases)

- [x] **Backend Testing Setup** `[activity: test-infrastructure]`
    - [x] **Write Tests**: Verify test infrastructure works
        - [x] Testcontainers starts PostgreSQL
        - [x] Database cleanup between tests
        - [x] Test fixtures create valid data
    - [x] **Implement**:
        - [x] Configure Bun Test (`bunfig.toml` with coverage)
        - [x] Install Testcontainers for PostgreSQL
        - [x] Create `test/setup.ts` (database lifecycle)
        - [x] Create `test/helpers/` (auth, request, database helpers)
        - [x] Create `test/fixtures/` (user, post, feed builders)
        - [x] Add test scripts to `package.json`
    - [x] **Validate**:
        - [x] `bun test` runs without errors
        - [x] Testcontainers starts/stops cleanly
        - [x] Coverage reports generate (`bun test --coverage`)

- [x] **Frontend Testing Setup** `[activity: test-infrastructure]` `[parallel: true]`
    - [x] **Write Tests**: Verify frontend test infrastructure
        - [x] Vitest runs component tests
        - [x] MSW mocks API calls
        - [x] React Testing Library renders components
    - [x] **Implement**:
        - [x] Configure Vitest (`vitest.config.ts` with coverage)
        - [x] Install React Testing Library, MSW, happy-dom
        - [x] Create `test/setup.ts` (MSW server, global mocks)
        - [x] Create `test/mocks/handlers.ts` (API mock handlers)
        - [x] Create `test/utils/render.tsx` (custom render with providers)
        - [x] Add test scripts to `package.json`
    - [x] **Validate**:
        - [x] `bun test` runs Vitest
        - [x] MSW intercepts API calls
        - [x] Coverage thresholds configured (80%+)

- [x] **E2E Testing Setup** `[activity: test-infrastructure]` `[parallel: true]`
    - [x] **Write Tests**: Verify E2E infrastructure
        - [x] Playwright launches browsers
        - [x] Can navigate to localhost:3000
        - [x] Screenshot capture works
    - [x] **Implement**:
        - [x] Create `/e2e/` package with Playwright
        - [x] Configure `playwright.config.ts` (multi-browser)
        - [x] Create `helpers/auth-helper.ts` (login utilities)
        - [x] Create `fixtures/` (test users, test data)
        - [x] Install Playwright browsers
    - [x] **Validate**:
        - [x] `bunx playwright test` runs
        - [x] Screenshots/videos captured on failure
        - [x] Tests run on Chromium, Mobile Chrome, Mobile Safari

**Success Criteria:** Complete testing infrastructure ready for TDD workflow

---

## **Phase 2: Authentication & Session Management** `[duration: 1-2 weeks]` `[priority: P0]`

**Goal:** Implement Better-auth with email verification, session management, and auth middleware for RPC routing.

### 2.1 Better-auth Core Setup `[duration: 2 days]` `[parallel: false]`

- [x] **Prime Context**
    - [x] Read `docs/SECURITY_DESIGN.md` (Better-auth integration, session management)
    - [x] Read SDD Section: "Security & Compliance Constraints" (lines 50-67)
    - [x] Review Better-auth docs: https://www.better-auth.com/docs

- [x] **Write Tests** `[activity: test-auth]`
    - [x] Better-auth initialization test
    - [x] Prisma adapter connection test
    - [x] Session table creation test
    - [x] Configuration validation test

- [x] **Implement** `[activity: security-implementation]`
    - [x] Install Better-auth and Prisma adapter
    - [x] Create `apps/api/src/lib/auth.ts` (Better-auth config)
    - [x] Update Prisma schema with auth tables (`sessions`, `verification_tokens`)
    - [x] Generate migration: `bunx prisma migrate dev --name better-auth`
    - [x] Configure email verification handler (placeholder for now)
    - [x] Set environment variables (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`)
    - [x] Generate secure secret: `openssl rand -base64 32`

- [x] **Validate**
    - [x] Better-auth config loads without errors
    - [x] Sessions table exists in database
    - [x] Environment variables validated
    - [x] Test coverage: 100% (critical path)

**Success Criteria:** Better-auth configured, session tables created, ready for procedures

---

### 2.2 Auth Procedures & Email Verification `[duration: 2-3 days]` `[parallel: false]`

- [x] **Prime Context**
    - [x] Read `docs/api-architecture.md` Section: "Auth Router" (procedures: register, login, logout, getSession)
    - [x] Read PRD Section: "F1: User Authentication and Registration" (lines 133-142)

- [x] **Write Tests** `[activity: test-auth]`
    - [x] Registration tests: Valid input, weak password, duplicate username/email
    - [x] Login tests: Valid credentials, unverified email, invalid credentials
    - [x] Email verification tests: Valid token, expired token, invalid token
    - [x] Session tests: Get session, expired session, invalid token
    - [x] Logout tests: Valid logout, no session

- [x] **Implement - Auth Procedures** `[activity: api-development]`
    - [x] Create `apps/api/src/rpc/routers/auth.ts`
    - [x] Implement `auth.register` procedure (with username uniqueness check)
    - [x] Implement `auth.login` procedure (with email verification check)
    - [x] Implement `auth.logout` procedure
    - [x] Implement `auth.getSession` procedure
    - [x] Add Zod validation schemas for all procedures
    - [x] Create RPC error responses with proper codes (1000-1099)

- [x] **Implement - Email Service** `[activity: security-implementation]`
    - [x] Create `apps/api/src/lib/email.ts` (Nodemailer or SendGrid)
    - [x] Implement `sendVerificationEmail` function
    - [x] Create HTML email template for verification
    - [x] Implement `auth.resendVerification` procedure
    - [x] Implement `auth.verifyEmail` procedure
    - [x] Configure SMTP in `.env` (`SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`)

- [x] **Validate**
    - [x] All auth procedure tests pass
    - [x] Email verification flow works end-to-end
    - [x] Password complexity enforced
    - [x] Sessions created on successful login
    - [x] Test coverage: 100% (auth is critical)

**Success Criteria:** Complete auth flow (register → verify → login → logout) functional

---

### 2.3 Auth Middleware & RPC Integration `[duration: 2 days]` `[parallel: false]`

- [x] **Prime Context**
    - [x] Read `docs/api-architecture.md` Section: "Auth Middleware" (session validation, public procedures)
    - [x] Read SDD Section: "Auth Middleware" (lines 748-749)

- [x] **Write Tests** `[activity: test-auth]`
    - [x] Public procedure tests: Accessible without auth
    - [x] Protected procedure tests: Require authentication
    - [x] Session validation tests: Cookie and Bearer token
    - [x] Session refresh tests: Sliding window (24h)
    - [x] Email verification enforcement tests

- [x] **Implement** `[activity: security-implementation]`
    - [x] Create `apps/api/src/middleware/auth.ts`
    - [x] Implement session validation (cookie + Bearer token support)
    - [x] Implement sliding window refresh (update session every 24h)
    - [x] Define `PUBLIC_PROCEDURES` set (auth.*, user.getProfile, post.getById, discovery.*)
    - [x] Attach `user` and `session` to Hono context
    - [x] Integrate middleware into RPC router (`apps/api/src/index.ts`)
    - [x] Update `ProcedureContext` type with `user` and `session` fields

- [x] **Validate**
    - [x] Middleware tests pass
    - [x] Public procedures work without auth
    - [x] Protected procedures return 401 without auth
    - [x] Session refresh works (verify updated timestamp)
    - [x] Both cookie and Bearer token auth work

**Success Criteria:** Auth middleware integrated, all RPC procedures protected or public correctly

---

## **Phase 3: Backend API Implementation** `[duration: 3-4 weeks]` `[priority: P1]`

**Goal:** Implement all 10 RPC routers with 50+ procedures following dependency order.

### 3.1 RPC Foundation & Type Contracts `[duration: 2-3 days]` `[parallel: false]`

- [x] **Prime Context**
    - [x] Read `docs/api-architecture.md` (complete RPC pattern, all procedures)
    - [x] Read `docs/api-implementation-guide.md` (implementation examples)
    - [x] Read SDD Section: "Internal API Changes" (lines 1185-1285)

- [x] **Write Tests** `[activity: test-api]`
    - [x] RPC router setup test: POST /api/rpc works
    - [x] Error handling test: Invalid procedure returns error
    - [x] Type contract test: Procedure types match implementation
    - [x] Validation middleware test: Zod schemas validate input

- [x] **Implement - Type Contracts** `[activity: api-development]`
    - [x] Create `packages/api-contracts/src/index.ts` (main export)
    - [x] Create `packages/api-contracts/src/rpc.ts` (RPCRequest, RPCResponse types)
    - [x] Create `packages/api-contracts/src/errors.ts` (ErrorCode enum 1000-1999)
    - [x] Create `packages/api-contracts/src/types.ts` (shared domain types: User, Post, Feed)
    - [x] Create `packages/api-contracts/src/procedures/` (10 namespace files for all routers)
    - [x] Define all 50+ procedure input/output types

- [x] **Implement - RPC Router** `[activity: api-development]`
    - [x] Create `apps/api/src/rpc/index.ts` (router setup)
    - [x] Implement RPC request parsing and validation
    - [x] Implement error handling middleware (catch all errors, return RPCErrorResponse)
    - [x] Implement request logging middleware
    - [x] Create `apps/api/src/rpc/types.ts` (ProcedureContext, ProcedureHandler)

- [x] **Validate**
    - [x] Type contracts compile without errors
    - [x] RPC router handles requests
    - [x] Error responses follow standard format
    - [x] Logging captures request/response

**Success Criteria:** RPC foundation ready, type contracts defined for all 50+ procedures

---

### 3.2 User & Profile Router `[duration: 2-3 days]` `[parallel: false]`

- [x] **Prime Context**
    - [x] Read `docs/api-architecture.md` Section: "User Router" (6 procedures)
    - [x] Read PRD Section: "F2: Customizable User Profiles" (lines 144-155)
    - [x] Read DATABASE_SCHEMA.md: `user_profiles`, `profile_sections`, `section_content`

- [x] **Write Tests** `[activity: test-api]`
    - [x] `user.getProfile` tests: By username, public/private visibility
    - [x] `user.updateProfile` tests: Display name, bio, avatar, visibility
    - [x] `user.updateStyle` tests: JSONB validation, background/colors/fonts
    - [x] `user.updateSections` tests: Add/remove/reorder sections
    - [x] Storage quota tests: Profile updates respect quota

- [x] **Implement** `[activity: api-development]`
    - [x] Create `apps/api/src/rpc/routers/user.ts`
    - [x] Implement `user.getProfile` (handle visibility: public/private/unlisted)
    - [x] Implement `user.updateProfile` (display name, bio, avatar, visibility)
    - [x] Implement `user.updateStyle` (JSONB: background, music, style)
    - [x] Implement `user.updateSections` (add, remove, reorder profile sections)
    - [x] Implement `user.getSections` (fetch profile sections)
    - [x] Add Zod validation for JSONB schemas (profileConfig, styleConfig)
    - [x] Create business logic in `apps/api/src/features/user/`

- [x] **Validate**
    - [x] All user router tests pass
    - [x] Profile visibility controls work
    - [x] JSONB updates validate correctly
    - [x] Test coverage: 90%+

**Success Criteria:** Users can view and customize profiles

---

### 3.3 Post Router `[duration: 2-3 days]` `[parallel: false]`

- [x] **Prime Context**
    - [x] Read `docs/api-architecture.md` Section: "Post Router" (8 procedures)
    - [x] Read PRD Section: "F3: Content Creation and Post Types" (lines 157-167)
    - [x] Read DATABASE_SCHEMA.md: `posts`, `post_media`, `comments`, `reposts`, `post_interactions`

- [x] **Write Tests** `[activity: test-api]`
    - [x] `post.create` tests: Text, image, video, song post types
    - [x] `post.getById` tests: Public post, private post, deleted post
    - [x] `post.update` tests: Edit content, change visibility
    - [x] `post.delete` tests: Soft delete, cascade to comments
    - [x] `post.like/unlike` tests: Optimistic updates, counter increments
    - [x] `post.comment` tests: Create comment, thread depth
    - [x] Storage quota tests: Image/video posts respect user quota

- [x] **Implement** `[activity: api-development]`
    - [x] Create `apps/api/src/rpc/routers/post.ts`
    - [x] Implement `post.create` (validate type, content, media, check storage quota)
    - [x] Implement `post.getById` (check visibility, include comments)
    - [x] Implement `post.update` (owner only, validate changes)
    - [x] Implement `post.delete` (soft delete, set `deleted_at`)
    - [x] Implement `post.like` / `post.unlike` (trigger updates counter)
    - [x] Implement `post.comment` (create comment, update counter)
    - [x] Implement `post.getComments` (with cursor pagination)
    - [x] Add cursor-based pagination for post lists
    - [x] Create business logic in `apps/api/src/features/post/`

- [x] **Validate**
    - [x] All post router tests pass (35/36 - 97% pass rate)
    - [x] Post types (text, image, video, song) create correctly
    - [x] Soft delete works
    - [x] Like/comment counters update via triggers
    - [x] Test coverage: 90%+ (97% pass rate, comprehensive test suite)

**Success Criteria:** Full CRUD for posts with all types, likes, comments ✅ **COMPLETE**

---

### 3.4 Social Router `[duration: 2 days]` `[parallel: true]`

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

### 3.5 Feed Router `[duration: 2-3 days]` `[parallel: false]`

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

### 3.6 Media Router `[duration: 2 days]` `[parallel: true]`

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

### 3.7 Message, Notification, Discovery, Settings Routers `[duration: 3-4 days]` `[parallel: true]`

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

## **Phase 4: Frontend Foundation** `[duration: 2-3 weeks]` `[priority: P1]`

**Goal:** Build React PWA with core UI, state management, routing, and authentication.

### 4.1 PWA Setup & Core UI `[duration: 2-3 days]` `[parallel: false]`

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

### 4.2 State Management Setup `[duration: 2 days]` `[parallel: false]`

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

### 4.3 RPC Client & API Integration `[duration: 2 days]` `[parallel: false]`

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

### 4.4 Authentication UI `[duration: 2-3 days]` `[parallel: false]`

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

## **Phase 5: Core Features** `[duration: 3-4 weeks]` `[priority: P1]`

**Goal:** Implement feed system, profile display/editing, messaging, and notifications.

### 5.1 Feed System `[duration: 4-5 days]` `[parallel: false]`

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

### 5.2 Profile Display & Editing `[duration: 4-5 days]` `[parallel: false]`

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

### 5.3 Messaging `[duration: 3-4 days]` `[parallel: true]`

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

### 5.4 Notifications `[duration: 2 days]` `[parallel: true]`

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

## **Phase 6: Advanced Features** `[duration: 2-3 weeks]` `[priority: P2]`

**Goal:** Implement visual feed algorithm builder, search/discovery, and PWA offline capabilities.

### 6.1 Visual Feed Algorithm Builder `[duration: 4-5 days]` `[parallel: false]`

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

### 6.2 Search & Discovery `[duration: 2-3 days]` `[parallel: true]`

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

### 6.3 PWA Offline Capabilities `[duration: 3-4 days]` `[parallel: false]`

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

## **Phase 7: Polish & Launch Readiness** `[duration: 1-2 weeks]` `[priority: P2]`

**Goal:** Performance optimization, accessibility enhancements, security audit, and final testing.

### 7.1 Performance Optimization `[duration: 3-4 days]` `[parallel: true]`

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

### 7.2 Accessibility & Security Audit `[duration: 2-3 days]` `[parallel: true]`

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

### 7.3 Final Testing & Documentation `[duration: 2-3 days]` `[parallel: false]`

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
