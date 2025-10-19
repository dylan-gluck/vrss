/**
 * Notification Router - Phase 3.7
 *
 * Implements all notification management procedures for the VRSS Social Platform.
 * Handles notification retrieval, marking as read, and deletion.
 *
 * Procedures:
 * - notification.getNotifications: List notifications with cursor pagination, return unread count
 * - notification.markAsRead: Bulk mark notifications as read (sets read_at timestamp)
 * - notification.deleteNotification: Delete notification (hard delete)
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.7
 * @see docs/tasks/task-3.7.md lines 354-361 (Notification Router requirements)
 */

import { type Prisma, PrismaClient } from "@prisma/client";
import { ErrorCode } from "@vrss/api-contracts";
import type { z } from "zod";
import type { ProcedureContext } from "../types";
import {
  deleteNotificationSchema,
  getNotificationsSchema,
  markAsReadSchema,
} from "./schemas/notification";

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
 * Calculate unread notification count for a user
 * Uses index idx_notifications_user_unread for performance
 */
async function getUnreadCount(userId: bigint): Promise<number> {
  const count = await prisma.notification.count({
    where: {
      userId,
      isRead: false,
    },
  });
  return count;
}

// =============================================================================
// NOTIFICATION PROCEDURES
// =============================================================================

export const notificationRouter = {
  /**
   * notification.getNotifications - Get user's notifications
   *
   * Lists notifications with cursor-based pagination and returns unread count.
   * Users can only access their own notifications.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   */
  "notification.getNotifications": async (
    ctx: ProcedureContext<z.infer<typeof getNotificationsSchema>>
  ) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = getNotificationsSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
        errors: error.errors,
      });
    }

    const { limit, cursor, unreadOnly } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    // Build query
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly && { isRead: false }),
    };

    // Cursor pagination
    if (cursor) {
      where.id = { lt: BigInt(cursor) }; // Get notifications before cursor
    }

    // Fetch notifications
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to determine if there are more
      include: {
        actor: {
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

    // Determine if there are more notifications
    const hasMore = notifications.length > limit;
    const notificationsToReturn = hasMore ? notifications.slice(0, limit) : notifications;
    const lastNotification = notificationsToReturn[notificationsToReturn.length - 1];
    const nextCursor = hasMore && lastNotification ? lastNotification.id.toString() : null;

    // Get unread count (uses index for performance)
    const unreadCount = await getUnreadCount(userId);

    return {
      items: notificationsToReturn.map((n) => ({
        id: n.id.toString(),
        userId: n.userId.toString(),
        type: n.type,
        actorId: n.actorId?.toString() || null,
        targetId: n.postId?.toString() || n.commentId?.toString() || null,
        content: n.content || "",
        isRead: n.isRead,
        createdAt: n.createdAt,
      })),
      nextCursor,
      hasMore,
      unreadCount,
    };
  },

  /**
   * notification.markAsRead - Bulk mark notifications as read
   *
   * Marks multiple notifications as read in a single operation.
   * Sets the read_at timestamp for all specified notifications.
   * Users can only mark their own notifications as read.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   */
  "notification.markAsRead": async (ctx: ProcedureContext<z.infer<typeof markAsReadSchema>>) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = markAsReadSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
        errors: error.errors,
      });
    }

    const { notificationIds } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    // Convert notification IDs to BigInt
    const notificationBigIntIds = notificationIds.map((id) => BigInt(id));

    // Bulk update notifications
    // Only update notifications that belong to the current user
    const result = await prisma.notification.updateMany({
      where: {
        id: { in: notificationBigIntIds },
        userId, // Authorization: only update user's own notifications
        isRead: false, // Only update unread notifications
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return {
      success: true,
      count: result.count,
    };
  },

  /**
   * notification.deleteNotification - Delete a notification
   *
   * Deletes a notification (hard delete since schema doesn't support soft delete).
   * Users can only delete their own notifications.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   * @throws {RPCError} NOT_FOUND - Notification not found
   * @throws {RPCError} FORBIDDEN - User does not own notification
   */
  "notification.deleteNotification": async (
    ctx: ProcedureContext<z.infer<typeof deleteNotificationSchema>>
  ) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = deleteNotificationSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
        errors: error.errors,
      });
    }

    const { notificationId } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    // Check if notification exists and belongs to user
    const notification = await prisma.notification.findFirst({
      where: {
        id: BigInt(notificationId),
      },
    });

    if (!notification) {
      throw new RPCError(ErrorCode.NOT_FOUND, "Notification not found");
    }

    // Check ownership
    if (notification.userId !== userId) {
      throw new RPCError(
        ErrorCode.FORBIDDEN,
        "You do not have permission to delete this notification"
      );
    }

    // Delete notification
    await prisma.notification.delete({
      where: { id: BigInt(notificationId) },
    });

    return {
      success: true,
    };
  },
};
