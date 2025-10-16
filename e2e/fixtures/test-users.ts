import { UserCredentials } from '../helpers/auth-helper';

/**
 * Test User Personas for E2E Testing
 *
 * Based on TEST-SPECIFICATIONS.md personas:
 * - maya_music: Creator persona (musician)
 * - marcus_consumer: Consumer persona (content consumer)
 * - jade_cafe: Business persona (cafe owner)
 */

export interface TestUser extends UserCredentials {
  displayName: string;
  profileType: 'creator' | 'consumer' | 'business';
  storageUsed: number;
  storageQuota: number;
  bio?: string;
  location?: string;
}

/**
 * Maya Music - Creator Persona
 * Profile: Independent musician sharing music and updates
 * Usage: 30MB of 50MB storage, 45 posts, 1250 followers
 */
export const MAYA_MUSIC: TestUser = {
  username: 'maya_music',
  email: 'maya@example.com',
  password: 'SecurePass123!',
  displayName: 'Maya Music',
  profileType: 'creator',
  storageUsed: 30_000_000, // 30MB
  storageQuota: 50_000_000, // 50MB
  bio: 'Independent musician sharing my journey. New album dropping soon! 🎵',
  location: 'Austin, TX',
};

/**
 * Marcus Consumer - Consumer Persona
 * Profile: Content consumer who follows creators
 * Usage: 5MB of 50MB storage, 8 posts, 80 followers, 320 following
 */
export const MARCUS_CONSUMER: TestUser = {
  username: 'marcus_consumer',
  email: 'marcus@example.com',
  password: 'SecurePass123!',
  displayName: 'Marcus Thompson',
  profileType: 'consumer',
  storageUsed: 5_000_000, // 5MB
  storageQuota: 50_000_000, // 50MB
  bio: 'Music enthusiast and art lover. Always discovering new creators.',
  location: 'Portland, OR',
};

/**
 * Jade Cafe - Business Persona
 * Profile: Small business owner promoting cafe
 * Usage: 45MB of 50MB storage (near limit), 120 posts, 2500 followers
 */
export const JADE_CAFE: TestUser = {
  username: 'jade_cafe',
  email: 'jade@example.com',
  password: 'SecurePass123!',
  displayName: 'Jade Cafe',
  profileType: 'business',
  storageUsed: 45_000_000, // 45MB (near limit)
  storageQuota: 50_000_000, // 50MB
  bio: 'Local organic cafe ☕ Fresh pastries daily. Supporting local artists.',
  location: 'Seattle, WA',
};

/**
 * Additional Test Users for Social Interactions
 */

export const ARTIST_SAM: TestUser = {
  username: 'artist_sam',
  email: 'sam@example.com',
  password: 'SecurePass123!',
  displayName: 'Sam Artist',
  profileType: 'creator',
  storageUsed: 20_000_000, // 20MB
  storageQuota: 50_000_000, // 50MB
  bio: 'Digital artist and illustrator. Commission open!',
  location: 'Brooklyn, NY',
};

export const RANDOM_USER: TestUser = {
  username: 'random_user',
  email: 'random@example.com',
  password: 'SecurePass123!',
  displayName: 'Random User',
  profileType: 'consumer',
  storageUsed: 2_000_000, // 2MB
  storageQuota: 50_000_000, // 50MB
  bio: 'Just here to explore and connect.',
  location: 'Denver, CO',
};

/**
 * Test Users Array
 * Useful for batch operations or iteration
 */
export const ALL_TEST_USERS: TestUser[] = [
  MAYA_MUSIC,
  MARCUS_CONSUMER,
  JADE_CAFE,
  ARTIST_SAM,
  RANDOM_USER,
];

/**
 * Primary Test Users (used in most test scenarios)
 */
export const PRIMARY_TEST_USERS: TestUser[] = [
  MAYA_MUSIC,
  MARCUS_CONSUMER,
  JADE_CAFE,
];

/**
 * Get test user by username
 * @param username Username to lookup
 * @returns Test user or undefined
 */
export function getTestUser(username: string): TestUser | undefined {
  return ALL_TEST_USERS.find((user) => user.username === username);
}

/**
 * Get test users by profile type
 * @param profileType Profile type to filter by
 * @returns Array of matching test users
 */
export function getTestUsersByType(
  profileType: 'creator' | 'consumer' | 'business'
): TestUser[] {
  return ALL_TEST_USERS.filter((user) => user.profileType === profileType);
}

/**
 * Generate unique test user (for tests requiring unique data)
 * @param baseUsername Base username to use
 * @returns Test user with unique credentials
 */
export function generateUniqueTestUser(baseUsername: string = 'testuser'): TestUser {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    username: `${baseUsername}_${timestamp}_${random}`,
    email: `${baseUsername}_${timestamp}_${random}@example.com`,
    password: 'SecurePass123!',
    displayName: `Test User ${timestamp}`,
    profileType: 'consumer',
    storageUsed: 0,
    storageQuota: 50_000_000,
    bio: 'Temporary test user',
  };
}

/**
 * Test User Credentials Only (for login tests)
 */
export const TEST_CREDENTIALS = {
  MAYA_MUSIC: {
    email: MAYA_MUSIC.email,
    password: MAYA_MUSIC.password,
  },
  MARCUS_CONSUMER: {
    email: MARCUS_CONSUMER.email,
    password: MARCUS_CONSUMER.password,
  },
  JADE_CAFE: {
    email: JADE_CAFE.email,
    password: JADE_CAFE.password,
  },
};

/**
 * Invalid Test Credentials (for error handling tests)
 */
export const INVALID_CREDENTIALS = {
  WRONG_PASSWORD: {
    email: MAYA_MUSIC.email,
    password: 'WrongPassword123!',
  },
  NONEXISTENT_USER: {
    email: 'nonexistent@example.com',
    password: 'SecurePass123!',
  },
  MISSING_USERNAME: {
    email: '',
    password: 'SecurePass123!',
  },
  MISSING_PASSWORD: {
    email: MAYA_MUSIC.email,
    password: '',
  },
  INVALID_EMAIL_FORMAT: {
    email: 'invalid-email-format',
    password: 'SecurePass123!',
  },
};
