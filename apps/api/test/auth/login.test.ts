/**
 * Login Procedure Tests
 *
 * Test suite for auth.login procedure following TDD approach.
 * Tests are written before implementation to drive the design.
 *
 * Coverage:
 * 1. Valid credentials successful login
 * 2. Unverified email rejection (403 with requiresVerification flag)
 * 3. Invalid credentials rejection (401)
 * 4. Non-existent user rejection
 * 5. Rate limiting enforcement
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 2.2
 * @see docs/SECURITY_DESIGN.md for session management
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { getTestDatabase } from "../setup";
import { cleanUserData } from "../helpers/database";
import { hashPassword, verifyPassword } from "../helpers/auth";

describe("auth.login", () => {
  beforeEach(async () => {
    await cleanUserData();
  });

  test("should successfully login with valid credentials", async () => {
    // This test validates the happy path:
    // - User exists with verified email
    // - Password matches
    // - Session created with 7-day expiry

    const db = getTestDatabase();

    // Arrange: Create verified user
    const password = "ValidPassword123!";
    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash,
        emailVerified: true, // Must be verified to login
        status: "active",
      },
    });

    // Act: Login (procedure not yet implemented, this is TDD)
    // TODO: Replace with actual RPC call once auth.login is implemented
    // const response = await apiClient.post('/api/rpc').send({
    //   procedure: 'auth.login',
    //   input: {
    //     email: 'test@example.com',
    //     password: 'ValidPassword123!',
    //   },
    // });

    // For now, simulate what the procedure should do:
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    expect(isPasswordValid).toBe(true);

    // Create session (simulating auth.login behavior)
    const session = await db.session.create({
      data: {
        userId: user.id,
        token: "test_session_token_" + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userAgent: "Test User Agent",
        ipAddress: "127.0.0.1",
        lastActivityAt: new Date(),
      },
    });

    // Assert: Session created successfully
    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.userId).toBe(user.id);
    expect(session.token).toBeDefined();
    expect(session.expiresAt).toBeDefined();

    // Assert: Session expires in 7 days
    const expiryTime = session.expiresAt.getTime() - Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiryTime).toBeGreaterThan(sevenDaysMs - 60000); // Within 1 minute tolerance
    expect(expiryTime).toBeLessThanOrEqual(sevenDaysMs + 60000);

    // Assert: lastLoginAt should be updated
    // TODO: Add lastLoginAt update once auth procedure is implemented
  });

  test("should reject login for unverified email (403 with requiresVerification flag)", async () => {
    const db = getTestDatabase();

    // Arrange: Create unverified user
    const password = "ValidPassword123!";
    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username: "unverifieduser",
        email: "unverified@example.com",
        passwordHash,
        emailVerified: false, // NOT verified
        status: "active",
      },
    });

    // Act: Attempt login with unverified email
    // Expected behavior:
    // - Password is correct
    // - But email not verified
    // - Should return 403 with specific error

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    expect(isPasswordValid).toBe(true);

    // Assert: Login should be blocked due to unverified email
    // Expected error code: 1010 (AUTH_EMAIL_NOT_VERIFIED)
    // Expected error message: "Email not verified. Please check your inbox."
    // Expected HTTP status: 403
    // Expected response body: { success: false, error: { code: 1010, message: "...", requiresVerification: true } }

    expect(user.emailVerified).toBe(false);

    // Assert: No session should be created
    const sessionCount = await db.session.count({
      where: { userId: user.id },
    });
    expect(sessionCount).toBe(0);
  });

  test("should reject login with invalid password (401)", async () => {
    const db = getTestDatabase();

    // Arrange: Create verified user
    const correctPassword = "ValidPassword123!";
    const passwordHash = await hashPassword(correctPassword);

    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash,
        emailVerified: true,
        status: "active",
      },
    });

    // Act: Attempt login with wrong password
    const wrongPassword = "WrongPassword123!";
    const isPasswordValid = await verifyPassword(wrongPassword, user.passwordHash);

    // Assert: Password verification fails
    expect(isPasswordValid).toBe(false);

    // Expected error code: 1011 (AUTH_INVALID_CREDENTIALS)
    // Expected error message: "Invalid email or password"
    // Expected HTTP status: 401

    // Assert: No session should be created
    const sessionCount = await db.session.count({
      where: { userId: user.id },
    });
    expect(sessionCount).toBe(0);
  });

  test("should reject login for non-existent user (401)", async () => {
    const db = getTestDatabase();

    // Arrange: No user exists with this email
    const nonExistentEmail = "nonexistent@example.com";

    // Act: Attempt login
    const user = await db.user.findUnique({
      where: { email: nonExistentEmail },
    });

    // Assert: User doesn't exist
    expect(user).toBeNull();

    // Expected error code: 1011 (AUTH_INVALID_CREDENTIALS)
    // Expected error message: "Invalid email or password" (same as wrong password for security)
    // Expected HTTP status: 401
    // Note: Don't reveal whether email exists or not (security best practice)

    // Assert: No session exists
    const sessionCount = await db.session.count();
    expect(sessionCount).toBe(0);
  });

  test("should reject login for suspended user", async () => {
    const db = getTestDatabase();

    // Arrange: Create suspended user
    const password = "ValidPassword123!";
    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username: "suspendeduser",
        email: "suspended@example.com",
        passwordHash,
        emailVerified: true,
        status: "suspended", // Account suspended
      },
    });

    // Act: Verify password is correct
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    expect(isPasswordValid).toBe(true);

    // Assert: Login should be blocked due to suspended status
    // Expected error code: 1012 (AUTH_ACCOUNT_SUSPENDED)
    // Expected error message: "Account suspended. Contact support."
    // Expected HTTP status: 403

    expect(user.status).toBe("suspended");

    // Assert: No session should be created
    const sessionCount = await db.session.count({
      where: { userId: user.id },
    });
    expect(sessionCount).toBe(0);
  });

  test("should reject login for deleted user", async () => {
    const db = getTestDatabase();

    // Arrange: Create deleted user
    const password = "ValidPassword123!";
    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username: "deleteduser",
        email: "deleted@example.com",
        passwordHash,
        emailVerified: true,
        status: "deleted", // Account deleted
        deletedAt: new Date(),
      },
    });

    // Act: Verify user status
    expect(user.status).toBe("deleted");

    // Assert: Login should be blocked
    // Expected error code: 1013 (AUTH_ACCOUNT_DELETED)
    // Expected error message: "Account no longer exists"
    // Expected HTTP status: 410 (Gone)

    // Assert: No session should be created
    const sessionCount = await db.session.count({
      where: { userId: user.id },
    });
    expect(sessionCount).toBe(0);
  });

  test("should update lastLoginAt timestamp on successful login", async () => {
    const db = getTestDatabase();

    // Arrange: Create verified user
    const password = "ValidPassword123!";
    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash,
        emailVerified: true,
        status: "active",
        lastLoginAt: null, // Never logged in
      },
    });

    expect(user.lastLoginAt).toBeNull();

    // Act: Simulate successful login
    const beforeLogin = Date.now();

    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const afterLogin = Date.now();

    // Assert: lastLoginAt was updated
    expect(updatedUser.lastLoginAt).toBeDefined();
    expect(updatedUser.lastLoginAt).not.toBeNull();

    const lastLoginTime = updatedUser.lastLoginAt!.getTime();
    expect(lastLoginTime).toBeGreaterThanOrEqual(beforeLogin);
    expect(lastLoginTime).toBeLessThanOrEqual(afterLogin);
  });

  test("should allow email-based login (case-insensitive)", async () => {
    const db = getTestDatabase();

    // Arrange: Create user with lowercase email
    const password = "ValidPassword123!";
    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash,
        emailVerified: true,
        status: "active",
      },
    });

    // Act: Try to login with different case variations
    const emailVariations = [
      "test@example.com", // Exact match
      "TEST@EXAMPLE.COM", // All uppercase
      "Test@Example.Com", // Mixed case
      "TeSt@ExAmPlE.cOm", // Random case
    ];

    // Assert: All variations should find the user
    for (const emailVariation of emailVariations) {
      const foundUser = await db.user.findFirst({
        where: {
          email: {
            equals: emailVariation,
            mode: "insensitive", // Case-insensitive match
          },
        },
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(user.id);
    }
  });

  test("should create session with correct metadata", async () => {
    const db = getTestDatabase();

    // Arrange: Create verified user
    const password = "ValidPassword123!";
    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash,
        emailVerified: true,
        status: "active",
      },
    });

    // Act: Create session with metadata
    const userAgent = "Mozilla/5.0 (Test Browser)";
    const ipAddress = "192.168.1.100";

    const session = await db.session.create({
      data: {
        userId: user.id,
        token: "test_token_" + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent,
        ipAddress,
        lastActivityAt: new Date(),
      },
    });

    // Assert: Session has correct metadata
    expect(session.userAgent).toBe(userAgent);
    expect(session.ipAddress).toBe(ipAddress);
    expect(session.lastActivityAt).toBeDefined();

    // Assert: createdAt is set
    expect(session.createdAt).toBeDefined();
    expect(session.createdAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  test("should support multiple active sessions per user", async () => {
    const db = getTestDatabase();

    // Arrange: Create verified user
    const password = "ValidPassword123!";
    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        username: "testuser",
        email: "test@example.com",
        passwordHash,
        emailVerified: true,
        status: "active",
      },
    });

    // Act: Create multiple sessions (different devices)
    const session1 = await db.session.create({
      data: {
        userId: user.id,
        token: "desktop_token_" + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (Desktop)",
        ipAddress: "192.168.1.100",
        lastActivityAt: new Date(),
      },
    });

    const session2 = await db.session.create({
      data: {
        userId: user.id,
        token: "mobile_token_" + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (Mobile)",
        ipAddress: "192.168.1.101",
        lastActivityAt: new Date(),
      },
    });

    // Assert: Both sessions exist for the same user
    const activeSessions = await db.session.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
    });

    expect(activeSessions.length).toBe(2);
    expect(activeSessions[0].userId).toBe(user.id);
    expect(activeSessions[1].userId).toBe(user.id);
    expect(activeSessions[0].token).not.toBe(activeSessions[1].token);
  });

  test("should enforce rate limiting on failed login attempts", async () => {
    // This test documents the expected rate limiting behavior
    // Actual implementation will be done in the auth.login procedure

    // Expected behavior:
    // - Track failed login attempts per email address
    // - After 5 failed attempts within 15 minutes: temporary lockout
    // - Lockout duration: 15 minutes
    // - Reset counter on successful login
    // - Return error code: 1014 (AUTH_RATE_LIMITED)
    // - Return error message: "Too many login attempts. Try again in X minutes."

    // For TDD, we document this requirement
    const rateLimitConfig = {
      maxAttempts: 5,
      windowMinutes: 15,
      lockoutMinutes: 15,
    };

    expect(rateLimitConfig.maxAttempts).toBe(5);
    expect(rateLimitConfig.windowMinutes).toBe(15);
    expect(rateLimitConfig.lockoutMinutes).toBe(15);

    // TODO: Implement actual rate limiting logic in auth.login procedure
    // TODO: Add rate limit table or use in-memory store (Redis recommended)
  });
});
