/**
 * Test Personas from TEST-SPECIFICATIONS.md
 * These personas match the specification requirements for testing
 */

export const TEST_PERSONAS = {
  CREATOR: {
    id: 'user-maya-001',
    username: 'maya_music',
    email: 'maya@example.com',
    displayName: 'Maya Music',
    avatarUrl: 'https://example.com/avatars/maya.jpg',
    bio: 'Indie musician and producer',
    storageUsed: 30_000_000, // 30MB
    storageQuota: 50_000_000, // 50MB
    profileType: 'creator',
    postsCount: 45,
    followersCount: 1250,
    followingCount: 180,
    createdAt: '2024-01-15T10:00:00Z',
  },
  CONSUMER: {
    id: 'user-marcus-001',
    username: 'marcus_consumer',
    email: 'marcus@example.com',
    displayName: 'Marcus Consumer',
    avatarUrl: 'https://example.com/avatars/marcus.jpg',
    bio: 'Music enthusiast and collector',
    storageUsed: 5_000_000, // 5MB
    storageQuota: 50_000_000, // 50MB
    profileType: 'consumer',
    postsCount: 8,
    followersCount: 80,
    followingCount: 320,
    createdAt: '2024-02-20T10:00:00Z',
  },
  BUSINESS: {
    id: 'user-jade-001',
    username: 'jade_cafe',
    email: 'jade@example.com',
    displayName: 'Jade Cafe',
    avatarUrl: 'https://example.com/avatars/jade.jpg',
    bio: 'Local coffee shop and music venue',
    storageUsed: 45_000_000, // 45MB (near limit)
    storageQuota: 50_000_000, // 50MB
    profileType: 'business',
    postsCount: 120,
    followersCount: 2500,
    followingCount: 50,
    createdAt: '2024-01-10T10:00:00Z',
  },
} as const;

/**
 * Mock posts for testing feed functionality
 */
export const MOCK_POSTS = [
  {
    id: 'post-001',
    type: 'text',
    author: {
      id: TEST_PERSONAS.CREATOR.id,
      username: TEST_PERSONAS.CREATOR.username,
      avatarUrl: TEST_PERSONAS.CREATOR.avatarUrl,
    },
    content: 'Working on my new album! Stay tuned 🎵',
    media: [],
    hashtags: ['#indie', '#newmusic'],
    likesCount: 45,
    commentsCount: 12,
    sharesCount: 3,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2025-10-15T14:30:00Z',
    updatedAt: '2025-10-15T14:30:00Z',
  },
  {
    id: 'post-002',
    type: 'image',
    author: {
      id: TEST_PERSONAS.CREATOR.id,
      username: TEST_PERSONAS.CREATOR.username,
      avatarUrl: TEST_PERSONAS.CREATOR.avatarUrl,
    },
    content: 'Album cover reveal! What do you think?',
    media: [
      {
        id: 'media-001',
        type: 'image',
        url: 'https://example.com/images/album-cover.jpg',
        thumbnailUrl: 'https://example.com/images/album-cover-thumb.jpg',
        alt: 'Album cover artwork',
        width: 1200,
        height: 1200,
      },
    ],
    hashtags: ['#albumart', '#indie'],
    likesCount: 120,
    commentsCount: 28,
    sharesCount: 15,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2025-10-14T10:00:00Z',
    updatedAt: '2025-10-14T10:00:00Z',
  },
  {
    id: 'post-003',
    type: 'text',
    author: {
      id: TEST_PERSONAS.CONSUMER.id,
      username: TEST_PERSONAS.CONSUMER.username,
      avatarUrl: TEST_PERSONAS.CONSUMER.avatarUrl,
    },
    content: 'Just discovered @maya_music and loving the vibes!',
    media: [],
    hashtags: ['#musicdiscovery'],
    likesCount: 8,
    commentsCount: 2,
    sharesCount: 0,
    isLiked: false,
    isBookmarked: false,
    createdAt: '2025-10-13T16:20:00Z',
    updatedAt: '2025-10-13T16:20:00Z',
  },
] as const;

/**
 * Mock feed algorithms for testing feed builder
 */
export const MOCK_ALGORITHMS = [
  {
    id: 'algo-default',
    name: 'All Posts',
    blocks: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
  },
  {
    id: 'algo-music-only',
    name: 'Music Only',
    blocks: [
      {
        id: 'block-001',
        type: 'filter-type',
        config: {
          postType: 'music',
          operator: 'equals',
        },
      },
    ],
    createdAt: '2025-02-01T00:00:00Z',
    updatedAt: '2025-02-01T00:00:00Z',
  },
] as const;

/**
 * Mock notifications for testing notification system
 */
export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif-001',
    type: 'LIKE',
    actorId: TEST_PERSONAS.CONSUMER.id,
    actorUsername: TEST_PERSONAS.CONSUMER.username,
    actorAvatarUrl: TEST_PERSONAS.CONSUMER.avatarUrl,
    targetId: 'post-001',
    targetType: 'POST',
    content: 'liked your post',
    read: false,
    createdAt: '2025-10-15T15:00:00Z',
  },
  {
    id: 'notif-002',
    type: 'FOLLOW',
    actorId: TEST_PERSONAS.CONSUMER.id,
    actorUsername: TEST_PERSONAS.CONSUMER.username,
    actorAvatarUrl: TEST_PERSONAS.CONSUMER.avatarUrl,
    targetId: TEST_PERSONAS.CREATOR.id,
    targetType: 'PROFILE',
    content: 'started following you',
    read: false,
    createdAt: '2025-10-15T14:45:00Z',
  },
] as const;

/**
 * Mock authentication tokens for testing
 */
export const MOCK_AUTH_TOKENS = {
  VALID_TOKEN: 'mock-valid-token-xyz123',
  EXPIRED_TOKEN: 'mock-expired-token-abc456',
  INVALID_TOKEN: 'mock-invalid-token-def789',
} as const;

/**
 * Helper to create mock profile with custom overrides
 */
export function createMockProfile(overrides: Partial<typeof TEST_PERSONAS.CREATOR> = {}) {
  return {
    ...TEST_PERSONAS.CREATOR,
    ...overrides,
  };
}

/**
 * Helper to create mock post with custom overrides
 */
export function createMockPost(overrides: Partial<typeof MOCK_POSTS[0]> = {}) {
  return {
    ...MOCK_POSTS[0],
    id: `post-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}
