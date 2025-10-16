/**
 * User Router - Phase 3.1
 *
 * Implements all user profile management procedures for the VRSS Social Platform.
 * Handles profile viewing, updating, style customization, and section management.
 *
 * Procedures:
 * - user.getProfile: Retrieve user profile with visibility checks
 * - user.updateProfile: Update profile information
 * - user.updateStyle: Update profile customization (backgrounds, music, styles)
 * - user.updateSections: Manage profile sections
 * - user.getSections: Retrieve profile sections with visibility filtering
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.1
 * @see docs/api-architecture.md lines 818-916 (Example User Router)
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 130-171 (user_profiles)
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 394-425 (profile_sections)
 */

import { z } from "zod";
import { PrismaClient, Prisma } from "@prisma/client";
import { ErrorCode } from "@vrss/api-contracts";
import { ProcedureContext } from "../types";
import {
  getProfileSchema,
  updateProfileSchema,
  updateStyleSchema,
  updateSectionsSchema,
  getSectionsSchema,
} from "./schemas/user";

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
 * Check if a user can view another user's profile based on visibility settings
 */
async function checkProfileVisibility(
  profileUserId: bigint,
  visibility: string,
  viewerUserId: string | null
): Promise<boolean> {
  // Public profiles: Anyone can view
  if (visibility === "public") {
    return true;
  }

  // Not authenticated: Can only view public profiles
  if (!viewerUserId) {
    return false;
  }

  // Owner: Can always view their own profile
  if (viewerUserId === profileUserId.toString()) {
    return true;
  }

  // Private profiles: Only owner can view
  if (visibility === "private") {
    return false;
  }

  // Followers-only: Check if viewer follows the profile owner
  if (visibility === "followers") {
    const follow = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: BigInt(viewerUserId),
          followingId: profileUserId,
        },
      },
    });
    return !!follow;
  }

  return false;
}

/**
 * Check storage quota before allowing upload
 */
async function checkStorageQuota(
  userId: bigint,
  additionalBytes: bigint
): Promise<void> {
  const storage = await prisma.storageUsage.findUnique({
    where: { userId },
  });

  if (!storage) {
    throw new RPCError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      "Storage record not found"
    );
  }

  const newUsedBytes = storage.usedBytes + additionalBytes;
  if (newUsedBytes > storage.quotaBytes) {
    throw new RPCError(
      ErrorCode.STORAGE_QUOTA_EXCEEDED,
      "Storage quota exceeded",
      {
        used: storage.usedBytes.toString(),
        quota: storage.quotaBytes.toString(),
        requested: additionalBytes.toString(),
      }
    );
  }
}

// =============================================================================
// USER PROCEDURES
// =============================================================================

