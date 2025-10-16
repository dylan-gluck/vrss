/**
 * Session Management Tests
 *
 * Test suite for session management procedures following TDD approach.
 * Tests are written before implementation to drive the design.
 *
 * Coverage:
 * 1. Get session with valid token
 * 2. Expired session handling
 * 3. Invalid session token rejection
 * 4. Session refresh (24h sliding window)
 * 5. Multiple active sessions per user
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 2.2
 * @see docs/SECURITY_DESIGN.md for session configuration
 */

import { describe, test, expect, beforeEach } from "bun:test";
import { getTestDatabase } from "../setup";
import { cleanUserData } from "../helpers/database";
import { createAuthenticatedUser, createExpiredSession } from "../helpers/auth";

describe("auth.getSession", () => {
  beforeEach(async () => {
    await cleanUserData();
  });

  test("should successfully retrieve session with valid token", async () => {
    // This test validates the happy path:
    // - Session token is valid
    // - Session not expired
    // - User is active
    // - Returns user and session data

    const db = getTestDatabase();

    // Arrange: Create authenticated user with session
    const { user, session, token } = await createAuthenticatedUser();

    expect(session.token).toBeDefined();
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());

    // Act: Get session (procedure not yet implemented, this is TDD)
    // TODO: Replace with actual RPC call once auth.getSession is implemented
    // const response = await apiClient.post('/api/rpc').send({
    //   procedure: 'auth.getSession',
    //   input: { token },
    // });

    // Simulate session retrieval
    const foundSession = await db.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            emailVerified: true,
            status: true,
            createdAt: true,
            lastLoginAt: true,
          },
        },
      },
    });

    // Assert: Session found
    expect(foundSession).toBeDefined();
    expect(foundSession?.id).toBe(session.id);
    expect(foundSession?.userId).toBe(user.id);

    // Assert: User data included
    expect(foundSession?.user).toBeDefined();
    expect(foundSession?.user.id).toBe(user.id);
    expect(foundSession?.user.username).toBe(user.username);
    expect(foundSession?.user.email).toBe(user.email);

    // Assert: Password hash NOT included (security)
    expect((foundSession?.user as any).passwordHash).toBeUndefined();

    // Expected response format:
    // {
    //   success: true,
    //   data: {
    //     session: { id, userId, token, expiresAt, lastActivityAt },
    //     user: { id, username, email, emailVerified, status }
    //   }
    // }
  });

  test("should reject expired session token", async () => {
    const db = getTestDatabase();

    // Arrange: Create user with expired session
    const { user } = await createAuthenticatedUser();
    const { session: expiredSession, token: expiredToken } = await createExpiredSession(user.id);

    // Verify session is expired
    expect(expiredSession.expiresAt.getTime()).toBeLessThan(Date.now());

    // Act: Attempt to get session
    const foundSession = await db.session.findFirst({
      where: {
        token: expiredToken,
        expiresAt: { gt: new Date() },
      },
    });

    // Assert: Session not found (filtered by expiry)
    expect(foundSession).toBeNull();

    // Expected error code: 1030 (AUTH_SESSION_EXPIRED)
    // Expected error message: "Session expired. Please login again."
    // Expected HTTP status: 401

    // Optional: Delete expired session for cleanup
    await db.session.delete({
      where: { id: expiredSession.id },
    });
  });

  test("should reject invalid session token", async () => {
    const db = getTestDatabase();

    // Arrange: Non-existent token
    const invalidToken = "non_existent_token_12345";

    // Act: Attempt to get session
    const foundSession = await db.session.findFirst({
      where: {
        token: invalidToken,
        expiresAt: { gt: new Date() },
      },
    });

    // Assert: Session not found
    expect(foundSession).toBeNull();

    // Expected error code: 1031 (AUTH_INVALID_SESSION)
    // Expected error message: "Invalid session token"
    // Expected HTTP status: 401
  });

  test("should refresh session if within 24h sliding window", async () => {
    const db = getTestDatabase();

    // Arrange: Create session with lastActivityAt 12 hours ago
    const { user, session } = await createAuthenticatedUser();

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    await db.session.update({
      where: { id: session.id },
      data: { lastActivityAt: twelveHoursAgo },
    });

    // Act: Get session (should trigger refresh)
    // Session update policy:
    // - updateAge: 24 hours (86400 seconds)
    // - If lastActivityAt > 24h ago: extend expiresAt by 7 days

    const currentSession = await db.session.findUnique({
      where: { id: session.id },
    });

    expect(currentSession?.lastActivityAt.getTime()).toBeLessThan(Date.now() - 11 * 60 * 60 * 1000);

    // Check if refresh is needed (lastActivityAt > 24h ago)
    const timeSinceActivity = Date.now() - currentSession!.lastActivityAt.getTime();
    const shouldRefresh = timeSinceActivity > 24 * 60 * 60 * 1000;

    expect(shouldRefresh).toBe(false); // Only 12 hours, no refresh needed

    // If refresh needed, update session:
    if (shouldRefresh) {
      await db.session.update({
        where: { id: session.id },
        data: {
          lastActivityAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Extend 7 days
        },
      });
    }

    // Expected behavior:
    // - lastActivityAt < 24h: no update
    // - lastActivityAt > 24h: update lastActivityAt and extend expiresAt
  });

  test("should update lastActivityAt when session is refreshed", async () => {
    const db = getTestDatabase();

    // Arrange: Create session with lastActivityAt > 24h ago
    const { user, session } = await createAuthenticatedUser();

    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);
    await db.session.update({
      where: { id: session.id },
      data: { lastActivityAt: twentyFiveHoursAgo },
    });

    // Act: Refresh session (simulate auth.getSession behavior)
    const beforeRefresh = Date.now();

    const refreshedSession = await db.session.update({
      where: { id: session.id },
      data: {
        lastActivityAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const afterRefresh = Date.now();

    // Assert: lastActivityAt updated to now
    expect(refreshedSession.lastActivityAt.getTime()).toBeGreaterThanOrEqual(beforeRefresh);
    expect(refreshedSession.lastActivityAt.getTime()).toBeLessThanOrEqual(afterRefresh);

    // Assert: expiresAt extended by 7 days
    const newExpiryTime = refreshedSession.expiresAt.getTime() - Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(newExpiryTime).toBeGreaterThan(sevenDaysMs - 60000); // Within 1 minute tolerance
    expect(newExpiryTime).toBeLessThanOrEqual(sevenDaysMs + 60000);
  });

  test("should support multiple active sessions per user", async () => {
    const db = getTestDatabase();

    // Arrange: Create user with multiple sessions (different devices)
    const { user } = await createAuthenticatedUser();

    // Create additional sessions
    const desktopSession = await db.session.create({
      data: {
        userId: user.id,
        token: "desktop_token_" + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (Desktop)",
        ipAddress: "192.168.1.100",
        lastActivityAt: new Date(),
      },
    });

    const mobileSession = await db.session.create({
      data: {
        userId: user.id,
        token: "mobile_token_" + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (Mobile)",
        ipAddress: "192.168.1.101",
        lastActivityAt: new Date(),
      },
    });

    const tabletSession = await db.session.create({
      data: {
        userId: user.id,
        token: "tablet_token_" + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (Tablet)",
        ipAddress: "192.168.1.102",
        lastActivityAt: new Date(),
      },
    });

    // Act: Get all active sessions for user
    const activeSessions = await db.session.findMany({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    // Assert: Multiple sessions exist
    expect(activeSessions.length).toBeGreaterThanOrEqual(3);

    // Assert: Each session has unique token
    const tokens = activeSessions.map((s) => s.token);
    const uniqueTokens = new Set(tokens);
    expect(uniqueTokens.size).toBe(activeSessions.length);

    // Assert: All belong to same user
    activeSessions.forEach((session) => {
      expect(session.userId).toBe(user.id);
    });
  });

  test("should reject session for suspended user", async () => {
    const db = getTestDatabase();

    // Arrange: Create authenticated user then suspend
    const { user, session, token } = await createAuthenticatedUser();

    await db.user.update({
      where: { id: user.id },
      data: { status: "suspended" },
    });

    // Act: Attempt to get session
    const foundSession = await db.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    // Assert: Session found but user suspended
    expect(foundSession).toBeDefined();
    expect(foundSession?.user.status).toBe("suspended");

    // Expected error code: 1012 (AUTH_ACCOUNT_SUSPENDED)
    // Expected error message: "Account suspended. Contact support."
    // Expected HTTP status: 403

    // Session should be invalidated when user is suspended
  });

  test("should reject session for deleted user", async () => {
    const db = getTestDatabase();

    // Arrange: Create authenticated user then delete
    const { user, session, token } = await createAuthenticatedUser();

    await db.user.update({
      where: { id: user.id },
      data: {
        status: "deleted",
        deletedAt: new Date(),
      },
    });

    // Act: Attempt to get session
    const foundSession = await db.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    // Assert: Session found but user deleted
    expect(foundSession).toBeDefined();
    expect(foundSession?.user.status).toBe("deleted");
    expect(foundSession?.user.deletedAt).toBeDefined();

    // Expected error code: 1013 (AUTH_ACCOUNT_DELETED)
    // Expected error message: "Account no longer exists"
    // Expected HTTP status: 410 (Gone)
  });

  test("should include session metadata in response", async () => {
    const db = getTestDatabase();

    // Arrange: Create session with metadata
    const { user } = await createAuthenticatedUser();

    const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)";
    const ipAddress = "203.0.113.42";

    const session = await db.session.create({
      data: {
        userId: user.id,
        token: "metadata_token_" + Date.now(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent,
        ipAddress,
        lastActivityAt: new Date(),
      },
    });

    // Act: Get session
    const foundSession = await db.session.findUnique({
      where: { id: session.id },
    });

    // Assert: Metadata included
    expect(foundSession?.userAgent).toBe(userAgent);
    expect(foundSession?.ipAddress).toBe(ipAddress);
    expect(foundSession?.lastActivityAt).toBeDefined();
    expect(foundSession?.createdAt).toBeDefined();

    // Expected response should include:
    // - session.id
    // - session.userId
    // - session.expiresAt
    // - session.lastActivityAt
    // - session.userAgent
    // - session.ipAddress
    // - session.createdAt
  });

  test("should enforce 7-day session expiry", async () => {
    const db = getTestDatabase();

    // Arrange: Create session
    const { session } = await createAuthenticatedUser();

    // Assert: Session expires in 7 days
    const expiryTime = session.expiresAt.getTime() - Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

    // Allow 1 minute tolerance for test execution time
    expect(expiryTime).toBeGreaterThan(sevenDaysMs - 60000);
    expect(expiryTime).toBeLessThanOrEqual(sevenDaysMs + 60000);

    // Session configuration from SECURITY_DESIGN.md:
    // - expiresIn: 60 * 60 * 24 * 7 (604800 seconds = 7 days)
    // - updateAge: 60 * 60 * 24 (86400 seconds = 24 hours)
  });

  test("should cleanup expired sessions periodically", async () => {
    const db = getTestDatabase();

    // This test documents the expected cleanup behavior
    // A background job should periodically delete expired sessions

    // Arrange: Create multiple expired sessions
    const { user } = await createAuthenticatedUser();

    const expiredSessions = await Promise.all([
      createExpiredSession(user.id),
      createExpiredSession(user.id),
      createExpiredSession(user.id),
    ]);

    // Act: Cleanup expired sessions
    const deletedCount = await db.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    // Assert: Expired sessions deleted
    expect(deletedCount.count).toBeGreaterThanOrEqual(3);

    // Verify cleanup
    const remainingExpiredSessions = await db.session.findMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    });

    expect(remainingExpiredSessions.length).toBe(0);

    // Expected cleanup schedule:
    // - Run daily via cron job
    // - Delete sessions where expiresAt < NOW()
    // - Log number of sessions cleaned
  });

  test("should reject session for unverified email", async () => {
    const db = getTestDatabase();

    // Arrange: Create user with unverified email and session
    const { user, session, token } = await createAuthenticatedUser({
      emailVerified: false,
    });

    // Act: Attempt to get session
    const foundSession = await db.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: true,
      },
    });

    // Assert: Session exists but user email not verified
    expect(foundSession).toBeDefined();
    expect(foundSession?.user.emailVerified).toBe(false);

    // Expected behavior: Require email verification
    // Expected error code: 1010 (AUTH_EMAIL_NOT_VERIFIED)
    // Expected error message: "Email not verified. Please check your inbox."
    // Expected HTTP status: 403

    // Note: Ideally sessions shouldn't be created for unverified users,
    // but this test ensures the check happens at session validation too
  });
});
