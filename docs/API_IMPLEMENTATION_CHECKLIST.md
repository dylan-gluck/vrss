# VRSS RPC API Implementation Checklist

**Status**: Planning Phase
**Total Procedures**: 50+
**Total Routers**: 10
**Estimated Timeline**: 4 weeks

---

## Quick Reference

### Router Overview

| Router | Procedures | Priority | Dependencies | Estimated Days |
|--------|-----------|----------|--------------|----------------|
| **auth** | 6 | P0 Critical | None | 1-2 days |
| **user** | 6 | P0 Critical | auth | 1-2 days |
| **post** | 8 | P1 High | user | 1-2 days |
| **social** | 6 | P1 High | user | 1-2 days |
| **feed** | 4 | P1 High | post, social | 1-2 days |
| **discovery** | 3 | P2 Medium | post, user, social | 1-2 days |
| **media** | 4 | P1 High | user | 1-2 days |
| **message** | 5 | P2 Medium | user, social | 1-2 days |
| **notification** | 3 | P2 Medium | user, post, social | 1-2 days |
| **settings** | 5 | P2 Medium | user | 1-2 days |
| **TOTAL** | **50** | - | - | **~4 weeks** |

---

## Phase 1: Foundation (Week 1, Days 1-3)

### 1A. RPC Infrastructure ⏸️

**Files to Create:**
- [ ] `backend/src/index.ts` - Hono server entry point
- [ ] `backend/src/rpc/router.ts` - Main RPC router with procedure registry
- [ ] `backend/src/rpc/types.ts` - ProcedureContext type definition
- [ ] `backend/src/middleware/auth.ts` - Better-auth integration
- [ ] `backend/src/middleware/rateLimit.ts` - Rate limiting middleware
- [ ] `backend/src/middleware/logging.ts` - Request logging
- [ ] `backend/src/lib/prisma.ts` - Prisma client initialization
- [ ] `backend/src/lib/errors.ts` - Custom error classes

**Key Features:**
- [x] Single RPC endpoint: `POST /api/rpc`
- [x] Procedure-based routing with registry pattern
- [x] Middleware chain: logger → CORS → auth → rate limit → router
- [x] Better-auth session validation
- [x] Error handling with proper HTTP status codes
- [x] Request ID generation and correlation

**Success Criteria:**
- ✅ Health check endpoint responds: `GET /health`
- ✅ RPC router handles valid/invalid procedure names
- ✅ Authentication middleware validates sessions
- ✅ Rate limiting blocks excessive requests
- ✅ Error responses follow standard format

---

### 1B. Type Contracts ⏸️

**Package to Create:** `packages/api-contracts/`

**Files to Create:**
- [ ] `packages/api-contracts/src/index.ts` - Main export
- [ ] `packages/api-contracts/src/rpc.ts` - RPCRequest/RPCResponse types
- [ ] `packages/api-contracts/src/errors.ts` - ErrorCode enum, RPCError class
- [ ] `packages/api-contracts/src/types.ts` - Shared domain types (User, Post, etc.)
- [ ] `packages/api-contracts/src/procedures/auth.ts` - AuthProcedures namespace
- [ ] `packages/api-contracts/src/procedures/user.ts` - UserProcedures namespace
- [ ] `packages/api-contracts/src/procedures/post.ts` - PostProcedures namespace
- [ ] `packages/api-contracts/src/procedures/feed.ts` - FeedProcedures namespace
- [ ] `packages/api-contracts/src/procedures/social.ts` - SocialProcedures namespace
- [ ] `packages/api-contracts/src/procedures/discovery.ts` - DiscoveryProcedures namespace
- [ ] `packages/api-contracts/src/procedures/message.ts` - MessageProcedures namespace
- [ ] `packages/api-contracts/src/procedures/notification.ts` - NotificationProcedures namespace
- [ ] `packages/api-contracts/src/procedures/media.ts` - MediaProcedures namespace
- [ ] `packages/api-contracts/src/procedures/settings.ts` - SettingsProcedures namespace
- [ ] `packages/api-contracts/package.json`
- [ ] `packages/api-contracts/tsconfig.json`

