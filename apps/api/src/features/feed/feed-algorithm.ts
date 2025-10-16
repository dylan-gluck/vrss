/**
 * Feed Algorithm Engine - Phase 3.4
 *
 * Executes custom feed algorithms by building Prisma queries from filter configurations.
 * Handles filter types (post_type, author, tag, date_range, engagement) with logical operators.
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.4
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md (custom_feeds, feed_filters)
 */

import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

export interface FeedFilter {
  type: "post_type" | "author" | "tag" | "date_range" | "engagement";
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "in_range";
  value: any;
}

export interface AlgorithmConfig {
  filters: FeedFilter[];
  logic?: "AND" | "OR";
  sort?: "recent" | "popular";
}

export interface PaginationOptions {
  limit: number;
  cursor?: string;
}

export interface FeedResult {
  posts: any[];
  nextCursor: string | undefined;
  hasMore: boolean;
}

// =============================================================================
// FILTER BUILDER
// =============================================================================

/**
 * Build Prisma where clause from a single filter
 */
function buildFilterCondition(filter: FeedFilter): Prisma.PostWhereInput {
  const { type, operator, value } = filter;

  switch (type) {
    case "post_type":
      // Filter by post type(s)
      if (operator === "equals") {
        return { type: value };
      } else if (operator === "not_equals") {
        return { type: { not: value } };
      } else if (operator === "contains" || operator === "in_range") {
        // Support array of types
        const types = Array.isArray(value) ? value : [value];
        return { type: { in: types } };
      }
      break;

    case "author":
      // Filter by author ID(s)
      if (operator === "equals") {
        return { userId: BigInt(value) };
      } else if (operator === "not_equals") {
        return { userId: { not: BigInt(value) } };
      } else if (operator === "contains" || operator === "in_range") {
        // Support array of author IDs
        const authorIds = Array.isArray(value) ? value.map((id: string) => BigInt(id)) : [BigInt(value)];
        return { userId: { in: authorIds } };
      }
      break;

    case "tag":
      // Filter by hashtag in content
      if (operator === "contains") {
        const tags = Array.isArray(value) ? value : [value];
        // Build OR conditions for each tag
        const tagConditions = tags.map((tag: string) => ({
          content: { contains: `#${tag}`, mode: Prisma.QueryMode.insensitive },
        }));
        return { OR: tagConditions } as Prisma.PostWhereInput;
      }
      break;

    case "date_range":
      // Filter by date range
      if (operator === "in_range") {
        // Handle both array format [start, end] and object format {start, end}
        let startDate, endDate;
        if (Array.isArray(value) && value.length === 2) {
          [startDate, endDate] = value;
        } else if (typeof value === "object" && value.start && value.end) {
          startDate = value.start;
          endDate = value.end;
        }

        if (startDate && endDate) {
          return {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          };
        }
      } else if (operator === "greater_than") {
        return { createdAt: { gte: new Date(value) } };
      } else if (operator === "less_than") {
        return { createdAt: { lte: new Date(value) } };
      }
      break;

    case "engagement":
      // Filter by engagement metrics
      if (operator === "greater_than") {
        // value format: { metric: 'likes' | 'comments' | 'reposts', threshold: number }
        const metric = value.metric || "likes";
        const threshold = value.threshold || 0;

        switch (metric) {
          case "likes":
            return { likesCount: { gt: threshold } };
          case "comments":
            return { commentsCount: { gt: threshold } };
          case "reposts":
            return { repostsCount: { gt: threshold } };
          case "views":
            return { viewsCount: { gt: threshold } };
        }
      } else if (operator === "less_than") {
        const metric = value.metric || "likes";
        const threshold = value.threshold || 0;

        switch (metric) {
          case "likes":
            return { likesCount: { lt: threshold } };
          case "comments":
            return { commentsCount: { lt: threshold } };
          case "reposts":
            return { repostsCount: { lt: threshold } };
          case "views":
            return { viewsCount: { lt: threshold } };
        }
      }
      break;
  }

  // Return empty condition if filter not handled
  return {};
}

/**
 * Build complete where clause from algorithm config
 */
function buildWhereClause(algorithmConfig: AlgorithmConfig, userId: string): Prisma.PostWhereInput {
  const { filters = [], logic = "AND" } = algorithmConfig;

  // Build filter conditions
  const filterConditions = filters.map(buildFilterCondition).filter((condition) => {
    // Remove empty conditions
    return Object.keys(condition).length > 0;
  });

  // Base conditions (always apply)
  const baseConditions: Prisma.PostWhereInput = {
    deletedAt: null, // Exclude deleted posts
    // Note: Visibility filtering is handled separately based on viewer relationship
  };

  // Combine filters with logical operator
  if (logic === "OR") {
    return {
      ...baseConditions,
      OR: filterConditions.length > 0 ? filterConditions : undefined,
    };
  } else {
    // AND logic (default)
    return {
      ...baseConditions,
      AND: filterConditions.length > 0 ? filterConditions : undefined,
    };
  }
}

/**
 * Apply visibility filtering based on viewer's relationship to post authors
 */
