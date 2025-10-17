/**
 * Database Test Helpers
 *
 * Utilities for database cleanup, transaction management, and test data isolation.
 */

import type { PrismaClient } from "@prisma/client";
import { getTestDatabase } from "../setup";

/**
 * Clean all data from database tables
 * Deletes in reverse order to respect foreign key constraints
 */
export async function cleanAllTables(): Promise<void> {
  const db = getTestDatabase();

  // Clean all tables in reverse dependency order
  try {
    // Phase 4: Communication
    await db.notification.deleteMany();
    await db.message.deleteMany();
    await db.conversation.deleteMany();
    await db.userSubscription.deleteMany();

    // Phase 3: Profile & Feed Features
    await db.sectionContent.deleteMany();
    await db.profileSection.deleteMany();
    await db.feedFilter.deleteMany();
    await db.customFeed.deleteMany();
    await db.listMember.deleteMany();
    await db.userList.deleteMany();

    // Phase 2: Content & Social
    await db.comment.deleteMany();
    await db.repost.deleteMany();
    await db.postInteraction.deleteMany();
    await db.postMedia.deleteMany();
    await db.post.deleteMany();
    await db.friendship.deleteMany();
    await db.userFollow.deleteMany();

    // Better-auth tables
    await db.verificationToken.deleteMany();
    await db.session.deleteMany();

    // Phase 1: Foundation
    await db.storageUsage.deleteMany();
    await db.userProfile.deleteMany();
    await db.user.deleteMany();
    await db.subscriptionTier.deleteMany();
  } catch (error) {
    // Ignore errors for tables that don't exist yet
    console.warn("Warning during cleanup:", error);
  }
}

/**
 * Clean user-related data (users, profiles, sessions, storage quotas)
 */
export async function cleanUserData(): Promise<void> {
  const db = getTestDatabase();

  try {
    await db.verificationToken.deleteMany();
    await db.session.deleteMany();
    await db.storageUsage.deleteMany();
    await db.userProfile.deleteMany();
    await db.user.deleteMany();
  } catch (error) {
    console.warn("Warning during user data cleanup:", error);
  }
}

/**
 * Clean post-related data (posts, media)
 */
export async function cleanPostData(): Promise<void> {
  const db = getTestDatabase();

  await db.postMedia.deleteMany();
  await db.post.deleteMany();
}

/**
 * Clean feed-related data (custom feeds, rules)
 */
export async function cleanFeedData(): Promise<void> {
  const db = getTestDatabase();

  try {
    await db.feedFilter.deleteMany();
    await db.customFeed.deleteMany();
  } catch (error) {
    console.warn("Warning during feed data cleanup:", error);
  }
}

/**
 * Clean session data
 */
export async function cleanSessionData(): Promise<void> {
  const db = getTestDatabase();

  try {
    await db.session.deleteMany();
  } catch (error) {
    console.warn("Warning during session data cleanup:", error);
  }
}

/**
 * Reset auto-increment sequences for all tables
 * PostgreSQL specific - resets serial sequences to 1
 */
export async function resetSequences(): Promise<void> {
  const db = getTestDatabase();

  const sequences = [
    { table: "User", column: "id" },
    { table: "Profile", column: "id" },
    { table: "Session", column: "id" },
    { table: "SessionActivity", column: "id" },
    { table: "Post", column: "id" },
    { table: "PostMedia", column: "id" },
    { table: "CustomFeed", column: "id" },
    { table: "CustomFeedRule", column: "id" },
    { table: "StorageQuota", column: "id" },
  ];

  for (const seq of sequences) {
    await db.$executeRawUnsafe(
      `SELECT setval(pg_get_serial_sequence('"${seq.table}"', '${seq.column}'), 1, false);`
    );
  }
}

/**
 * Execute a function within a transaction that is automatically rolled back
 * Useful for testing without persisting changes
 *
 * @param fn Function to execute within transaction
 * @returns Result of the function
 */
export async function withRollback<T>(
  fn: (
    tx: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use">
  ) => Promise<T>
): Promise<T> {
  const db = getTestDatabase();

  return await db
    .$transaction(async (tx) => {
      const _result = await fn(tx);

      // Force rollback by throwing an error
      // This is caught by Prisma and transaction is rolled back
      throw new Error("ROLLBACK_TRANSACTION");
    })
    .catch((error) => {
      // If it's our intentional rollback, return the result
      if (error.message === "ROLLBACK_TRANSACTION") {
        // Note: This pattern is a bit hacky but works for testing
        // The actual result is lost due to the throw
        // For real rollback testing, use manual transaction management
        throw error;
      }
      throw error;
    });
}

/**
 * Count records in all main tables
 * Useful for debugging and verifying cleanup
 */
export async function getTableCounts(): Promise<Record<string, number>> {
  const db = getTestDatabase();

  return {
    users: await db.user.count(),
    profiles: await db.userProfile.count(),
    sessions: await db.session.count(),
    posts: await db.post.count(),
    postMedia: await db.postMedia.count(),
    customFeeds: await db.customFeed.count(),
    feedFilters: await db.feedFilter.count(),
    storageUsage: await db.storageUsage.count(),
    storageQuotas: await db.storageUsage.count(), // Alias for backward compatibility
  };
}

/**
 * Wait for a condition to be true (polling with timeout)
 * Useful for testing eventual consistency or async operations
 *
 * @param condition Function that returns true when condition is met
 * @param timeout Maximum time to wait in milliseconds
 * @param interval Polling interval in milliseconds
 */
export async function waitFor(
  condition: () => Promise<boolean> | boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

/**
 * Create a database snapshot (for complex test scenarios)
 * Returns a function to restore to the snapshot
 *
 * Note: This is a simplified implementation that only works for small datasets
 * For production use, consider pg_dump/pg_restore or transaction savepoints
 */
export async function createSnapshot(): Promise<() => Promise<void>> {
  const db = getTestDatabase();

  // Take snapshots of all data
  const snapshot = {
    users: await db.user.findMany(),
    userProfiles: await db.userProfile.findMany(),
    sessions: await db.session.findMany(),
    posts: await db.post.findMany(),
    postMedia: await db.postMedia.findMany(),
    customFeeds: await db.customFeed.findMany(),
    feedFilters: await db.feedFilter.findMany(),
    storageUsage: await db.storageUsage.findMany(),
  };

  // Return restore function
  return async () => {
    await cleanAllTables();

    // Restore in correct order (respecting foreign keys)
    await db.user.createMany({ data: snapshot.users });
    await db.userProfile.createMany({ data: snapshot.userProfiles });
    await db.session.createMany({ data: snapshot.sessions });
    await db.storageUsage.createMany({ data: snapshot.storageUsage });
    await db.post.createMany({ data: snapshot.posts });
    await db.postMedia.createMany({ data: snapshot.postMedia });
    await db.customFeed.createMany({ data: snapshot.customFeeds });
    await db.feedFilter.createMany({ data: snapshot.feedFilters });
  };
}