**Success Criteria:**
- ✅ All 50+ procedures have `input` and `output` types
- ✅ Shared types exported from single entry point
- ✅ Error codes cover all failure scenarios (1000-1999, 9999)
- ✅ Type-safe request/response structure
- ✅ TypeScript strict mode passes

---

## Phase 2: Core Routers (Week 1-2)

### 2A. Auth Router (P0 Critical) ⏸️

**File:** `backend/src/rpc/routers/auth.ts`

**Procedures:**
- [ ] `auth.register` - User registration with email verification
  - Input: username, email, password
  - Output: user, sessionToken
  - Errors: DUPLICATE_USERNAME, DUPLICATE_EMAIL, VALIDATION_ERROR

- [ ] `auth.login` - Email/password authentication
  - Input: email, password
  - Output: user, sessionToken
  - Errors: INVALID_CREDENTIALS, EMAIL_NOT_VERIFIED

- [ ] `auth.logout` - Session termination
  - Input: void
  - Output: success
  - Errors: UNAUTHORIZED

- [ ] `auth.getSession` - Current session validation
  - Input: void
  - Output: user, expiresAt
  - Errors: UNAUTHORIZED, SESSION_EXPIRED

- [ ] `auth.requestPasswordReset` - Password reset email
  - Input: email
  - Output: success
  - Errors: USER_NOT_FOUND

- [ ] `auth.resetPassword` - Password reset confirmation
  - Input: token, newPassword
  - Output: success
  - Errors: INVALID_TOKEN, VALIDATION_ERROR

**Tests:**
- [ ] Unit tests for all 6 procedures
- [ ] Integration tests with Better-auth
- [ ] Security tests (session expiry, invalid tokens)
- [ ] Password strength validation tests

**Dependencies:**
- Better-auth library
- Zod for validation
- Prisma for user queries

---

### 2B. User Router (P0 Critical) ⏸️

**File:** `backend/src/rpc/routers/user.ts`

**Procedures:**
- [ ] `user.getProfile` - Fetch user profile (public)
  - Input: username
  - Output: user, profile (style, sections)
  - Visibility check: public/followers/private

- [ ] `user.updateProfile` - Update profile info
  - Input: displayName, bio, age, location, website
  - Output: user
  - Authorization: own profile only

- [ ] `user.updateStyle` - Update profile styling (JSONB)
  - Input: styleConfig (colors, fonts, background)
  - Output: style
  - Validation: Zod schema for JSONB structure

- [ ] `user.updateSections` - Update profile layout
  - Input: sections array
  - Output: sections
  - Validation: section types, order

- [ ] `user.getSettings` - Get user settings
  - Input: void
  - Output: privacy, notification preferences

- [ ] `user.searchUsers` - Basic user search
  - Input: query, limit
  - Output: users array
  - Pattern: PostgreSQL ILIKE fuzzy search

**Tests:**
- [ ] Unit tests for all 6 procedures
- [ ] JSONB handling tests (valid/invalid configs)
- [ ] Profile visibility authorization tests
- [ ] User search fuzzy matching tests

**Dependencies:**
- Auth router (session validation)
- Prisma for user/profile queries
- Zod for JSONB validation

---

### 2C. Post Router (P1 High) ⏸️

**File:** `backend/src/rpc/routers/post.ts`

**Procedures:**
- [ ] `post.create` - Create new post
  - Input: type, content, mediaUrls, visibility
  - Output: post
  - Validation: content length, media URLs

- [ ] `post.getById` - Fetch single post
  - Input: postId
  - Output: post, author
  - Check: visibility rules

- [ ] `post.update` - Update post content
  - Input: postId, content, visibility
  - Output: post
  - Authorization: own post only

- [ ] `post.delete` - Soft delete post
  - Input: postId
  - Output: success
  - Pattern: set deletedAt timestamp

