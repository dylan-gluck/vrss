/**
 * Message Router - Phase 3.7
 *
 * Implements all direct messaging and conversation management procedures.
 * Handles sending messages, retrieving conversations, marking as read, and deletion.
 *
 * Procedures:
 * - message.sendMessage: Create conversation if needed, insert message, update last_message_at
 * - message.getConversations: List user's conversations with cursor pagination and unread counts
 * - message.getMessages: Fetch conversation messages with cursor pagination
 * - message.markAsRead: Add current user to read_by array for messages
 * - message.deleteConversation: Soft delete conversation (sets deleted_at)
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.7
 * @see docs/tasks/task-3.7.md
 */

import { type Prisma, PrismaClient } from "@prisma/client";
import { ErrorCode } from "@vrss/api-contracts";
import type { z } from "zod";
import type { ProcedureContext } from "../types";
import {
  deleteConversationSchema,
  getConversationsSchema,
  getMessagesSchema,
  markAsReadSchema,
  sendMessageSchema,
} from "./schemas/message";

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
 * Order participant IDs consistently (ascending order)
 * This ensures we can find existing conversations regardless of who initiated
 */
function orderParticipantIds(id1: bigint, id2: bigint): bigint[] {
  return id1 < id2 ? [id1, id2] : [id2, id1];
}

/**
 * Find existing conversation between two users
 */
async function findConversation(userId1: bigint, userId2: bigint): Promise<{ id: bigint } | null> {
  const orderedIds = orderParticipantIds(userId1, userId2);

  const conversation = await prisma.conversation.findFirst({
    where: {
      participantIds: {
        equals: orderedIds,
      },
    },
  });

  return conversation;
}

/**
 * Check if user is participant in conversation
 */
async function checkConversationAccess(conversationId: bigint, userId: bigint): Promise<boolean> {
  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      participantIds: {
        has: userId,
      },
    },
  });

  return !!conversation;
}

/**
 * Get unread count for a conversation
 */
async function getUnreadCount(conversationId: bigint, userId: bigint): Promise<number> {
  // Get all unread messages where user is NOT in readBy array
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      senderId: { not: userId }, // Don't count own messages
      deletedAt: null,
    },
    select: {
      id: true,
      readBy: true,
    },
  });

  // Filter messages where userId is not in readBy array
  const unreadMessages = messages.filter((msg) => !msg.readBy.includes(userId));

  return unreadMessages.length;
}

// =============================================================================
// MESSAGE PROCEDURES
// =============================================================================

