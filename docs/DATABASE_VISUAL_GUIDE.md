# VRSS Database Implementation - Visual Guide

Quick visual reference for understanding the database implementation strategy.

---

## Migration Phase Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: FOUNDATION (Day 1)                  │
│                                                                  │
│  ┌──────────┐     ┌───────────────┐     ┌───────────────────┐  │
│  │  users   │────▶│ user_profiles │     │ subscription_tiers│  │
│  │  (core)  │     │  (extended)   │     │   (reference)     │  │
│  └────┬─────┘     └───────────────┘     └───────────────────┘  │
│       │                                                          │
│       └────────────┐                                             │
│                    ▼                                             │
│            ┌───────────────┐                                     │
│            │storage_usage  │                                     │
│            │ (quota track) │                                     │
│            └───────────────┘                                     │
│                                                                  │
│  Triggers: updated_at (auto-timestamp)                          │
│  Indexes: 3 critical (username, email, status)                  │
│  Dependencies: NONE                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              PHASE 2: CONTENT & SOCIAL (Days 2-3)               │
│                                                                  │
│  ┌──────────┐     ┌────────────┐     ┌─────────────────┐       │
│  │  posts   │────▶│ post_media │────▶│ storage_usage   │       │
│  │          │     │            │     │ (trigger update)│       │
│  └────┬─────┘     └────────────┘     └─────────────────┘       │
│       │                                                          │
│       ├──────────┬──────────┬─────────────┐                     │
│       ▼          ▼          ▼             ▼                     │
│  ┌─────────┐ ┌────────┐ ┌────────┐ ┌──────────┐                │
│  │comments │ │reposts │ │post_   │ │user_     │                │
│  │(nested) │ │        │ │interact│ │follows   │                │
│  └─────────┘ └────────┘ │ions    │ └────┬─────┘                │
│                          └────────┘      │                      │
│       ┌──────────────────────────────────┘                      │
│       ▼                                                          │
│  ┌─────────────┐                                                │
│  │ friendships │ (auto-created on mutual follow)                │
│  │ (symmetric) │                                                │
│  └─────────────┘                                                │
│                                                                  │
│  Triggers: likes_count, comments_count, storage_tracking,       │
│            friendship_creation                                   │
│  Indexes: 16 critical (feed generation, social graph)           │
│  Dependencies: users, posts                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                PHASE 3: FEATURES (Day 4)                        │
│                                                                  │
│  ┌──────────────────┐     ┌──────────────┐                      │
│  │profile_sections  │────▶│section_      │                      │
│  │ (user layout)    │     │content       │                      │
│  └──────────────────┘     └──────────────┘                      │
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │custom_feeds  │────────▶│feed_filters  │                      │
│  │ (algorithms) │         │ (normalized) │                      │
│  └──────────────┘         └──────────────┘                      │
│                                                                  │
│  ┌──────────────┐         ┌──────────────┐                      │
│  │user_lists    │────────▶│list_members  │                      │
│  │ (curated)    │         │              │                      │
│  └──────────────┘         └──────────────┘                      │
│                                                                  │
│  Triggers: None                                                  │
│  Indexes: 5 optimization (profile rendering, feed switching)    │
│  Dependencies: users, posts (optional)                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│              PHASE 4: COMMUNICATION (Day 4)                     │
│                                                                  │
│  ┌──────────────────┐     ┌──────────────┐                      │
│  │conversations     │────▶│messages      │                      │
│  │ (participant[])  │     │ (content)    │                      │
│  └──────────────────┘     └──────────────┘                      │
│                                                                  │
│  ┌───────────────────────────────────────────────┐              │
│  │ notifications (likes, comments, follows, etc) │              │
│  └───────────────────────────────────────────────┘              │
│                                                                  │
│  ┌────────────────────────────────────────────────┐             │
│  │ user_subscriptions (billing, tier management) │             │
│  └────────────────────────────────────────────────┘             │
│                                                                  │
│  Triggers: updated_at                                            │
│  Indexes: 4 GIN indexes (array search), unread counts           │
│  Dependencies: users, posts, comments, subscription_tiers        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Index Priority Tiers