- [ ] `post.like` - Like/unlike post
  - Input: postId
  - Output: success, liked (boolean)
  - Pattern: toggle like, update denormalized counter

- [ ] `post.getComments` - Fetch comments (cursor pagination)
  - Input: postId, limit, cursor
  - Output: comments, nextCursor, hasMore

- [ ] `post.createComment` - Add comment
  - Input: postId, content
  - Output: comment

- [ ] `post.repost` - Repost content
  - Input: postId
  - Output: repost
  - Pattern: create new post with reference

**Tests:**
- [ ] Unit tests for all 8 procedures
- [ ] Cursor pagination tests
- [ ] Denormalized counter tests (likes, comments)
- [ ] Authorization tests (edit/delete own posts)
- [ ] Soft delete filtering tests

**Dependencies:**
- User router (author data)
- Media router (media URL validation)
- Prisma for post queries

---

## Phase 3: Social & Feed Routers (Week 2)

### 3A. Social Router (P1 High) ⏸️

**File:** `backend/src/rpc/routers/social.ts`

**Procedures:**
- [ ] `social.follow` - Follow user
- [ ] `social.unfollow` - Unfollow user
- [ ] `social.getFollowers` - List followers (cursor pagination)
- [ ] `social.getFollowing` - List following (cursor pagination)
- [ ] `social.sendFriendRequest` - Send friend request
- [ ] `social.respondToFriendRequest` - Accept/reject friend request

**Tests:**
- [ ] Unit tests for all 6 procedures
- [ ] Mutual follow detection tests (friendship creation)
- [ ] Prevent duplicate follows tests
- [ ] Friend request state machine tests

**Key Patterns:**
- Friendship auto-creation on mutual follow (database trigger)
- Prevent self-follow (constraint)
- Cursor pagination for followers/following lists

---

### 3B. Feed Router (P1 High) ⏸️

**File:** `backend/src/rpc/routers/feed.ts`

**Procedures:**
- [ ] `feed.getFeed` - Get feed (default or custom)
- [ ] `feed.createFeed` - Create custom feed
- [ ] `feed.updateFeed` - Update feed filters
- [ ] `feed.deleteFeed` - Delete custom feed

**Tests:**
- [ ] Unit tests for all 4 procedures
- [ ] Feed algorithm builder tests (JSONB → SQL translation)
- [ ] Filter validation tests (types, operators)
- [ ] Query performance tests
- [ ] Cursor pagination tests

**Key Patterns:**
- Feed algorithm builder service
- JSONB filter storage
- Dynamic SQL generation (parameterized queries)
- Query timeout enforcement

---

## Phase 4: Enhanced Features (Week 3)

### 4A. Discovery Router (P2 Medium) ⏸️

**File:** `backend/src/rpc/routers/discovery.ts`

**Procedures:**
- [ ] `discovery.searchUsers` - User search with fuzzy matching
- [ ] `discovery.searchPosts` - Content search
- [ ] `discovery.getDiscoverFeed` - Algorithmic discovery feed

**Tests:**
- [ ] Fuzzy search tests (pg_trgm)
- [ ] N-degree friend network tests
- [ ] Popularity scoring tests

---

### 4B. Media Router (P1 High) ⏸️

**File:** `backend/src/rpc/routers/media.ts`

**Procedures:**
- [ ] `media.initiateUpload` - Get presigned S3 URL
- [ ] `media.completeUpload` - Confirm upload success
- [ ] `media.getStorageUsage` - Storage quota info
- [ ] `media.deleteMedia` - Remove media file

**Tests:**
- [ ] Two-phase upload flow tests
- [ ] Storage quota enforcement tests
- [ ] Presigned URL generation tests
- [ ] File type validation tests

**Key Patterns:**
- Two-phase S3 upload (presigned URLs)
- Atomic quota checks
- Magic byte validation
- S3 lifecycle policies for orphaned files

---

### 4C. Message Router (P2 Medium) ⏸️

