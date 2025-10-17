import { z } from "zod";

/**
 * Allowed MIME types for media uploads
 */
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

const ALLOWED_AUDIO_TYPES = ["audio/mpeg", "audio/wav", "audio/ogg"];

export const ALLOWED_MEDIA_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
];

/**
 * Maximum file sizes by media type
 */
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
export const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * Storage quota limits (in bytes)
 */
export const STORAGE_QUOTAS = {
  FREE: 52428800, // 50MB
  BASIC: 1073741824, // 1GB
  PRO: 5368709120, // 5GB
  PREMIUM: 10737418240, // 10GB
};

/**
 * Validation schema for media.initiateUpload
 */
export const initiateUploadSchema = z.object({
  filename: z
    .string()
    .min(1, "Filename is required")
    .max(255, "Filename must not exceed 255 characters")
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Filename can only contain alphanumeric characters, dots, hyphens, and underscores"
    ),
  contentType: z
    .string()
    .refine(
      (type) => ALLOWED_MEDIA_TYPES.includes(type),
      "Invalid content type. Allowed types: image/*, video/*, audio/*"
    ),
  size: z.number().positive("File size must be positive").int("File size must be an integer"),
});

/**
 * Validation schema for media.completeUpload
 */
export const completeUploadSchema = z.object({
  mediaId: z.string().uuid("Invalid media ID format"),
});

/**
 * Validation schema for media.deleteMedia
 */
export const deleteMediaSchema = z.object({
  mediaId: z.string().regex(/^\d+$/, "Invalid media ID format"),
});

/**
 * Validation schema for media.getStorageUsage
 * Empty object since this procedure takes no input
 */
export const getStorageUsageSchema = z.object({});

/**
 * Helper function to get max file size for a given content type
 */
export function getMaxFileSizeForType(contentType: string): number {
  if (ALLOWED_IMAGE_TYPES.includes(contentType)) {
    return MAX_IMAGE_SIZE;
  }
  if (ALLOWED_VIDEO_TYPES.includes(contentType)) {
    return MAX_VIDEO_SIZE;
  }
  if (ALLOWED_AUDIO_TYPES.includes(contentType)) {
    return MAX_AUDIO_SIZE;
  }
  throw new Error(`Unsupported content type: ${contentType}`);
}

/**
 * Helper function to determine media type from MIME type
 */
export function getMediaTypeFromMimeType(mimeType: string): "image" | "video" | "audio" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  throw new Error(`Unsupported MIME type: ${mimeType}`);
}
