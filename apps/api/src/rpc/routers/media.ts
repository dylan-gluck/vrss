/**
 * Media Router - Phase 3.6
 *
 * Implements media upload and storage management procedures for the VRSS Social Platform.
 * Handles two-phase file upload with S3 pre-signed URLs, storage quota management,
 * and media deletion.
 *
 * Procedures:
 * - media.initiateUpload: Generate presigned S3 URL and check storage quota
 * - media.completeUpload: Validate upload and create media record
 * - media.deleteMedia: Delete media from S3 and update storage
 * - media.getStorageUsage: Return user storage statistics
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.6
 * @see docs/api-architecture.md lines 460-501 (MediaProcedures type definitions)
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 234-270, 604-632
 * @see docs/specs/001-vrss-social-platform/DATA_STORAGE_DOCUMENTATION.md lines 1140-1520
 */

import { type Prisma, PrismaClient } from "@prisma/client";
import { ErrorCode } from "@vrss/api-contracts";
import type { z } from "zod";
import { randomUUID } from "node:crypto";
import type { ProcedureContext } from "../types";
import {
  initiateUploadSchema,
  completeUploadSchema,
  deleteMediaSchema,
  getStorageUsageSchema,
  getMaxFileSizeForType,
  getMediaTypeFromMimeType,
  ALLOWED_MEDIA_TYPES,
} from "./schemas/media";
import {
  generatePresignedUploadUrl,
  deleteS3Object,
  generateMediaKey,
  getPublicUrl,
} from "../../lib/s3";

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
 * Check storage quota before upload
 * Uses FOR UPDATE lock to prevent race conditions
 *
 * @param userId - User ID
 * @param fileSize - Size of file to upload in bytes
 * @returns Storage usage record if quota is available
 * @throws RPCError if quota exceeded
 */
async function checkStorageQuota(userId: bigint, fileSize: number): Promise<any> {
  // Query with FOR UPDATE lock to prevent race conditions
  const storage = await prisma.$queryRaw<any[]>`
    SELECT * FROM storage_usage
    WHERE user_id = ${userId}
    FOR UPDATE
  `;

  if (!storage || storage.length === 0) {
    // Create storage record if it doesn't exist (new user)
    return await prisma.storageUsage.create({
      data: {
        userId: userId,
        usedBytes: BigInt(0),
        quotaBytes: BigInt(52428800), // 50MB default
      },
    });
  }

  const storageRecord = storage[0];
  const availableBytes = Number(storageRecord.quota_bytes) - Number(storageRecord.used_bytes);

  if (availableBytes < fileSize) {
    throw new RPCError(ErrorCode.STORAGE_LIMIT_EXCEEDED, "Storage quota exceeded", {
      used: Number(storageRecord.used_bytes),
      quota: Number(storageRecord.quota_bytes),
      available: availableBytes,
      required: fileSize,
    });
  }

  return storageRecord;
}

// =============================================================================
// PROCEDURE HANDLERS
// =============================================================================

/**
 * media.initiateUpload - Generate presigned S3 URL and check storage quota
 *
 * Flow:
 * 1. Validate input (filename, contentType, size)
 * 2. Check storage quota with FOR UPDATE lock
 * 3. Validate file type against allowed types
 * 4. Check file size limits
 * 5. Generate unique media ID and S3 key
 * 6. Generate presigned URL (15min expiry)
 * 7. Return uploadUrl, mediaId, expiresAt
 */
