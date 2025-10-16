/**
 * Social Router - Phase 3.4
 *
 * Implements all social relationship procedures for the VRSS Social Platform.
 * Handles following, unfollowing, retrieving followers/following lists, and friends management.
 *
 * Procedures:
 * - social.follow: Follow a user (creates friendship if mutual via DB trigger)
 * - social.unfollow: Unfollow a user (removes friendship if exists)
 * - social.getFollowers: Get list of followers with pagination
 * - social.getFollowing: Get list of users being followed with pagination
 * - social.getFriends: Get list of mutual friends with pagination
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.4
 * @see docs/api-architecture.md lines 313-375 (SocialProcedures type definitions)
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 277-317 (user_follows & friendships)
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 2256-2279 (Friendship trigger)
 */

import { z } from "zod";
import { PrismaClient, Prisma } from "@prisma/client";
import { ErrorCode } from "@vrss/api-contracts";
import { ProcedureContext } from "../types";
import {
  followUserSchema,
  unfollowUserSchema,
  getFollowersSchema,
  getFollowingSchema,
  getFriendsSchema,
} from "./schemas/social";

// Initialize Prisma client
const prisma = new PrismaClient();

// =============================================================================
// CUSTOM ERROR CLASS
// =============================================================================

class RPCError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "RPCError";
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get validation error message safely
 */
function getValidationError(validationResult: any): { message: string; field: string; errors: any[] } {
  const errors = validationResult.error?.errors || [];
  const firstError = errors[0];
  return {
    message: firstError?.message || "Validation failed",
    field: firstError?.path?.join(".") || "unknown",
    errors: errors,
  };
}

/**
 * Encode cursor for pagination (base64 encoded JSON)
 */
function encodeCursor(createdAt: Date, id: bigint): string {
  const cursorData = {
    createdAt: createdAt.toISOString(),
    id: id.toString(),
  };
  return Buffer.from(JSON.stringify(cursorData)).toString("base64");
}

/**
 * Decode cursor from base64
 */
function decodeCursor(cursor: string): { createdAt: Date; id: bigint } | null {
  try {
    if (!cursor || cursor.trim() === "") {
      return null;
    }
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    return {
      createdAt: new Date(parsed.createdAt),
      id: BigInt(parsed.id),
    };
  } catch (error) {
    return null;
  }
}

// =============================================================================
// SOCIAL PROCEDURES
// =============================================================================

