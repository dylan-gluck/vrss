# Documentation Refactor Plan

## Executive Summary

This document outlines a comprehensive plan to consolidate, update, and align the VRSS documentation with the current implementation. The analysis revealed that while the codebase is in excellent shape with all tests passing, the documentation has accumulated debt due to recent architectural changes (Better-auth integration, username as primary identifier, RPC architecture).

**Current State**: Phase 4.4 (Authentication UI) completed. All backend and frontend tests passing.

**Target State**: Clear, accurate, consolidated documentation reflecting the source of truth (implementation), ready for Phase 5.1 (Core Features).

---

## Critical Inconsistencies Identified

### 1. **Authentication Architecture Shift**
- **Issue**: Documentation may reference custom auth, but implementation uses Better-auth library
- **Impact**: HIGH - Core architectural decision
- **Evidence**: Commits c3fbfad, 2090aa3 migrated to Better-auth with username plugin
- **Fix Required**: Update all auth documentation to reflect Better-auth integration

### 2. **Username vs Email as Primary Identifier**
- **Issue**: Email may be referenced as primary identifier in docs, but username is actual primary
- **Impact**: HIGH - Fundamental data model decision
- **Evidence**:
  - Database: `User.username` is unique, case-insensitive
  - Better-auth: Uses username plugin for login (3-30 chars)
  - API: Login endpoint uses username, not email
- **Fix Required**: Global search and replace of email-centric language with username-centric

### 3. **Better-Auth Database Tables Not Documented**
- **Issue**: Recent migrations added Account, Session, VerificationToken tables
- **Impact**: MEDIUM - Missing documentation for 3 core tables
- **Evidence**: Migration 20251021050404 added Account table
- **Fix Required**: Document Better-auth schema extensions

### 4. **Post Type Mapping Confusion**
- **Issue**: API uses simplified types (text, image, video, song) but database has granular types (text_short, text_long, image_single, image_gallery, video_short, etc.)
- **Impact**: MEDIUM - Developer confusion on which types to use
- **Evidence**: API router maps types at `post.ts:290`
- **Fix Required**: Document type transformation layer clearly

### 5. **Password Storage Dual Approach**
- **Issue**: Both `User.passwordHash` (legacy) and `Account.password` (Better-auth) exist
- **Impact**: MEDIUM - Confusion on where passwords are stored
- **Evidence**:
  - User.passwordHash made optional in migration 20251021044029
  - Better-auth stores passwords in Account.password
- **Fix Required**: Document password storage evolution and current approach

### 6. **Email Verification State**
- **Issue**: Email verification implemented but disabled for MVP
- **Impact**: LOW - Feature exists but not enforced
- **Evidence**: `auth.ts:39-52` - requireEmailVerification: false
- **Fix Required**: Document MVP vs full implementation differences

### 7. **Database Triggers Undocumented**
- **Issue**: Database triggers auto-update counters and create friendships, likely not in docs
- **Impact**: MEDIUM - Hidden database behavior
- **Evidence**: 3 trigger migrations (friendship, post counters, storage)
- **Fix Required**: Document all database triggers and their purpose

### 8. **RPC Architecture Not Clearly Explained**
- **Issue**: API uses RPC pattern (POST /api/rpc) not REST, may not be documented
- **Impact**: HIGH - Core API design decision
- **Evidence**: All API calls go through unified RPC router
- **Fix Required**: Document RPC pattern, why it was chosen, how it works

### 9. **Type Duplication Across Packages**
- **Issue**: User type defined in 4+ places (api-contracts, web/auth, web/store, api/rpc)
- **Impact**: MEDIUM - Risk of type drift
- **Evidence**: Same interfaces redefined multiple times
- **Fix Required**: Document canonical type locations and import patterns

### 10. **Offline Support Undocumented**
- **Issue**: Frontend has sophisticated offline queue with retry logic
- **Impact**: MEDIUM - Key PWA feature
- **Evidence**: offlineStore.ts with QueuedAction pattern
- **Fix Required**: Document offline-first architecture

