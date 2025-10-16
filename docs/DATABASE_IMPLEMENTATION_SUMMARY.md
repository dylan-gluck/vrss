# VRSS Database Implementation - Executive Summary

**Document**: Database Implementation Strategy
**Location**: `/docs/specs/001-vrss-social-platform/DATABASE_IMPLEMENTATION_STRATEGY.md`
**Status**: Ready for Implementation
**Timeline**: 5-7 days

---

## What This Strategy Delivers

A complete, production-ready PostgreSQL database implementation for VRSS MVP:

- **19 tables** organized in 4 logical migration phases
- **30+ indexes** (3-tier strategy: critical, optimization, nice-to-have)
- **8 database triggers** for automated counter updates and storage tracking
- **Comprehensive seed data** (20 test users, 100+ posts, complete social graph)
- **JSONB validation framework** using Zod schemas
- **Integration testing** with Testcontainers
- **Prisma ORM setup** with type-safe queries

---

## Implementation Phases

### Phase 1: Foundation (Day 1)
**Tables**: users, user_profiles, subscription_tiers, storage_usage
**Purpose**: Core identity and authentication infrastructure

**Key Deliverables**:
- User account creation working
- Profile customization enabled
- Storage quota tracking initialized
- Timestamp triggers operational

### Phase 2: Content & Social (Days 2-3)
**Tables**: posts, post_media, user_follows, friendships, post_interactions, comments, reposts
**Purpose**: Core social platform functionality

**Key Deliverables**:
- Post creation with media uploads
- Follow/friend relationships
- Like/comment/repost interactions
- Feed generation <50ms
- Counter triggers maintaining denormalized counts
- Storage tracking on media insert/delete
- Automatic friendship creation on mutual follow

### Phase 3: Features (Day 4)
**Tables**: profile_sections, section_content, custom_feeds, feed_filters, user_lists, list_members
**Purpose**: Profile and feed customization

**Key Deliverables**:
- Customizable profile layouts
- Custom feed algorithms
- User-created lists

### Phase 4: Communication (Day 4)
**Tables**: conversations, messages, notifications, user_subscriptions
**Purpose**: Real-time communication

**Key Deliverables**:
- Direct messaging (1:1 and group)
- Notification system
- Subscription management

---

## Critical Success Factors

### 1. Index Strategy (Feed Performance)

**Most Critical Indexes** (implement immediately):
```sql
-- Feed generation (100% of feed queries)
idx_posts_user_created (user_id, created_at DESC, status)

-- Social graph (follower/following lists)
idx_user_follows_follower (follower_id, created_at DESC)
idx_user_follows_following (following_id, created_at DESC)

-- Friend lookups
idx_friendships_user1 (user_id_1, created_at DESC)
idx_friendships_user2 (user_id_2, created_at DESC)

-- Comment threads
idx_comments_post_created (post_id, created_at DESC)

-- Notification badge
idx_notifications_user_unread (user_id, created_at DESC) WHERE is_read = FALSE
```

**Impact**: Without these, feed generation >500ms. With these, <50ms.

### 2. Trigger Implementation (Data Consistency)

**Counter Triggers**:
- `update_post_likes_count` - Maintains `posts.likes_count`
- `update_post_comments_count` - Maintains `posts.comments_count`

**Business Logic Triggers**:
- `create_friendship_on_mutual_follow` - Auto-creates friendship row
- `update_storage_on_media_insert/delete` - Atomic storage tracking

**Known Issue**: Race conditions can cause counter drift
**Mitigation**: Run nightly reconciliation job

### 3. JSONB Validation (Data Integrity)

**Problem**: No database-level validation for JSONB columns

**Solution**: Application-level validation with Zod
```typescript
// Background config validation
const backgroundConfigSchema = z.object({
  type: z.enum(['color', 'image', 'video']),
  value: z.string(),
  position: z.enum(['center', 'top', 'bottom', 'cover']).optional(),
});

// Validate before insert
const validated = backgroundConfigSchema.parse(input);
```

**Critical JSONB Columns**:
- `user_profiles.background_config`
- `user_profiles.style_config`
- `custom_feeds.algorithm_config`

### 4. Testing Strategy

**Testcontainers Setup**:
- Isolated PostgreSQL instances for integration tests
- No shared test database (prevents test pollution)

