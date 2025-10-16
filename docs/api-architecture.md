# VRSS RPC API Architecture

## Overview

This document specifies the RPC-style API architecture for the VRSS social platform, built on Bun runtime with Hono framework. The API follows a type-safe RPC pattern inspired by tRPC and JSON-RPC, enabling end-to-end type safety between the frontend PWA and backend services.

## Core Design Principles

1. **Type Safety First**: Shared TypeScript types between client and server
2. **RPC over REST**: Procedure-based API with explicit operations
3. **Single Endpoint Pattern**: All RPC calls go through unified routing
4. **Consistent Error Handling**: Standardized error codes and responses
5. **Developer Experience**: Auto-completion, type inference, and clear contracts

---

## API Pattern Architecture

### RPC Request/Response Structure

Every API call follows this consistent pattern:

```typescript
// Request structure
interface RPCRequest<T = unknown> {
  procedure: string;           // e.g., "user.register", "post.create"
  input: T;                    // Typed input payload
  context?: {                  // Optional metadata
    correlationId?: string;
    clientVersion?: string;
  };
}

// Response structure (success)
interface RPCSuccessResponse<T = unknown> {
  success: true;
  data: T;
  metadata?: {
    timestamp: number;
    requestId: string;
  };
}

// Response structure (error)
interface RPCErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;            // Development only
  };
  metadata?: {
    timestamp: number;
    requestId: string;
  };
}

type RPCResponse<T = unknown> = RPCSuccessResponse<T> | RPCErrorResponse;
```

### Endpoint Organization

All RPC procedures are namespaced by domain:

```
/api/rpc
  ├── auth.*              Authentication & session management
  ├── user.*              User profile operations
  ├── post.*              Content creation & management
  ├── feed.*              Feed generation & filtering
  ├── social.*            Follow/friend operations
  ├── discovery.*         Search & recommendation
  ├── message.*           Direct messaging
  ├── notification.*      Notification management
  ├── media.*             File upload & management
  └── settings.*          Account settings
```

---

## Type-Safe Contract System

### Shared Type Definitions

Create a shared types package that both frontend and backend import:

