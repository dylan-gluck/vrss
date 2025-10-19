/**
 * Message Router Validation Schemas - Phase 3.7
 *
 * Zod schemas for validating message sending, conversation management, and read receipts.
 * These schemas enforce business rules for direct messaging and conversation access.
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.7
 * @see docs/tasks/task-3.7.md
 */

import { z } from "zod";

// =============================================================================
// MESSAGE SEND SCHEMAS
// =============================================================================

export const sendMessageSchema = z
  .object({
    conversationId: z.string().optional(),
    recipientId: z.string().optional(),
    content: z
      .string()
      .min(1, "Message content is required")
      .max(5000, "Message must be at most 5,000 characters"),
    mediaIds: z.array(z.string()).optional(),
  })
  .refine((data) => data.conversationId || data.recipientId, {
    message: "Either conversationId or recipientId must be provided",
  })
  .refine((data) => !(data.conversationId && data.recipientId), {
    message: "Cannot provide both conversationId and recipientId",
  });

// =============================================================================
// CONVERSATION RETRIEVE SCHEMAS
// =============================================================================

export const getConversationsSchema = z.object({
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(), // Conversation ID for cursor-based pagination
});

// =============================================================================
// MESSAGE RETRIEVE SCHEMAS
// =============================================================================

export const getMessagesSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(), // Message ID for cursor-based pagination
});

// =============================================================================
// MESSAGE READ TRACKING SCHEMAS
// =============================================================================

export const markAsReadSchema = z.object({
  messageId: z.string().min(1, "Message ID is required"),
});

// =============================================================================
// CONVERSATION DELETE SCHEMAS
// =============================================================================

export const deleteConversationSchema = z.object({
  conversationId: z.string().min(1, "Conversation ID is required"),
});