async function applyVisibilityFiltering(
  posts: any[],
  viewerId: string
): Promise<any[]> {
  if (posts.length === 0) return posts;

  // Get user IDs from posts
  const authorIds = [...new Set(posts.map((p) => p.userId))];

  // Get following relationships
  const followingRelations = await prisma.userFollow.findMany({
    where: {
      followerId: BigInt(viewerId),
      followingId: { in: authorIds },
    },
    select: { followingId: true },
  });

  const followingIds = new Set(followingRelations.map((f) => f.followingId.toString()));

  // Filter posts based on visibility
  return posts.filter((post) => {
    const authorId = post.userId.toString();
    const isOwnPost = authorId === viewerId;
    const isFollowing = followingIds.has(authorId);

    // Public posts: everyone can see
    if (post.visibility === "public") return true;

    // Own posts: always visible
    if (isOwnPost) return true;

    // Followers-only: only followers can see
    if (post.visibility === "followers") return isFollowing;

    // Private: only owner can see
    if (post.visibility === "private") return false;

    return false;
  });
}

// =============================================================================
// FEED ALGORITHM EXECUTION
// =============================================================================

/**
 * Execute feed algorithm to retrieve filtered and sorted posts
 */
export async function executeFeedAlgorithm(
  userId: string,
  algorithmConfig: AlgorithmConfig,
  options: PaginationOptions
): Promise<FeedResult> {
  const { limit, cursor } = options;
  const { sort = "recent" } = algorithmConfig;

  // Build where clause from filters
  const whereClause = buildWhereClause(algorithmConfig, userId);

  // Add cursor pagination
  if (cursor) {
    whereClause.id = { lt: BigInt(cursor) };
  }

  // Determine sort order
  const orderBy: Prisma.PostOrderByWithRelationInput =
    sort === "popular"
      ? { likesCount: "desc" } // Sort by popularity
      : { createdAt: "desc" }; // Sort by recency (default)

  // Fetch posts (fetch limit + 1 to check if more exist)
  const posts = await prisma.post.findMany({
    where: whereClause,
    orderBy,
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

  // Apply visibility filtering (in-memory)
  const visiblePosts = await applyVisibilityFiltering(posts, userId);

  // Determine pagination
  const hasMore = visiblePosts.length > limit;
  const postsToReturn = hasMore ? visiblePosts.slice(0, limit) : visiblePosts;
  const lastPost = postsToReturn[postsToReturn.length - 1];
  const nextCursor = hasMore && lastPost ? lastPost.id.toString() : null;

  // Format posts for response
  const formattedPosts = postsToReturn.map((post) => ({
    id: post.id.toString(),
    userId: post.userId.toString(),
    type: post.type,
    content: post.content,
    mediaIds: Array.isArray(post.mediaUrls) ? post.mediaUrls : [],
    visibility: post.visibility,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    repostsCount: post.repostsCount,
    viewsCount: post.viewsCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: {
      id: post.user.id.toString(),
      username: post.user.username,
      displayName: post.user.profile?.displayName || post.user.username,
    },
  }));

  return {
    posts: formattedPosts,
    nextCursor,
    hasMore,
  };
}

/**
 * Get default "Following" feed - chronological posts from followed users
 */
export async function getDefaultFeed(
  userId: string,
  options: PaginationOptions
): Promise<FeedResult> {
  const { limit, cursor } = options;

  // Get all users that the current user follows
  const following = await prisma.userFollow.findMany({
    where: { followerId: BigInt(userId) },
    select: { followingId: true },
  });

  const followingIds = following.map((f) => f.followingId);

  // If not following anyone, return empty feed
  if (followingIds.length === 0) {
    return {
      posts: [],
      nextCursor: undefined,
      hasMore: false,
    };
  }

  // Build where clause
  const whereClause: Prisma.PostWhereInput = {
    userId: { in: followingIds },
    deletedAt: null,
    visibility: { in: ["public", "followers"] }, // Respect privacy
  };

  // Add cursor pagination
  if (cursor) {
    whereClause.id = { lt: BigInt(cursor) };
  }

  // Fetch posts (chronological order)
  const posts = await prisma.post.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: limit + 1, // +1 to check if more exist
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

  // Determine pagination
  const hasMore = posts.length > limit;
  const postsToReturn = hasMore ? posts.slice(0, limit) : posts;
  const lastPost = postsToReturn[postsToReturn.length - 1];
  const nextCursor = hasMore && lastPost ? lastPost.id.toString() : undefined;

  // Format posts for response
  const formattedPosts = postsToReturn.map((post) => ({
    id: post.id.toString(),
    userId: post.userId.toString(),
    type: post.type,
    content: post.content,
    mediaIds: Array.isArray(post.mediaUrls) ? post.mediaUrls : [],
    visibility: post.visibility,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    repostsCount: post.repostsCount,
    viewsCount: post.viewsCount,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    author: {
      id: post.user.id.toString(),
      username: post.user.username,
      displayName: post.user.profile?.displayName || post.user.username,
    },
  }));

  return {
    posts: formattedPosts,
    nextCursor,
    hasMore,
  };
}
