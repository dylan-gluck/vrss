/**
 * Test Data Fixtures and Builders
 *
 * Provides sample data for E2E tests including posts, feeds, messages, etc.
 * Based on TEST-SPECIFICATIONS.md test scenarios
 */

export interface TestPost {
  id?: string;
  type: 'text' | 'image' | 'video' | 'music';
  content: string;
  authorUsername: string;
  tags?: string[];
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;
  likes?: number;
  comments?: number;
  location?: string;
  createdAt?: Date;
}

export interface TestFeed {
  id?: string;
  name: string;
  ownerUsername: string;
  filters: TestFeedFilter[];
  logicalOperator: 'AND' | 'OR' | 'NOT';
  postCount?: number;
}

export interface TestFeedFilter {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'within';
  value: string | number;
}

export interface TestMessage {
  id?: string;
  fromUsername: string;
  toUsername: string;
  content: string;
  status?: 'sent' | 'delivered' | 'read';
  timestamp?: Date;
}

export interface TestNotification {
  id?: string;
  recipientUsername: string;
  type: 'follow' | 'post' | 'message' | 'like' | 'comment';
  content: string;
  fromUsername?: string;
  isRead?: boolean;
  timestamp?: Date;
}

/**
 * Sample Posts for Testing
 */
export const SAMPLE_POSTS: TestPost[] = [
  // Maya Music posts
  {
    type: 'music',
    content: 'My new album is dropping next week! 🎵',
    authorUsername: 'maya_music',
    tags: ['#indie', '#newmusic'],
    fileUrl: 's3://test-bucket/album_cover.jpg',
    fileSize: 5_000_000, // 5MB
    mimeType: 'audio/mpeg',
    likes: 250,
    location: 'Austin, TX',
  },
  {
    type: 'image',
    content: 'Recording session vibes ✨',
    authorUsername: 'maya_music',
    tags: ['#studio', '#recording'],
    fileUrl: 's3://test-bucket/studio_photo.jpg',
    fileSize: 3_000_000, // 3MB
    mimeType: 'image/jpeg',
    likes: 180,
    location: 'Austin, TX',
  },
  {
    type: 'text',
    content: 'Thank you all for 1K followers! You are amazing! 💜',
    authorUsername: 'maya_music',
    tags: ['#thankyou'],
    likes: 320,
  },

  // Jade Cafe posts
  {
    type: 'image',
    content: 'Fresh croissants this morning! Come grab one ☕',
    authorUsername: 'jade_cafe',
    tags: ['#breakfast', '#pastries', '#local'],
    fileUrl: 's3://test-bucket/croissants.jpg',
    fileSize: 2_500_000, // 2.5MB
    mimeType: 'image/jpeg',
    likes: 150,
    location: 'Seattle, WA',
  },
  {
    type: 'text',
    content: 'Live music tonight at 7pm! Supporting local artists 🎸',
    authorUsername: 'jade_cafe',
    tags: ['#livemusic', '#local'],
    likes: 95,
    location: 'Seattle, WA',
  },

  // Artist Sam posts
  {
    type: 'image',
    content: 'New commission piece finished! DM for inquiries.',
    authorUsername: 'artist_sam',
    tags: ['#art', '#commission', '#illustration'],
    fileUrl: 's3://test-bucket/artwork.jpg',
    fileSize: 4_000_000, // 4MB
    mimeType: 'image/jpeg',
    likes: 200,
    location: 'Brooklyn, NY',
  },

  // Marcus Consumer posts
  {
    type: 'text',
    content: 'Just discovered @maya_music and loving the sound! 🎶',
    authorUsername: 'marcus_consumer',
    tags: ['#musicdiscovery'],
    likes: 45,
  },
];

/**
 * Sample Custom Feeds
 */
export const SAMPLE_FEEDS: TestFeed[] = [
  {
    name: 'Music Only',
    ownerUsername: 'marcus_consumer',
    filters: [
      {
        field: 'post_type',
        operator: 'equals',
        value: 'music',
      },
    ],
    logicalOperator: 'AND',
    postCount: 8,
  },
  {
    name: 'Local Music',
    ownerUsername: 'marcus_consumer',
    filters: [
      {
        field: 'post_type',
        operator: 'equals',
        value: 'music',
      },
      {
        field: 'author_location',
        operator: 'within',
        value: '20 miles',
      },
    ],
    logicalOperator: 'AND',
    postCount: 3,
  },
  {
    name: 'Local Indie Music',
    ownerUsername: 'marcus_consumer',
    filters: [
      {
        field: 'post_type',
        operator: 'equals',
        value: 'music',
      },
      {
        field: 'author_location',
        operator: 'within',
        value: '20 miles',
      },
      {
        field: 'tags',
        operator: 'contains',
        value: '#indie',
      },
      {
        field: 'likes',
        operator: 'greater_than',
        value: 10,
      },
    ],
    logicalOperator: 'AND',
    postCount: 2,
  },
];

/**
 * Sample Direct Messages
 */
export const SAMPLE_MESSAGES: TestMessage[] = [
  {
    fromUsername: 'marcus_consumer',
    toUsername: 'maya_music',
    content: 'Hi Maya! Love your new album!',
    status: 'delivered',
  },
  {
    fromUsername: 'maya_music',
    toUsername: 'marcus_consumer',
    content: 'Thank you so much! Really appreciate the support 💜',
    status: 'delivered',
  },
  {
    fromUsername: 'jade_cafe',
    toUsername: 'maya_music',
    content: 'Would you be interested in playing at our cafe?',
    status: 'delivered',
  },
];

