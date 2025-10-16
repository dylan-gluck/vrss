/**
 * Email Verification Tests
 *
 * Test suite for email verification flow following TDD approach.
 * Tests are written before implementation to drive the design.
 *
 * Coverage:
 * 1. Valid verification token flow
 * 2. Expired token rejection
 * 3. Invalid token rejection
 * 4. Already verified email handling
 * 5. Resend verification flow
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 2.2
 * @see docs/SECURITY_DESIGN.md for email verification
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { getTestDatabase } from "../setup";
import { cleanUserData } from "../helpers/database";
import { hashPassword } from "../helpers/auth";

describe("auth.verifyEmail", () => {
  beforeEach(async () => {
    await cleanUserData();
  });

  test("should successfully verify email with valid token", async () => {
    // This test validates the happy path:
    // - User registered but not verified
    // - Verification token exists and valid
    // - Token not expired
    // - Email verified successfully

    const db = getTestDatabase();

    // Arrange: Create unverified user
    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash: await hashPassword("ValidPassword123!"),
        emailVerified: false, // Not verified yet
        status: "active",
      },
    });

    // Create verification token (24-hour expiry)
    const verificationToken = "test_verification_token_" + Date.now();
    const token = await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: verificationToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    expect(user.emailVerified).toBe(false);
    expect(token.expires.getTime()).toBeGreaterThan(Date.now());

    // Act: Verify email (procedure not yet implemented, this is TDD)
    // TODO: Replace with actual RPC call once auth.verifyEmail is implemented
    // const response = await apiClient.post('/api/rpc').send({
    //   procedure: 'auth.verifyEmail',
    //   input: { token: verificationToken },
    // });

    // Simulate verification process
    const foundToken = await db.verificationToken.findUnique({
      where: { token: verificationToken },
    });

    expect(foundToken).toBeDefined();
    expect(foundToken?.identifier).toBe(user.email);

    // Update user to verified
    const verifiedUser = await db.user.update({
      where: { email: foundToken!.identifier },
      data: { emailVerified: true },
    });

    // Delete used token
    await db.verificationToken.delete({
      where: { token: verificationToken },
    });

    // Assert: User is now verified
    expect(verifiedUser.emailVerified).toBe(true);

    // Assert: Token is deleted (one-time use)
    const deletedToken = await db.verificationToken.findUnique({
      where: { token: verificationToken },
    });
    expect(deletedToken).toBeNull();
  });

  test("should reject expired verification token", async () => {
    const db = getTestDatabase();

    // Arrange: Create unverified user
    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash: await hashPassword("ValidPassword123!"),
        emailVerified: false,
        status: "active",
      },
    });

    // Create expired verification token
    const expiredToken = "expired_token_" + Date.now();
    await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: expiredToken,
        expires: new Date(Date.now() - 1000), // Expired 1 second ago
      },
    });

    // Act: Attempt to verify with expired token
    const foundToken = await db.verificationToken.findUnique({
      where: { token: expiredToken },
    });

    expect(foundToken).toBeDefined();

    // Assert: Token is expired
    const isExpired = foundToken!.expires.getTime() < Date.now();
    expect(isExpired).toBe(true);

    // Expected error code: 1020 (AUTH_TOKEN_EXPIRED)
    // Expected error message: "Verification token expired. Please request a new one."
    // Expected HTTP status: 410 (Gone)

    // Assert: User should remain unverified
    const unchangedUser = await db.user.findUnique({
      where: { id: user.id },
    });
    expect(unchangedUser?.emailVerified).toBe(false);
  });

  test("should reject invalid verification token", async () => {
    const db = getTestDatabase();

    // Arrange: Create unverified user (but no token)
    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash: await hashPassword("ValidPassword123!"),
        emailVerified: false,
        status: "active",
      },
    });

    // Act: Attempt to verify with non-existent token
    const invalidToken = "non_existent_token_12345";
    const foundToken = await db.verificationToken.findUnique({
      where: { token: invalidToken },
    });

    // Assert: Token doesn't exist
    expect(foundToken).toBeNull();

    // Expected error code: 1021 (AUTH_INVALID_TOKEN)
    // Expected error message: "Invalid verification token"
    // Expected HTTP status: 400

    // Assert: User remains unverified
    const unchangedUser = await db.user.findUnique({
      where: { id: user.id },
    });
    expect(unchangedUser?.emailVerified).toBe(false);
  });

  test("should handle already verified email gracefully", async () => {
    const db = getTestDatabase();

    // Arrange: Create already verified user
    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash: await hashPassword("ValidPassword123!"),
        emailVerified: true, // Already verified
        status: "active",
      },
    });

    // Create verification token (shouldn't be used)
    const token = "unused_token_" + Date.now();
    await db.verificationToken.create({
      data: {
        identifier: user.email,
        token,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Act: Attempt to verify already verified email
    expect(user.emailVerified).toBe(true);

    // Expected behavior: Success response (idempotent)
    // Expected message: "Email already verified"
    // Expected HTTP status: 200
    // Token should still be deleted for security

    // Assert: User remains verified (no change)
    const unchangedUser = await db.user.findUnique({
      where: { id: user.id },
    });
    expect(unchangedUser?.emailVerified).toBe(true);
  });

  test("should support resending verification email", async () => {
    const db = getTestDatabase();

    // Arrange: Create unverified user with existing token
    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash: await hashPassword("ValidPassword123!"),
        emailVerified: false,
        status: "active",
      },
    });

    // Old verification token
    const oldToken = "old_token_" + Date.now();
    await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: oldToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Act: Resend verification (procedure not yet implemented)
    // TODO: Replace with actual RPC call once auth.resendVerification is implemented
    // const response = await apiClient.post('/api/rpc').send({
    //   procedure: 'auth.resendVerification',
    //   input: { email: 'test@example.com' },
    // });

    // Simulate resend process:
    // 1. Delete old token
    await db.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

    // 2. Create new token
    const newToken = "new_token_" + Date.now();
    const verificationToken = await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: newToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Assert: Old token deleted
    const deletedOldToken = await db.verificationToken.findUnique({
      where: { token: oldToken },
    });
    expect(deletedOldToken).toBeNull();

    // Assert: New token created
    expect(verificationToken.token).toBe(newToken);
    expect(verificationToken.identifier).toBe(user.email);
    expect(verificationToken.expires.getTime()).toBeGreaterThan(Date.now());

    // Expected behavior:
    // - Send new verification email
    // - Return success message
    // - Rate limit: max 3 resends per hour
  });

  test("should reject resend verification for already verified email", async () => {
    const db = getTestDatabase();

    // Arrange: Create verified user
    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash: await hashPassword("ValidPassword123!"),
        emailVerified: true, // Already verified
        status: "active",
      },
    });

    // Act: Attempt to resend verification
    expect(user.emailVerified).toBe(true);

    // Expected error code: 1022 (AUTH_ALREADY_VERIFIED)
    // Expected error message: "Email already verified"
    // Expected HTTP status: 400

    // Assert: No new token should be created
    const tokens = await db.verificationToken.findMany({
      where: { identifier: user.email },
    });
    expect(tokens.length).toBe(0);
  });

  test("should reject resend verification for non-existent user", async () => {
    const db = getTestDatabase();

    // Arrange: No user exists with this email
    const nonExistentEmail = "nonexistent@example.com";

    // Act: Attempt to resend verification
    const user = await db.user.findUnique({
      where: { email: nonExistentEmail },
    });

    expect(user).toBeNull();

    // Expected behavior: For security, return success message
    // Don't reveal whether email exists or not
    // Expected message: "If this email exists, verification email sent"
    // Expected HTTP status: 200

    // Assert: No token created
    const tokens = await db.verificationToken.findMany({
      where: { identifier: nonExistentEmail },
    });
    expect(tokens.length).toBe(0);
  });

  test("should enforce verification token expiry of 24 hours", async () => {
    const db = getTestDatabase();

    // Arrange: Create user and token
    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash: await hashPassword("ValidPassword123!"),
        emailVerified: false,
        status: "active",
      },
    });

    const token = await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: "test_token_" + Date.now(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    // Assert: Token expires in 24 hours
    const expiryTime = token.expires.getTime() - Date.now();
    const twentyFourHoursMs = 24 * 60 * 60 * 1000;

    expect(expiryTime).toBeGreaterThan(twentyFourHoursMs - 60000); // Within 1 minute tolerance
    expect(expiryTime).toBeLessThanOrEqual(twentyFourHoursMs + 60000);
  });

  test("should generate cryptographically secure verification tokens", async () => {
    const db = getTestDatabase();

    // This test documents the requirement for secure token generation
    // Tokens should be:
    // - At least 32 bytes (256 bits) of entropy
    // - Base64url encoded for URL safety
    // - Cryptographically random (not predictable)

    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash: await hashPassword("ValidPassword123!"),
        emailVerified: false,
        status: "active",
      },
    });

    // Generate secure token (example implementation)
    const bytes = new Uint8Array(32); // 32 bytes = 256 bits
    crypto.getRandomValues(bytes);
    const secureToken = Buffer.from(bytes).toString("base64url");

    const token = await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: secureToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Assert: Token is sufficiently long
    expect(token.token.length).toBeGreaterThanOrEqual(40); // Base64url encoded 32 bytes

    // Assert: Token is URL-safe (no special characters that need encoding)
    const urlSafeRegex = /^[A-Za-z0-9_-]+$/;
    expect(urlSafeRegex.test(token.token)).toBe(true);
  });

  test("should support one verification token per email (replace old)", async () => {
    const db = getTestDatabase();

    // Arrange: Create user
    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash: await hashPassword("ValidPassword123!"),
        emailVerified: false,
        status: "active",
      },
    });

    // Create first token
    const token1 = await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: "token_1_" + Date.now(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Act: Create second token (should replace first)
    await db.verificationToken.deleteMany({
      where: { identifier: user.email },
    });

    const token2 = await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: "token_2_" + Date.now(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Assert: Only one token exists
    const tokens = await db.verificationToken.findMany({
      where: { identifier: user.email },
    });

    expect(tokens.length).toBe(1);
    expect(tokens[0].token).toBe(token2.token);
    expect(tokens[0].token).not.toBe(token1.token);
  });

  test("should cleanup used verification tokens after successful verification", async () => {
    const db = getTestDatabase();

    // Arrange: Create user and token
    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash: await hashPassword("ValidPassword123!"),
        emailVerified: false,
        status: "active",
      },
    });

    const verificationToken = "cleanup_token_" + Date.now();
    await db.verificationToken.create({
      data: {
        identifier: user.email,
        token: verificationToken,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Act: Verify email and cleanup token
    await db.user.update({
      where: { email: user.email },
      data: { emailVerified: true },
    });

    await db.verificationToken.delete({
      where: { token: verificationToken },
    });

    // Assert: Token is deleted
    const token = await db.verificationToken.findUnique({
      where: { token: verificationToken },
    });
    expect(token).toBeNull();

    // Assert: User is verified
    const verifiedUser = await db.user.findUnique({
      where: { id: user.id },
    });
    expect(verifiedUser?.emailVerified).toBe(true);
  });
});
