/**
 * Test Setup and Global Configuration
 *
 * This file is preloaded by Bun test (configured in bunfig.toml).
 * It manages the Testcontainers PostgreSQL lifecycle for all tests.
 *
 * Lifecycle:
 * - beforeAll: Start PostgreSQL container and run migrations
 * - afterEach: Clean up test data (optional)
 * - afterAll: Stop container and cleanup
 */

import { beforeAll, afterAll, afterEach } from "bun:test";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";

// Global test state
let container: StartedPostgreSqlContainer | null = null;
let prisma: PrismaClient | null = null;

/**
 * Get the Prisma client for testing
 * This is initialized after the container starts
 */
export function getTestDatabase(): PrismaClient {
  if (!prisma) {
    throw new Error("Test database not initialized. Make sure tests run after setup.");
  }
  return prisma;
}

/**
 * Get the database connection URL
 */
export function getTestDatabaseUrl(): string {
  if (!container) {
    throw new Error("Test container not started.");
  }
  return container.getConnectionUri();
}

/**
 * Start PostgreSQL container and run migrations
 * This runs once before all tests
 */
beforeAll(async () => {
  console.log("🐳 Starting PostgreSQL test container...");

  // Start PostgreSQL 16 container
  container = await new PostgreSqlContainer("postgres:16-alpine")
    .withExposedPorts(5432)
    .withStartupTimeout(120000) // 2 minutes timeout
    .start();

  const connectionUri = container.getConnectionUri();
  console.log("✅ PostgreSQL container started");

  // Set DATABASE_URL for Prisma
  process.env.DATABASE_URL = connectionUri;

  // Initialize Prisma client
  prisma = new PrismaClient({
    datasourceUrl: connectionUri,
  });

  // Run Prisma migrations
  console.log("🔄 Running Prisma migrations...");
  try {
    execSync("bunx prisma migrate deploy", {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: connectionUri },
      stdio: "pipe",
    });
    console.log("✅ Migrations completed");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  }

  // Verify connection
  await prisma.$connect();
  console.log("✅ Database connection verified");
}, 180000); // 3 minutes timeout for setup

/**
 * Clean up test data after each test (optional)
 * Comment out if you want to keep data between tests
 */
afterEach(async () => {
  if (!prisma) return;

  // Optionally clean up data after each test
  // Uncomment the sections below if you want automatic cleanup

  /*
  console.log("🧹 Cleaning up test data...");

  // Delete in reverse order to respect foreign key constraints
  await prisma.sessionActivity.deleteMany();
  await prisma.session.deleteMany();
  await prisma.postMedia.deleteMany();
  await prisma.post.deleteMany();
  await prisma.customFeedRule.deleteMany();
  await prisma.customFeed.deleteMany();
  await prisma.storageQuota.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Test data cleaned");
  */
});

/**
 * Stop container and disconnect
 * This runs once after all tests
 */
afterAll(async () => {
  console.log("🧹 Cleaning up test environment...");

  if (prisma) {
    await prisma.$disconnect();
    console.log("✅ Prisma disconnected");
  }

  if (container) {
    await container.stop();
    console.log("✅ PostgreSQL container stopped");
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
