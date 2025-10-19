/**
 * Discovery Router Validation Schemas - Phase 3.7
 *
 * Zod schemas for validating search and discovery inputs.
 * These schemas enforce business rules for content exploration and user search.
 *
 * @see docs/tasks/task-3.7.md lines 362-370
 * @see packages/api-contracts/src/procedures/discovery.ts
 */

import { z } from "zod";

// =============================================================================
// SEARCH USERS SCHEMA
// =============================================================================

/**
 * Schema for searching users by username or display name
 * - query: Search term (min 1 character, max 100)
 * - limit: Number of results to return (1-100, default 20)
 * - cursor: Pagination cursor (optional)
 */
export const searchUsersSchema = z.object({
  query: z
    .string()
    .min(1, "Search query must be at least 1 character")
    .max(100, "Search query must be at most 100 characters"),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// =============================================================================
// SEARCH POSTS SCHEMA
// =============================================================================

/**
 * Schema for searching posts by content
 * - query: Search term (min 1 character, max 100)
 * - limit: Number of results to return (1-100, default 20)
 * - cursor: Pagination cursor (optional)
 */
export const searchPostsSchema = z.object({
  query: z
    .string()
    .min(1, "Search query must be at least 1 character")
    .max(100, "Search query must be at most 100 characters"),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// =============================================================================
// GET DISCOVER FEED SCHEMA
// =============================================================================

/**
 * Schema for getting the discover feed
 * Returns popular posts from 2-degree network (friends + friends-of-friends)
 * - limit: Number of results to return (1-100, default 20)
 * - cursor: Pagination cursor (optional)
 */
export const getDiscoverFeedSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
