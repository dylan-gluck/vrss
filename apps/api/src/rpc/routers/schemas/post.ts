/**
 * Post Router Validation Schemas - Phase 3.3
 *
 * Zod schemas for validating post creation, updates, and interaction inputs.
 * These schemas enforce business rules for content creation and storage quotas.
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.3
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 180-270 (posts)
 * @see docs/specs/001-vrss-social-platform/PRD.md lines 157-167 (F3: Content Creation)
 */

import { z } from "zod";

// =============================================================================
// POST TYPE AND VISIBILITY ENUMS
// =============================================================================

export const postTypeSchema = z.enum(["text", "image", "video", "song"], {
  errorMap: () => ({ message: "Post type must be text, image, video, or song" }),
});

export const postVisibilitySchema = z.enum(["public", "followers", "private"], {
  errorMap: () => ({ message: "Visibility must be public, followers, or private" }),
});

// =============================================================================
// POST CREATE SCHEMAS
// =============================================================================

export const createPostSchema = z
  .object({
    type: postTypeSchema,
    content: z
      .string()
      .min(1, "Content is required")
      .max(10000, "Content must be at most 10,000 characters"),
    mediaIds: z.array(z.string()).optional(),
    visibility: postVisibilitySchema.default("public"),
  })
  .refine(
    (data) => {
      // Text posts must have content
      if (data.type === "text") {
        return data.content.trim().length > 0;
      }
      return true;
    },
    { message: "Text posts must have non-empty content" }
  )
  .refine(
    (data) => {
      // Media posts (image, video, song) must have mediaIds
      if (data.type === "image" || data.type === "video" || data.type === "song") {
        return data.mediaIds && data.mediaIds.length > 0;
      }
      return true;
    },
    { message: "Media posts must have at least one media file" }
  );

// =============================================================================
// POST RETRIEVE SCHEMAS
// =============================================================================

export const getPostByIdSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
});

// =============================================================================
// POST UPDATE SCHEMAS
// =============================================================================

export const updatePostSchema = z
  .object({
    postId: z.string().min(1, "Post ID is required"),
    content: z
      .string()
      .min(1, "Content must be at least 1 character")
      .max(10000, "Content must be at most 10,000 characters")
      .optional(),
    visibility: postVisibilitySchema.optional(),
  })
  .refine((data) => data.content !== undefined || data.visibility !== undefined, {
    message: "At least one field (content or visibility) must be provided",
  });

// =============================================================================
// POST DELETE SCHEMAS
// =============================================================================

export const deletePostSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
});

// =============================================================================
// POST INTERACTION SCHEMAS (Like/Unlike)
// =============================================================================

export const likePostSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
});

export const unlikePostSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
});

// =============================================================================
// COMMENT SCHEMAS
// =============================================================================

export const createCommentSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  content: z
    .string()
    .min(1, "Comment content is required")
    .max(2000, "Comment must be at most 2,000 characters"),
  parentCommentId: z.string().optional(), // For nested replies
});

export const getCommentsSchema = z.object({
  postId: z.string().min(1, "Post ID is required"),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(), // For cursor-based pagination
});