```
┌──────────────────────────────────────────────────────────────┐
│ TIER 1: CRITICAL (Must Have for Launch)                      │
│ Impact: 10x performance improvement                          │
│ Implement: Phase 1 & 2 migrations                            │
└──────────────────────────────────────────────────────────────┘

Feed Generation (100% of queries use this):
  idx_posts_user_created ████████████████████ (20 hits/sec)

Social Graph Queries:
  idx_user_follows_follower ██████████████ (10 hits/sec)
  idx_user_follows_following ██████████████ (10 hits/sec)

Friend Lookups:
  idx_friendships_user1 ████████ (5 hits/sec)
  idx_friendships_user2 ████████ (5 hits/sec)

Comment Threads:
  idx_comments_post_created ██████████ (8 hits/sec)

Notification Badge:
  idx_notifications_user_unread ████████████████ (15 hits/sec)

┌──────────────────────────────────────────────────────────────┐
│ TIER 2: OPTIMIZATION (Add After Testing)                     │
│ Impact: 20-50% performance improvement                       │
│ Implement: Based on monitoring data                          │
└──────────────────────────────────────────────────────────────┘

Discovery Page:
  idx_posts_engagement_created ██████ (3 hits/sec)

Like Status Check:
  idx_post_interactions_user_post ████ (2 hits/sec)

Storage Recalculation:
  idx_post_media_user_size ██ (cron job, 1/day)

Feed Switcher:
  idx_custom_feeds_user ███ (2 hits/sec)

Profile Rendering:
  idx_profile_sections_user_order ████ (3 hits/sec)

┌──────────────────────────────────────────────────────────────┐
│ TIER 3: NICE-TO-HAVE (Future Optimization)                   │
│ Impact: <10% performance improvement                         │
│ Implement: Only if user feedback indicates value             │
└──────────────────────────────────────────────────────────────┘

JSONB Queries (rare):
  idx_posts_media_urls_gin █ (0.1 hits/sec)
  idx_user_profiles_style_config_gin █ (0.1 hits/sec)

Complex Feed Queries (edge case):
  idx_feed_filters_type █ (0.5 hits/sec)
```

---

## Trigger Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   LIKE COUNTER TRIGGER                       │
└─────────────────────────────────────────────────────────────┘

User clicks "Like" button
        │
        ▼
┌───────────────────┐
│ POST /api/rpc     │
│ post.like         │
└────────┬──────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ INSERT INTO post_interactions          │
│ (user_id, post_id, type = 'like')     │
└────────┬───────────────────────────────┘
         │
         ▼  ⚡ TRIGGER FIRES
┌────────────────────────────────────────┐
│ update_post_likes_count()              │
│   UPDATE posts                         │
│   SET likes_count = likes_count + 1    │
│   WHERE id = NEW.post_id               │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ posts.likes_count updated atomically   │
│ (within same transaction)              │
└────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│              STORAGE TRACKING TRIGGER                        │
└─────────────────────────────────────────────────────────────┘

User uploads image
        │
        ▼
┌────────────────────────┐
│ 1. Check quota         │
│    (FOR UPDATE lock)   │
└────────┬───────────────┘
         │ Quota OK
         ▼
┌────────────────────────┐
│ 2. Upload to S3        │
│    (presigned URL)     │
└────────┬───────────────┘
         │ Success
         ▼
┌────────────────────────────────────────┐
│ 3. INSERT INTO post_media              │
│    (file_url, file_size_bytes=2MB)    │
└────────┬───────────────────────────────┘
         │
         ▼  ⚡ TRIGGER FIRES
┌────────────────────────────────────────┐
│ update_storage_on_media_insert()       │
│   UPDATE storage_usage                 │
│   SET used_bytes = used_bytes + 2MB    │
│       images_bytes = images_bytes + 2MB│
│   WHERE user_id = NEW.user_id          │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ storage_usage updated atomically       │
│ used_bytes: 0 → 2MB                    │
│ images_bytes: 0 → 2MB                  │
└────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────┐
│           FRIENDSHIP CREATION TRIGGER                        │
└─────────────────────────────────────────────────────────────┘

User A follows User B
        │
        ▼
┌────────────────────────────────────────┐
│ INSERT INTO user_follows               │
│ (follower_id=A, following_id=B)       │
└────────┬───────────────────────────────┘
         │
         ▼  ⚡ TRIGGER FIRES
┌────────────────────────────────────────┐
│ create_friendship_on_mutual_follow()   │
│   Check: Does B follow A?              │
│   Result: NO                           │
│   Action: None                         │
└────────────────────────────────────────┘

User B follows User A (mutual follow)
        │
        ▼
┌────────────────────────────────────────┐
│ INSERT INTO user_follows               │
│ (follower_id=B, following_id=A)       │
└────────┬───────────────────────────────┘
         │
         ▼  ⚡ TRIGGER FIRES