```typescript
// packages/api-contracts/src/index.ts

// Base types
export type UserId = string & { __brand: 'UserId' };
export type PostId = string & { __brand: 'PostId' };
export type MediaId = string & { __brand: 'MediaId' };

// Domain entities
export interface User {
  id: UserId;
  username: string;
  displayName: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: PostId;
  authorId: UserId;
  type: 'text' | 'image' | 'video' | 'song';
  content: string;
  mediaIds?: MediaId[];
  visibility: 'public' | 'followers' | 'private';
  createdAt: Date;
  updatedAt: Date;
  stats: {
    likes: number;
    comments: number;
    reposts: number;
  };
}

export interface ProfileStyle {
  backgroundColor?: string;
  backgroundImage?: MediaId;
  backgroundMusic?: MediaId;
  fontFamily?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface ProfileSection {
  id: string;
  type: 'feed' | 'gallery' | 'links' | 'text' | 'image' | 'video' | 'friends';
  title?: string;
  config: Record<string, unknown>;
  order: number;
}

// Procedure definitions
export namespace AuthProcedures {
  export interface Register {
    input: {
      username: string;
      email: string;
      password: string;
    };
    output: {
      user: User;
      sessionToken: string;
    };
  }

  export interface Login {
    input: {
      email: string;
      password: string;
    };
    output: {
      user: User;
      sessionToken: string;
    };
  }

  export interface GetSession {
    input: void;
    output: {
      user: User;
      expiresAt: Date;
    };
  }

  export interface Logout {
    input: void;
    output: {
      success: true;
    };
  }
}

export namespace UserProcedures {
  export interface GetProfile {
    input: {
      username: string;
    };
    output: {
      user: User;
      style: ProfileStyle;
      sections: ProfileSection[];
    };
  }

  export interface UpdateProfile {
    input: {
      displayName?: string;
      bio?: string;
      avatarUrl?: string;
    };
    output: {
      user: User;
    };
  }

  export interface UpdateStyle {
    input: ProfileStyle;
    output: {
      style: ProfileStyle;
    };
  }

  export interface UpdateSections {
    input: {
      sections: ProfileSection[];
    };
    output: {
      sections: ProfileSection[];
    };
  }
}

export namespace PostProcedures {
  export interface Create {
    input: {
      type: Post['type'];
      content: string;
      mediaIds?: MediaId[];
      visibility?: Post['visibility'];
    };
    output: {
      post: Post;
    };
  }

  export interface GetById {
    input: {
      postId: PostId;
    };
    output: {
      post: Post;
      author: User;
    };
  }

  export interface Update {
    input: {
      postId: PostId;
      content?: string;
      visibility?: Post['visibility'];
    };
    output: {
      post: Post;
    };
  }

  export interface Delete {
    input: {
      postId: PostId;
    };
    output: {
      success: true;
    };
  }

  export interface GetComments {
    input: {
      postId: PostId;
      limit?: number;
      cursor?: string;
    };
    output: {
      comments: Post[];
      nextCursor?: string;
    };
  }
}

export namespace FeedProcedures {
  export interface GetFeed {
    input: {
      feedId?: string;      // Custom feed ID, or default timeline
      limit?: number;
      cursor?: string;
    };
    output: {
      posts: Post[];
      nextCursor?: string;
    };
  }

  export interface CreateFeed {
    input: {
      name: string;
      filters: FeedFilter[];
    };
    output: {
      feed: CustomFeed;
    };
  }

  export interface UpdateFeed {
    input: {
      feedId: string;
      name?: string;
      filters?: FeedFilter[];
    };
    output: {
      feed: CustomFeed;
    };
  }
}

export namespace SocialProcedures {
  export interface Follow {
    input: {
      userId: UserId;
    };
    output: {
      following: boolean;
    };
  }

  export interface Unfollow {
    input: {
      userId: UserId;
    };
    output: {
      following: false;
    };
  }

  export interface GetFollowers {
    input: {
      userId?: UserId;      // Defaults to current user
      limit?: number;
      cursor?: string;
    };
    output: {
      followers: User[];
      nextCursor?: string;
    };
  }

  export interface GetFollowing {
    input: {
      userId?: UserId;
      limit?: number;
      cursor?: string;
    };
    output: {
      following: User[];
      nextCursor?: string;
    };
  }

  export interface SendFriendRequest {
    input: {
      userId: UserId;
    };
    output: {
      requestId: string;
      status: 'pending';
    };
  }

  export interface RespondToFriendRequest {
    input: {
      requestId: string;
      accept: boolean;
    };
    output: {
      status: 'accepted' | 'rejected';
    };
  }
}

export namespace DiscoveryProcedures {
  export interface SearchUsers {
    input: {
      query: string;
      limit?: number;
    };
    output: {
      users: User[];
    };
  }

  export interface GetDiscoverFeed {
    input: {
      algorithmId?: string;
      limit?: number;
      cursor?: string;
    };
    output: {
      posts: Post[];
      nextCursor?: string;
    };
  }
}

export namespace MessageProcedures {
  export interface SendMessage {
    input: {
      recipientId: UserId;
      content: string;
      mediaIds?: MediaId[];
    };
    output: {
      message: Message;
    };
  }

  export interface GetConversations {
    input: {
      limit?: number;
      cursor?: string;
    };
    output: {
      conversations: Conversation[];
      nextCursor?: string;
    };
  }

  export interface GetMessages {
    input: {
      conversationId: string;
      limit?: number;
      cursor?: string;
    };
    output: {
      messages: Message[];
      nextCursor?: string;
    };
  }
}

export namespace NotificationProcedures {
  export interface GetNotifications {
    input: {
      limit?: number;
      cursor?: string;
    };
    output: {
      notifications: Notification[];
      nextCursor?: string;
      unreadCount: number;
    };
  }

  export interface MarkAsRead {
    input: {
      notificationIds: string[];
    };
    output: {
      success: true;
    };
  }
}

export namespace MediaProcedures {
  export interface InitiateUpload {
    input: {
      filename: string;
      contentType: string;
      size: number;
    };
    output: {
      uploadId: string;
      uploadUrl: string;      // Pre-signed URL for S3
      mediaId: MediaId;
    };
  }

  export interface CompleteUpload {
    input: {
      uploadId: string;
      mediaId: MediaId;
    };
    output: {
      media: Media;
    };
  }

  export interface GetStorageUsage {
    input: void;
    output: {
      used: number;           // bytes
      limit: number;          // bytes
      percentage: number;
    };
  }

  export interface DeleteMedia {
    input: {
      mediaId: MediaId;
    };
    output: {
      success: true;
    };
  }
}

export namespace SettingsProcedures {
  export interface UpdateAccount {
    input: {
      username?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };
    output: {
      user: User;
    };
  }

  export interface UpdatePrivacy {
    input: {
      profileVisibility: 'public' | 'followers' | 'private';
      allowMessagesFrom: 'everyone' | 'followers' | 'friends';
      showFollowers: boolean;
    };
    output: {
      settings: PrivacySettings;
    };
  }

  export interface DeleteAccount {
    input: {
      password: string;
      confirmation: 'DELETE_MY_ACCOUNT';
    };
    output: {
      success: true;
    };
  }
}

// Supporting types
export interface CustomFeed {
  id: string;
  name: string;
  filters: FeedFilter[];
  createdAt: Date;
}

export interface FeedFilter {
  type: 'author' | 'postType' | 'tag' | 'dateRange';
  operator: 'include' | 'exclude';
  value: unknown;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: UserId;
  content: string;
  mediaIds?: MediaId[];
  createdAt: Date;
  readAt?: Date;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage: Message;
  unreadCount: number;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'friend_request' | 'mention';
  actorId: UserId;
  targetId?: PostId | UserId;
  content: string;
  read: boolean;
  createdAt: Date;
}

export interface Media {
  id: MediaId;
  ownerId: UserId;
  type: 'image' | 'video' | 'audio';
  url: string;
  thumbnailUrl?: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface PrivacySettings {
  profileVisibility: 'public' | 'followers' | 'private';
  allowMessagesFrom: 'everyone' | 'followers' | 'friends';
  showFollowers: boolean;
}
```

### Error Codes

