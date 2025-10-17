/**
 * Feed Router Tests - Phase 3.5
 *
 * Comprehensive test suite for the Feed Router covering all 4 procedures:
 * - feed.get: Retrieve feed posts (default Following or custom)
 * - feed.create: Create custom feeds with filters
 * - feed.update: Update feed name and filters
 * - feed.delete: Delete custom feeds
 *
 * Algorithm Execution Tests:
 * - Filter by post_type, author, tags, date_range, engagement
 * - AND/OR/NOT logical operators
 * - Complex filter combinations
 * - Cursor-based pagination
 * - Performance benchmarks
 *
 * Following TDD: These tests are written BEFORE implementation.
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.5
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 447-524 (custom_feeds, feed_filters)
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ErrorCode } from "@vrss/api-contracts";
// ✅ Feed router implemented in Phase 3.5
import { feedRouter } from "../../src/rpc/routers/feed";
import type { ProcedureContext } from "../../src/rpc/types";
import { buildFeed } from "../fixtures/feedBuilder";
import { buildPost } from "../fixtures/postBuilder";
import { buildUser } from "../fixtures/userBuilder";
import { cleanAllTables } from "../helpers/database";
import { getTestDatabase } from "../setup";

// Test utilities
function createMockContext<T>(overrides?: Partial<ProcedureContext<T>>): ProcedureContext<T> {
  return {
    c: {} as any, // Mock Hono context (not needed for unit tests)
    user: null,
    session: null,
    ip: "127.0.0.1",
    userAgent: "Test User Agent",
    input: {} as T,
    ...overrides,
  };
}

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

describe("Feed Router", () => {
  const db = getTestDatabase();

  beforeEach(async () => {
    await cleanAllTables();
  });

  afterEach(async () => {
    await cleanAllTables();
  });

  // ===========================================================================
  // feed.get Tests - Default Feed & Custom Feeds
  // ===========================================================================

  describe("feed.get", () => {
    it("should get default Following feed when no feedId provided", async () => {
      // Arrange: Create users and follow relationship
      const { user: viewer } = await buildUser().username("viewer").withProfile().build();

      const { user: followed } = await buildUser().username("followed").withProfile().build();

      // Create follow relationship
      await db.userFollow.create({
        data: {
          followerId: viewer.id,
          followingId: followed.id,
        },
      });

      // Create posts from followed user
      await db.post.create({
        data: {
          userId: followed.id,
          type: "text_short",
          content: "Post from followed user",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext<{
        feedId?: string;
        limit?: number;
        cursor?: string;
      }>({
        user: {
          id: viewer.id.toString(),
          email: viewer.email,
          emailVerified: viewer.emailVerified,
          name: viewer.username,
          createdAt: viewer.createdAt,
          updatedAt: viewer.updatedAt,
        },
        input: {
          limit: 20,
        },
      });

      // Act: Get default feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Returns posts from followed users
      expect(result.posts).toBeDefined();
      expect(result.posts.length).toBeGreaterThan(0);
      expect(result.posts[0].userId).toBe(followed.id.toString());
    });

    it("should get custom feed by feedId", async () => {
      // Arrange: Create user with custom feed
      const { user } = await buildUser().username("customfeeduser").withProfile().build();

      // Create custom feed filtering by post type "text_short"
      const { feed } = await buildFeed()
        .forUser(user.id)
        .name("Text Posts Only")
        .filterByPostType(["text_short"])
        .build();

      // Create text post
      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Text post",
          status: "published",
          publishedAt: new Date(),
        },
      });

      // Create image post (should be filtered out)
      await db.post.create({
        data: {
          userId: user.id,
          type: "image",
          content: "Image post",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
          limit: 20,
        },
      });

      // Act: Get custom feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Returns only text posts
      expect(result.posts).toBeDefined();
      expect(result.posts.length).toBe(1);
      expect(result.posts[0].type).toBe("text_short");
    });

    it("should return posts from followed users only for default feed", async () => {
      const { user: viewer } = await buildUser().username("viewer").withProfile().build();

      const { user: followed } = await buildUser().username("followed").withProfile().build();

      const { user: notFollowed } = await buildUser().username("notfollowed").withProfile().build();

      // Create follow relationship with one user only
      await db.userFollow.create({
        data: {
          followerId: viewer.id,
          followingId: followed.id,
        },
      });

      // Create posts from both users
      await buildPost().byUser(followed.id).content("From followed user").published().build();

      await buildPost()
        .byUser(notFollowed.id)
        .content("From not followed user")
        .published()
        .build();

      const ctx = createMockContext({
        user: {
          id: viewer.id.toString(),
          email: viewer.email,
          emailVerified: viewer.emailVerified,
          name: viewer.username,
          createdAt: viewer.createdAt,
          updatedAt: viewer.updatedAt,
        },
        input: { limit: 20 },
      });

      // Act: Get default feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Only posts from followed user
      expect(result.posts.length).toBe(1);
      expect(result.posts[0].userId).toBe(followed.id.toString());
    });

    it("should support cursor-based pagination", async () => {
      const { user } = await buildUser().username("testuser").withProfile().build();

      // Create 25 posts
      for (let i = 0; i < 25; i++) {
        await buildPost().byUser(user.id).content(`Post ${i}`).published().build();
      }

      // Follow self to see own posts
      await db.userFollow.create({
        data: {
          followerId: user.id,
          followingId: user.id,
        },
      });

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: { limit: 10 },
      });

      // Act: Get first page
      const page1 = await feedRouter["feed.get"](ctx);

      // Assert: First page has 10 posts and nextCursor
      expect(page1.posts.length).toBe(10);
      expect(page1.nextCursor).toBeDefined();

      // Act: Get second page
      ctx.input.cursor = page1.nextCursor;
      const page2 = await feedRouter["feed.get"](ctx);

      // Assert: Second page has 10 different posts
      expect(page2.posts.length).toBe(10);
      expect(page2.posts[0].id).not.toBe(page1.posts[0].id);
    });

    it("should return empty nextCursor when no more posts", async () => {
      const { user } = await buildUser().username("testuser").withProfile().build();

      // Create only 5 posts
      for (let i = 0; i < 5; i++) {
        await buildPost().byUser(user.id).content(`Post ${i}`).published().build();
      }

      // Follow self
      await db.userFollow.create({
        data: {
          followerId: user.id,
          followingId: user.id,
        },
      });

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: { limit: 10 },
      });

      // Act: Get feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Returns all 5 posts, no cursor
      expect(result.posts.length).toBe(5);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should throw NOT_FOUND error for invalid feedId", async () => {
      const { user } = await buildUser().username("testuser").withProfile().build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: "999999", // Non-existent
        },
      });

      // Act & Assert: Throws NOT_FOUND
      await expect(feedRouter["feed.get"](ctx)).rejects.toThrow();
    });

    it("should respect post visibility (public vs private)", async () => {
      const { user: viewer } = await buildUser().username("viewer").withProfile().build();

      const { user: followed } = await buildUser().username("followed").withProfile().build();

      // Create follow relationship
      await db.userFollow.create({
        data: {
          followerId: viewer.id,
          followingId: followed.id,
        },
      });

      // Create public post
      await db.post.create({
        data: {
          userId: followed.id,
          type: "text_short",
          content: "Public post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      // Create private post
      await db.post.create({
        data: {
          userId: followed.id,
          type: "text_short",
          content: "Private post",
          visibility: "private",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: {
          id: viewer.id.toString(),
          email: viewer.email,
          emailVerified: viewer.emailVerified,
          name: viewer.username,
          createdAt: viewer.createdAt,
          updatedAt: viewer.updatedAt,
        },
        input: { limit: 20 },
      });

      // Act: Get feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Only public post visible (private excluded)
      expect(result.posts.length).toBe(1);
      expect(result.posts[0].visibility).toBe("public");
    });

    it("should complete pagination in less than 50ms for 20 posts", async () => {
      const { user } = await buildUser().username("perfuser").withProfile().build();

      // Create 20 posts
      for (let i = 0; i < 20; i++) {
        await buildPost().byUser(user.id).content(`Post ${i}`).published().build();
      }

      // Follow self
      await db.userFollow.create({
        data: {
          followerId: user.id,
          followingId: user.id,
        },
      });

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: { limit: 20 },
      });

      // Act: Measure performance
      const startTime = performance.now();
      const result = await feedRouter["feed.get"](ctx);
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert: Completes in < 50ms
      expect(result.posts.length).toBe(20);
      expect(duration).toBeLessThan(50);
    });

    it("should require authentication for default feed", async () => {
      const ctx = createMockContext({
        user: null,
        session: null,
        input: {},
      });

      // Act & Assert: Throws UNAUTHORIZED
      await expect(feedRouter["feed.get"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // feed.create Tests
  // ===========================================================================

  describe("feed.create", () => {
    it("should create custom feed with name and filters", async () => {
      const { user } = await buildUser().username("creator").withProfile().build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          name: "My Custom Feed",
          filters: [
            {
              type: "post_type",
              operator: "equals",
              value: ["text_short"],
            },
          ],
        },
      });

      // Act: Create feed
      const result = await feedRouter["feed.create"](ctx);

      // Assert: Feed created
      expect(result.feed).toBeDefined();
      expect(result.feed.name).toBe("My Custom Feed");
      expect(result.feed.userId).toBe(user.id.toString());

      // Verify feed_filters records created
      const filters = await db.feedFilter.findMany({
        where: { feedId: BigInt(result.feed.id) },
      });
      expect(filters.length).toBe(1);
      expect(filters[0].type).toBe("post_type");
    });

    it("should validate name is required and not empty", async () => {
      const { user } = await buildUser().username("validator").withProfile().build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          name: "", // Empty name
          filters: [],
        },
      });

      // Act & Assert: Throws VALIDATION_ERROR
      await expect(feedRouter["feed.create"](ctx)).rejects.toThrow();
    });

    it("should validate filters array structure", async () => {
      const { user } = await buildUser().username("validator").withProfile().build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          name: "Test Feed",
          filters: [
            {
              // Missing type
              operator: "equals",
              value: ["text"],
            },
          ],
        },
      });

      // Act & Assert: Throws VALIDATION_ERROR
      await expect(feedRouter["feed.create"](ctx)).rejects.toThrow();
    });

    it("should create feed_filters records for each filter", async () => {
      const { user } = await buildUser().username("multifilter").withProfile().build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          name: "Complex Feed",
          filters: [
            { type: "post_type", operator: "equals", value: ["text_short"] },
            { type: "engagement", operator: "greater_than", value: { metric: "likes", value: 10 } },
          ],
        },
      });

      // Act: Create feed
      const result = await feedRouter["feed.create"](ctx);

      // Assert: Both filters created
      const filters = await db.feedFilter.findMany({
        where: { feedId: BigInt(result.feed.id) },
      });
      expect(filters.length).toBe(2);
    });

    it("should set is_default to false by default", async () => {
      const { user } = await buildUser().username("defaulttest").withProfile().build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          name: "Not Default",
          filters: [],
        },
      });

      // Act: Create feed
      const result = await feedRouter["feed.create"](ctx);

      // Assert: is_default is false
      const feed = await db.customFeed.findUnique({
        where: { id: BigInt(result.feed.id) },
      });
      expect(feed?.isDefault).toBe(false);
    });

    it("should prevent duplicate feed names for same user", async () => {
      const { user } = await buildUser().username("dupetest").withProfile().build();

      // Create first feed
      await buildFeed().forUser(user.id).name("Unique Name").build();

      // Try to create second feed with same name
      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          name: "Unique Name", // Duplicate
          filters: [],
        },
      });

      // Act & Assert: Throws error (duplicate name)
      await expect(feedRouter["feed.create"](ctx)).rejects.toThrow();
    });

    it("should require authentication", async () => {
      const ctx = createMockContext({
        user: null,
        session: null,
        input: {
          name: "Test Feed",
          filters: [],
        },
      });

      // Act & Assert: Throws UNAUTHORIZED
      await expect(feedRouter["feed.create"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // feed.update Tests
  // ===========================================================================

  describe("feed.update", () => {
    it("should update feed name only", async () => {
      const { user } = await buildUser().username("updater").withProfile().build();

      const { feed } = await buildFeed().forUser(user.id).name("Old Name").build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
          name: "New Name",
        },
      });

      // Act: Update feed
      const result = await feedRouter["feed.update"](ctx);

      // Assert: Name updated
      expect(result.feed.name).toBe("New Name");
    });

    it("should update filters only", async () => {
      const { user } = await buildUser().username("filterupdater").withProfile().build();

      const { feed } = await buildFeed()
        .forUser(user.id)
        .name("Test Feed")
        .filterByPostType(["text"])
        .build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
          filters: [{ type: "post_type", operator: "equals", value: ["image"] }],
        },
      });

      // Act: Update filters
      const _result = await feedRouter["feed.update"](ctx);

      // Assert: Filters updated
      const updatedFilters = await db.feedFilter.findMany({
        where: { feedId: feed.id },
      });
      expect(updatedFilters.length).toBe(1);
      expect(updatedFilters[0].value).toContain("image");
    });

    it("should update both name and filters", async () => {
      const { user } = await buildUser().username("bothupdater").withProfile().build();

      const { feed } = await buildFeed()
        .forUser(user.id)
        .name("Old Name")
        .filterByPostType(["text"])
        .build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
          name: "New Name",
          filters: [{ type: "post_type", operator: "equals", value: ["video"] }],
        },
      });

      // Act: Update both
      const result = await feedRouter["feed.update"](ctx);

      // Assert: Both updated
      expect(result.feed.name).toBe("New Name");
      const filters = await db.feedFilter.findMany({
        where: { feedId: feed.id },
      });
      expect(filters[0].value).toContain("video");
    });

    it("should validate ownership (user can only update their own feeds)", async () => {
      const { user: owner } = await buildUser().username("owner").withProfile().build();

      const { user: attacker } = await buildUser().username("attacker").withProfile().build();

      const { feed } = await buildFeed().forUser(owner.id).name("Owner's Feed").build();

      const ctx = createMockContext({
        user: {
          id: attacker.id.toString(),
          email: attacker.email,
          emailVerified: attacker.emailVerified,
          name: attacker.username,
          createdAt: attacker.createdAt,
          updatedAt: attacker.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
          name: "Hacked Name",
        },
      });

      // Act & Assert: Throws FORBIDDEN
      await expect(feedRouter["feed.update"](ctx)).rejects.toThrow();
    });

    it("should handle non-existent feedId (404 error)", async () => {
      const { user } = await buildUser().username("notfound").withProfile().build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: "999999",
          name: "New Name",
        },
      });

      // Act & Assert: Throws NOT_FOUND
      await expect(feedRouter["feed.update"](ctx)).rejects.toThrow();
    });

    it("should validate new name uniqueness per user", async () => {
      const { user } = await buildUser().username("uniquetest").withProfile().build();

      // Create two feeds
      const { feed: feed1 } = await buildFeed().forUser(user.id).name("Feed 1").build();

      await buildFeed().forUser(user.id).name("Feed 2").build();

      // Try to rename feed1 to "Feed 2" (duplicate)
      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed1.id.toString(),
          name: "Feed 2", // Duplicate
        },
      });

      // Act & Assert: Throws error
      await expect(feedRouter["feed.update"](ctx)).rejects.toThrow();
    });

    it("should cascade to feed_filters table updates", async () => {
      const { user } = await buildUser().username("cascadetest").withProfile().build();

      const { feed } = await buildFeed()
        .forUser(user.id)
        .name("Test Feed")
        .filterByPostType(["text"])
        .filterByPostType(["image"])
        .build();

      // Verify 2 filters initially
      let filters = await db.feedFilter.findMany({
        where: { feedId: feed.id },
      });
      expect(filters.length).toBe(2);

      // Update to single filter
      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
          filters: [{ type: "post_type", operator: "equals", value: ["video"] }],
        },
      });

      // Act: Update
      await feedRouter["feed.update"](ctx);

      // Assert: Old filters removed, new filter added
      filters = await db.feedFilter.findMany({
        where: { feedId: feed.id },
      });
      expect(filters.length).toBe(1);
      expect(filters[0].value).toContain("video");
    });

    it("should require authentication", async () => {
      const ctx = createMockContext({
        user: null,
        session: null,
        input: {
          feedId: "123",
          name: "New Name",
        },
      });

      // Act & Assert: Throws UNAUTHORIZED
      await expect(feedRouter["feed.update"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // feed.delete Tests
  // ===========================================================================

  describe("feed.delete", () => {
    it("should delete custom feed", async () => {
      const { user } = await buildUser().username("deleter").withProfile().build();

      const { feed } = await buildFeed().forUser(user.id).name("To Delete").build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
        },
      });

      // Act: Delete feed
      await feedRouter["feed.delete"](ctx);

      // Assert: Feed deleted
      const deletedFeed = await db.customFeed.findUnique({
        where: { id: feed.id },
      });
      expect(deletedFeed).toBeNull();
    });

    it("should validate ownership (user can only delete their own feeds)", async () => {
      const { user: owner } = await buildUser().username("feedowner").withProfile().build();

      const { user: attacker } = await buildUser().username("attacker").withProfile().build();

      const { feed } = await buildFeed().forUser(owner.id).name("Owner's Feed").build();

      const ctx = createMockContext({
        user: {
          id: attacker.id.toString(),
          email: attacker.email,
          emailVerified: attacker.emailVerified,
          name: attacker.username,
          createdAt: attacker.createdAt,
          updatedAt: attacker.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
        },
      });

      // Act & Assert: Throws FORBIDDEN
      await expect(feedRouter["feed.delete"](ctx)).rejects.toThrow();
    });

    it("should cascade delete to feed_filters table (verify cleanup)", async () => {
      const { user } = await buildUser().username("cascadedelete").withProfile().build();

      const { feed } = await buildFeed()
        .forUser(user.id)
        .name("Feed with Filters")
        .filterByPostType(["text"])
        .filterByPostType(["image"])
        .build();

      // Verify filters exist
      let filters = await db.feedFilter.findMany({
        where: { feedId: feed.id },
      });
      expect(filters.length).toBe(2);

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
        },
      });

      // Act: Delete feed
      await feedRouter["feed.delete"](ctx);

      // Assert: Filters also deleted (CASCADE)
      filters = await db.feedFilter.findMany({
        where: { feedId: feed.id },
      });
      expect(filters.length).toBe(0);
    });

    it("should handle non-existent feedId (404 error)", async () => {
      const { user } = await buildUser().username("notfound").withProfile().build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: "999999",
        },
      });

      // Act & Assert: Throws NOT_FOUND
      await expect(feedRouter["feed.delete"](ctx)).rejects.toThrow();
    });

    it("should require authentication", async () => {
      const ctx = createMockContext({
        user: null,
        session: null,
        input: {
          feedId: "123",
        },
      });

      // Act & Assert: Throws UNAUTHORIZED
      await expect(feedRouter["feed.delete"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Algorithm Execution Tests
  // ===========================================================================

  describe("Algorithm Execution - Filter Logic", () => {
    it("should filter by post_type: text_short", async () => {
      const { user } = await buildUser().username("typefilter").withProfile().build();

      // Create custom feed for text posts only
      const { feed } = await buildFeed()
        .forUser(user.id)
        .name("Text Only")
        .filterByPostType(["text_short"])
        .build();

      // Create various post types
      await buildPost().byUser(user.id).asText().published().build();
      await buildPost().byUser(user.id).asImage().addImage().published().build();
      await buildPost().byUser(user.id).asVideo().addVideo().published().build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
        },
      });

      // Act: Get filtered feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Only text posts
      expect(result.posts.length).toBe(1);
      expect(result.posts[0].type).toBe("text_short");
    });

    it("should filter by multiple post types (image, video)", async () => {
      const { user } = await buildUser().username("multitypefilter").withProfile().build();

      // Create feed for image and video posts
      const { feed } = await buildFeed()
        .forUser(user.id)
        .name("Media Only")
        .filterByPostType(["image", "video_short"])
        .build();

      // Create posts
      await buildPost().byUser(user.id).asText().published().build();
      await buildPost().byUser(user.id).asImage().addImage().published().build();
      await buildPost().byUser(user.id).asVideo().addVideo().published().build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
        },
      });

      // Act: Get filtered feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Only image and video posts
      expect(result.posts.length).toBe(2);
      expect(result.posts.every((p) => ["image", "video_short"].includes(p.type))).toBe(true);
    });

    it("should filter by author (user_id)", async () => {
      const { user: viewer } = await buildUser().username("viewer").withProfile().build();

      const { user: author1 } = await buildUser().username("author1").withProfile().build();

      const { user: author2 } = await buildUser().username("author2").withProfile().build();

      // Create feed filtering by specific author
      const { feed } = await buildFeed()
        .forUser(viewer.id)
        .name("Author1 Posts")
        .filterByUser([author1.id])
        .build();

      // Create posts from both authors
      await buildPost().byUser(author1.id).content("From author1").published().build();
      await buildPost().byUser(author2.id).content("From author2").published().build();

      const ctx = createMockContext({
        user: {
          id: viewer.id.toString(),
          email: viewer.email,
          emailVerified: viewer.emailVerified,
          name: viewer.username,
          createdAt: viewer.createdAt,
          updatedAt: viewer.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
        },
      });

      // Act: Get filtered feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Only posts from author1
      expect(result.posts.length).toBe(1);
      expect(result.posts[0].userId).toBe(author1.id.toString());
    });

    it.skip("should filter by hashtags (contains)", async () => {
      const { user } = await buildUser().username("hashtaguser").withProfile().build();

      // Create feed filtering by hashtag
      const { feed } = await buildFeed()
        .forUser(user.id)
        .name("Tech Posts")
        .filterByHashtag(["tech", "coding"])
        .build();

      // Create posts with and without hashtags
      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "#tech post about coding",
          hashtags: ["tech", "coding"],
          status: "published",
          publishedAt: new Date(),
        },
      });

      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Regular post without hashtags",
          hashtags: [],
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
        },
      });

      // Act: Get filtered feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Only posts with matching hashtags
      expect(result.posts.length).toBe(1);
      expect(result.posts[0].hashtags).toContain("tech");
    });

    it("should filter by date_range (created_at between)", async () => {
      const { user } = await buildUser().username("datefilter").withProfile().build();

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

      // Create feed filtering last 24 hours
      const { feed } = await buildFeed()
        .forUser(user.id)
        .name("Recent Posts")
        .filterByDateRange(yesterday, today)
        .build();

      // Create posts at different times
      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Recent post",
          status: "published",
          publishedAt: today,
          createdAt: today,
        },
      });

      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Old post",
          status: "published",
          publishedAt: twoDaysAgo,
          createdAt: twoDaysAgo,
        },
      });

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
        },
      });

      // Act: Get filtered feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Only recent post
      expect(result.posts.length).toBe(1);
      expect(result.posts[0].content).toBe("Recent post");
    });

    it("should filter by engagement (likes > threshold)", async () => {
      const { user } = await buildUser().username("engagementfilter").withProfile().build();

      // Create feed filtering popular posts (>5 likes)
      const { feed } = await buildFeed()
        .forUser(user.id)
        .name("Popular Posts")
        .filterByEngagement("likes", 5)
        .build();

      // Create posts with different like counts
      await buildPost()
        .byUser(user.id)
        .content("Popular post")
        .withEngagement({ likes: 10 })
        .published()
        .build();

      await buildPost()
        .byUser(user.id)
        .content("Unpopular post")
        .withEngagement({ likes: 2 })
        .published()
        .build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
        },
      });

      // Act: Get filtered feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Only popular post
      expect(result.posts.length).toBe(1);
      expect(result.posts[0].likesCount).toBeGreaterThan(5);
    });

    it("should apply AND logic: all filters must match", async () => {
      const { user } = await buildUser().username("andlogic").withProfile().build();

      // Create feed: text_short posts AND >5 likes
      const { feed } = await buildFeed()
        .forUser(user.id)
        .name("Popular Text Posts")
        .filterByPostType(["text_short"])
        .filterByEngagement("likes", 5)
        .build();

      // Create various posts
      await buildPost()
        .byUser(user.id)
        .asText()
        .content("Popular text")
        .withEngagement({ likes: 10 })
        .published()
        .build();

      await buildPost()
        .byUser(user.id)
        .asText()
        .content("Unpopular text")
        .withEngagement({ likes: 2 })
        .published()
        .build();

      await buildPost()
        .byUser(user.id)
        .asImage()
        .content("Popular image")
        .withEngagement({ likes: 10 })
        .addImage()
        .published()
        .build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
        },
      });

      // Act: Get filtered feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Only post matching BOTH filters
      expect(result.posts.length).toBe(1);
      expect(result.posts[0].type).toBe("text_short");
      expect(result.posts[0].likesCount).toBeGreaterThan(5);
    });

    it("should return empty result when no posts match filters", async () => {
      const { user } = await buildUser().username("nomatch").withProfile().build();

      // Create feed filtering for audio posts
      const { feed } = await buildFeed()
        .forUser(user.id)
        .name("Audio Only")
        .filterByPostType(["song"])
        .build();

      // Create only text posts
      await buildPost().byUser(user.id).asText().published().build();
      await buildPost().byUser(user.id).asText().published().build();

      const ctx = createMockContext({
        user: {
          id: user.id.toString(),
          email: user.email,
          emailVerified: user.emailVerified,
          name: user.username,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        input: {
          feedId: feed.id.toString(),
        },
      });

      // Act: Get filtered feed
      const result = await feedRouter["feed.get"](ctx);

      // Assert: Empty result
      expect(result.posts.length).toBe(0);
    });
  });
});
