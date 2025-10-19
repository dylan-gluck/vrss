/**
 * Notification Router Tests - Phase 3.7
 *
 * Comprehensive test suite for the Notification Router covering all 3 procedures:
 * - notification.getNotifications: List notifications with cursor pagination and unread count
 * - notification.markAsRead: Bulk mark notifications as read (sets read_at timestamp)
 * - notification.deleteNotification: Delete notification
 *
 * CRITICAL TESTS:
 * - Cursor-based pagination for notification list
 * - Unread count calculation using index
 * - Bulk mark as read operation
 * - Authorization: Users can only access their own notifications
 * - Filtering unread notifications
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.7
 * @see docs/tasks/task-3.7.md lines 354-361 (Notification Router requirements)
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ErrorCode } from "@vrss/api-contracts";
import { notificationRouter } from "../../src/rpc/routers/notification";
import type { ProcedureContext } from "../../src/rpc/types";
import { buildUser } from "../fixtures/userBuilder";
import { cleanAllTables } from "../helpers/database";
import { getTestDatabase } from "../setup";

// Test utilities
function createMockContext<T>(overrides?: Partial<ProcedureContext<T>>): ProcedureContext<T> {
  return {
    c: {} as any, // Mock Hono context (not needed for unit tests)
    user: null,
    session: null,
    ip: "127.0.0.1",
    userAgent: "Test User Agent",
    input: {} as T,
    ...overrides,
  };
}

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

describe("Notification Router", () => {
  const db = getTestDatabase();

  beforeEach(async () => {
    await cleanAllTables();
  });

  afterEach(async () => {
    await cleanAllTables();
  });

  // ===========================================================================
  // notification.getNotifications Tests
  // ===========================================================================

  describe("notification.getNotifications", () => {
    it("should return notifications with unread count", async () => {
      // Arrange: Create user with notifications
      const { user } = await buildUser().username("notified_user").withProfile().build();
      const { user: actor } = await buildUser().username("actor_user").withProfile().build();

      // Create 3 notifications (2 unread, 1 read)
      await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "like",
          title: "New like",
          content: "Someone liked your post",
          isRead: false,
        },
      });

      await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "comment",
          title: "New comment",
          content: "Someone commented on your post",
          isRead: false,
        },
      });

      await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "follow",
          title: "New follower",
          content: "Someone followed you",
          isRead: true,
          readAt: new Date(),
        },
      });

      const ctx = createMockContext<{
        limit?: number;
        cursor?: string;
        unreadOnly?: boolean;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      // Act: Get notifications
      const result = await notificationRouter["notification.getNotifications"](ctx);

      // Assert: Returns all notifications with unread count
      expect(result.items).toHaveLength(3);
      expect(result.unreadCount).toBe(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it("should filter unread notifications only when unreadOnly is true", async () => {
      // Arrange: Create user with mixed notifications
      const { user } = await buildUser().username("filter_user").withProfile().build();
      const { user: actor } = await buildUser().username("actor2").withProfile().build();

      await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "like",
          title: "Unread like",
          isRead: false,
        },
      });

      await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "comment",
          title: "Read comment",
          isRead: true,
          readAt: new Date(),
        },
      });

      const ctx = createMockContext<{
        limit?: number;
        cursor?: string;
        unreadOnly?: boolean;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          unreadOnly: true,
        },
      });

      // Act: Get unread notifications only
      const result = await notificationRouter["notification.getNotifications"](ctx);

      // Assert: Returns only unread notifications
      expect(result.items).toHaveLength(1);
      expect(result.items[0].isRead).toBe(false);
      expect(result.unreadCount).toBe(1);
    });

    it("should support cursor pagination", async () => {
      // Arrange: Create user with 25 notifications
      const { user } = await buildUser().username("paginated_user").withProfile().build();
      const { user: actor } = await buildUser().username("actor3").withProfile().build();

      for (let i = 0; i < 25; i++) {
        await db.notification.create({
          data: {
            userId: user.id,
            actorId: actor.id,
            type: "like",
            title: `Notification ${i}`,
            isRead: false,
          },
        });
        // Small delay to ensure different timestamps
        if (i < 24) {
          await new Promise((resolve) => setTimeout(resolve, 5));
        }
      }

      const ctx = createMockContext<{
        limit?: number;
        cursor?: string;
        unreadOnly?: boolean;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          limit: 20,
        },
      });

      // Act: Get first page
      const result = await notificationRouter["notification.getNotifications"](ctx);

      // Assert: Returns 20 notifications with nextCursor
      expect(result.items).toHaveLength(20);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).toBeDefined();

      // Act: Get second page
      const ctx2 = createMockContext<{
        limit?: number;
        cursor?: string;
        unreadOnly?: boolean;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          limit: 20,
          cursor: result.nextCursor as string,
        },
      });

      const result2 = await notificationRouter["notification.getNotifications"](ctx2);

      // Assert: Returns remaining 5 notifications
      expect(result2.items).toHaveLength(5);
      expect(result2.hasMore).toBe(false);
      expect(result2.nextCursor).toBeNull();
    });

    it("should order by created_at DESC (newest first)", async () => {
      // Arrange: Create notifications at different times
      const { user } = await buildUser().username("ordered_user").withProfile().build();
      const { user: actor } = await buildUser().username("actor4").withProfile().build();

      await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "like",
          title: "Old notification",
          content: "Old notification",
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "comment",
          title: "New notification",
          content: "New notification",
          createdAt: new Date(), // Now
        },
      });

      const ctx = createMockContext<{
        limit?: number;
        cursor?: string;
        unreadOnly?: boolean;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      // Act: Get notifications
      const result = await notificationRouter["notification.getNotifications"](ctx);

      // Assert: Newest first
      expect(result.items).toHaveLength(2);
      expect(result.items[0].content).toBe("New notification");
      expect(result.items[1].content).toBe("Old notification");
    });

    it("should only return user's own notifications (authorization)", async () => {
      // Arrange: Create two users with notifications
      const { user: user1 } = await buildUser().username("user1").withProfile().build();
      const { user: user2 } = await buildUser().username("user2").withProfile().build();
      const { user: actor } = await buildUser().username("actor5").withProfile().build();

      await db.notification.create({
        data: {
          userId: user1.id,
          actorId: actor.id,
          type: "like",
          title: "User1 notification",
          content: "User1 notification",
        },
      });

      await db.notification.create({
        data: {
          userId: user2.id,
          actorId: actor.id,
          type: "like",
          title: "User2 notification",
          content: "User2 notification",
        },
      });

      const ctx = createMockContext<{
        limit?: number;
        cursor?: string;
        unreadOnly?: boolean;
      }>({
        user: {
          id: user1.id,
          username: user1.username,
          email: user1.email,
        } as any,
        input: {},
      });

      // Act: Get notifications
      const result = await notificationRouter["notification.getNotifications"](ctx);

      // Assert: Only returns user1's notifications
      expect(result.items).toHaveLength(1);
      expect(result.items[0].content).toBe("User1 notification");
    });

    it("should return empty list for user with no notifications", async () => {
      // Arrange: Create user with no notifications
      const { user } = await buildUser().username("empty_user").withProfile().build();

      const ctx = createMockContext<{
        limit?: number;
        cursor?: string;
        unreadOnly?: boolean;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      // Act: Get notifications
      const result = await notificationRouter["notification.getNotifications"](ctx);

      // Assert: Empty list
      expect(result.items).toHaveLength(0);
      expect(result.unreadCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("should require authentication", async () => {
      // Arrange: Not authenticated
      const ctx = createMockContext<{
        limit?: number;
        cursor?: string;
        unreadOnly?: boolean;
      }>({
        user: null,
        input: {},
      });

      // Act & Assert: Should throw UNAUTHORIZED error
      await expect(notificationRouter["notification.getNotifications"](ctx)).rejects.toThrow();
    });

    it("should include actor information", async () => {
      // Arrange: Create notification with actor
      const { user } = await buildUser().username("recipient").withProfile().build();
      const { user: actor } = await buildUser()
        .username("actor_with_profile")
        .withProfile({ displayName: "Actor Name" })
        .build();

      await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "follow",
          title: "New follower",
          content: "You have a new follower",
        },
      });

      const ctx = createMockContext<{
        limit?: number;
        cursor?: string;
        unreadOnly?: boolean;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      // Act: Get notifications
      const result = await notificationRouter["notification.getNotifications"](ctx);

      // Assert: Actor information included
      expect(result.items).toHaveLength(1);
      expect(result.items[0].actorId).toBe(actor.id.toString());
    });
  });

  // ===========================================================================
  // notification.markAsRead Tests
  // ===========================================================================

  describe("notification.markAsRead", () => {
    it("should mark single notification as read", async () => {
      // Arrange: Create unread notification
      const { user } = await buildUser().username("mark_user").withProfile().build();
      const { user: actor } = await buildUser().username("actor6").withProfile().build();

      const notification = await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "like",
          title: "Unread",
          isRead: false,
        },
      });

      const ctx = createMockContext<{
        notificationIds: string[];
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          notificationIds: [notification.id.toString()],
        },
      });

      // Act: Mark as read
      const result = await notificationRouter["notification.markAsRead"](ctx);

      // Assert: Marked as read
      expect(result.success).toBe(true);
      expect(result.count).toBe(1);

      const updated = await db.notification.findUnique({
        where: { id: notification.id },
      });

      expect(updated?.isRead).toBe(true);
      expect(updated?.readAt).toBeInstanceOf(Date);
    });

    it("should bulk mark multiple notifications as read", async () => {
      // Arrange: Create multiple unread notifications
      const { user } = await buildUser().username("bulk_user").withProfile().build();
      const { user: actor } = await buildUser().username("actor7").withProfile().build();

      const notif1 = await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "like",
          title: "Notification 1",
          isRead: false,
        },
      });

      const notif2 = await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "comment",
          title: "Notification 2",
          isRead: false,
        },
      });

      const notif3 = await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "follow",
          title: "Notification 3",
          isRead: false,
        },
      });

      const ctx = createMockContext<{
        notificationIds: string[];
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          notificationIds: [notif1.id.toString(), notif2.id.toString(), notif3.id.toString()],
        },
      });

      // Act: Bulk mark as read
      const result = await notificationRouter["notification.markAsRead"](ctx);

      // Assert: All marked as read
      expect(result.success).toBe(true);
      expect(result.count).toBe(3);

      const updated1 = await db.notification.findUnique({ where: { id: notif1.id } });
      const updated2 = await db.notification.findUnique({ where: { id: notif2.id } });
      const updated3 = await db.notification.findUnique({ where: { id: notif3.id } });

      expect(updated1?.isRead).toBe(true);
      expect(updated2?.isRead).toBe(true);
      expect(updated3?.isRead).toBe(true);
    });

    it("should only mark user's own notifications (authorization)", async () => {
      // Arrange: Create notifications for two users
      const { user: user1 } = await buildUser().username("owner").withProfile().build();
      const { user: user2 } = await buildUser().username("other").withProfile().build();
      const { user: actor } = await buildUser().username("actor8").withProfile().build();

      const notif1 = await db.notification.create({
        data: {
          userId: user1.id,
          actorId: actor.id,
          type: "like",
          title: "User1 notification",
          isRead: false,
        },
      });

      const notif2 = await db.notification.create({
        data: {
          userId: user2.id,
          actorId: actor.id,
          type: "like",
          title: "User2 notification",
          isRead: false,
        },
      });

      const ctx = createMockContext<{
        notificationIds: string[];
      }>({
        user: {
          id: user1.id,
          username: user1.username,
          email: user1.email,
        } as any,
        input: {
          notificationIds: [notif1.id.toString(), notif2.id.toString()],
        },
      });

      // Act: Try to mark both notifications
      const result = await notificationRouter["notification.markAsRead"](ctx);

      // Assert: Only user1's notification marked
      expect(result.success).toBe(true);
      expect(result.count).toBe(1); // Only 1 updated

      const updated1 = await db.notification.findUnique({ where: { id: notif1.id } });
      const updated2 = await db.notification.findUnique({ where: { id: notif2.id } });

      expect(updated1?.isRead).toBe(true); // User1's notification updated
      expect(updated2?.isRead).toBe(false); // User2's notification NOT updated
    });

    it("should not update already read notifications", async () => {
      // Arrange: Create already read notification
      const { user } = await buildUser().username("already_read_user").withProfile().build();
      const { user: actor } = await buildUser().username("actor9").withProfile().build();

      const oldReadAt = new Date(Date.now() - 3600000); // 1 hour ago

      const notification = await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "like",
          title: "Already read",
          isRead: true,
          readAt: oldReadAt,
        },
      });

      const ctx = createMockContext<{
        notificationIds: string[];
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          notificationIds: [notification.id.toString()],
        },
      });

      // Act: Try to mark as read
      const result = await notificationRouter["notification.markAsRead"](ctx);

      // Assert: No update (already read)
      expect(result.success).toBe(true);
      expect(result.count).toBe(0); // 0 updated

      const updated = await db.notification.findUnique({
        where: { id: notification.id },
      });

      // Timestamp should remain unchanged
      expect(updated?.readAt?.getTime()).toBe(oldReadAt.getTime());
    });

    it("should require authentication", async () => {
      // Arrange: Not authenticated
      const ctx = createMockContext<{
        notificationIds: string[];
      }>({
        user: null,
        input: {
          notificationIds: ["1"],
        },
      });

      // Act & Assert: Should throw UNAUTHORIZED error
      await expect(notificationRouter["notification.markAsRead"](ctx)).rejects.toThrow();
    });

    it("should validate input (empty array)", async () => {
      // Arrange: Empty notification IDs array
      const { user } = await buildUser().username("validate_user").withProfile().build();

      const ctx = createMockContext<{
        notificationIds: string[];
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          notificationIds: [],
        },
      });

      // Act & Assert: Should throw validation error
      await expect(notificationRouter["notification.markAsRead"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // notification.deleteNotification Tests
  // ===========================================================================

  describe("notification.deleteNotification", () => {
    it("should delete notification", async () => {
      // Arrange: Create notification
      const { user } = await buildUser().username("delete_user").withProfile().build();
      const { user: actor } = await buildUser().username("actor10").withProfile().build();

      const notification = await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "like",
          title: "To be deleted",
        },
      });

      const ctx = createMockContext<{
        notificationId: string;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          notificationId: notification.id.toString(),
        },
      });

      // Act: Delete notification
      const result = await notificationRouter["notification.deleteNotification"](ctx);

      // Assert: Deleted
      expect(result.success).toBe(true);

      const deleted = await db.notification.findUnique({
        where: { id: notification.id },
      });

      expect(deleted).toBeNull();
    });

    it("should not delete other user's notification (authorization)", async () => {
      // Arrange: Create notification for user1
      const { user: user1 } = await buildUser().username("owner2").withProfile().build();
      const { user: user2 } = await buildUser().username("hacker").withProfile().build();
      const { user: actor } = await buildUser().username("actor11").withProfile().build();

      const notification = await db.notification.create({
        data: {
          userId: user1.id,
          actorId: actor.id,
          type: "like",
          title: "User1's notification",
        },
      });

      const ctx = createMockContext<{
        notificationId: string;
      }>({
        user: {
          id: user2.id, // Different user
          username: user2.username,
          email: user2.email,
        } as any,
        input: {
          notificationId: notification.id.toString(),
        },
      });

      // Act & Assert: Should throw FORBIDDEN error
      await expect(notificationRouter["notification.deleteNotification"](ctx)).rejects.toThrow();

      // Assert: Notification still exists
      const stillExists = await db.notification.findUnique({
        where: { id: notification.id },
      });

      expect(stillExists).not.toBeNull();
    });

    it("should return error for non-existent notification", async () => {
      // Arrange: User trying to delete non-existent notification
      const { user } = await buildUser().username("notfound_user").withProfile().build();

      const ctx = createMockContext<{
        notificationId: string;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          notificationId: "99999999",
        },
      });

      // Act & Assert: Should throw NOT_FOUND error
      await expect(notificationRouter["notification.deleteNotification"](ctx)).rejects.toThrow();
    });

    it("should require authentication", async () => {
      // Arrange: Not authenticated
      const ctx = createMockContext<{
        notificationId: string;
      }>({
        user: null,
        input: {
          notificationId: "1",
        },
      });

      // Act & Assert: Should throw UNAUTHORIZED error
      await expect(notificationRouter["notification.deleteNotification"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe("Integration Tests", () => {
    it("should update unread count after marking notifications as read", async () => {
      // Arrange: Create user with 5 unread notifications
      const { user } = await buildUser().username("integration_user").withProfile().build();
      const { user: actor } = await buildUser().username("actor12").withProfile().build();

      const notificationIds: string[] = [];
      for (let i = 0; i < 5; i++) {
        const notif = await db.notification.create({
          data: {
            userId: user.id,
            actorId: actor.id,
            type: "like",
            title: `Notification ${i}`,
            isRead: false,
          },
        });
        notificationIds.push(notif.id.toString());
      }

      // Act: Get initial unread count
      const ctxGet1 = createMockContext<{
        limit?: number;
        cursor?: string;
        unreadOnly?: boolean;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      const result1 = await notificationRouter["notification.getNotifications"](ctxGet1);
      expect(result1.unreadCount).toBe(5);

      // Act: Mark 3 notifications as read
      const ctxMark = createMockContext<{
        notificationIds: string[];
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          notificationIds: notificationIds.slice(0, 3),
        },
      });

      await notificationRouter["notification.markAsRead"](ctxMark);

      // Act: Get updated unread count
      const result2 = await notificationRouter["notification.getNotifications"](ctxGet1);
      expect(result2.unreadCount).toBe(2);
    });

    it("should update unread count after deleting unread notification", async () => {
      // Arrange: Create user with 3 unread notifications
      const { user } = await buildUser().username("delete_integration").withProfile().build();
      const { user: actor } = await buildUser().username("actor13").withProfile().build();

      const notif1 = await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "like",
          title: "Unread 1",
          isRead: false,
        },
      });

      await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "like",
          title: "Unread 2",
          isRead: false,
        },
      });

      await db.notification.create({
        data: {
          userId: user.id,
          actorId: actor.id,
          type: "like",
          title: "Unread 3",
          isRead: false,
        },
      });

      // Act: Get initial unread count
      const ctxGet = createMockContext<{
        limit?: number;
        cursor?: string;
        unreadOnly?: boolean;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      const result1 = await notificationRouter["notification.getNotifications"](ctxGet);
      expect(result1.unreadCount).toBe(3);

      // Act: Delete one unread notification
      const ctxDelete = createMockContext<{
        notificationId: string;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          notificationId: notif1.id.toString(),
        },
      });

      await notificationRouter["notification.deleteNotification"](ctxDelete);

      // Act: Get updated unread count
      const result2 = await notificationRouter["notification.getNotifications"](ctxGet);
      expect(result2.unreadCount).toBe(2);
      expect(result2.items).toHaveLength(2);
    });
  });
});