```typescript
// packages/api-contracts/src/errors.ts

export enum ErrorCode {
  // Authentication errors (1000-1099)
  UNAUTHORIZED = 1000,
  INVALID_CREDENTIALS = 1001,
  SESSION_EXPIRED = 1002,
  INVALID_TOKEN = 1003,

  // Authorization errors (1100-1199)
  FORBIDDEN = 1100,
  INSUFFICIENT_PERMISSIONS = 1101,

  // Validation errors (1200-1299)
  VALIDATION_ERROR = 1200,
  INVALID_INPUT = 1201,
  MISSING_REQUIRED_FIELD = 1202,
  INVALID_FORMAT = 1203,

  // Resource errors (1300-1399)
  NOT_FOUND = 1300,
  RESOURCE_NOT_FOUND = 1301,
  USER_NOT_FOUND = 1302,
  POST_NOT_FOUND = 1303,

  // Conflict errors (1400-1499)
  CONFLICT = 1400,
  DUPLICATE_USERNAME = 1401,
  DUPLICATE_EMAIL = 1402,
  ALREADY_FOLLOWING = 1403,

  // Rate limiting (1500-1599)
  RATE_LIMIT_EXCEEDED = 1500,
  TOO_MANY_REQUESTS = 1501,

  // Storage errors (1600-1699)
  STORAGE_LIMIT_EXCEEDED = 1600,
  INVALID_FILE_TYPE = 1601,
  FILE_TOO_LARGE = 1602,

  // Server errors (1900-1999)
  INTERNAL_SERVER_ERROR = 1900,
  DATABASE_ERROR = 1901,
  EXTERNAL_SERVICE_ERROR = 1902,

  // Unknown
  UNKNOWN_ERROR = 9999,
}

export class RPCError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'RPCError';
  }
}
```

---

## Backend Implementation

### Hono Server Setup

```typescript
// apps/api/src/index.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rpcRouter } from './rpc/router';
import { authMiddleware } from './middleware/auth';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

// RPC endpoint
app.post('/api/rpc', authMiddleware, rpcRouter);

export default {
  port: process.env.PORT || 3001,
  fetch: app.fetch,
};
```

### RPC Router

```typescript
// apps/api/src/rpc/router.ts

import type { Context } from 'hono';
import { authRouter } from './routers/auth';
import { userRouter } from './routers/user';
import { postRouter } from './routers/post';
import { feedRouter } from './routers/feed';
import { socialRouter } from './routers/social';
import { discoveryRouter } from './routers/discovery';
import { messageRouter } from './routers/message';
import { notificationRouter } from './routers/notification';
import { mediaRouter } from './routers/media';
import { settingsRouter } from './routers/settings';
import { RPCError, ErrorCode } from '@vrss/api-contracts';
import type { RPCRequest, RPCResponse } from '@vrss/api-contracts';

// Procedure registry
const procedures = {
  ...authRouter,
  ...userRouter,
  ...postRouter,
  ...feedRouter,
  ...socialRouter,
  ...discoveryRouter,
  ...messageRouter,
  ...notificationRouter,
  ...mediaRouter,
  ...settingsRouter,
};

export type ProcedureMap = typeof procedures;

export async function rpcRouter(c: Context) {
  try {
    const request = await c.req.json() as RPCRequest;
    const { procedure, input, context: reqContext } = request;

    // Generate request ID
    const requestId = crypto.randomUUID();

    // Find procedure handler
    const handler = procedures[procedure as keyof typeof procedures];

    if (!handler) {
      throw new RPCError(
        ErrorCode.NOT_FOUND,
        `Procedure '${procedure}' not found`
      );
    }

    // Execute procedure
    const result = await handler({
      input,
      user: c.get('user'),
      requestId,
      correlationId: reqContext?.correlationId,
    });

    // Success response
    const response: RPCResponse = {
      success: true,
      data: result,
      metadata: {
        timestamp: Date.now(),
        requestId,
      },
    };

    return c.json(response);

  } catch (error) {
    // Error handling
    const isDev = process.env.NODE_ENV === 'development';

    if (error instanceof RPCError) {
      const response: RPCResponse = {
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          stack: isDev ? error.stack : undefined,
        },
        metadata: {
          timestamp: Date.now(),
          requestId: crypto.randomUUID(),
        },
      };

      return c.json(response, 400);
    }

    // Unknown error
    console.error('Unexpected error:', error);

    const response: RPCResponse = {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: isDev ? (error as Error).message : 'An unexpected error occurred',
        stack: isDev ? (error as Error).stack : undefined,
      },
      metadata: {
        timestamp: Date.now(),
        requestId: crypto.randomUUID(),
      },
    };

    return c.json(response, 500);
  }
}
```

### Example Procedure Router

```typescript
// apps/api/src/rpc/routers/user.ts

import type { UserProcedures } from '@vrss/api-contracts';
import { RPCError, ErrorCode } from '@vrss/api-contracts';
import { db } from '../../db';
import type { ProcedureContext } from '../types';

export const userRouter = {
  'user.getProfile': async (ctx: ProcedureContext<UserProcedures.GetProfile['input']>) => {
    const { username } = ctx.input;

    const user = await db.user.findUnique({
      where: { username },
      include: {
        style: true,
        sections: true,
      },
    });

    if (!user) {
      throw new RPCError(
        ErrorCode.USER_NOT_FOUND,
        `User '${username}' not found`
      );
    }

    return {
      user,
      style: user.style,
      sections: user.sections,
    } satisfies UserProcedures.GetProfile['output'];
  },

  'user.updateProfile': async (ctx: ProcedureContext<UserProcedures.UpdateProfile['input']>) => {
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const { displayName, bio, avatarUrl } = ctx.input;

    const user = await db.user.update({
      where: { id: ctx.user.id },
      data: {
        displayName,
        bio,
        avatarUrl,
        updatedAt: new Date(),
      },
    });

    return { user } satisfies UserProcedures.UpdateProfile['output'];
  },

  'user.updateStyle': async (ctx: ProcedureContext<UserProcedures.UpdateStyle['input']>) => {
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const style = await db.profileStyle.upsert({
      where: { userId: ctx.user.id },
      update: ctx.input,
      create: {
        userId: ctx.user.id,
        ...ctx.input,
      },
    });

    return { style } satisfies UserProcedures.UpdateStyle['output'];
  },

  'user.updateSections': async (ctx: ProcedureContext<UserProcedures.UpdateSections['input']>) => {
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const { sections } = ctx.input;

    // Delete existing sections
    await db.profileSection.deleteMany({
      where: { userId: ctx.user.id },
    });

    // Create new sections
    const created = await db.profileSection.createMany({
      data: sections.map(section => ({
        ...section,
        userId: ctx.user!.id,
      })),
    });

    const updatedSections = await db.profileSection.findMany({
      where: { userId: ctx.user.id },
      orderBy: { order: 'asc' },
    });

    return { sections: updatedSections } satisfies UserProcedures.UpdateSections['output'];
  },
};
```

