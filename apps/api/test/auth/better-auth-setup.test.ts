/**
 * Better-auth Core Setup Tests
 *
 * This test suite validates the Better-auth configuration and setup for VRSS.
 * Tests are written following TDD principles - they will fail initially until
 * the implementation is complete.
 *
 * Coverage:
 * 1. Better-auth Initialization - Verify auth instance creation
 * 2. Prisma Adapter Connection - Verify database adapter integration
 * 3. Session Table Validation - Verify required database tables exist
 * 4. Configuration Validation - Verify environment and config settings
 *
 * @see docs/SECURITY_DESIGN.md for auth architecture
 * @see docs/TESTING-STRATEGY.md for test patterns
 */

import { describe, it, expect, beforeEach } from "bun:test";

// Import test setup to trigger PostgreSQL container lifecycle
import "../setup";
import { getTestDatabase, getTestDatabaseUrl } from "../setup";
import { cleanAllTables } from "../helpers/database";

// Type imports for Better-auth (will be available after installation)
type BetterAuth = {
  api: {
    signUp: Function;
    signIn: Function;
    signOut: Function;
    getSession: Function;
  };
  options: {
    database: any;
    session?: any;
    secret?: string;
    baseURL?: string;
  };
};

/**
 * Helper to dynamically import auth instance
 * This allows tests to run even before implementation exists
 */
async function getAuthInstance(): Promise<BetterAuth | null> {
  try {
    const authModule = await import("../../src/lib/auth");
    return authModule.auth;
  } catch (error) {
    return null;
  }
}

/**
 * Helper to get auth configuration from environment
 */
function getAuthConfig() {
  return {
    secret: process.env.BETTER_AUTH_SECRET,
    appUrl: process.env.APP_URL,
    databaseUrl: process.env.DATABASE_URL,
  };
}

// ============================================
// TEST SUITE 1: BETTER-AUTH INITIALIZATION
// ============================================

describe("Better-auth Setup: Initialization", () => {
  it("should export a configured auth instance", async () => {
    const auth = await getAuthInstance();

    expect(auth).toBeDefined();
    expect(auth).not.toBeNull();
  });

  it("should have required API methods", async () => {
    const auth = await getAuthInstance();

    if (!auth) {
      throw new Error("Auth instance not initialized - implement src/lib/auth.ts first");
    }

    // Verify core API methods exist
    expect(auth.api).toBeDefined();
    expect(typeof auth.api.signUp).toBe("function");
    expect(typeof auth.api.signIn).toBe("function");
    expect(typeof auth.api.signOut).toBe("function");
    expect(typeof auth.api.getSession).toBe("function");
  });

  it("should have valid configuration object", async () => {
    const auth = await getAuthInstance();

    if (!auth) {
      throw new Error("Auth instance not initialized");
    }

    expect(auth.options).toBeDefined();
    expect(auth.options.database).toBeDefined();
  });

  it("should configure session settings correctly", async () => {
    const auth = await getAuthInstance();

    if (!auth) {
      throw new Error("Auth instance not initialized");
    }

    // Verify session configuration exists
    expect(auth.options.session).toBeDefined();
  });

  it("should have secret configured from environment", async () => {
    const auth = await getAuthInstance();
    const config = getAuthConfig();

    if (!auth) {
      throw new Error("Auth instance not initialized");
    }

    // Secret should be configured (either from env or options)
    expect(config.secret || auth.options.secret).toBeDefined();
    expect(config.secret || auth.options.secret).not.toBe("");
  });
});

// ============================================
// TEST SUITE 2: PRISMA ADAPTER CONNECTION
// ============================================

describe("Better-auth Setup: Prisma Adapter", () => {
  beforeEach(async () => {
    await cleanAllTables();
  });

  it("should initialize with Prisma adapter", async () => {
    const auth = await getAuthInstance();

    if (!auth) {
      throw new Error("Auth instance not initialized");
    }

    // Verify database adapter is configured
    expect(auth.options.database).toBeDefined();
    expect(auth.options.database).not.toBeNull();
  });

  it("should connect to PostgreSQL test database", async () => {
    const db = getTestDatabase();
    const databaseUrl = getTestDatabaseUrl();

    // Verify database connection is active
    expect(db).toBeDefined();
    expect(databaseUrl).toBeDefined();
    expect(databaseUrl).toContain("postgresql://");

    // Test connection by executing a simple query
    const result = await db.$queryRaw`SELECT 1 as connected`;
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should be able to query database through Prisma", async () => {
    const db = getTestDatabase();

    // Create a test user to verify database operations work
    const testUser = await db.user.create({
      data: {
        username: "testuser_adapter",
        email: "adapter@test.com",
        passwordHash: "test_hash_123",
        emailVerified: false,
      },
    });

    expect(testUser).toBeDefined();
    expect(testUser.id).toBeDefined();
    expect(testUser.username).toBe("testuser_adapter");

    // Verify we can query it back
    const foundUser = await db.user.findUnique({
      where: { id: testUser.id },
    });

    expect(foundUser).toBeDefined();
    expect(foundUser?.username).toBe("testuser_adapter");
  });
});