┌────────────────────────────────────────┐
│ create_friendship_on_mutual_follow()   │
│   Check: Does A follow B?              │
│   Result: YES (mutual follow detected) │
│   Action: INSERT INTO friendships      │
│   (user_id_1=A, user_id_2=B)          │
│   [where A < B for uniqueness]         │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ Friendship created automatically       │
│ A and B are now friends                │
└────────────────────────────────────────┘
```

---

## Query Performance Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  FEED GENERATION QUERY                       │
│  Target: <50ms for 20 posts from 100 followed users         │
└─────────────────────────────────────────────────────────────┘

Step 1: Find followed users
┌────────────────────────────────────────┐
│ SELECT following_id                    │
│ FROM user_follows                      │
│ WHERE follower_id = $current_user      │
│                                        │
│ ⚡ Uses: idx_user_follows_follower    │
│ Time: ~5ms (index scan)                │
│ Result: [2, 5, 7, 12, ..., 99]        │
└────────┬───────────────────────────────┘
         │
         ▼
Step 2: Get posts from followed users
┌────────────────────────────────────────┐
│ SELECT p.*, u.username, up.display_name│
│ FROM posts p                           │
│ JOIN users u ON p.user_id = u.id      │
│ JOIN user_profiles up ON u.id = up.id │
│ WHERE p.user_id IN (2, 5, 7, ...)     │
│   AND p.status = 'published'           │
│   AND p.deleted_at IS NULL             │
│ ORDER BY p.created_at DESC             │
│ LIMIT 20                               │
│                                        │
│ ⚡ Uses: idx_posts_user_created       │
│ Time: ~40ms (index scan + joins)       │
│ Result: 20 posts                       │
└────────┬───────────────────────────────┘
         │
         ▼
Step 3: Return to client
┌────────────────────────────────────────┐
│ Total Time: ~45ms ✅                   │
│ (within target of <50ms)               │
└────────────────────────────────────────┘

WITHOUT INDEXES:
┌────────────────────────────────────────┐
│ Step 1: Full table scan on user_follows│
│ Time: ~100ms ❌                         │
│                                        │
│ Step 2: Sequential scan on posts       │
│ Time: ~500ms ❌                         │
│                                        │
│ Total: ~600ms ❌                        │
│ (12x slower, unusable)                 │
└────────────────────────────────────────┘
```

---

## JSONB Validation Flow

```
┌─────────────────────────────────────────────────────────────┐
│           APPLICATION-LEVEL JSONB VALIDATION                 │
└─────────────────────────────────────────────────────────────┘

User updates profile background
        │
        ▼
┌────────────────────────────────────────┐
│ Frontend: POST /api/rpc                │
│ {                                      │
│   procedure: 'user.updateBackground',  │
│   input: {                             │
│     type: 'image',                     │
│     value: 'https://s3.../bg.jpg',     │
│     position: 'center'                 │
│   }                                    │
│ }                                      │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ Backend: Zod Validation                │
│                                        │
│ const backgroundConfigSchema = z.object({│
│   type: z.enum(['color','image','video']),│
│   value: z.string(),                   │
│   position: z.enum([...]).optional()   │
│ });                                    │
│                                        │
│ ✅ Validation passes                   │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ Database: INSERT/UPDATE                │
│                                        │
│ UPDATE user_profiles                   │
│ SET background_config = $1             │
│ WHERE user_id = $2                     │
│                                        │
│ (JSONB stored as validated object)     │
└────────────────────────────────────────┘


Invalid Input Example:
┌────────────────────────────────────────┐
│ Frontend sends:                        │
│ {                                      │
│   type: 'invalid_type',  ❌             │
│   value: 'https://...'                 │
│ }                                      │
└────────┬───────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────┐
│ Backend: Zod Validation                │
│                                        │
│ ❌ Throws ZodError:                    │
│ "Invalid enum value. Expected         │
│  'color' | 'image' | 'video',         │
│  received 'invalid_type'"             │
│                                        │
│ Request rejected before database       │
└────────────────────────────────────────┘

Database never receives invalid data ✅
```

---

## Seed Data Distribution