---

## Refactor Strategy

### Phase 1: Evergreen Documentation (Architecture-Level)

**Goal**: Create 9 authoritative documents that serve as source of truth for the entire stack.

**Documents to Create/Update**:

1. **ARCHITECTURE.md** (consolidate architecture/)
   - System overview with C4 diagrams (Context, Container, Component)
   - Monorepo structure and workspace organization
   - Technology stack with rationale (Bun, Hono, Better-auth, React, Prisma)
   - Development environment (Docker, Makefile, local)
   - Deployment view (containers, networking, volumes)

2. **DATA_MODEL.md** (NEW - critical)
   - Complete entity relationship diagram (Mermaid ERD)
   - All 28 models with field pseudocode
   - Primary identifiers (username, not email)
   - Better-auth schema extensions (Account, Session, VerificationToken)
   - Database triggers (friendship, counters, storage)
   - Enums and their purposes
   - Type transformation layer (BigInt ↔ string, API types ↔ DB types)
   - Validation rules and constraints

3. **API.md** (consolidate API_*)
   - RPC architecture explanation and rationale
   - Endpoint reference (all 10 routers, ~60 procedures)
   - Request/response format (standardized RPC envelope)
   - Authentication/authorization (session-based, public procedures)
   - Validation strategy (Zod schemas, error codes)
   - Pagination patterns (cursor-based)
   - Error handling and error codes (1000-1999 range)
   - Rate limiting (if implemented)

4. **AUTHENTICATION.md** (consolidate AUTH_*)
   - Better-auth integration overview
   - Session management (7-day expiry, sliding window)
   - Auth flows (register, login, logout, verify email)
   - Password requirements (12+ chars, complexity)
   - Username system (3-30 chars, alphanumeric + underscore)
   - Email verification (implemented but disabled for MVP)
   - Security measures (CSRF, secure cookies, hashing)
   - Frontend auth state (Zustand + localStorage)

5. **FRONTEND.md** (consolidate frontend-*)
   - React architecture (feature-based organization)
   - State management (Zustand stores: auth, ui, offline)
   - Data fetching (TanStack Query with optimistic updates)
   - Routing (React Router with AuthGuard)
   - Component library (shadcn-ui patterns)
   - Form handling (React Hook Form + Zod)
   - PWA features (service worker, manifest, offline queue)
   - Responsive design (desktop/mobile layouts)

6. **DATABASE.md** (consolidate DATABASE_*)
   - Prisma schema overview
   - Migration strategy and history
   - Indexing strategy (37 indexes documented)
   - Cascade delete patterns
   - Soft delete approach (deletedAt timestamps)
   - JSONB usage (configs, flexible schemas)
   - PostgreSQL-specific features (arrays, triggers)
   - Storage quota system

7. **TESTING.md** (update existing)
   - Testing strategy overview
   - Backend tests (Bun, 595 tests, builder pattern)
   - Frontend tests (Vitest, 333 tests, MSW mocking)
   - E2E tests (Playwright, disabled in CI, why)
   - Test utilities (builders, helpers, fixtures)
   - Coverage goals
   - CI/CD test pipeline

8. **INFRASTRUCTURE.md** (consolidate INFRASTRUCTURE_*)
   - Docker setup (dev containers, compose)
   - Makefile orchestration (all commands)
   - Local development setup
   - Environment variables
   - Build process (Turbo monorepo)
   - Linting/formatting (Biome)
   - Type checking (TypeScript strict mode)

9. **TECH_STACK.md** (NEW)
   - Complete technology inventory
   - Backend: Bun, Hono, Prisma, PostgreSQL, Better-auth
   - Frontend: React, Vite, TanStack Query, Zustand, shadcn-ui, Tailwind
   - Build: Turbo, Biome, TypeScript
   - Testing: Bun test, Vitest, Playwright, MSW
   - Infrastructure: Docker, Make
   - Rationale for each major choice

### Phase 2: Spec Documentation (Feature-Level)

