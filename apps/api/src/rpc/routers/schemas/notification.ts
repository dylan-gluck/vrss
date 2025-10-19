/**
 * Notification Router Validation Schemas - Phase 3.7
 *
 * Zod schemas for validating notification management inputs.
 * These schemas enforce business rules for notification operations.
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.7
 * @see docs/tasks/task-3.7.md lines 354-361 (Notification Router requirements)
 */

import { z } from "zod";

// =============================================================================
// NOTIFICATION RETRIEVAL SCHEMAS
// =============================================================================

export const getNotificationsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(), // For cursor-based pagination
  unreadOnly: z.boolean().default(false),
});

// =============================================================================
// NOTIFICATION MARK AS READ SCHEMAS
// =============================================================================

export const markAsReadSchema = z.object({
  notificationIds: z
    .array(z.string().min(1, "Notification ID is required"))
    .min(1, "At least one notification ID is required")
    .max(100, "Cannot mark more than 100 notifications at once"),
});

// =============================================================================
// NOTIFICATION DELETE SCHEMAS
// =============================================================================

export const deleteNotificationSchema = z.object({
  notificationId: z.string().min(1, "Notification ID is required"),
});
