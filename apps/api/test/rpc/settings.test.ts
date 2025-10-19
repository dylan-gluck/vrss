/**
 * Settings Router Tests - Phase 3.7
 *
 * Comprehensive test suite for the Settings Router covering all 5 procedures:
 * - settings.getAccountSettings: Get current account settings
 * - settings.updateAccount: Update username/email/password with validation
 * - settings.updatePrivacy: Update profile visibility and message permissions
 * - settings.deleteAccount: Soft delete account
 * - settings.exportData: Generate GDPR-compliant data export
 *
 * CRITICAL TESTS:
 * - Username/email uniqueness validation
 * - Password verification for sensitive changes
 * - Soft deletion (deleted_at timestamp + status change)
 * - Complete GDPR data export
 * - Privacy settings persistence
 *
 * @see docs/tasks/task-3.7.md Phase 3.7
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ErrorCode } from "@vrss/api-contracts";
import { settingsRouter } from "../../src/rpc/routers/settings";
import type { ProcedureContext } from "../../src/rpc/types";
import { buildUser } from "../fixtures/userBuilder";
import { cleanAllTables } from "../helpers/database";
import { getTestDatabase } from "../setup";

// Test utilities
function createMockContext<T>(overrides?: Partial<ProcedureContext<T>>): ProcedureContext<T> {
  return {
    c: {} as any,
    user: null,
    session: null,
    ip: "127.0.0.1",
    userAgent: "Test User Agent",
    input: {} as T,
    ...overrides,
  };
}

// =============================================================================
// SETUP & TEARDOWN
// =============================================================================

describe("Settings Router", () => {
  const db = getTestDatabase();

  beforeEach(async () => {
    await cleanAllTables();
  });

  afterEach(async () => {
    await cleanAllTables();
  });

  // ===========================================================================
  // settings.getAccountSettings Tests
  // ===========================================================================

  describe("settings.getAccountSettings", () => {
    it("should return current account settings for authenticated user", async () => {
      // Arrange: Create user
      const { user } = await buildUser().username("testuser").emailVerified(true).build();

      const ctx = createMockContext<Record<string, never>>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      // Act: Get account settings
      const result = await settingsRouter["settings.getAccountSettings"](ctx);

      // Assert: Returns correct settings
      expect(result.settings.username).toBe("testuser");
      expect(result.settings.email).toBe(user.email);
      expect(result.settings.emailVerified).toBe(true);
      expect(result.settings.createdAt).toBeInstanceOf(Date);
    });

    it("should throw UNAUTHORIZED when user is not authenticated", async () => {
      // Arrange: No user context
      const ctx = createMockContext<Record<string, never>>({
        user: null,
        input: {},
      });

      // Act & Assert: Should throw unauthorized error
      try {
        await settingsRouter["settings.getAccountSettings"](ctx);
        throw new Error("Should have thrown UNAUTHORIZED error");
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
        expect(error.message).toBe("Authentication required");
      }
    });
  });

  // ===========================================================================
  // settings.updateAccount Tests
  // ===========================================================================

  describe("settings.updateAccount", () => {
    it("should update username successfully", async () => {
      // Arrange: Create user
      const { user } = await buildUser()
        .username("oldusername")
        .password("OldPassword123!")
        .build();

      const ctx = createMockContext<{
        username?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          username: "newusername",
        },
      });

      // Act: Update username
      const result = await settingsRouter["settings.updateAccount"](ctx);

      // Assert: Username updated
      expect(result.success).toBe(true);
      expect(result.user.username).toBe("newusername");

      // Verify in database
      const updatedUser = await db.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.username).toBe("newusername");
    });

    it("should throw CONFLICT when username is already taken", async () => {
      // Arrange: Create two users
      const { user: user1 } = await buildUser().username("existinguser").build();
      const { user: user2 } = await buildUser().username("otheruser").build();

      const ctx = createMockContext<{
        username?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      }>({
        user: {
          id: user2.id.toString(),
          username: user2.username,
          email: user2.email,
        } as any,
        input: {
          username: "existinguser", // Try to take user1's username
        },
      });

      // Act & Assert: Should throw conflict error
      try {
        await settingsRouter["settings.updateAccount"](ctx);
        throw new Error("Should have thrown CONFLICT error");
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.CONFLICT);
        expect(error.message).toBe("Username is already taken");
      }
    });

    it("should update email and require re-verification", async () => {
      // Arrange: Create verified user
      const { user } = await buildUser()
        .username("testuser")
        .email("old@test.com")
        .password("TestPassword123!")
        .emailVerified(true)
        .build();

      const ctx = createMockContext<{
        username?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          email: "new@test.com",
          currentPassword: "TestPassword123!",
        },
      });

      // Act: Update email
      const result = await settingsRouter["settings.updateAccount"](ctx);

      // Assert: Email updated
      expect(result.success).toBe(true);
      expect(result.user.email).toBe("new@test.com");

      // Verify emailVerified is reset to false
      const updatedUser = await db.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.email).toBe("new@test.com");
      expect(updatedUser?.emailVerified).toBe(false);
    });

    it("should throw CONFLICT when email is already taken", async () => {
      // Arrange: Create two users
      const { user: user1 } = await buildUser()
        .email("existing@test.com")
        .password("Pass123!")
        .build();
      const { user: user2 } = await buildUser()
        .email("other@test.com")
        .password("Pass123!")
        .build();

      const ctx = createMockContext<{
        username?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      }>({
        user: {
          id: user2.id.toString(),
          username: user2.username,
          email: user2.email,
        } as any,
        input: {
          email: "existing@test.com",
          currentPassword: "Pass123!",
        },
      });

      // Act & Assert: Should throw conflict error
      try {
        await settingsRouter["settings.updateAccount"](ctx);
        throw new Error("Should have thrown CONFLICT error");
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.CONFLICT);
        expect(error.message).toBe("Email is already taken");
      }
    });

    it("should update password successfully", async () => {
      // Arrange: Create user
      const { user } = await buildUser().password("OldPassword123!").build();

      const ctx = createMockContext<{
        username?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          currentPassword: "OldPassword123!",
          newPassword: "NewPassword456!",
        },
      });

      // Act: Update password
      const result = await settingsRouter["settings.updateAccount"](ctx);

      // Assert: Password updated
      expect(result.success).toBe(true);

      // Verify password hash changed
      const updatedUser = await db.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.passwordHash).not.toBe(user.passwordHash);
    });

    it("should throw INVALID_CREDENTIALS when current password is incorrect", async () => {
      // Arrange: Create user
      const { user } = await buildUser().password("CorrectPassword123!").build();

      const ctx = createMockContext<{
        username?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          currentPassword: "WrongPassword123!",
          newPassword: "NewPassword456!",
        },
      });

      // Act & Assert: Should throw invalid credentials error
      try {
        await settingsRouter["settings.updateAccount"](ctx);
        throw new Error("Should have thrown INVALID_CREDENTIALS error");
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
        expect(error.message).toBe("Current password is incorrect");
      }
    });

    it("should throw VALIDATION_ERROR when changing email without current password", async () => {
      // Arrange: Create user
      const { user } = await buildUser().build();

      const ctx = createMockContext<{
        username?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          email: "newemail@test.com",
          // Missing currentPassword
        },
      });

      // Act & Assert: Should throw validation error
      try {
        await settingsRouter["settings.updateAccount"](ctx);
        throw new Error("Should have thrown VALIDATION_ERROR error");
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      }
    });

    it("should throw VALIDATION_ERROR when changing password without current password", async () => {
      // Arrange: Create user
      const { user } = await buildUser().build();

      const ctx = createMockContext<{
        username?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          newPassword: "NewPassword123!",
          // Missing currentPassword
        },
      });

      // Act & Assert: Should throw validation error
      try {
        await settingsRouter["settings.updateAccount"](ctx);
        throw new Error("Should have thrown VALIDATION_ERROR error");
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      }
    });

    it("should update multiple fields at once", async () => {
      // Arrange: Create user
      const { user } = await buildUser()
        .username("oldusername")
        .email("old@test.com")
        .password("OldPassword123!")
        .build();

      const ctx = createMockContext<{
        username?: string;
        email?: string;
        currentPassword?: string;
        newPassword?: string;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          username: "newusername",
          email: "new@test.com",
          currentPassword: "OldPassword123!",
          newPassword: "NewPassword456!",
        },
      });

      // Act: Update all fields
      const result = await settingsRouter["settings.updateAccount"](ctx);

      // Assert: All fields updated
      expect(result.success).toBe(true);
      expect(result.user.username).toBe("newusername");
      expect(result.user.email).toBe("new@test.com");

      const updatedUser = await db.user.findUnique({ where: { id: user.id } });
      expect(updatedUser?.username).toBe("newusername");
      expect(updatedUser?.email).toBe("new@test.com");
      expect(updatedUser?.passwordHash).not.toBe(user.passwordHash);
    });
  });

  // ===========================================================================
  // settings.updatePrivacy Tests
  // ===========================================================================

  describe("settings.updatePrivacy", () => {
    it("should update profile visibility", async () => {
      // Arrange: Create user with profile
      const { user } = await buildUser().withProfile({ visibility: "public" }).build();

      const ctx = createMockContext<{
        profileVisibility?: "public" | "private" | "followers";
        allowMessagesFrom?: "everyone" | "followers" | "friends" | "nobody";
        showFollowers?: boolean;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          profileVisibility: "private",
        },
      });

      // Act: Update visibility
      const result = await settingsRouter["settings.updatePrivacy"](ctx);

      // Assert: Visibility updated
      expect(result.settings.profileVisibility).toBe("private");

      // Verify in database
      const profile = await db.userProfile.findUnique({ where: { userId: user.id } });
      expect(profile?.visibility).toBe("private");
    });

    it("should update allowMessagesFrom setting", async () => {
      // Arrange: Create user with profile
      const { user } = await buildUser().withProfile().build();

      const ctx = createMockContext<{
        profileVisibility?: "public" | "private" | "followers";
        allowMessagesFrom?: "everyone" | "followers" | "friends" | "nobody";
        showFollowers?: boolean;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          allowMessagesFrom: "followers",
        },
      });

      // Act: Update message permissions
      const result = await settingsRouter["settings.updatePrivacy"](ctx);

      // Assert: Setting updated
      expect(result.settings.allowMessagesFrom).toBe("followers");

      // Verify in database (stored in styleConfig.privacy)
      const profile = await db.userProfile.findUnique({ where: { userId: user.id } });
      expect(profile?.styleConfig).toBeDefined();
      const styleConfig = profile?.styleConfig as any;
      expect(styleConfig.privacy?.allowMessagesFrom).toBe("followers");
    });

    it("should update showFollowers setting", async () => {
      // Arrange: Create user with profile
      const { user } = await buildUser().withProfile().build();

      const ctx = createMockContext<{
        profileVisibility?: "public" | "private" | "followers";
        allowMessagesFrom?: "everyone" | "followers" | "friends" | "nobody";
        showFollowers?: boolean;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          showFollowers: false,
        },
      });

      // Act: Update showFollowers
      const result = await settingsRouter["settings.updatePrivacy"](ctx);

      // Assert: Setting updated
      expect(result.settings.showFollowers).toBe(false);
    });

    it("should update multiple privacy settings at once", async () => {
      // Arrange: Create user with profile
      const { user } = await buildUser().withProfile().build();

      const ctx = createMockContext<{
        profileVisibility?: "public" | "private" | "followers";
        allowMessagesFrom?: "everyone" | "followers" | "friends" | "nobody";
        showFollowers?: boolean;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          profileVisibility: "followers",
          allowMessagesFrom: "friends",
          showFollowers: false,
        },
      });

      // Act: Update all settings
      const result = await settingsRouter["settings.updatePrivacy"](ctx);

      // Assert: All settings updated
      expect(result.settings.profileVisibility).toBe("followers");
      expect(result.settings.allowMessagesFrom).toBe("friends");
      expect(result.settings.showFollowers).toBe(false);
    });

    it("should create profile if it doesn't exist", async () => {
      // Arrange: Create user without profile
      const { user } = await buildUser().build();

      const ctx = createMockContext<{
        profileVisibility?: "public" | "private" | "followers";
        allowMessagesFrom?: "everyone" | "followers" | "friends" | "nobody";
        showFollowers?: boolean;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          profileVisibility: "private",
        },
      });

      // Act: Update privacy (should create profile)
      const result = await settingsRouter["settings.updatePrivacy"](ctx);

      // Assert: Profile created with settings
      expect(result.settings.profileVisibility).toBe("private");

      const profile = await db.userProfile.findUnique({ where: { userId: user.id } });
      expect(profile).not.toBeNull();
      expect(profile?.visibility).toBe("private");
    });
  });

  // ===========================================================================
  // settings.deleteAccount Tests
  // ===========================================================================

  describe("settings.deleteAccount", () => {
    it("should soft delete user account", async () => {
      // Arrange: Create user
      const { user } = await buildUser().password("TestPassword123!").build();

      const ctx = createMockContext<{
        password: string;
        confirmation: string;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          password: "TestPassword123!",
          confirmation: "DELETE",
        },
      });

      // Act: Delete account
      const result = await settingsRouter["settings.deleteAccount"](ctx);

      // Assert: Account soft deleted
      expect(result.success).toBe(true);

      // Verify soft deletion in database
      const deletedUser = await db.user.findUnique({ where: { id: user.id } });
      expect(deletedUser?.status).toBe("deleted");
      expect(deletedUser?.deletedAt).toBeInstanceOf(Date);
      expect(deletedUser?.username).toBe(user.username); // Username preserved
    });

    it("should throw INVALID_CREDENTIALS when password is incorrect", async () => {
      // Arrange: Create user
      const { user } = await buildUser().password("CorrectPassword123!").build();

      const ctx = createMockContext<{
        password: string;
        confirmation: string;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          password: "WrongPassword123!",
          confirmation: "DELETE",
        },
      });

      // Act & Assert: Should throw invalid credentials error
      try {
        await settingsRouter["settings.deleteAccount"](ctx);
        throw new Error("Should have thrown INVALID_CREDENTIALS error");
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.INVALID_CREDENTIALS);
        expect(error.message).toBe("Password is incorrect");
      }
    });

    it("should throw VALIDATION_ERROR when confirmation is not 'DELETE'", async () => {
      // Arrange: Create user
      const { user } = await buildUser().password("TestPassword123!").build();

      const ctx = createMockContext<{
        password: string;
        confirmation: string;
      }>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {
          password: "TestPassword123!",
          confirmation: "wrong",
        },
      });

      // Act & Assert: Should throw validation error
      try {
        await settingsRouter["settings.deleteAccount"](ctx);
        throw new Error("Should have thrown VALIDATION_ERROR error");
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
      }
    });
  });

  // ===========================================================================
  // settings.exportData Tests
  // ===========================================================================

  describe("settings.exportData", () => {
    it("should export complete user data", async () => {
      // Arrange: Create user with profile
      const { user } = await buildUser()
        .username("testuser")
        .email("test@example.com")
        .withProfile({
          displayName: "Test User",
          bio: "Test bio",
        })
        .build();

      const ctx = createMockContext<Record<string, never>>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      // Act: Export data
      const result = await settingsRouter["settings.exportData"](ctx);

      // Assert: Basic user data exported
      expect(result.data.user.username).toBe("testuser");
      expect(result.data.user.email).toBe("test@example.com");
      expect(result.data.user.emailVerified).toBe(true);
      expect(result.data.user.status).toBe("active");

      // Assert: Profile data exported
      expect(result.data.profile).not.toBeNull();
      expect(result.data.profile?.displayName).toBe("Test User");
      expect(result.data.profile?.bio).toBe("Test bio");

      // Assert: Collections are arrays
      expect(Array.isArray(result.data.posts)).toBe(true);
      expect(Array.isArray(result.data.comments)).toBe(true);
      expect(Array.isArray(result.data.messages)).toBe(true);
      expect(Array.isArray(result.data.interactions.likes)).toBe(true);
      expect(Array.isArray(result.data.interactions.follows)).toBe(true);
      expect(Array.isArray(result.data.interactions.followers)).toBe(true);
      expect(Array.isArray(result.data.interactions.friendships)).toBe(true);

      // Assert: Privacy settings exported
      expect(result.data.privacySettings).toBeDefined();
      expect(result.data.privacySettings.profileVisibility).toBe("public");
    });

    it("should export user data without profile", async () => {
      // Arrange: Create user without profile
      const { user } = await buildUser().username("noprofile").build();

      const ctx = createMockContext<Record<string, never>>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      // Act: Export data
      const result = await settingsRouter["settings.exportData"](ctx);

      // Assert: User data exported
      expect(result.data.user.username).toBe("noprofile");

      // Assert: Profile is null
      expect(result.data.profile).toBeNull();
    });

    it("should export posts with stats when user has posts", async () => {
      // Arrange: Create user and post
      const { user } = await buildUser().withProfile().build();

      const post = await db.post.create({
        data: {
          userId: user.id,
          type: "text_short",
          content: "Test post",
          visibility: "public",
        },
      });

      const ctx = createMockContext<Record<string, never>>({
        user: {
          id: user.id.toString(),
          username: user.username,
          email: user.email,
        } as any,
        input: {},
      });

      // Act: Export data
      const result = await settingsRouter["settings.exportData"](ctx);

      // Assert: Post exported with stats
      expect(result.data.posts.length).toBe(1);
      expect(result.data.posts[0].content).toBe("Test post");
      expect(result.data.posts[0].stats).toBeDefined();
      expect(result.data.posts[0].stats.likeCount).toBeGreaterThanOrEqual(0);
      expect(result.data.posts[0].stats.commentCount).toBeGreaterThanOrEqual(0);
    });

    it("should export follows and followers", async () => {
      // Arrange: Create users and follow relationships
      const { user: user1 } = await buildUser().username("user1").withProfile().build();
      const { user: user2 } = await buildUser().username("user2").withProfile().build();

      // User1 follows User2
      await db.userFollow.create({
        data: {
          followerId: user1.id,
          followingId: user2.id,
        },
      });

      const ctx = createMockContext<Record<string, never>>({
        user: {
          id: user1.id.toString(),
          username: user1.username,
          email: user1.email,
        } as any,
        input: {},
      });

      // Act: Export data
      const result = await settingsRouter["settings.exportData"](ctx);

      // Assert: Follows exported
      expect(result.data.interactions.follows.length).toBe(1);
      expect(result.data.interactions.follows[0].followingUsername).toBe("user2");

      // Assert: Followers is empty for user1
      expect(result.data.interactions.followers.length).toBe(0);
    });

    it("should throw UNAUTHORIZED when user is not authenticated", async () => {
      // Arrange: No user context
      const ctx = createMockContext<Record<string, never>>({
        user: null,
        input: {},
      });

      // Act & Assert: Should throw unauthorized error
      try {
        await settingsRouter["settings.exportData"](ctx);
        throw new Error("Should have thrown UNAUTHORIZED error");
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.UNAUTHORIZED);
        expect(error.message).toBe("Authentication required");
      }
    });
  });
});