**File:** `backend/src/rpc/routers/message.ts`

**Procedures:**
- [ ] `message.sendMessage` - Send DM
- [ ] `message.getConversations` - List conversations (cursor)
- [ ] `message.getMessages` - List messages in conversation (cursor)
- [ ] `message.markAsRead` - Mark messages as read
- [ ] `message.deleteConversation` - Delete conversation

**Tests:**
- [ ] 1:1 and group DM tests
- [ ] Unread count tracking tests
- [ ] Cursor pagination tests

---

### 4D. Notification Router (P2 Medium) ⏸️

**File:** `backend/src/rpc/routers/notification.ts`

**Procedures:**
- [ ] `notification.getNotifications` - List notifications (cursor)
- [ ] `notification.markAsRead` - Mark notifications read
- [ ] `notification.markAllAsRead` - Bulk mark as read

**Tests:**
- [ ] Polymorphic target reference tests
- [ ] Unread count tracking tests
- [ ] Notification type filtering tests

---

## Phase 5: Settings & Finalization (Week 4)

### 5A. Settings Router (P2 Medium) ⏸️

**File:** `backend/src/rpc/routers/settings.ts`

**Procedures:**
- [ ] `settings.updateAccount` - Change username/email/password
- [ ] `settings.updatePrivacy` - Privacy settings
- [ ] `settings.updateNotifications` - Notification preferences
- [ ] `settings.exportData` - GDPR data export
- [ ] `settings.deleteAccount` - Account deletion (30-day grace)

**Tests:**
- [ ] Password re-authentication tests
- [ ] GDPR data export tests
- [ ] Soft delete with grace period tests

---

### 5B. Documentation & Quality ⏸️

- [ ] OpenAPI spec generation
- [ ] API reference documentation
- [ ] Swagger UI integration
- [ ] Comprehensive E2E test suite
- [ ] Security testing (injection, XSS, CSRF)
- [ ] Performance benchmarking (p95 < 200ms)
- [ ] Test coverage report (80%+ overall, 100% critical paths)

---

### 5C. Deployment Preparation ⏸️

- [ ] Production environment setup
- [ ] Database migration scripts
- [ ] Monitoring and logging (structured logs)
- [ ] Rate limiting with Redis
- [ ] Error tracking (Sentry integration)
- [ ] Final security audit
- [ ] Load testing

---

## Key Patterns Implemented

### ✅ Validation Pattern (Zod)
- [x] Reusable validation schemas
- [x] Consistent error responses
- [x] Type-safe input parsing

### ✅ Pagination Pattern (Cursor-based)
- [x] Standard `CursorPaginationInput`/`Output` types
- [x] `limit + 1` fetch pattern for `hasMore` detection
- [x] Opaque cursor encoding

### ✅ Authorization Pattern
- [x] Resource ownership checks
- [x] Profile visibility enforcement
- [x] Friend-only features

### ✅ JSONB Handling
- [x] Zod validation for JSONB structures
- [x] GIN indexes on JSONB columns
- [x] Safe query patterns

### ✅ Two-Phase Upload
- [x] Presigned URL generation
- [x] Atomic quota checks
- [x] Upload completion validation

### ✅ Rate Limiting
- [x] Procedure-specific limits
- [x] Redis-based distributed limiting
- [x] Retry-After headers

### ✅ Error Handling
- [x] Standardized error codes (1000-1999)
- [x] Proper HTTP status mapping
- [x] Development-only stack traces

---

## Testing Summary

### Test Coverage Requirements
- **Overall**: 80%+
- **Critical Paths**: 100% (auth, payments, data integrity)
- **Business Logic**: 90%+
- **UI Components**: 70%+

### Test Types
- [x] Unit tests (Bun Test) - `backend/src/**/__tests__/*.test.ts`
- [x] Integration tests (Testcontainers) - `backend/src/__tests__/integration/*.test.ts`
- [x] Contract tests (TypeScript `satisfies`) - Inline in procedures
- [x] Security tests - `backend/src/__tests__/security/*.test.ts`
- [x] E2E tests - `backend/src/__tests__/e2e/*.test.ts`