```
┌─────────────────────────────────────────────────────────────┐
│                    SEED DATA OVERVIEW                        │
│              (Development/Testing Environment)               │
└─────────────────────────────────────────────────────────────┘

Users (20 total):
├─ Popular Users (5)
│  ├─ 50-100 followers each
│  ├─ 20-30 posts each
│  └─ Active interactions (many likes/comments)
│
├─ Regular Users (12)
│  ├─ 5-20 followers each
│  ├─ 5-15 posts each
│  └─ Moderate interactions
│
├─ New Users (3)
│  ├─ 0-2 followers
│  ├─ 0-3 posts
│  └─ Minimal interactions
│
└─ Suspended Users (2)
   ├─ Status: 'suspended'
   └─ For moderation testing

Posts (100+ total):
├─ Text Short (20) ████████████
├─ Text Long (20)  ████████████
├─ Image Single (20) ████████████
├─ Image Gallery (10) ██████
├─ Video Short (15) █████████
├─ Video Long (5)  ███
├─ Song (5)        ███
└─ Album (5)       ███

Distribution:
├─ 60% from popular users (high engagement)
└─ 40% from regular users (organic)

Social Graph:
├─ Follows: 50+ relationships
│  └─ Realistic distribution (power law)
│
├─ Friendships: 10+ mutual follows
│  └─ Created automatically by trigger
│
└─ Interactions:
   ├─ Likes: 200+ ████████████████████
   ├─ Comments: 100+ ██████████
   └─ Reposts: 20+ ████

Custom Feeds (10):
├─ "Only Videos" (filter: type = video)
├─ "Popular This Week" (filter: date + engagement)
├─ "Friends Only" (filter: author = friends)
├─ "Text Posts" (filter: type = text)
└─ ... (6 more variations)

Messages:
├─ Conversations: 10 (mix of 1:1 and group)
└─ Messages: 50+ (varied timestamps)

Storage Usage:
├─ 2 users near quota limit (45MB/50MB)
├─ 10 users moderate usage (10-20MB)
└─ 8 users minimal usage (<5MB)
```

---

## Testing Strategy Overview

```
┌─────────────────────────────────────────────────────────────┐
│                   TESTING PYRAMID                            │
└─────────────────────────────────────────────────────────────┘

                    ▲
                   ╱ ╲
                  ╱   ╲
                 ╱ E2E ╲
                ╱───────╲
               ╱         ╲
              ╱  Integr.  ╲
             ╱─────────────╲
            ╱               ╲
           ╱  Unit Tests     ╲
          ╱───────────────────╲
         ╱                     ╲
        ╱   Schema Validation   ╲
       ╱───────────────────────────╲


1. Schema Validation (Base Layer)
   ├─ Constraint tests (username format, age range)
   ├─ Foreign key cascade tests
   ├─ Unique constraint tests
   └─ CHECK constraint tests

   Coverage: ~30 tests
   Run time: <1 second
   Tools: Bun Test + Testcontainers

2. Trigger Tests (Logic Layer)
   ├─ Counter update tests (likes, comments)
   ├─ Friendship creation tests
   ├─ Storage tracking tests
   └─ Race condition tests

   Coverage: ~15 tests
   Run time: ~2 seconds
   Tools: Bun Test + Testcontainers

3. Index Performance Tests (Optimization Layer)
   ├─ EXPLAIN ANALYZE queries
   ├─ Index usage verification
   ├─ Query time benchmarks
   └─ Load testing (100+ records)

   Coverage: ~10 tests
   Run time: ~5 seconds
   Tools: Bun Test + Testcontainers + pg

4. Integration Tests (Application Layer)
   ├─ Full CRUD workflows
   ├─ Multi-table transaction tests
   ├─ Concurrent operation tests
   └─ Error handling tests

   Coverage: ~20 tests
   Run time: ~10 seconds
   Tools: Bun Test + Testcontainers + Prisma

5. E2E Tests (Future)
   ├─ API → Database → API flow
   ├─ Full user journey tests
   └─ Real-world scenario tests

   Coverage: ~10 tests
   Run time: ~30 seconds
   Tools: Playwright/Cypress + Test DB

Target: 80%+ coverage on database layer (Layers 1-4)
```

---

## Timeline Gantt Chart

```
Day 1: Foundation
├─ Migration 001       ████████████
├─ Indexes             ████████
├─ Triggers            ████████
├─ Tests               ████████
└─ Seed                ████

Day 2: Content (Part 1)
├─ Migration 002       ████████████████
├─ Posts tables        ████████████
├─ Social tables       ████████████
└─ Critical indexes    ████████████████

Day 3: Content (Part 2)
├─ Counter triggers    ████████████
├─ Storage triggers    ████████████
├─ Friendship trigger  ████████
└─ Trigger tests       ████████████

Day 4: Features + Comms
├─ Migration 003       ████████████
├─ Migration 004       ████████████
├─ All indexes         ████████████████
└─ Validation          ████████

Day 5: Seeding
├─ Seed script         ████████████████████
├─ Test data gen       ████████████████
├─ Data validation     ████████
└─ Quality check       ████████

Day 6: Testing
├─ Testcontainers      ████████
├─ Schema tests        ████████████████
├─ Trigger tests       ████████████
├─ Index tests         ████████
└─ Coverage report     ████

Day 7: Polish
├─ Query optimization  ████████████
├─ Documentation       ████████
├─ Team review         ████
└─ Deploy to dev       ████████


Legend:
████ = 1 hour of work
Target: ~40 hours total (5-7 days full-time)
```

