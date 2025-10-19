/**
 * Discovery Router - Phase 3.7
 *
 * Implements search and discovery procedures for the VRSS Social Platform.
 * Handles user search, post search, and personalized discovery feed with 2-degree network algorithm.
 *
 * Procedures:
 * - discovery.searchUsers: Full-text search on username/display_name, respects profile visibility
 * - discovery.searchPosts: Search posts by content, applies visibility rules
 * - discovery.getDiscoverFeed: Returns popular posts from 2-degree network with cursor pagination
 *
 * @see docs/tasks/task-3.7.md lines 362-370
 * @see packages/api-contracts/src/procedures/discovery.ts
 */

import { type Prisma, PrismaClient } from "@prisma/client";
import { ErrorCode } from "@vrss/api-contracts";
import type { z } from "zod";
import type { ProcedureContext } from "../types";
import { getDiscoverFeedSchema, searchPostsSchema, searchUsersSchema } from "./schemas/discovery";

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
function getValidationError(validationResult: any): {
  message: string;
  field: string;
  errors: any[];
} {
  const errors = validationResult.error?.errors || [];
  const firstError = errors[0];
  return {
    message: firstError?.message || "Validation failed",
    field: firstError?.path?.join(".") || "unknown",
    errors: errors,
  };
}

/**
 * Check if a user can view a post based on visibility settings
 */
async function checkPostVisibility(
  postUserId: bigint,
  visibility: string,
  viewerUserId: string | null
): Promise<boolean> {
  // Public posts: Anyone can view
  if (visibility === "public") {
    return true;
  }

  // Not authenticated: Can only view public posts
  if (!viewerUserId) {
    return false;
  }

  // Owner: Can always view their own posts
  if (viewerUserId === postUserId.toString()) {
    return true;
  }

  // Private posts: Only owner can view
  if (visibility === "private") {
    return false;
  }

  // Followers-only: Check if viewer follows the post author
  if (visibility === "followers") {
    const follow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: BigInt(viewerUserId),
          followingId: postUserId,
        },
      },
    });
    return !!follow;
  }

  return false;
}

/**
 * Check if a user profile can be viewed based on visibility settings
 */
async function checkProfileVisibility(
  profileUserId: bigint,
  visibility: string,
  viewerUserId: string | null
): Promise<boolean> {
  // Public profiles: Anyone can view
  if (visibility === "public") {
    return true;
  }

  // Not authenticated: Can only view public profiles
  if (!viewerUserId) {
    return false;
  }

  // Owner: Can always view their own profile
  if (viewerUserId === profileUserId.toString()) {
    return true;
  }

  // Private profiles: Only owner can view
  if (visibility === "private") {
    return false;
  }

  // Followers-only: Check if viewer follows the profile owner
  if (visibility === "followers") {
    const follow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: BigInt(viewerUserId),
          followingId: profileUserId,
        },
      },
    });
    return !!follow;
  }

  return true; // Default to visible for any other visibility value
}

// =============================================================================
// DISCOVERY PROCEDURES
// =============================================================================

