/**
 * Infrastructure Validation Tests
 *
 * These tests verify that the testing infrastructure is working correctly:
 * - Testcontainers PostgreSQL setup
 * - Prisma client connection
 * - Database migrations
 * - Test helpers and fixtures
 * - API request testing
 *
 * Note: This test imports ./setup which starts a PostgreSQL container.
 * The setup runs once for all tests in this file.
 */

import { describe, it, expect, beforeEach } from "bun:test";

// Import setup to trigger container lifecycle
import "./setup";
import { getTestDatabase } from "./setup";
import { cleanAllTables, getTableCounts } from "./helpers/database";
import { createAuthContext, hashPassword, verifyPassword } from "./helpers/auth";
import { buildUser, createTestUser } from "./fixtures/userBuilder";
import { buildPost, createTextPost } from "./fixtures/postBuilder";
import { buildFeed, createCustomFeed } from "./fixtures/feedBuilder";

describe("Infrastructure: Database Connection", () => {
  it("should connect to test database", async () => {
    const db = getTestDatabase();
    expect(db).toBeDefined();
  });

  it("should execute raw queries", async () => {
    const db = getTestDatabase();
    const result = await db.$queryRaw`SELECT 1 as value`;
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should have migrations applied", async () => {
    const db = getTestDatabase();

    // Verify key tables exist by attempting to query them
    const userCount = await db.user.count();
    const postCount = await db.post.count();
    const feedCount = await db.customFeed.count();

    // These should not throw errors
    expect(typeof userCount).toBe("number");
    expect(typeof postCount).toBe("number");
    expect(typeof feedCount).toBe("number");
  });
});

describe("Infrastructure: Database Helpers", () => {
  beforeEach(async () => {
    await cleanAllTables();
  });

  it("should clean all tables", async () => {
    const db = getTestDatabase();

    // Create some test data
    await createTestUser();
    await createTestUser();

    // Verify data exists
    let userCount = await db.user.count();
    expect(userCount).toBe(2);

    // Clean tables
    await cleanAllTables();

    // Verify data is gone
    userCount = await db.user.count();
    expect(userCount).toBe(0);
  });

  it("should get table counts", async () => {
    // Create some test data
    await createTestUser();
    await createTestUser();

    const counts = await getTableCounts();

    expect(counts).toBeDefined();
    expect(counts.users).toBe(2);
    expect(counts.posts).toBe(0);
    expect(counts.customFeeds).toBe(0);
  });
});

describe("Infrastructure: Auth Helpers", () => {
  beforeEach(async () => {
    await cleanAllTables();
  });

  it("should hash and verify passwords", async () => {
    const password = "TestPassword123!";
    const hash = await hashPassword(password);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword("WrongPassword", hash);
    expect(isInvalid).toBe(false);
  });

  it("should create authenticated user context", async () => {
    const context = await createAuthContext({
      username: "testuser",
      email: "test@example.com",
    });

    expect(context.user).toBeDefined();
    expect(context.user.username).toBe("testuser");
    expect(context.user.email).toBe("test@example.com");
    expect(context.session).toBeDefined();
    expect(context.token).toBeDefined();
  });

  it("should verify session tokens", async () => {
    const context = await createAuthContext();

    const isValid = await context.isValid();
    expect(isValid).toBe(true);

    await context.logout();

    const isInvalidAfterLogout = await context.isValid();
    expect(isInvalidAfterLogout).toBe(false);
  });

  it("should get auth header from context", async () => {
    const context = await createAuthContext();
    const authHeader = context.getAuthHeader();

    expect(authHeader).toBeDefined();
    expect(authHeader).toStartWith("Bearer ");
    expect(authHeader.length).toBeGreaterThan(10);
  });
});

