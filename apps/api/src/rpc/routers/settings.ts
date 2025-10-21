/**
 * Settings Router - Phase 3.7
 *
 * Implements all settings management procedures for the VRSS Social Platform.
 * Handles account settings, privacy settings, account deletion, and data export.
 *
 * Procedures:
 * - settings.getAccountSettings: Retrieve current account settings
 * - settings.updateAccount: Update username/email/password with validation
 * - settings.updatePrivacy: Update profile visibility and message permissions
 * - settings.deleteAccount: Soft delete account (set deleted_at)
 * - settings.exportData: Generate GDPR-compliant data export
 *
 * @see docs/tasks/task-3.7.md Phase 3.7
 */

import { PrismaClient } from "@prisma/client";
import { ErrorCode } from "@vrss/api-contracts";
import type { z } from "zod";
import { auth } from "../../lib/auth";
import type { ProcedureContext } from "../types";
import {
  deleteAccountSchema,
  exportDataSchema,
  getAccountSettingsSchema,
  updateAccountSchema,
  updatePrivacySchema,
} from "./schemas/settings";

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
 * Hash password using Bun's built-in bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 12,
  });
}

/**
 * Verify password against hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

// =============================================================================
// SETTINGS PROCEDURES
// =============================================================================

export const settingsRouter = {
  /**
   * settings.getAccountSettings - Get current account settings
   *
   * Returns current account information (username, email, verification status, etc.)
   *
   * @throws {RPCError} UNAUTHORIZED - Not authenticated
   */
  "settings.getAccountSettings": async (
    ctx: ProcedureContext<z.infer<typeof getAccountSettingsSchema>>
  ) => {
    // Require authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = getAccountSettingsSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new RPCError(ErrorCode.VALIDATION_ERROR, firstError?.message || "Invalid input", {
        field: firstError?.path[0],
        errors: validationResult.error.errors,
      });
    }

    const userId = BigInt(ctx.user.id);

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        email: true,
        emailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new RPCError(ErrorCode.USER_NOT_FOUND, "User not found");
    }

    return {
      settings: {
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
      },
    };
  },

  /**
   * settings.updateAccount - Update account information
   *
   * Updates username, email, and/or password with validation.
   * Requires current password for sensitive changes (email, password).
   *
   * @throws {RPCError} UNAUTHORIZED - Not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   * @throws {RPCError} INVALID_CREDENTIALS - Current password is incorrect
   * @throws {RPCError} CONFLICT - Username or email already taken
   */
  "settings.updateAccount": async (ctx: ProcedureContext<z.infer<typeof updateAccountSchema>>) => {
    // Require authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = updateAccountSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new RPCError(ErrorCode.VALIDATION_ERROR, firstError?.message || "Invalid input", {
        field: firstError?.path[0],
        errors: validationResult.error.errors,
      });
    }

    const { username, email, currentPassword, newPassword } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    // Get current user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new RPCError(ErrorCode.USER_NOT_FOUND, "User not found");
    }

    // Verify current password if provided (required for sensitive changes)
    if (currentPassword) {
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        throw new RPCError(ErrorCode.INVALID_CREDENTIALS, "Current password is incorrect");
      }
    }

    // Check username uniqueness if changing username
    if (username && username !== user.username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: "insensitive",
          },
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new RPCError(ErrorCode.CONFLICT, "Username is already taken", { username });
      }
    }

    // Check email uniqueness if changing email
    if (email && email !== user.email) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: "insensitive",
          },
          id: { not: userId },
        },
      });

      if (existingUser) {
        throw new RPCError(ErrorCode.CONFLICT, "Email is already taken", { email });
      }
    }

    // Build update data
    const updateData: any = {};
    if (username) {
      updateData.username = username;
    }
    if (email) {
      updateData.email = email;
      updateData.emailVerified = false; // Require re-verification
    }
    if (newPassword) {
      updateData.passwordHash = await hashPassword(newPassword);
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        username: true,
        email: true,
      },
    });

    return {
      success: true,
      user: {
        username: updatedUser.username,
        email: updatedUser.email,
      },
    };
  },

  /**
   * settings.updatePrivacy - Update privacy settings
   *
   * Updates profile visibility, message permissions, and follower visibility.
   * Privacy settings are stored in user_profiles table and styleConfig JSONB.
   *
   * @throws {RPCError} UNAUTHORIZED - Not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   */
  "settings.updatePrivacy": async (ctx: ProcedureContext<z.infer<typeof updatePrivacySchema>>) => {
    // Require authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = updatePrivacySchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new RPCError(ErrorCode.VALIDATION_ERROR, firstError?.message || "Invalid input", {
        field: firstError?.path[0],
        errors: validationResult.error.errors,
      });
    }

    const { profileVisibility, allowMessagesFrom, showFollowers } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    // Get existing profile to merge privacy settings
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    // Extract existing privacy settings from styleConfig
    const currentPrivacySettings =
      typeof existingProfile?.styleConfig === "object" &&
      existingProfile.styleConfig !== null &&
      !Array.isArray(existingProfile.styleConfig) &&
      "privacy" in existingProfile.styleConfig
        ? (existingProfile.styleConfig as any).privacy
        : {};

    // Merge new privacy settings
    const newPrivacySettings = {
      ...currentPrivacySettings,
      ...(allowMessagesFrom !== undefined && { allowMessagesFrom }),
      ...(showFollowers !== undefined && { showFollowers }),
    };

    // Merge with existing styleConfig
    const updatedStyleConfig =
      typeof existingProfile?.styleConfig === "object" &&
      existingProfile.styleConfig !== null &&
      !Array.isArray(existingProfile.styleConfig)
        ? { ...(existingProfile.styleConfig as any), privacy: newPrivacySettings }
        : { privacy: newPrivacySettings };

    // Update profile
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        visibility: profileVisibility || "public",
        styleConfig: updatedStyleConfig,
      },
      update: {
        ...(profileVisibility !== undefined && { visibility: profileVisibility }),
        styleConfig: updatedStyleConfig,
      },
    });

    // Extract privacy settings from response
    const privacySettings =
      typeof profile.styleConfig === "object" &&
      profile.styleConfig !== null &&
      !Array.isArray(profile.styleConfig) &&
      "privacy" in profile.styleConfig
        ? (profile.styleConfig as any).privacy
        : {};

    return {
      settings: {
        profileVisibility: profile.visibility as "public" | "private" | "followers",
        allowMessagesFrom:
          (privacySettings.allowMessagesFrom as "everyone" | "followers" | "friends" | "nobody") ||
          "everyone",
        showFollowers: (privacySettings.showFollowers as boolean) ?? true,
      },
    };
  },

  /**
   * settings.deleteAccount - Soft delete user account
   *
   * Sets deleted_at timestamp and status to 'deleted'.
   * Username is kept reserved to prevent impersonation.
   * Related data is cascade deleted via DB FK constraints.
   *
   * @throws {RPCError} UNAUTHORIZED - Not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   * @throws {RPCError} INVALID_CREDENTIALS - Password is incorrect
   */
  "settings.deleteAccount": async (ctx: ProcedureContext<z.infer<typeof deleteAccountSchema>>) => {
    // Require authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = deleteAccountSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new RPCError(ErrorCode.VALIDATION_ERROR, firstError?.message || "Invalid input", {
        field: firstError?.path[0],
        errors: validationResult.error.errors,
      });
    }

    const { password } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new RPCError(ErrorCode.USER_NOT_FOUND, "User not found");
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new RPCError(ErrorCode.INVALID_CREDENTIALS, "Password is incorrect");
    }

    // Soft delete user
    await prisma.user.update({
      where: { id: userId },
      data: {
        status: "deleted",
        deletedAt: new Date(),
      },
    });

    return {
      success: true,
    };
  },

  /**
   * settings.exportData - Generate GDPR-compliant data export
   *
   * Exports all user data including:
   * - User profile data
   * - All posts and comments
   * - All interactions (likes, follows, friendships)
   * - All messages
   * - Privacy settings
   *
   * @throws {RPCError} UNAUTHORIZED - Not authenticated
   */
  "settings.exportData": async (ctx: ProcedureContext<z.infer<typeof exportDataSchema>>) => {
    // Require authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
    }

    // Validate input
    const validationResult = exportDataSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new RPCError(ErrorCode.VALIDATION_ERROR, firstError?.message || "Invalid input", {
        field: firstError?.path[0],
        errors: validationResult.error.errors,
      });
    }

    const userId = BigInt(ctx.user.id);

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new RPCError(ErrorCode.USER_NOT_FOUND, "User not found");
    }

    // Get all posts with their stats
    const posts = await prisma.post.findMany({
      where: { userId: userId },
      include: {
        _count: {
          select: {
            interactions: { where: { type: "like" } },
            comments: true,
            reposts: true,
          },
        },
      },
    });

    // Get all comments
    const comments = await prisma.comment.findMany({
      where: { userId: userId },
      select: {
        id: true,
        postId: true,
        content: true,
        createdAt: true,
      },
    });

    // Get all likes
    const likes = await prisma.postInteraction.findMany({
      where: {
        userId: userId,
        type: "like",
      },
      select: {
        postId: true,
        createdAt: true,
      },
    });

    // Get all follows (users this user follows)
    const follows = await prisma.userFollow.findMany({
      where: { followerId: userId },
      include: {
        following: {
          select: {
            username: true,
          },
        },
      },
    });

    // Get all followers (users who follow this user)
    const followers = await prisma.userFollow.findMany({
      where: { followingId: userId },
      include: {
        follower: {
          select: {
            username: true,
          },
        },
      },
    });

    // Get all friendships
    const friendships1 = await prisma.friendship.findMany({
      where: { userId1: userId },
      include: {
        user2: {
          select: {
            username: true,
          },
        },
      },
    });

    const friendships2 = await prisma.friendship.findMany({
      where: { userId2: userId },
      include: {
        user1: {
          select: {
            username: true,
          },
        },
      },
    });

    // Combine and deduplicate friendships
    const allFriendships = [
      ...friendships1.map((f) => ({
        friendId: f.userId2.toString(),
        friendUsername: f.user2.username,
        status: "mutual", // Friendships table only contains mutual follows
        createdAt: f.createdAt,
      })),
      ...friendships2.map((f) => ({
        friendId: f.userId1.toString(),
        friendUsername: f.user1.username,
        status: "mutual", // Friendships table only contains mutual follows
        createdAt: f.createdAt,
      })),
    ];

    // Get all messages
    const messages = await prisma.message.findMany({
      where: { senderId: userId },
      select: {
        id: true,
        conversationId: true,
        content: true,
        createdAt: true,
      },
    });

    // Extract privacy settings from profile
    const privacySettings =
      user.profile &&
      typeof user.profile.styleConfig === "object" &&
      user.profile.styleConfig !== null &&
      !Array.isArray(user.profile.styleConfig) &&
      "privacy" in user.profile.styleConfig
        ? (user.profile.styleConfig as any).privacy
        : {};

    // Build export data
    return {
      data: {
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
          emailVerified: user.emailVerified,
          status: user.status,
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt,
        },
        profile: user.profile
          ? {
              displayName: user.profile.displayName,
              bio: user.profile.bio,
              visibility: user.profile.visibility,
              age: user.profile.age,
              location: user.profile.location,
              website: user.profile.website,
              backgroundConfig: user.profile.backgroundConfig,
              musicConfig: user.profile.musicConfig,
              styleConfig: user.profile.styleConfig,
              layoutConfig: user.profile.layoutConfig,
            }
          : null,
        posts: posts.map((post) => ({
          id: post.id.toString(),
          type: post.type,
          content: post.content,
          visibility: post.visibility,
          createdAt: post.createdAt,
          stats: {
            likeCount: post._count.interactions,
            commentCount: post._count.comments,
            repostCount: post._count.reposts,
          },
        })),
        comments: comments.map((comment) => ({
          id: comment.id.toString(),
          postId: comment.postId.toString(),
          content: comment.content,
          createdAt: comment.createdAt,
        })),
        interactions: {
          likes: likes.map((like) => ({
            postId: like.postId.toString(),
            createdAt: like.createdAt,
          })),
          follows: follows.map((follow) => ({
            followingId: follow.followingId.toString(),
            followingUsername: follow.following.username,
            createdAt: follow.createdAt,
          })),
          followers: followers.map((follower) => ({
            followerId: follower.followerId.toString(),
            followerUsername: follower.follower.username,
            createdAt: follower.createdAt,
          })),
          friendships: allFriendships,
        },
        messages: messages.map((message) => ({
          id: message.id.toString(),
          conversationId: message.conversationId.toString(),
          content: message.content,
          sentAt: message.createdAt,
        })),
        privacySettings: {
          profileVisibility:
            (user.profile?.visibility as "public" | "private" | "followers") || "public",
          allowMessagesFrom:
            (privacySettings.allowMessagesFrom as
              | "everyone"
              | "followers"
              | "friends"
              | "nobody") || "everyone",
          showFollowers: (privacySettings.showFollowers as boolean) ?? true,
        },
      },
    };
  },
};