export const userRouter = {
  /**
   * user.getProfile - Get user profile by username
   *
   * Retrieves user profile with visibility checks. Returns user info,
   * style configuration, and profile sections based on access permissions.
   *
   * @throws {RPCError} USER_NOT_FOUND - User does not exist
   * @throws {RPCError} FORBIDDEN - Cannot view profile due to visibility settings
   */
  "user.getProfile": async (
    ctx: ProcedureContext<z.infer<typeof getProfileSchema>>
  ) => {
    // Validate input
    const validationResult = getProfileSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        firstError?.message || "Invalid input",
        { field: firstError?.path[0], errors: validationResult.error.errors }
      );
    }

    const { username } = validationResult.data;

    // Find user by username
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
        status: "active", // Only find active users
      },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new RPCError(
        ErrorCode.USER_NOT_FOUND,
        "User not found",
        { username }
      );
    }

    // Check visibility permissions
    const visibility = user.profile?.visibility || "public";
    const canView = await checkProfileVisibility(
      user.id,
      visibility,
      ctx.user?.id || null
    );

    if (!canView) {
      throw new RPCError(
        ErrorCode.FORBIDDEN,
        "Cannot view this profile",
        { visibility }
      );
    }

    // Get profile sections (filter by visibility if not owner)
    const isOwner = ctx.user?.id === user.id.toString();
    const sections = await prisma.profileSection.findMany({
      where: {
        userId: user.id,
        ...(isOwner ? {} : { isVisible: true }), // Only show visible sections to non-owners
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    // Build response
    return {
      user: {
        id: user.id.toString(),
        username: user.username,
        displayName: user.profile?.displayName || null,
        bio: user.profile?.bio || null,
        avatarUrl: null, // TODO: Implement avatar URL logic
        visibility: visibility as "public" | "followers" | "private",
      },
      style: {
        backgroundConfig: user.profile?.backgroundConfig || {},
        musicConfig: user.profile?.musicConfig || null,
        styleConfig: user.profile?.styleConfig || {},
      },
      sections: sections.map((section) => ({
        id: section.id.toString(),
        type: section.type,
        title: section.title,
        description: section.description,
        config: section.config,
        displayOrder: section.displayOrder,
        isVisible: section.isVisible,
      })),
    };
  },

  /**
   * user.updateProfile - Update user profile
   *
   * Updates profile information (display name, bio, avatar, visibility).
   * Only the profile owner can update their profile.
   *
   * @throws {RPCError} UNAUTHORIZED - Not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid input
   * @throws {RPCError} STORAGE_QUOTA_EXCEEDED - Avatar upload would exceed quota
   */
  "user.updateProfile": async (
    ctx: ProcedureContext<z.infer<typeof updateProfileSchema>>
  ) => {
    // Require authentication
    if (!ctx.user) {
      throw new RPCError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required"
      );
    }

    // Validate input
    const validationResult = updateProfileSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        firstError?.message || "Invalid input",
        { field: firstError?.path[0], errors: validationResult.error.errors }
      );
    }

    const { displayName, bio, avatarUrl, visibility, avatarSize } =
      validationResult.data;

    const userId = BigInt(ctx.user.id);

    // Check storage quota if avatar is being uploaded
    if (avatarUrl && avatarSize) {
      await checkStorageQuota(userId, BigInt(avatarSize));
    }

    // Upsert user profile
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        displayName: displayName || null,
        bio: bio || null,
        visibility: visibility || "public",
      },
      update: {
        ...(displayName !== undefined && { displayName }),
        ...(bio !== undefined && { bio }),
        ...(visibility !== undefined && { visibility }),
      },
    });

    // Update storage usage if avatar was uploaded
    if (avatarUrl && avatarSize) {
      await prisma.storageUsage.update({
        where: { userId },
        data: {
          usedBytes: {
            increment: BigInt(avatarSize),
          },
          imagesBytes: {
            increment: BigInt(avatarSize),
          },
        },
      });
    }

    // Get user data for response
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    return {
      user: {
        id: userId.toString(),
        username: user?.username || "",
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: avatarUrl || null,
        visibility: profile.visibility,
      },
    };
  },

  /**
   * user.updateStyle - Update profile style configuration
   *
   * Updates profile customization including backgrounds, music, colors, and fonts.
   * Supports partial updates (merges with existing configuration).
   *
   * @throws {RPCError} UNAUTHORIZED - Not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid style configuration
   */
  "user.updateStyle": async (
    ctx: ProcedureContext<z.infer<typeof updateStyleSchema>>
  ) => {
    // Require authentication
    if (!ctx.user) {
      throw new RPCError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required"
      );
    }

    // Validate input
    const validationResult = updateStyleSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        firstError?.message || "Invalid style configuration",
        { field: firstError?.path[0], errors: validationResult.error.errors }
      );
    }

    const { backgroundConfig, musicConfig, styleConfig } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    // Get existing profile to merge configs
    const existingProfile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    // Merge configurations (cast to Prisma.InputJsonValue for type safety)
    const mergedBackgroundConfig: Prisma.InputJsonValue = backgroundConfig
      ? {
          ...(typeof existingProfile?.backgroundConfig === "object" &&
          existingProfile.backgroundConfig !== null &&
          !Array.isArray(existingProfile.backgroundConfig)
            ? (existingProfile.backgroundConfig as Record<string, any>)
            : {}),
          ...backgroundConfig,
        }
      : (existingProfile?.backgroundConfig as Prisma.InputJsonValue) || {};

    const mergedMusicConfig: Prisma.InputJsonValue | null = musicConfig
      ? {
          ...(typeof existingProfile?.musicConfig === "object" &&
          existingProfile.musicConfig !== null &&
          !Array.isArray(existingProfile.musicConfig)
            ? (existingProfile.musicConfig as Record<string, any>)
            : {}),
          ...musicConfig,
        }
      : existingProfile?.musicConfig !== undefined
      ? (existingProfile.musicConfig as Prisma.InputJsonValue | null)
      : null;

    const mergedStyleConfig: Prisma.InputJsonValue = styleConfig
      ? {
          ...(typeof existingProfile?.styleConfig === "object" &&
          existingProfile.styleConfig !== null &&
          !Array.isArray(existingProfile.styleConfig)
            ? (existingProfile.styleConfig as Record<string, any>)
            : {}),
          ...styleConfig,
        }
      : (existingProfile?.styleConfig as Prisma.InputJsonValue) || {};

    // Upsert profile with merged configurations
    const updateData: Prisma.UserProfileUpdateInput = {};
    if (backgroundConfig) {
      updateData.backgroundConfig = mergedBackgroundConfig;
    }
    if (musicConfig !== undefined) {
      updateData.musicConfig = mergedMusicConfig ?? Prisma.JsonNull;
    }
    if (styleConfig) {
      updateData.styleConfig = mergedStyleConfig;
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      create: {
        userId,
        backgroundConfig: mergedBackgroundConfig,
        musicConfig: mergedMusicConfig ?? Prisma.JsonNull,
        styleConfig: mergedStyleConfig,
      },
      update: updateData,
    });

    return {
      style: {
        backgroundConfig: profile.backgroundConfig,
        musicConfig: profile.musicConfig,
        styleConfig: profile.styleConfig,
      },
    };
  },

  /**
   * user.updateSections - Update profile sections
   *
   * Manages profile sections (add, update, remove, reorder).
   * Sections with IDs are updated; sections without IDs are created new.
   * Sections not in the input array are deleted.
   *
   * @throws {RPCError} UNAUTHORIZED - Not authenticated
   * @throws {RPCError} VALIDATION_ERROR - Invalid section configuration
   */
  "user.updateSections": async (
    ctx: ProcedureContext<z.infer<typeof updateSectionsSchema>>
  ) => {
    // Require authentication
    if (!ctx.user) {
      throw new RPCError(
        ErrorCode.UNAUTHORIZED,
        "Authentication required"
      );
    }

    // Validate input
    const validationResult = updateSectionsSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        firstError?.message || "Invalid section configuration",
        { field: firstError?.path[0], errors: validationResult.error.errors }
      );
    }

    const { sections } = validationResult.data;
    const userId = BigInt(ctx.user.id);

    // Get existing sections
    const existingSections = await prisma.profileSection.findMany({
      where: { userId },
    });

    // Separate sections into updates and creates
    const sectionIdsToKeep: bigint[] = [];
    const updates: Array<{
      id: bigint;
      data: any;
    }> = [];
    const creates: Array<any> = [];

    for (const section of sections) {
      if (section.id) {
        // Update existing section
        const sectionId = BigInt(section.id);
        sectionIdsToKeep.push(sectionId);
        updates.push({
          id: sectionId,
          data: {
            type: section.type,
            title: section.title,
            description: section.description || null,
            config: section.config || {},
            displayOrder: section.displayOrder,
            isVisible: section.isVisible,
          },
        });
      } else {
        // Create new section
        creates.push({
          userId,
          type: section.type,
          title: section.title,
          description: section.description || null,
          config: section.config || {},
          displayOrder: section.displayOrder,
          isVisible: section.isVisible,
        });
      }
    }

    // Delete sections not in the input array (that belong to this user)
    const sectionIdsToDelete = existingSections
      .filter((s) => !sectionIdsToKeep.includes(s.id))
      .map((s) => s.id);

    // Execute updates in a transaction
    await prisma.$transaction(async (tx) => {
      // Delete removed sections
      if (sectionIdsToDelete.length > 0) {
        await tx.profileSection.deleteMany({
          where: {
            id: { in: sectionIdsToDelete },
            userId, // Ensure only deleting own sections
          },
        });
      }

      // Update existing sections
      for (const update of updates) {
        await tx.profileSection.update({
          where: { id: update.id },
          data: update.data,
        });
      }

      // Create new sections
      if (creates.length > 0) {
        await tx.profileSection.createMany({
          data: creates,
        });
      }
    });

    // Fetch updated sections
    const updatedSections = await prisma.profileSection.findMany({
      where: { userId },
      orderBy: { displayOrder: "asc" },
    });

    return {
      sections: updatedSections.map((section) => ({
        id: section.id.toString(),
        type: section.type,
        title: section.title,
        description: section.description,
        config: section.config,
        displayOrder: section.displayOrder,
        isVisible: section.isVisible,
      })),
    };
  },

  /**
   * user.getSections - Get profile sections
   *
   * Retrieves profile sections for a user. If the viewer is the owner,
   * returns all sections (visible + hidden). Otherwise, only returns visible sections.
   *
   * @throws {RPCError} USER_NOT_FOUND - User does not exist
   */
  "user.getSections": async (
    ctx: ProcedureContext<z.infer<typeof getSectionsSchema>>
  ) => {
    // Validate input
    const validationResult = getSectionsSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        firstError?.message || "Invalid input",
        { field: firstError?.path[0], errors: validationResult.error.errors }
      );
    }

    const { username } = validationResult.data;

    // Find user by username
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: username,
          mode: "insensitive",
        },
        status: "active",
      },
    });

    if (!user) {
      throw new RPCError(
        ErrorCode.USER_NOT_FOUND,
        "User not found",
        { username }
      );
    }

    // Check if viewer is the owner
    const isOwner = ctx.user?.id === user.id.toString();

    // Get sections (filter by visibility if not owner)
    const sections = await prisma.profileSection.findMany({
      where: {
        userId: user.id,
        ...(isOwner ? {} : { isVisible: true }),
      },
      orderBy: {
        displayOrder: "asc",
      },
    });

    return {
      sections: sections.map((section) => ({
        id: section.id.toString(),
        type: section.type,
        title: section.title,
        description: section.description,
        config: section.config,
        displayOrder: section.displayOrder,
        isVisible: section.isVisible,
      })),
    };
  },
};