describe("Infrastructure: User Builder", () => {
  beforeEach(async () => {
    await cleanAllTables();
  });

  it("should build user with defaults", async () => {
    const { user } = await buildUser().build();

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.username).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.status).toBe("active");
  });

  it("should build user with custom data", async () => {
    const { user } = await buildUser()
      .username("customuser")
      .email("custom@test.com")
      .emailVerified(true)
      .build();

    expect(user.username).toBe("customuser");
    expect(user.email).toBe("custom@test.com");
    expect(user.emailVerified).toBe(true);
  });

  it("should build user with profile", async () => {
    const { user, profile } = await buildUser()
      .withProfile({
        displayName: "Test User",
        bio: "This is a test bio",
      })
      .build();

    expect(user).toBeDefined();
    expect(profile).toBeDefined();
    expect(profile!.displayName).toBe("Test User");
    expect(profile!.bio).toBe("This is a test bio");
    expect(profile!.userId).toBe(user.id);
  });

  it("should build user with storage quota", async () => {
    const { user, storage } = await buildUser()
      .withStorageQuotaMB(100)
      .build();

    expect(user).toBeDefined();
    expect(storage).toBeDefined();
    expect(storage!.quotaBytes).toBe(BigInt(100 * 1024 * 1024));
    expect(storage!.usedBytes).toBe(BigInt(0));
  });

  it("should build multiple users", async () => {
    const users = await buildUser().buildMany(3);

    expect(users).toBeDefined();
    expect(users.length).toBe(3);

    // Verify all users have unique usernames
    const usernames = users.map(u => u.user.username);
    const uniqueUsernames = new Set(usernames);
    expect(uniqueUsernames.size).toBe(3);
  });
});

describe("Infrastructure: Post Builder", () => {
  beforeEach(async () => {
    await cleanAllTables();
  });

  it("should build text post", async () => {
    const { user } = await buildUser().build();
    const { post } = await buildPost()
      .byUser(user.id)
      .asText()
      .content("Test post content")
      .published()
      .build();

    expect(post).toBeDefined();
    expect(post.type).toBe("text");
    expect(post.content).toBe("Test post content");
    expect(post.status).toBe("published");
    expect(post.userId).toBe(user.id);
  });

  it("should build image post with media", async () => {
    const { user } = await buildUser().build();
    const { post, media } = await buildPost()
      .byUser(user.id)
      .asImage()
      .addImage()
      .published()
      .build();

    expect(post).toBeDefined();
    expect(post.type).toBe("image");
    expect(media).toBeDefined();
    expect(media.length).toBe(1);
    expect(media[0].type).toBe("image");
    expect(media[0].postId).toBe(post.id);
  });

  it("should build gallery post with multiple images", async () => {
    const { user } = await buildUser().build();
    const { post, media } = await buildPost()
      .byUser(user.id)
      .asGallery()
      .addImage()
      .addImage()
      .addImage()
      .published()
      .build();

    expect(post.type).toBe("gallery");
    expect(media.length).toBe(3);

    // Verify display order
    expect(media[0].displayOrder).toBe(0);
    expect(media[1].displayOrder).toBe(1);
    expect(media[2].displayOrder).toBe(2);
  });

  it("should build video post", async () => {
    const { user } = await buildUser().build();
    const { post, media } = await buildPost()
      .byUser(user.id)
      .asVideo()
      .addVideo({ durationSeconds: 120 })
      .published()
      .build();

    expect(post.type).toBe("video");
    expect(media.length).toBe(1);
    expect(media[0].type).toBe("video");
    expect(media[0].durationSeconds).toBe(120);
  });

  it("should build draft post", async () => {
    const { user } = await buildUser().build();
    const { post } = await buildPost()
      .byUser(user.id)
      .asText()
      .draft()
      .build();

    expect(post.status).toBe("draft");
  });

  it("should build post with engagement metrics", async () => {
    const { user } = await buildUser().build();
    const { post } = await buildPost()
      .byUser(user.id)
      .asText()
      .withEngagement({
        likes: 100,
        comments: 50,
        reposts: 25,
        views: 1000,
      })
      .published()
      .build();

    expect(post.likesCount).toBe(100);
    expect(post.commentsCount).toBe(50);
    expect(post.repostsCount).toBe(25);
    expect(post.viewsCount).toBe(1000);
  });
});

