/**
 * User Builder for Test Fixtures
 *
 * Flexible builder pattern for creating test users with profiles and storage quotas.
 * Provides sensible defaults while allowing customization.
 */

import type {
  ProfileVisibility,
  StorageUsage,
  User,
  UserProfile,
  UserStatus,
} from "@prisma/client";
import { hashPassword } from "../helpers/auth";
import { getTestDatabase } from "../setup";

/**
 * User builder with fluent interface
 */
export class UserBuilder {
  private data: Partial<{
    username: string;
    email: string;
    password: string;
    emailVerified: boolean;
    status: UserStatus;
  }> = {};

  private profileData: Partial<{
    displayName: string;
    bio: string;
    age: number;
    location: string;
    website: string;
    visibility: ProfileVisibility;
    backgroundConfig: any;
    musicConfig: any;
    styleConfig: any;
    layoutConfig: any;
  }> | null = null;

  private storageData: Partial<{
    quotaBytes: bigint;
    usedBytes: bigint;
    imagesBytes: bigint;
    videosBytes: bigint;
    audioBytes: bigint;
    otherBytes: bigint;
  }> | null = null;

  private shouldCreateProfile = false;
  private shouldCreateStorage = true; // Default to true as per requirements

  /**
   * Set username
   */
  username(username: string): this {
    this.data.username = username;
    return this;
  }

  /**
   * Set email
   */
  email(email: string): this {
    this.data.email = email;
    return this;
  }

  /**
   * Set password (will be hashed)
   */
  password(password: string): this {
    this.data.password = password;
    return this;
  }

  /**
   * Mark email as verified
   */
  emailVerified(verified = true): this {
    this.data.emailVerified = verified;
    return this;
  }

  /**
   * Set user status
   */
  status(status: UserStatus): this {
    this.data.status = status;
    return this;
  }

  /**
   * Mark user as suspended
   */
  suspended(): this {
    this.data.status = "suspended";
    return this;
  }

  /**
   * Mark user as deleted
   */
  deleted(): this {
    this.data.status = "deleted";
    return this;
  }

  /**
   * Enable profile creation with optional data
   */
  withProfile(
    data?: Partial<{
      displayName: string;
      bio: string;
      age: number;
      location: string;
      website: string;
      visibility: ProfileVisibility;
    }>
  ): this {
    this.shouldCreateProfile = true;
    if (data) {
      this.profileData = { ...this.profileData, ...data };
    }
    return this;
  }

  /**
   * Set storage quota configuration
   */
  withStorage(
    data?: Partial<{
      quotaBytes: bigint;
      usedBytes: bigint;
      imagesBytes: bigint;
      videosBytes: bigint;
      audioBytes: bigint;
      otherBytes: bigint;
    }>
  ): this {
    this.shouldCreateStorage = true;
    if (data) {
      this.storageData = { ...this.storageData, ...data };
    }
    return this;
  }

  /**
   * Set storage quota in MB (convenience method)
   */
  withStorageQuotaMB(quotaMB: number): this {
    this.shouldCreateStorage = true;
    this.storageData = {
      ...this.storageData,
      quotaBytes: BigInt(quotaMB * 1024 * 1024),
    };
    return this;
  }

  /**
   * Disable storage creation
   */
  withoutStorage(): this {
    this.shouldCreateStorage = false;
    return this;
  }

  /**
   * Generate default values
   */
  private getDefaults(): {
    username: string;
    email: string;
    password: string;
    emailVerified: boolean;
    status: UserStatus;
  } {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const defaultUsername = `testuser_${timestamp}_${random}`;

    return {
      username: defaultUsername,
      email: `${defaultUsername}@test.com`,
      password: "TestPassword123!",
      emailVerified: true,
      status: "active",
    };
  }

