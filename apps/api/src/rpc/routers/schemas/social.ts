/**
 * Social Router Validation Schemas - Phase 3.4
 *
 * Zod schemas for validating social interaction inputs (follow, unfollow, followers, following, friends).
 * These schemas enforce business rules for social relationships and pagination.
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.4
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 277-317 (user_follows & friendships)
 * @see docs/api-architecture.md lines 313-375 (SocialProcedures type definitions)
 */

import { z } from "zod";

// =============================================================================
// FOLLOW/UNFOLLOW SCHEMAS
// =============================================================================

export const followUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

export const unfollowUserSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
});

// =============================================================================
// FOLLOWER/FOLLOWING LIST SCHEMAS
// =============================================================================

export const getFollowersSchema = z.object({
  userId: z.string().optional(), // If not provided, defaults to current user
  limit: z.number().int().min(1).default(20), // Max capped in handler, not schema
  cursor: z.string().optional(), // For cursor-based pagination
});

export const getFollowingSchema = z.object({
  userId: z.string().optional(), // If not provided, defaults to current user
  limit: z.number().int().min(1).default(20), // Max capped in handler, not schema
  cursor: z.string().optional(), // For cursor-based pagination
});

// =============================================================================
// FRIENDS LIST SCHEMA
// =============================================================================

export const getFriendsSchema = z.object({
  userId: z.string().optional(), // If not provided, defaults to current user
  limit: z.number().int().min(1).default(20), // Max capped in handler, not schema
  cursor: z.string().optional(), // For cursor-based pagination
});
