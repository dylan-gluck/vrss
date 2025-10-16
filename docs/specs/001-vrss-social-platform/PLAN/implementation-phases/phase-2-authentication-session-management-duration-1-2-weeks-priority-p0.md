# **Phase 2: Authentication & Session Management** `[duration: 1-2 weeks]` `[priority: P0]`

**Goal:** Implement Better-auth with email verification, session management, and auth middleware for RPC routing.

## 2.1 Better-auth Core Setup `[duration: 2 days]` `[parallel: false]`

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

## 2.2 Auth Procedures & Email Verification `[duration: 2-3 days]` `[parallel: false]`

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

## 2.3 Auth Middleware & RPC Integration `[duration: 2 days]` `[parallel: false]`

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