**Goal**: Update 001-vrss-social-platform spec to align with evergreen docs and current implementation.

**Target Structure**:
```
docs/specs/001-vrss-social-platform/
├── PRD.md (Product Requirements - updated with actual features)
├── DATA_MODEL.md (Feature data model - references evergreen)
├── TESTING.md (Feature test strategy)
├── plan/ (implementation plan - split into phases)
│   ├── index.md (plan overview, phase summary)
│   ├── phase-1-foundation.md
│   ├── phase-2-authentication.md (COMPLETED)
│   ├── phase-3-backend-api.md (COMPLETED)
│   ├── phase-4-frontend-foundation.md (COMPLETED)
│   ├── phase-5-core-features.md (NEXT - 5.1 starting)
│   ├── phase-6-advanced-features.md
│   └── phase-7-polish-launch.md
└── sdd/ (software design document - split by subsystem)
    ├── index.md (design overview)
    ├── architecture.md
    ├── data-model.md
    ├── api-contracts.md
    ├── frontend-components.md
    └── security.md
```

**Documents to Update**:

1. **PRD.md**
   - Remove completed features from "planned" sections
   - Mark Phase 4 as complete
   - Update Phase 5 with specific tasks (5.1, 5.2, etc.)
   - Align feature descriptions with implementation
   - Remove speculative features not in scope

2. **DATA_MODEL.md**
   - Reference evergreen DATA_MODEL.md
   - Highlight feature-specific schema (posts, media, etc.)
   - Document feature-specific validation rules
   - Show relevant ERD subset

3. **TESTING.md**
   - Reference evergreen TESTING.md
   - Document feature-specific test cases
   - Current test coverage status
   - Acceptance criteria for each phase