### Procedure Context Type

```typescript
// apps/api/src/rpc/types.ts

import type { User } from '@vrss/api-contracts';

export interface ProcedureContext<TInput = unknown> {
  input: TInput;
  user?: User;
  requestId: string;
  correlationId?: string;
}

export type ProcedureHandler<TInput, TOutput> = (
  ctx: ProcedureContext<TInput>
) => Promise<TOutput>;
```

---

## Authentication Integration

### Better-auth Setup

```typescript
// apps/api/src/auth/config.ts

import { betterAuth } from 'better-auth';
import { db } from '../db/client';

export const auth = betterAuth({
  database: db,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Enable in production
  },
  session: {
    cookieName: 'vrss_session',
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  socialProviders: {
    // Can add OAuth providers later
  },
});

export type Auth = typeof auth;
```

### Auth Middleware

```typescript
// apps/api/src/middleware/auth.ts

import type { Context, Next } from 'hono';
import { auth } from '../auth/config';

// Public procedures that don't require authentication
const PUBLIC_PROCEDURES = new Set([
  'auth.register',
  'auth.login',
  'user.getProfile',
  'post.getById',
  'discovery.searchUsers',
  'discovery.getDiscoverFeed',
]);

export async function authMiddleware(c: Context, next: Next) {
  // Get session token from cookie or header
  const token = c.req.header('Authorization')?.replace('Bearer ', '')
    || c.req.cookie('vrss_session');

  if (token) {
    try {
      const session = await auth.api.getSession({
        headers: c.req.raw.headers,
      });

      if (session) {
        c.set('user', session.user);
        c.set('session', session);
      }
    } catch (error) {
      console.error('Session validation error:', error);
    }
  }

  // Check if procedure requires authentication
  const body = await c.req.text();
  let procedure: string | undefined;

  try {
    const json = JSON.parse(body);
    procedure = json.procedure;
  } catch {
    // Invalid JSON - will be caught by router
  }

  if (procedure && !PUBLIC_PROCEDURES.has(procedure) && !c.get('user')) {
    return c.json({
      success: false,
      error: {
        code: 1000,
        message: 'Authentication required',
      },
    }, 401);
  }

  // Re-set body for downstream handlers
  c.req.raw = new Request(c.req.raw, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body,
  });

  await next();
}
```

### Auth Router

```typescript
// apps/api/src/rpc/routers/auth.ts

import type { AuthProcedures } from '@vrss/api-contracts';
import { RPCError, ErrorCode } from '@vrss/api-contracts';
import { auth } from '../../auth/config';
import type { ProcedureContext } from '../types';

export const authRouter = {
  'auth.register': async (ctx: ProcedureContext<AuthProcedures.Register['input']>) => {
    const { username, email, password } = ctx.input;

    // Validate input
    if (password.length < 8) {
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        'Password must be at least 8 characters'
      );
    }

    try {
      const result = await auth.api.signUp.email({
        body: {
          email,
          password,
          name: username,
        },
      });

      return {
        user: result.user,
        sessionToken: result.session.token,
      } satisfies AuthProcedures.Register['output'];

    } catch (error) {
      if ((error as Error).message.includes('already exists')) {
        throw new RPCError(
          ErrorCode.DUPLICATE_EMAIL,
          'Email already registered'
        );
      }
      throw error;
    }
  },

  'auth.login': async (ctx: ProcedureContext<AuthProcedures.Login['input']>) => {
    const { email, password } = ctx.input;

    try {
      const result = await auth.api.signIn.email({
        body: { email, password },
      });

      return {
        user: result.user,
        sessionToken: result.session.token,
      } satisfies AuthProcedures.Login['output'];

    } catch (error) {
      throw new RPCError(
        ErrorCode.INVALID_CREDENTIALS,
        'Invalid email or password'
      );
    }
  },

  'auth.getSession': async (ctx: ProcedureContext<void>) => {
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'No active session');
    }

    // Session is already validated by middleware
    return {
      user: ctx.user,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    } satisfies AuthProcedures.GetSession['output'];
  },

  'auth.logout': async (ctx: ProcedureContext<void>) => {
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'Not logged in');
    }

    await auth.api.signOut({
      headers: new Headers(),
    });

    return { success: true } satisfies AuthProcedures.Logout['output'];
  },
};
```

---

## File Upload Strategy

### Two-Phase Upload Pattern

VRSS uses a two-phase upload strategy to handle large files efficiently:

