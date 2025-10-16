/**
 * Authentication Test Helpers
 *
 * Utilities for creating authenticated test contexts, generating tokens,
 * and managing test sessions.
 */

import { User, Session } from "@prisma/client";
import { getTestDatabase } from "../setup";

/**
 * Hash a password using Bun's built-in bcrypt
 * Matches production password hashing
 */
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10, // Lower cost for faster tests
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

/**
 * Create a test user with a session
 * Returns both the user and an active session
 *
 * @param overrides Optional user properties to override defaults
 * @returns Object containing user, session, and token
 */
export async function createAuthenticatedUser(overrides?: Partial<{
  username: string;
  email: string;
  password: string;
  emailVerified: boolean;
  status: "active" | "suspended" | "deleted";
}>): Promise<{
  user: User;
  session: Session;
  token: string;
}> {
  const db = getTestDatabase();

  // Default values
  const username = overrides?.username ?? `testuser_${Date.now()}`;
  const email = overrides?.email ?? `${username}@test.com`;
  const password = overrides?.password ?? "TestPassword123!";
  const passwordHash = await hashPassword(password);

  // Create user
  const user = await db.user.create({
    data: {
      username,
      email,
      emailVerified: overrides?.emailVerified ?? true,
      passwordHash,
      status: overrides?.status ?? "active",
    },
  });

  // Create session
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const session = await db.session.create({
    data: {
      userId: user.id,
      token,
      expiresAt,
      userAgent: "Test User Agent",
      ipAddress: "127.0.0.1",
      lastActivityAt: new Date(),
    },
  });

  return { user, session, token };
}

/**
 * Create a test session for an existing user
 *
 * @param userId The user ID to create a session for
 * @param overrides Optional session properties
 * @returns Session and token
 */
export async function createSession(
  userId: bigint,
  overrides?: Partial<{
    expiresAt: Date;
    userAgent: string;
    ipAddress: string;
  }>
): Promise<{ session: Session; token: string }> {
  const db = getTestDatabase();

  const token = generateSessionToken();
  const expiresAt = overrides?.expiresAt ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const session = await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
      userAgent: overrides?.userAgent ?? "Test User Agent",
      ipAddress: overrides?.ipAddress ?? "127.0.0.1",
      lastActivityAt: new Date(),
    },
  });

  return { session, token };
}

/**
 * Generate a random session token
 * Uses cryptographically secure random bytes
 */
export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Verify a session token is valid
 *
 * @param token The session token to verify
 * @returns The session if valid, null otherwise
 */
export async function verifySessionToken(token: string): Promise<Session | null> {
  const db = getTestDatabase();

  const session = await db.session.findFirst({
    where: {
      token,
      expiresAt: {
        gt: new Date(),
      },
    },
  });

  return session;
}

/**
 * Invalidate a session (logout)
 *
 * @param token The session token to invalidate
 */
export async function invalidateSession(token: string): Promise<void> {
  const db = getTestDatabase();

  await db.session.deleteMany({
    where: { token },
  });
}

/**
 * Create multiple authenticated users for testing
 *
 * @param count Number of users to create
 * @param baseUsername Base username (will be suffixed with index)
 * @returns Array of user/session/token objects
 */
export async function createMultipleUsers(
  count: number,
  baseUsername: string = "testuser"
): Promise<Array<{
  user: User;
  session: Session;
  token: string;
}>> {
  const users = [];

  for (let i = 0; i < count; i++) {
    const user = await createAuthenticatedUser({
      username: `${baseUsername}_${i}_${Date.now()}`,
      email: `${baseUsername}_${i}_${Date.now()}@test.com`,
    });
    users.push(user);
  }

  return users;
}

/**
 * Get an expired session token (for testing expired session handling)
 */
export async function createExpiredSession(userId: bigint): Promise<{ session: Session; token: string }> {
  const db = getTestDatabase();

  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() - 1000); // Expired 1 second ago

  const session = await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
      userAgent: "Test User Agent",
      ipAddress: "127.0.0.1",
      lastActivityAt: new Date(Date.now() - 2000),
    },
  });

  return { session, token };
}

/**
 * Create a suspended user (for testing access control)
 */
export async function createSuspendedUser(): Promise<{
  user: User;
  session: Session;
  token: string;
}> {
  return await createAuthenticatedUser({
    status: "suspended",
  });
}

/**
 * Record session activity (for testing session tracking)
 */
export async function recordSessionActivity(
  sessionId: bigint,
  overrides?: Partial<{
    endpoint: string;
    method: string;
    statusCode: number;
    responseTime: number;
  }>
): Promise<void> {
  const db = getTestDatabase();

  await db.sessionActivity.create({
    data: {
      sessionId,
      endpoint: overrides?.endpoint ?? "/api/test",
      method: overrides?.method ?? "GET",
      statusCode: overrides?.statusCode ?? 200,
      responseTime: overrides?.responseTime ?? 50,
    },
  });
}

/**
 * Authentication context for tests
 * Contains user, session, and convenience methods
 */
export class TestAuthContext {
  constructor(
    public user: User,
    public session: Session,
    public token: string
  ) {}

  /**
   * Get authorization header value
   */
  getAuthHeader(): string {
    return `Bearer ${this.token}`;
  }

  /**
   * Check if session is still valid
   */
  async isValid(): Promise<boolean> {
    const session = await verifySessionToken(this.token);
    return session !== null;
  }

  /**
   * Logout (invalidate session)
   */
  async logout(): Promise<void> {
    await invalidateSession(this.token);
  }

  /**
   * Record activity for this session
   */
  async recordActivity(endpoint: string, method: string, statusCode: number): Promise<void> {
    await recordSessionActivity(this.session.id, { endpoint, method, statusCode });
  }
}

/**
 * Create a test authentication context
 * Convenience wrapper around createAuthenticatedUser
 */
export async function createAuthContext(
  overrides?: Parameters<typeof createAuthenticatedUser>[0]
): Promise<TestAuthContext> {
  const { user, session, token } = await createAuthenticatedUser(overrides);
  return new TestAuthContext(user, session, token);
}
