/**
 * Feed Router Validation Schemas - Phase 3.4
 *
 * Zod schemas for validating feed creation, updates, and retrieval inputs.
 * These schemas enforce business rules for custom feed management.
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.4
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md (custom_feeds, feed_filters)
 */

import { z } from "zod";

// =============================================================================
// FILTER SCHEMAS
// =============================================================================

export const filterTypeSchema = z.enum(["post_type", "author", "tag", "date_range", "engagement"], {
  errorMap: () => ({ message: "Invalid filter type" }),
});

export const filterOperatorSchema = z.enum(
  ["equals", "not_equals", "contains", "greater_than", "less_than", "in_range"],
  {
    errorMap: () => ({ message: "Invalid filter operator" }),
  }
);

export const feedFilterSchema = z
  .object({
    type: filterTypeSchema,
    operator: filterOperatorSchema,
    value: z.any(), // Can be string[], number, date range, etc.
  })
  .strict();

// =============================================================================
// FEED GET SCHEMA
// =============================================================================

export const getFeedSchema = z.object({
  feedId: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

// =============================================================================
// FEED CREATE SCHEMA
// =============================================================================

export const createFeedSchema = z.object({
  name: z
    .string()
    .min(1, "Feed name is required")
    .max(100, "Feed name must be at most 100 characters"),
  filters: z.array(feedFilterSchema).default([]),
  isDefault: z.boolean().optional().default(false),
});

// =============================================================================
// FEED UPDATE SCHEMA
// =============================================================================

export const updateFeedSchema = z
  .object({
    feedId: z.string().min(1, "Feed ID is required"),
    name: z
      .string()
      .min(1, "Feed name must be at least 1 character")
      .max(100, "Feed name must be at most 100 characters")
      .optional(),
    filters: z.array(feedFilterSchema).optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(
    (data) => data.name !== undefined || data.filters !== undefined || data.isDefault !== undefined,
    { message: "At least one field (name, filters, or isDefault) must be provided" }
  );

// =============================================================================
// FEED DELETE SCHEMA
// =============================================================================

export const deleteFeedSchema = z.object({
  feedId: z.string().min(1, "Feed ID is required"),
});
