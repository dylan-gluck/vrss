import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

/**
 * S3 Client Configuration
 *
 * Environment Variables:
 * - S3_ENDPOINT: S3 endpoint URL (MinIO for dev: http://localhost:9000, AWS: https://s3.amazonaws.com)
 * - S3_REGION: AWS region (default: us-east-1)
 * - S3_BUCKET: S3 bucket name
 * - S3_ACCESS_KEY_ID: AWS access key
 * - S3_SECRET_ACCESS_KEY: AWS secret key
 * - S3_USE_PATH_STYLE: Use path-style URLs (required for MinIO)
 */

const S3_CONFIG = {
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
  },
  forcePathStyle: process.env.S3_USE_PATH_STYLE === "true",
};

export const s3Client = new S3Client(S3_CONFIG);

export const S3_BUCKET = process.env.S3_BUCKET || "vrss-media-dev";
export const CDN_URL = process.env.CDN_URL || "";

/**
 * Generate a pre-signed URL for uploading a file to S3
 * @param key - S3 object key (path)
 * @param contentType - MIME type of the file
 * @param expiresIn - URL expiration time in seconds (default: 900 = 15 minutes)
 * @returns Pre-signed upload URL
 */
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 900
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete an object from S3
 * @param key - S3 object key (path)
 */
export async function deleteS3Object(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Generate S3 key for user media
 * @param userId - User ID
 * @param mediaId - Media ID (UUID)
 * @param filename - Original filename
 * @returns S3 object key
 */
export function generateMediaKey(userId: bigint, mediaId: string, filename: string): string {
  return `users/${userId}/posts/${mediaId}_${filename}`;
}

/**
 * Convert S3 key to public URL
 * @param key - S3 object key
 * @returns Public URL (CDN if configured, otherwise S3 URL)
 */
export function getPublicUrl(key: string): string {
  if (CDN_URL) {
    return `${CDN_URL}/${key}`;
  }

  // Fallback to direct S3 URL
  if (S3_CONFIG.forcePathStyle) {
    return `${S3_CONFIG.endpoint}/${S3_BUCKET}/${key}`;
  }

  return `https://${S3_BUCKET}.s3.${S3_CONFIG.region}.amazonaws.com/${key}`;
}
