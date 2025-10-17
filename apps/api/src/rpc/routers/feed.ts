/**
 * Feed Router - Phase 3.4
 *
 * Implements all custom feed management procedures for the VRSS Social Platform.
 * Handles feed retrieval (default and custom), creation, updates, and deletion.
 *
 * Procedures:
 * - feed.get: Retrieve posts from default or custom feed with pagination
 * - feed.create: Create new custom feed with filters and algorithm config
 * - feed.update: Update custom feed name, filters, or default status
 * - feed.delete: Delete custom feed (soft delete preserves data)
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.4
 * @see docs/api-architecture.md (Feed Procedures type definitions)
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md (custom_feeds, feed_filters)
 */

import { type Prisma, PrismaClient } from "@prisma/client";
import { ErrorCode } from "@vrss/api-contracts";
import type { z } from "zod";
import {
  type AlgorithmConfig,
  executeFeedAlgorithm,
  getDefaultFeed,
} from "../../features/feed/feed-algorithm";
import type { ProcedureContext } from "../types";
import {
  createFeedSchema,
  deleteFeedSchema,
  getFeedSchema,
  updateFeedSchema,
} from "./schemas/feed";

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
 * Check if user owns a custom feed
 */
async function checkFeedOwnership(feedId: string, userId: bigint): Promise<any> {
  const feed = await prisma.customFeed.findFirst({
    where: {
      id: BigInt(feedId),
    },
  });

  if (!feed) {
    throw new RPCError(ErrorCode.FEED_NOT_FOUND, "Feed not found", { feedId });
  }

  if (feed.userId !== userId) {
    throw new RPCError(ErrorCode.FORBIDDEN, "You do not have permission to modify this feed");
  }

  return feed;
}

/**
 * Check if feed name is unique for this user
 */
async function checkFeedNameUnique(
  userId: bigint,
  name: string,
  excludeFeedId?: string
): Promise<void> {
  const existingFeed = await prisma.customFeed.findFirst({
    where: {
      userId,
      name: {
        equals: name,
        mode: "insensitive",
      },
      ...(excludeFeedId ? { id: { not: BigInt(excludeFeedId) } } : {}),
    },
  });

  if (existingFeed) {
    throw new RPCError(ErrorCode.CONFLICT, "A feed with this name already exists", { name });
  }
}

// =============================================================================
// FEED PROCEDURES
// =============================================================================