  /**
   * Build and save the user to database
   */
  async build(): Promise<{
    user: User;
    profile?: UserProfile;
    storage?: StorageUsage;
  }> {
    const db = getTestDatabase();
    const defaults = this.getDefaults();

    // Merge defaults with provided data
    const userData = {
      username: this.data.username ?? defaults.username,
      email: this.data.email ?? defaults.email,
      emailVerified: this.data.emailVerified ?? defaults.emailVerified,
      status: this.data.status ?? defaults.status,
      passwordHash: await hashPassword(this.data.password ?? defaults.password),
    };

    // Create user
    const user = await db.user.create({
      data: userData,
    });

    // Create profile if requested
    let profile: UserProfile | undefined;
    if (this.shouldCreateProfile) {
      profile = await db.userProfile.create({
        data: {
          userId: user.id,
          displayName: this.profileData?.displayName ?? user.username,
          bio: this.profileData?.bio,
          age: this.profileData?.age,
          location: this.profileData?.location,
          website: this.profileData?.website,
          visibility: this.profileData?.visibility ?? "public",
          backgroundConfig: this.profileData?.backgroundConfig ?? {},
          musicConfig: this.profileData?.musicConfig,
          styleConfig: this.profileData?.styleConfig ?? {},
          layoutConfig: this.profileData?.layoutConfig ?? { sections: [] },
        },
      });
    }

    // Create storage quota if requested
    let storage: StorageUsage | undefined;
    if (this.shouldCreateStorage) {
      storage = await db.storageUsage.create({
        data: {
          userId: user.id,
          quotaBytes: this.storageData?.quotaBytes ?? BigInt(50 * 1024 * 1024), // 50MB default
          usedBytes: this.storageData?.usedBytes ?? BigInt(0),
          imagesBytes: this.storageData?.imagesBytes ?? BigInt(0),
          videosBytes: this.storageData?.videosBytes ?? BigInt(0),
          audioBytes: this.storageData?.audioBytes ?? BigInt(0),
          otherBytes: this.storageData?.otherBytes ?? BigInt(0),
        },
      });
    }

    return { user, profile, storage };
  }

  /**
   * Build multiple users
   */
  async buildMany(count: number): Promise<
    Array<{
      user: User;
      profile?: UserProfile;
      storage?: StorageUsage;
    }>
  > {
    const users = [];
    for (let i = 0; i < count; i++) {
      // Clone the builder configuration for each user
      const builder = new UserBuilder();
      Object.assign(builder.data, this.data);
      builder.profileData = this.profileData ? { ...this.profileData } : null;
      builder.storageData = this.storageData ? { ...this.storageData } : null;
      builder.shouldCreateProfile = this.shouldCreateProfile;
      builder.shouldCreateStorage = this.shouldCreateStorage;

      // Override username/email to ensure uniqueness
      if (!this.data.username) {
        builder.username(`testuser_${Date.now()}_${i}`);
      } else {
        builder.username(`${this.data.username}_${i}`);
      }
      if (!this.data.email) {
        builder.email(`testuser_${Date.now()}_${i}@test.com`);
      } else {
        builder.email(this.data.email.replace("@", `_${i}@`));
      }

      users.push(await builder.build());
    }
    return users;
  }
}

/**
 * Create a new user builder
 */
export function buildUser(): UserBuilder {
  return new UserBuilder();
}

/**
 * Quick helper to create a basic user with defaults
 */
export async function createTestUser(overrides?: {
  username?: string;
  email?: string;
  password?: string;
}): Promise<User> {
  const builder = buildUser();

  if (overrides?.username) builder.username(overrides.username);
  if (overrides?.email) builder.email(overrides.email);
  if (overrides?.password) builder.password(overrides.password);

  const result = await builder.build();
  return result.user;
}

/**
 * Create a user with a complete profile
 */
export async function createUserWithProfile(overrides?: {
  username?: string;
  displayName?: string;
  bio?: string;
}): Promise<{ user: User; profile: UserProfile }> {
  const builder = buildUser().withProfile();

  if (overrides?.username) builder.username(overrides.username);
  if (overrides?.displayName || overrides?.bio) {
    builder.withProfile({
      displayName: overrides.displayName,
      bio: overrides.bio,
    });
  }

  const result = await builder.build();
  if (!result.profile) {
    throw new Error("Profile creation failed - this should never happen when withProfile() is called");
  }
  return { user: result.user, profile: result.profile };
}