---

## Common Error Messages & Solutions

```
ERROR: duplicate key value violates unique constraint "users_username_key"
SOLUTION: Username already exists. Check before insert or use UPSERT.

ERROR: insert or update on table "user_profiles" violates foreign key constraint
SOLUTION: User must exist before creating profile. Use transaction or CASCADE.

ERROR: new row for relation "posts" violates check constraint "posts_content_required"
SOLUTION: Text posts require 'content' field. Validate before insert.

ERROR: column "deleted_at" is of type timestamp with time zone but expression is of type text
SOLUTION: Use NOW() or CURRENT_TIMESTAMP, not string literal.

ERROR: trigger function "update_post_likes_count" does not exist
SOLUTION: Create trigger function before creating trigger. Check migration order.

WARNING: there is no transaction in progress
SOLUTION: Wrap multiple operations in BEGIN; ... COMMIT; for atomicity.

ERROR: canceling statement due to lock timeout
SOLUTION: Deadlock detected. Review FOR UPDATE usage and transaction order.
```

---

## Quick Reference: Critical SQL Patterns

### Check if User Liked Post
```sql
SELECT EXISTS(
  SELECT 1 FROM post_interactions
  WHERE user_id = $1 AND post_id = $2 AND type = 'like'
);
```

### Get Feed Posts (Optimized)
```sql
SELECT p.*, u.username, up.display_name
FROM posts p
JOIN users u ON p.user_id = u.id
JOIN user_profiles up ON u.id = up.user_id
WHERE p.user_id IN (
  SELECT following_id FROM user_follows WHERE follower_id = $1
)
AND p.status = 'published'
AND p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT 20;
```

### Check Storage Quota (With Lock)
```sql
SELECT (quota_bytes - used_bytes) AS available_bytes
FROM storage_usage
WHERE user_id = $1
FOR UPDATE;
```

### Get Friends (Bidirectional)
```sql
SELECT user_id_2 AS friend_id FROM friendships WHERE user_id_1 = $1
UNION
SELECT user_id_1 AS friend_id FROM friendships WHERE user_id_2 = $1;
```

### Reconcile Counters (Nightly Job)
```sql
UPDATE posts p
SET likes_count = (
  SELECT COUNT(*) FROM post_interactions
  WHERE post_id = p.id AND type = 'like'
)
WHERE likes_count != (
  SELECT COUNT(*) FROM post_interactions
  WHERE post_id = p.id AND type = 'like'
);
```

---

## Final Checklist

```
Pre-Implementation:
☐ PostgreSQL 16 installed
☐ Prisma CLI installed (bunx prisma)
☐ DATABASE_URL configured in .env
☐ Docker Compose working (for dev database)
☐ Testcontainers configured
☐ @faker-js/faker installed

Phase 1 (Foundation):
☐ Migration 001 created
☐ Users table functional
☐ Profiles table functional
☐ Storage tracking functional
☐ Timestamp triggers working
☐ 5 test users seeded
☐ Tests passing (10+ tests)

Phase 2 (Content):
☐ Migration 002 created
☐ Posts table functional
☐ Media table functional
☐ Social tables functional
☐ Feed query <50ms
☐ Counter triggers working
☐ Storage triggers working
☐ Friendship trigger working
☐ 100+ posts seeded
☐ 50+ follows seeded
☐ Tests passing (20+ tests)

Phase 3 (Features):
☐ Migration 003 created
☐ Profile sections functional
☐ Custom feeds functional
☐ Lists functional
☐ 10+ custom feeds seeded
☐ 15+ profile sections seeded
☐ Tests passing (10+ tests)

Phase 4 (Communication):
☐ Migration 004 created
☐ Messages functional
☐ Notifications functional
☐ Subscriptions functional
☐ 10+ conversations seeded
☐ Tests passing (10+ tests)

Testing & Validation:
☐ All 19 tables created
☐ All 30+ indexes created
☐ All 8 triggers working
☐ 80%+ test coverage
☐ Feed generation <50ms
☐ Storage tracking accurate
☐ Seed data realistic
☐ No migration errors

Deployment:
☐ Production DATABASE_URL configured
☐ Migrations applied (bunx prisma migrate deploy)
☐ Backup strategy configured
☐ Monitoring configured (slow query log)
☐ Team trained on Prisma usage
```

---

**Ready to start?** Jump to Phase 1 in the full strategy document!

**Need help?** Refer to the Implementation Summary or full strategy.

---

**End of Visual Guide**
