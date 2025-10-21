/**
 * Test Setup and Global Configuration
 *
 * This file is preloaded by Bun test (configured in bunfig.toml).
 * Tests run in Docker containers and connect to the dev database.
 *
 * Prerequisites:
 * - Run `docker-compose up -d db backend`
 *
 * Lifecycle:
 * - beforeAll: Connect to database
 * - afterAll: Disconnect
 */

import { afterAll, beforeAll } from "bun:test";
import { PrismaClient } from "@prisma/client";

// Global test state
let prisma: PrismaClient | null = null;

/**
 * Build database URL from environment
 * Uses DATABASE_URL if set, otherwise constructs from components
 */
function getDatabaseUrl(): string {
  // If DATABASE_URL is explicitly set, use it
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Default to Docker environment
  const dbHost = process.env.DB_HOST || "db";
  const dbPort = process.env.DB_PORT || "5432";
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

    // Mask password in logs
    const maskedUrl = databaseUrl.replace(/:[^:]*@/, ":***@");
    console.log(`⚠️ Initializing database connection: ${maskedUrl}`);

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
  const databaseUrl = getDatabaseUrl();
  const maskedUrl = databaseUrl.replace(/:[^:]*@/, ":***@");

  console.log("🔌 Connecting to test database...");
  console.log(`📍 Connection: ${maskedUrl}`);

  // Initialize Prisma client
  prisma = new PrismaClient({
    datasourceUrl: databaseUrl,
  });

  // Verify connection
  try {
    await prisma.$connect();
    console.log("✅ Connected successfully");
  } catch (error) {
    console.error("❌ Failed to connect to test database");
    console.error("   Run: docker-compose up -d db backend");
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