async function initiateUpload(
  ctx: ProcedureContext<z.infer<typeof initiateUploadSchema>>
): Promise<any> {
  // Validate input
  const validation = initiateUploadSchema.safeParse(ctx.input);
  if (!validation.success) {
    const error = getValidationError(validation);
    throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
      field: error.field,
      errors: error.errors,
    });
  }

  const { filename, contentType, size } = validation.data;

  // Ensure user is authenticated
  if (!ctx.user) {
    throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required for file upload");
  }

  const userId = BigInt(ctx.user.id);

  // Validate file type
  if (!ALLOWED_MEDIA_TYPES.includes(contentType)) {
    throw new RPCError(ErrorCode.INVALID_FILE_TYPE, "Invalid file type", {
      contentType,
      allowedTypes: ALLOWED_MEDIA_TYPES,
    });
  }

  // Check file size limit for this media type
  const maxSize = getMaxFileSizeForType(contentType);
  if (size > maxSize) {
    throw new RPCError(
      ErrorCode.FILE_TOO_LARGE,
      `File size exceeds maximum allowed for ${contentType}`,
      {
        size,
        maxSize,
        contentType,
      }
    );
  }

  // Check storage quota (with FOR UPDATE lock)
  await checkStorageQuota(userId, size);

  // Generate unique media ID
  const mediaId = randomUUID();

  // Generate S3 key
  const s3Key = generateMediaKey(userId, mediaId, filename);

  // Generate presigned upload URL (15 minutes expiry)
  const uploadUrl = await generatePresignedUploadUrl(s3Key, contentType, 900);

  // Calculate expiry timestamp
  const expiresAt = new Date(Date.now() + 900000); // 15 minutes from now

  // Store pending upload metadata (for validation in completeUpload)
  await prisma.pendingUpload.create({
    data: {
      id: mediaId,
      userId: userId,
      s3Key: s3Key,
      filename: filename,
      contentType: contentType,
      size: BigInt(size),
      expiresAt: expiresAt,
    },
  });

  return {
    uploadUrl,
    mediaId,
    expiresAt,
  };
}

/**
 * media.completeUpload - Validate upload and create media record
 *
 * Flow:
 * 1. Validate mediaId
 * 2. Verify pending upload exists and hasn't expired
 * 3. Create post_media record
 * 4. Delete pending upload record
 * 5. Return media object
 *
 * Note: Storage usage is automatically updated by database trigger
 */
async function completeUpload(
  ctx: ProcedureContext<z.infer<typeof completeUploadSchema>>
): Promise<any> {
  // Validate input
  const validation = completeUploadSchema.safeParse(ctx.input);
  if (!validation.success) {
    const error = getValidationError(validation);
    throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
      field: error.field,
      errors: error.errors,
    });
  }

  const { mediaId } = validation.data;

  // Ensure user is authenticated
  if (!ctx.user) {
    throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const userId = BigInt(ctx.user.id);

  // Get pending upload record
  const pendingUpload = await prisma.pendingUpload.findUnique({
    where: { id: mediaId },
  });

  if (!pendingUpload) {
    throw new RPCError(ErrorCode.NOT_FOUND, "Upload not found or already completed", { mediaId });
  }

  // Verify ownership
  if (pendingUpload.userId !== userId) {
    throw new RPCError(ErrorCode.UNAUTHORIZED, "Unauthorized to complete this upload");
  }

  // Check if expired
  if (pendingUpload.expiresAt < new Date()) {
    // Clean up expired upload
    await prisma.pendingUpload.delete({
      where: { id: mediaId },
    });

    throw new RPCError(
      ErrorCode.VALIDATION_ERROR,
      "Upload expired. Please initiate a new upload.",
      { mediaId }
    );
  }

  // Create media record
  // Note: For now, we don't require a post_id since media can be uploaded
  // independently and then attached to posts later. We'll set post_id to NULL.
  const fileUrl = getPublicUrl(pendingUpload.s3Key);
  const mediaType = getMediaTypeFromMimeType(pendingUpload.contentType);

  const media = await prisma.postMedia.create({
    data: {
      postId: null as any, // Will be set when attached to a post
      userId: userId,
      type: mediaType,
      fileUrl: fileUrl,
      fileSizeBytes: pendingUpload.size,
      mimeType: pendingUpload.contentType,
      displayOrder: 0,
    },
  });

  // Delete pending upload record
  await prisma.pendingUpload.delete({
    where: { id: mediaId },
  });

  // Return media object
  return {
    media: {
      id: media.id.toString(),
      ownerId: media.userId.toString(),
      type: media.type,
      url: media.fileUrl,
      thumbnailUrl: media.thumbnailUrl,
      size: Number(media.fileSizeBytes),
      mimeType: media.mimeType,
      metadata: {
        width: media.width,
        height: media.height,
        duration: media.durationSeconds,
      },
      createdAt: media.createdAt,
    },
  };
}