export const messageRouter = {
  /**
   * message.sendMessage - Send a message
   *
   * Creates a new conversation if needed (when recipientId is provided).
   * Inserts the message and updates conversation's last_message_at.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   * @throws {RPCError} NOT_FOUND - Conversation or recipient not found
   * @throws {RPCError} FORBIDDEN - Cannot access conversation
   */
  "message.sendMessage": async (ctx: ProcedureContext<z.infer<typeof sendMessageSchema>>) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = sendMessageSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
        errors: error.errors,
      });
    }

    const { conversationId, recipientId, content, mediaIds } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    let finalConversationId: bigint;

    // Case 1: Sending to existing conversation
    if (conversationId) {
      const convId = BigInt(conversationId);

      // Check access
      const hasAccess = await checkConversationAccess(convId, userId);
      if (!hasAccess) {
        throw new RPCError(
          ErrorCode.FORBIDDEN,
          "You do not have permission to access this conversation"
        );
      }

      finalConversationId = convId;
    }
    // Case 2: Starting new conversation with recipient
    else if (recipientId) {
      const recipientUserId = BigInt(recipientId);

      // Verify recipient exists
      const recipient = await prisma.user.findUnique({
        where: { id: recipientUserId },
      });

      if (!recipient) {
        throw new RPCError(ErrorCode.NOT_FOUND, "Recipient not found");
      }

      // Cannot message yourself
      if (recipientUserId === userId) {
        throw new RPCError(ErrorCode.VALIDATION_ERROR, "Cannot send message to yourself");
      }

      // Check if conversation already exists
      const existingConversation = await findConversation(userId, recipientUserId);

      if (existingConversation) {
        finalConversationId = existingConversation.id;
      } else {
        // Create new conversation
        const orderedIds = orderParticipantIds(userId, recipientUserId);
        const newConversation = await prisma.conversation.create({
          data: {
            participantIds: orderedIds,
            lastMessageAt: new Date(),
          },
        });
        finalConversationId = newConversation.id;
      }
    } else {
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        "Either conversationId or recipientId must be provided"
      );
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: finalConversationId,
        senderId: userId,
        content,
        readBy: [userId], // Sender has already "read" the message
      },
    });

    // Update conversation's last_message_at
    await prisma.conversation.update({
      where: { id: finalConversationId },
      data: {
        lastMessageAt: message.createdAt,
      },
    });

    // Fetch updated conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: finalConversationId },
    });

    if (!conversation) {
      throw new RPCError(ErrorCode.INTERNAL_SERVER_ERROR, "Conversation not found after creation");
    }

    return {
      message: {
        id: message.id.toString(),
        conversationId: message.conversationId.toString(),
        senderId: message.senderId.toString(),
        content: message.content,
        mediaIds: mediaIds || [],
        createdAt: message.createdAt,
        updatedAt: message.updatedAt,
      },
      conversation: {
        id: conversation.id.toString(),
        participants: conversation.participantIds.map((id) => id.toString()),
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.createdAt, // Use createdAt since updatedAt doesn't exist
      },
    };
  },

  /**
   * message.getConversations - Get user's conversations
   *
   * Lists conversations with cursor-based pagination.
   * Includes unread message count for each conversation.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   */
  "message.getConversations": async (
    ctx: ProcedureContext<z.infer<typeof getConversationsSchema>>
  ) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = getConversationsSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
      });
    }

    const { limit, cursor } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    // Build query
    const where: Prisma.ConversationWhereInput = {
      participantIds: {
        has: userId,
      },
    };

    // Cursor pagination based on lastMessageAt
    if (cursor) {
      // Get the cursor conversation's lastMessageAt
      const cursorConv = await prisma.conversation.findUnique({
        where: { id: BigInt(cursor) },
      });

      if (cursorConv) {
        where.lastMessageAt = { lt: cursorConv.lastMessageAt };
      }
    }

    // Fetch conversations
    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      take: limit + 1, // Fetch one extra to determine hasMore
    });

    // Determine if there are more conversations
    const hasMore = conversations.length > limit;
    const conversationsToReturn = hasMore ? conversations.slice(0, limit) : conversations;
    const lastConversation = conversationsToReturn[conversationsToReturn.length - 1];
    const nextCursor = hasMore && lastConversation ? lastConversation.id.toString() : null;

    // Get unread counts for each conversation
    const items = await Promise.all(
      conversationsToReturn.map(async (conv) => {
        const unreadCount = await getUnreadCount(conv.id, userId);

        return {
          id: conv.id.toString(),
          participants: conv.participantIds.map((id) => id.toString()),
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
          createdAt: conv.createdAt,
          updatedAt: conv.createdAt, // Use createdAt since updatedAt doesn't exist
        };
      })
    );

    return {
      items,
      nextCursor,
      hasMore,
    };
  },

  /**
   * message.getMessages - Get messages in a conversation
   *
   * Retrieves messages with cursor-based pagination.
   * Only participants can access conversation messages.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   * @throws {RPCError} FORBIDDEN - Cannot access conversation
   */
  "message.getMessages": async (ctx: ProcedureContext<z.infer<typeof getMessagesSchema>>) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = getMessagesSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
      });
    }

    const { conversationId, limit, cursor } = validationResult.data;
    const userId = BigInt(ctx.user.id);
    const convId = BigInt(conversationId);

    // Check access
    const hasAccess = await checkConversationAccess(convId, userId);
    if (!hasAccess) {
      throw new RPCError(
        ErrorCode.FORBIDDEN,
        "You do not have permission to access this conversation"
      );
    }

    // Build query
    const where: Prisma.MessageWhereInput = {
      conversationId: convId,
      deletedAt: null,
    };

    // Cursor pagination based on createdAt
    if (cursor) {
      where.id = { lt: BigInt(cursor) }; // Get messages before cursor
    }

    // Fetch messages
    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1, // Fetch one extra to determine hasMore
    });

    // Determine if there are more messages
    const hasMore = messages.length > limit;
    const messagesToReturn = hasMore ? messages.slice(0, limit) : messages;
    const lastMessage = messagesToReturn[messagesToReturn.length - 1];
    const nextCursor = hasMore && lastMessage ? lastMessage.id.toString() : null;

    return {
      items: messagesToReturn.map((msg) => ({
        id: msg.id.toString(),
        conversationId: msg.conversationId.toString(),
        senderId: msg.senderId.toString(),
        content: msg.content,
        mediaIds: [], // TODO: Implement media support
        readBy: msg.readBy.map((id) => id.toString()),
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
      })),
      nextCursor,
      hasMore,
    };
  },

  /**
   * message.markAsRead - Mark message as read
   *
   * Adds current user to the read_by array for the message.
   * Only works if user is a participant in the conversation.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   * @throws {RPCError} NOT_FOUND - Message not found
   * @throws {RPCError} FORBIDDEN - Cannot access conversation
   */
  "message.markAsRead": async (ctx: ProcedureContext<z.infer<typeof markAsReadSchema>>) => {
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
      });
    }

    const { messageId } = validationResult.data;
    const userId = BigInt(ctx.user.id);
    const msgId = BigInt(messageId);

    // Get message
    const message = await prisma.message.findFirst({
      where: {
        id: msgId,
        deletedAt: null,
      },
    });

    if (!message) {
      throw new RPCError(ErrorCode.NOT_FOUND, "Message not found");
    }

    // Check conversation access
    const hasAccess = await checkConversationAccess(message.conversationId, userId);
    if (!hasAccess) {
      throw new RPCError(
        ErrorCode.FORBIDDEN,
        "You do not have permission to access this conversation"
      );
    }

    // Check if already marked as read
    if (message.readBy.includes(userId)) {
      return { success: true };
    }

    // Add user to readBy array
    await prisma.message.update({
      where: { id: msgId },
      data: {
        readBy: {
          push: userId,
        },
      },
    });

    return { success: true };
  },

  /**
   * message.deleteConversation - Delete a conversation
   *
   * Soft deletes all messages in the conversation (sets deleted_at).
   * Only participants can delete conversations.
   *
   * @throws {RPCError} UNAUTHORIZED - User not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   * @throws {RPCError} NOT_FOUND - Conversation not found
   * @throws {RPCError} FORBIDDEN - Cannot access conversation
   */
  "message.deleteConversation": async (
    ctx: ProcedureContext<z.infer<typeof deleteConversationSchema>>
  ) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = deleteConversationSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const error = getValidationError(validationResult);
      throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
        field: error.field,
      });
    }

    const { conversationId } = validationResult.data;
    const userId = BigInt(ctx.user.id);
    const convId = BigInt(conversationId);

    // Check conversation exists and user has access
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: convId,
        participantIds: {
          has: userId,
        },
      },
    });

    if (!conversation) {
      throw new RPCError(ErrorCode.NOT_FOUND, "Conversation not found");
    }

    // Soft delete all messages in the conversation
    await prisma.message.updateMany({
      where: {
        conversationId: convId,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  },
};