export const socialRouter = {
  /**
   * social.follow - Follow a user
   *
   * Creates a follow relationship. If mutual follow detected, database trigger
   * automatically creates a friendship record.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input (self-follow)
   * @throws {RPCError} USER_NOT_FOUND - Target user does not exist
   * @throws {RPCError} ALREADY_FOLLOWING - Already following this user
   */
  "social.follow": async (
    ctx: ProcedureContext<z.infer<typeof followUserSchema>>
  ) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required"
      );
    }

    // Validate input
    const validationResult = followUserSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        error.message,
        { field: error.field, errors: error.errors }
      );
    }

    const { userId: targetUserId } = validationResult.data;
    const followerId = BigInt(ctx.user.id);
    const followingId = BigInt(targetUserId);

    // Check for self-follow
    if (followerId === followingId) {
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        "Cannot follow yourself"
      );
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!targetUser) {
      throw new RPCError(
        ErrorCode.USER_NOT_FOUND,
        "User not found"
      );
    }

    // Check if already following
    const existingFollow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (existingFollow) {
      throw new RPCError(
        ErrorCode.ALREADY_FOLLOWING,
        "Already following this user"
      );
    }

    // Create follow relationship
    // Note: DB trigger will automatically create friendship if mutual
    await prisma.userFollow.create({
      data: {
        followerId,
        followingId,
      },
    });

    return {
      following: true,
    };
  },

  /**
   * social.unfollow - Unfollow a user
   *
   * Removes a follow relationship. If a friendship exists (mutual follow),
   * it is also deleted since the relationship is no longer mutual.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   * @throws {RPCError} NOT_FOUND - Not following this user (idempotent)
   */
  "social.unfollow": async (
    ctx: ProcedureContext<z.infer<typeof unfollowUserSchema>>
  ) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required"
      );
    }

    // Validate input
    const validationResult = unfollowUserSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        error.message,
        { field: error.field, errors: error.errors }
      );
    }

    const { userId: targetUserId } = validationResult.data;
    const followerId = BigInt(ctx.user.id);
    const followingId = BigInt(targetUserId);

    // Check if following exists
    const existingFollow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    if (!existingFollow) {
      throw new RPCError(
        ErrorCode.NOT_FOUND,
        "Not following this user"
      );
    }

    // Delete follow relationship
    await prisma.userFollow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
    });

    // Delete friendship if exists (unfollow breaks mutual relationship)
    const userId1 = followerId < followingId ? followerId : followingId;
    const userId2 = followerId > followingId ? followerId : followingId;

    await prisma.friendship.deleteMany({
      where: {
        userId1,
        userId2,
      },
    });

    return {
      following: false,
    };
  },

  /**
   * social.getFollowers - Get followers list
   *
   * Retrieves users who follow the specified user (or current user if not specified).
   * Supports cursor-based pagination with default limit of 20, max 100.
   *
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   */
  "social.getFollowers": async (
    ctx: ProcedureContext<z.infer<typeof getFollowersSchema>>
  ) => {
    // Validate input
    const validationResult = getFollowersSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        error.message,
        { field: error.field }
      );
    }

    let { userId, limit, cursor } = validationResult.data;

    // Cap limit at max 100
    limit = Math.min(limit, 100);

    // Default to current user if userId not provided
    const targetUserId = userId || ctx.user?.id;

    if (!targetUserId) {
      throw new RPCError(
        ErrorCode.UNAUTHORIZED,
        "User ID required when not authenticated"
      );
    }

    // Build query for followers (users who follow the target user)
    const where: Prisma.UserFollowWhereInput = {
      followingId: BigInt(targetUserId),
    };

    // Cursor pagination
    const cursorData = cursor ? decodeCursor(cursor) : null;
    if (cursorData) {
      where.OR = [
        { createdAt: { lt: cursorData.createdAt } },
        { createdAt: cursorData.createdAt, id: { lt: cursorData.id } },
      ];
    }

    // Fetch followers
    const follows = await prisma.userFollow.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: limit + 1, // Fetch one extra to determine if there are more
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                bio: true,
              },
            },
          },
        },
      },
    });

    // Determine if there are more results
    const hasMore = follows.length > limit;
    const followsToReturn = hasMore ? follows.slice(0, limit) : follows;
    const lastFollow = followsToReturn[followsToReturn.length - 1];
    const nextCursor = hasMore && lastFollow ? encodeCursor(lastFollow.createdAt, lastFollow.id) : undefined;

    // Map to user objects
    const followers = followsToReturn.map((f) => ({
      id: f.follower.id.toString(),
      username: f.follower.username,
      email: f.follower.email,
      displayName: f.follower.profile?.displayName || null,
      bio: f.follower.profile?.bio || null,
      profile: f.follower.profile ? {
        displayName: f.follower.profile.displayName,
        bio: f.follower.profile.bio,
      } : null,
    }));

    return {
      followers,
      nextCursor,
      hasMore,
    };
  },

  /**
   * social.getFollowing - Get following list
   *
   * Retrieves users that the specified user follows (or current user if not specified).
   * Supports cursor-based pagination with default limit of 20, max 100.
   *
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   */
  "social.getFollowing": async (
    ctx: ProcedureContext<z.infer<typeof getFollowingSchema>>
  ) => {
    // Validate input
    const validationResult = getFollowingSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        error.message,
        { field: error.field }
      );
    }

    let { userId, limit, cursor } = validationResult.data;

    // Cap limit at max 100
    limit = Math.min(limit, 100);

    // Default to current user if userId not provided
    const targetUserId = userId || ctx.user?.id;

    if (!targetUserId) {
      throw new RPCError(
        ErrorCode.UNAUTHORIZED,
        "User ID required when not authenticated"
      );
    }

    // Build query for following (users that the target user follows)
    const where: Prisma.UserFollowWhereInput = {
      followerId: BigInt(targetUserId),
    };

    // Cursor pagination
    const cursorData = cursor ? decodeCursor(cursor) : null;
    if (cursorData) {
      where.OR = [
        { createdAt: { lt: cursorData.createdAt } },
        { createdAt: cursorData.createdAt, id: { lt: cursorData.id } },
      ];
    }

    // Fetch following
    const follows = await prisma.userFollow.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: limit + 1, // Fetch one extra to determine if there are more
      include: {
        following: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                bio: true,
              },
            },
          },
        },
      },
    });

    // Determine if there are more results
    const hasMore = follows.length > limit;
    const followsToReturn = hasMore ? follows.slice(0, limit) : follows;
    const lastFollow = followsToReturn[followsToReturn.length - 1];
    const nextCursor = hasMore && lastFollow ? encodeCursor(lastFollow.createdAt, lastFollow.id) : undefined;

    // Map to user objects
    const following = followsToReturn.map((f) => ({
      id: f.following.id.toString(),
      username: f.following.username,
      email: f.following.email,
      displayName: f.following.profile?.displayName || null,
      bio: f.following.profile?.bio || null,
      profile: f.following.profile ? {
        displayName: f.following.profile.displayName,
        bio: f.following.profile.bio,
      } : null,
    }));

    return {
      following,
      nextCursor,
      hasMore,
    };
  },

  /**
   * social.getFriends - Get friends list
   *
   * Retrieves mutual friends (users with bidirectional follow relationships).
   * Supports cursor-based pagination with default limit of 20, max 100.
   *
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   */
  "social.getFriends": async (
    ctx: ProcedureContext<z.infer<typeof getFriendsSchema>>
  ) => {
    // Validate input
    const validationResult = getFriendsSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        error.message,
        { field: error.field }
      );
    }

    let { userId, limit, cursor } = validationResult.data;

    // Cap limit at max 100
    limit = Math.min(limit, 100);

    // Default to current user if userId not provided
    const targetUserId = userId || ctx.user?.id;

    if (!targetUserId) {
      throw new RPCError(
        ErrorCode.UNAUTHORIZED,
        "User ID required when not authenticated"
      );
    }

    const targetUserIdBigInt = BigInt(targetUserId);

    // Build query for friendships (bidirectional lookup)
    const where: Prisma.FriendshipWhereInput = {
      OR: [
        { userId1: targetUserIdBigInt },
        { userId2: targetUserIdBigInt },
      ],
    };

    // Cursor pagination
    const cursorData = cursor ? decodeCursor(cursor) : null;
    if (cursorData) {
      // Adjust where clause for cursor
      where.OR = [
        {
          userId1: targetUserIdBigInt,
          OR: [
            { createdAt: { lt: cursorData.createdAt } },
            { createdAt: cursorData.createdAt, id: { lt: cursorData.id } },
          ],
        },
        {
          userId2: targetUserIdBigInt,
          OR: [
            { createdAt: { lt: cursorData.createdAt } },
            { createdAt: cursorData.createdAt, id: { lt: cursorData.id } },
          ],
        },
      ];
    }

    // Fetch friendships
    const friendships = await prisma.friendship.findMany({
      where,
      orderBy: [
        { createdAt: "desc" },
        { id: "desc" },
      ],
      take: limit + 1, // Fetch one extra to determine if there are more
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                bio: true,
              },
            },
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            email: true,
            profile: {
              select: {
                displayName: true,
                bio: true,
              },
            },
          },
        },
      },
    });

    // Determine if there are more results
    const hasMore = friendships.length > limit;
    const friendshipsToReturn = hasMore ? friendships.slice(0, limit) : friendships;
    const lastFriendship = friendshipsToReturn[friendshipsToReturn.length - 1];
    const nextCursor = hasMore && lastFriendship ? encodeCursor(lastFriendship.createdAt, lastFriendship.id) : undefined;

    // Map to user objects (return the other user in the friendship)
    const friends = friendshipsToReturn.map((f) => {
      // Determine which user is the friend (the one that's NOT the target user)
      const friend = f.userId1 === targetUserIdBigInt ? f.user2 : f.user1;

      return {
        id: friend.id.toString(),
        username: friend.username,
        email: friend.email,
        displayName: friend.profile?.displayName || null,
        bio: friend.profile?.bio || null,
        profile: friend.profile ? {
          displayName: friend.profile.displayName,
          bio: friend.profile.bio,
        } : null,
      };
    });

    return {
      friends,
      nextCursor,
      hasMore,
    };
  },
};