1. **Initiate Upload**: Client requests upload URL and mediaId
2. **Direct Upload**: Client uploads directly to S3 using pre-signed URL
3. **Complete Upload**: Client confirms completion, server validates

```typescript
// apps/api/src/rpc/routers/media.ts

import type { MediaProcedures } from '@vrss/api-contracts';
import { RPCError, ErrorCode } from '@vrss/api-contracts';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { db } from '../../db';
import type { ProcedureContext } from '../types';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  audio: ['audio/mpeg', 'audio/wav', 'audio/ogg'],
};

const MAX_FILE_SIZE = {
  free: 50 * 1024 * 1024,      // 50MB for free users
  paid: 1024 * 1024 * 1024,    // 1GB for paid users
};

export const mediaRouter = {
  'media.initiateUpload': async (
    ctx: ProcedureContext<MediaProcedures.InitiateUpload['input']>
  ) => {
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const { filename, contentType, size } = ctx.input;

    // Check file type
    const mediaType = Object.entries(ALLOWED_TYPES).find(([_, types]) =>
      types.includes(contentType)
    )?.[0];

    if (!mediaType) {
      throw new RPCError(
        ErrorCode.INVALID_FILE_TYPE,
        `File type ${contentType} is not supported`
      );
    }

    // Check storage quota
    const usage = await db.media.aggregate({
      where: { ownerId: ctx.user.id },
      _sum: { size: true },
    });

    const currentUsage = usage._sum.size || 0;
    const limit = ctx.user.isPaid ? MAX_FILE_SIZE.paid : MAX_FILE_SIZE.free;

    if (currentUsage + size > limit) {
      throw new RPCError(
        ErrorCode.STORAGE_LIMIT_EXCEEDED,
        'Storage limit exceeded. Upgrade for more space.'
      );
    }

    // Generate IDs
    const uploadId = crypto.randomUUID();
    const mediaId = crypto.randomUUID() as MediaId;
    const key = `media/${ctx.user.id}/${mediaId}/${filename}`;

    // Create pre-signed URL
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 3600, // 1 hour
    });

    // Create pending media record
    await db.media.create({
      data: {
        id: mediaId,
        ownerId: ctx.user.id,
        type: mediaType as 'image' | 'video' | 'audio',
        url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`,
        size,
        mimeType: contentType,
        status: 'pending',
        uploadId,
      },
    });

    return {
      uploadId,
      uploadUrl,
      mediaId,
    } satisfies MediaProcedures.InitiateUpload['output'];
  },

  'media.completeUpload': async (
    ctx: ProcedureContext<MediaProcedures.CompleteUpload['input']>
  ) => {
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const { uploadId, mediaId } = ctx.input;

    const media = await db.media.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.uploadId !== uploadId || media.ownerId !== ctx.user.id) {
      throw new RPCError(ErrorCode.NOT_FOUND, 'Invalid upload');
    }

    // Update status to completed
    const updated = await db.media.update({
      where: { id: mediaId },
      data: {
        status: 'completed',
        uploadId: null,
      },
    });

    return { media: updated } satisfies MediaProcedures.CompleteUpload['output'];
  },

  'media.getStorageUsage': async (ctx: ProcedureContext<void>) => {
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const usage = await db.media.aggregate({
      where: {
        ownerId: ctx.user.id,
        status: 'completed',
      },
      _sum: { size: true },
    });

    const used = usage._sum.size || 0;
    const limit = ctx.user.isPaid ? MAX_FILE_SIZE.paid : MAX_FILE_SIZE.free;
    const percentage = (used / limit) * 100;

    return {
      used,
      limit,
      percentage,
    } satisfies MediaProcedures.GetStorageUsage['output'];
  },

  'media.deleteMedia': async (
    ctx: ProcedureContext<MediaProcedures.DeleteMedia['input']>
  ) => {
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const { mediaId } = ctx.input;

    const media = await db.media.findUnique({
      where: { id: mediaId },
    });

    if (!media || media.ownerId !== ctx.user.id) {
      throw new RPCError(ErrorCode.FORBIDDEN, 'Access denied');
    }

    // Delete from S3
    const key = new URL(media.url).pathname.slice(1);
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET!,
      Key: key,
    }));

    // Delete from database
    await db.media.delete({
      where: { id: mediaId },
    });

    return { success: true } satisfies MediaProcedures.DeleteMedia['output'];
  },
};
```

---

## Frontend Client

### Type-Safe RPC Client

```typescript
// packages/api-client/src/index.ts

import type { RPCRequest, RPCResponse } from '@vrss/api-contracts';
import { ErrorCode } from '@vrss/api-contracts';

