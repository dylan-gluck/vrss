/**
 * Message Router Tests - Phase 3.7
 *
 * Comprehensive test suite for the Message Router covering all 5 procedures:
 * - message.sendMessage: Send messages and create conversations
 * - message.getConversations: List conversations with pagination and unread counts
 * - message.getMessages: Retrieve messages with pagination
 * - message.markAsRead: Mark messages as read
 * - message.deleteConversation: Soft delete conversations
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.7
 * @see docs/tasks/task-3.7.md
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ErrorCode } from "@vrss/api-contracts";
import { messageRouter } from "../../src/rpc/routers/message";
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

describe("Message Router", () => {
  const db = getTestDatabase();

  beforeEach(async () => {
    await cleanAllTables();
  });

  afterEach(async () => {
    await cleanAllTables();
  });

  // ===========================================================================
  // message.sendMessage Tests
  // ===========================================================================

  describe("message.sendMessage", () => {
    it("should create new conversation when sending to recipientId", async () => {
      // Arrange: Create two users
      const { user: sender } = await buildUser().username("alice").withProfile().build();
      const { user: recipient } = await buildUser().username("bob").withProfile().build();

      const ctx = createMockContext({
        user: { id: sender.id.toString(), username: sender.username, email: sender.email } as any,
        input: {
          recipientId: recipient.id.toString(),
          content: "Hey Bob, how are you?",
        },
      });

      // Act: Send message
      const result = await messageRouter["message.sendMessage"](ctx);

      // Assert: Message and conversation created
      expect(result.message).toMatchObject({
        id: expect.any(String),
        conversationId: expect.any(String),
        senderId: sender.id.toString(),
        content: "Hey Bob, how are you?",
        createdAt: expect.any(Date),
      });

      // Verify participants are ordered consistently BEFORE using expect.arrayContaining
      const participants = result.conversation.participants.map((id) => BigInt(id));
      expect(participants[0] < participants[1]).toBe(true);

      expect(result.conversation).toMatchObject({
        id: expect.any(String),
        participants: expect.arrayContaining([sender.id.toString(), recipient.id.toString()]),
        lastMessageAt: expect.any(Date),
      });
    });

    it("should use existing conversation when sending to same recipient", async () => {
      // Arrange: Create users and initial conversation
      const { user: sender } = await buildUser().username("charlie").withProfile().build();
      const { user: recipient } = await buildUser().username("diana").withProfile().build();

      // Send first message
      const ctx1 = createMockContext({
        user: { id: sender.id.toString(), username: sender.username, email: sender.email } as any,
        input: {
          recipientId: recipient.id.toString(),
          content: "First message",
        },
      });

      const result1 = await messageRouter["message.sendMessage"](ctx1);
      const conversationId = result1.conversation.id;

      // Send second message
      const ctx2 = createMockContext({
        user: { id: sender.id.toString(), username: sender.username, email: sender.email } as any,
        input: {
          recipientId: recipient.id.toString(),
          content: "Second message",
        },
      });

      const result2 = await messageRouter["message.sendMessage"](ctx2);

      // Assert: Same conversation used
      expect(result2.conversation.id).toBe(conversationId);
    });

    it("should send message to existing conversation by conversationId", async () => {
      // Arrange: Create conversation
      const { user: user1 } = await buildUser().username("user1").withProfile().build();
      const { user: user2 } = await buildUser().username("user2").withProfile().build();

      const orderedIds =
        BigInt(user1.id) < BigInt(user2.id)
          ? [BigInt(user1.id), BigInt(user2.id)]
          : [BigInt(user2.id), BigInt(user1.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: { id: user1.id.toString(), username: user1.username, email: user1.email } as any,
        input: {
          conversationId: conversation.id.toString(),
          content: "Reply in existing conversation",
        },
      });

      // Act: Send message
      const result = await messageRouter["message.sendMessage"](ctx);

      // Assert: Message sent to correct conversation
      expect(result.message.conversationId).toBe(conversation.id.toString());
      expect(result.message.content).toBe("Reply in existing conversation");
    });

    it("should update lastMessageAt when sending message", async () => {
      // Arrange: Create conversation with old timestamp
      const { user: sender } = await buildUser().username("sender1").withProfile().build();
      const { user: recipient } = await buildUser().username("recipient1").withProfile().build();

      const oldDate = new Date("2024-01-01");
      const orderedIds =
        BigInt(sender.id) < BigInt(recipient.id)
          ? [BigInt(sender.id), BigInt(recipient.id)]
          : [BigInt(recipient.id), BigInt(sender.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: oldDate,
        },
      });

      const ctx = createMockContext({
        user: { id: sender.id.toString(), username: sender.username, email: sender.email } as any,
        input: {
          conversationId: conversation.id.toString(),
          content: "New message",
        },
      });

      // Act: Send message
      const result = await messageRouter["message.sendMessage"](ctx);

      // Assert: lastMessageAt updated
      expect(result.conversation.lastMessageAt.getTime()).toBeGreaterThan(oldDate.getTime());
    });

    it("should fail without authentication", async () => {
      const ctx = createMockContext({
        user: null,
        input: {
          recipientId: "123",
          content: "This should fail",
        },
      });

      // Assert: Throws UNAUTHORIZED error
      await expect(messageRouter["message.sendMessage"](ctx)).rejects.toThrow();
    });

    it("should fail when recipient not found", async () => {
      const { user: sender } = await buildUser().username("sender2").withProfile().build();

      const ctx = createMockContext({
        user: { id: sender.id.toString(), username: sender.username, email: sender.email } as any,
        input: {
          recipientId: "999999999",
          content: "Message to non-existent user",
        },
      });

      // Assert: Throws NOT_FOUND error
      await expect(messageRouter["message.sendMessage"](ctx)).rejects.toThrow();
    });

    it("should fail when sending message to yourself", async () => {
      const { user } = await buildUser().username("selfsender").withProfile().build();

      const ctx = createMockContext({
        user: { id: user.id.toString(), username: user.username, email: user.email } as any,
        input: {
          recipientId: user.id.toString(),
          content: "Message to myself",
        },
      });

      // Assert: Throws VALIDATION_ERROR
      await expect(messageRouter["message.sendMessage"](ctx)).rejects.toThrow();
    });

    it("should fail when accessing conversation user is not part of", async () => {
      const { user: user1 } = await buildUser().username("user3").withProfile().build();
      const { user: user2 } = await buildUser().username("user4").withProfile().build();
      const { user: intruder } = await buildUser().username("intruder").withProfile().build();

      const orderedIds =
        BigInt(user1.id) < BigInt(user2.id)
          ? [BigInt(user1.id), BigInt(user2.id)]
          : [BigInt(user2.id), BigInt(user1.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: {
          id: intruder.id.toString(),
          username: intruder.username,
          email: intruder.email,
        } as any,
        input: {
          conversationId: conversation.id.toString(),
          content: "Should not work",
        },
      });

      // Assert: Throws FORBIDDEN error
      await expect(messageRouter["message.sendMessage"](ctx)).rejects.toThrow();
    });

    it("should fail with empty content", async () => {
      const { user: sender } = await buildUser().username("sender3").withProfile().build();
      const { user: recipient } = await buildUser().username("recipient3").withProfile().build();

      const ctx = createMockContext({
        user: { id: sender.id.toString(), username: sender.username, email: sender.email } as any,
        input: {
          recipientId: recipient.id.toString(),
          content: "",
        },
      });

      // Assert: Throws VALIDATION_ERROR
      await expect(messageRouter["message.sendMessage"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // message.getConversations Tests
  // ===========================================================================

  describe("message.getConversations", () => {
    it("should return user's conversations with correct unread counts", async () => {
      // Arrange: Create users and conversations
      const { user: user1 } = await buildUser().username("user5").withProfile().build();
      const { user: user2 } = await buildUser().username("user6").withProfile().build();

      const orderedIds =
        BigInt(user1.id) < BigInt(user2.id)
          ? [BigInt(user1.id), BigInt(user2.id)]
          : [BigInt(user2.id), BigInt(user1.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      // Create messages: 2 from user2 (unread by user1), 1 from user1
      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(user2.id),
          content: "Unread message 1",
          readBy: [BigInt(user2.id)],
        },
      });

      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(user2.id),
          content: "Unread message 2",
          readBy: [BigInt(user2.id)],
        },
      });

      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(user1.id),
          content: "Read message",
          readBy: [BigInt(user1.id)],
        },
      });

      const ctx = createMockContext({
        user: { id: user1.id.toString(), username: user1.username, email: user1.email } as any,
        input: {
          limit: 20,
        },
      });

      // Act: Get conversations
      const result = await messageRouter["message.getConversations"](ctx);

      // Assert: Correct unread count
      expect(result.items).toHaveLength(1);
      expect(result.items[0].unreadCount).toBe(2);
      expect(result.items[0].id).toBe(conversation.id.toString());
    });

    it("should return conversations ordered by lastMessageAt descending", async () => {
      // Arrange: Create multiple conversations with different timestamps
      const { user } = await buildUser().username("user7").withProfile().build();
      const { user: contact1 } = await buildUser().username("contact1").withProfile().build();
      const { user: contact2 } = await buildUser().username("contact2").withProfile().build();

      const orderedIds1 =
        BigInt(user.id) < BigInt(contact1.id)
          ? [BigInt(user.id), BigInt(contact1.id)]
          : [BigInt(contact1.id), BigInt(user.id)];

      const orderedIds2 =
        BigInt(user.id) < BigInt(contact2.id)
          ? [BigInt(user.id), BigInt(contact2.id)]
          : [BigInt(contact2.id), BigInt(user.id)];

      const conv1 = await db.conversation.create({
        data: {
          participantIds: orderedIds1,
          lastMessageAt: new Date("2024-01-01"),
        },
      });

      const conv2 = await db.conversation.create({
        data: {
          participantIds: orderedIds2,
          lastMessageAt: new Date("2024-02-01"),
        },
      });

      const ctx = createMockContext({
        user: { id: user.id.toString(), username: user.username, email: user.email } as any,
        input: {
          limit: 20,
        },
      });

      // Act: Get conversations
      const result = await messageRouter["message.getConversations"](ctx);

      // Assert: Ordered by lastMessageAt descending
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe(conv2.id.toString());
      expect(result.items[1].id).toBe(conv1.id.toString());
    });

    it("should implement cursor pagination correctly", async () => {
      // Arrange: Create 3 conversations
      const { user } = await buildUser().username("user8").withProfile().build();
      const { user: c1 } = await buildUser().username("c1").withProfile().build();
      const { user: c2 } = await buildUser().username("c2").withProfile().build();
      const { user: c3 } = await buildUser().username("c3").withProfile().build();

      const convs = [];
      for (const contact of [c1, c2, c3]) {
        const orderedIds =
          BigInt(user.id) < BigInt(contact.id)
            ? [BigInt(user.id), BigInt(contact.id)]
            : [BigInt(contact.id), BigInt(user.id)];

        const conv = await db.conversation.create({
          data: {
            participantIds: orderedIds,
            lastMessageAt: new Date(Date.now() + Math.random() * 1000),
          },
        });
        convs.push(conv);
      }

      // First page: limit 2
      const ctx1 = createMockContext({
        user: { id: user.id.toString(), username: user.username, email: user.email } as any,
        input: {
          limit: 2,
        },
      });

      const result1 = await messageRouter["message.getConversations"](ctx1);

      // Assert: First page
      expect(result1.items).toHaveLength(2);
      expect(result1.hasMore).toBe(true);
      expect(result1.nextCursor).toBeTruthy();

      // Second page
      const ctx2 = createMockContext({
        user: { id: user.id.toString(), username: user.username, email: user.email } as any,
        input: {
          limit: 2,
          cursor: result1.nextCursor!,
        },
      });

      const result2 = await messageRouter["message.getConversations"](ctx2);

      // Assert: Second page
      expect(result2.items).toHaveLength(1);
      expect(result2.hasMore).toBe(false);
      expect(result2.nextCursor).toBeNull();
    });

    it("should fail without authentication", async () => {
      const ctx = createMockContext({
        user: null,
        input: {
          limit: 20,
        },
      });

      // Assert: Throws UNAUTHORIZED error
      await expect(messageRouter["message.getConversations"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // message.getMessages Tests
  // ===========================================================================

  describe("message.getMessages", () => {
    it("should return messages in conversation ordered by createdAt descending", async () => {
      // Arrange: Create conversation with messages
      const { user: user1 } = await buildUser().username("user9").withProfile().build();
      const { user: user2 } = await buildUser().username("user10").withProfile().build();

      const orderedIds =
        BigInt(user1.id) < BigInt(user2.id)
          ? [BigInt(user1.id), BigInt(user2.id)]
          : [BigInt(user2.id), BigInt(user1.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      const msg1 = await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(user1.id),
          content: "First message",
          readBy: [BigInt(user1.id)],
          createdAt: new Date("2024-01-01"),
        },
      });

      const msg2 = await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(user2.id),
          content: "Second message",
          readBy: [BigInt(user2.id)],
          createdAt: new Date("2024-01-02"),
        },
      });

      const ctx = createMockContext({
        user: { id: user1.id.toString(), username: user1.username, email: user1.email } as any,
        input: {
          conversationId: conversation.id.toString(),
          limit: 50,
        },
      });

      // Act: Get messages
      const result = await messageRouter["message.getMessages"](ctx);

      // Assert: Ordered by createdAt descending
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe(msg2.id.toString());
      expect(result.items[1].id).toBe(msg1.id.toString());
    });

    it("should implement cursor pagination correctly", async () => {
      // Arrange: Create conversation with 3 messages
      const { user: user1 } = await buildUser().username("user11").withProfile().build();
      const { user: user2 } = await buildUser().username("user12").withProfile().build();

      const orderedIds =
        BigInt(user1.id) < BigInt(user2.id)
          ? [BigInt(user1.id), BigInt(user2.id)]
          : [BigInt(user2.id), BigInt(user1.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      for (let i = 0; i < 3; i++) {
        await db.message.create({
          data: {
            conversationId: conversation.id,
            senderId: BigInt(user1.id),
            content: `Message ${i}`,
            readBy: [BigInt(user1.id)],
          },
        });
      }

      // First page: limit 2
      const ctx1 = createMockContext({
        user: { id: user1.id.toString(), username: user1.username, email: user1.email } as any,
        input: {
          conversationId: conversation.id.toString(),
          limit: 2,
        },
      });

      const result1 = await messageRouter["message.getMessages"](ctx1);

      // Assert: First page
      expect(result1.items).toHaveLength(2);
      expect(result1.hasMore).toBe(true);
      expect(result1.nextCursor).toBeTruthy();

      // Second page
      const ctx2 = createMockContext({
        user: { id: user1.id.toString(), username: user1.username, email: user1.email } as any,
        input: {
          conversationId: conversation.id.toString(),
          limit: 2,
          cursor: result1.nextCursor!,
        },
      });

      const result2 = await messageRouter["message.getMessages"](ctx2);

      // Assert: Second page
      expect(result2.items).toHaveLength(1);
      expect(result2.hasMore).toBe(false);
      expect(result2.nextCursor).toBeNull();
    });

    it("should not return soft-deleted messages", async () => {
      // Arrange: Create conversation with deleted message
      const { user: user1 } = await buildUser().username("user13").withProfile().build();
      const { user: user2 } = await buildUser().username("user14").withProfile().build();

      const orderedIds =
        BigInt(user1.id) < BigInt(user2.id)
          ? [BigInt(user1.id), BigInt(user2.id)]
          : [BigInt(user2.id), BigInt(user1.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(user1.id),
          content: "Active message",
          readBy: [BigInt(user1.id)],
        },
      });

      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(user1.id),
          content: "Deleted message",
          readBy: [BigInt(user1.id)],
          deletedAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: { id: user1.id.toString(), username: user1.username, email: user1.email } as any,
        input: {
          conversationId: conversation.id.toString(),
          limit: 50,
        },
      });

      // Act: Get messages
      const result = await messageRouter["message.getMessages"](ctx);

      // Assert: Only active message returned
      expect(result.items).toHaveLength(1);
      expect(result.items[0].content).toBe("Active message");
    });

    it("should fail when accessing conversation user is not part of", async () => {
      const { user: user1 } = await buildUser().username("user15").withProfile().build();
      const { user: user2 } = await buildUser().username("user16").withProfile().build();
      const { user: intruder } = await buildUser().username("intruder2").withProfile().build();

      const orderedIds =
        BigInt(user1.id) < BigInt(user2.id)
          ? [BigInt(user1.id), BigInt(user2.id)]
          : [BigInt(user2.id), BigInt(user1.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: {
          id: intruder.id.toString(),
          username: intruder.username,
          email: intruder.email,
        } as any,
        input: {
          conversationId: conversation.id.toString(),
          limit: 50,
        },
      });

      // Assert: Throws FORBIDDEN error
      await expect(messageRouter["message.getMessages"](ctx)).rejects.toThrow();
    });

    it("should fail without authentication", async () => {
      const ctx = createMockContext({
        user: null,
        input: {
          conversationId: "123",
          limit: 50,
        },
      });

      // Assert: Throws UNAUTHORIZED error
      await expect(messageRouter["message.getMessages"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // message.markAsRead Tests
  // ===========================================================================

  describe("message.markAsRead", () => {
    it("should add user to readBy array", async () => {
      // Arrange: Create message
      const { user: sender } = await buildUser().username("sender4").withProfile().build();
      const { user: recipient } = await buildUser().username("recipient4").withProfile().build();

      const orderedIds =
        BigInt(sender.id) < BigInt(recipient.id)
          ? [BigInt(sender.id), BigInt(recipient.id)]
          : [BigInt(recipient.id), BigInt(sender.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      const message = await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(sender.id),
          content: "Unread message",
          readBy: [BigInt(sender.id)],
        },
      });

      const ctx = createMockContext({
        user: {
          id: recipient.id.toString(),
          username: recipient.username,
          email: recipient.email,
        } as any,
        input: {
          messageId: message.id.toString(),
        },
      });

      // Act: Mark as read
      const result = await messageRouter["message.markAsRead"](ctx);

      // Assert: Success
      expect(result.success).toBe(true);

      // Verify readBy updated
      const updatedMessage = await db.message.findUnique({
        where: { id: message.id },
      });

      expect(updatedMessage!.readBy).toContain(BigInt(recipient.id));
    });

    it("should be idempotent when already marked as read", async () => {
      // Arrange: Create message already read by user
      const { user: sender } = await buildUser().username("sender5").withProfile().build();
      const { user: recipient } = await buildUser().username("recipient5").withProfile().build();

      const orderedIds =
        BigInt(sender.id) < BigInt(recipient.id)
          ? [BigInt(sender.id), BigInt(recipient.id)]
          : [BigInt(recipient.id), BigInt(sender.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      const message = await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(sender.id),
          content: "Already read",
          readBy: [BigInt(sender.id), BigInt(recipient.id)],
        },
      });

      const ctx = createMockContext({
        user: {
          id: recipient.id.toString(),
          username: recipient.username,
          email: recipient.email,
        } as any,
        input: {
          messageId: message.id.toString(),
        },
      });

      // Act: Mark as read again
      const result = await messageRouter["message.markAsRead"](ctx);

      // Assert: Success
      expect(result.success).toBe(true);

      // Verify readBy not duplicated
      const updatedMessage = await db.message.findUnique({
        where: { id: message.id },
      });

      expect(updatedMessage!.readBy.filter((id) => id === BigInt(recipient.id))).toHaveLength(1);
    });

    it("should fail when accessing message in conversation user is not part of", async () => {
      const { user: sender } = await buildUser().username("sender6").withProfile().build();
      const { user: recipient } = await buildUser().username("recipient6").withProfile().build();
      const { user: intruder } = await buildUser().username("intruder3").withProfile().build();

      const orderedIds =
        BigInt(sender.id) < BigInt(recipient.id)
          ? [BigInt(sender.id), BigInt(recipient.id)]
          : [BigInt(recipient.id), BigInt(sender.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      const message = await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(sender.id),
          content: "Private message",
          readBy: [BigInt(sender.id)],
        },
      });

      const ctx = createMockContext({
        user: {
          id: intruder.id.toString(),
          username: intruder.username,
          email: intruder.email,
        } as any,
        input: {
          messageId: message.id.toString(),
        },
      });

      // Assert: Throws FORBIDDEN error
      await expect(messageRouter["message.markAsRead"](ctx)).rejects.toThrow();
    });

    it("should fail when message not found", async () => {
      const { user } = await buildUser().username("user17").withProfile().build();

      const ctx = createMockContext({
        user: { id: user.id.toString(), username: user.username, email: user.email } as any,
        input: {
          messageId: "999999999",
        },
      });

      // Assert: Throws NOT_FOUND error
      await expect(messageRouter["message.markAsRead"](ctx)).rejects.toThrow();
    });

    it("should fail without authentication", async () => {
      const ctx = createMockContext({
        user: null,
        input: {
          messageId: "123",
        },
      });

      // Assert: Throws UNAUTHORIZED error
      await expect(messageRouter["message.markAsRead"](ctx)).rejects.toThrow();
    });
  });

  // ===========================================================================
  // message.deleteConversation Tests
  // ===========================================================================

  describe("message.deleteConversation", () => {
    it("should soft delete all messages in conversation", async () => {
      // Arrange: Create conversation with messages
      const { user: user1 } = await buildUser().username("user18").withProfile().build();
      const { user: user2 } = await buildUser().username("user19").withProfile().build();

      const orderedIds =
        BigInt(user1.id) < BigInt(user2.id)
          ? [BigInt(user1.id), BigInt(user2.id)]
          : [BigInt(user2.id), BigInt(user1.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      const msg1 = await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(user1.id),
          content: "Message 1",
          readBy: [BigInt(user1.id)],
        },
      });

      const msg2 = await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(user2.id),
          content: "Message 2",
          readBy: [BigInt(user2.id)],
        },
      });

      const ctx = createMockContext({
        user: { id: user1.id.toString(), username: user1.username, email: user1.email } as any,
        input: {
          conversationId: conversation.id.toString(),
        },
      });

      // Act: Delete conversation
      const result = await messageRouter["message.deleteConversation"](ctx);

      // Assert: Success
      expect(result.success).toBe(true);

      // Verify all messages soft deleted
      const deletedMsg1 = await db.message.findUnique({ where: { id: msg1.id } });
      const deletedMsg2 = await db.message.findUnique({ where: { id: msg2.id } });

      expect(deletedMsg1!.deletedAt).toBeTruthy();
      expect(deletedMsg2!.deletedAt).toBeTruthy();
    });

    it("should not delete messages that are already deleted", async () => {
      // Arrange: Create conversation with already deleted message
      const { user: user1 } = await buildUser().username("user20").withProfile().build();
      const { user: user2 } = await buildUser().username("user21").withProfile().build();

      const orderedIds =
        BigInt(user1.id) < BigInt(user2.id)
          ? [BigInt(user1.id), BigInt(user2.id)]
          : [BigInt(user2.id), BigInt(user1.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      const oldDeletedAt = new Date("2024-01-01");

      await db.message.create({
        data: {
          conversationId: conversation.id,
          senderId: BigInt(user1.id),
          content: "Already deleted",
          readBy: [BigInt(user1.id)],
          deletedAt: oldDeletedAt,
        },
      });

      const ctx = createMockContext({
        user: { id: user1.id.toString(), username: user1.username, email: user1.email } as any,
        input: {
          conversationId: conversation.id.toString(),
        },
      });

      // Act: Delete conversation
      await messageRouter["message.deleteConversation"](ctx);

      // Verify already-deleted message's deletedAt unchanged
      const messages = await db.message.findMany({
        where: { conversationId: conversation.id },
      });

      const alreadyDeleted = messages.find(
        (m) => m.deletedAt?.getTime() === oldDeletedAt.getTime()
      );
      expect(alreadyDeleted).toBeTruthy();
    });

    it("should fail when conversation not found", async () => {
      const { user } = await buildUser().username("user22").withProfile().build();

      const ctx = createMockContext({
        user: { id: user.id.toString(), username: user.username, email: user.email } as any,
        input: {
          conversationId: "999999999",
        },
      });

      // Assert: Throws NOT_FOUND error
      await expect(messageRouter["message.deleteConversation"](ctx)).rejects.toThrow();
    });

    it("should fail when user is not participant in conversation", async () => {
      const { user: user1 } = await buildUser().username("user23").withProfile().build();
      const { user: user2 } = await buildUser().username("user24").withProfile().build();
      const { user: intruder } = await buildUser().username("intruder4").withProfile().build();

      const orderedIds =
        BigInt(user1.id) < BigInt(user2.id)
          ? [BigInt(user1.id), BigInt(user2.id)]
          : [BigInt(user2.id), BigInt(user1.id)];

      const conversation = await db.conversation.create({
        data: {
          participantIds: orderedIds,
          lastMessageAt: new Date(),
        },
      });

      const ctx = createMockContext({
        user: {
          id: intruder.id.toString(),
          username: intruder.username,
          email: intruder.email,
        } as any,
        input: {
          conversationId: conversation.id.toString(),
        },
      });

      // Assert: Throws NOT_FOUND error
      await expect(messageRouter["message.deleteConversation"](ctx)).rejects.toThrow();
    });

    it("should fail without authentication", async () => {
      const ctx = createMockContext({
        user: null,
        input: {
          conversationId: "123",
        },
      });

      // Assert: Throws UNAUTHORIZED error
      await expect(messageRouter["message.deleteConversation"](ctx)).rejects.toThrow();
    });
  });
});
