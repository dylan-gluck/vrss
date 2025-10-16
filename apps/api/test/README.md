# Testing Infrastructure Documentation

## Overview

This directory contains the complete backend testing infrastructure for the VRSS API (Bun + Hono + Prisma + PostgreSQL).

## Structure

```
test/
├── README.md                    # This file
├── setup.ts                     # Testcontainers lifecycle management
├── infrastructure.test.ts       # Infrastructure validation tests
├── simple.test.ts              # Basic test to verify Bun test works
├── helpers/
│   ├── database.ts             # Database cleanup utilities
│   ├── auth.ts                 # Authentication helpers
│   └── request.ts              # API request builders
└── fixtures/
    ├── userBuilder.ts          # User builder pattern
    ├── postBuilder.ts          # Post builder pattern
    └── feedBuilder.ts          # Custom feed builder pattern
```

## Configuration

### bunfig.toml

Test configuration with 60-second timeout for each test:

```toml
[test]
timeout = 60000  # 60 seconds per test
```

### package.json Scripts

- `bun test` - Run all tests
- `bun test:watch` - Run tests in watch mode
- `bun test:coverage` - Run tests with coverage report (80%+ threshold)

## Testing Infrastructure

### 1. Database Setup (test/setup.ts)

**Testcontainers PostgreSQL Lifecycle:**

- **beforeAll**: Starts PostgreSQL 16 container, runs Prisma migrations
- **afterEach**: Optional cleanup (commented out by default)
- **afterAll**: Stops container and disconnects Prisma

**Usage:**

```typescript
import "./setup";  // Triggers container lifecycle
import { getTestDatabase } from "./setup";

const db = getTestDatabase();
```

**Key Features:**

- PostgreSQL 16 Alpine image
- 2-minute startup timeout
- Automatic migration deployment
- Connection verification

### 2. Database Helpers (test/helpers/database.ts)

**Cleanup Functions:**

```typescript
import { cleanAllTables, cleanUserData, cleanPostData } from "./helpers/database";

// Clean all tables (respects foreign keys)
await cleanAllTables();

// Clean specific domains
await cleanUserData();    // Users, profiles, sessions, storage
await cleanPostData();    // Posts and media
await cleanFeedData();    // Custom feeds and filters
await cleanSessionData(); // Sessions only
```

**Utility Functions:**

```typescript
// Get counts for debugging
const counts = await getTableCounts();
console.log(counts); // { users: 5, posts: 10, ... }

// Reset sequences to 1
await resetSequences();

// Wait for async operations
await waitFor(async () => {
  const user = await db.user.findFirst();
  return user !== null;
}, 5000);

// Create/restore snapshots
const restore = await createSnapshot();
// ... make changes ...
await restore(); // Restore to snapshot
```

### 3. Auth Helpers (test/helpers/auth.ts)

**Password Management:**

```typescript
import { hashPassword, verifyPassword } from "./helpers/auth";

const hash = await hashPassword("password123");
const isValid = await verifyPassword("password123", hash);
```

**User + Session Creation:**

```typescript
import { createAuthenticatedUser, createAuthContext } from "./helpers/auth";

// Create user with session
const { user, session, token } = await createAuthenticatedUser({
  username: "testuser",
  email: "test@example.com",
});

// Create auth context (fluent interface)
const context = await createAuthContext();
console.log(context.getAuthHeader()); // "Bearer ..."
await context.isValid(); // true
await context.logout();
```

**Test Auth Context:**

```typescript
class TestAuthContext {
  user: User;
  session: Session;
  token: string;

  getAuthHeader(): string;
  async isValid(): Promise<boolean>;
  async logout(): Promise<void>;
  async recordActivity(endpoint, method, statusCode): Promise<void>;
}
```

### 4. API Request Helpers (test/helpers/request.ts)

**Fluent API Client:**

```typescript
import { Hono } from "hono";
import { createApiClient } from "./helpers/request";

const app = new Hono();
const client = createApiClient(app);

// Make requests
const response = await client.get("/api/users")
  .auth(token)
  .query("limit", "10")
  .send();

// With authentication context
const context = await createAuthContext();
const response = await client.authenticated(context)
  .get("/api/posts")
  .send();

// POST with body
const response = await client.post("/api/posts")
  .withAuth(context)
  .send({ title: "Test", content: "Hello" });
```