export class RPCClient {
  private baseUrl: string;
  private token?: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = undefined;
  }

  async call<TInput, TOutput>(
    procedure: string,
    input: TInput,
    options?: {
      correlationId?: string;
    }
  ): Promise<TOutput> {
    const request: RPCRequest<TInput> = {
      procedure,
      input,
      context: {
        correlationId: options?.correlationId,
        clientVersion: '1.0.0',
      },
    };

    const response = await fetch(`${this.baseUrl}/api/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      credentials: 'include',
      body: JSON.stringify(request),
    });

    const data: RPCResponse<TOutput> = await response.json();

    if (!data.success) {
      throw new ClientRPCError(
        data.error.code,
        data.error.message,
        data.error.details
      );
    }

    return data.data;
  }
}

export class ClientRPCError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ClientRPCError';
  }

  isAuthError() {
    return this.code >= 1000 && this.code < 1100;
  }

  isValidationError() {
    return this.code >= 1200 && this.code < 1300;
  }

  isNotFoundError() {
    return this.code >= 1300 && this.code < 1400;
  }
}

// Create typed client instance
export const apiClient = new RPCClient(
  import.meta.env.VITE_API_URL || 'http://localhost:3001'
);
```

### Typed API Hooks

```typescript
// apps/pwa/src/api/hooks.ts

import { apiClient } from '@vrss/api-client';
import type { AuthProcedures, UserProcedures, PostProcedures } from '@vrss/api-contracts';

// Auth hooks
export const useAuth = () => {
  return {
    register: (input: AuthProcedures.Register['input']) =>
      apiClient.call<
        AuthProcedures.Register['input'],
        AuthProcedures.Register['output']
      >('auth.register', input),

    login: (input: AuthProcedures.Login['input']) =>
      apiClient.call<
        AuthProcedures.Login['input'],
        AuthProcedures.Login['output']
      >('auth.login', input),

    logout: () =>
      apiClient.call<void, AuthProcedures.Logout['output']>('auth.logout', undefined),

    getSession: () =>
      apiClient.call<void, AuthProcedures.GetSession['output']>('auth.getSession', undefined),
  };
};

// User hooks
export const useUser = () => {
  return {
    getProfile: (username: string) =>
      apiClient.call<
        UserProcedures.GetProfile['input'],
        UserProcedures.GetProfile['output']
      >('user.getProfile', { username }),

    updateProfile: (input: UserProcedures.UpdateProfile['input']) =>
      apiClient.call<
        UserProcedures.UpdateProfile['input'],
        UserProcedures.UpdateProfile['output']
      >('user.updateProfile', input),

    updateStyle: (input: UserProcedures.UpdateStyle['input']) =>
      apiClient.call<
        UserProcedures.UpdateStyle['input'],
        UserProcedures.UpdateStyle['output']
      >('user.updateStyle', input),
  };
};

// Post hooks
export const usePost = () => {
  return {
    create: (input: PostProcedures.Create['input']) =>
      apiClient.call<
        PostProcedures.Create['input'],
        PostProcedures.Create['output']
      >('post.create', input),

    getById: (postId: string) =>
      apiClient.call<
        PostProcedures.GetById['input'],
        PostProcedures.GetById['output']
      >('post.getById', { postId }),

    update: (input: PostProcedures.Update['input']) =>
      apiClient.call<
        PostProcedures.Update['input'],
        PostProcedures.Update['output']
      >('post.update', input),

    delete: (postId: string) =>
      apiClient.call<
        PostProcedures.Delete['input'],
        PostProcedures.Delete['output']
      >('post.delete', { postId }),
  };
};
```

### Usage Example

```typescript
// apps/pwa/src/components/LoginForm.tsx

import { useState } from 'react';
import { useAuth } from '../api/hooks';
import { apiClient, ClientRPCError } from '@vrss/api-client';

export function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const auth = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await auth.login({ email, password });

      // Store token
      apiClient.setToken(result.sessionToken);
      localStorage.setItem('sessionToken', result.sessionToken);

      // Redirect to home
      window.location.href = '/home';

    } catch (err) {
      if (err instanceof ClientRPCError) {
        if (err.code === 1001) {
          setError('Invalid email or password');
        } else {
          setError(err.message);
        }
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Log In'}
      </button>
    </form>
  );
}
```

---

## Rate Limiting

### Rate Limit Middleware

```typescript
// apps/api/src/middleware/rateLimit.ts

import type { Context, Next } from 'hono';
import { RPCError, ErrorCode } from '@vrss/api-contracts';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// In-memory store (use Redis in production)
const requests = new Map<string, number[]>();

const LIMITS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60_000, maxRequests: 60 },       // 60/min
  'auth.login': { windowMs: 60_000, maxRequests: 5 },   // 5/min
  'auth.register': { windowMs: 3600_000, maxRequests: 3 }, // 3/hour
  'post.create': { windowMs: 60_000, maxRequests: 10 },  // 10/min
  'media.initiateUpload': { windowMs: 60_000, maxRequests: 10 }, // 10/min
};

export function createRateLimiter() {
  return async (c: Context, next: Next) => {
    const userId = c.get('user')?.id || c.req.header('x-forwarded-for') || 'anonymous';

    const body = await c.req.text();
    let procedure: string | undefined;

    try {
      const json = JSON.parse(body);
      procedure = json.procedure;
    } catch {
      // Invalid JSON
    }

    if (procedure) {
      const limit = LIMITS[procedure] || LIMITS.default;
      const key = `${userId}:${procedure}`;

      const now = Date.now();
      const windowStart = now - limit.windowMs;

      // Get request timestamps for this key
      let timestamps = requests.get(key) || [];

      // Remove old timestamps
      timestamps = timestamps.filter(ts => ts > windowStart);

      if (timestamps.length >= limit.maxRequests) {
        throw new RPCError(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Too many requests. Please try again later.'
        );
      }

      // Add current request
      timestamps.push(now);
      requests.set(key, timestamps);
    }

    // Re-set body
    c.req.raw = new Request(c.req.raw, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body,
    });

    await next();
  };
}
```

---

## API Versioning Strategy

### Version Header Approach

```typescript
// apps/api/src/middleware/version.ts

import type { Context, Next } from 'hono';

const CURRENT_VERSION = 'v1';
const SUPPORTED_VERSIONS = ['v1'];

export async function versionMiddleware(c: Context, next: Next) {
  const version = c.req.header('API-Version') || CURRENT_VERSION;

  if (!SUPPORTED_VERSIONS.includes(version)) {
    return c.json({
      success: false,
      error: {
        code: 1200,
        message: `API version '${version}' is not supported`,
        details: {
          supportedVersions: SUPPORTED_VERSIONS,
        },
      },
    }, 400);
  }

  c.set('apiVersion', version);
  await next();
}
```

### Version-Specific Handlers

```typescript
// apps/api/src/rpc/routers/user.ts

import type { UserProcedures } from '@vrss/api-contracts';
import type { ProcedureContext } from '../types';

// Support multiple versions of the same procedure
export const userRouter = {
  'user.getProfile': async (ctx: ProcedureContext<UserProcedures.GetProfile['input']>) => {
    const version = ctx.apiVersion || 'v1';

    switch (version) {
      case 'v1':
        return getProfileV1(ctx);
      default:
        return getProfileV1(ctx);
    }
  },
};

async function getProfileV1(ctx: ProcedureContext<UserProcedures.GetProfile['input']>) {
  // V1 implementation
  // ...
}
```

### Deprecation Warnings

```typescript
// Add deprecation warnings in responses

const response: RPCResponse = {
  success: true,
  data: result,
  metadata: {
    timestamp: Date.now(),
    requestId,
    deprecation: {
      version: 'v1',
      sunset: '2025-12-31',
      message: 'This version will be deprecated. Please migrate to v2.',
      migrationGuide: 'https://docs.vrss.app/api/migration/v1-to-v2',
    },
  },
};
```

---

## Performance Considerations

### Pagination Pattern

All list endpoints use cursor-based pagination:

```typescript
interface PaginatedInput {
  limit?: number;      // Max 100, default 20
  cursor?: string;     // Opaque cursor string
}

interface PaginatedOutput<T> {
  items: T[];
  nextCursor?: string; // Undefined if no more results
  hasMore: boolean;
}
```

### Caching Strategy

```typescript
// apps/api/src/middleware/cache.ts

import type { Context, Next } from 'hono';

const CACHE_TTL: Record<string, number> = {
  'user.getProfile': 300,        // 5 minutes
  'post.getById': 60,            // 1 minute
  'feed.getFeed': 30,            // 30 seconds
  'discovery.getDiscoverFeed': 60, // 1 minute
};

export function createCacheMiddleware() {
  return async (c: Context, next: Next) => {
    // Only cache GET-like procedures
    const procedure = c.req.query('procedure');

    if (procedure && CACHE_TTL[procedure]) {
      const ttl = CACHE_TTL[procedure];
      c.header('Cache-Control', `public, max-age=${ttl}`);
    } else {
      c.header('Cache-Control', 'no-cache');
    }

    await next();
  };
}
```

### Request Batching (Future Enhancement)

```typescript
// Allow multiple procedures in one request

interface BatchRPCRequest {
  batch: Array<{
    id: string;
    procedure: string;
    input: unknown;
  }>;
}

interface BatchRPCResponse {
  results: Array<{
    id: string;
    success: boolean;
    data?: unknown;
    error?: RPCError;
  }>;
}
```

---

## Testing Strategy

### Unit Testing Procedures

```typescript
// apps/api/src/rpc/routers/__tests__/user.test.ts

import { describe, it, expect, beforeEach } from 'bun:test';
import { userRouter } from '../user';
import { db } from '../../../db';
import type { ProcedureContext } from '../../types';

describe('user.getProfile', () => {
  beforeEach(async () => {
    await db.user.deleteMany();
  });

  it('should return user profile', async () => {
    // Arrange
    const user = await db.user.create({
      data: {
        username: 'testuser',
        email: 'test@example.com',
        displayName: 'Test User',
      },
    });

    const ctx: ProcedureContext<{ username: string }> = {
      input: { username: 'testuser' },
      requestId: 'test-123',
    };

    // Act
    const result = await userRouter['user.getProfile'](ctx);

    // Assert
    expect(result.user.id).toBe(user.id);
    expect(result.user.username).toBe('testuser');
  });

  it('should throw error for non-existent user', async () => {
    const ctx: ProcedureContext<{ username: string }> = {
      input: { username: 'nonexistent' },
      requestId: 'test-123',
    };

    await expect(
      userRouter['user.getProfile'](ctx)
    ).rejects.toThrow('not found');
  });
});
```

### Integration Testing

```typescript
// apps/api/src/__tests__/integration/rpc.test.ts

import { describe, it, expect } from 'bun:test';

describe('RPC Integration', () => {
  it('should handle full auth flow', async () => {
    // Register
    const registerResponse = await fetch('http://localhost:3001/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procedure: 'auth.register',
        input: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        },
      }),
    });

    const registerData = await registerResponse.json();
    expect(registerData.success).toBe(true);
    expect(registerData.data.user.username).toBe('testuser');

    // Login
    const loginResponse = await fetch('http://localhost:3001/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procedure: 'auth.login',
        input: {
          email: 'test@example.com',
          password: 'password123',
        },
      }),
    });

    const loginData = await loginResponse.json();
    expect(loginData.success).toBe(true);
    expect(loginData.data.sessionToken).toBeDefined();
  });
});
```

---

## Project Structure

```
vrss/
├── packages/
│   ├── api-contracts/          # Shared types between frontend and backend
│   │   ├── src/
│   │   │   ├── index.ts        # All procedure type definitions
│   │   │   ├── errors.ts       # Error codes and RPCError class
│   │   │   └── types.ts        # Common types and entities
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api-client/             # Frontend RPC client
│       ├── src/
│       │   └── index.ts        # RPCClient class and utilities
│       ├── package.json
│       └── tsconfig.json
│
├── apps/
│   ├── api/                    # Backend API (Bun + Hono)
│   │   ├── src/
│   │   │   ├── index.ts        # App entry point
│   │   │   ├── auth/
│   │   │   │   └── config.ts   # Better-auth setup
│   │   │   ├── rpc/
│   │   │   │   ├── router.ts   # Main RPC router
│   │   │   │   ├── types.ts    # ProcedureContext, etc.
│   │   │   │   └── routers/
│   │   │   │       ├── auth.ts
│   │   │   │       ├── user.ts
│   │   │   │       ├── post.ts
│   │   │   │       ├── feed.ts
│   │   │   │       ├── social.ts
│   │   │   │       ├── discovery.ts
│   │   │   │       ├── message.ts
│   │   │   │       ├── notification.ts
│   │   │   │       ├── media.ts
│   │   │   │       └── settings.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts     # Authentication middleware
│   │   │   │   ├── rateLimit.ts
│   │   │   │   ├── version.ts
│   │   │   │   └── cache.ts
│   │   │   ├── db/
│   │   │   │   ├── client.ts   # Database client
│   │   │   │   └── schema.ts   # Prisma schema
│   │   │   └── __tests__/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── pwa/                    # Frontend PWA
│       ├── src/
│       │   ├── api/
│       │   │   └── hooks.ts    # Typed API hooks
│       │   └── components/
│       ├── package.json
│       └── tsconfig.json
│
└── docs/
    └── api-architecture.md     # This document
```

---

## Development Workflow

### 1. Define Type Contract

Add procedure definition to `packages/api-contracts/src/index.ts`:

```typescript
export namespace FeatureProcedures {
  export interface DoSomething {
    input: {
      field: string;
    };
    output: {
      result: string;
    };
  }
}
```

### 2. Implement Backend Handler

Add handler to appropriate router in `apps/api/src/rpc/routers/`:

```typescript
export const featureRouter = {
  'feature.doSomething': async (ctx: ProcedureContext<FeatureProcedures.DoSomething['input']>) => {
    const { field } = ctx.input;

    // Implementation

    return { result: 'done' } satisfies FeatureProcedures.DoSomething['output'];
  },
};
```

### 3. Create Frontend Hook

Add hook to `apps/pwa/src/api/hooks.ts`:

```typescript
export const useFeature = () => {
  return {
    doSomething: (field: string) =>
      apiClient.call<
        FeatureProcedures.DoSomething['input'],
        FeatureProcedures.DoSomething['output']
      >('feature.doSomething', { field }),
  };
};
```

### 4. Use in Component

```typescript
const feature = useFeature();
const result = await feature.doSomething('value');
```

---

## Security Considerations

1. **Input Validation**: Validate all inputs in procedure handlers using Zod or similar
2. **Authentication**: Use Better-auth for all auth flows, validate sessions in middleware
3. **Authorization**: Check user permissions in each procedure handler
4. **Rate Limiting**: Apply rate limits to prevent abuse
5. **CORS**: Configure CORS to only allow trusted origins
6. **SQL Injection**: Use Prisma's parameterized queries
7. **XSS**: Sanitize user-generated content before storage
8. **CSRF**: Use SameSite cookies and CSRF tokens
9. **File Uploads**: Validate file types, sizes, and scan for malware
10. **Secrets**: Never expose secrets in error messages or logs

---

## Monitoring & Logging

### Structured Logging

```typescript
// apps/api/src/utils/logger.ts

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },

  error: (message: string, error?: Error, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error?.message,
      stack: error?.stack,
      timestamp: new Date().toISOString(),
      ...meta,
    }));
  },
};
```

### Request Logging

```typescript
// apps/api/src/middleware/logging.ts

import type { Context, Next } from 'hono';
import { logger } from '../utils/logger';

export async function requestLogger(c: Context, next: Next) {
  const start = Date.now();
  const requestId = crypto.randomUUID();

  c.set('requestId', requestId);

  await next();

  const duration = Date.now() - start;

  logger.info('Request completed', {
    requestId,
    method: c.req.method,
    path: c.req.path,
    status: c.res.status,
    duration,
    userId: c.get('user')?.id,
  });
}
```

---

## Summary

This RPC-style API architecture for VRSS provides:

✅ **End-to-end type safety** between frontend and backend using shared contracts
✅ **Single endpoint pattern** with procedure-based routing (`/api/rpc`)
✅ **Consistent error handling** with standardized error codes
✅ **Authentication integration** with Better-auth
✅ **File upload strategy** using two-phase S3 uploads
✅ **Rate limiting** to prevent abuse
✅ **Versioning strategy** for API evolution
✅ **Developer-friendly** with auto-completion and type inference

The architecture is optimized for:
- **Bun runtime** performance characteristics
- **Hono framework** lightweight routing
- **PWA requirements** with offline-first considerations
- **Type safety** preventing runtime errors
- **Developer experience** with clear contracts and helpful errors

All MVP features are supported with clear extension points for future enhancements like request batching, WebSocket support, and advanced caching strategies.
