/**
 * Post Router Tests - Phase 3.3
 *
 * Comprehensive test suite for the Post Router covering all 8 procedures:
 * - post.create: Create posts (text, image, video, song types)
 * - post.getById: Retrieve post with visibility checks
 * - post.update: Edit post content and visibility
 * - post.delete: Soft delete posts
 * - post.like: Like a post (increment counter)
 * - post.unlike: Unlike a post (decrement counter)
 * - post.comment: Add comment to post
 * - post.getComments: Retrieve comments with pagination
 *
 * Following TDD: These tests are written BEFORE implementation.
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.3
 * @see docs/api-architecture.md lines 222-276 (PostProcedures type definitions)
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 180-270 (posts schema)
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ErrorCode } from "@vrss/api-contracts";
import { postRouter } from "../../src/rpc/routers/post";
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

describe("Post Router", () => {
  const db = getTestDatabase();

  beforeEach(async () => {
    await cleanAllTables();
  });

  afterEach(async () => {
    await cleanAllTables();
  });

  // ===========================================================================
  // post.create Tests
  // ===========================================================================

  describe("post.create", () => {
    it("should create text post successfully", async () => {
      // Arrange: Create authenticated user
      const { user } = await buildUser().username("author").withProfile().build();

      const ctx = createMockContext<{
        type: "text";
        content: string;
        visibility?: "public" | "followers" | "private";
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          type: "text",
          content: "Hello, VRSS! This is my first post.",
          visibility: "public",
        },
      });

      // Act: Import and call procedure (will be implemented)
      const result = await postRouter["post.create"](ctx);

      // Assert: Expected structure
      expect(result.post).toMatchObject({
        id: expect.any(String),
        userId: expect.any(String),
        type: "text",
        content: "Hello, VRSS! This is my first post.",
        visibility: "public",
        likesCount: 0,
        commentsCount: 0,
        repostsCount: 0,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it("should create image post successfully", async () => {
      const { user } = await buildUser()
        .username("photographer")
        .withProfile()
        .withStorage({ quotaBytes: BigInt(52428800), usedBytes: BigInt(0) })
        .build();

      const ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: {
          type: "image",
          content: "Check out this amazing sunset!",
          mediaIds: ["media-id-123"],
          visibility: "public",
        },
      });

      // Expected: Post created with media reference
      const _expectedResult = {
        post: {
          id: expect.any(String),
          userId: user.id,
          type: "image",
          content: "Check out this amazing sunset!",
          mediaIds: ["media-id-123"],
          visibility: "public",
        },
      };

      const result = await postRouter["post.create"](ctx);
      expect(result.post.type).toBe("image");
      expect(result.post.mediaIds).toContain("media-id-123");
    });

    it("should create video post successfully", async () => {
      const { user } = await buildUser()
        .username("videocreator")
        .withProfile()
        .withStorage({ usedBytes: BigInt(10485760), quotaBytes: BigInt(52428800) })
        .build();

      const _ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: {
          type: "video",
          content: "My latest vlog!",
          mediaIds: ["video-media-456"],
          visibility: "public",
        },
      });

      // TODO: Implement and verify video post creation
    });

    it("should create song post successfully", async () => {
      const { user } = await buildUser().username("musician").withProfile().build();

      const _ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: {
          type: "song",
          content: "New track just dropped! 🎵",
          mediaIds: ["audio-track-789"],
          visibility: "public",
        },
      });

      // TODO: Implement and verify song post creation
    });

    it("should fail to create post without authentication", async () => {
      const ctx = createMockContext({
        user: null, // Not authenticated
        input: {
          type: "text",
          content: "This should fail",
        },
      });

      await expect(postRouter["post.create"](ctx)).rejects.toThrow();
    });

    it("should fail to create text post without content", async () => {
      const { user } = await buildUser().username("badauthor").withProfile().build();

      const _ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: {
          type: "text",
          content: "", // Empty content
        },
      });

      // TODO: Expect validation error for empty content
    });

    it("should fail to create media post without mediaIds", async () => {
      const { user } = await buildUser().username("badphotographer").withProfile().build();

      const _ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: {
          type: "image",
          content: "Image post without media",
          // mediaIds missing
        },
      });

      // TODO: Expect validation error for missing mediaIds
    });

    it("should enforce storage quota when creating media post", async () => {
      const { user } = await buildUser()
        .username("overlimit")
        .withProfile()
        .withStorage({ usedBytes: BigInt(52428800), quotaBytes: BigInt(52428800) })
        .build();

      const _ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: {
          type: "image",
          content: "This should fail due to quota",
          mediaIds: ["large-media-id"],
        },
      });

      // TODO: Expect ErrorCode.STORAGE_LIMIT_EXCEEDED
    });
  });

  // ===========================================================================
  // post.getById Tests
  // ===========================================================================

  describe("post.getById", () => {
    it("should retrieve public post successfully", async () => {
      // Arrange: Create post
      const { user } = await buildUser().username("postauthor").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Public post content",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        input: { postId: post.id.toString() },
      });

      // Act: Retrieve post
      const result = await postRouter["post.getById"](ctx);

      // Assert: Post returned with author info
      expect(result.post.id).toBe(post.id.toString());
      expect(result.post.type).toBe("text_short");
      expect(result.post.content).toBe("Public post content");
      expect(result.post.visibility).toBe("public");
      expect(result.author.username).toBe("postauthor");
    });

    it("should fail to retrieve private post from non-follower", async () => {
      const { user: author } = await buildUser().username("privateauthor").withProfile().build();
      const { user: viewer } = await buildUser().username("viewer").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Private post",
          visibility: "private",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        user: { id: viewer.id, username: viewer.username } as any,
        input: { postId: post.id.toString() },
      });

      // TODO: Expect ErrorCode.FORBIDDEN for private post
    });

    it("should allow followers to view followers-only post", async () => {
      const { user: author } = await buildUser()
        .username("authorwithfollowers")
        .withProfile()
        .build();
      const { user: follower } = await buildUser().username("follower").withProfile().build();

      // Create follow relationship
      await db.userFollow.create({
        data: {
          followerId: follower.id,
          followingId: author.id,
        },
      });

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Followers only",
          visibility: "followers",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        user: { id: follower.id, username: follower.username } as any,
        input: { postId: post.id.toString() },
      });

      // TODO: Should successfully retrieve post
    });

    it("should fail to retrieve deleted post", async () => {
      const { user } = await buildUser().username("deletedauthor").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Deleted post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
          deletedAt: new Date(), // Soft deleted
        },
      });

      const _ctx = createMockContext({
        input: { postId: post.id.toString() },
      });

      // TODO: Expect ErrorCode.NOT_FOUND for deleted post
    });

    it("should fail to retrieve non-existent post", async () => {
      const _ctx = createMockContext({
        input: { postId: "non-existent-id" },
      });

      // TODO: Expect ErrorCode.POST_NOT_FOUND
    });
  });

  // ===========================================================================
  // post.update Tests
  // ===========================================================================

  describe("post.update", () => {
    it("should update post content successfully", async () => {
      const { user } = await buildUser().username("editor").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Original content",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: {
          postId: post.id.toString(),
          content: "Updated content",
        },
      });

      // TODO: Verify content updated
    });

    it("should update post visibility", async () => {
      const { user } = await buildUser().username("privacychanger").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Changing visibility",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: {
          postId: post.id.toString(),
          visibility: "private",
        },
      });

      // TODO: Verify visibility changed to private
    });

    it("should fail to update post if not owner", async () => {
      const { user: owner } = await buildUser().username("owner").withProfile().build();
      const { user: attacker } = await buildUser().username("attacker").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: owner.id,
          type: "text_short",
          content: "Owner's post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        user: { id: attacker.id, username: attacker.username } as any,
        input: {
          postId: post.id.toString(),
          content: "Hacked content",
        },
      });

      // TODO: Expect ErrorCode.FORBIDDEN
    });

    it("should fail to update deleted post", async () => {
      const { user } = await buildUser().username("deletededitor").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Deleted",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
          deletedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: {
          postId: post.id.toString(),
          content: "Cannot update",
        },
      });

      // TODO: Expect ErrorCode.NOT_FOUND
    });
  });

  // ===========================================================================
  // post.delete Tests
  // ===========================================================================

  describe("post.delete", () => {
    it("should soft delete post successfully", async () => {
      const { user } = await buildUser().username("deleter").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "To be deleted",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: { postId: post.id.toString() },
      });

      // Act: Delete post
      await postRouter["post.delete"](ctx);

      // Assert: Post has deletedAt set
      const deletedPost = await db.post.findUnique({
        where: { id: post.id },
      });

      expect(deletedPost?.deletedAt).not.toBeNull();
    });

    it("should fail to delete post if not owner", async () => {
      const { user: owner } = await buildUser().username("postowner").withProfile().build();
      const { user: attacker } = await buildUser().username("notowner").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: owner.id,
          type: "text_short",
          content: "Cannot delete this",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        user: { id: attacker.id, username: attacker.username } as any,
        input: { postId: post.id.toString() },
      });

      // TODO: Expect ErrorCode.FORBIDDEN
    });

    it("should fail to delete already deleted post", async () => {
      const { user } = await buildUser().username("doubledeleter").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Already deleted",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
          deletedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: { postId: post.id.toString() },
      });

      // TODO: Expect ErrorCode.NOT_FOUND
    });

    it("should preserve post data after soft delete", async () => {
      const { user } = await buildUser().username("preservation").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Original content to preserve",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const originalContent = post.content;

      const ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: { postId: post.id.toString() },
      });

      // Delete post
      await postRouter["post.delete"](ctx);

      // Verify content preserved
      const deletedPost = await db.post.findFirst({
        where: { id: post.id },
      });

      expect(deletedPost?.content).toBe(originalContent);
      expect(deletedPost?.deletedAt).not.toBeNull();
    });
  });

  // ===========================================================================
  // post.like / post.unlike Tests
  // ===========================================================================

  describe("post.like", () => {
    it("should like post successfully and increment counter", async () => {
      const { user: author } = await buildUser().username("likedauthor").withProfile().build();
      const { user: liker } = await buildUser().username("liker").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Like this post!",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
          likesCount: 0,
        },
      });

      const ctx = createMockContext({
        user: { id: liker.id, username: liker.username } as any,
        input: { postId: post.id.toString() },
      });

      // Act: Like post
      await postRouter["post.like"](ctx);

      // Assert: Like interaction created
      const interaction = await db.postInteraction.findFirst({
        where: {
          userId: liker.id,
          postId: post.id,
          type: "like",
        },
      });

      expect(interaction).not.toBeNull();

      // Assert: Counter incremented (via trigger)
      const updatedPost = await db.post.findUnique({
        where: { id: post.id },
      });

      expect(updatedPost?.likesCount).toBe(1);
    });

    it("should fail to like post twice (idempotent)", async () => {
      const { user: author } = await buildUser().username("doublelikeauthor").withProfile().build();
      const { user: liker } = await buildUser().username("doubleliker").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Can only like once",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      // First like
      await db.postInteraction.create({
        data: {
          userId: liker.id,
          postId: post.id,
          type: "like",
        },
      });

      const _ctx = createMockContext({
        user: { id: liker.id, username: liker.username } as any,
        input: { postId: post.id.toString() },
      });

      // TODO: Expect error or no-op (already liked)
    });

    it("should fail to like deleted post", async () => {
      const { user: author } = await buildUser()
        .username("deletedlikeauthor")
        .withProfile()
        .build();
      const { user: liker } = await buildUser().username("deletedliker").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Deleted post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
          deletedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        user: { id: liker.id, username: liker.username } as any,
        input: { postId: post.id.toString() },
      });

      // TODO: Expect ErrorCode.NOT_FOUND
    });
  });

  describe("post.unlike", () => {
    it("should unlike post successfully and decrement counter", async () => {
      const { user: author } = await buildUser().username("unlikeauthor").withProfile().build();
      const { user: unliker } = await buildUser().username("unliker").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Unlike me",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
          likesCount: 0, // Start at 0, trigger will increment when like is inserted
        },
      });

      // Create existing like
      await db.postInteraction.create({
        data: {
          userId: unliker.id,
          postId: post.id,
          type: "like",
        },
      });

      const ctx = createMockContext({
        user: { id: unliker.id, username: unliker.username } as any,
        input: { postId: post.id.toString() },
      });

      // Act: Unlike post
      await postRouter["post.unlike"](ctx);

      // Assert: Like interaction removed
      const interaction = await db.postInteraction.findFirst({
        where: {
          userId: unliker.id,
          postId: post.id,
          type: "like",
        },
      });

      expect(interaction).toBeNull();

      // Assert: Counter decremented (via trigger)
      const updatedPost = await db.post.findUnique({
        where: { id: post.id },
      });

      expect(updatedPost?.likesCount).toBe(0);
    });

    it("should fail to unlike post that was not liked", async () => {
      const { user: author } = await buildUser().username("neverlikedauthor").withProfile().build();
      const { user: unliker } = await buildUser().username("neverliked").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Never liked",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        user: { id: unliker.id, username: unliker.username } as any,
        input: { postId: post.id.toString() },
      });

      // TODO: Expect error or no-op (was not liked)
    });
  });

  // ===========================================================================
  // post.comment Tests
  // ===========================================================================

  describe("post.comment", () => {
    it("should add comment to post successfully", async () => {
      const { user: author } = await buildUser().username("commentedauthor").withProfile().build();
      const { user: commenter } = await buildUser().username("commenter").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Comment on this",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
          commentsCount: 0,
        },
      });

      const ctx = createMockContext({
        user: { id: commenter.id, username: commenter.username } as any,
        input: {
          postId: post.id.toString(),
          content: "Great post!",
        },
      });

      // Act: Add comment
      const _result = await postRouter["post.comment"](ctx);

      // Assert: Comment created
      const comment = await db.comment.findFirst({
        where: {
          postId: post.id,
          userId: commenter.id,
        },
      });

      expect(comment).not.toBeNull();
      expect(comment?.content).toBe("Great post!");

      // Assert: Counter incremented
      const updatedPost = await db.post.findUnique({
        where: { id: post.id },
      });

      expect(updatedPost?.commentsCount).toBe(1);
    });

    it("should add nested reply comment", async () => {
      const { user: author } = await buildUser().username("nestedauthor").withProfile().build();
      const { user: commenter1 } = await buildUser().username("commenter1").withProfile().build();
      const { user: commenter2 } = await buildUser().username("commenter2").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Thread test",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      // Top-level comment
      const parentComment = await db.comment.create({
        data: {
          postId: post.id,
          userId: commenter1.id,
          content: "Top level comment",
        },
      });

      // Reply to comment
      const _ctx = createMockContext({
        user: { id: commenter2.id, username: commenter2.username } as any,
        input: {
          postId: post.id.toString(),
          content: "Reply to comment",
          parentCommentId: parentComment.id.toString(),
        },
      });

      // TODO: Verify nested comment created with correct parent reference
    });

    it("should fail to comment on deleted post", async () => {
      const { user: author } = await buildUser()
        .username("deletedcommentauthor")
        .withProfile()
        .build();
      const { user: commenter } = await buildUser()
        .username("deletedcommenter")
        .withProfile()
        .build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Deleted",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
          deletedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        user: { id: commenter.id, username: commenter.username } as any,
        input: {
          postId: post.id.toString(),
          content: "Cannot comment",
        },
      });

      // TODO: Expect ErrorCode.NOT_FOUND
    });

    it("should fail to add empty comment", async () => {
      const { user: author } = await buildUser()
        .username("emptycommentauthor")
        .withProfile()
        .build();
      const { user: commenter } = await buildUser()
        .username("emptycommenter")
        .withProfile()
        .build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Normal post",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        user: { id: commenter.id, username: commenter.username } as any,
        input: {
          postId: post.id.toString(),
          content: "", // Empty
        },
      });

      // TODO: Expect validation error
    });
  });

  // ===========================================================================
  // post.getComments Tests
  // ===========================================================================

  describe("post.getComments", () => {
    it("should retrieve comments with cursor pagination", async () => {
      const { user: author } = await buildUser()
        .username("commentlistauthor")
        .withProfile()
        .build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Many comments",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      // Create 25 comments
      for (let i = 0; i < 25; i++) {
        const { user: commenter } = await buildUser()
          .username(`commenter${i}`)
          .withProfile()
          .build();

        await db.comment.create({
          data: {
            postId: post.id,
            userId: commenter.id,
            content: `Comment ${i}`,
          },
        });
      }

      const _ctx = createMockContext({
        input: {
          postId: post.id.toString(),
          limit: 20,
        },
      });

      // Act: Get first page
      // const result = await postRouter["post.getComments"](ctx);

      // Assert: Returns 20 comments with nextCursor
      // expect(result.comments).toHaveLength(20);
      // expect(result.nextCursor).toBeDefined();
    });

    it("should return empty array for post with no comments", async () => {
      const { user: author } = await buildUser().username("nocommentsauthor").withProfile().build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "No comments yet",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        input: {
          postId: post.id.toString(),
        },
      });

      // TODO: Expect empty array
    });

    it("should exclude deleted comments from results", async () => {
      const { user: author } = await buildUser()
        .username("deletedcommentsauthor")
        .withProfile()
        .build();
      const { user: commenter } = await buildUser()
        .username("deletedcommentsuser")
        .withProfile()
        .build();

      const post = await db.post.create({
        data: {
          userId: author.id,
          type: "text_short",
          content: "Post with deleted comments",
          visibility: "public",
          status: "published",
          publishedAt: new Date(),
        },
      });

      // Create normal comment
      await db.comment.create({
        data: {
          postId: post.id,
          userId: commenter.id,
          content: "Visible comment",
        },
      });

      // Create deleted comment
      await db.comment.create({
        data: {
          postId: post.id,
          userId: commenter.id,
          content: "Deleted comment",
          deletedAt: new Date(),
        },
      });

      const _ctx = createMockContext({
        input: { postId: post.id.toString() },
      });

      // TODO: Expect only 1 comment (deleted excluded)
    });
  });

  // ===========================================================================
  // Storage Quota Tests
  // ===========================================================================

  describe("Storage Quota Enforcement", () => {
    it("should check storage quota before creating media post", async () => {
      const { user } = await buildUser()
        .username("quotauser")
        .withProfile()
        .withStorage({ usedBytes: BigInt(50000000), quotaBytes: BigInt(52428800) })
        .build();

      // Try to create 5MB image post (would exceed quota)
      const _ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: {
          type: "image",
          content: "Large image",
          mediaIds: ["large-5mb-media"],
        },
      });

      // TODO: Should fail with STORAGE_LIMIT_EXCEEDED
    });

    it("should allow post creation within storage quota", async () => {
      const { user } = await buildUser()
        .username("withinquota")
        .withProfile()
        .withStorage({ usedBytes: BigInt(10485760), quotaBytes: BigInt(52428800) })
        .build();

      const _ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: {
          type: "image",
          content: "Small image",
          mediaIds: ["small-1mb-media"],
        },
      });

      // TODO: Should succeed (within quota)
    });

    it("should not check quota for text posts", async () => {
      const { user } = await buildUser()
        .username("textonly")
        .withProfile()
        .withStorage({ usedBytes: BigInt(52428800), quotaBytes: BigInt(52428800) })
        .build();

      const _ctx = createMockContext({
        user: { id: user.id, username: user.username } as any,
        input: {
          type: "text",
          content: "Text posts dont count against quota",
        },
      });

      // TODO: Should succeed (text posts dont consume storage)
    });
  });
});