**Response Helpers:**

```typescript
response.expectOk();                    // Assert 2xx status
response.expectStatus(201);             // Assert specific status
response.expectBodyContains({ id: 1 }); // Assert partial match
response.json();                         // Get body
response.getHeader("content-type");      // Get header
```

### 5. User Builder (test/fixtures/userBuilder.ts)

**Builder Pattern:**

```typescript
import { buildUser } from "./fixtures/userBuilder";

// Basic user
const { user } = await buildUser().build();

// Custom user
const { user } = await buildUser()
  .username("maya_music")
  .email("maya@example.com")
  .password("SecurePass123!")
  .emailVerified(true)
  .build();

// User with profile
const { user, profile } = await buildUser()
  .withProfile({
    displayName: "Maya Music",
    bio: "Music lover",
  })
  .build();

// User with storage
const { user, storage } = await buildUser()
  .withStorageQuotaMB(100)  // 100MB quota
  .build();

// Multiple users
const users = await buildUser()
  .withProfile()
  .withStorageQuotaMB(50)
  .buildMany(5);
```

**Quick Helpers:**

```typescript
import { createTestUser, createUserWithProfile } from "./fixtures/userBuilder";

const user = await createTestUser({ username: "testuser" });
const { user, profile } = await createUserWithProfile({ bio: "Test" });
```

### 6. Post Builder (test/fixtures/postBuilder.ts)

**Builder Pattern:**

```typescript
import { buildPost } from "./fixtures/postBuilder";

// Text post
const { post } = await buildPost()
  .byUser(userId)
  .asText()
  .content("Hello world!")
  .published()
  .build();

// Image post with media
const { post, media } = await buildPost()
  .byUser(userId)
  .asImage()
  .addImage()
  .addImage()
  .build();

// Video post
const { post, media } = await buildPost()
  .byUser(userId)
  .asVideo()
  .addVideo({ durationSeconds: 120 })
  .build();

// Gallery with custom images
const { post, media } = await buildPost()
  .byUser(userId)
  .asGallery()
  .addImage({ width: 1920, height: 1080 })
  .addImage({ width: 1920, height: 1080 })
  .addImage({ width: 1920, height: 1080 })
  .published()
  .build();

// Draft post
const { post } = await buildPost()
  .byUser(userId)
  .draft()
  .build();

// Post with engagement
const { post } = await buildPost()
  .byUser(userId)
  .withEngagement({
    likes: 100,
    comments: 50,
    views: 1000,
  })
  .published()
  .build();
```

**Quick Helpers:**

```typescript
import { createTextPost, createImagePost, createVideoPost, createGalleryPost } from "./fixtures/postBuilder";

const post = await createTextPost(userId, "Hello!");
const { post, media } = await createImagePost(userId, { imageCount: 3 });
const { post, media } = await createVideoPost(userId, { durationSeconds: 60 });
const { post, media } = await createGalleryPost(userId, { imageCount: 5 });
```

### 7. Feed Builder (test/fixtures/feedBuilder.ts)

**Builder Pattern:**

```typescript
import { buildFeed } from "./fixtures/feedBuilder";

// Basic feed
const { feed } = await buildFeed()
  .forUser(userId)
  .name("My Custom Feed")
  .build();

// Feed with post type filter
const { feed, filters } = await buildFeed()
  .forUser(userId)
  .name("Images Only")
  .filterByPostType(["image", "gallery"])
  .build();

// Feed with multiple filters
const { feed, filters } = await buildFeed()
  .forUser(userId)
  .filterByPostType(["image"])
  .filterByEngagement("likes", 100)
  .filterByHashtag(["tech", "coding"])
  .build();

// Feed with user filter
const { feed, filters } = await buildFeed()
  .forUser(userId)
  .filterByUser([followedUserId1, followedUserId2])
  .build();

// Default feed
const { feed } = await buildFeed()
  .forUser(userId)
  .asDefault()
  .build();
```