export const discoveryRouter = {
  /**
   * discovery.searchUsers - Search users by username or display name
   *
   * Performs case-insensitive full-text search on username and display_name fields.
   * Respects profile visibility settings - excludes private profiles unless viewer is owner.
   * Returns paginated results with cursor-based pagination.
   *
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   */
  "discovery.searchUsers": async (ctx: ProcedureContext<z.infer<typeof searchUsersSchema>>) => {
    // Validate input
    const validationResult = searchUsersSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
        errors: error.errors,
      });
    }

    const { query, limit, cursor } = validationResult.data;
    const viewerUserId = ctx.user?.id || null;

    // Build where clause for search
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      OR: [
        {
          username: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          profile: {
            displayName: {
              contains: query,
              mode: "insensitive",
            },
          },
        },
      ],
    };

    // Add cursor if provided
    if (cursor) {
      where.id = { lt: BigInt(cursor) };
    }

    // Fetch users - fetch more than needed to account for visibility filtering
    // We fetch 3x the limit to increase chances of getting enough visible results
    const users = await prisma.user.findMany({
      where,
      orderBy: { id: "desc" },
      take: (limit + 1) * 3,
      include: {
        profile: {
          select: {
            displayName: true,
            bio: true,
            visibility: true,
          },
        },
      },
    });

    // Filter by profile visibility
    const visibleUsers = [];
    for (const user of users) {
      const profileVisibility = user.profile?.visibility || "public";
      const canView = await checkProfileVisibility(user.id, profileVisibility, viewerUserId);

      if (canView) {
        visibleUsers.push(user);
        // Stop if we have enough results
        if (visibleUsers.length > limit) {
          break;
        }
      }
    }

    // Determine if there are more results
    const hasMore = visibleUsers.length > limit;
    const usersToReturn = hasMore ? visibleUsers.slice(0, limit) : visibleUsers;
    const lastUser = usersToReturn[usersToReturn.length - 1];
    const nextCursor = hasMore && lastUser ? lastUser.id.toString() : null;

    return {
      items: usersToReturn.map((u) => ({
        id: u.id.toString(),
        username: u.username,
        email: u.email,
        displayName: u.profile?.displayName || null,
        bio: u.profile?.bio || null,
        avatarUrl: null, // TODO: Add avatar support
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      nextCursor,
      hasMore,
    };
  },

  /**
   * discovery.searchPosts - Search posts by content
   *
   * Performs case-insensitive full-text search on post content.
   * Applies visibility rules - excludes private posts and followers-only posts from non-followers.
   * Returns paginated results with cursor-based pagination.
   *
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   */
  "discovery.searchPosts": async (ctx: ProcedureContext<z.infer<typeof searchPostsSchema>>) => {
    // Validate input
    const validationResult = searchPostsSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
        errors: error.errors,
      });
    }

    const { query, limit, cursor } = validationResult.data;
    const viewerUserId = ctx.user?.id || null;

    // Build where clause for search
    const where: Prisma.PostWhereInput = {
      deletedAt: null,
      content: {
        contains: query,
        mode: "insensitive",
      },
    };

    // Add cursor if provided
    if (cursor) {
      where.id = { lt: BigInt(cursor) };
    }

    // Fetch posts - fetch more than needed to account for visibility filtering
    const posts = await prisma.post.findMany({
      where,
      orderBy: [{ likesCount: "desc" }, { createdAt: "desc" }],
      take: (limit + 1) * 3,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Filter by visibility
    const visiblePosts = [];
    for (const post of posts) {
      const canView = await checkPostVisibility(post.userId, post.visibility, viewerUserId);

      if (canView) {
        visiblePosts.push(post);
        // Stop if we have enough results
        if (visiblePosts.length > limit) {
          break;
        }
      }
    }

    // Determine if there are more results
    const hasMore = visiblePosts.length > limit;
    const postsToReturn = hasMore ? visiblePosts.slice(0, limit) : visiblePosts;
    const lastPost = postsToReturn[postsToReturn.length - 1];
    const nextCursor = hasMore && lastPost ? lastPost.id.toString() : null;

    return {
      items: postsToReturn.map((p) => {
        const mediaIds = Array.isArray(p.mediaUrls) ? p.mediaUrls : [];
        return {
          id: p.id.toString(),
          authorId: p.userId.toString(),
          type: p.type,
          content: p.content,
          mediaIds,
          tags: [], // TODO: Add tag support
          visibility: p.visibility,
          stats: {
            likeCount: p.likesCount,
            commentCount: p.commentsCount,
            repostCount: p.repostsCount,
            viewCount: p.viewsCount,
          },
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      }),
      nextCursor,
      hasMore,
    };
  },

  /**
   * discovery.getDiscoverFeed - Get personalized discovery feed
   *
   * Returns popular posts from user's 2-degree network:
   * - Level 1: User's friends (friendships) + users they follow
   * - Level 2: Friends-of-friends + followed users' followers
   *
   * Uses CTE (Common Table Expression) for efficient graph query.
   * Sorted by engagement (likes) and recency (created_at).
   * Applies visibility filtering.
   *
   * Performance target: <200ms
   *
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   * @throws {RPCError} UNAUTHORIZED - User not authenticated (feed requires login)
   */
  "discovery.getDiscoverFeed": async (
    ctx: ProcedureContext<z.infer<typeof getDiscoverFeedSchema>>
  ) => {
    // Validate input
    const validationResult = getDiscoverFeedSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
        errors: error.errors,
      });
    }

    const { limit, cursor } = validationResult.data;
    const viewerUserId = ctx.user?.id || null;

    // Discover feed requires authentication to build personalized network
    if (!viewerUserId) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required for discover feed");
    }

    const userId = BigInt(viewerUserId);

    // Build 2-degree network query using raw SQL with CTE
    // This is more efficient than multiple Prisma queries
    const networkQuery = `
      WITH network AS (
        -- Level 1: Direct friends (both directions)
        SELECT DISTINCT
          CASE
            WHEN user_id_1 = $1 THEN user_id_2
            ELSE user_id_1
          END as user_id,
          1 as degree
        FROM friendships
        WHERE (user_id_1 = $1 OR user_id_2 = $1)

        UNION

        -- Level 1: Users I follow
        SELECT DISTINCT following_id as user_id, 1 as degree
        FROM user_follows
        WHERE follower_id = $1

        UNION

        -- Level 2: Friends of friends
        SELECT DISTINCT
          CASE
            WHEN f2.user_id_1 = f1_user.user_id THEN f2.user_id_2
            ELSE f2.user_id_1
          END as user_id,
          2 as degree
        FROM (
          SELECT DISTINCT
            CASE
              WHEN user_id_1 = $1 THEN user_id_2
              ELSE user_id_1
            END as user_id
          FROM friendships
          WHERE (user_id_1 = $1 OR user_id_2 = $1)
        ) f1_user
        JOIN friendships f2 ON (f2.user_id_1 = f1_user.user_id OR f2.user_id_2 = f1_user.user_id)
        WHERE CASE
          WHEN f2.user_id_1 = f1_user.user_id THEN f2.user_id_2
          ELSE f2.user_id_1
        END != $1

        UNION

        -- Level 2: Followers of users I follow
        SELECT DISTINCT uf2.follower_id as user_id, 2 as degree
        FROM user_follows uf1
        JOIN user_follows uf2 ON uf1.following_id = uf2.following_id
        WHERE uf1.follower_id = $1
          AND uf2.follower_id != $1
      )
      SELECT DISTINCT user_id FROM network
    `;

    // Execute network query
    const networkUsers = await prisma.$queryRawUnsafe<{ user_id: bigint }[]>(networkQuery, userId);

    const networkUserIds = networkUsers.map((u) => u.user_id);

    // If no network users found, return empty feed
    if (networkUserIds.length === 0) {
      return {
        items: [],
        nextCursor: null,
        hasMore: false,
      };
    }

    // Build where clause for posts from network
    const where: Prisma.PostWhereInput = {
      deletedAt: null,
      userId: { in: networkUserIds },
      visibility: "public", // Only public posts in discover feed for simplicity
    };

    // Add cursor-based filtering if provided
    // NOTE: Since we order by [likesCount DESC, createdAt DESC], we must filter
    // by the same fields. Cursor is the post ID, so we fetch that post's sort keys.
    if (cursor) {
      const cursorPost = await prisma.post.findUnique({
        where: { id: BigInt(cursor) },
        select: { likesCount: true, createdAt: true, id: true },
      });

      if (cursorPost) {
        // Filter for posts that come AFTER the cursor in sort order:
        // - Posts with fewer likes, OR
        // - Posts with same likes but earlier createdAt, OR
        // - Posts with same likes AND createdAt but lower id (for deterministic pagination)
        where.OR = [
          { likesCount: { lt: cursorPost.likesCount } },
          {
            likesCount: cursorPost.likesCount,
            createdAt: { lt: cursorPost.createdAt },
          },
          {
            likesCount: cursorPost.likesCount,
            createdAt: cursorPost.createdAt,
            id: { lt: cursorPost.id },
          },
        ];
      }
    }

    // Fetch posts from network, sorted by engagement and recency
    // NOTE: We include 'id' as a final tiebreaker to ensure deterministic ordering
    // when posts have identical likesCount and createdAt (common in tests)
    const posts = await prisma.post.findMany({
      where,
      orderBy: [{ likesCount: "desc" }, { createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            profile: {
              select: {
                displayName: true,
              },
            },
          },
        },
      },
    });

    // Determine if there are more results
    const hasMore = posts.length > limit;
    const postsToReturn = hasMore ? posts.slice(0, limit) : posts;
    const lastPost = postsToReturn[postsToReturn.length - 1];
    const nextCursor = hasMore && lastPost ? lastPost.id.toString() : null;

    return {
      items: postsToReturn.map((p) => {
        const mediaIds = Array.isArray(p.mediaUrls) ? p.mediaUrls : [];
        return {
          id: p.id.toString(),
          authorId: p.userId.toString(),
          type: p.type,
          content: p.content,
          mediaIds,
          tags: [], // TODO: Add tag support
          visibility: p.visibility,
          stats: {
            likeCount: p.likesCount,
            commentCount: p.commentsCount,
            repostCount: p.repostsCount,
            viewCount: p.viewsCount,
          },
          createdAt: p.createdAt,
          updatedAt: p.updatedAt,
        };
      }),
      nextCursor,
      hasMore,
    };
  },
};
