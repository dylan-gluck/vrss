/**
 * Media Router Tests - Phase 3.6
 *
 * Comprehensive test suite for the Media Router covering all 4 procedures:
 * - media.initiateUpload: Generate presigned S3 URL and check storage quota
 * - media.completeUpload: Validate upload and create media record
 * - media.deleteMedia: Delete media from S3 and update storage
 * - media.getStorageUsage: Return user storage statistics
 *
 * Following TDD: These tests are written AFTER implementation.
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 3.6
 * @see docs/api-architecture.md lines 460-501 (MediaProcedures type definitions)
 * @see docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md lines 234-270, 604-632
 * @see docs/specs/001-vrss-social-platform/DATA_STORAGE_DOCUMENTATION.md lines 1140-1520
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ErrorCode } from "@vrss/api-contracts";
import { mediaRouter } from "../../src/rpc/routers/media";
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

describe("Media Router", () => {
  const db = getTestDatabase();

  beforeEach(async () => {
    await cleanAllTables();
  });

  afterEach(async () => {
    await cleanAllTables();
  });

  // ===========================================================================
  // media.initiateUpload Tests
  // ===========================================================================

  describe("media.initiateUpload", () => {
    it("should generate presigned URL for valid image", async () => {
      // Arrange: Create authenticated user with storage quota
      const { user } = await buildUser().username("uploader").withProfile().build();

      const ctx = createMockContext<{
        filename: string;
        contentType: string;
        size: number;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          filename: "test-image.jpg",
          contentType: "image/jpeg",
          size: 1024 * 1024, // 1MB
        },
      });

      // Act: Call procedure
      const result = await mediaRouter["media.initiateUpload"](ctx);

      // Assert: Expected structure
      expect(typeof result.uploadUrl).toBe("string");
      expect(typeof result.mediaId).toBe("string");
      expect(result.expiresAt).toBeInstanceOf(Date);

      // Verify uploadUrl contains expected elements
      expect(result.uploadUrl).toContain("users/");
      expect(result.uploadUrl).toContain("test-image.jpg");

      // Verify mediaId is a valid UUID
      expect(result.mediaId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );

      // Verify expiresAt is approximately 15 minutes in the future
      const now = Date.now();
      const expiresAt = result.expiresAt.getTime();
      const fifteenMinutes = 15 * 60 * 1000;
      expect(expiresAt).toBeGreaterThan(now);
      expect(expiresAt).toBeLessThan(now + fifteenMinutes + 5000); // +5s buffer
    });

    it("should reject upload when quota exceeded", async () => {
      // Arrange: Create user with nearly full storage
      const { user } = await buildUser()
        .username("fullstorage")
        .withProfile()
        .withoutStorage()
        .build();

      await db.storageUsage.create({
        data: {
          userId: BigInt(user.id),
          usedBytes: BigInt(52000000), // 49.59 MB used
          quotaBytes: BigInt(52428800), // 50MB quota
        },
      });

      const ctx = createMockContext<{
        filename: string;
        contentType: string;
        size: number;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          filename: "large-video.mp4",
          contentType: "video/mp4",
          size: 10 * 1024 * 1024, // 10MB - exceeds available space
        },
      });

      // Act & Assert: Should throw storage quota error
      try {
        await mediaRouter["media.initiateUpload"](ctx);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.STORAGE_LIMIT_EXCEEDED);
        expect(error.message).toContain("Storage quota exceeded");
        expect(error.details).toMatchObject({
          used: expect.any(Number),
          quota: expect.any(Number),
          available: expect.any(Number),
          required: 10 * 1024 * 1024,
        });
      }
    });

    it("should reject invalid file types", async () => {
      // Arrange: Create authenticated user
      const { user } = await buildUser().username("uploader2").withProfile().build();

      const ctx = createMockContext<{
        filename: string;
        contentType: string;
        size: number;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          filename: "malicious.exe",
          contentType: "application/x-msdownload",
          size: 1024,
        },
      });

      // Act & Assert: Should throw validation error (schema catches invalid MIME first)
      try {
        await mediaRouter["media.initiateUpload"](ctx);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(error.message).toContain("Invalid content type");
      }
    });

    it("should reject oversized files", async () => {
      // Arrange: Create authenticated user
      const { user } = await buildUser().username("uploader3").withProfile().build();

      const ctx = createMockContext<{
        filename: string;
        contentType: string;
        size: number;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          filename: "huge-image.jpg",
          contentType: "image/jpeg",
          size: 15 * 1024 * 1024, // 15MB - exceeds 10MB limit for images
        },
      });

      // Act & Assert: Should throw file too large error
      try {
        await mediaRouter["media.initiateUpload"](ctx);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.FILE_TOO_LARGE);
        expect(error.message).toContain("File size exceeds maximum");
      }
    });

    it("should require authentication", async () => {
      // Arrange: Unauthenticated context
      const ctx = createMockContext<{
        filename: string;
        contentType: string;
        size: number;
      }>({
        user: null,
        input: {
          filename: "test.jpg",
          contentType: "image/jpeg",
          size: 1024,
        },
      });

      // Act & Assert: Should throw unauthorized error
      try {
        await mediaRouter["media.initiateUpload"](ctx);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      }
    });
  });

  // ===========================================================================
  // media.completeUpload Tests
  // ===========================================================================

  describe("media.completeUpload", () => {
    it("should create media record on successful upload", async () => {
      // Arrange: Create user and initiate upload
      const { user } = await buildUser().username("completer").withProfile().build();

      // Initiate upload first
      const initiateCtx = createMockContext<{
        filename: string;
        contentType: string;
        size: number;
      }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          filename: "uploaded-image.png",
          contentType: "image/png",
          size: 2 * 1024 * 1024, // 2MB
        },
      });

      const initiateResult = await mediaRouter["media.initiateUpload"](initiateCtx);

      // Act: Complete upload
      const completeCtx = createMockContext<{ mediaId: string }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          mediaId: initiateResult.mediaId,
        },
      });

      const result = await mediaRouter["media.completeUpload"](completeCtx);

      // Assert: Media object structure
      expect(typeof result.media.id).toBe("string");
      expect(result.media.ownerId).toBe(user.id.toString());
      expect(result.media.type).toBe("image");
      expect(typeof result.media.url).toBe("string");
      expect(result.media.size).toBe(2 * 1024 * 1024);
      expect(result.media.mimeType).toBe("image/png");
      expect(result.media.createdAt).toBeInstanceOf(Date);

      // Verify URL contains expected path
      expect(result.media.url).toContain("users/");
      expect(result.media.url).toContain("uploaded-image.png");
    });

    it("should reject invalid mediaId", async () => {
      // Arrange: Create authenticated user
      const { user } = await buildUser().username("completer2").withProfile().build();

      const ctx = createMockContext<{ mediaId: string }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          mediaId: "00000000-0000-0000-0000-000000000000", // Non-existent
        },
      });

      // Act & Assert: Should throw not found error
      try {
        await mediaRouter["media.completeUpload"](ctx);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.NOT_FOUND);
        expect(error.message).toContain("Upload not found");
      }
    });

    it("should reject expired uploads", async () => {
      // Arrange: Create user and expired pending upload
      const { user } = await buildUser().username("completer3").withProfile().build();

      // Create expired pending upload manually
      const expiredMediaId = crypto.randomUUID();
      await db.pendingUpload.create({
        data: {
          id: expiredMediaId,
          userId: BigInt(user.id),
          s3Key: `users/${user.id}/posts/${expiredMediaId}_test.jpg`,
          filename: "test.jpg",
          contentType: "image/jpeg",
          size: BigInt(1024),
          expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        },
      });

      const ctx = createMockContext<{ mediaId: string }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          mediaId: expiredMediaId,
        },
      });

      // Act & Assert: Should throw validation error
      try {
        await mediaRouter["media.completeUpload"](ctx);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(error.message).toContain("Upload expired");
      }
    });
  });

  // ===========================================================================
  // media.deleteMedia Tests
  // ===========================================================================

  describe("media.deleteMedia", () => {
    it("should delete media from database", async () => {
      // Arrange: Create user and upload media
      const { user } = await buildUser().username("deleter").withProfile().build();

      // Create media record directly
      const media = await db.postMedia.create({
        data: {
          postId: null as any,
          userId: BigInt(user.id),
          type: "image",
          fileUrl: `http://localhost:9000/vrss-media-dev/users/${user.id}/posts/test_image.jpg`,
          fileSizeBytes: BigInt(1024 * 1024),
          mimeType: "image/jpeg",
          displayOrder: 0,
        },
      });

      const ctx = createMockContext<{ mediaId: string }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          mediaId: media.id.toString(),
        },
      });

      // Act: Delete media
      const result = await mediaRouter["media.deleteMedia"](ctx);

      // Assert: Success response
      expect(result).toMatchObject({
        success: true,
      });

      // Verify media is deleted from database
      const deletedMedia = await db.postMedia.findUnique({
        where: { id: media.id },
      });
      expect(deletedMedia).toBeNull();
    });

    it("should prevent unauthorized deletion", async () => {
      // Arrange: Create two users
      const { user: owner } = await buildUser().username("owner").withProfile().build();

      const { user: attacker } = await buildUser().username("attacker").withProfile().build();

      // Create media owned by first user
      const media = await db.postMedia.create({
        data: {
          postId: null as any,
          userId: BigInt(owner.id),
          type: "image",
          fileUrl: `http://localhost:9000/vrss-media-dev/users/${owner.id}/posts/test_image.jpg`,
          fileSizeBytes: BigInt(1024 * 1024),
          mimeType: "image/jpeg",
          displayOrder: 0,
        },
      });

      // Try to delete with different user
      const ctx = createMockContext<{ mediaId: string }>({
        user: {
          id: attacker.id,
          username: attacker.username,
          email: attacker.email,
        } as any,
        input: {
          mediaId: media.id.toString(),
        },
      });

      // Act & Assert: Should throw unauthorized error
      try {
        await mediaRouter["media.deleteMedia"](ctx);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
        expect(error.message).toContain("Unauthorized to delete");
      }

      // Verify media still exists
      const stillExists = await db.postMedia.findUnique({
        where: { id: media.id },
      });
      expect(stillExists).not.toBeNull();
    });

    it("should reject non-existent media", async () => {
      // Arrange: Create authenticated user
      const { user } = await buildUser().username("deleter2").withProfile().build();

      const ctx = createMockContext<{ mediaId: string }>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {
          mediaId: "999999999", // Non-existent
        },
      });

      // Act & Assert: Should throw not found error
      try {
        await mediaRouter["media.deleteMedia"](ctx);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.NOT_FOUND);
        expect(error.message).toContain("Media not found");
      }
    });
  });

  // ===========================================================================
  // media.getStorageUsage Tests
  // ===========================================================================

  describe("media.getStorageUsage", () => {
    it("should return accurate storage statistics", async () => {
      // Arrange: Create user with storage usage
      const { user } = await buildUser()
        .username("storageuser")
        .withProfile()
        .withoutStorage()
        .build();

      await db.storageUsage.create({
        data: {
          userId: BigInt(user.id),
          usedBytes: BigInt(25 * 1024 * 1024), // 25MB
          quotaBytes: BigInt(52428800), // 50MB
        },
      });

      const ctx = createMockContext<Record<string, never>>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      // Act: Get storage usage
      const result = await mediaRouter["media.getStorageUsage"](ctx);

      // Assert: Expected values
      expect(result.used).toBe(25 * 1024 * 1024);
      expect(result.limit).toBe(52428800);
      expect(typeof result.percentage).toBe("number");

      // Verify percentage calculation (25MB / 50MB = 50%)
      expect(result.percentage).toBeCloseTo(50, 1);
    });

    it("should calculate percentage correctly", async () => {
      // Arrange: Create user with different usage
      const { user } = await buildUser()
        .username("storageuser2")
        .withProfile()
        .withoutStorage()
        .build();

      await db.storageUsage.create({
        data: {
          userId: BigInt(user.id),
          usedBytes: BigInt(10485760), // 10MB
          quotaBytes: BigInt(52428800), // 50MB
        },
      });

      const ctx = createMockContext<Record<string, never>>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      // Act: Get storage usage
      const result = await mediaRouter["media.getStorageUsage"](ctx);

      // Assert: Percentage is approximately 20%
      expect(result.percentage).toBeCloseTo(20, 1);
    });

    it("should handle zero usage", async () => {
      // Arrange: Create user with no usage
      const { user } = await buildUser().username("storageuser3").withProfile().build();

      const ctx = createMockContext<Record<string, never>>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      // Act: Get storage usage
      const result = await mediaRouter["media.getStorageUsage"](ctx);

      // Assert: Zero usage
      expect(result).toMatchObject({
        used: 0,
        limit: 52428800,
        percentage: 0,
      });
    });

    it("should create storage record if not exists", async () => {
      // Arrange: Create user without storage record
      const { user } = await buildUser().username("storageuser4").withProfile().build();

      const ctx = createMockContext<Record<string, never>>({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      // Act: Get storage usage (should create record)
      const result = await mediaRouter["media.getStorageUsage"](ctx);

      // Assert: Default quota created
      expect(result).toMatchObject({
        used: 0,
        limit: 52428800, // 50MB default
        percentage: 0,
      });

      // Verify record was created
      const storageRecord = await db.storageUsage.findUnique({
        where: { userId: BigInt(user.id) },
      });
      expect(storageRecord).not.toBeNull();
      expect(storageRecord?.quotaBytes).toBe(BigInt(52428800));
    });

    it("should require authentication", async () => {
      // Arrange: Unauthenticated context
      const ctx = createMockContext<Record<string, never>>({
        user: null,
        input: {},
      });

      // Act & Assert: Should throw unauthorized error
      try {
        await mediaRouter["media.getStorageUsage"](ctx);
        expect(true).toBe(false); // Should not reach here
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
      }
    });
  });
});