/**
 * media.deleteMedia - Delete media from S3 and update storage
 *
 * Flow:
 * 1. Validate mediaId
 * 2. Get media record and verify ownership
 * 3. Delete from S3
 * 4. Delete from post_media table
 * 5. Return success
 *
 * Note: Storage usage is automatically updated by database trigger
 */
async function deleteMedia(ctx: ProcedureContext<z.infer<typeof deleteMediaSchema>>): Promise<any> {
  // Validate input
  const validation = deleteMediaSchema.safeParse(ctx.input);
  if (!validation.success) {
    const error = getValidationError(validation);
    throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
      field: error.field,
      errors: error.errors,
    });
  }

  const { mediaId } = validation.data;

  // Ensure user is authenticated
  if (!ctx.user) {
    throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const userId = BigInt(ctx.user.id);

  // Get media record
  const media = await prisma.postMedia.findUnique({
    where: { id: BigInt(mediaId) },
  });

  if (!media) {
    throw new RPCError(ErrorCode.NOT_FOUND, "Media not found", { mediaId });
  }

  // Verify ownership
  if (media.userId !== userId) {
    throw new RPCError(ErrorCode.UNAUTHORIZED, "Unauthorized to delete this media");
  }

  // Extract S3 key from file URL
  // Format: https://cdn.vrss.app/users/{userId}/posts/{mediaId}_{filename}
  // or http://localhost:9000/vrss-media-dev/users/{userId}/posts/{mediaId}_{filename}
  const urlParts = media.fileUrl.split("/");
  const s3Key = urlParts.slice(-3).join("/"); // users/{userId}/posts/{mediaId}_{filename}

  try {
    // Delete from S3
    await deleteS3Object(s3Key);
  } catch (error) {
    console.error("Failed to delete from S3:", error);
    // Continue with database deletion even if S3 deletion fails
    // This prevents orphaned database records
  }

  // Delete from database (trigger will update storage_usage)
  await prisma.postMedia.delete({
    where: { id: BigInt(mediaId) },
  });

  return {
    success: true,
  };
}

/**
 * media.getStorageUsage - Return user storage statistics
 *
 * Flow:
 * 1. Get storage_usage record for user
 * 2. Calculate percentage
 * 3. Return used/limit/percentage
 */
async function getStorageUsage(
  ctx: ProcedureContext<z.infer<typeof getStorageUsageSchema>>
): Promise<any> {
  // Validate input (empty object)
  const validation = getStorageUsageSchema.safeParse(ctx.input);
  if (!validation.success) {
    const error = getValidationError(validation);
    throw new RPCError(ErrorCode.VALIDATION_ERROR, error.message, {
      field: error.field,
      errors: error.errors,
    });
  }

  // Ensure user is authenticated
  if (!ctx.user) {
    throw new RPCError(ErrorCode.UNAUTHORIZED, "Authentication required");
  }

  const userId = BigInt(ctx.user.id);

  // Get or create storage usage record
  let storage = await prisma.storageUsage.findUnique({
    where: { userId },
  });

  if (!storage) {
    // Create storage record with default quota if it doesn't exist
    storage = await prisma.storageUsage.create({
      data: {
        userId: userId,
        usedBytes: BigInt(0),
        quotaBytes: BigInt(52428800), // 50MB default
      },
    });
  }

  const used = Number(storage.usedBytes);
  const limit = Number(storage.quotaBytes);
  const percentage = limit > 0 ? (used / limit) * 100 : 0;

  return {
    used,
    limit,
    percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
  };
}

// =============================================================================
// ROUTER EXPORT
// =============================================================================

/**
 * Media router with all procedures
 */
export const mediaRouter = {
  "media.initiateUpload": initiateUpload,
  "media.completeUpload": completeUpload,
  "media.deleteMedia": deleteMedia,
  "media.getStorageUsage": getStorageUsage,
};
