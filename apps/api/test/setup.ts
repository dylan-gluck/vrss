/**
 * Test Setup and Global Configuration
 *
 * This file is preloaded by Bun test (configured in bunfig.toml).
 * Tests use the dev database (from docker-compose) instead of spinning up containers.
 *
 * Prerequisites:
 * - Run `docker compose up -d db` before running tests
 * - Database should be at localhost:5432 (vrss database)
 *
 * Lifecycle:
 * - beforeAll: Connect to dev database and verify
 * - afterEach: Clean up test data (optional)
 * - afterAll: Disconnect
 */

import { beforeAll, afterAll } from "bun:test";
import { PrismaClient } from "@prisma/client";

// Global test state
let prisma: PrismaClient | null = null;

/**
 * Get the Prisma client for testing
 * This connects to the dev database using DB_PORT from environment
 */
export function getTestDatabase(): PrismaClient {
  if (!prisma) {
    // Initialize lazily if not done in beforeAll
    console.log("⚠️ Initializing database connection...");

    // Build DATABASE_URL from environment variables
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || '6969';
    const dbName = process.env.DB_NAME || 'vrss';
    const dbUser = process.env.DB_USER || 'vrss_user';
    const dbPassword = process.env.DB_PASSWORD || 'vrss_dev_password';
    const databaseUrl = process.env.DATABASE_URL || `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;

    prisma = new PrismaClient({
      datasourceUrl: databaseUrl,
    });
  }
  return prisma;
}

/**
 * Connect to dev database and verify
 * This runs once before all tests
 */
beforeAll(async () => {
  console.log("🔌 Connecting to dev database...");

  // Build DATABASE_URL from environment variables
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '6969';
  const dbName = process.env.DB_NAME || 'vrss';
  const dbUser = process.env.DB_USER || 'vrss_user';
  const dbPassword = process.env.DB_PASSWORD || 'vrss_dev_password';
  const databaseUrl = process.env.DATABASE_URL || `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;

  // Initialize Prisma client for dev database
  prisma = new PrismaClient({
    datasourceUrl: databaseUrl,
  });

  // Verify connection
  try {
    await prisma.$connect();
    console.log(`✅ Connected to dev database at ${dbHost}:${dbPort}`);
  } catch (error) {
    console.error("❌ Failed to connect to dev database. Make sure docker-compose is running!");
    console.error("   Run: docker compose up -d db");
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
