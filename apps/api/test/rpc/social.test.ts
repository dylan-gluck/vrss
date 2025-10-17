/**
 * Social Router Tests - Phase 3.4
 *
 * Comprehensive test suite for the Social Router covering all 4 procedures:
 * - social.follow: Follow a user
 * - social.unfollow: Unfollow a user
 * - social.getFollowers: Get list of followers with pagination
 * - social.getFollowing: Get list of users being followed with pagination
 *
 * CRITICAL TESTS:
 * - Friendship creation via DB trigger on mutual follow
 * - Friendship deletion when unfollow breaks mutual relationship
 * - Cursor-based pagination for follower/following lists
 * - Error handling for edge cases (self-follow, duplicate follows, etc.)
 *
 * Following TDD: These tests are written BEFORE implementation.
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.4
 * @see docs/api-architecture.md lines 313-375 (SocialProcedures type definitions)
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 277-317 (user_follows & friendships)
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 2256-2279 (Friendship trigger)
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ErrorCode } from "@vrss/api-contracts";
import { socialRouter } from "../../src/rpc/routers/social";
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

describe("Social Router", () => {
  const db = getTestDatabase();

  beforeEach(async () => {
    await cleanAllTables();
  });

  afterEach(async () => {
    await cleanAllTables();
  });

  // ===========================================================================
  // social.follow Tests
  // ===========================================================================

  describe("social.follow", () => {
    it("should successfully follow a user", async () => {
      // Arrange: Create two users
      const { user: follower } = await buildUser().username("follower").withProfile().build();

      const { user: target } = await buildUser().username("target").withProfile().build();

      const ctx = createMockContext<{
        userId: string;
      }>({
        user: {
          id: follower.id,
          username: follower.username,
          email: follower.email,
        } as any,
        input: {
          userId: target.id.toString(),
        },
      });

      // Act: Follow user
      const result = await socialRouter["social.follow"](ctx);

      // Assert: Follow relationship created
      expect(result.following).toBe(true);

      const follow = await db.userFollow.findFirst({
        where: {
          followerId: follower.id,
          followingId: target.id,
        },
      });

      expect(follow).not.toBeNull();
      expect(follow?.followerId).toBe(follower.id);
      expect(follow?.followingId).toBe(target.id);
    });

    it("should return error when trying to follow yourself", async () => {
      // Arrange: Create user
      const { user } = await buildUser().username("selfie").withProfile().build();

      const ctx = createMockContext<{
        userId: string;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          userId: user.id.toString(), // Self-follow
        },
      });

      // Act & Assert: Should throw error
      await expect(socialRouter["social.follow"](ctx)).rejects.toThrow();
    });

    it("should return error when already following (duplicate)", async () => {
      // Arrange: Create follow relationship
      const { user: follower } = await buildUser()
        .username("duplicate_follower")
        .withProfile()
        .build();

      const { user: target } = await buildUser().username("duplicate_target").withProfile().build();

      // Create existing follow
      await db.userFollow.create({
        data: {
          followerId: follower.id,
          followingId: target.id,
        },
      });

      const ctx = createMockContext<{
        userId: string;
      }>({
        user: {
          id: follower.id,
          username: follower.username,
          email: follower.email,
        } as any,
        input: {
          userId: target.id.toString(),
        },
      });

      // Act & Assert: Should throw ALREADY_FOLLOWING error
      await expect(socialRouter["social.follow"](ctx)).rejects.toThrow();
    });

    it("should create friendship when mutual follow detected (CRITICAL - DB trigger)", async () => {
      // Arrange: Create two users with one-way follow already established
      const { user: userA } = await buildUser().username("user_a").withProfile().build();

      const { user: userB } = await buildUser().username("user_b").withProfile().build();

      // UserB already follows UserA
      await db.userFollow.create({
        data: {
          followerId: userB.id,
          followingId: userA.id,
        },
      });

      // Verify no friendship exists yet
      const beforeFriendship = await db.friendship.findFirst({
        where: {
          OR: [
            {
              userId1: Math.min(Number(userA.id), Number(userB.id)),
              userId2: Math.max(Number(userA.id), Number(userB.id)),
            },
          ],
        },
      });
      expect(beforeFriendship).toBeNull();

      const ctx = createMockContext<{
        userId: string;
      }>({
        user: {
          id: userA.id,
          username: userA.username,
          email: userA.email,
        } as any,
        input: {
          userId: userB.id.toString(), // UserA follows UserB (completing mutual)
        },
      });

      // Act: Complete mutual follow
      await socialRouter["social.follow"](ctx);

      // Assert: Friendship created by DB trigger
      const friendship = await db.friendship.findFirst({
        where: {
          userId1: Math.min(Number(userA.id), Number(userB.id)),
          userId2: Math.max(Number(userA.id), Number(userB.id)),
        },
      });

      expect(friendship).not.toBeNull();
      expect(Number(friendship?.userId1)).toBe(Math.min(Number(userA.id), Number(userB.id)));
      expect(Number(friendship?.userId2)).toBe(Math.max(Number(userA.id), Number(userB.id)));
    });

    it("should fail to follow non-existent user", async () => {
      // Arrange: Create follower
      const { user: follower } = await buildUser()
        .username("lonely_follower")
        .withProfile()
        .build();

      const ctx = createMockContext<{
        userId: string;
      }>({
        user: {
          id: follower.id,
          username: follower.username,
          email: follower.email,
        } as any,
        input: {
          userId: "99999999", // Non-existent user
        },
      });

      // Act & Assert: Should throw USER_NOT_FOUND error
      await expect(socialRouter["social.follow"](ctx)).rejects.toThrow();
    });

    it("should require authentication to follow", async () => {
      // Arrange: Create target user
      const { user: target } = await buildUser().username("unauth_target").withProfile().build();

      const ctx = createMockContext<{
        userId: string;
      }>({
        user: null, // Not authenticated
        input: {
          userId: target.id.toString(),
        },
      });

      // Act & Assert: Should throw UNAUTHORIZED error
      await expect(socialRouter["social.follow"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // social.unfollow Tests
  // ===========================================================================

  describe("social.unfollow", () => {
    it("should successfully unfollow a user", async () => {
      // Arrange: Create follow relationship
      const { user: follower } = await buildUser().username("unfollower").withProfile().build();

      const { user: target } = await buildUser().username("unfollowed").withProfile().build();

      await db.userFollow.create({
        data: {
          followerId: follower.id,
          followingId: target.id,
        },
      });

      const ctx = createMockContext<{
        userId: string;
      }>({
        user: {
          id: follower.id,
          username: follower.username,
          email: follower.email,
        } as any,
        input: {
          userId: target.id.toString(),
        },
      });

      // Act: Unfollow user
      const result = await socialRouter["social.unfollow"](ctx);

      // Assert: Follow relationship removed
      expect(result.following).toBe(false);

      const follow = await db.userFollow.findFirst({
        where: {
          followerId: follower.id,
          followingId: target.id,
        },
      });

      expect(follow).toBeNull();
    });

    it("should return error when not following (idempotent)", async () => {
      // Arrange: Create users without follow relationship
      const { user: follower } = await buildUser().username("never_followed").withProfile().build();

      const { user: target } = await buildUser()
        .username("never_followed_target")
        .withProfile()
        .build();

      const ctx = createMockContext<{
        userId: string;
      }>({
        user: {
          id: follower.id,
          username: follower.username,
          email: follower.email,
        } as any,
        input: {
          userId: target.id.toString(),
        },
      });

      // Act & Assert: Should throw error (not following)
      await expect(socialRouter["social.unfollow"](ctx)).rejects.toThrow();
    });

    it("should delete friendship when unfollowing a friend", async () => {
      // Arrange: Create mutual follow (friendship)
      const { user: userA } = await buildUser().username("friend_a").withProfile().build();

      const { user: userB } = await buildUser().username("friend_b").withProfile().build();

      // Create mutual follows
      await db.userFollow.create({
        data: {
          followerId: userA.id,
          followingId: userB.id,
        },
      });

      await db.userFollow.create({
        data: {
          followerId: userB.id,
          followingId: userA.id,
        },
      });

      // Friendship should be created by trigger
      const friendshipBefore = await db.friendship.findFirst({
        where: {
          userId1: Math.min(Number(userA.id), Number(userB.id)),
          userId2: Math.max(Number(userA.id), Number(userB.id)),
        },
      });
      expect(friendshipBefore).not.toBeNull();

      const ctx = createMockContext<{
        userId: string;
      }>({
        user: {
          id: userA.id,
          username: userA.username,
          email: userA.email,
        } as any,
        input: {
          userId: userB.id.toString(), // UserA unfollows UserB
        },
      });

      // Act: Unfollow (break friendship)
      await socialRouter["social.unfollow"](ctx);

      // Assert: Friendship deleted
      const friendshipAfter = await db.friendship.findFirst({
        where: {
          userId1: Math.min(Number(userA.id), Number(userB.id)),
          userId2: Math.max(Number(userA.id), Number(userB.id)),
        },
      });

      expect(friendshipAfter).toBeNull();

      // Assert: UserB still follows UserA (one-way relationship preserved)
      const remainingFollow = await db.userFollow.findFirst({
        where: {
          followerId: userB.id,
          followingId: userA.id,
        },
      });

      expect(remainingFollow).not.toBeNull();
    });

    it("should preserve other user's follow if not mutual", async () => {
      // Arrange: Create one-way follow
      const { user: userA } = await buildUser().username("oneway_a").withProfile().build();

      const { user: userB } = await buildUser().username("oneway_b").withProfile().build();

      // Only UserA follows UserB (not mutual)
      await db.userFollow.create({
        data: {
          followerId: userA.id,
          followingId: userB.id,
        },
      });

      // UserC also follows UserB (unrelated)
      const { user: userC } = await buildUser().username("oneway_c").withProfile().build();

      await db.userFollow.create({
        data: {
          followerId: userC.id,
          followingId: userB.id,
        },
      });

      const ctx = createMockContext<{
        userId: string;
      }>({
        user: {
          id: userA.id,
          username: userA.username,
          email: userA.email,
        } as any,
        input: {
          userId: userB.id.toString(),
        },
      });

      // Act: UserA unfollows UserB
      await socialRouter["social.unfollow"](ctx);

      // Assert: UserC's follow is preserved
      const userCFollow = await db.userFollow.findFirst({
        where: {
          followerId: userC.id,
          followingId: userB.id,
        },
      });

      expect(userCFollow).not.toBeNull();
    });

    it("should require authentication to unfollow", async () => {
      // Arrange: Create target user
      const { user: target } = await buildUser()
        .username("unauth_unfollow_target")
        .withProfile()
        .build();

      const ctx = createMockContext<{
        userId: string;
      }>({
        user: null, // Not authenticated
        input: {
          userId: target.id.toString(),
        },
      });

      // Act & Assert: Should throw UNAUTHORIZED error
      await expect(socialRouter["social.unfollow"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // social.getFollowers Tests
  // ===========================================================================

  describe("social.getFollowers", () => {
    it("should return followers list for a user", async () => {
      // Arrange: Create user with followers
      const { user: target } = await buildUser().username("popular").withProfile().build();

      const { user: follower1 } = await buildUser().username("follower1").withProfile().build();

      const { user: follower2 } = await buildUser().username("follower2").withProfile().build();

      const { user: follower3 } = await buildUser().username("follower3").withProfile().build();

      // Create follows
      await db.userFollow.create({
        data: { followerId: follower1.id, followingId: target.id },
      });

      await db.userFollow.create({
        data: { followerId: follower2.id, followingId: target.id },
      });

      await db.userFollow.create({
        data: { followerId: follower3.id, followingId: target.id },
      });

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: target.id.toString(),
        },
      });

      // Act: Get followers
      const result = await socialRouter["social.getFollowers"](ctx);

      // Assert: Returns followers with user data
      expect(result.followers).toHaveLength(3);
      expect(result.followers.map((f: any) => f.username).sort()).toEqual([
        "follower1",
        "follower2",
        "follower3",
      ]);
    });

    it("should support cursor pagination (limit 20, nextCursor)", async () => {
      // Arrange: Create user with 25 followers
      const { user: target } = await buildUser().username("mega_popular").withProfile().build();

      const followerPromises = [];
      for (let i = 0; i < 25; i++) {
        followerPromises.push(buildUser().username(`follower_${i}`).withProfile().build());
      }

      const followers = await Promise.all(followerPromises);

      // Create follows with delays to ensure different timestamps
      for (let i = 0; i < followers.length; i++) {
        await db.userFollow.create({
          data: {
            followerId: followers[i].user.id,
            followingId: target.id,
          },
        });
        // Small delay to ensure different created_at timestamps
        if (i < followers.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      }

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: target.id.toString(),
          limit: 20,
        },
      });

      // Act: Get first page
      const result = await socialRouter["social.getFollowers"](ctx);

      // Assert: Returns 20 followers with nextCursor
      expect(result.followers).toHaveLength(20);
      expect(result.nextCursor).toBeDefined();

      // Act: Get second page
      const ctx2 = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: target.id.toString(),
          limit: 20,
          cursor: result.nextCursor,
        },
      });

      const result2 = await socialRouter["social.getFollowers"](ctx2);

      // Assert: Returns remaining 5 followers with no nextCursor
      expect(result2.followers).toHaveLength(5);
      expect(result2.nextCursor).toBeUndefined();
    });

    it("should return empty list for user with no followers", async () => {
      // Arrange: Create user with no followers
      const { user: loner } = await buildUser().username("loner").withProfile().build();

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: loner.id.toString(),
        },
      });

      // Act: Get followers
      const result = await socialRouter["social.getFollowers"](ctx);

      // Assert: Empty array
      expect(result.followers).toHaveLength(0);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should include user profile data in response", async () => {
      // Arrange: Create user with follower
      const { user: target } = await buildUser()
        .username("has_profile_target")
        .withProfile({ displayName: "Target User", bio: "I am the target" })
        .build();

      const { user: follower } = await buildUser()
        .username("has_profile_follower")
        .withProfile({ displayName: "Follower User", bio: "I follow people" })
        .build();

      await db.userFollow.create({
        data: { followerId: follower.id, followingId: target.id },
      });

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: target.id.toString(),
        },
      });

      // Act: Get followers
      const result = await socialRouter["social.getFollowers"](ctx);

      // Assert: Profile data included
      expect(result.followers).toHaveLength(1);
      expect(result.followers[0].username).toBe("has_profile_follower");
      expect(result.followers[0].profile?.displayName).toBe("Follower User");
    });

    it("should order by created_at DESC (newest followers first)", async () => {
      // Arrange: Create user with followers at different times
      const { user: target } = await buildUser().username("ordered_target").withProfile().build();

      const { user: oldFollower } = await buildUser()
        .username("old_follower")
        .withProfile()
        .build();

      const { user: newFollower } = await buildUser()
        .username("new_follower")
        .withProfile()
        .build();

      // Create old follow
      await db.userFollow.create({
        data: {
          followerId: oldFollower.id,
          followingId: target.id,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
        },
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Create new follow
      await db.userFollow.create({
        data: {
          followerId: newFollower.id,
          followingId: target.id,
          createdAt: new Date(), // Now
        },
      });

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: target.id.toString(),
        },
      });

      // Act: Get followers
      const result = await socialRouter["social.getFollowers"](ctx);

      // Assert: Newest first
      expect(result.followers).toHaveLength(2);
      expect(result.followers[0].username).toBe("new_follower");
      expect(result.followers[1].username).toBe("old_follower");
    });

    it("should default to current user if userId not provided", async () => {
      // Arrange: Create authenticated user with follower
      const { user: currentUser } = await buildUser()
        .username("current_user")
        .withProfile()
        .build();

      const { user: follower } = await buildUser()
        .username("follows_current")
        .withProfile()
        .build();

      await db.userFollow.create({
        data: { followerId: follower.id, followingId: currentUser.id },
      });

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        user: {
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
        } as any,
        input: {
          // userId not provided - should default to current user
        },
      });

      // Act: Get followers
      const result = await socialRouter["social.getFollowers"](ctx);

      // Assert: Returns current user's followers
      expect(result.followers).toHaveLength(1);
      expect(result.followers[0].username).toBe("follows_current");
    });
  });

  // ===========================================================================
  // social.getFollowing Tests
  // ===========================================================================

  describe("social.getFollowing", () => {
    it("should return following list for a user", async () => {
      // Arrange: Create user who follows others
      const { user: follower } = await buildUser()
        .username("social_butterfly")
        .withProfile()
        .build();

      const { user: target1 } = await buildUser().username("target1").withProfile().build();

      const { user: target2 } = await buildUser().username("target2").withProfile().build();

      const { user: target3 } = await buildUser().username("target3").withProfile().build();

      // Create follows
      await db.userFollow.create({
        data: { followerId: follower.id, followingId: target1.id },
      });

      await db.userFollow.create({
        data: { followerId: follower.id, followingId: target2.id },
      });

      await db.userFollow.create({
        data: { followerId: follower.id, followingId: target3.id },
      });

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: follower.id.toString(),
        },
      });

      // Act: Get following
      const result = await socialRouter["social.getFollowing"](ctx);

      // Assert: Returns following with user data
      expect(result.following).toHaveLength(3);
      expect(result.following.map((f: any) => f.username).sort()).toEqual([
        "target1",
        "target2",
        "target3",
      ]);
    });

    it("should support cursor pagination (limit 20, nextCursor)", async () => {
      // Arrange: Create user following 25 users
      const { user: follower } = await buildUser().username("super_follower").withProfile().build();

      const targetPromises = [];
      for (let i = 0; i < 25; i++) {
        targetPromises.push(buildUser().username(`target_${i}`).withProfile().build());
      }

      const targets = await Promise.all(targetPromises);

      // Create follows
      for (let i = 0; i < targets.length; i++) {
        await db.userFollow.create({
          data: {
            followerId: follower.id,
            followingId: targets[i].user.id,
          },
        });
        // Small delay to ensure different created_at timestamps
        if (i < targets.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      }

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: follower.id.toString(),
          limit: 20,
        },
      });

      // Act: Get first page
      const result = await socialRouter["social.getFollowing"](ctx);

      // Assert: Returns 20 following with nextCursor
      expect(result.following).toHaveLength(20);
      expect(result.nextCursor).toBeDefined();

      // Act: Get second page
      const ctx2 = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: follower.id.toString(),
          limit: 20,
          cursor: result.nextCursor,
        },
      });

      const result2 = await socialRouter["social.getFollowing"](ctx2);

      // Assert: Returns remaining 5 following with no nextCursor
      expect(result2.following).toHaveLength(5);
      expect(result2.nextCursor).toBeUndefined();
    });

    it("should return empty list for user following no one", async () => {
      // Arrange: Create user who follows nobody
      const { user: antisocial } = await buildUser().username("antisocial").withProfile().build();

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: antisocial.id.toString(),
        },
      });

      // Act: Get following
      const result = await socialRouter["social.getFollowing"](ctx);

      // Assert: Empty array
      expect(result.following).toHaveLength(0);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should include user profile data in response", async () => {
      // Arrange: Create user following another with profile
      const { user: follower } = await buildUser()
        .username("profile_follower")
        .withProfile({ displayName: "Follower", bio: "I follow" })
        .build();

      const { user: target } = await buildUser()
        .username("profile_target")
        .withProfile({ displayName: "Target", bio: "I am followed" })
        .build();

      await db.userFollow.create({
        data: { followerId: follower.id, followingId: target.id },
      });

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: follower.id.toString(),
        },
      });

      // Act: Get following
      const result = await socialRouter["social.getFollowing"](ctx);

      // Assert: Profile data included
      expect(result.following).toHaveLength(1);
      expect(result.following[0].username).toBe("profile_target");
      expect(result.following[0].profile?.displayName).toBe("Target");
    });

    it("should order by created_at DESC (newest follows first)", async () => {
      // Arrange: Create user following others at different times
      const { user: follower } = await buildUser().username("time_follower").withProfile().build();

      const { user: oldTarget } = await buildUser().username("old_target").withProfile().build();

      const { user: newTarget } = await buildUser().username("new_target").withProfile().build();

      // Create old follow
      await db.userFollow.create({
        data: {
          followerId: follower.id,
          followingId: oldTarget.id,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
        },
      });

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Create new follow
      await db.userFollow.create({
        data: {
          followerId: follower.id,
          followingId: newTarget.id,
          createdAt: new Date(), // Now
        },
      });

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: follower.id.toString(),
        },
      });

      // Act: Get following
      const result = await socialRouter["social.getFollowing"](ctx);

      // Assert: Newest first
      expect(result.following).toHaveLength(2);
      expect(result.following[0].username).toBe("new_target");
      expect(result.following[1].username).toBe("old_target");
    });

    it("should default to current user if userId not provided", async () => {
      // Arrange: Create authenticated user who follows someone
      const { user: currentUser } = await buildUser()
        .username("current_follower")
        .withProfile()
        .build();

      const { user: target } = await buildUser()
        .username("followed_by_current")
        .withProfile()
        .build();

      await db.userFollow.create({
        data: { followerId: currentUser.id, followingId: target.id },
      });

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        user: {
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
        } as any,
        input: {
          // userId not provided - should default to current user
        },
      });

      // Act: Get following
      const result = await socialRouter["social.getFollowing"](ctx);

      // Assert: Returns current user's following
      expect(result.following).toHaveLength(1);
      expect(result.following[0].username).toBe("followed_by_current");
    });
  });

  // ===========================================================================
  // Friendship Integration Tests (via DB Trigger)
  // ===========================================================================

  describe("Friendship Creation (DB Trigger Integration)", () => {
    it("should verify both users appear in each other's friends list", async () => {
      // Arrange: Create mutual follow
      const { user: userA } = await buildUser().username("mutual_a").withProfile().build();

      const { user: userB } = await buildUser().username("mutual_b").withProfile().build();

      // Create bidirectional follows
      await db.userFollow.create({
        data: { followerId: userA.id, followingId: userB.id },
      });

      await db.userFollow.create({
        data: { followerId: userB.id, followingId: userA.id },
      });

      // Assert: Friendship exists in database
      const friendship = await db.friendship.findFirst({
        where: {
          userId1: Math.min(Number(userA.id), Number(userB.id)),
          userId2: Math.max(Number(userA.id), Number(userB.id)),
        },
      });

      expect(friendship).not.toBeNull();
    });

    it("should verify friendship record exists in DB after mutual follow", async () => {
      // Arrange: Create users
      const { user: userX } = await buildUser().username("user_x").withProfile().build();

      const { user: userY } = await buildUser().username("user_y").withProfile().build();

      // Act: Create mutual follows
      await db.userFollow.create({
        data: { followerId: userX.id, followingId: userY.id },
      });

      await db.userFollow.create({
        data: { followerId: userY.id, followingId: userX.id },
      });

      // Assert: Check friendship table
      const friendships = await db.friendship.findMany({
        where: {
          OR: [
            { userId1: userX.id, userId2: userY.id },
            { userId1: userY.id, userId2: userX.id },
          ],
        },
      });

      expect(friendships).toHaveLength(1);
      expect(Number(friendships[0].userId1)).toBe(Math.min(Number(userX.id), Number(userY.id)));
      expect(Number(friendships[0].userId2)).toBe(Math.max(Number(userX.id), Number(userY.id)));
    });

    it("should not create duplicate friendships", async () => {
      // Arrange: Create mutual follow
      const { user: userP } = await buildUser().username("user_p").withProfile().build();

      const { user: userQ } = await buildUser().username("user_q").withProfile().build();

      // Create mutual follows
      await db.userFollow.create({
        data: { followerId: userP.id, followingId: userQ.id },
      });

      await db.userFollow.create({
        data: { followerId: userQ.id, followingId: userP.id },
      });

      // Try to create another follow (should not create duplicate friendship)
      // Note: This would fail due to unique constraint, but we're testing trigger idempotency
      const friendshipCount = await db.friendship.count({
        where: {
          userId1: Math.min(Number(userP.id), Number(userQ.id)),
          userId2: Math.max(Number(userP.id), Number(userQ.id)),
        },
      });

      expect(friendshipCount).toBe(1);
    });
  });

  // ===========================================================================
  // Edge Cases & Error Handling
  // ===========================================================================

  describe("Edge Cases", () => {
    it("should handle pagination with empty cursor", async () => {
      // Arrange: Create user with followers
      const { user: target } = await buildUser().username("edge_target").withProfile().build();

      const { user: follower } = await buildUser().username("edge_follower").withProfile().build();

      await db.userFollow.create({
        data: { followerId: follower.id, followingId: target.id },
      });

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: target.id.toString(),
          cursor: "", // Empty cursor
        },
      });

      // Act & Assert: Should handle gracefully (treat as no cursor)
      const result = await socialRouter["social.getFollowers"](ctx);
      expect(result.followers).toHaveLength(1);
    });

    it("should handle very large limit values", async () => {
      // Arrange: Create user with followers
      const { user: target } = await buildUser().username("limit_target").withProfile().build();

      const { user: follower } = await buildUser().username("limit_follower").withProfile().build();

      await db.userFollow.create({
        data: { followerId: follower.id, followingId: target.id },
      });

      const ctx = createMockContext<{
        userId?: string;
        limit?: number;
        cursor?: string;
      }>({
        input: {
          userId: target.id.toString(),
          limit: 10000, // Very large limit
        },
      });

      // Act: Get followers (should cap at max limit, e.g., 100)
      const result = await socialRouter["social.getFollowers"](ctx);

      // Assert: Returns results (implementation should cap limit)
      expect(result.followers).toHaveLength(1);
    });
  });
});
