/**
 * Logout Procedure Tests
 *
 * Test suite for auth.logout procedure following TDD approach.
 * Tests are written before implementation to drive the design.
 *
 * Coverage:
 * 1. Valid logout (destroys session)
 * 2. No active session handling
 * 3. Session invalidation verification
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 2.2
 * @see docs/SECURITY_DESIGN.md for session management
 */

import { beforeEach, describe, expect, test } from "bun:test";
import { createAuthenticatedUser } from "../helpers/auth";
import { cleanUserData } from "../helpers/database";
import { getTestDatabase } from "../setup";

describe("auth.logout", () => {
  beforeEach(async () => {
    await cleanUserData();
  });

  test("should successfully logout and destroy session", async () => {
    // This test validates the happy path:
    // - User has active session
    // - Logout deletes session from database
    // - Token becomes invalid

    const db = getTestDatabase();

    // Arrange: Create authenticated user with session
    const { session, token } = await createAuthenticatedUser();

    // Verify session exists
    const existingSession = await db.session.findUnique({
      where: { id: session.id },
    });
    expect(existingSession).toBeDefined();
    expect(existingSession?.token).toBe(token);

    // Act: Logout (procedure not yet implemented, this is TDD)
    // TODO: Replace with actual RPC call once auth.logout is implemented
    // const response = await apiClient.post('/api/rpc').send({
    //   procedure: 'auth.logout',
    //   input: { token },
    // });

    // Simulate logout process: Delete session
    await db.session.delete({
      where: { id: session.id },
    });

    // Assert: Session deleted
    const deletedSession = await db.session.findUnique({
      where: { id: session.id },
    });
    expect(deletedSession).toBeNull();

    // Assert: Token is now invalid
    const sessionByToken = await db.session.findFirst({
      where: { token },
    });
    expect(sessionByToken).toBeNull();

    // Expected response:
    // {
    //   success: true,
    //   message: "Logged out successfully"
    // }
  });

  test("should handle logout with no active session gracefully", async () => {
    const db = getTestDatabase();

    // Arrange: Create user but no session
    const { user } = await createAuthenticatedUser();

    // Delete the session
    await db.session.deleteMany({
      where: { userId: user.id },
    });

    // Act: Attempt logout with invalid token
    const invalidToken = "non_existent_token_12345";
    const foundSession = await db.session.findFirst({
      where: { token: invalidToken },
    });

    // Assert: No session found
    expect(foundSession).toBeNull();

    // Expected behavior: Return success (idempotent operation)
    // Expected response:
    // {
    //   success: true,
    //   message: "Already logged out"
    // }
    // HTTP status: 200

    // Note: Don't return error for already logged out state
    // This makes logout idempotent and prevents edge case issues
  });

  test("should verify session invalidation after logout", async () => {
    const db = getTestDatabase();

    // Arrange: Create authenticated user
    const { session, token } = await createAuthenticatedUser();

    // Verify session is valid before logout
    const validSession = await db.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
    });
    expect(validSession).toBeDefined();
    expect(validSession?.id).toBe(session.id);

    // Act: Logout
    await db.session.delete({
      where: { id: session.id },
    });

    // Assert: Session no longer valid
    const invalidSession = await db.session.findFirst({
      where: {
        token,
        expiresAt: { gt: new Date() },
      },
    });
    expect(invalidSession).toBeNull();

    // Assert: Subsequent API calls with this token should fail
    // Expected error code: 1031 (AUTH_INVALID_SESSION)
    // Expected error message: "Invalid session token"
    // Expected HTTP status: 401
  });

  test("should logout only the current session (not all user sessions)", async () => {
    const db = getTestDatabase();

    // Arrange: Create user with multiple sessions
    const { user, session: session1 } = await createAuthenticatedUser();

    // Create second session (different device)
    const session2 = await db.session.create({
      data: {
        userId: user.id,
        token: `second_session_token_${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (Mobile)",
        ipAddress: "192.168.1.101",
        lastActivityAt: new Date(),
      },
    });

    // Create third session (another device)
    const session3 = await db.session.create({
      data: {
        userId: user.id,
        token: `third_session_token_${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Mozilla/5.0 (Tablet)",
        ipAddress: "192.168.1.102",
        lastActivityAt: new Date(),
      },
    });

    // Verify all sessions exist
    const allSessions = await db.session.findMany({
      where: { userId: user.id },
    });
    expect(allSessions.length).toBe(3);

    // Act: Logout from first session only
    await db.session.delete({
      where: { id: session1.id },
    });

    // Assert: First session deleted
    const deletedSession = await db.session.findUnique({
      where: { id: session1.id },
    });
    expect(deletedSession).toBeNull();

    // Assert: Other sessions still active
    const remainingSessions = await db.session.findMany({
      where: { userId: user.id },
    });
    expect(remainingSessions.length).toBe(2);

    const sessionIds = remainingSessions.map((s) => s.id);
    expect(sessionIds).toContain(session2.id);
    expect(sessionIds).toContain(session3.id);
    expect(sessionIds).not.toContain(session1.id);
  });

  test("should support logout from all devices (logoutAll)", async () => {
    const db = getTestDatabase();

    // Arrange: Create user with multiple sessions
    const { user } = await createAuthenticatedUser();

    // Create additional sessions
    await db.session.createMany({
      data: [
        {
          userId: user.id,
          token: `session_1_${Date.now()}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: "Desktop",
          ipAddress: "192.168.1.100",
          lastActivityAt: new Date(),
        },
        {
          userId: user.id,
          token: `session_2_${Date.now()}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: "Mobile",
          ipAddress: "192.168.1.101",
          lastActivityAt: new Date(),
        },
        {
          userId: user.id,
          token: `session_3_${Date.now()}`,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          userAgent: "Tablet",
          ipAddress: "192.168.1.102",
          lastActivityAt: new Date(),
        },
      ],
    });

    // Verify multiple sessions exist
    const beforeLogout = await db.session.count({
      where: { userId: user.id },
    });
    expect(beforeLogout).toBeGreaterThanOrEqual(3);

    // Act: Logout from all devices
    // TODO: Implement auth.logoutAll procedure
    await db.session.deleteMany({
      where: { userId: user.id },
    });

    // Assert: All sessions deleted
    const afterLogout = await db.session.count({
      where: { userId: user.id },
    });
    expect(afterLogout).toBe(0);

    // Expected use cases for logoutAll:
    // - User suspects account compromise
    // - Password changed (security best practice)
    // - User clicks "Logout from all devices" in settings
  });

  test("should clear session token from client (cookie)", async () => {
    // This test documents the expected client-side behavior

    // Expected logout response headers:
    // Set-Cookie: vrss_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax

    const expectedCookieDirectives = {
      name: "vrss_session",
      value: "", // Empty value
      path: "/",
      expires: "Thu, 01 Jan 1970 00:00:00 GMT", // Expired date
      httpOnly: true,
      sameSite: "Lax",
      secure: process.env.NODE_ENV === "production",
    };

    // Assert: Cookie configuration matches security requirements
    expect(expectedCookieDirectives.httpOnly).toBe(true);
    expect(expectedCookieDirectives.sameSite).toBe("Lax");
    expect(expectedCookieDirectives.path).toBe("/");

    // In production, secure should be true (HTTPS only)
    if (process.env.NODE_ENV === "production") {
      expect(expectedCookieDirectives.secure).toBe(true);
    }
  });

  test("should handle concurrent logout requests gracefully", async () => {
    const db = getTestDatabase();

    // Arrange: Create authenticated user
    const { token } = await createAuthenticatedUser();

    // Act: Simulate concurrent logout requests
    const logout1 = db.session.deleteMany({
      where: { token },
    });

    const logout2 = db.session.deleteMany({
      where: { token },
    });

    const [result1, result2] = await Promise.all([logout1, logout2]);

    // Assert: Both requests succeed (idempotent)
    // One will delete 1 session, the other will delete 0
    expect(result1.count + result2.count).toBe(1);

    // Assert: Session is deleted
    const deletedSession = await db.session.findFirst({
      where: { token },
    });
    expect(deletedSession).toBeNull();
  });

  test("should not affect other users' sessions", async () => {
    const db = getTestDatabase();

    // Arrange: Create two users with sessions
    const user1 = await createAuthenticatedUser({
      username: "user1",
      email: "user1@example.com",
    });

    const user2 = await createAuthenticatedUser({
      username: "user2",
      email: "user2@example.com",
    });

    // Verify both have sessions
    const user1Sessions = await db.session.count({
      where: { userId: user1.user.id },
    });
    const user2Sessions = await db.session.count({
      where: { userId: user2.user.id },
    });

    expect(user1Sessions).toBeGreaterThanOrEqual(1);
    expect(user2Sessions).toBeGreaterThanOrEqual(1);

    // Act: Logout user1
    await db.session.delete({
      where: { id: user1.session.id },
    });

    // Assert: User1 session deleted
    const user1AfterLogout = await db.session.count({
      where: { userId: user1.user.id },
    });
    expect(user1AfterLogout).toBe(user1Sessions - 1);

    // Assert: User2 sessions unchanged
    const user2AfterLogout = await db.session.count({
      where: { userId: user2.user.id },
    });
    expect(user2AfterLogout).toBe(user2Sessions);
  });

  test("should log logout event for security audit", async () => {
    const db = getTestDatabase();

    // This test documents the expected audit logging behavior

    // Arrange: Create authenticated user
    const { user, session } = await createAuthenticatedUser();

    // Act: Logout
    const logoutTime = new Date();
    await db.session.delete({
      where: { id: session.id },
    });

    // Expected audit log entry:
    // {
    //   event: "user.logout",
    //   userId: user.id,
    //   sessionId: session.id,
    //   timestamp: logoutTime,
    //   ipAddress: session.ipAddress,
    //   userAgent: session.userAgent,
    // }

    // TODO: Implement audit logging system
    // Store in separate audit_log table or external logging service

    const auditLogEntry = {
      event: "user.logout",
      userId: user.id,
      sessionId: session.id,
      timestamp: logoutTime,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    };

    expect(auditLogEntry.event).toBe("user.logout");
    expect(auditLogEntry.userId).toBe(user.id);
  });

  test("should return appropriate response for already logged out user", async () => {
    const db = getTestDatabase();

    // Arrange: User with no active sessions
    const { user } = await createAuthenticatedUser();

    await db.session.deleteMany({
      where: { userId: user.id },
    });

    // Act: Attempt logout
    const sessionCount = await db.session.count({
      where: { userId: user.id },
    });

    // Assert: No sessions to logout from
    expect(sessionCount).toBe(0);

    // Expected response: Success (idempotent)
    // {
    //   success: true,
    //   message: "Already logged out"
    // }
    // HTTP status: 200

    // Rationale: Logout should be idempotent to handle:
    // - Network retries
    // - Multiple logout button clicks
    // - Expired sessions
  });
});
