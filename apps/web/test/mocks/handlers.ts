import { http, HttpResponse } from 'msw';
import {
  TEST_PERSONAS,
  MOCK_POSTS,
  MOCK_ALGORITHMS,
  MOCK_NOTIFICATIONS,
  MOCK_AUTH_TOKENS,
} from './data';

/**
 * API base URL - matches the RPC client configuration
 */
const API_BASE_URL = 'http://localhost:3000';

/**
 * Helper to create RPC success response
 */
function rpcSuccess<T>(result: T, id: string = 'test-id') {
  return HttpResponse.json({
    result,
    id,
  });
}

/**
 * Helper to create RPC error response
 */
function rpcError(code: number, message: string, id: string = 'test-id') {
  return HttpResponse.json({
    error: {
      code,
      message,
    },
    id,
  });
}

/**
 * MSW handlers for RPC API endpoints
 */
export const handlers = [
  // ============ Authentication Endpoints ============

  http.post(`${API_BASE_URL}/api/rpc`, async ({ request }) => {
    const body = await request.json() as any;
    const { method, params } = body;

    // Auth: Register
    if (method === 'auth.register') {
      return rpcSuccess({
        user: TEST_PERSONAS.CREATOR,
        token: MOCK_AUTH_TOKENS.VALID_TOKEN,
      });
    }

    // Auth: Login
    if (method === 'auth.login') {
      const { email, password } = params;

      if (email === TEST_PERSONAS.CREATOR.email && password === 'SecurePass123!') {
        return rpcSuccess({
          user: TEST_PERSONAS.CREATOR,
          token: MOCK_AUTH_TOKENS.VALID_TOKEN,
        });
      }

      return rpcError(401, 'Invalid username or password');
    }

    // Auth: Logout
    if (method === 'auth.logout') {
      return rpcSuccess(null);
    }

    // Auth: Verify token
    if (method === 'auth.verify') {
      const authHeader = request.headers.get('Authorization');
      const token = authHeader?.replace('Bearer ', '');

      if (token === MOCK_AUTH_TOKENS.VALID_TOKEN) {
        return rpcSuccess({ user: TEST_PERSONAS.CREATOR });
      }

      return rpcError(401, 'Invalid token');
    }

    // ============ Feed Endpoints ============

    // Feed: Get feed
    if (method === 'feed.get') {
      const { cursor = 0, limit = 20 } = params;
      const start = cursor;
      const end = start + limit;
      const posts = MOCK_POSTS.slice(start, end);

      return rpcSuccess({
        posts,
        nextCursor: end < MOCK_POSTS.length ? end : null,
        hasMore: end < MOCK_POSTS.length,
      });
    }

    // Post: Get single post
    if (method === 'post.get') {
      const { postId } = params;
      const post = MOCK_POSTS.find((p) => p.id === postId);

      if (post) {
        return rpcSuccess(post);
      }

      return rpcError(404, 'Post not found');
    }

    // Post: Create
    if (method === 'post.create') {
      const { input } = params;
      const newPost = {
        id: `post-${Date.now()}`,
        type: input.type || 'text',
        author: {
          id: TEST_PERSONAS.CREATOR.id,
          username: TEST_PERSONAS.CREATOR.username,
          avatarUrl: TEST_PERSONAS.CREATOR.avatarUrl,
        },
        content: input.content,
        media: input.mediaIds ? input.mediaIds.map((id: string) => ({
          id,
          type: 'image',
          url: `https://example.com/media/${id}.jpg`,
        })) : [],
        hashtags: [],
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isLiked: false,
        isBookmarked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return rpcSuccess(newPost);
    }

    // Post: Like
    if (method === 'post.like') {
      return rpcSuccess({ likesCount: 46 });
    }

    // Post: Unlike
    if (method === 'post.unlike') {
      return rpcSuccess({ likesCount: 44 });
    }

    // Post: Bookmark
    if (method === 'post.bookmark') {
      return rpcSuccess(null);
    }

    // Post: Unbookmark
    if (method === 'post.unbookmark') {
      return rpcSuccess(null);
    }

    // ============ Feed Algorithm Endpoints ============

    // Feed: Get algorithms
    if (method === 'feed.algorithms.list') {
      return rpcSuccess(MOCK_ALGORITHMS);
    }

    // Feed: Create algorithm
    if (method === 'feed.algorithm.create') {
      const { input } = params;
      const newAlgorithm = {
        id: `algo-${Date.now()}`,
        name: input.name,
        blocks: input.blocks,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return rpcSuccess(newAlgorithm);
    }

    // ============ Profile Endpoints ============

    // Profile: Get by username
    if (method === 'profile.get') {
      const { username } = params;

      const persona = Object.values(TEST_PERSONAS).find(
        (p) => p.username === username
      );

      if (persona) {
        return rpcSuccess({
          ...persona,
          styles: {
            background: { type: 'color', value: '#ffffff' },
            colors: {
              primary: '#000000',
              secondary: '#666666',
              text: '#000000',
              accent: '#0066cc',
            },
            font: {
              family: 'Inter',
              headingSize: 'lg',
              bodySize: 'md',
            },
          },
          layout: {
            sections: [],
            columnsDesktop: 1,
            columnsMobile: 1,
          },
          visibility: 'public',
        });
      }

      return rpcError(404, 'Profile not found');
    }

    // Profile: Get current user's profile
    if (method === 'profile.me') {
      return rpcSuccess({
        ...TEST_PERSONAS.CREATOR,
        styles: {
          background: { type: 'color', value: '#ffffff' },
          colors: {
            primary: '#000000',
            secondary: '#666666',
            text: '#000000',
            accent: '#0066cc',
          },
          font: {
            family: 'Inter',
            headingSize: 'lg',
            bodySize: 'md',
          },
        },
        layout: {
          sections: [],
          columnsDesktop: 1,
          columnsMobile: 1,
        },
        visibility: 'public',
      });
    }

    // Profile: Update
    if (method === 'profile.update') {
      const { updates } = params;
      return rpcSuccess({
        ...TEST_PERSONAS.CREATOR,
        ...updates,
      });
    }

    // Profile: Follow user
    if (method === 'user.follow') {
      return rpcSuccess(null);
    }

    // Profile: Unfollow user
    if (method === 'user.unfollow') {
      return rpcSuccess(null);
    }

    // ============ Notification Endpoints ============

    // Notifications: Get
    if (method === 'notifications.get') {
      return rpcSuccess({
        notifications: MOCK_NOTIFICATIONS,
        nextCursor: null,
        unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
      });
    }

    // Notifications: Get unread count
    if (method === 'notifications.unreadCount') {
      return rpcSuccess({
        count: MOCK_NOTIFICATIONS.filter((n) => !n.read).length,
      });
    }

    // Notifications: Mark as read
    if (method === 'notification.markRead') {
      return rpcSuccess(null);
    }

    // Notifications: Mark all as read
    if (method === 'notifications.markAllRead') {
      return rpcSuccess(null);
    }

    // ============ Search Endpoints ============

    // Search: Users
    if (method === 'search.users') {
      const { query } = params;
      const results = Object.values(TEST_PERSONAS).filter((p) =>
        p.username.toLowerCase().includes(query.toLowerCase())
      );

      return rpcSuccess(results);
    }

    // Search: All
    if (method === 'search') {
      const { query } = params;
      return rpcSuccess({
        users: Object.values(TEST_PERSONAS).filter((p) =>
          p.username.toLowerCase().includes(query.toLowerCase())
        ),
        posts: MOCK_POSTS.filter((p) =>
          p.content.toLowerCase().includes(query.toLowerCase())
        ),
        hashtags: ['#indie', '#newmusic', '#albumart'],
      });
    }

    // ============ Upload Endpoints ============

    // Upload: Get signature
    if (method === 'upload.getSignature') {
      return rpcSuccess({
        uploadId: `upload-${Date.now()}`,
        uploadUrl: 'https://mock-s3.amazonaws.com/vrss-uploads',
        fields: {
          key: 'test-file.jpg',
          'Content-Type': params.mimeType,
        },
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });
    }

    // Upload: Confirm
    if (method === 'upload.confirm') {
      return rpcSuccess({
        id: `file-${Date.now()}`,
        url: `https://example.com/uploads/file-${Date.now()}.jpg`,
        thumbnailUrl: `https://example.com/uploads/file-${Date.now()}-thumb.jpg`,
        size: 1024000,
        mimeType: 'image/jpeg',
      });
    }

    // ============ Message Endpoints ============

    // Messages: Get threads
    if (method === 'messages.threads.get') {
      return rpcSuccess({
        threads: [],
        nextCursor: null,
      });
    }

    // Messages: Send message
    if (method === 'message.send') {
      const { recipientId, content } = params;
      return rpcSuccess({
        id: `message-${Date.now()}`,
        threadId: `thread-${Date.now()}`,
        senderId: TEST_PERSONAS.CREATOR.id,
        senderUsername: TEST_PERSONAS.CREATOR.username,
        senderAvatarUrl: TEST_PERSONAS.CREATOR.avatarUrl,
        content,
        attachments: [],
        read: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Default: Unknown method
    return rpcError(404, `Unknown RPC method: ${method}`);
  }),
];