describe("Infrastructure: Feed Builder", () => {
  beforeEach(async () => {
    await cleanAllTables();
  });

  it("should build custom feed", async () => {
    const { user } = await buildUser().build();
    const { feed } = await buildFeed()
      .forUser(user.id)
      .name("My Custom Feed")
      .build();

    expect(feed).toBeDefined();
    expect(feed.name).toBe("My Custom Feed");
    expect(feed.userId).toBe(user.id);
  });

  it("should build feed with post type filter", async () => {
    const { user } = await buildUser().build();
    const { feed, filters } = await buildFeed()
      .forUser(user.id)
      .name("Images Only")
      .filterByPostType(["image", "gallery"])
      .build();

    expect(feed).toBeDefined();
    expect(filters.length).toBe(1);
    expect(filters[0].type).toBe("post_type");
    expect(filters[0].feedId).toBe(feed.id);
  });

  it("should build feed with multiple filters", async () => {
    const { user } = await buildUser().build();
    const { feed, filters } = await buildFeed()
      .forUser(user.id)
      .filterByPostType(["image"])
      .filterByEngagement("likes", 100)
      .build();

    expect(filters.length).toBe(2);
    expect(filters[0].type).toBe("post_type");
    expect(filters[1].type).toBe("engagement");
  });

  it("should build feed with hashtag filter", async () => {
    const { user } = await buildUser().build();
    const { feed, filters } = await buildFeed()
      .forUser(user.id)
      .filterByHashtag(["tech", "coding"])
      .build();

    expect(filters.length).toBe(1);
    expect(filters[0].type).toBe("hashtag");
  });

  it("should build default feed", async () => {
    const { user } = await buildUser().build();
    const { feed } = await buildFeed()
      .forUser(user.id)
      .asDefault()
      .build();

    expect(feed.isDefault).toBe(true);
  });
});

describe("Infrastructure: Integration", () => {
  beforeEach(async () => {
    await cleanAllTables();
  });

  it("should create complete user scenario", async () => {
    // Create user with profile and storage
    const { user, profile, storage } = await buildUser()
      .username("maya_music")
      .email("maya@example.com")
      .withProfile({
        displayName: "Maya Music",
        bio: "Music lover and creator",
      })
      .withStorageQuotaMB(50)
      .build();

    // Verify user
    expect(user.username).toBe("maya_music");
    expect(profile).toBeDefined();
    expect(storage).toBeDefined();

    // Create posts
    const { post: textPost } = await createTextPost(user.id, "Hello world!");
    const { post: imagePost, media } = await buildPost()
      .byUser(user.id)
      .asImage()
      .addImage()
      .build();

    expect(textPost.userId).toBe(user.id);
    expect(imagePost.userId).toBe(user.id);
    expect(media.length).toBe(1);

    // Create custom feed
    const { feed } = await createCustomFeed(user.id, "My Images");

    expect(feed.userId).toBe(user.id);

    // Verify counts
    const counts = await getTableCounts();
    expect(counts.users).toBe(1);
    expect(counts.profiles).toBe(1);
    expect(counts.storageQuotas).toBe(1);
    expect(counts.posts).toBe(2);
    expect(counts.postMedia).toBe(1);
    expect(counts.customFeeds).toBe(1);
  });

  it("should handle multiple users with relationships", async () => {
    // Create multiple users
    const users = await buildUser()
      .withProfile()
      .withStorageQuotaMB(50)
      .buildMany(3);

    expect(users.length).toBe(3);

    // Each user creates a post
    for (const { user } of users) {
      await createTextPost(user.id, `Post by ${user.username}`);
    }

    // Verify counts
    const counts = await getTableCounts();
    expect(counts.users).toBe(3);
    expect(counts.posts).toBe(3);
    expect(counts.profiles).toBe(3);
    expect(counts.storageQuotas).toBe(3);
  });
});

describe("Infrastructure: Cleanup", () => {
  it("should clean up after tests", async () => {
    // Create test data
    await createTestUser();
    await createTestUser();

    const db = getTestDatabase();
    let userCount = await db.user.count();
    expect(userCount).toBe(2);

    // Clean up
    await cleanAllTables();

    userCount = await db.user.count();
    expect(userCount).toBe(0);
  });
});