4. **plan/** (split PLAN.md using md-tree)
   - Use `md-tree explode` to split by phase
   - Update each phase with:
     - Status (completed/in-progress/pending)
     - Implementation notes
     - Actual vs estimated timeline
     - Blockers/challenges
   - Remove fluff, keep critical info

5. **sdd/** (split SDD.md using md-tree)
   - Use `md-tree explode` to split by subsystem
   - Update with actual implementation details
   - Remove outdated design decisions
   - Reference evergreen docs for shared concerns

### Phase 3: Cleanup and Consolidation

**Documents to Remove**:
```
# Remove redundant/outdated files
docs/API_IMPLEMENTATION_CHECKLIST.md → consolidated into API.md
docs/API_IMPLEMENTATION_STRATEGY.md → consolidated into API.md
docs/api-architecture.md → consolidated into ARCHITECTURE.md + API.md
docs/api-diagrams.md → diagrams embedded in relevant docs
docs/api-implementation-guide.md → consolidated into API.md
docs/api-quick-reference.md → consolidated into API.md
docs/API-README.md → consolidated into API.md

docs/frontend-api-integration.md → consolidated into FRONTEND.md + API.md
docs/frontend-architecture.md → consolidated into FRONTEND.md
docs/frontend-data-models.md → consolidated into DATA_MODEL.md
docs/frontend-diagrams.md → diagrams embedded in FRONTEND.md
docs/frontend-implementation-guide.md → consolidated into FRONTEND.md
docs/frontend-README.md → consolidated into FRONTEND.md

docs/DATABASE_IMPLEMENTATION_SUMMARY.md → consolidated into DATABASE.md
docs/DATABASE_VISUAL_GUIDE.md → consolidated into DATABASE.md

docs/INFRASTRUCTURE_COMPLETE.md → consolidated into INFRASTRUCTURE.md
docs/INFRASTRUCTURE_FINAL.md → consolidated into INFRASTRUCTURE.md
docs/INFRASTRUCTURE_IMPROVEMENTS.md → consolidated into INFRASTRUCTURE.md
docs/INFRASTRUCTURE_SPEC.md → consolidated into INFRASTRUCTURE.md

docs/IMPLEMENTATION_SUMMARY.md → removed (outdated)
docs/INTEGRATION_POINTS.md → consolidated into ARCHITECTURE.md

docs/SECURITY_DESIGN.md → consolidated into AUTHENTICATION.md + API.md
docs/SECURITY_IMPLEMENTATION_GUIDE.md → consolidated into AUTHENTICATION.md
docs/SECURITY_README.md → consolidated into AUTHENTICATION.md
docs/SECURITY_TESTING.md → consolidated into TESTING.md

# Remove outdated spec subdirectories
docs/specs/001-vrss-social-platform/PLAN/ → recreate with md-tree split
```

**Documents to Keep** (updated):
```
docs/architecture/ → becomes single ARCHITECTURE.md
docs/domain/ → keep domain-specific patterns
docs/patterns/ → keep reusable patterns
docs/tasks/ → archive or remove after completion
docs/DOCKER.md → keep or consolidate into INFRASTRUCTURE.md
```

---

## Implementation Plan

### Step 1: Create Evergreen Documents (3 agents in parallel)

**Agent 1: Core Architecture**
- Input: Analysis results, current architecture docs
- Tasks:
  1. Create ARCHITECTURE.md with C4 diagrams
  2. Create TECH_STACK.md with rationale
  3. Create INFRASTRUCTURE.md from consolidation
- Output: 3 authoritative architecture documents

**Agent 2: Data & API**
- Input: Database analysis, API analysis, type patterns
- Tasks:
  1. Create DATA_MODEL.md with complete ERD and all 28 models
  2. Create API.md with RPC pattern and all procedures
  3. Create DATABASE.md with Prisma and triggers
- Output: 3 authoritative data/API documents

**Agent 3: Auth & Frontend**
- Input: Auth analysis, frontend analysis
- Tasks:
  1. Create AUTHENTICATION.md with Better-auth integration
  2. Create FRONTEND.md with React patterns
  3. Update TESTING.md with current patterns
- Output: 3 authoritative auth/frontend documents

### Step 2: Update Spec Documents (2 agents in parallel)

**Agent 4: Spec Core Updates**
- Input: Evergreen docs, current PRD, phase status
- Tasks:
  1. Update PRD.md with completed features
  2. Create spec DATA_MODEL.md referencing evergreen
  3. Update spec TESTING.md with acceptance criteria
- Output: Updated spec core documents

**Agent 5: Plan & SDD Split**
- Input: Current PLAN.md, SDD.md, phase completion status
- Tasks:
  1. Use `md-tree explode docs/specs/001-vrss-social-platform/PLAN.md docs/specs/001-vrss-social-platform/plan`
  2. Use `md-tree explode docs/specs/001-vrss-social-platform/SDD.md docs/specs/001-vrss-social-platform/sdd`
  3. Update each split file with current status
  4. Create index.md files for navigation
  5. Remove original monolithic files
- Output: Organized plan/ and sdd/ directories

### Step 3: Cleanup and Validation (1 agent)

**Agent 6: Cleanup Agent**
- Input: List of files to remove/consolidate
- Tasks:
  1. Use Bash to remove redundant files
  2. Update any broken references
  3. Create docs/README.md navigation guide
- Output: Clean docs/ structure

### Step 4: Review (5 analyzer agents in parallel)

**Agent 7-11: Review Agents**
Each agent reviews a specific domain:
- **Agent 7**: Review ARCHITECTURE.md, TECH_STACK.md, INFRASTRUCTURE.md
- **Agent 8**: Review DATA_MODEL.md, DATABASE.md
- **Agent 9**: Review API.md, AUTHENTICATION.md
- **Agent 10**: Review FRONTEND.md, TESTING.md
- **Agent 11**: Review spec docs (PRD, plan/, sdd/)

**Review Criteria**:
- Accuracy: Does it match the implementation?
- Completeness: Are all features documented?
- Clarity: Is it understandable?
- Consistency: Does it align with other docs?
- References: Are cross-references correct?

---

## Success Criteria

### Evergreen Docs
- [x] Maximum 9 documents covering all aspects
- [x] No code snippets (use pseudocode)
- [x] Mermaid diagrams embedded in relevant sections
- [x] All cross-references working
- [x] Reflects current implementation (source of truth)
- [x] Username as primary identifier documented
- [x] Better-auth integration documented
- [x] RPC architecture explained

### Spec Docs
- [x] Maximum 3 root documents (PRD, DATA_MODEL, TESTING)
- [x] plan/ directory with 7 phase files + index
- [x] sdd/ directory with 5 subsystem files + index
- [x] Phase 4 marked complete
- [x] Phase 5.1 clearly defined as next
- [x] All file references valid
- [x] No duplication with evergreen docs (use references)

### Cleanup
- [x] All redundant files removed
- [x] No broken references
- [x] Clear navigation (docs/README.md)
- [x] Consistent formatting (Markdown, Mermaid)

---

## Validation Checklist

After refactor, verify:

- [ ] Can a new developer understand the architecture from ARCHITECTURE.md?
- [ ] Can a developer implement a feature using DATA_MODEL.md and API.md?
- [ ] Is the authentication flow clear from AUTHENTICATION.md?
- [ ] Can the frontend be understood from FRONTEND.md?
- [ ] Are database triggers and their purposes documented?
- [ ] Is the RPC pattern clearly explained?
- [ ] Is username as primary identifier mentioned in all relevant places?
- [ ] Are Better-auth tables documented in DATA_MODEL.md?
- [ ] Is the type transformation layer (BigInt ↔ string) explained?
- [ ] Is the offline queue documented?
- [ ] Are all 28 database models listed with relationships?
- [ ] Is password storage approach clear?
- [ ] Is email verification state (disabled for MVP) documented?
- [ ] Are Phase 5+ requirements clear?
- [ ] Are all test patterns documented?

---

## Timeline Estimate

- **Step 1** (Evergreen docs): ~2-3 hours (3 agents in parallel)
- **Step 2** (Spec updates): ~1-2 hours (2 agents in parallel)
- **Step 3** (Cleanup): ~30 minutes (1 agent)
- **Step 4** (Review): ~1 hour (5 agents in parallel)

**Total**: ~4-6 hours of agent processing time

---

## Notes

- All agents must use the implementation as source of truth
- Pseudocode only, no actual code in docs
- Mermaid diagrams for all data models and flows
- Cross-reference liberally (DRY principle for docs)
- Keep docs focused and scannable (use tables, lists)
- Every file must have a clear purpose and audience
- Remove speculation, document reality

---

## Appendix: Key Architectural Facts to Emphasize

### Authentication
- Better-auth library with username plugin
- Username is primary identifier (3-30 chars, alphanumeric + underscore)
- Session-based (7-day cookies, 24-hour sliding window)
- Password: 12+ chars with uppercase, lowercase, number, special char
- Email verification implemented but disabled for MVP

### Database
- 28 Prisma models across 4 phases
- BigInt IDs (converted to strings in API)
- 3 database triggers (friendship, counters, storage)
- Better-auth tables (Account, Session, VerificationToken)
- Soft deletes (deletedAt timestamps)
- JSONB for flexible configs

### API
- RPC pattern (POST /api/rpc, not REST)
- 10 routers, ~60 procedures
- Zod validation for all inputs
- Cursor-based pagination
- Error codes (1000-1999 range)
- Type transformation layer

### Frontend
- React + Vite PWA
- Zustand (auth, ui, offline stores)
- TanStack Query (with optimistic updates)
- shadcn-ui components
- React Hook Form + Zod
- Offline queue with retry

### Testing
- Backend: Bun test (595 tests)
- Frontend: Vitest (333 tests)
- E2E: Playwright (disabled in CI)
- Builder pattern for test data
- MSW for API mocking

### Phase Status
- Phase 1-4: COMPLETED
- Phase 5.1: NEXT (Core Features - Posts, Feeds)
- Phase 5-7: PENDING
