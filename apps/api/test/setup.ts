/**
 * Test Setup and Global Configuration
 *
 * This file is preloaded by Bun test (configured in bunfig.toml).
 * Tests automatically detect the execution environment and connect accordingly:
 * - Docker: Connects to 'db' or 'db-test' container
 * - CI/CD: Uses GitHub Actions PostgreSQL service
 * - Local: Connects to localhost:6969
 *
 * Prerequisites by Environment:
 * - Docker: Run `docker-compose up -d db`
 * - Local: Run PostgreSQL on port 6969
 * - CI/CD: Automated via GitHub Actions
 *
 * Lifecycle:
 * - beforeAll: Detect environment, connect to database, verify
 * - afterEach: Clean up test data (optional)
 * - afterAll: Disconnect
 */

import { afterAll, beforeAll } from "bun:test";
import { PrismaClient } from "@prisma/client";

// Global test state
let prisma: PrismaClient | null = null;

/**
 * Detect the current execution environment
 * @returns Environment type: 'docker' | 'ci' | 'local'
 */
function detectEnvironment(): "docker" | "ci" | "local" {
  // CI environment (GitHub Actions, GitLab CI, etc.)
  if (process.env.CI === "true") {
    return "ci";
  }

  // Docker environment (explicitly set or DB_HOST points to container)
  if (
    process.env.IS_DOCKER === "true" ||
    process.env.DB_HOST === "db" ||
    process.env.DB_HOST === "db-test"
  ) {
    return "docker";
  }

  // Default to local development
  return "local";
}

/**
 * Build database URL from environment with intelligent defaults
 * Priority: DATABASE_URL > individual vars > auto-detect based on environment
 */
function getDatabaseUrl(): string {
  // If DATABASE_URL is explicitly set, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Detect environment and set appropriate defaults
  const env = detectEnvironment();

  let dbHost: string;
  let dbPort: string;

  switch (env) {
    case "docker":
      dbHost = process.env.DB_HOST || "db";
      dbPort = process.env.DB_PORT || "5432";
      break;
    case "ci":
      dbHost = process.env.DB_HOST || "localhost";
      dbPort = process.env.DB_PORT || "5432";
      break;
    case "local":
    default:
      dbHost = process.env.DB_HOST || "localhost";
      dbPort = process.env.DB_PORT || "6969";
      break;
  }

  const dbName = process.env.DB_NAME || "vrss";
  const dbUser = process.env.DB_USER || "vrss_user";
  const dbPassword = process.env.DB_PASSWORD || "vrss_dev_password";

  return `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;
}

/**
 * Get the Prisma client for testing
 * Automatically detects environment and connects to appropriate database
 */
export function getTestDatabase(): PrismaClient {
  if (!prisma) {
    const databaseUrl = getDatabaseUrl();
    const env = detectEnvironment();

    // Mask password in logs
    const maskedUrl = databaseUrl.replace(/:[^:]*@/, ":***@");
    console.log(`⚠️ Initializing database connection (${env}): ${maskedUrl}`);

    prisma = new PrismaClient({
      datasourceUrl: databaseUrl,
    });
  }
  return prisma;
}

/**
 * Connect to database and verify
 * This runs once before all tests
 */
beforeAll(async () => {
  const env = detectEnvironment();
  const databaseUrl = getDatabaseUrl();
  const maskedUrl = databaseUrl.replace(/:[^:]*@/, ":***@");

  console.log(`🔌 Connecting to test database (${env} environment)...`);
  console.log(`📍 Connection: ${maskedUrl}`);

  // Initialize Prisma client
  prisma = new PrismaClient({
    datasourceUrl: databaseUrl,
  });

  // Verify connection
  try {
    await prisma.$connect();
    console.log(`✅ Connected successfully`);
  } catch (error) {
    console.error("❌ Failed to connect to test database");

    // Provide environment-specific troubleshooting
    switch (env) {
      case "docker":
        console.error("   Docker: Run 'docker-compose up -d db'");
        break;
      case "local":
        console.error("   Local: Ensure PostgreSQL is running on port 6969");
        console.error("   Or set DB_PORT environment variable");
        break;
      case "ci":
        console.error("   CI: Check GitHub Actions PostgreSQL service configuration");
        break;
    }

    throw error;
  }
}, 30000); // 30 second timeout

/**
 * Disconnect from database
 * This runs once after all tests
 */
afterAll(async () => {
  console.log("🧹 Disconnecting from database...");

  if (prisma) {
    await prisma.$disconnect();
    console.log("✅ Disconnected");
  }
});

/**
 * Get the test database URL
 * This is used by some tests to verify configuration
 */
export function getTestDatabaseUrl(): string {
  return getDatabaseUrl();
}

/**
 * Test helper to clean all tables manually
 * Use this in tests when you need a fresh database state
 */
export async function cleanDatabase(): Promise<void> {
  const db = getTestDatabase();

  // Delete in reverse order to respect foreign key constraints
  try {
    await db.verificationToken.deleteMany();
    await db.session.deleteMany();
    await db.postMedia.deleteMany();
    await db.post.deleteMany();
    await db.feedFilter.deleteMany();
    await db.customFeed.deleteMany();
    await db.storageUsage.deleteMany();
    await db.userProfile.deleteMany();
    await db.user.deleteMany();
  } catch (error) {
    console.warn("Warning during database cleanup:", error);
  }
}

/**
 * Test helper to reset database to initial state
 * This is more aggressive than cleanDatabase - use sparingly
 */
export async function resetDatabase(): Promise<void> {
  await cleanDatabase();

  // Reset sequences (PostgreSQL specific)
  const db = getTestDatabase();
  await db.$executeRawUnsafe(`
    SELECT setval(pg_get_serial_sequence('"User"', 'id'), 1, false);
  `);
}