### Test Commands
```bash
bun test                        # All tests
bun test --watch                # Watch mode
bun test --coverage             # Coverage report
bun test auth.test.ts           # Specific file
bun test tests/unit/            # Unit tests only
bun test tests/integration/     # Integration tests only
```

---

## Final Checklist

### Before Production Deployment ⏸️

**Infrastructure:**
- [ ] Database migrations applied
- [ ] Redis configured for rate limiting
- [ ] S3 bucket created with lifecycle policies
- [ ] Environment variables set (secrets, URLs, keys)
- [ ] SSL/TLS certificates configured
- [ ] Nginx reverse proxy configured

**Security:**
- [ ] All secrets rotated from development
- [ ] Rate limiting enabled on all procedures
- [ ] Better-auth session cookies configured (domain, SameSite)
- [ ] CORS whitelist configured (production domains only)
- [ ] Input validation on all procedures
- [ ] SQL injection tests passed
- [ ] XSS protection enabled (CSP headers)

**Monitoring:**
- [ ] Error tracking enabled (Sentry, LogRocket, etc.)
- [ ] Performance monitoring (APM)
- [ ] Structured logging configured
- [ ] Slow query log enabled
- [ ] Alerting rules configured (downtime, errors, latency)

**Documentation:**
- [ ] API reference published
- [ ] OpenAPI spec hosted
- [ ] Deployment runbook created
- [ ] Incident response plan documented

**Performance:**
- [ ] Database indexes created (30+ indexes from schema)
- [ ] Query performance validated (p95 < 50ms)
- [ ] API response time validated (p95 < 200ms)
- [ ] Load testing passed (100 concurrent users)
- [ ] CDN configured for static assets

---

## Success Metrics

### Development Velocity
- **Week 1**: Foundation + Auth + User routers complete
- **Week 2**: Post + Social + Feed routers complete
- **Week 3**: Discovery + Media + Message + Notification routers complete
- **Week 4**: Settings router + Documentation + Deployment prep

### Quality Metrics
- **Test Coverage**: 80%+ overall, 100% critical paths
- **Type Safety**: 100% (no `any` types in production code)
- **API Response Time**: p95 < 200ms
- **Database Query Time**: p95 < 50ms
- **Error Rate**: < 1% in production

### Documentation Completeness
- ✅ All 50+ procedures documented
- ✅ OpenAPI spec generated
- ✅ Interactive API explorer (Swagger UI)
- ✅ Code examples for all procedures
- ✅ Error code reference
- ✅ Migration guides for breaking changes

---

## Next Actions

1. **Review Strategy**: Confirm this implementation approach with stakeholders
2. **Setup Environment**: Initialize backend project with Bun + Hono
3. **Start Phase 1A**: Implement RPC foundation (2 days)
4. **Define Contracts**: Create all type definitions (1 day)
5. **Implement Routers**: Follow sequence (auth → user → post → social → feed → ...)
6. **Test Continuously**: Write tests alongside each router
7. **Document as You Go**: Generate API docs incrementally
8. **Deploy to Production**: Week 4, Day 5

**Total Estimated Time**: 4 weeks (20 working days)
**Total Procedures**: 50+
**Total Routers**: 10
**Total Tests**: 200+ (unit + integration + E2E)

---

## Reference Documents

- **API Architecture**: `/docs/api-architecture.md`
- **API Implementation Guide**: `/docs/api-implementation-guide.md`
- **API Implementation Strategy**: `/docs/API_IMPLEMENTATION_STRATEGY.md` (this document's parent)
- **Database Schema**: `/docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md`
- **Security Design**: `/docs/SECURITY_DESIGN.md`
- **Frontend Architecture**: `/docs/frontend-architecture.md`

---

**Document Version**: 1.0
**Last Updated**: 2025-10-16
**Status**: Planning Phase ⏸️
