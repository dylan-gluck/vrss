# Feed Router Test Suite - Phase 3.5

## Overview

Comprehensive test suite for the Feed Router (Custom Feeds feature) following TDD methodology. Tests written BEFORE implementation to define expected behavior.

**File:** `/Users/dylan/Workspace/projects/vrss/apps/api/test/rpc/feed.test.ts`
**Total Test Cases:** 37
**Coverage Target:** 90%+
**Status:** ✅ Ready for implementation (RED phase)

## Test Structure

### 1. feed.get Tests (9 test cases)
Tests for retrieving feed posts with filters and pagination.

- ✅ Get default Following feed when no feedId provided
- ✅ Get custom feed by feedId
- ✅ Return posts from followed users only for default feed
- ✅ Support cursor-based pagination
- ✅ Return empty nextCursor when no more posts
- ✅ Throw NOT_FOUND error for invalid feedId
- ✅ Respect post visibility (public vs private)
- ✅ Complete pagination in <50ms for 20 posts (Performance)
- ✅ Require authentication for default feed

**Key Features Tested:**
- Default "Following" feed (chronological posts from followed users)
- Custom feed execution by feedId
- Cursor-based pagination with `limit` and `cursor`
- Post visibility filtering
- Performance benchmarks (<50ms for 20 posts)
- Authentication requirements

### 2. feed.create Tests (7 test cases)
Tests for creating custom feeds with filters.

- ✅ Create custom feed with name and filters
- ✅ Validate name is required and not empty
- ✅ Validate filters array structure
- ✅ Create feed_filters records for each filter
- ✅ Set is_default to false by default
- ✅ Prevent duplicate feed names for same user
- ✅ Require authentication

**Key Features Tested:**
- Feed creation with name and description
- Filter array validation (type, operator, value)
- Automatic feed_filters record creation
- Unique constraint on feed names per user
- Default `is_default = false`
- Authorization (must be authenticated)

### 3. feed.update Tests (8 test cases)
Tests for updating existing custom feeds.

- ✅ Update feed name only
- ✅ Update filters only
- ✅ Update both name and filters
- ✅ Validate ownership (user can only update their own feeds)
- ✅ Handle non-existent feedId (404 error)
- ✅ Validate new name uniqueness per user
- ✅ Cascade to feed_filters table updates
- ✅ Require authentication

**Key Features Tested:**
- Partial updates (name only, filters only, or both)
- Ownership validation (FORBIDDEN for non-owners)
- Feed not found handling (NOT_FOUND error)
- Unique name constraint enforcement
- Cascading updates to feed_filters table
- Authentication requirements

### 4. feed.delete Tests (5 test cases)
Tests for deleting custom feeds.

- ✅ Delete custom feed
- ✅ Validate ownership (user can only delete their own feeds)
- ✅ Cascade delete to feed_filters table (verify cleanup)
- ✅ Handle non-existent feedId (404 error)
- ✅ Require authentication

**Key Features Tested:**
- Hard delete (not soft delete)
- Ownership validation (FORBIDDEN for non-owners)
- CASCADE delete to feed_filters (ON DELETE CASCADE)
- Feed not found handling
- Authentication requirements

### 5. Algorithm Execution Tests (9 test cases)
Tests for feed filter algorithm execution.

- ✅ Filter by post_type: text_short
- ✅ Filter by multiple post types (image, video)
- ✅ Filter by author (user_id)
- ✅ Filter by hashtags (contains)
- ✅ Filter by date_range (created_at between)
- ✅ Filter by engagement (likes > threshold)
- ✅ Apply AND logic: all filters must match
- ✅ Return empty result when no posts match filters

**Filter Types Tested:**
1. **post_type:** Filter by PostType enum (text_short, image, video, etc.)
2. **user (author):** Filter by specific user IDs
3. **hashtag:** Filter by hashtags (contains matching)
4. **date:** Filter by date range (created_at between start and end)
5. **engagement:** Filter by engagement metrics (likes, comments, reposts)

**Logical Operators Tested:**
- **AND:** All filters must match (default behavior)
- **Empty Result:** No posts match when filters are too restrictive

**NOT TESTED (Future):**
- OR logic: Any filter matches
- NOT logic: Exclude matching posts
- Complex combinations: (A AND B) OR (C NOT D)
- Multiple group_ids for complex filter grouping

## Test Patterns Used

### Database Setup
```typescript
beforeEach(async () => {
  await cleanAllTables(); // Clean slate for each test
});

afterEach(async () => {
  await cleanAllTables(); // Cleanup after tests
});
```

### Mock Context Creation
```typescript
function createMockContext<T>(overrides?: Partial<ProcedureContext<T>>): ProcedureContext<T> {
  return {
    c: {} as any,
    user: null,
    session: null,
    ip: "127.0.0.1",
    userAgent: "Test User Agent",
    input: {} as T,
    ...overrides,
  };
}
```

### Test Data Builders
- `buildUser()` - Create test users with profiles
- `buildFeed()` - Create custom feeds with filters (from feedBuilder fixture)
- `buildPost()` - Create test posts (from postBuilder fixture)
- Direct Prisma calls for fine-grained control