export const feedRouter = {
  /**
   * feed.get - Get feed posts
   *
   * Retrieves posts from either:
   * - Default feed: Chronological posts from followed users (no feedId)
   * - Custom feed: Posts filtered and sorted by algorithm config (with feedId)
   *
   * Supports cursor-based pagination for infinite scroll.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated (for custom feeds)
   * @throws {RPCError} FEED_NOT_FOUND - Custom feed does not exist
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   */
  "feed.get": async (ctx: ProcedureContext<z.infer<typeof getFeedSchema>>) => {
    // Validate input
    const validationResult = getFeedSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
        errors: error.errors,
      });
    }

    const { feedId, limit, cursor } = validationResult.data;

    // If no feedId provided, return default "Following" feed
    if (!feedId) {
      // Default feed requires authentication
      if (!ctx.user) {
        throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
      }

      const result = await getDefaultFeed(ctx.user.id, { limit, cursor });

      return {
        posts: result.posts,
        nextCursor: result.nextCursor,
        hasMore: result.hasMore,
      };
    }

    // Custom feed: Requires authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Fetch custom feed with filters
    const feed = await prisma.customFeed.findFirst({
      where: {
        id: BigInt(feedId),
        userId: BigInt(ctx.user.id),
      },
      include: {
        filters: true,
      },
    });

    if (!feed) {
      throw new RPCError(ErrorCode.FEED_NOT_FOUND, "Feed not found", { feedId });
    }

    // Build algorithm config from feed filters
    const algorithmConfig: AlgorithmConfig = {
      filters: feed.filters.map((f) => ({
        type: f.type as any,
        operator: f.operator as any,
        value: f.value,
      })),
      logic: "AND",
      sort: "recent",
    };

    // Execute feed algorithm
    const result = await executeFeedAlgorithm(ctx.user.id, algorithmConfig, { limit, cursor });

    return {
      posts: result.posts,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    };
  },

  /**
   * feed.create - Create custom feed
   *
   * Creates a new custom feed with filters and algorithm configuration.
   * Feed name must be unique for the user.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   * @throws {RPCError} CONFLICT - Feed name already exists
   */
  "feed.create": async (ctx: ProcedureContext<z.infer<typeof createFeedSchema>>) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = createFeedSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
        errors: error.errors,
      });
    }

    const { name, filters, isDefault } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    // Check name uniqueness
    await checkFeedNameUnique(userId, name);

    // Build algorithm config
    const algorithmConfig: AlgorithmConfig = {
      filters: filters as any,
      logic: "AND", // Default to AND logic
      sort: "recent", // Default to chronological sort
    };

    // If setting as default, unset other default feeds
    if (isDefault) {
      await prisma.customFeed.updateMany({
        where: {
          userId,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
    }

    // Create custom feed with filters in transaction
    const feed = await prisma.$transaction(async (tx) => {
      // Create custom feed
      const createdFeed = await tx.customFeed.create({
        data: {
          userId,
          name,
          algorithmConfig: algorithmConfig as unknown as Prisma.InputJsonValue,
          isDefault: isDefault || false,
          displayOrder: 0,
        },
      });

      // Create feed filters
      await tx.feedFilter.createMany({
        data: filters.map((filter, index) => ({
          feedId: createdFeed.id,
          type: filter.type,
          operator: filter.operator,
          value: filter.value as Prisma.InputJsonValue,
          displayOrder: index,
          groupId: 0,
          logicalOperator: "AND",
        })),
      });

      return createdFeed;
    });

    return {
      feed: {
        id: feed.id.toString(),
        userId: feed.userId.toString(),
        name: feed.name,
        filters: filters as any,
        isDefault: feed.isDefault,
        createdAt: feed.createdAt,
        updatedAt: feed.updatedAt,
      },
    };
  },

  /**
   * feed.update - Update custom feed
   *
   * Updates feed name, filters, or default status.
   * Supports partial updates (only updates provided fields).
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} FEED_NOT_FOUND - Feed does not exist
   * @throws {RPCError} FORBIDDEN - User does not own feed
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   * @throws {RPCError} CONFLICT - Feed name already exists
   */
  "feed.update": async (ctx: ProcedureContext<z.infer<typeof updateFeedSchema>>) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = updateFeedSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
        errors: error.errors,
      });
    }

    const { feedId, name, filters, isDefault } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    // Check ownership
    const _existingFeed = await checkFeedOwnership(feedId, userId);

    // Check name uniqueness if name is being updated
    if (name !== undefined) {
      await checkFeedNameUnique(userId, name, feedId);
    }

    // Update feed in transaction
    const updatedFeed = await prisma.$transaction(async (tx) => {
      // Build update data
      const updateData: Prisma.CustomFeedUpdateInput = {
        updatedAt: new Date(),
      };

      if (name !== undefined) {
        updateData.name = name;
      }

      if (isDefault !== undefined) {
        // If setting as default, unset other default feeds
        if (isDefault) {
          await tx.customFeed.updateMany({
            where: {
              userId,
              isDefault: true,
              id: { not: BigInt(feedId) },
            },
            data: {
              isDefault: false,
            },
          });
        }
        updateData.isDefault = isDefault;
      }

      // Update algorithm config if filters provided
      if (filters !== undefined) {
        const algorithmConfig: AlgorithmConfig = {
          filters: filters as any,
          logic: "AND",
          sort: "recent",
        };
        updateData.algorithmConfig = algorithmConfig as unknown as Prisma.InputJsonValue;

        // Delete old filters and create new ones
        await tx.feedFilter.deleteMany({
          where: { feedId: BigInt(feedId) },
        });

        await tx.feedFilter.createMany({
          data: filters.map((filter, index) => ({
            feedId: BigInt(feedId),
            type: filter.type,
            operator: filter.operator,
            value: filter.value as Prisma.InputJsonValue,
            displayOrder: index,
            groupId: 0,
            logicalOperator: "AND",
          })),
        });
      }

      // Update feed
      const updated = await tx.customFeed.update({
        where: { id: BigInt(feedId) },
        data: updateData,
      });

      return updated;
    });

    // Get current algorithm config
    const algorithmConfig = updatedFeed.algorithmConfig as unknown as AlgorithmConfig;

    return {
      feed: {
        id: updatedFeed.id.toString(),
        userId: updatedFeed.userId.toString(),
        name: updatedFeed.name,
        filters: algorithmConfig.filters as any,
        isDefault: updatedFeed.isDefault,
        createdAt: updatedFeed.createdAt,
        updatedAt: updatedFeed.updatedAt,
      },
    };
  },

  /**
   * feed.delete - Delete custom feed
   *
   * Deletes a custom feed. CASCADE deletes associated feed_filters.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} FEED_NOT_FOUND - Feed does not exist
   * @throws {RPCError} FORBIDDEN - User does not own feed
   */
  "feed.delete": async (ctx: ProcedureContext<z.infer<typeof deleteFeedSchema>>) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = deleteFeedSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, { field: error.field });
    }

    const { feedId } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    // Check ownership
    await checkFeedOwnership(feedId, userId);

    // Delete feed (CASCADE will delete feed_filters)
    await prisma.customFeed.delete({
      where: { id: BigInt(feedId) },
    });

    return {
      success: true,
    };
  },
};
