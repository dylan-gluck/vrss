# Database Documentation

**VRSS Social Platform - Database Architecture Reference**

This document provides comprehensive documentation for the VRSS database architecture, including Prisma configuration, migration strategy, indexing, PostgreSQL-specific features, and database triggers.

---

## Table of Contents

1. [Overview](#overview)
2. [Prisma Schema Configuration](#prisma-schema-configuration)
3. [Migration Strategy](#migration-strategy)
4. [Migration History](#migration-history)
5. [Indexing Strategy](#indexing-strategy)
6. [Cascade Delete Patterns](#cascade-delete-patterns)
7. [Soft Delete Approach](#soft-delete-approach)
8. [JSONB Usage](#jsonb-usage)
9. [PostgreSQL-Specific Features](#postgresql-specific-features)
10. [Database Triggers](#database-triggers)
11. [Storage Quota System](#storage-quota-system)
12. [BigInt ID Approach](#bigint-id-approach)

---

## Overview

**Database Technology:** PostgreSQL 16

**ORM:** Prisma Client (TypeScript)

**Key Features:**
- 28 Prisma models across 4 implementation phases
- BigInt IDs with auto-increment (converted to strings in API)
- 37 strategically placed indexes for query optimization
- 3 database triggers for automatic data management
- JSONB fields for flexible configuration storage
- Soft delete with `deletedAt` timestamps
- Cascade delete patterns for referential integrity
- Better-auth integration (Account, Session, VerificationToken tables)

**Schema Location:** `apps/api/prisma/schema.prisma`

**Migrations Location:** `apps/api/prisma/migrations/`

---

## Prisma Schema Configuration

### Generator Configuration

```prisma
generator client {
  provider = "prisma-client-js"
}
```

**Purpose:** Generates TypeScript Prisma Client

**Output Location:** `node_modules/.prisma/client/`

**Generated Files:**
- Type definitions for all models
- Query builders for CRUD operations
- Transaction API
- Raw query support

**Regeneration:** Automatic on `prisma generate` or `prisma migrate dev`

### Datasource Configuration

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**Provider:** PostgreSQL (requires version 12+, using 16)

**Connection URL:** Loaded from environment variable `DATABASE_URL`

**Format:** `postgresql://user:password@host:port/database`

**Example (Development):**
```
DATABASE_URL="postgresql://vrss:password@localhost:5432/vrss_dev"
```

**Example (Production):**
```
DATABASE_URL="postgresql://vrss:password@db.production.com:5432/vrss_prod"
```

**Connection Pooling:**
- Prisma uses built-in connection pooling
- Default pool size: Based on database server configuration
- Can be configured via `?connection_limit=N` in DATABASE_URL

---

## Migration Strategy

### Development Workflow

**1. Create Migration:**
```bash
npx prisma migrate dev --name <migration_name>
```

**What happens:**
- Prompts for migration name
- Generates SQL migration file in `prisma/migrations/`
- Applies migration to development database
- Regenerates Prisma Client

**2. Apply Migration:**
```bash
npx prisma migrate deploy
```

**What happens:**
- Applies pending migrations to database
- Does NOT regenerate Prisma Client
- Used in production environments

**3. Reset Database:**
```bash
npx prisma migrate reset
```

**What happens:**
- Drops all tables
- Re-applies all migrations from scratch
- Runs seed script (if configured)
- Use with caution (data loss!)

### Migration Files

**Location:** `apps/api/prisma/migrations/`

**Structure:**
```
migrations/
├── 20251016132241_phase_1_foundation_tables/
│   └── migration.sql
├── 20251016133000_phase_2_content_social/
│   └── migration.sql
├── 20251016155612_better_auth_setup/
│   └── migration.sql
└── ... (more migrations)
```

**Naming Convention:**
- Timestamp: `YYYYMMDDHHMMSS` (sortable, unique)
- Description: Snake_case description of changes
- Example: `20251016132241_phase_1_foundation_tables`

**migration.sql Format:**
- Standard PostgreSQL SQL
- DDL statements (CREATE TABLE, ALTER TABLE, etc.)
- Trigger/function definitions
- Index creation

**Migration Lock:**
- Prisma maintains `_prisma_migrations` table
- Tracks applied migrations (checksum, timestamp)
- Prevents duplicate application

### Best Practices

**1. Never Edit Applied Migrations:**
- Once deployed, migration files are immutable
- Create new migration to fix issues
- Use `prisma migrate resolve` for migration conflicts

**2. Test Migrations Locally:**
- Always run `prisma migrate dev` locally first
- Verify migration applies cleanly
- Check generated Prisma Client types

**3. Backward Compatibility:**
- Make schema changes non-breaking when possible
- Use nullable fields for new columns
- Add default values for new required fields

**4. Review Generated SQL:**
- Always inspect `migration.sql` before deploying
- Ensure indexes are created
- Verify CASCADE behavior

---

## Migration History

### Timeline of Major Migrations

**Phase 1: Foundation (October 16, 2025)**

**Migration 1:** `20251016132241_phase_1_foundation_tables`
- Created: User, UserProfile, StorageUsage, SubscriptionTier
- Established: Basic user account infrastructure
- Indexes: email, status, visibility

**Phase 2: Content & Social (October 16-17, 2025)**

**Migration 2:** `20251016133000_phase_2_content_social`
- Created: Post, PostMedia, UserFollow, Friendship, PostInteraction, Comment, Repost
- Established: Content creation and social relationships
- Indexes: Post engagement, follow relationships, comment threads

**Migration 3:** `20251016155612_better_auth_setup`
- Created: Account, Session, VerificationToken (better-auth tables)
- Established: Better-auth integration
- Note: Initial better-auth schema without username plugin

**Migration 4:** `20251016193641_add_post_visibility`
- Added: Post.visibility field (ProfileVisibility enum)
- Established: Post-level visibility controls

**Migration 5:** `20251016194500_add_friendship_trigger`
- Created: `create_friendship_on_mutual_follow()` function
- Created: `trigger_create_friendship` trigger on user_follows
- Established: Automatic friendship creation on mutual follow

**Migration 6:** `20251017000000_add_post_interaction_triggers`
- Created: 4 functions for like/comment counter updates
- Created: 4 triggers on post_interactions and comments
- Established: Automatic post engagement counter updates

**Migration 7:** `20251017000001_add_storage_triggers`
- Created: 2 functions for storage usage tracking
- Created: 2 triggers on post_media
- Established: Automatic storage quota tracking

**Migration 8:** `20251019000000_add_pending_uploads_table`
- Created: PendingUpload table
- Established: Two-phase media upload workflow

**Phase 4: Better-auth Username Plugin (October 21, 2025)**

**Migration 9:** `20251021043829_add_username_plugin_fields`
- Added: User.name, User.displayUsername fields
- Established: Better-auth username plugin compatibility

**Migration 10:** `20251021044029_make_passwordhash_optional`
- Changed: User.passwordHash to optional (nullable)
- Reason: Better-auth stores passwords in Account.password

**Migration 11:** `20251021050404_add_better_auth_account_table`
- Modified: Account table schema for better-auth
- Added: Account.password field (hashed password storage)
- Established: Better-auth password storage (moved from User.passwordHash)

### Better-auth Integration Evolution

**Before Better-auth:**
- User.passwordHash stored hashed passwords
- Custom session management
- Manual email verification

**After Better-auth Migration:**
- Account.password stores hashed passwords
- Better-auth session management (Session table)
- Better-auth email verification (VerificationToken table)
- User.passwordHash made optional (legacy field)

**Current State:**
- New registrations: Password in Account.password
- Legacy users: Could have passwordHash in User.passwordHash
- Migration path: Eventual removal of User.passwordHash

---

## Indexing Strategy

### Overview

**Total Indexes:** 37 indexes across 28 models

**Purpose:** Optimize common query patterns identified during API design

**Types:**
1. **Unique Indexes** - Enforce uniqueness constraints
2. **Single-Column Indexes** - Fast lookups on single field
3. **Composite Indexes** - Optimize multi-field queries
4. **Sorted Indexes** - Speed up ORDER BY operations

### Index Categories

**1. Primary Keys (Auto-indexed)**
- All `@id` fields automatically get unique index
- BigInt IDs with auto-increment
- Example: `User.id`, `Post.id`, `Comment.id`

**2. Unique Constraints**
- Username uniqueness (case-insensitive)
- Email uniqueness
- Session token uniqueness
- Composite uniqueness (follow relationships, interactions)

**3. Foreign Key Indexes**
- Optimize JOIN operations
- Example: `Post.userId`, `Comment.postId`, `Message.conversationId`

**4. Query Optimization Indexes**
- Support common WHERE clauses
- Support ORDER BY operations
- Example: Post engagement sorting, comment threading

### Index Details by Model

**User Indexes:**
```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
```
**Purpose:** Fast lookup by email (login), filter by status (active users)

**UserProfile Indexes:**
```sql
CREATE INDEX idx_user_profiles_visibility ON user_profiles(visibility);
```
**Purpose:** Filter profiles by visibility (public/followers/private)

**Session Indexes:**
```sql
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```
**Purpose:** Fast session lookup, expiry cleanup queries

**Post Indexes:**
```sql
CREATE INDEX idx_posts_user_created ON posts(user_id, created_at DESC, status);
CREATE INDEX idx_posts_type_created ON posts(type, created_at DESC);
CREATE INDEX idx_posts_engagement_created ON posts(likes_count DESC, created_at DESC);
```
**Purpose:**
- User's posts sorted by recency
- Posts by type (text, image, video)
- Feed sorting by engagement (popular posts)

**UserFollow Indexes:**
```sql
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id, created_at DESC);
CREATE INDEX idx_user_follows_following ON user_follows(following_id, created_at DESC);
```
**Purpose:** Fast lookup of followers and following lists

**Comment Indexes:**
```sql
CREATE INDEX idx_comments_post_created ON comments(post_id, created_at DESC);
CREATE INDEX idx_comments_parent ON comments(parent_comment_id, created_at DESC);
```
**Purpose:** Post comments sorted by recency, nested reply threads

**Message Indexes:**
```sql
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
```
**Purpose:** Conversation messages sorted by recency

**Notification Indexes:**
```sql
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read);
```
**Purpose:** User notifications sorted by recency, unread notification counts

### Index Maintenance

**Automatic Maintenance:**
- PostgreSQL automatically maintains indexes
- B-tree indexes updated on INSERT/UPDATE/DELETE
- No manual maintenance required for most cases

**Monitoring:**
- Check index usage with `pg_stat_user_indexes`
- Identify unused indexes for removal
- Monitor index bloat with `pgstattuple`

**Future Optimization:**
- Consider partial indexes for soft-deleted records
- Consider covering indexes for frequently accessed columns
- Consider BRIN indexes for large time-series data (posts, messages)

---

## Cascade Delete Patterns

### CASCADE on Foreign Keys

**Purpose:** Automatically delete child records when parent deleted

**Pattern:**
```prisma
model Post {
  id: BigInt @id
  userId: BigInt
  user: User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**SQL Generated:**
```sql
ALTER TABLE posts
ADD CONSTRAINT posts_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE;
```

### Cascade Delete Relationships

**User Deleted → CASCADE Deletes:**
- UserProfile (profile data)
- StorageUsage (storage tracking)
- Account[] (better-auth accounts)
- Session[] (active sessions)
- Post[] (all user posts)
- PostMedia[] (all uploaded media)
- UserFollow[] (as follower and following)
- Friendship[] (as user1 and user2)
- PostInteraction[] (likes, bookmarks, shares)
- Comment[] (all comments)
- Repost[] (all reposts)
- ProfileSection[] (profile customization)
- CustomFeed[] (custom feeds)
- UserList[] (user lists)
- ListMember[] (list memberships)
- Message[] (sent messages)
- Notification[] (notifications received and triggered)
- UserSubscription[] (subscription records)

**Post Deleted → CASCADE Deletes:**
- PostMedia[] (attached media files)
- PostInteraction[] (likes, bookmarks, shares)
- Comment[] (all comments on post)
- Repost[] (all reposts of post)

**Comment Deleted → CASCADE Deletes:**
- Comment[] (nested replies, recursive)

**ProfileSection Deleted → CASCADE Deletes:**
- SectionContent[] (section content items)

**CustomFeed Deleted → CASCADE Deletes:**
- FeedFilter[] (feed filters)

**UserList Deleted → CASCADE Deletes:**
- ListMember[] (list memberships)

**Conversation Deleted → CASCADE Deletes:**
- Message[] (all messages in conversation)

### Benefits of CASCADE

**1. Data Integrity:**
- No orphaned records
- Referential integrity maintained automatically
- Database enforces consistency

**2. Simplified Application Logic:**
- No manual cleanup required
- Single DELETE statement removes parent + children
- Reduces application code complexity

**3. Performance:**
- Database-level optimization
- Single transaction for parent + children
- More efficient than application-level cascading

### Caveats

**1. Cannot Be Undone:**
- CASCADE deletes are immediate
- No recovery unless using soft delete
- Use soft delete for user-facing delete operations

**2. Trigger Execution:**
- DELETE triggers fire for each cascaded row
- Can impact performance for large cascades
- Monitor trigger execution time

**3. Audit Trail:**
- Hard deletes leave no audit trail
- Consider soft delete for important data
- Log deletions in application layer if needed

---

## Soft Delete Approach

### Models with Soft Delete

**User:**
- Field: `deletedAt: DateTime?`
- Status: `status: UserStatus` (set to "deleted")
- Behavior: Account soft-deleted, username reserved, data preserved

**Post:**
- Field: `deletedAt: DateTime?`
- Behavior: Post hidden from feeds, data preserved for 30 days

**Comment:**
- Field: `deletedAt: DateTime?`
- Behavior: Comment hidden, preserves thread structure

**Message:**
- Field: `deletedAt: DateTime?`
- Behavior: Message soft-deleted, conversation list updated

### Why Soft Delete?

**1. Data Recovery:**
- Users can recover deleted posts within 30 days
- Admins can restore accidentally deleted accounts
- Grace period for important content

**2. Referential Integrity:**
- Comments on deleted posts still reference valid post
- Replies to deleted comments maintain thread structure
- No broken foreign keys

**3. Audit Trail:**
- Track when content was deleted
- Identify patterns of content deletion
- Moderation and abuse detection

**4. Analytics:**
- Count deleted vs active content
- User churn analysis
- Content lifecycle metrics

### Soft Delete Queries

**Filter Out Deleted Records:**
```typescript
// Example: Get active posts
const posts = await prisma.post.findMany({
  where: {
    deletedAt: null,  // Only non-deleted posts
    status: "published"
  }
})
```

**Include Deleted Records (Admin):**
```typescript
// Example: Get all posts including deleted
const posts = await prisma.post.findMany({
  where: {
    status: "published"
    // No deletedAt filter - includes deleted
  }
})
```

**Permanent Delete (Cleanup Job):**
```typescript
// Example: Permanently delete posts older than 30 days
await prisma.post.deleteMany({
  where: {
    deletedAt: {
      lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)  // 30 days ago
    }
  }
})
```

### Soft Delete Best Practices

**1. Always Filter deletedAt:**
- Include `deletedAt: null` in WHERE clauses
- Create helper functions for common queries
- Use Prisma middleware to auto-filter deleted records

**2. Set Timestamps Consistently:**
- Use `new Date()` for deletedAt
- Update `updatedAt` when soft-deleting
- Consider timezone handling (use UTC)

**3. Clean Up Periodically:**
- Schedule cleanup job (e.g., nightly cron)
- Permanently delete records older than retention period
- Log cleanup actions for audit

**4. User Communication:**
- Inform users of recovery period
- Provide undelete functionality in UI
- Warn before permanent deletion

---

## JSONB Usage

### What is JSONB?

**JSONB:** Binary JSON storage in PostgreSQL

**Benefits:**
- Flexible schema (no migrations for config changes)
- Efficient storage (binary format)
- Indexable (GIN indexes on JSONB)
- Queryable (JSON operators: `->`, `->>`, `@>`, `?`)

**Drawbacks:**
- Less type safety at database level
- Requires application-level validation
- Query syntax more complex than columns

### JSONB Fields in VRSS

**UserProfile:**
```prisma
backgroundConfig: Json @default("{}") @db.JsonB
musicConfig: Json? @db.JsonB
styleConfig: Json @default("{}") @db.JsonB
layoutConfig: Json @default("{\"sections\": []}") @db.JsonB
```

**Purpose:**
- `backgroundConfig`: Background images, colors, gradients, patterns
- `musicConfig`: Profile music player settings (URL, autoplay, volume)
- `styleConfig`: Fonts, colors, themes, custom CSS, privacy settings
- `layoutConfig`: Section layout, ordering, visibility

**Example Data:**
```json
{
  "backgroundConfig": {
    "type": "gradient",
    "colors": ["#667eea", "#764ba2"],
    "direction": "to right"
  },
  "musicConfig": {
    "url": "https://example.com/song.mp3",
    "autoplay": false,
    "volume": 0.7
  },
  "styleConfig": {
    "theme": "dark",
    "primaryColor": "#667eea",
    "font": "Inter",
    "privacy": {
      "allowMessagesFrom": "followers",
      "showFollowers": true
    }
  },
  "layoutConfig": {
    "sections": [
      { "id": "1", "type": "feed", "order": 0, "visible": true },
      { "id": "2", "type": "gallery", "order": 1, "visible": true }
    ]
  }
}
```

**CustomFeed:**
```prisma
algorithmConfig: Json @db.JsonB
```

**Purpose:** Feed algorithm configuration (sorting, filters, weights)

**Example Data:**
```json
{
  "algorithmConfig": {
    "logic": "AND",
    "sort": "recent",
    "filters": [
      { "type": "post_type", "operator": "equals", "value": "image" },
      { "type": "engagement", "operator": "greater_than", "value": 10 }
    ]
  }
}
```

**Post:**
```prisma
mediaUrls: Json? @db.JsonB
```

**Purpose:** Array of media IDs attached to post

**Example Data:**
```json
{
  "mediaUrls": ["1234567890", "2345678901", "3456789012"]
}
```

**FeedFilter:**
```prisma
value: Json @db.JsonB
```

**Purpose:** Filter value (can be string, number, array, object)

**Example Data:**
```json
// String value
{ "value": "image" }

// Number value
{ "value": 10 }

// Array value
{ "value": ["alice", "bob", "charlie"] }

// Object value
{ "value": { "min": 10, "max": 100 } }
```

### JSONB Query Examples

**Query Nested JSON (PostgreSQL):**
```sql
-- Get users with dark theme
SELECT * FROM user_profiles
WHERE style_config->>'theme' = 'dark';

-- Get users with specific privacy setting
SELECT * FROM user_profiles
WHERE style_config->'privacy'->>'allowMessagesFrom' = 'followers';

-- Get posts with specific media ID
SELECT * FROM posts
WHERE media_urls @> '["1234567890"]'::jsonb;
```

**Query Nested JSON (Prisma):**
```typescript
// Get users with dark theme
const users = await prisma.userProfile.findMany({
  where: {
    styleConfig: {
      path: ['theme'],
      equals: 'dark'
    }
  }
})

// Raw query for complex JSON operations
const users = await prisma.$queryRaw`
  SELECT * FROM user_profiles
  WHERE style_config->>'theme' = 'dark'
`
```

### JSONB Best Practices

**1. Define TypeScript Interfaces:**
```typescript
interface StyleConfig {
  theme: "light" | "dark"
  primaryColor: string
  font: string
  privacy: {
    allowMessagesFrom: "everyone" | "followers" | "friends" | "nobody"
    showFollowers: boolean
  }
}
```

**2. Validate JSONB Data:**
```typescript
import { z } from "zod"

const styleConfigSchema = z.object({
  theme: z.enum(["light", "dark"]),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  font: z.string(),
  privacy: z.object({
    allowMessagesFrom: z.enum(["everyone", "followers", "friends", "nobody"]),
    showFollowers: z.boolean()
  })
})
```

**3. Set Sensible Defaults:**
```prisma
styleConfig: Json @default("{}") @db.JsonB
```

**4. Merge Updates (Don't Replace):**
```typescript
// BAD: Replaces entire object
await prisma.userProfile.update({
  where: { userId },
  data: { styleConfig: newConfig }
})

// GOOD: Merges with existing config
const existing = await prisma.userProfile.findUnique({ where: { userId } })
const merged = { ...existing.styleConfig, ...newConfig }
await prisma.userProfile.update({
  where: { userId },
  data: { styleConfig: merged }
})
```

---

## PostgreSQL-Specific Features

### Arrays

**Usage:** Store arrays of BigInt for participant lists and read receipts

**Conversation.participantIds:**
```prisma
participantIds: BigInt[] @map("participant_ids")
```

**SQL Type:** `BIGINT[]`

**Example Data:** `{123, 456}` (ordered: lower ID first)

**Query Examples:**
```sql
-- Find conversations with user 123
SELECT * FROM conversations
WHERE 123 = ANY(participant_ids);

-- Find conversation between users 123 and 456
SELECT * FROM conversations
WHERE participant_ids = ARRAY[123, 456];
```

**Message.readBy:**
```prisma
readBy: BigInt[] @default([]) @map("read_by")
```

**SQL Type:** `BIGINT[]`

**Example Data:** `{123, 456, 789}` (user IDs who read message)

**Query Examples:**
```sql
-- Find unread messages for user 123
SELECT * FROM messages
WHERE NOT (123 = ANY(read_by));

-- Add user 123 to readBy
UPDATE messages
SET read_by = array_append(read_by, 123)
WHERE id = 456;
```

### Timestamps with Timezone

**All Timestamp Fields:**
```prisma
createdAt: DateTime @default(now()) @db.Timestamptz(6)
updatedAt: DateTime @updatedAt @db.Timestamptz(6)
```

**SQL Type:** `TIMESTAMP(6) WITH TIME ZONE`

**Benefits:**
- Stores UTC timestamp
- Automatically converts to client timezone on retrieval
- Consistent across geographic regions
- 6 decimal places (microsecond precision)

**Example:**
```sql
-- Store timestamp
INSERT INTO posts (created_at) VALUES (NOW());

-- Convert to specific timezone on retrieval
SELECT created_at AT TIME ZONE 'America/New_York' FROM posts;
```

### Case-Insensitive Uniqueness

**Username Uniqueness:**
```prisma
username: String @unique @db.VarChar(30)
```

**Prisma Query:**
```typescript
const user = await prisma.user.findFirst({
  where: {
    username: {
      equals: "alice",
      mode: "insensitive"  // Case-insensitive comparison
    }
  }
})
```

**SQL Generated:**
```sql
SELECT * FROM users
WHERE LOWER(username) = LOWER('alice');
```

**Index Created:**
```sql
CREATE UNIQUE INDEX users_username_key ON users (username);
```

**Note:** PostgreSQL's unique index uses binary comparison, so application must handle case-insensitivity in queries.

### Text Search (Future Feature)

**Capability:** Full-text search with PostgreSQL's `tsvector` and `tsquery`

**Potential Usage:**
- Search post content
- Search user bios
- Search comments

**Example Implementation:**
```sql
-- Add tsvector column
ALTER TABLE posts
ADD COLUMN content_search tsvector;

-- Populate tsvector
UPDATE posts
SET content_search = to_tsvector('english', content);

-- Create GIN index
CREATE INDEX idx_posts_content_search
ON posts USING GIN(content_search);

-- Search query
SELECT * FROM posts
WHERE content_search @@ to_tsquery('english', 'social & media');
```

---

## Database Triggers

### Trigger 1: Friendship Creation

**File:** `apps/api/prisma/migrations/20251016194500_add_friendship_trigger/migration.sql`

**Function:** `create_friendship_on_mutual_follow()`

**Trigger:** `trigger_create_friendship` on `user_follows` AFTER INSERT

**Purpose:** Automatically create Friendship record when mutual follow detected

**Logic:**
```sql
CREATE OR REPLACE FUNCTION create_friendship_on_mutual_follow()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if reverse follow exists (mutual follow)
    IF EXISTS (
        SELECT 1 FROM user_follows
        WHERE follower_id = NEW.following_id
        AND following_id = NEW.follower_id
    ) THEN
        -- Insert friendship with ordered user IDs (lower ID first)
        INSERT INTO friendships (user_id_1, user_id_2)
        VALUES (
            LEAST(NEW.follower_id, NEW.following_id),
            GREATEST(NEW.follower_id, NEW.following_id)
        )
        ON CONFLICT (user_id_1, user_id_2) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Execution:**
1. User A follows User B → INSERT into user_follows
2. Trigger fires, checks if User B follows User A
3. If yes (mutual), INSERT into friendships
4. Uses LEAST/GREATEST to ensure userId1 < userId2
5. ON CONFLICT DO NOTHING makes it idempotent

**Example:**
```
User 5 follows User 10:
  → user_follows (follower_id=5, following_id=10) inserted
  → Trigger checks if (follower_id=10, following_id=5) exists
  → Not found, no friendship created

User 10 follows User 5:
  → user_follows (follower_id=10, following_id=5) inserted
  → Trigger checks if (follower_id=5, following_id=10) exists
  → Found! Friendship created (user_id_1=5, user_id_2=10)
```

**Benefits:**
- Eliminates need for application logic
- Atomic friendship creation
- No race conditions

### Trigger 2: Post Interaction Counters

**File:** `apps/api/prisma/migrations/20251017000000_add_post_interaction_triggers/migration.sql`

**Functions:**
1. `increment_post_likes_count()` - +1 to Post.likesCount
2. `decrement_post_likes_count()` - -1 from Post.likesCount (min 0)
3. `increment_post_comments_count()` - +1 to Post.commentsCount
4. `decrement_post_comments_count()` - -1 from Post.commentsCount (min 0)

**Triggers:**
1. `trigger_increment_likes_count` - AFTER INSERT on `post_interactions` WHERE type='like'
2. `trigger_decrement_likes_count` - AFTER DELETE on `post_interactions` WHERE type='like'
3. `trigger_increment_comments_count` - AFTER INSERT on `comments`
4. `trigger_decrement_comments_count` - AFTER DELETE on `comments`

**Purpose:** Automatically maintain denormalized engagement counters

**Logic (Example: Increment Likes):**
```sql
CREATE OR REPLACE FUNCTION increment_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_likes_count
AFTER INSERT ON post_interactions
FOR EACH ROW
WHEN (NEW.type = 'like')
EXECUTE FUNCTION increment_post_likes_count();
```

**Execution:**
1. User likes post → INSERT into post_interactions (type='like')
2. Trigger fires, updates Post.likesCount += 1
3. User unlikes post → DELETE from post_interactions
4. Trigger fires, updates Post.likesCount -= 1 (min 0)

**Benefits:**
- No manual counter updates in application code
- Atomic counter updates with interactions
- Prevents race conditions
- Eliminates need for COUNT(*) queries

**Performance:**
- Triggers execute in same transaction as INSERT/DELETE
- Minimal overhead (single UPDATE statement)
- Much faster than counting interactions on every query

### Trigger 3: Storage Usage Tracking

**File:** `apps/api/prisma/migrations/20251017000001_add_storage_triggers/migration.sql`

**Functions:**
1. `update_storage_on_media_insert()` - Increment storage counters
2. `update_storage_on_media_delete()` - Decrement storage counters

**Triggers:**
1. `trigger_update_storage_insert` - AFTER INSERT on `post_media`
2. `trigger_update_storage_delete` - AFTER DELETE on `post_media`

**Purpose:** Automatically track user storage usage for quota enforcement

**Logic (Insert):**
```sql
CREATE OR REPLACE FUNCTION update_storage_on_media_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE storage_usage
    SET
        used_bytes = used_bytes + NEW.file_size_bytes,
        images_bytes = CASE
            WHEN NEW.type = 'image' THEN images_bytes + NEW.file_size_bytes
            ELSE images_bytes
        END,
        videos_bytes = CASE
            WHEN NEW.type = 'video' THEN videos_bytes + NEW.file_size_bytes
            ELSE videos_bytes
        END,
        audio_bytes = CASE
            WHEN NEW.type = 'audio' THEN audio_bytes + NEW.file_size_bytes
            ELSE audio_bytes
        END,
        other_bytes = CASE
            WHEN NEW.type NOT IN ('image', 'video', 'audio')
            THEN other_bytes + NEW.file_size_bytes
            ELSE other_bytes
        END,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Execution:**
1. User uploads 5MB image → INSERT into post_media
2. Trigger fires, updates storage_usage:
   - used_bytes += 5242880 (5MB)
   - images_bytes += 5242880
   - updated_at = NOW()

**Benefits:**
- Accurate real-time storage tracking
- No manual updates in application code
- Separate counters by media type (images, videos, audio, other)
- updated_at for cache invalidation

**Performance:**
- Executes in same transaction as media INSERT/DELETE
- Single UPDATE statement (minimal overhead)
- Much faster than SUM(file_size_bytes) queries

---

## Storage Quota System

### Overview

**Default Quota:** 50MB (52,428,800 bytes)

**Tracking:** Per-user storage usage in `storage_usage` table

**Enforcement:** Checked before media upload (media.initiateUpload)

**Updates:** Automatic via database triggers

### Storage Quota Workflow

**1. User Initiates Upload:**
```typescript
// media.initiateUpload
const storage = await prisma.$queryRaw`
  SELECT * FROM storage_usage
  WHERE user_id = ${userId}
  FOR UPDATE  -- Lock row to prevent race conditions
`

if (storage.used_bytes + fileSize > storage.quota_bytes) {
  throw new Error("Storage quota exceeded")
}
```

**2. User Completes Upload:**
```typescript
// media.completeUpload
await prisma.postMedia.create({
  data: {
    userId,
    fileUrl,
    fileSizeBytes,
    type: "image"
  }
})
// Trigger automatically updates storage_usage
```

**3. User Deletes Media:**
```typescript
// media.deleteMedia
await prisma.postMedia.delete({
  where: { id: mediaId }
})
// Trigger automatically updates storage_usage
```

### Storage Quota Queries

**Get User Storage:**
```typescript
const storage = await prisma.storageUsage.findUnique({
  where: { userId }
})

const used = Number(storage.usedBytes)
const quota = Number(storage.quotaBytes)
const percentage = (used / quota) * 100
```

**Check Quota Before Upload:**
```typescript
const available = Number(storage.quotaBytes) - Number(storage.usedBytes)
if (fileSize > available) {
  throw new Error(`Storage quota exceeded. Available: ${available} bytes`)
}
```

**Update Quota (Admin):**
```typescript
await prisma.storageUsage.update({
  where: { userId },
  data: {
    quotaBytes: BigInt(104857600)  // 100MB
  }
})
```

### Storage by Media Type

**Breakdown:**
- `usedBytes`: Total storage used
- `imagesBytes`: Image files (JPEG, PNG, GIF)
- `videosBytes`: Video files (MP4, WebM)
- `audioBytes`: Audio files (MP3, WAV, OGG)
- `otherBytes`: Other files (documents, etc.)

**Query by Type:**
```typescript
const storage = await prisma.storageUsage.findUnique({
  where: { userId }
})

console.log(`Images: ${storage.imagesBytes} bytes`)
console.log(`Videos: ${storage.videosBytes} bytes`)
console.log(`Audio: ${storage.audioBytes} bytes`)
console.log(`Other: ${storage.otherBytes} bytes`)
```

### Future Enhancements

**Subscription Tiers:**
- Free: 50MB
- Basic: 500MB
- Pro: 5GB
- Business: 50GB

**Quota Upgrades:**
```typescript
// Upgrade user to Pro tier
await prisma.userSubscription.create({
  data: {
    userId,
    tierId: proTierId,
    status: "active",
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
})

// Update storage quota
await prisma.storageUsage.update({
  where: { userId },
  data: {
    quotaBytes: BigInt(5368709120)  // 5GB
  }
})
```

---

## BigInt ID Approach

### Why BigInt?

**Problem:** JavaScript numbers are 64-bit floats, max safe integer: 2^53 - 1 (9,007,199,254,740,991)

**PostgreSQL:** Supports BIGINT (64-bit signed integer), max value: 2^63 - 1

**Solution:** Use BigInt in database, convert to string in API

**Benefits:**
1. **Large ID Space:** 9.2 quintillion IDs (will never run out)
2. **Auto-Increment:** Sequential IDs for natural ordering
3. **JSON Safety:** Strings can represent any integer
4. **No Precision Loss:** Exact representation in JSON

### Database Schema

**Prisma Schema:**
```prisma
model User {
  id: BigInt @id @default(autoincrement())
}

model Post {
  id: BigInt @id @default(autoincrement())
  userId: BigInt  // Foreign key
}
```

**PostgreSQL:**
```sql
CREATE TABLE users (
  id BIGSERIAL PRIMARY KEY  -- Auto-incrementing BigInt
);

CREATE TABLE posts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id)
);
```

### Type Conversions

**Database → Prisma Client:**
```typescript
const user = await prisma.user.findUnique({
  where: { id: BigInt(123) }
})

console.log(typeof user.id)  // "bigint"
console.log(user.id)          // 123n (BigInt literal)
```

**Prisma Client → API Response:**
```typescript
// Convert BigInt to String for JSON
const response = {
  id: user.id.toString(),  // "123"
  userId: post.userId.toString()
}
```

**API Request → Prisma Client:**
```typescript
// Convert String to BigInt for queries
const postId = BigInt(ctx.input.postId)  // "123" → 123n

const post = await prisma.post.findUnique({
  where: { id: postId }
})
```

### Conversion Helpers

**Centralized Conversion:**
```typescript
// packages/api-contracts/src/utils/id.ts
export function toBigInt(id: string): bigint {
  return BigInt(id)
}

export function toString(id: bigint): string {
  return id.toString()
}

export function toStringArray(ids: bigint[]): string[] {
  return ids.map(id => id.toString())
}
```

**Usage in Routers:**
```typescript
// Convert input string to BigInt
const userId = toBigInt(ctx.input.userId)

// Query database
const user = await prisma.user.findUnique({
  where: { id: userId }
})

// Convert BigInt to string for response
return {
  id: toString(user.id),
  username: user.username
}
```

### Best Practices

**1. Always Convert at Boundaries:**
- API receives strings → Convert to BigInt immediately
- Database returns BigInt → Convert to string before JSON serialization

**2. Use Type Contracts:**
```typescript
// packages/api-contracts/src/types/user.ts
export type User = {
  id: string  // BigInt as string in API
  username: string
}
```

**3. Validate String IDs:**
```typescript
const idSchema = z.string().regex(/^\d+$/, "Invalid ID format")

// Validate before conversion
const result = idSchema.safeParse(input.userId)
if (!result.success) {
  throw new Error("Invalid user ID")
}

const userId = BigInt(result.data)
```

**4. Handle Errors:**
```typescript
try {
  const id = BigInt(input.userId)
} catch (error) {
  throw new Error(`Invalid ID: ${input.userId}`)
}
```

---

## Cross-References

**Related Documentation:**
- [DATA_MODEL.md](./DATA_MODEL.md) - Complete data model with all 28 models and relationships
- [API.md](./API.md) - API procedures and RPC architecture
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Better-auth integration and session management

**Code Locations:**
- Prisma schema: `apps/api/prisma/schema.prisma`
- Migrations: `apps/api/prisma/migrations/`
- Database utilities: `apps/api/src/lib/database.ts`

---

**Document Version:** 1.0
**Last Updated:** 2025-10-21
**Phase Status:** Phase 4.4 Complete (Authentication UI)