**Quick Helpers:**

```typescript
import {
  createCustomFeed,
  createPostTypeFeed,
  createUserFeed,
  createEngagementFeed,
  createHashtagFeed
} from "./fixtures/feedBuilder";

const feed = await createCustomFeed(userId, "My Feed");
const { feed, filters } = await createPostTypeFeed(userId, ["image", "video"]);
const { feed, filters } = await createUserFeed(userId, [user1Id, user2Id]);
const { feed, filters } = await createEngagementFeed(userId, 50); // Min 50 likes
const { feed, filters } = await createHashtagFeed(userId, ["tech"]);
```

## Testing Patterns

### Complete User Scenario

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import "./setup";
import { cleanAllTables } from "./helpers/database";
import { createAuthContext } from "./helpers/auth";
import { buildUser } from "./fixtures/userBuilder";
import { createTextPost } from "./fixtures/postBuilder";
import { createCustomFeed } from "./fixtures/feedBuilder";

describe("User Flow", () => {
  beforeEach(async () => {
    await cleanAllTables();
  });

  it("should create user with posts and feeds", async () => {
    // Create authenticated user
    const context = await createAuthContext({
      username: "maya_music",
      email: "maya@example.com",
    });

    // Create posts
    await createTextPost(context.user.id, "First post!");
    await createTextPost(context.user.id, "Second post!");

    // Create custom feed
    const feed = await createCustomFeed(context.user.id, "My Feed");

    expect(context.user.username).toBe("maya_music");
    expect(feed.name).toBe("My Feed");
  });
});
```

### API Integration Test

```typescript
import { Hono } from "hono";
import { createApiClient } from "./helpers/request";
import { createAuthContext } from "./helpers/auth";

describe("API Tests", () => {
  const app = new Hono();
  const client = createApiClient(app);

  it("should authenticate and access protected route", async () => {
    const context = await createAuthContext();

    const response = await client.authenticated(context)
      .get("/api/posts")
      .send();

    response.expectOk();
    expect(response.json()).toBeArray();
  });
});
```

## Running Tests

### Basic Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test test/infrastructure.test.ts

# Run with watch mode
bun test:watch

# Run with coverage
bun test:coverage
```

### Important Notes

1. **Container Startup**: First test run takes ~30-60 seconds to start PostgreSQL container
2. **Migrations**: Migrations are automatically applied on container start
3. **Cleanup**: Use `cleanAllTables()` in `beforeEach` for test isolation
4. **Parallel Tests**: Tests run in parallel by default (be careful with shared state)
5. **Timeouts**: Each test has 60-second timeout (configured in bunfig.toml)

## Troubleshooting

### Container Won't Start

- Ensure Docker is running: `docker ps`
- Check Docker logs: `docker logs <container_id>`
- Increase timeout in test/setup.ts

### Migrations Fail

- Verify migrations exist: `ls prisma/migrations`
- Generate Prisma client: `bunx prisma generate`
- Check DATABASE_URL format in container

### Tests Timeout

- Increase timeout in bunfig.toml
- Check if beforeAll setup is completing
- Look for hanging database connections

### Tests Fail with Foreign Key Errors

- Ensure cleanup order respects foreign keys
- Use `cleanAllTables()` which handles order correctly
- Check if relations are properly defined in schema

## Coverage Goals

- **Overall**: 80%+ code coverage
- **Critical Paths**: 100% coverage
  - Authentication
  - Storage quota management
  - Session management
  - Data integrity operations

## Next Steps

1. Write feature-specific tests using these helpers
2. Add API endpoint integration tests
3. Implement E2E tests with Playwright
4. Add performance tests for critical queries
5. Set up CI/CD pipeline with parallel test execution

## References

- [Bun Test Documentation](https://bun.sh/docs/cli/test)
- [Testcontainers Documentation](https://node.testcontainers.org/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [VRSS Testing Strategy](../../../docs/specs/001-vrss-social-platform/TESTING-STRATEGY.md)
- [VRSS Test Specifications](../../../docs/specs/001-vrss-social-platform/TEST-SPECIFICATIONS.md)
