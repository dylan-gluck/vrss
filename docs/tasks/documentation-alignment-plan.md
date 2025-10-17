# VRSS Documentation Alignment - Consolidated Implementation Plan

**Generated:** 2025-10-17
**Status:** Action Required
**Total Effort:** 14.5-21.5 days (documentation + implementation)
**Priority:** P0 - Critical for project consistency

---

## Executive Summary

This plan consolidates findings from two comprehensive analyses:
1. **Data Model Consistency Analysis** - Comparing planning docs with Prisma schema implementation
2. **Implementation Phases Analysis** - Reviewing phase documentation completeness

### Critical Findings

**Data Model Issues:**
- 3 undocumented tables (sessions, verification_tokens, pending_uploads)
- Table count mismatch (docs claim 19, actual 23 tables)
- Post.visibility field missing from documentation

**Implementation Phase Issues:**
- Phase 3.6: Database triggers not implemented (blocks storage quota enforcement)
- Phase 3.7: 4 routers completely unspecified (blocks messaging/notifications/search)
- Phase 6.1: Algorithm builder architecture undefined
- Phase 7: Deployment strategy and security test details missing

### Overall Assessment

**Current State:** 75% ready for implementation
**Blockers:** 2 critical (Phase 3.6 triggers, Phase 3.7 router specs)
**Documentation Gaps:** 14 high-priority issues
**Code Quality:** Implementation is solid, documentation has drifted

---

## Priority 0: Critical Blockers (Complete This Week)

### CB-1: Complete Phase 3.6 Media Router

**Issue:** Database triggers for storage_usage updates not implemented
**Impact:** CRITICAL - Storage quota enforcement broken, Task 3.6 cannot be marked complete
**Location:** apps/api/prisma/migrations/20251017000001_add_storage_triggers/migration.sql
**Status:** ✅ COMPLETED (2025-10-17)

**What Was Done:**
- Created migration with INSERT/DELETE triggers on post_media table
- Triggers automatically update storage_usage counters by type (images, videos, audio, other)
- Applied to database successfully
- Uses GREATEST(0, ...) to prevent negative values

**Remaining Work:**
1. Update Phase 3 documentation to include trigger specifications
2. Add trigger validation to Phase 3.6 success criteria
3. Document reconciliation strategy for drift detection

**Effort:** 1 hour documentation
**Assignee:** Engineering team lead
**Due:** 2025-10-18

---

### CB-2: Fix Environment Variable Naming Inconsistency

**Issue:** Code expects different S3 variable names than .env.example
**Impact:** HIGH - Configuration errors in development and production
**Location:** apps/api/.env.example
**Status:** ✅ COMPLETED (2025-10-17)

**What Was Done:**
- Updated .env.example with correct variable names:
  - S3_ACCESS_KEY_ID (was S3_ACCESS_KEY)
  - S3_SECRET_ACCESS_KEY (was S3_SECRET_KEY)
  - CDN_URL (was S3_PUBLIC_URL)
  - S3_USE_PATH_STYLE (was missing)
- Added comprehensive comments for MinIO vs AWS configuration

**Remaining Work:**
1. Verify all team members update their .env files
2. Update deployment documentation with correct variable names
3. Add environment variable validation to startup checks

**Effort:** 30 minutes
**Assignee:** DevOps
**Due:** 2025-10-18

---

### CB-3: Create Phase 3.7 Router Specifications

**Issue:** 16 procedures across 4 routers completely unspecified
**Impact:** CRITICAL - Blocks Phase 5.3 (Messaging UI), 5.4 (Notifications UI), 6.2 (Search UI)
**Location:** docs/specs/001-vrss-social-platform/PLAN/implementation-phases/
**Status:** ❌ NOT STARTED

**Required Documents:**
1. `phase-3.7.1-message-router-implementation.md` (5 procedures)
2. `phase-3.7.2-notification-router-implementation.md` (3 procedures)
3. `phase-3.7.3-discovery-router-implementation.md` (3 procedures)
4. `phase-3.7.4-settings-router-implementation.md` (5 procedures)

**Template for Each Router:**
```markdown
# Phase 3.7.X - [Router Name] Implementation

## Overview
- Purpose: [Brief description]
- Procedures: [Count]
- Dependencies: [Phases]
- Test Coverage: 85-90%

## Procedures

### [router].[procedure]

**Purpose:** [Description]

**Input Schema:**
```typescript
import { z } from 'zod';

export const inputSchema = z.object({
  // field definitions
});

export type Input = z.infer<typeof inputSchema>;
```

**Output Schema:**
```typescript
export const outputSchema = z.object({
  // field definitions
});

export type Output = z.infer<typeof outputSchema>;
```

**Business Logic:**
1. Validate input with Zod schema
2. [Step-by-step logic]
3. Return response

**Database Queries:**
```typescript
// Specific Prisma queries
await prisma.table.findMany({
  where: { /* ... */ },
  include: { /* ... */ },
});
```

**Error Handling:**
- Error 13XX: [Description]
- Error 13XX: [Description]

**Test Cases:**
- [ ] Valid input succeeds
- [ ] Invalid input returns validation error
- [ ] Unauthorized access blocked
- [ ] Edge case: [description]

**Performance Requirements:**
- Target: <100ms p95
- Pagination: Cursor-based
- Cache strategy: [description]

---

[Repeat for each procedure]
```

**Effort:** 2-3 days total (0.5-1 day per router)
**Assignee:** Backend architect
**Due:** 2025-10-21
**Blocks:** Phase 5.3, 5.4, 6.2 implementation

---

## Priority 1: High-Impact Documentation Updates (Complete This Sprint)

### P1-1: Document Undocumented Database Tables

**Issue:** 3 tables exist in implementation but not in documentation
**Impact:** HIGH - Developers won't know about critical auth and media tables
**Status:** ❌ NOT STARTED

**Files to Update:**

#### 1. DATABASE_SCHEMA.md

Add **Section 1.5: Authentication & Session Tables** after Section 1.4:

```markdown
## 1.5 Authentication & Session Tables

### sessions

Tracks active user sessions with security metadata.

```sql
CREATE TABLE sessions (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token               VARCHAR(255) NOT NULL UNIQUE,
    expires_at          TIMESTAMPTZ(6) NOT NULL,
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    last_activity_at    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

COMMENT ON TABLE sessions IS 'User authentication sessions (managed by better-auth)';
COMMENT ON COLUMN sessions.token IS 'Session token (hashed, not raw JWT)';
COMMENT ON COLUMN sessions.expires_at IS 'Session expiration (7 days from creation)';
COMMENT ON COLUMN sessions.last_activity_at IS 'Last request timestamp for idle timeout';
```

**Session Cleanup:**
```sql
-- Delete expired sessions (run daily via cron)
DELETE FROM sessions WHERE expires_at < NOW();
```

### verification_tokens

Stores email verification tokens for new user registration.

```sql
CREATE TABLE verification_tokens (
    id                  BIGSERIAL PRIMARY KEY,
    identifier          VARCHAR(255) NOT NULL,
    token               VARCHAR(255) NOT NULL UNIQUE,
    expires             TIMESTAMPTZ(6) NOT NULL,
    created_at          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX verification_token_unique ON verification_tokens(identifier, token);
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);

COMMENT ON TABLE verification_tokens IS 'Email verification tokens (managed by better-auth)';
COMMENT ON COLUMN verification_tokens.identifier IS 'Email address being verified';
COMMENT ON COLUMN verification_tokens.token IS 'Random token (UUID v4, 1-hour expiry)';
```

**Token Cleanup:**
```sql
-- Delete expired tokens (run hourly via cron)
DELETE FROM verification_tokens WHERE expires < NOW();
```
```

Add to **Section 2: Content Tables** (after post_media):

```markdown
### pending_uploads

Temporary tracking for media uploads before post creation (Phase 3.6 Media Router).

```sql
CREATE TABLE pending_uploads (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             BIGINT NOT NULL,
    s3_key              VARCHAR(500) NOT NULL,
    filename            VARCHAR(255) NOT NULL,
    content_type        VARCHAR(100) NOT NULL,
    size                BIGINT NOT NULL,
    expires_at          TIMESTAMPTZ(6) NOT NULL,
    created_at          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pending_uploads_user_expires ON pending_uploads(user_id, expires_at);

COMMENT ON TABLE pending_uploads IS 'Temporary uploads awaiting post creation';
COMMENT ON COLUMN pending_uploads.s3_key IS 'S3 object key (users/{userId}/posts/{id}_{filename})';
COMMENT ON COLUMN pending_uploads.expires_at IS '24-hour expiry for orphaned uploads';
```

**Cleanup Strategy:**
```sql
-- Delete expired uploads (run hourly via cron)
-- Also delete corresponding S3 objects
DELETE FROM pending_uploads WHERE expires_at < NOW();
```

**Business Logic:**
1. User initiates upload via `media.initiateUpload` → Creates pending_uploads row
2. User uploads to S3 presigned URL (15-minute expiry)
3. User completes upload via `media.completeUpload` → Creates post_media row, deletes pending_uploads row
4. If user never completes: Cron job deletes expired pending_uploads + S3 objects after 24 hours
```

#### 2. DATA_STORAGE_DOCUMENTATION.md

Update **Line 95** - Table Count Summary:
```markdown
### Database Tables Summary

Total Tables: 23 (was 19)

**Phase 1: Foundation (6 tables)**
- users
- user_profiles
- subscription_tiers
- storage_usage
- sessions ← NEW
- verification_tokens ← NEW

**Phase 2: Content & Social (8 tables)** (was 7)
- posts
- post_media
- pending_uploads ← NEW
- user_follows
- friendships
- post_interactions
- comments
- reposts
```

Add **Section 6.5: Pending Upload Workflow** after Section 6.4:

```markdown
### 6.5 Pending Upload Workflow

#### Purpose
Decouples file upload from post creation, allowing users to:
1. Upload files to S3 first (better UX - progress bar)
2. Create post with already-uploaded media second (faster)

#### Flow
1. **Initiate Upload** (Client → API)
   ```typescript
   const result = await trpc.media.initiateUpload.mutate({
     filename: 'vacation.jpg',
     contentType: 'image/jpeg',
     size: 2048576 // 2MB
   });
   // result = { uploadId, uploadUrl, expiresAt }
   ```

2. **Upload to S3** (Client → S3)
   ```typescript
   await fetch(result.uploadUrl, {
     method: 'PUT',
     body: file,
     headers: { 'Content-Type': 'image/jpeg' }
   });
   ```

3. **Complete Upload** (Client → API)
   ```typescript
   await trpc.media.completeUpload.mutate({
     uploadId: result.uploadId,
     postId: null // or postId if attaching to existing post
   });
   ```

4. **Create Post** (Client → API)
   ```typescript
   await trpc.post.create.mutate({
     content: 'Check out my vacation!',
     mediaIds: [mediaId] // from completeUpload response
   });
   ```

#### Cleanup Strategy
- **Hourly cron job** deletes pending_uploads WHERE expires_at < NOW()
- **Also deletes corresponding S3 objects** to prevent orphaned files
- **Expiry:** 24 hours from creation (gives users time to recover from errors)

#### Storage Quota
- Quota checked in `media.initiateUpload` (prevents upload if would exceed)
- Quota updated in `media.completeUpload` via database triggers
- If user never completes upload, quota remains unchanged (pending uploads don't count)
```

#### 3. DATABASE_IMPLEMENTATION_STRATEGY.md

Update **Line 15** - Table Count:
```markdown
**Total:** 23 tables (was 19), 30+ indexes, 15+ constraints
```

Add to **Phase 1.2 Database Initialization** (after line 482):
```markdown
### Authentication Tables (Better-Auth)

```sql
-- Session management
CREATE TABLE sessions (
    -- [full schema from DATABASE_SCHEMA.md]
);

-- Email verification
CREATE TABLE verification_tokens (
    -- [full schema from DATABASE_SCHEMA.md]
);
```
```

Add to **Phase 2 Content Tables** (after post_media):
```markdown
### Pending Uploads Table

```sql
-- Temporary upload tracking
CREATE TABLE pending_uploads (
    -- [full schema from DATABASE_SCHEMA.md]
);
```
```

**Effort:** 3-4 hours
**Assignee:** Documentation specialist
**Due:** 2025-10-19

---

### P1-2: Add Post.visibility Field to Documentation

**Issue:** Post.visibility field implemented but not documented
**Impact:** HIGH - Affects privacy feature behavior and API contracts
**Status:** ❌ NOT STARTED

**Files to Update:**

#### DATABASE_SCHEMA.md (Line 191)

Change:
```sql
-- Post metadata
type                post_type NOT NULL,
status              post_status NOT NULL DEFAULT 'published',
```

To:
```sql
-- Post metadata
type                post_type NOT NULL,
status              post_status NOT NULL DEFAULT 'published',
visibility          profile_visibility NOT NULL DEFAULT 'public',
    -- Values: 'public', 'followers', 'private' (reuses enum from user_profiles)
    -- 'public': Visible to everyone
    -- 'followers': Visible only to followers
    -- 'private': Visible only to post author
```

#### DATA_STORAGE_DOCUMENTATION.md

Add **Section 3.3: Post Visibility Rules** after Section 3.2:

```markdown
### 3.3 Post Visibility Rules

#### Visibility Levels

Posts inherit the `profile_visibility` enum from user profiles:

| Visibility | Who Can See | Feed Inclusion | Direct Link Access |
|------------|-------------|----------------|-------------------|
| `public` | Everyone | All feeds | Yes |
| `followers` | Author + Followers | Follower feeds only | Only if follower |
| `private` | Author only | Author's feed only | No |

#### Database Implementation

```sql
ALTER TABLE posts ADD COLUMN visibility profile_visibility NOT NULL DEFAULT 'public';

-- Query: Get user feed (respects visibility)
SELECT p.* FROM posts p
WHERE p.status = 'published'
  AND p.deleted_at IS NULL
  AND (
    p.visibility = 'public'
    OR (p.visibility = 'followers' AND EXISTS (
      SELECT 1 FROM user_follows uf WHERE uf.following_id = p.user_id AND uf.follower_id = $currentUserId
    ))
    OR (p.visibility = 'private' AND p.user_id = $currentUserId)
  );
```

#### API Behavior

- **post.create**: Accepts `visibility` parameter (defaults to 'public')
- **post.update**: Can change visibility (author only)
- **post.list**: Filters by visibility rules automatically
- **post.getById**: Returns 403 if user cannot view
```

**Effort:** 1 hour
**Assignee:** Backend developer
**Due:** 2025-10-19

---

### P1-3: Update Table Count References

**Issue:** Documentation claims 19 tables but implementation has 23
**Impact:** MEDIUM - Misleading for new developers
**Status:** ❌ NOT STARTED

**Files to Update:**
1. DATA_STORAGE_DOCUMENTATION.md (line 95)
2. DATABASE_IMPLEMENTATION_STRATEGY.md (line 15, line 2466)
3. DATABASE_SCHEMA.md (Executive Summary)

**Search & Replace:**
- Find: "19 tables"
- Replace: "23 tables"
- Context note: Add "(sessions, verification_tokens, pending_uploads added in implementation)"

**Effort:** 15 minutes
**Assignee:** Anyone
**Due:** 2025-10-18

---

### P1-4: Create Feed Algorithm Specification

**Issue:** Phase 6.1 Algorithm Builder has no technical architecture
**Impact:** HIGH - Complex feature needs design before implementation
**Status:** ❌ NOT STARTED

**Create:** docs/specs/001-vrss-social-platform/FEED_ALGORITHM_SPECIFICATION.md

**Content Outline:**
```markdown
# VRSS Feed Algorithm Builder - Technical Specification

## Overview
Visual drag-and-drop algorithm builder for custom feed curation.

## Data Model

### Algorithm Structure
```typescript
interface FeedAlgorithm {
  id: string;
  userId: bigint;
  name: string;
  description: string;
  version: number;
  blocks: Block[];
  connections: Connection[];
  metadata: AlgorithmMetadata;
}

interface Block {
  id: string;
  type: BlockType;
  position: { x: number; y: number };
  config: Record<string, unknown>;
  inputs: BlockPort[];
  outputs: BlockPort[];
}

type BlockType =
  | 'source'       // Data source (follows, list, search)
  | 'filter'       // Filter posts (type, author, date)
  | 'sort'         // Sort posts (time, engagement, random)
  | 'score'        // Score posts (engagement, recency)
  | 'merge'        // Merge multiple streams
  | 'dedupe'       // Remove duplicates
  | 'limit'        // Take first N posts
  | 'boost'        // Boost certain posts
  | 'exclude';     // Exclude certain posts

interface Connection {
  id: string;
  fromBlock: string;
  fromPort: string;
  toBlock: string;
  toPort: string;
}
```

## Execution Model

### Linear Pipeline
Blocks execute sequentially in topological order:
1. Source blocks fetch posts
2. Transform blocks modify stream
3. Merge blocks combine streams
4. Output is final post list

### Validation Rules
- Must have at least one source block
- Cannot have cycles (DAG enforcement)
- All inputs must be connected
- Maximum 20 blocks per algorithm

## Block Specifications

### Source Blocks

#### Following Source
```typescript
{
  type: 'source',
  subtype: 'following',
  config: {
    includeReposts: boolean,
    includeReplies: boolean,
    timeRange: 'day' | 'week' | 'month' | 'all'
  },
  outputs: [{ name: 'posts', type: 'PostStream' }]
}
```

### Filter Blocks

#### Post Type Filter
```typescript
{
  type: 'filter',
  subtype: 'post-type',
  config: {
    allowedTypes: PostType[],
    mode: 'include' | 'exclude'
  },
  inputs: [{ name: 'posts', type: 'PostStream' }],
  outputs: [{ name: 'filtered', type: 'PostStream' }]
}
```

[... continue for all block types ...]

## Serialization Format

Algorithms stored in `custom_feeds.algorithm_config` as JSONB:
```json
{
  "version": 1,
  "blocks": [
    {
      "id": "block-1",
      "type": "source",
      "subtype": "following",
      "position": { "x": 100, "y": 100 },
      "config": { "timeRange": "week" }
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "from": { "block": "block-1", "port": "posts" },
      "to": { "block": "block-2", "port": "input" }
    }
  ]
}
```

## Performance Requirements

- **Algorithm Validation:** <50ms
- **Algorithm Execution:** <500ms for 1000 posts
- **Preview Update:** <200ms (debounced)
- **Max Algorithm Complexity:** O(n) where n = total posts

## Frontend Components

### Canvas
- React Flow library for drag-and-drop
- Auto-layout using Dagre algorithm
- Real-time validation feedback

### Block Library
- Categorized block palette
- Search/filter blocks
- Drag to add

### Preview Panel
- Live feed preview
- Post count indicator
- Execution time display

## API Endpoints

```typescript
// Create algorithm
trpc.customFeed.create.mutate({
  name: 'My Algorithm',
  algorithmConfig: { /* ... */ }
});

// Validate algorithm
trpc.customFeed.validate.query({
  algorithmConfig: { /* ... */ }
});

// Preview algorithm
trpc.customFeed.preview.query({
  algorithmConfig: { /* ... */ },
  limit: 20
});
```

## Testing Strategy

- Unit tests for each block type
- Integration tests for complex algorithms
- Performance tests for large feeds (10k+ posts)
- Validation edge cases (cycles, disconnected blocks)
```

**Effort:** 1-2 days
**Assignee:** Frontend architect
**Due:** 2025-10-23

---

### P1-5: Document Database Indexes (All Tiers)

**Issue:** "Tier 2 indexes" referenced but never defined
**Impact:** HIGH - Performance optimization phase incomplete
**Status:** ❌ NOT STARTED

**Create:** docs/specs/001-vrss-social-platform/DATABASE_INDEXES.md

**Content:**
```markdown
# VRSS Database Indexes - Complete Specification

## Overview
Database indexes organized by implementation priority and performance impact.

## Tier 1: Critical Indexes (Phase 1.3)
These indexes are essential for core functionality. Created during initial setup.

### User & Auth Tables
```sql
-- users table
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

-- sessions table
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Content Tables
```sql
-- posts table
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_type_created ON posts(type, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_engagement_created ON posts(likes_count DESC, created_at DESC) WHERE deleted_at IS NULL;

-- post_media table
CREATE INDEX idx_post_media_post_order ON post_media(post_id, display_order);

-- comments table
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent ON comments(parent_comment_id, created_at DESC) WHERE deleted_at IS NULL;
```

### Social Tables
```sql
-- user_follows table
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id, created_at DESC);
CREATE INDEX idx_user_follows_following ON user_follows(following_id, created_at DESC);

-- post_interactions table
CREATE INDEX idx_post_interactions_post_type ON post_interactions(post_id, type, created_at DESC);
```

**Total Tier 1:** 14 indexes

## Tier 2: Optimization Indexes (Phase 7.1)
These indexes improve performance for common queries. Added after initial launch.

### Feed Queries
```sql
-- Optimized feed generation
CREATE INDEX idx_posts_visibility_published ON posts(visibility, published_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL;

-- Trending posts
CREATE INDEX idx_posts_trending ON posts(likes_count DESC, comments_count DESC, created_at DESC)
  WHERE status = 'published' AND deleted_at IS NULL AND created_at > NOW() - INTERVAL '7 days';
```

### Messaging
```sql
-- conversations table
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);

-- messages table
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_unread ON messages(conversation_id) WHERE read_by IS NULL;
```

### Notifications
```sql
-- notifications table
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications(type, user_id, created_at DESC);
```

### Profile & Customization
```sql
-- profile_sections table
CREATE INDEX idx_profile_sections_user_order ON profile_sections(user_id, display_order) WHERE is_visible = true;

-- custom_feeds table
CREATE INDEX idx_custom_feeds_user_active ON custom_feeds(user_id, display_order) WHERE is_default = false;
```

**Total Tier 2:** 10 indexes

## Tier 3: Scalability Indexes (Future)
These indexes support advanced features and high-scale performance. Added as needed.

### Full-Text Search
```sql
-- posts full-text search
CREATE INDEX idx_posts_fts ON posts USING gin(to_tsvector('english', content));

-- users search
CREATE INDEX idx_users_search ON users USING gin(to_tsvector('english', username || ' ' || COALESCE(email, '')));
```

### Analytics
```sql
-- Engagement analytics
CREATE INDEX idx_post_interactions_analytics ON post_interactions(post_id, type, created_at)
  WHERE created_at > NOW() - INTERVAL '30 days';

-- User growth analytics
CREATE INDEX idx_users_created ON users(created_at) WHERE status = 'active';
```

### Advanced Features
```sql
-- Geospatial (if location features added)
CREATE INDEX idx_user_profiles_location ON user_profiles USING gist(location);

-- Recommendation engine
CREATE INDEX idx_post_interactions_similar_users ON post_interactions(user_id, type, post_id);
```

**Total Tier 3:** 6 indexes

## Partial Index Strategy

### Soft Deletes
All tables with `deleted_at` use partial indexes:
```sql
WHERE deleted_at IS NULL
```

### Active Records Only
```sql
WHERE status = 'active'
WHERE status = 'published'
WHERE is_visible = true
```

### Time-Based Windows
```sql
WHERE created_at > NOW() - INTERVAL '7 days'  -- Recent content only
```

## Index Maintenance

### Monitoring
```sql
-- Find unused indexes
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexrelname NOT LIKE 'pg_%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Find missing indexes (slow queries)
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND correlation < 0.1
ORDER BY n_distinct DESC;
```

### Reindexing
```bash
# Weekly reindex for heavily updated tables
REINDEX TABLE CONCURRENTLY posts;
REINDEX TABLE CONCURRENTLY post_interactions;
REINDEX TABLE CONCURRENTLY user_follows;
```

## Prisma Limitations

Prisma schema cannot express:
- Partial indexes with WHERE clauses
- GIST/GIN indexes for full-text search
- Indexes on expressions (e.g., `to_tsvector`)

**Solution:** Add these manually in migration files after `prisma migrate dev`.

## Performance Targets

| Query Type | Target | Index Tier |
|------------|--------|------------|
| User feed | <100ms p95 | Tier 1 + 2 |
| Post detail | <50ms p95 | Tier 1 |
| Search | <200ms p95 | Tier 3 |
| Notifications | <50ms p95 | Tier 2 |
| Trending | <500ms p95 | Tier 2 |

## Implementation Checklist

- [x] Tier 1 indexes created (Phase 1.3)
- [ ] Tier 2 indexes created (Phase 7.1)
- [ ] Full-text search indexes (Phase 6.2)
- [ ] Index monitoring queries added
- [ ] Reindex cron job configured
```

**Effort:** 4-6 hours
**Assignee:** Database engineer
**Due:** 2025-10-21

---

## Priority 2: Medium-Impact Issues (Complete Next Sprint)

### P2-1: Specify Search Implementation Strategy

**Issue:** Backend search strategy undefined
**Impact:** MEDIUM - Needed before Phase 6.2
**Status:** ❌ NOT STARTED

Add to Phase 3.7.3 (Discovery Router) specification:

```markdown
## Search Implementation

### Technology: PostgreSQL Full-Text Search

#### Why PostgreSQL FTS?
- No external dependencies (Elasticsearch/Algolia)
- Good performance for MVP scale (<100k users)
- Trigram similarity for fuzzy matching
- Easy to maintain

#### Configuration

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Full-text search columns
ALTER TABLE posts ADD COLUMN search_vector tsvector;
ALTER TABLE users ADD COLUMN search_vector tsvector;

-- Triggers to update search vectors
CREATE TRIGGER posts_search_update
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION tsvector_update_trigger(search_vector, 'pg_catalog.english', title, content);

CREATE TRIGGER users_search_update
  BEFORE INSERT OR UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION tsvector_update_trigger(search_vector, 'pg_catalog.english', username, display_name);

-- Indexes
CREATE INDEX idx_posts_search ON posts USING gin(search_vector);
CREATE INDEX idx_users_search ON users USING gin(search_vector);
CREATE INDEX idx_posts_trigram ON posts USING gin(content gin_trgm_ops);
CREATE INDEX idx_users_trigram ON users USING gin(username gin_trgm_ops);
```

#### Search Ranking Algorithm

```sql
-- Search posts with ranking
SELECT
  p.id,
  p.title,
  p.content,
  ts_rank(p.search_vector, query) AS rank,
  similarity(p.content, $searchTerm) AS similarity
FROM posts p,
  to_tsquery('english', $searchTerm) query
WHERE p.search_vector @@ query
  OR p.content % $searchTerm  -- Trigram similarity
ORDER BY rank DESC, similarity DESC
LIMIT 20;
```

#### Performance Targets
- Search query: <200ms p95
- Index update: <10ms per document
- Fuzzy match threshold: 0.3 similarity

#### Limitations
- No typo correction (use trigrams for fuzzy)
- No synonym support (add later if needed)
- English language only initially
```

**Effort:** 3-4 hours documentation + 1 day implementation
**Assignee:** Backend developer
**Due:** Before Phase 6.2 starts

---

### P2-2: Document Offline Queue Retry Strategy

**Issue:** Exponential backoff mentioned but not specified
**Impact:** LOW - Implementation detail
**Status:** ❌ NOT STARTED

Add to Phase 6.3 (line 99):

```typescript
// Offline queue retry strategy
const RETRY_STRATEGY = {
  initialDelay: 1000,      // 1 second
  maxDelay: 30000,         // 30 seconds
  multiplier: 2,           // Double each time
  maxAttempts: 3,          // Give up after 3 tries
  jitter: 0.1              // ±10% randomization
};

function getRetryDelay(attempt: number): number {
  const delay = Math.min(
    RETRY_STRATEGY.initialDelay * Math.pow(RETRY_STRATEGY.multiplier, attempt),
    RETRY_STRATEGY.maxDelay
  );

  // Add jitter to prevent thundering herd
  const jitter = delay * RETRY_STRATEGY.jitter * (Math.random() - 0.5);
  return delay + jitter;
}

// Example usage
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  context: string
): Promise<T> {
  for (let attempt = 0; attempt < RETRY_STRATEGY.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === RETRY_STRATEGY.maxAttempts - 1) {
        // Last attempt failed, give up
        await offlineQueue.markFailed(context, error);
        throw error;
      }

      const delay = getRetryDelay(attempt);
      console.log(`Retry ${attempt + 1}/${RETRY_STRATEGY.maxAttempts} after ${delay}ms`);
      await sleep(delay);
    }
  }
}
```

**Effort:** 30 minutes
**Assignee:** Frontend developer
**Due:** 2025-10-22

---

### P2-3: Add Missing Shadcn-ui Components

**Issue:** Component list incomplete in Phase 4.1
**Impact:** LOW - Will discover during implementation
**Status:** ❌ NOT STARTED

Update Phase 4.1 (line 27) to include all components:

```bash
# Core components (already listed)
npx shadcn-ui@latest add button card input label dialog toast avatar badge

# Additional components needed
npx shadcn-ui@latest add select checkbox radio-group switch
npx shadcn-ui@latest add popover tooltip separator scroll-area
npx shadcn-ui@latest add sheet skeleton progress tabs
npx shadcn-ui@latest add dropdown-menu alert alert-dialog
npx shadcn-ui@latest add form textarea slider toggle
```

**Effort:** 15 minutes
**Assignee:** Frontend developer
**Due:** Before Phase 4.1 starts

---

### P2-4: Expand Security Testing Section

**Issue:** High-level checklist without specific test cases
**Impact:** MEDIUM - Needed for Phase 7.2
**Status:** ❌ NOT STARTED

Add to Phase 7.2 security testing section:

```markdown
## Security Test Cases

### SQL Injection Tests

Test all procedures with malicious inputs:

```typescript
// Test: SQL injection in search
await expect(
  trpc.discovery.search.query({
    query: "'; DROP TABLE users; --"
  })
).resolves.toMatchObject({ results: [] }); // Should not execute SQL

// Test: SQL injection in filters
await expect(
  trpc.post.list.query({
    where: {
      content: { contains: "' OR '1'='1" }
    }
  })
).resolves.not.toThrow(); // Should be parameterized

// Test: Second-order SQL injection
const maliciousUser = await trpc.user.update.mutate({
  username: "admin' --"
});
await expect(
  trpc.user.getByUsername.query({
    username: maliciousUser.username
  })
).resolves.toMatchObject({ id: maliciousUser.id });
```

### XSS Attack Vectors

Test user-generated content sanitization:

```typescript
// Test: Script injection in post content
const xssPost = await trpc.post.create.mutate({
  content: '<script>alert("XSS")</script>',
  type: 'text_short'
});
expect(xssPost.contentHtml).not.toContain('<script>');
expect(xssPost.contentHtml).toContain('&lt;script&gt;');

// Test: Event handler injection
const xssProfile = await trpc.user.updateProfile.mutate({
  bio: '<img src=x onerror=alert("XSS")>'
});
expect(xssProfile.bio).not.toMatch(/onerror=/i);

// Test: CSS injection in custom styles
const maliciousStyle = await trpc.user.updateProfile.mutate({
  styleConfig: {
    customCss: 'body { background: url("javascript:alert(1)") }'
  }
});
// Should sanitize javascript: URLs
expect(maliciousStyle.styleConfig.customCss).not.toContain('javascript:');
```

### CSRF Protection

Verify all state-changing operations require CSRF tokens:

```typescript
// Test: POST without CSRF token
const response = await fetch('/api/trpc/post.create', {
  method: 'POST',
  headers: { 'Cookie': validSessionCookie },
  body: JSON.stringify({ content: 'Test' })
  // Missing CSRF token
});
expect(response.status).toBe(403);

// Test: CSRF token from different session
const response2 = await fetch('/api/trpc/post.create', {
  method: 'POST',
  headers: {
    'Cookie': userASessionCookie,
    'X-CSRF-Token': userBCsrfToken // Wrong token
  },
  body: JSON.stringify({ content: 'Test' })
});
expect(response2.status).toBe(403);
```

### Rate Limiting

Test endpoints have appropriate rate limits:

```typescript
// Test: Login rate limiting (5 attempts per 15 minutes)
for (let i = 0; i < 5; i++) {
  await trpc.auth.login.mutate({
    email: 'test@example.com',
    password: 'wrong-password'
  }).catch(() => {}); // Expect failures
}

// 6th attempt should be rate limited
await expect(
  trpc.auth.login.mutate({
    email: 'test@example.com',
    password: 'any-password'
  })
).rejects.toThrow('Too many attempts');

// Test: Post creation rate limiting (10 posts per minute)
const promises = Array.from({ length: 11 }, () =>
  trpc.post.create.mutate({
    content: 'Spam post',
    type: 'text_short'
  })
);

const results = await Promise.allSettled(promises);
const rejections = results.filter(r => r.status === 'rejected');
expect(rejections.length).toBeGreaterThanOrEqual(1);
```

### Authentication Bypass Tests

```typescript
// Test: Access protected route without auth
await expect(
  trpc.post.create.mutate({ content: 'Test' })
).rejects.toThrow('Unauthorized');

// Test: Modify other user's content
const userAPost = await trpc.post.create.mutate({ content: 'A' });
loginAs(userB);
await expect(
  trpc.post.update.mutate({ id: userAPost.id, content: 'Hacked' })
).rejects.toThrow('Forbidden');

// Test: Expired session
const expiredSession = createExpiredSession();
await expect(
  trpc.user.getSession.query({ sessionToken: expiredSession })
).resolves.toBeNull();
```

### File Upload Security

```typescript
// Test: Upload malicious file types
await expect(
  trpc.media.initiateUpload.mutate({
    filename: 'virus.exe',
    contentType: 'application/x-msdownload',
    size: 1024
  })
).rejects.toThrow('Invalid file type');

// Test: Upload oversized files
await expect(
  trpc.media.initiateUpload.mutate({
    filename: 'huge.mp4',
    contentType: 'video/mp4',
    size: 1000 * 1024 * 1024 // 1GB (exceeds limit)
  })
).rejects.toThrow('File too large');

// Test: Path traversal in filename
await expect(
  trpc.media.initiateUpload.mutate({
    filename: '../../etc/passwd',
    contentType: 'image/jpeg',
    size: 1024
  })
).resolves.toMatchObject({
    s3Key: expect.not.stringContaining('..')
  });
```
```

**Effort:** 2-3 hours
**Assignee:** Security specialist
**Due:** Before Phase 7.2 starts

---

### P2-5: Create Deployment Architecture Document

**Issue:** Deployment guide scope undefined
**Impact:** MEDIUM - Needed for Phase 7.3
**Status:** ❌ NOT STARTED

**Create:** docs/DEPLOYMENT_ARCHITECTURE.md

**Content Outline:**
```markdown
# VRSS Deployment Architecture

## Overview
Production deployment strategy for VRSS social platform.

## Target Platform: Railway (Recommended for MVP)

### Why Railway?
- Simple PostgreSQL + Redis + S3-compatible storage
- Automatic HTTPS, zero-downtime deploys
- $5/month start ($20/month with database)
- Scales to 10k+ users
- Great DX (better than Heroku, simpler than AWS)

### Alternative Platforms
- **Fly.io**: More control, similar pricing
- **DigitalOcean App Platform**: Simpler, less flexible
- **AWS (ECS + RDS)**: More expensive, better scale (100k+ users)

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│ Railway Project: vrss-production               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌─────────────┐      ┌─────────────┐         │
│  │   Frontend  │─────▶│     API     │         │
│  │   (Static)  │      │  (Node.js)  │         │
│  │   Nginx     │      │   PORT=3000 │         │
│  └─────────────┘      └──────┬──────┘         │
│                               │                 │
│  ┌─────────────┐      ┌──────▼──────┐         │
│  │  PostgreSQL │◀─────│    Redis    │         │
│  │  (Managed)  │      │   (Cache)   │         │
│  └─────────────┘      └─────────────┘         │
│                                                 │
│  ┌─────────────────────────────────┐          │
│  │        MinIO / S3               │          │
│  │    (Media Storage)              │          │
│  └─────────────────────────────────┘          │
└─────────────────────────────────────────────────┘
```

## Environment Configuration

### Environments
1. **Development** (local)
2. **Staging** (Railway staging environment)
3. **Production** (Railway production environment)

### Environment Variables

#### Required for All Environments
```bash
# Database
DATABASE_URL=postgresql://...

# Auth
BETTER_AUTH_SECRET=<32+ character secret>
APP_URL=https://api.vrss.app
WEB_URL=https://vrss.app

# Email (SendGrid)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<key>
SENDGRID_FROM=noreply@vrss.app

# S3 Storage
S3_ENDPOINT=https://s3.us-east-1.amazonaws.com
S3_REGION=us-east-1
S3_BUCKET=vrss-media-prod
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
CDN_URL=https://cdn.vrss.app
```

#### Production-Specific
```bash
NODE_ENV=production
DEBUG=false

# Redis
REDIS_URL=redis://...

# Monitoring
SENTRY_DSN=<dsn>
```

## CI/CD Pipeline

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Railway

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install Railway CLI
        run: npm i -g @railway/cli

      - name: Deploy API
        run: railway up --service=api
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Deploy Frontend
        run: railway up --service=frontend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

      - name: Run Migrations
        run: railway run --service=api bunx prisma migrate deploy
```

### Pre-Deployment Checks
```bash
#!/bin/bash
# scripts/pre-deploy.sh

# Run tests
bun test

# Check types
bun run typecheck

# Build
bun run build

# Database migration dry-run
bunx prisma migrate diff --from-migrations --to-schema-datamodel

# Security audit
bun audit
```

## Database Migrations

### Zero-Downtime Strategy

1. **Backward-compatible migrations first**
   ```sql
   -- Good: Add nullable column
   ALTER TABLE users ADD COLUMN new_field TEXT;

   -- Bad: Add NOT NULL column (breaks old code)
   ALTER TABLE users ADD COLUMN new_field TEXT NOT NULL;
   ```

2. **Deploy code that works with both schemas**
3. **Run data migration**
4. **Deploy code that uses new schema**
5. **Remove old columns**

### Migration Checklist
- [ ] Test migration on staging database
- [ ] Estimate migration time (pg_stat_statements)
- [ ] Create rollback plan
- [ ] Schedule during low-traffic window
- [ ] Monitor error rates post-deployment

## Rollback Procedures

### Automatic Rollback (Railway)
Railway keeps last 10 deployments. Rollback via dashboard:
1. Go to Deployments tab
2. Find previous successful deployment
3. Click "Rollback to this deployment"

### Manual Rollback
```bash
# Rollback code
git revert <commit-hash>
git push

# Rollback database migration
bunx prisma migrate resolve --rolled-back <migration-name>

# Rollback S3 objects (if needed)
aws s3 sync s3://vrss-media-prod s3://vrss-media-rollback-<date>
```

## Monitoring & Alerts

### Health Checks
```typescript
// API health endpoint
app.get('/health', async (req, res) => {
  const checks = {
    database: await checkDatabaseConnection(),
    redis: await checkRedisConnection(),
    s3: await checkS3Access()
  };

  const healthy = Object.values(checks).every(c => c === true);
  res.status(healthy ? 200 : 503).json(checks);
});
```

### Uptime Monitoring
- **Uptime Robot**: Free, checks /health every 5 minutes
- **Better Uptime**: Paid, more features

### Error Tracking
- **Sentry**: Automatic error capture, performance monitoring
- **LogRocket**: Session replay for debugging

### Metrics
- **Railway Dashboard**: CPU, memory, network
- **Custom Metrics**: Post to Prometheus/Grafana

## Scaling Strategy

### Vertical Scaling (1-10k users)
- Increase Railway service resources
- $20/month → $50/month (4GB RAM, 2 vCPU)

### Horizontal Scaling (10k-100k users)
- Multiple API instances (Railway autoscaling)
- Redis for session storage (instead of PostgreSQL)
- Read replicas for database

### Migration to AWS (100k+ users)
- ECS Fargate for API (autoscaling)
- RDS PostgreSQL (Multi-AZ)
- ElastiCache Redis (cluster mode)
- CloudFront CDN
- S3 for media storage

## Security Checklist

- [ ] HTTPS enforced (Railway automatic)
- [ ] Environment variables in Railway secrets (not .env)
- [ ] Database backups enabled (Railway automatic)
- [ ] Rate limiting enabled (API level)
- [ ] CORS configured correctly
- [ ] CSP headers set
- [ ] Secrets rotated regularly
- [ ] Dependency updates automated (Dependabot)

## Cost Estimation

### MVP (0-1k users)
- Railway Hobby Plan: $5/month
- Railway PostgreSQL: $15/month
- SendGrid Free: 100 emails/day
- AWS S3: $1-5/month (1GB storage)
- **Total: ~$25/month**

### Growth (1k-10k users)
- Railway Pro Plan: $20/month
- Railway PostgreSQL: $30/month
- SendGrid Essentials: $15/month
- AWS S3: $10-20/month
- Redis: $10/month
- **Total: ~$85/month**

### Scale (10k-100k users)
- Railway Scale: $100/month
- Railway PostgreSQL: $100/month
- SendGrid Pro: $90/month
- AWS S3 + CloudFront: $50/month
- Redis Cluster: $50/month
- **Total: ~$390/month**

## Disaster Recovery

### Backup Strategy
- **Database**: Railway automatic daily backups (7-day retention)
- **S3 Media**: Versioning enabled, lifecycle policy to Glacier after 90 days
- **Code**: Git repository (GitHub)

### Recovery Procedures
```bash
# Restore database from backup
railway backup restore <backup-id>

# Restore S3 objects
aws s3 sync s3://vrss-media-backup/<date> s3://vrss-media-prod

# Restore code from Git tag
git checkout v1.0.0
railway up
```

### RPO/RTO Targets
- **Recovery Point Objective (RPO)**: 24 hours (daily backups)
- **Recovery Time Objective (RTO)**: 1 hour (restore time)
```

**Effort:** 4-6 hours
**Assignee:** DevOps engineer
**Due:** Before Phase 7.3 starts

---

## Priority 3: Housekeeping (Anytime)

### P3-1: Fix Documentation Reference Errors

**Issue:** Phase 4.1 references .tribes file that doesn't exist
**Impact:** LOW - Confusing but doesn't block
**Status:** ❌ NOT STARTED

**Action:** Change line 9 in phase-4-frontend-foundation... from:
```markdown
- [ ] Read `docs/frontend-implementation-guide.tribes`
```

To:
```markdown
- [ ] Read `docs/frontend-architecture.md`
```

**Effort:** 5 minutes
**Assignee:** Anyone
**Due:** 2025-10-18

---

### P3-2: Update Master Plan Checkboxes

**Issue:** Master plan shows Phase 3.4, 3.5 as incomplete but they are done
**Impact:** LOW - Status tracking only
**Status:** ❌ NOT STARTED

**File:** docs/specs/001-vrss-social-platform/PLAN/implementation-phases.md

**Actions:**
1. Change `[ ]` to `[x]` for Phase 3.3 Post Router
2. Change `[ ]` to `[x]` for Phase 3.4 Social Router
3. Change `[ ]` to `[x]` for Phase 3.5 Feed Router
4. Update completion percentage at top of file

**Effort:** 5 minutes
**Assignee:** Anyone
**Due:** 2025-10-18

---

### P3-3: Add Password Reset Flow

**Issue:** Auth implementation missing password reset
**Impact:** LOW - Can add later
**Status:** ❌ NOT STARTED

Add to Phase 2.2:

```markdown
### Password Reset Flow

#### Procedures

1. **auth.requestPasswordReset**
   - Input: `{ email: string }`
   - Creates password reset token (1-hour expiry)
   - Sends email with reset link
   - Returns: `{ success: boolean }`

2. **auth.resetPassword**
   - Input: `{ token: string, newPassword: string }`
   - Validates token (not expired, not used)
   - Updates password hash
   - Invalidates all sessions
   - Returns: `{ success: boolean }`

#### Database Changes

```sql
-- Add to verification_tokens table
ALTER TABLE verification_tokens ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'email_verification';
-- Types: 'email_verification', 'password_reset'

-- Reuse existing table for password reset tokens
```

#### Tests
- [ ] Request reset with valid email
- [ ] Request reset with invalid email (don't leak existence)
- [ ] Reset with valid token
- [ ] Reset with expired token (fails)
- [ ] Reset with already-used token (fails)
- [ ] All sessions invalidated after reset
```

**Effort:** 2-3 hours documentation + 1 day implementation
**Assignee:** Backend developer
**Due:** After MVP launch (Phase 2.3 or Phase 7)

---

## Implementation Timeline

### Week 1 (Oct 18-22, 2025)
- [x] CB-1: Database triggers (COMPLETED)
- [x] CB-2: Environment variables (COMPLETED)
- [ ] CB-3: Phase 3.7 router specs (2-3 days)
- [ ] P1-1: Document undocumented tables (3-4 hours)
- [ ] P1-2: Add Post.visibility docs (1 hour)
- [ ] P1-3: Update table count (15 min)
- [ ] P3-1: Fix doc references (5 min)
- [ ] P3-2: Update checkboxes (5 min)

### Week 2 (Oct 23-29, 2025)
- [ ] P1-4: Feed algorithm specification (1-2 days)
- [ ] P1-5: Database indexes documentation (4-6 hours)
- [ ] P2-1: Search implementation strategy (3-4 hours)
- [ ] P2-2: Offline retry strategy (30 min)
- [ ] P2-3: Shadcn-ui components (15 min)

### Week 3 (Oct 30-Nov 5, 2025)
- [ ] P2-4: Security testing details (2-3 hours)
- [ ] P2-5: Deployment architecture (4-6 hours)
- [ ] P3-3: Password reset (if time permits)

**Total Effort:** 14.5-21.5 days across 3 weeks (with parallel work)

---

## Success Criteria

### Documentation Completeness
- [ ] All 23 tables documented in DATABASE_SCHEMA.md
- [ ] Table count references updated (19 → 23)
- [ ] All implemented features have corresponding documentation
- [ ] No references to missing files
- [ ] All phases have sufficient context for implementation

### Implementation Alignment
- [ ] Database triggers working and tested
- [ ] Environment variables standardized
- [ ] Phase 3.7 routers fully specified
- [ ] Search strategy documented
- [ ] Deployment guide complete

### Developer Experience
- [ ] New developers can implement Phase 4-7 without questions
- [ ] All technical decisions documented with rationale
- [ ] Cross-references between docs are accurate
- [ ] Examples provided for complex features

---

## Tracking & Reporting

### Weekly Progress Reports

Generate weekly summaries:
```bash
# Count completed tasks
grep -c "\[x\]" documentation-alignment-plan.md

# List remaining blockers
grep "BLOCKER" documentation-alignment-plan.md | grep "\[ \]"

# Next week priorities
head -20 <next-section>
```

### GitHub Issues

Create issues for each Priority 0-1 item:
- Tag: `documentation`, `priority:P0`/`priority:P1`
- Assignee: Specified in plan
- Due date: Specified in plan
- Link: This plan document

---

## Appendix: Analysis Reports

### A. Data Model Consistency Report
See: Agent output from codebase-analyzer (data model consistency)

### B. Implementation Phases Report
See: Agent output from codebase-analyzer (implementation phases context)

---

**Plan Author:** Engineering Team Lead
**Review Required:** Product Manager, Backend Architect, Frontend Architect
**Next Review:** 2025-10-21 (after CB-3 completion)