/**
 * Sample Notifications
 */
export const SAMPLE_NOTIFICATIONS: TestNotification[] = [
  {
    recipientUsername: 'maya_music',
    type: 'follow',
    content: 'marcus_consumer started following you',
    fromUsername: 'marcus_consumer',
    isRead: false,
  },
  {
    recipientUsername: 'marcus_consumer',
    type: 'post',
    content: 'maya_music posted: My new album is dropping next week!',
    fromUsername: 'maya_music',
    isRead: false,
  },
  {
    recipientUsername: 'maya_music',
    type: 'message',
    content: 'New message from marcus_consumer',
    fromUsername: 'marcus_consumer',
    isRead: false,
  },
  {
    recipientUsername: 'maya_music',
    type: 'like',
    content: 'marcus_consumer liked your post',
    fromUsername: 'marcus_consumer',
    isRead: true,
  },
];

/**
 * Test File Upload Data
 */
export interface TestFile {
  name: string;
  size: number;
  mimeType: string;
  path?: string;
}

export const SAMPLE_FILES: Record<string, TestFile> = {
  SMALL_IMAGE: {
    name: 'photo.jpg',
    size: 2_000_000, // 2MB
    mimeType: 'image/jpeg',
  },
  LARGE_IMAGE: {
    name: 'album_cover.jpg',
    size: 5_000_000, // 5MB
    mimeType: 'image/jpeg',
  },
  VIDEO: {
    name: 'concert_video.mp4',
    size: 15_000_000, // 15MB
    mimeType: 'video/mp4',
  },
  AUDIO: {
    name: 'new_track.mp3',
    size: 8_000_000, // 8MB
    mimeType: 'audio/mpeg',
  },
  OVERSIZED_FILE: {
    name: 'huge_video.mp4',
    size: 100_000_000, // 100MB (exceeds typical limits)
    mimeType: 'video/mp4',
  },
};

/**
 * Builder pattern for creating test posts
 */
export class PostBuilder {
  private post: Partial<TestPost> = {
    type: 'text',
    content: 'Default test post',
    authorUsername: 'maya_music',
    tags: [],
    likes: 0,
    comments: 0,
  };

  withType(type: 'text' | 'image' | 'video' | 'music'): this {
    this.post.type = type;
    return this;
  }

  withContent(content: string): this {
    this.post.content = content;
    return this;
  }

  withAuthor(username: string): this {
    this.post.authorUsername = username;
    return this;
  }

  withTags(tags: string[]): this {
    this.post.tags = tags;
    return this;
  }

  withFile(url: string, size: number, mimeType: string): this {
    this.post.fileUrl = url;
    this.post.fileSize = size;
    this.post.mimeType = mimeType;
    return this;
  }

  withLikes(likes: number): this {
    this.post.likes = likes;
    return this;
  }

  withLocation(location: string): this {
    this.post.location = location;
    return this;
  }

  build(): TestPost {
    return this.post as TestPost;
  }
}

/**
 * Builder pattern for creating test feeds
 */
export class FeedBuilder {
  private feed: Partial<TestFeed> = {
    name: 'Test Feed',
    ownerUsername: 'marcus_consumer',
    filters: [],
    logicalOperator: 'AND',
  };

  withName(name: string): this {
    this.feed.name = name;
    return this;
  }

  withOwner(username: string): this {
    this.feed.ownerUsername = username;
    return this;
  }

  addFilter(filter: TestFeedFilter): this {
    this.feed.filters = [...(this.feed.filters || []), filter];
    return this;
  }

  withLogicalOperator(operator: 'AND' | 'OR' | 'NOT'): this {
    this.feed.logicalOperator = operator;
    return this;
  }

  build(): TestFeed {
    return this.feed as TestFeed;
  }
}

/**
 * Builder pattern for creating test messages
 */
export class MessageBuilder {
  private message: Partial<TestMessage> = {
    fromUsername: 'marcus_consumer',
    toUsername: 'maya_music',
    content: 'Test message',
    status: 'sent',
  };

  from(username: string): this {
    this.message.fromUsername = username;
    return this;
  }

  to(username: string): this {
    this.message.toUsername = username;
    return this;
  }

  withContent(content: string): this {
    this.message.content = content;
    return this;
  }

  withStatus(status: 'sent' | 'delivered' | 'read'): this {
    this.message.status = status;
    return this;
  }

  build(): TestMessage {
    return this.message as TestMessage;
  }
}

/**
 * Utility functions for test data generation
 */

export function generateRandomPost(authorUsername: string): TestPost {
  const types: Array<'text' | 'image' | 'video' | 'music'> = ['text', 'image', 'video', 'music'];
  const randomType = types[Math.floor(Math.random() * types.length)];

  return new PostBuilder()
    .withType(randomType)
    .withContent(`Test post ${Date.now()}`)
    .withAuthor(authorUsername)
    .withTags(['#test'])
    .withLikes(Math.floor(Math.random() * 100))
    .build();
}

export function generateMultiplePosts(count: number, authorUsername: string): TestPost[] {
  return Array.from({ length: count }, () => generateRandomPost(authorUsername));
}