**Test Categories**:
1. **Schema validation** (constraints, foreign keys, cascades)
2. **Trigger tests** (counter updates, friendship creation, storage tracking)
3. **Index performance** (EXPLAIN ANALYZE queries)

**Target Coverage**: 80%+ on database layer

---

## Quick Start Commands

### Setup Database

```bash
# 1. Create foundation migration
cd apps/api
bunx prisma migrate dev --name foundation

# 2. Seed subscription tiers
bunx prisma db seed

# 3. Create test users
bunx prisma db seed

# 4. Open Prisma Studio (verify data)
bunx prisma studio
```

### Development Workflow

```bash
# Create new migration
bunx prisma migrate dev --name <migration_name>

# Reset database (drops and recreates)
bunx prisma migrate reset

# Seed database
bunx prisma db seed

# Run tests
bun test tests/database/

# Check migration status
bunx prisma migrate status
```

### Production Deployment

```bash
# Apply pending migrations
bunx prisma migrate deploy

# Check status
bunx prisma migrate status

# Generate Prisma Client
bunx prisma generate
```

---

## Implementation Checklist

### Week 1: Database Foundation

**Day 1: Phase 1**
- [ ] Create `001_foundation.sql` migration
- [ ] Implement Phase 1 indexes
- [ ] Implement timestamp triggers
- [ ] Write validation tests
- [ ] Seed subscription tiers and 5 test users

**Day 2: Phase 2 - Part 1**
- [ ] Create `002_content_social.sql` migration
- [ ] Implement posts, post_media tables
- [ ] Implement social relationship tables
- [ ] Add critical feed indexes
- [ ] Test post creation and social graph

**Day 3: Phase 2 - Part 2**
- [ ] Implement counter triggers
- [ ] Implement friendship trigger
- [ ] Implement storage tracking triggers
- [ ] Write trigger tests
- [ ] Verify triggers working correctly

**Day 4: Phase 3 & 4**
- [ ] Create `003_features.sql` migration
- [ ] Create `004_communication.sql` migration
- [ ] Implement all remaining indexes
- [ ] Test all 19 tables created

**Day 5: Seeding & Validation**
- [ ] Implement comprehensive seed script
- [ ] Generate 20 users, 100+ posts
- [ ] Create follow relationships, interactions
- [ ] Validate seed data quality

**Day 6: Testing**
- [ ] Set up Testcontainers
- [ ] Write schema validation tests (20+ tests)
- [ ] Write trigger tests (10+ tests)
- [ ] Write index performance tests (5+ tests)
- [ ] Achieve 80%+ test coverage

**Day 7: Optimization & Review**
- [ ] Run EXPLAIN ANALYZE on critical queries
- [ ] Optimize slow queries
- [ ] Document known issues
- [ ] Team review
- [ ] Deploy to development environment

---

## Key Design Decisions

### 1. Why 4 Migration Phases?

**Rationale**: Respects foreign key dependencies and enables incremental testing
- Phase 1: No dependencies (foundation)
- Phase 2: Depends on users (core features)
- Phase 3: Depends on users + posts (customization)
- Phase 4: Depends on users + posts + subscriptions (communication)

### 2. Why 3-Tier Index Strategy?

**Rationale**: Balance performance vs. storage overhead
- **Tier 1 (Critical)**: Must-have for MVP, blocks launch if missing
- **Tier 2 (Optimization)**: Add if monitoring shows slow queries
- **Tier 3 (Nice-to-Have)**: Future optimization, <10% impact

### 3. Why Database Triggers vs. Application Logic?

**Rationale**: Atomicity and consistency
- **Triggers**: Counter updates, storage tracking (must be atomic)
- **Application**: Business logic, validation (more flexible)

**Trade-off**: Triggers harder to debug, but prevent race conditions

### 4. Why Zod Validation for JSONB?

**Rationale**: Database CHECK constraints too rigid for evolving schemas
- JSONB columns allow schema evolution without migrations
- Zod provides runtime validation at application layer
- Can add database constraints later if needed

---

## Common Pitfalls & Solutions

### Pitfall 1: Prisma Schema Limitations

**Problem**: Prisma can't define partial indexes or GIN indexes