### Fixtures Used
1. **userBuilder:** User creation with profiles, storage quotas
2. **feedBuilder:** Custom feed creation with filter helpers
3. **postBuilder:** Post creation with media attachments

## Database Schema Coverage

### Tables Tested
1. **custom_feeds**
   - id, user_id, name, description
   - algorithm_config (JSONB)
   - is_default, display_order
   - created_at, updated_at

2. **feed_filters**
   - id, feed_id (FK to custom_feeds)
   - type, operator, value (JSONB)
   - group_id, logical_operator
   - display_order, created_at

3. **posts** (filtered by feed algorithms)
   - All post types: text_short, image, video, etc.
   - Visibility: public, followers, private
   - Engagement metrics: likes_count, comments_count

4. **user_follows** (for default Following feed)
   - follower_id, following_id

## Error Codes Tested

- ✅ **UNAUTHORIZED (1000):** Not authenticated
- ✅ **FORBIDDEN (1100):** Not authorized (wrong user)
- ✅ **VALIDATION_ERROR (1200):** Invalid input
- ✅ **NOT_FOUND (404):** Feed not found
- ✅ **CONFLICT (409):** Duplicate feed name

## Performance Requirements

- ✅ Pagination: <50ms for 20 posts
- ✅ Feed execution with filters should be fast enough for real-time use
- Database indexes required:
  - `custom_feeds(user_id, name)` - Unique constraint
  - `feed_filters(feed_id)` - FK with CASCADE
  - `posts(user_id, created_at)` - Feed queries
  - `user_follows(follower_id, following_id)` - Default feed

## Implementation Notes

### Feed Router Location
`/Users/dylan/Workspace/projects/vrss/apps/api/src/rpc/routers/feed.ts`

### Contract Types
Located in `packages/api-contracts`:
```typescript
namespace FeedProcedures {
  export interface GetFeed {
    input: { feedId?: string; limit?: number; cursor?: string; };
    output: { posts: Post[]; nextCursor?: string; };
  }

  export interface CreateFeed {
    input: { name: string; filters: FeedFilter[]; };
    output: { feed: CustomFeed; };
  }

  export interface UpdateFeed {
    input: { feedId: string; name?: string; filters?: FeedFilter[]; };
    output: { feed: CustomFeed; };
  }

  export interface DeleteFeed {
    input: { feedId: string; };
    output: { success: boolean; };
  }
}
```

### Filter Execution Algorithm

The feed algorithm must:
1. Start with base query (all posts from followed users for default feed, or all posts for custom feeds)
2. Apply each filter sequentially with AND logic
3. Support multiple filter types simultaneously
4. Handle JSONB value fields appropriately
5. Sort by `created_at DESC` (chronological)
6. Implement cursor-based pagination

**Filter Operator Mapping:**
- `equals`: Direct match (e.g., `type = 'text_short'`)
- `not_equals`: Exclusion (e.g., `type != 'image'`)
- `contains`: Array contains (e.g., `'tech' IN hashtags`)
- `greater_than`: Numeric comparison (e.g., `likes_count > 5`)
- `less_than`: Numeric comparison (e.g., `created_at < date`)
- `in_range`: Between values (e.g., `created_at BETWEEN start AND end`)

## Running Tests

```bash
# Run all feed tests
bun test feed.test.ts

# Run specific test group
bun test feed.test.ts --grep "feed.get"

# Run with coverage
bun test --coverage feed.test.ts
```

## Implementation Checklist

When implementing the feed router, ensure:

- [ ] Uncomment `import { feedRouter } from "../../src/rpc/routers/feed";` in test file
- [ ] Remove mock feedRouter object
- [ ] All 37 tests pass
- [ ] TypeScript compiles without errors
- [ ] Test coverage > 90%
- [ ] Performance benchmarks pass (<50ms for 20 posts)
- [ ] Database CASCADE behavior works correctly
- [ ] Unique constraints enforced (feed names per user)

## TDD Cycle

**Current Status: RED** ✅ Tests written, all failing (expected)

**Next Steps:**
1. **GREEN:** Implement feed router to make tests pass
2. **REFACTOR:** Optimize and clean up implementation
3. **VERIFY:** Run full test suite and check coverage

## Test Quality Metrics

- **Descriptive Names:** ✅ All tests use "should [behavior] when [condition]" format
- **Test Isolation:** ✅ Each test has clean database state
- **Clear Assertions:** ✅ Tests verify specific, expected outcomes
- **Edge Cases:** ✅ Tests cover error conditions, boundaries, empty results
- **Performance:** ✅ Benchmark tests ensure speed requirements
- **Documentation:** ✅ Tests document expected API behavior

## Future Enhancements

Tests to add in future phases:
- OR logic between filter groups
- NOT operator for exclusion filters
- Complex nested filter logic: (A AND B) OR (C NOT D)
- Multiple group_ids for advanced filtering
- Custom sort orders (popular, trending, etc.)
- Feed analytics (impressions, engagement)
- Feed sharing/collaboration
- Default feed configuration
