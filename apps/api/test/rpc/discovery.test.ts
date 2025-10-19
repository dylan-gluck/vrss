/**
 * Discovery Router Tests - Phase 3.7
 *
 * Comprehensive test suite for the Discovery Router covering all 3 procedures:
 * - discovery.searchUsers: Search users by username/display name
 * - discovery.searchPosts: Search posts by content
 * - discovery.getDiscoverFeed: Get personalized discovery feed from 2-degree network
 *
 * @see docs/tasks/task-3.7.md lines 362-370
 * @see packages/api-contracts/src/procedures/discovery.ts
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ErrorCode } from "@vrss/api-contracts";
import { discoveryRouter } from "../../src/rpc/routers/discovery";
import type { ProcedureContext } from "../../src/rpc/types";
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

describe("Discovery Router", () => {
  const db = getTestDatabase();

  beforeEach(async () => {
    await cleanAllTables();
  });

  afterEach(async () => {
    await cleanAllTables();
  });

  // ===========================================================================
  // discovery.searchUsers Tests
  // ===========================================================================

  describe("discovery.searchUsers", () => {
    it("should search users by username successfully", async () => {
      // Arrange: Create users with different usernames
      await buildUser().username("alice").withProfile({ displayName: "Alice Wonder" }).build();
      await buildUser().username("bob").withProfile({ displayName: "Bob Builder" }).build();
      await buildUser().username("alicia").withProfile({ displayName: "Alicia Keys" }).build();

      const ctx = createMockContext({
        input: {
          query: "ali",
          limit: 20,
        },
      });

      // Act: Search for "ali"
      const result = await discoveryRouter["discovery.searchUsers"](ctx);

      // Assert: Returns users matching "ali" in username
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items.some((u) => u.username === "alice")).toBe(true);
      expect(result.items.some((u) => u.username === "alicia")).toBe(true);
      expect(result.items.some((u) => u.username === "bob")).toBe(false);
    });

    it("should search users by display name successfully", async () => {
      // Arrange: Create users with different display names
      await buildUser().username("user1").withProfile({ displayName: "John Smith" }).build();
      await buildUser().username("user2").withProfile({ displayName: "Johnny Depp" }).build();
      await buildUser().username("user3").withProfile({ displayName: "Jane Doe" }).build();

      const ctx = createMockContext({
        input: {
          query: "john",
          limit: 20,
        },
      });

      // Act: Search for "john"
      const result = await discoveryRouter["discovery.searchUsers"](ctx);

      // Assert: Returns users matching "john" in display name
      expect(result.items.length).toBeGreaterThanOrEqual(2);
      expect(result.items.some((u) => u.displayName === "John Smith")).toBe(true);
      expect(result.items.some((u) => u.displayName === "Johnny Depp")).toBe(true);
      expect(result.items.some((u) => u.displayName === "Jane Doe")).toBe(false);
    });

    it("should perform case-insensitive search", async () => {
      // Arrange: Create user with mixed case
      await buildUser().username("TechGuru").withProfile({ displayName: "Tech Guru" }).build();

      const ctx = createMockContext({
        input: {
          query: "TECHGURU",
          limit: 20,
        },
      });

      // Act: Search with uppercase
      const result = await discoveryRouter["discovery.searchUsers"](ctx);

      // Assert: Should find user regardless of case
      expect(result.items.length).toBe(1);
      expect(result.items[0].username).toBe("TechGuru");
    });

    it("should exclude private profiles from non-owners", async () => {
      // Arrange: Create users with different visibility
      await buildUser()
        .username("publicuser")
        .withProfile({ displayName: "Public User", visibility: "public" })
        .build();

      const { user: privateUser } = await buildUser()
        .username("privateuser")
        .withProfile({ displayName: "Private User", visibility: "private" })
        .build();

      const { user: viewer } = await buildUser().username("viewer").withProfile().build();

      const ctx = createMockContext({
        user: { id: viewer.id.toString(), username: viewer.username } as any,
        input: {
          query: "user",
          limit: 20,
        },
      });

      // Act: Search as non-owner
      const result = await discoveryRouter["discovery.searchUsers"](ctx);

      // Assert: Should only return public profile
      expect(result.items.some((u) => u.username === "publicuser")).toBe(true);
      expect(result.items.some((u) => u.username === "privateuser")).toBe(false);

      // Owner should be able to see their own private profile
      const ownerCtx = createMockContext({
        user: { id: privateUser.id.toString(), username: privateUser.username } as any,
        input: {
          query: "privateuser",
          limit: 20,
        },
      });

      const ownerResult = await discoveryRouter["discovery.searchUsers"](ownerCtx);
      expect(ownerResult.items.some((u) => u.username === "privateuser")).toBe(true);
    });

    it("should show followers-only profiles to followers", async () => {
      // Arrange: Create follower-only profile
      const { user: restrictedUser } = await buildUser()
        .username("restricted")
        .withProfile({ displayName: "Restricted", visibility: "followers" })
        .build();

      const { user: follower } = await buildUser().username("follower").withProfile().build();
      const { user: nonFollower } = await buildUser().username("nonfollower").withProfile().build();

      // Create follow relationship
      await db.userFollow.create({
        data: {
          followerId: follower.id,
          followingId: restrictedUser.id,
        },
      });

      // Act: Search as follower
      const followerCtx = createMockContext({
        user: { id: follower.id.toString(), username: follower.username } as any,
        input: {
          query: "restricted",
          limit: 20,
        },
      });

      const followerResult = await discoveryRouter["discovery.searchUsers"](followerCtx);
      expect(followerResult.items.some((u) => u.username === "restricted")).toBe(true);

      // Act: Search as non-follower
      const nonFollowerCtx = createMockContext({
        user: { id: nonFollower.id.toString(), username: nonFollower.username } as any,
        input: {
          query: "restricted",
          limit: 20,
        },
      });

      const nonFollowerResult = await discoveryRouter["discovery.searchUsers"](nonFollowerCtx);
      expect(nonFollowerResult.items.some((u) => u.username === "restricted")).toBe(false);
    });

    it("should support cursor-based pagination", async () => {
      // Arrange: Create multiple users
      for (let i = 0; i < 5; i++) {
        await buildUser()
          .username(`testuser${i}`)
          .withProfile({ displayName: `Test User ${i}` })
          .build();
      }

      // Act: Get first page
      const firstPage = await discoveryRouter["discovery.searchUsers"](
        createMockContext({
          input: {
            query: "test",
            limit: 3,
          },
        })
      );

      // Assert: Should have 3 items and nextCursor
      expect(firstPage.items.length).toBe(3);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).not.toBeNull();

      // Act: Get second page with cursor
      const secondPage = await discoveryRouter["discovery.searchUsers"](
        createMockContext({
          input: {
            query: "test",
            limit: 3,
            cursor: firstPage.nextCursor as string,
          },
        })
      );

      // Assert: Should have remaining items
      expect(secondPage.items.length).toBeGreaterThan(0);
      expect(secondPage.items.length).toBeLessThanOrEqual(3);
    });

    it("should return empty results for no matches", async () => {
      // Arrange: Create unrelated users
      await buildUser().username("alice").withProfile().build();
      await buildUser().username("bob").withProfile().build();

      const ctx = createMockContext({
        input: {
          query: "nonexistent",
          limit: 20,
        },
      });

      // Act: Search for non-existent user
      const result = await discoveryRouter["discovery.searchUsers"](ctx);

      // Assert: Empty results
      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it("should validate search query", async () => {
      // Empty query should fail
      const ctx = createMockContext({
        input: {
          query: "",
          limit: 20,
        },
      });

      await expect(discoveryRouter["discovery.searchUsers"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // discovery.searchPosts Tests
  // ===========================================================================

  describe("discovery.searchPosts", () => {
    it("should search posts by content successfully", async () => {
      // Arrange: Create posts with different content
      const { user } = await buildUser().username("author").withProfile().build();

      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "JavaScript is awesome!",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "TypeScript is better!",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Python programming",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        input: {
          query: "script",
          limit: 20,
        },
      });

      // Act: Search for "script"
      const result = await discoveryRouter["discovery.searchPosts"](ctx);

      // Assert: Returns posts matching "script"
      expect(result.items.length).toBe(2);
      expect(result.items.some((p) => p.content?.includes("JavaScript"))).toBe(true);
      expect(result.items.some((p) => p.content?.includes("TypeScript"))).toBe(true);
    });

    it("should perform case-insensitive post search", async () => {
      // Arrange: Create post
      const { user } = await buildUser().username("author").withProfile().build();

      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "React Development",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        input: {
          query: "REACT",
          limit: 20,
        },
      });

      // Act: Search with uppercase
      const result = await discoveryRouter["discovery.searchPosts"](ctx);

      // Assert: Should find post regardless of case
      expect(result.items.length).toBe(1);
      expect(result.items[0].content).toContain("React");
    });

    it("should exclude private posts from search results", async () => {
      // Arrange: Create public and private posts
      const { user } = await buildUser().username("author").withProfile().build();

      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Public announcement",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Private announcement",
          visibility: "private",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const { user: viewer } = await buildUser().username("viewer").withProfile().build();

      const ctx = createMockContext({
        user: { id: viewer.id.toString(), username: viewer.username } as any,
        input: {
          query: "announcement",
          limit: 20,
        },
      });

      // Act: Search as non-owner
      const result = await discoveryRouter["discovery.searchPosts"](ctx);

      // Assert: Should only return public post
      expect(result.items.length).toBe(1);
      expect(result.items[0].content).toBe("Public announcement");
    });

    it("should respect followers-only visibility in search", async () => {
      // Arrange: Create followers-only post
      const { user: author } = await buildUser().username("author").withProfile().build();
      const { user: follower } = await buildUser().username("follower").withProfile().build();
      const { user: nonFollower } = await buildUser().username("nonfollower").withProfile().build();

      await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Followers only content",
          visibility: "followers",
          status: "published",
          publishedAt: new Date(),
        },
      });

      // Create follow relationship
      await db.userFollow.create({
        data: {
          followerId: follower.id,
          followingId: author.id,
        },
      });

      // Act: Search as follower
      const followerCtx = createMockContext({
        user: { id: follower.id, username: follower.username } as any,
        input: {
          query: "content",
          limit: 20,
        },
      });

      const followerResult = await discoveryRouter["discovery.searchPosts"](followerCtx);
      expect(followerResult.items.length).toBe(1);

      // Act: Search as non-follower
      const nonFollowerCtx = createMockContext({
        user: { id: nonFollower.id, username: nonFollower.username } as any,
        input: {
          query: "content",
          limit: 20,
        },
      });

      const nonFollowerResult = await discoveryRouter["discovery.searchPosts"](nonFollowerCtx);
      expect(nonFollowerResult.items.length).toBe(0);
    });

    it("should exclude deleted posts from search", async () => {
      // Arrange: Create active and deleted posts
      const { user } = await buildUser().username("author").withProfile().build();

      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Active post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Deleted post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
          deletedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        input: {
          query: "post",
          limit: 20,
        },
      });

      // Act: Search
      const result = await discoveryRouter["discovery.searchPosts"](ctx);

      // Assert: Should only return active post
      expect(result.items.length).toBe(1);
      expect(result.items[0].content).toBe("Active post");
    });

    it("should sort by engagement (likes) and recency", async () => {
      // Arrange: Create posts with different engagement
      const { user } = await buildUser().username("author").withProfile().build();

      const oldPopular = await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Old popular post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(Date.now() - 86400000 * 2), // 2 days ago
          likesCount: 100,
        },
      });

      const newPopular = await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "New popular post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
          likesCount: 50,
        },
      });

      const ctx = createMockContext({
        input: {
          query: "post",
          limit: 20,
        },
      });

      // Act: Search
      const result = await discoveryRouter["discovery.searchPosts"](ctx);

      // Assert: Should be sorted by likes DESC first
      expect(result.items.length).toBe(2);
      expect(result.items[0].id).toBe(oldPopular.id.toString());
      expect(result.items[1].id).toBe(newPopular.id.toString());
    });

    it("should support cursor-based pagination for posts", async () => {
      // Arrange: Create multiple posts
      const { user } = await buildUser().username("author").withProfile().build();

      for (let i = 0; i < 5; i++) {
        await db.post.create({
          data: {
            userId: user.id,
            type: "text_short",
            content: `Test post number ${i}`,
            visibility: "public",
            status: "published",
            publishedAt: new Date(),
          },
        });
      }

      // Act: Get first page
      const firstPage = await discoveryRouter["discovery.searchPosts"](
        createMockContext({
          input: {
            query: "test",
            limit: 3,
          },
        })
      );

      // Assert: Should have pagination
      expect(firstPage.items.length).toBe(3);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).not.toBeNull();

      // Act: Get second page
      const secondPage = await discoveryRouter["discovery.searchPosts"](
        createMockContext({
          input: {
            query: "test",
            limit: 3,
            cursor: firstPage.nextCursor as string,
          },
        })
      );

      // Assert: Should have remaining items
      expect(secondPage.items.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // discovery.getDiscoverFeed Tests
  // ===========================================================================

  describe("discovery.getDiscoverFeed", () => {
    it("should require authentication", async () => {
      // Arrange: Unauthenticated context
      const ctx = createMockContext({
        user: null,
        input: {
          limit: 20,
        },
      });

      // Act & Assert: Should fail with UNAUTHORIZED
      await expect(discoveryRouter["discovery.getDiscoverFeed"](ctx)).rejects.toThrow();
    });

    it("should return posts from direct friends (Level 1)", async () => {
      // Arrange: Create user network
      const { user: currentUser } = await buildUser().username("me").withProfile().build();
      const { user: friend } = await buildUser().username("friend").withProfile().build();

      // Create friendship
      await db.friendship.create({
        data: {
          userId1: currentUser.id < friend.id ? currentUser.id : friend.id,
          userId2: currentUser.id < friend.id ? friend.id : currentUser.id,
        },
      });

      // Friend creates a post
      await db.post.create({
        data: {
          userId: friend.id,
          type: "text_short",
          content: "Friend's post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: { id: currentUser.id.toString(), username: currentUser.username } as any,
        input: {
          limit: 20,
        },
      });

      // Act: Get discover feed
      const result = await discoveryRouter["discovery.getDiscoverFeed"](ctx);

      // Assert: Should include friend's post
      expect(result.items.length).toBe(1);
      expect(result.items[0].content).toBe("Friend's post");
    });

    it("should return posts from users I follow (Level 1)", async () => {
      // Arrange: Create follow relationship
      const { user: currentUser } = await buildUser().username("me").withProfile().build();
      const { user: followedUser } = await buildUser().username("followed").withProfile().build();

      // Create follow relationship
      await db.userFollow.create({
        data: {
          followerId: currentUser.id,
          followingId: followedUser.id,
        },
      });

      // Followed user creates a post
      await db.post.create({
        data: {
          userId: followedUser.id,
          type: "text_short",
          content: "Followed user's post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: { id: currentUser.id.toString(), username: currentUser.username } as any,
        input: {
          limit: 20,
        },
      });

      // Act: Get discover feed
      const result = await discoveryRouter["discovery.getDiscoverFeed"](ctx);

      // Assert: Should include followed user's post
      expect(result.items.length).toBe(1);
      expect(result.items[0].content).toBe("Followed user's post");
    });

    it("should return posts from friends-of-friends (Level 2)", async () => {
      // Arrange: Create 2-degree network
      const { user: currentUser } = await buildUser().username("me").withProfile().build();
      const { user: friend } = await buildUser().username("friend").withProfile().build();
      const { user: friendOfFriend } = await buildUser().username("fof").withProfile().build();

      // Current user -> friend
      await db.friendship.create({
        data: {
          userId1: currentUser.id < friend.id ? currentUser.id : friend.id,
          userId2: currentUser.id < friend.id ? friend.id : currentUser.id,
        },
      });

      // Friend -> friend of friend
      await db.friendship.create({
        data: {
          userId1: friend.id < friendOfFriend.id ? friend.id : friendOfFriend.id,
          userId2: friend.id < friendOfFriend.id ? friendOfFriend.id : friend.id,
        },
      });

      // Friend of friend creates a post
      await db.post.create({
        data: {
          userId: friendOfFriend.id,
          type: "text_short",
          content: "Friend of friend's post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: { id: currentUser.id.toString(), username: currentUser.username } as any,
        input: {
          limit: 20,
        },
      });

      // Act: Get discover feed
      const result = await discoveryRouter["discovery.getDiscoverFeed"](ctx);

      // Assert: Should include friend-of-friend's post
      expect(result.items.length).toBe(1);
      expect(result.items[0].content).toBe("Friend of friend's post");
    });

    it("should return posts from followers of followed users (Level 2)", async () => {
      // Arrange: Create 2-degree follow network
      const { user: currentUser } = await buildUser().username("me").withProfile().build();
      const { user: followedUser } = await buildUser().username("followed").withProfile().build();
      const { user: followerOfFollowed } = await buildUser()
        .username("followeroffollowed")
        .withProfile()
        .build();

      // Current user follows someone
      await db.userFollow.create({
        data: {
          followerId: currentUser.id,
          followingId: followedUser.id,
        },
      });

      // Another user also follows that person
      await db.userFollow.create({
        data: {
          followerId: followerOfFollowed.id,
          followingId: followedUser.id,
        },
      });

      // Follower of followed creates a post
      await db.post.create({
        data: {
          userId: followerOfFollowed.id,
          type: "text_short",
          content: "Second-degree follower's post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: { id: currentUser.id.toString(), username: currentUser.username } as any,
        input: {
          limit: 20,
        },
      });

      // Act: Get discover feed
      const result = await discoveryRouter["discovery.getDiscoverFeed"](ctx);

      // Assert: Should include second-degree follower's post
      expect(result.items.length).toBe(1);
      expect(result.items[0].content).toBe("Second-degree follower's post");
    });

    it("should exclude posts from users outside 2-degree network", async () => {
      // Arrange: Create disconnected users
      const { user: currentUser } = await buildUser().username("me").withProfile().build();
      const { user: stranger } = await buildUser().username("stranger").withProfile().build();

      // Stranger creates a post
      await db.post.create({
        data: {
          userId: stranger.id,
          type: "text_short",
          content: "Stranger's post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: { id: currentUser.id.toString(), username: currentUser.username } as any,
        input: {
          limit: 20,
        },
      });

      // Act: Get discover feed
      const result = await discoveryRouter["discovery.getDiscoverFeed"](ctx);

      // Assert: Should not include stranger's post
      expect(result.items.length).toBe(0);
    });

    it("should sort by engagement (likes) and recency", async () => {
      // Arrange: Create network and posts
      const { user: currentUser } = await buildUser().username("me").withProfile().build();
      const { user: friend } = await buildUser().username("friend").withProfile().build();

      await db.friendship.create({
        data: {
          userId1: currentUser.id < friend.id ? currentUser.id : friend.id,
          userId2: currentUser.id < friend.id ? friend.id : currentUser.id,
        },
      });

      // Create posts with different engagement
      const popularPost = await db.post.create({
        data: {
          userId: friend.id,
          type: "text_short",
          content: "Popular post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(Date.now() - 86400000),
          likesCount: 100,
        },
      });

      const recentPost = await db.post.create({
        data: {
          userId: friend.id,
          type: "text_short",
          content: "Recent post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
          likesCount: 10,
        },
      });

      const ctx = createMockContext({
        user: { id: currentUser.id.toString(), username: currentUser.username } as any,
        input: {
          limit: 20,
        },
      });

      // Act: Get discover feed
      const result = await discoveryRouter["discovery.getDiscoverFeed"](ctx);

      // Assert: Should be sorted by likes first
      expect(result.items.length).toBe(2);
      expect(result.items[0].id).toBe(popularPost.id.toString());
      expect(result.items[1].id).toBe(recentPost.id.toString());
    });

    it("should exclude deleted posts from discover feed", async () => {
      // Arrange: Create network and posts
      const { user: currentUser } = await buildUser().username("me").withProfile().build();
      const { user: friend } = await buildUser().username("friend").withProfile().build();

      await db.friendship.create({
        data: {
          userId1: currentUser.id < friend.id ? currentUser.id : friend.id,
          userId2: currentUser.id < friend.id ? friend.id : currentUser.id,
        },
      });

      // Create active and deleted posts
      await db.post.create({
        data: {
          userId: friend.id,
          type: "text_short",
          content: "Active post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      await db.post.create({
        data: {
          userId: friend.id,
          type: "text_short",
          content: "Deleted post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
          deletedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: { id: currentUser.id.toString(), username: currentUser.username } as any,
        input: {
          limit: 20,
        },
      });

      // Act: Get discover feed
      const result = await discoveryRouter["discovery.getDiscoverFeed"](ctx);

      // Assert: Should only return active post
      expect(result.items.length).toBe(1);
      expect(result.items[0].content).toBe("Active post");
    });

    it("should support cursor-based pagination", async () => {
      // Arrange: Create network with many posts
      const { user: currentUser } = await buildUser().username("me").withProfile().build();
      const { user: friend } = await buildUser().username("friend").withProfile().build();

      await db.friendship.create({
        data: {
          userId1: currentUser.id < friend.id ? currentUser.id : friend.id,
          userId2: currentUser.id < friend.id ? friend.id : currentUser.id,
        },
      });

      // Create multiple posts
      for (let i = 0; i < 5; i++) {
        await db.post.create({
          data: {
            userId: friend.id,
            type: "text_short",
            content: `Post ${i}`,
            visibility: "public",
            status: "published",
            publishedAt: new Date(),
          },
        });
      }

      // Act: Get first page
      const firstPage = await discoveryRouter["discovery.getDiscoverFeed"](
        createMockContext({
          user: { id: currentUser.id.toString(), username: currentUser.username } as any,
          input: {
            limit: 3,
          },
        })
      );

      // Assert: Should have pagination
      expect(firstPage.items.length).toBe(3);
      expect(firstPage.hasMore).toBe(true);
      expect(firstPage.nextCursor).not.toBeNull();

      // Act: Get second page
      const secondPage = await discoveryRouter["discovery.getDiscoverFeed"](
        createMockContext({
          user: { id: currentUser.id.toString(), username: currentUser.username } as any,
          input: {
            limit: 3,
            cursor: firstPage.nextCursor as string,
          },
        })
      );

      // Assert: Should have remaining items (may be fewer due to cursor pagination filtering)
      expect(secondPage.items.length).toBeGreaterThan(0);
      expect(secondPage.items.length).toBeLessThanOrEqual(2);
    });

    it("should return empty feed when user has no network", async () => {
      // Arrange: Isolated user
      const { user: currentUser } = await buildUser().username("isolated").withProfile().build();

      const ctx = createMockContext({
        user: { id: currentUser.id.toString(), username: currentUser.username } as any,
        input: {
          limit: 20,
        },
      });

      // Act: Get discover feed
      const result = await discoveryRouter["discovery.getDiscoverFeed"](ctx);

      // Assert: Should be empty
      expect(result.items).toEqual([]);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it("should only show public posts in discover feed", async () => {
      // Arrange: Create network with posts of different visibility
      const { user: currentUser } = await buildUser().username("me").withProfile().build();
      const { user: friend } = await buildUser().username("friend").withProfile().build();

      await db.friendship.create({
        data: {
          userId1: currentUser.id < friend.id ? currentUser.id : friend.id,
          userId2: currentUser.id < friend.id ? friend.id : currentUser.id,
        },
      });

      // Create public, followers, and private posts
      await db.post.create({
        data: {
          userId: friend.id,
          type: "text_short",
          content: "Public post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      await db.post.create({
        data: {
          userId: friend.id,
          type: "text_short",
          content: "Followers only post",
          visibility: "followers",
          status: "published",
          publishedAt: new Date(),
        },
      });

      await db.post.create({
        data: {
          userId: friend.id,
          type: "text_short",
          content: "Private post",
          visibility: "private",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: { id: currentUser.id.toString(), username: currentUser.username } as any,
        input: {
          limit: 20,
        },
      });

      // Act: Get discover feed
      const result = await discoveryRouter["discovery.getDiscoverFeed"](ctx);

      // Assert: Should only show public posts
      expect(result.items.length).toBe(1);
      expect(result.items[0].content).toBe("Public post");
    });
  });
});