**Solution**: Create indexes via raw SQL in migration files
```sql
-- In migration file (not schema.prisma)
CREATE INDEX CONCURRENTLY idx_posts_user_created
    ON posts(user_id, created_at DESC)
    WHERE deleted_at IS NULL;
```

### Pitfall 2: Counter Drift from Race Conditions

**Problem**: Concurrent likes can cause `likes_count` to be inaccurate

**Solution**: Run nightly reconciliation job
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

### Pitfall 3: Storage Quota Race Conditions

**Problem**: Concurrent uploads can exceed quota

**Solution**: Use `FOR UPDATE` lock
```sql
SELECT (quota_bytes - used_bytes) AS available
FROM storage_usage
WHERE user_id = $1
FOR UPDATE;  -- Locks row until transaction commits
```

### Pitfall 4: Migration Order in Monorepo

**Problem**: Frontend imports Prisma types before migration runs

**Solution**: Run migrations BEFORE starting services
```bash
docker-compose up db              # Database first
bunx prisma migrate deploy        # Migrations second
docker-compose up api web         # Services last
```

---

## Performance Targets

### Feed Generation
- **Target**: <50ms for 20 posts
- **Critical Index**: `idx_posts_user_created`
- **Test Query**:
  ```sql
  SELECT * FROM posts
  WHERE user_id IN (SELECT following_id FROM user_follows WHERE follower_id = $1)
    AND status = 'published'
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 20;
  ```

### Storage Quota Check
- **Target**: <5ms
- **Index**: UNIQUE on `storage_usage.user_id`
- **Test Query**:
  ```sql
  SELECT (quota_bytes - used_bytes) AS available
  FROM storage_usage
  WHERE user_id = $1;
  ```

### Friend Lookup
- **Target**: <10ms for 100 friends
- **Indexes**: `idx_friendships_user1`, `idx_friendships_user2`
- **Test Query**:
  ```sql
  SELECT user_id_2 AS friend_id FROM friendships WHERE user_id_1 = $1
  UNION
  SELECT user_id_1 AS friend_id FROM friendships WHERE user_id_2 = $1;
  ```

### Notification Badge Count
- **Target**: <10ms
- **Index**: `idx_notifications_user_unread`
- **Test Query**:
  ```sql
  SELECT COUNT(*) FROM notifications
  WHERE user_id = $1 AND is_read = FALSE;
  ```

---

## Resources

### Documentation
- **Full Strategy**: `/docs/specs/001-vrss-social-platform/DATABASE_IMPLEMENTATION_STRATEGY.md`
- **Schema Reference**: `/docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md`
- **Data Storage**: `/docs/specs/001-vrss-social-platform/DATA_STORAGE_DOCUMENTATION.md`
- **Prisma Docs**: https://www.prisma.io/docs

### Tools
- **Prisma Studio**: `bunx prisma studio` (database GUI)
- **Testcontainers**: https://testcontainers.com/
- **Zod**: https://zod.dev/ (JSONB validation)
- **Faker**: https://fakerjs.dev/ (seed data generation)

### Commands Reference
```bash
# Migrations
bunx prisma migrate dev --name <name>    # Create migration
bunx prisma migrate deploy               # Apply migrations (prod)
bunx prisma migrate reset                # Reset database

# Testing
bun test tests/database/                 # Run database tests
bun test --coverage                      # Coverage report

# Direct Access
psql $DATABASE_URL                       # Connect to database
\dt                                      # List tables
\d users                                 # Describe users table
```

---

## Next Steps

1. **Read Full Strategy Document**
   - Location: `/docs/specs/001-vrss-social-platform/DATABASE_IMPLEMENTATION_STRATEGY.md`
   - Focus on sections relevant to your role

2. **Set Up Development Environment**
   - Install PostgreSQL 16
   - Install Prisma CLI
   - Configure `.env` with `DATABASE_URL`

3. **Start Phase 1 Implementation**
   - Create `001_foundation.sql` migration
   - Run tests
   - Deploy to development database

4. **Review with Team**
   - Discuss migration strategy
   - Validate seeding approach
   - Confirm testing requirements

---

**Questions?** Refer to the full strategy document or consult the team.

**Ready to implement?** Start with Phase 1 (Day 1 checklist above).

---

**End of Summary**