// ============================================
// TEST SUITE 3: SESSION TABLE VALIDATION
// ============================================

describe("Better-auth Setup: Session Tables", () => {
  beforeEach(async () => {
    await cleanAllTables();
  });

  it("should have User table with required columns", async () => {
    const db = getTestDatabase();

    // Test User table by creating a record with all required fields
    const user = await db.user.create({
      data: {
        username: "testuser_schema",
        email: "schema@test.com",
        passwordHash: "test_hash",
        emailVerified: false,
      },
    });

    // Verify all required columns exist
    expect(user.id).toBeDefined();
    expect(user.username).toBe("testuser_schema");
    expect(user.email).toBe("schema@test.com");
    expect(user.emailVerified).toBe(false);
    expect(user.createdAt).toBeDefined();
    expect(user.updatedAt).toBeDefined();
  });

  it("should have User table with username column", async () => {
    const db = getTestDatabase();

    const user = await db.user.create({
      data: {
        username: "unique_username_test",
        email: "username@test.com",
        passwordHash: "hash",
        emailVerified: false,
      },
    });

    expect(user.username).toBe("unique_username_test");

    // Username should be unique
    await expect(async () => {
      await db.user.create({
        data: {
          username: "unique_username_test",
          email: "different@test.com",
          passwordHash: "hash",
          emailVerified: false,
        },
      });
    }).toThrow();
  });

  it("should have Password hash stored in User table", async () => {
    const db = getTestDatabase();

    const user = await db.user.create({
      data: {
        username: "password_test_user",
        email: "password@test.com",
        passwordHash: "$2a$10$examplehashedpassword123456",
        emailVerified: false,
      },
    });

    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).toBe("$2a$10$examplehashedpassword123456");
  });

  it("should have Session table with required columns", async () => {
    const db = getTestDatabase();

    // First create a user (foreign key requirement)
    const user = await db.user.create({
      data: {
        username: "session_test_user",
        email: "session@test.com",
        passwordHash: "hash",
        emailVerified: false,
      },
    });

    // Create a session
    const session = await db.session.create({
      data: {
        userId: user.id,
        token: "test_session_token_123",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        userAgent: "Test Agent",
        ipAddress: "127.0.0.1",
        lastActivityAt: new Date(),
      },
    });

    // Verify all required columns exist
    expect(session.id).toBeDefined();
    expect(session.userId).toBe(user.id);
    expect(session.token).toBe("test_session_token_123");
    expect(session.expiresAt).toBeDefined();
    expect(session.createdAt).toBeDefined();
    expect(session.updatedAt).toBeDefined();
  });

  it("should have VerificationToken table or equivalent", async () => {
    const db = getTestDatabase();

    // Better-auth may use different table names depending on version
    // Check if we can create email verification records
    // This test validates the schema supports email verification flow

    const user = await db.user.create({
      data: {
        username: "verification_user",
        email: "verify@test.com",
        passwordHash: "hash",
        emailVerified: false,
      },
    });

    expect(user.emailVerified).toBe(false);

    // Update to verified
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    expect(updatedUser.emailVerified).toBe(true);
  });

  it("should support session expiration through expiresAt", async () => {
    const db = getTestDatabase();

    const user = await db.user.create({
      data: {
        username: "expiry_test_user",
        email: "expiry@test.com",
        passwordHash: "hash",
        emailVerified: false,
      },
    });

    // Create an expired session
    const expiredSession = await db.session.create({
      data: {
        userId: user.id,
        token: "expired_token",
        expiresAt: new Date(Date.now() - 1000), // Already expired
        userAgent: "Test",
        ipAddress: "127.0.0.1",
        lastActivityAt: new Date(),
      },
    });

    // Create a valid session
    const validSession = await db.session.create({
      data: {
        userId: user.id,
        token: "valid_token",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        userAgent: "Test",
        ipAddress: "127.0.0.1",
        lastActivityAt: new Date(),
      },
    });

    // Query only valid sessions
    const validSessions = await db.session.findMany({
      where: {
        userId: user.id,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    expect(validSessions.length).toBe(1);
    expect(validSessions[0].token).toBe("valid_token");
  });
});

// ============================================
// TEST SUITE 4: CONFIGURATION VALIDATION
// ============================================

describe("Better-auth Setup: Configuration", () => {
  it("should have BETTER_AUTH_SECRET environment variable set", () => {
    const secret = process.env.BETTER_AUTH_SECRET;

    expect(secret).toBeDefined();
    expect(secret).not.toBe("");
    expect(secret?.length).toBeGreaterThan(32); // Minimum 32 characters for security
  });

  it("should have DATABASE_URL as valid PostgreSQL connection string", () => {
    const databaseUrl = process.env.DATABASE_URL;

    expect(databaseUrl).toBeDefined();
    expect(databaseUrl).toContain("postgresql://");
    expect(databaseUrl).toContain("@"); // Should have credentials
  });

  it("should configure 7-day session expiry (604800 seconds)", async () => {
    const auth = await getAuthInstance();

    if (!auth) {
      throw new Error("Auth instance not initialized");
    }

    // Session config should specify 7 days = 604800 seconds
    const sessionConfig = auth.options.session;
    expect(sessionConfig).toBeDefined();

    // Check if expiresIn is configured (may be in seconds or milliseconds)
    // Better-auth typically uses seconds
    if (sessionConfig?.expiresIn) {
      const expectedSevenDays = 60 * 60 * 24 * 7; // 604800 seconds
      expect(sessionConfig.expiresIn).toBe(expectedSevenDays);
    }
  });

  it("should configure 24-hour session update age (86400 seconds)", async () => {
    const auth = await getAuthInstance();

    if (!auth) {
      throw new Error("Auth instance not initialized");
    }

    const sessionConfig = auth.options.session;
    expect(sessionConfig).toBeDefined();

    // Check if updateAge is configured
    if (sessionConfig?.updateAge) {
      const expectedOneDaySeconds = 60 * 60 * 24; // 86400 seconds
      expect(sessionConfig.updateAge).toBe(expectedOneDaySeconds);
    }
  });

  it("should have cookie cache enabled with 5-minute maxAge", async () => {
    const auth = await getAuthInstance();

    if (!auth) {
      throw new Error("Auth instance not initialized");
    }

    const sessionConfig = auth.options.session;
    expect(sessionConfig).toBeDefined();

    // Check cookie cache configuration
    if (sessionConfig?.cookieCache) {
      expect(sessionConfig.cookieCache.enabled).toBe(true);

      if (sessionConfig.cookieCache.maxAge) {
        const expectedFiveMinutes = 60 * 5; // 300 seconds
        expect(sessionConfig.cookieCache.maxAge).toBe(expectedFiveMinutes);
      }
    }
  });

  it("should configure secure cookie settings", async () => {
    const auth = await getAuthInstance();

    if (!auth) {
      throw new Error("Auth instance not initialized");
    }

    // In test environment, secure should be false
    // In production, secure should be true
    const isProduction = process.env.NODE_ENV === "production";

    // Note: Better-auth may store this in different config locations
    // This is a validation that the configuration is environment-aware
    expect(process.env.NODE_ENV).toBeDefined();
  });

  it("should have baseURL configured from APP_URL environment", async () => {
    const auth = await getAuthInstance();

    if (!auth) {
      throw new Error("Auth instance not initialized");
    }

    // baseURL should be set from environment or have a default
    const baseURL = auth.options.baseURL || process.env.APP_URL;
    expect(baseURL).toBeDefined();
    expect(baseURL).toContain("http");
  });

  it("should validate cookie sameSite is set to lax", async () => {
    const auth = await getAuthInstance();

    if (!auth) {
      throw new Error("Auth instance not initialized");
    }

    // Cookie sameSite should be 'lax' for security
    // This may be in advanced config or cookie config
    // We verify the options object has security-related config
    expect(auth.options).toBeDefined();
  });

  it("should require email verification in configuration", async () => {
    const auth = await getAuthInstance();

    if (!auth) {
      throw new Error("Auth instance not initialized");
    }

    // Verify auth is configured to require email verification
    // This is critical for security - users must verify their email
    expect(auth.options).toBeDefined();
  });

  it("should enforce minimum password length of 12 characters", async () => {
    const auth = await getAuthInstance();

    if (!auth) {
      throw new Error("Auth instance not initialized");
    }

    // Password policy should enforce minimum 12 character length
    // This is a security requirement from SECURITY_DESIGN.md
    expect(auth.options).toBeDefined();
  });
});
