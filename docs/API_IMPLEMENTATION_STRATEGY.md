# VRSS RPC API Implementation Strategy

**Version**: 1.0
**Status**: Implementation Plan
**Last Updated**: 2025-10-16

## Executive Summary

This document provides a phased implementation strategy for building the VRSS RPC API with 10 routers and 50+ procedures. The strategy prioritizes type safety, testability, and progressive feature delivery while following the documented patterns in `/docs/api-architecture.md`.

**Target Architecture:**
- Single RPC endpoint: `POST /api/rpc`
- 10 procedure routers: auth, user, post, feed, social, discovery, message, notification, media, settings
- Type-safe contracts in `/packages/api-contracts/`
- Bun runtime with Hono framework
- Better-auth for authentication
- Zod validation, cursor-based pagination, rate limiting

---

## Table of Contents

1. [RPC Foundation](#1-rpc-foundation)
2. [Type Contracts Structure](#2-type-contracts-structure)
3. [Router Implementation Order](#3-router-implementation-order)
4. [Key Implementation Patterns](#4-key-implementation-patterns)
5. [Testing Strategy](#5-testing-strategy)
6. [API Documentation](#6-api-documentation)
7. [Implementation Timeline](#7-implementation-timeline)

---

## 1. RPC Foundation

### Phase 1A: Core RPC Infrastructure (Week 1, Days 1-2)

**Goal**: Establish the RPC router foundation with middleware stack

#### 1.1 Project Setup

```bash
# Backend API structure (already exists: /backend/)
backend/
├── src/
│   ├── index.ts                 # Bun server entry point
│   ├── rpc/
│   │   ├── router.ts           # Main RPC router
│   │   ├── types.ts            # ProcedureContext, handlers
│   │   └── routers/            # Individual routers (10 files)
│   ├── middleware/
│   │   ├── auth.ts             # Better-auth integration
│   │   ├── rateLimit.ts        # Rate limiting
│   │   ├── validation.ts       # Zod validation
│   │   ├── logging.ts          # Request logging
│   │   └── error.ts            # Error handling
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client
│   │   └── errors.ts           # Custom error classes
│   └── __tests__/              # Test suites
├── prisma/
│   └── schema.prisma           # Database schema
└── package.json
```

#### 1.2 Core RPC Router Implementation

**File**: `backend/src/rpc/router.ts`

```typescript
import type { Context } from 'hono';
import { RPCError, ErrorCode } from '@vrss/api-contracts';
import type { RPCRequest, RPCResponse } from '@vrss/api-contracts';

// Import all routers (implement in phases)
import { authRouter } from './routers/auth';
import { userRouter } from './routers/user';
// ... other routers

// Procedure registry - central mapping
const procedures = {
  ...authRouter,
  ...userRouter,
  // ... register as implemented
};

export type ProcedureMap = typeof procedures;

export async function rpcRouter(c: Context) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  try {
    // Parse request
    const request = await c.req.json() as RPCRequest;
    const { procedure, input, context: reqContext } = request;

    // Find procedure handler
    const handler = procedures[procedure as keyof typeof procedures];

    if (!handler) {
      throw new RPCError(
        ErrorCode.NOT_FOUND,
        `Procedure '${procedure}' not found`
      );
    }

    // Execute procedure with context
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
        duration: Date.now() - startTime,
      },
    };

    return c.json(response);

  } catch (error) {
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
          requestId,
          duration: Date.now() - startTime,
        },
      };

      // Map error codes to HTTP status
      const statusCode = getHttpStatus(error.code);
      return c.json(response, statusCode);
    }

    // Unknown error - log and sanitize
    console.error('Unexpected error:', error);

    const response: RPCResponse = {
      success: false,
      error: {
        code: ErrorCode.INTERNAL_SERVER_ERROR,
        message: isDev ? (error as Error).message : 'Internal server error',
        stack: isDev ? (error as Error).stack : undefined,
      },
      metadata: {
        timestamp: Date.now(),
        requestId,
        duration: Date.now() - startTime,
      },
    };

    return c.json(response, 500);
  }
}

function getHttpStatus(errorCode: ErrorCode): number {
  if (errorCode >= 1000 && errorCode < 1100) return 401; // Auth errors
  if (errorCode >= 1100 && errorCode < 1200) return 403; // Authorization
  if (errorCode >= 1200 && errorCode < 1300) return 400; // Validation
  if (errorCode >= 1300 && errorCode < 1400) return 404; // Not found
  if (errorCode >= 1400 && errorCode < 1500) return 409; // Conflict
  if (errorCode >= 1500 && errorCode < 1600) return 429; // Rate limit
  return 500; // Server errors
}
```

#### 1.3 Middleware Stack

**Middleware Order** (critical for RPC pattern):
1. **Logger** → Request logging
2. **CORS** → Cross-origin setup
3. **Auth** → Session validation (reads body)
4. **Rate Limit** → Request throttling (reads body)
5. **RPC Router** → Procedure execution

**File**: `backend/src/index.ts`

```typescript
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { rpcRouter } from './rpc/router';
import { authMiddleware } from './middleware/auth';
import { createRateLimiter } from './middleware/rateLimit';

const app = new Hono();

// 1. Logging (always first)
app.use('*', logger());

// 2. CORS configuration
app.use('*', cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// 3. Health check (no auth required)
app.get('/health', (c) => c.json({
  status: 'ok',
  timestamp: Date.now(),
  version: '1.0.0',
}));

// 4. RPC endpoint with middleware chain
app.post('/api/rpc',
  authMiddleware,        // Session validation
  createRateLimiter(),   // Rate limiting
  rpcRouter              // Procedure execution
);

// 5. 404 handler
app.notFound((c) => c.json({
  success: false,
  error: {
    code: ErrorCode.NOT_FOUND,
    message: 'Endpoint not found. Use POST /api/rpc',
  }
}, 404));

// Start server
export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
};
```

#### 1.4 Better-auth Integration

**File**: `backend/src/middleware/auth.ts`

```typescript
import type { Context, Next } from 'hono';
import { auth } from '../lib/auth';

// Public procedures that don't require authentication
const PUBLIC_PROCEDURES = new Set([
  'auth.register',
  'auth.login',
  'user.getProfile',        // View public profiles
  'post.getById',           // View public posts
  'discovery.searchUsers',  // Basic search
  'discovery.getDiscoverFeed',
]);

export async function authMiddleware(c: Context, next: Next) {
  // Get session from cookie or Authorization header
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

  // Parse body to check procedure
  const body = await c.req.text();
  let procedure: string | undefined;

  try {
    const json = JSON.parse(body);
    procedure = json.procedure;
  } catch {
    // Invalid JSON - will be caught by router
  }

  // Check authentication requirement
  if (procedure && !PUBLIC_PROCEDURES.has(procedure) && !c.get('user')) {
    return c.json({
      success: false,
      error: {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
      },
    }, 401);
  }

  // Restore request body for downstream handlers
  c.req.raw = new Request(c.req.raw, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body,
  });

  await next();
}
```

**Success Criteria for Phase 1A:**
- ✅ RPC router handles procedure dispatch
- ✅ Error handling with proper HTTP status codes
- ✅ Better-auth session validation
- ✅ Middleware stack properly ordered
- ✅ Health check endpoint functional
- ✅ Request/response logging

---

## 2. Type Contracts Structure

### Phase 1B: Shared Type System (Week 1, Days 2-3)

**Goal**: Create type-safe contracts for all 50+ procedures

#### 2.1 Package Structure

```bash
packages/
└── api-contracts/
    ├── src/
    │   ├── index.ts                 # Main export
    │   ├── errors.ts                # Error codes and RPCError
    │   ├── types.ts                 # Shared types (User, Post, etc.)
    │   ├── procedures/
    │   │   ├── auth.ts              # AuthProcedures namespace
    │   │   ├── user.ts              # UserProcedures namespace
    │   │   ├── post.ts              # PostProcedures namespace
    │   │   ├── feed.ts              # FeedProcedures namespace
    │   │   ├── social.ts            # SocialProcedures namespace
    │   │   ├── discovery.ts         # DiscoveryProcedures namespace
    │   │   ├── message.ts           # MessageProcedures namespace
    │   │   ├── notification.ts      # NotificationProcedures namespace
    │   │   ├── media.ts             # MediaProcedures namespace
    │   │   └── settings.ts          # SettingsProcedures namespace
    │   └── rpc.ts                   # RPC request/response types
    ├── package.json
    └── tsconfig.json
```

#### 2.2 Base RPC Types

**File**: `packages/api-contracts/src/rpc.ts`

```typescript
// RPC Request structure
export interface RPCRequest<T = unknown> {
  procedure: string;
  input: T;
  context?: {
    correlationId?: string;
    clientVersion?: string;
  };
}

// RPC Response (success)
export interface RPCSuccessResponse<T = unknown> {
  success: true;
  data: T;
  metadata?: {
    timestamp: number;
    requestId: string;
    duration?: number;
  };
}

// RPC Response (error)
export interface RPCErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
    stack?: string;
  };
  metadata?: {
    timestamp: number;
    requestId: string;
    duration?: number;
  };
}

export type RPCResponse<T = unknown> = RPCSuccessResponse<T> | RPCErrorResponse;
```

#### 2.3 Error Codes System

**File**: `packages/api-contracts/src/errors.ts`

```typescript
export enum ErrorCode {
  // Authentication (1000-1099)
  UNAUTHORIZED = 1000,
  INVALID_CREDENTIALS = 1001,
  SESSION_EXPIRED = 1002,
  INVALID_TOKEN = 1003,
  EMAIL_NOT_VERIFIED = 1004,

  // Authorization (1100-1199)
  FORBIDDEN = 1100,
  INSUFFICIENT_PERMISSIONS = 1101,
  RESOURCE_ACCESS_DENIED = 1102,

  // Validation (1200-1299)
  VALIDATION_ERROR = 1200,
  INVALID_INPUT = 1201,
  MISSING_REQUIRED_FIELD = 1202,
  INVALID_FORMAT = 1203,

  // Resources (1300-1399)
  NOT_FOUND = 1300,
  USER_NOT_FOUND = 1302,
  POST_NOT_FOUND = 1303,
  CONVERSATION_NOT_FOUND = 1304,

  // Conflicts (1400-1499)
  CONFLICT = 1400,
  DUPLICATE_USERNAME = 1401,
  DUPLICATE_EMAIL = 1402,
  ALREADY_FOLLOWING = 1403,
  ALREADY_FRIENDS = 1404,

  // Rate Limiting (1500-1599)
  RATE_LIMIT_EXCEEDED = 1500,
  TOO_MANY_REQUESTS = 1501,

  // Storage (1600-1699)
  STORAGE_LIMIT_EXCEEDED = 1600,
  INVALID_FILE_TYPE = 1601,
  FILE_TOO_LARGE = 1602,

  // Server (1900-1999)
  INTERNAL_SERVER_ERROR = 1900,
  DATABASE_ERROR = 1901,
  EXTERNAL_SERVICE_ERROR = 1902,

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

#### 2.4 Shared Domain Types

**File**: `packages/api-contracts/src/types.ts`

```typescript
// Brand types for type safety
export type UserId = string & { __brand: 'UserId' };
export type PostId = string & { __brand: 'PostId' };
export type MediaId = string & { __brand: 'MediaId' };
export type ConversationId = string & { __brand: 'ConversationId' };

// Core entities
export interface User {
  id: UserId;
  username: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Post {
  id: PostId;
  authorId: UserId;
  type: 'text_short' | 'text_long' | 'image' | 'image_gallery' | 'gif' | 'video_short' | 'video_long' | 'song' | 'album';
  status: 'draft' | 'published' | 'scheduled' | 'deleted';
  title?: string;
  content?: string;
  mediaUrls?: string[];
  thumbnailUrl?: string;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfileStyle {
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundMusic?: string;
  font?: string;
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

// Pagination
export interface CursorPaginationInput {
  limit?: number;
  cursor?: string;
}

export interface CursorPaginationOutput<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
}
```

#### 2.5 Procedure Type Pattern

**Example**: Auth procedures (`packages/api-contracts/src/procedures/auth.ts`)

```typescript
import type { User } from '../types';

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

  export interface RequestPasswordReset {
    input: {
      email: string;
    };
    output: {
      success: true;
    };
  }

  export interface ResetPassword {
    input: {
      token: string;
      newPassword: string;
    };
    output: {
      success: true;
    };
  }
}
```

**Success Criteria for Phase 1B:**
- ✅ All 50+ procedure types defined
- ✅ Shared domain types (User, Post, etc.)
- ✅ Error code enum complete
- ✅ Type-safe request/response structure
- ✅ Exported from single entry point

---

## 3. Router Implementation Order

### Dependency-Based Implementation Sequence

**Priority Levels:**
- **P0 Critical**: Core authentication and basic functionality
- **P1 High**: Core features for MVP
- **P2 Medium**: Enhanced features
- **P3 Low**: Nice-to-have features

### Phase 2: Core Routers (Week 1-2)

#### Phase 2A: Auth Router (P0 Critical) - Week 1, Days 3-4

**Router**: `auth` (6 procedures)

**Procedures:**
1. ✅ `auth.register` - User registration with email verification
2. ✅ `auth.login` - Email/password authentication
3. ✅ `auth.logout` - Session termination
4. ✅ `auth.getSession` - Current session validation
5. ✅ `auth.requestPasswordReset` - Password reset request
6. ✅ `auth.resetPassword` - Password reset confirmation

**Dependencies:** None (foundation router)

**Implementation File**: `backend/src/rpc/routers/auth.ts`

```typescript
import type { AuthProcedures } from '@vrss/api-contracts';
import { RPCError, ErrorCode } from '@vrss/api-contracts';
import { auth } from '../../lib/auth';
import { z } from 'zod';
import type { ProcedureContext } from '../types';

// Zod validation schemas
const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(12),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = {
  'auth.register': async (ctx: ProcedureContext<AuthProcedures.Register['input']>) => {
    // Validate input
    const validated = registerSchema.safeParse(ctx.input);
    if (!validated.success) {
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        { errors: validated.error.flatten() }
      );
    }

    const { username, email, password } = validated.data;

    try {
      // Create user with Better-auth
      const result = await auth.api.signUp.email({
        body: { email, password, name: username },
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
    const validated = loginSchema.safeParse(ctx.input);
    if (!validated.success) {
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        { errors: validated.error.flatten() }
      );
    }

    const { email, password } = validated.data;

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

  // ... other auth procedures
};
```

**Testing Requirements:**
- Unit tests for validation logic
- Integration tests for Better-auth flows
- Security tests for session handling

---

#### Phase 2B: User Router (P0 Critical) - Week 1, Days 4-5

**Router**: `user` (6 procedures)

**Procedures:**
1. ✅ `user.getProfile` - Fetch user profile (public)
2. ✅ `user.updateProfile` - Update profile info
3. ✅ `user.updateStyle` - Update profile styling (JSONB)
4. ✅ `user.updateSections` - Update profile layout
5. ✅ `user.getSettings` - Get user settings
6. ✅ `user.searchUsers` - Basic user search

**Dependencies:** Auth router (session validation)

**Key Patterns:**
- JSONB handling for `style_config`, `layout_config`
- Authorization: users can only edit own profiles
- Public profile visibility logic

---

#### Phase 2C: Post Router (P1 High) - Week 2, Days 1-2

**Router**: `post` (8 procedures)

**Procedures:**
1. ✅ `post.create` - Create new post
2. ✅ `post.getById` - Fetch single post
3. ✅ `post.update` - Update post content
4. ✅ `post.delete` - Soft delete post
5. ✅ `post.like` - Like/unlike post
6. ✅ `post.getComments` - Fetch comments (cursor pagination)
7. ✅ `post.createComment` - Add comment
8. ✅ `post.repost` - Repost content

**Dependencies:** User router (author data)

**Key Patterns:**
- Denormalized counters update (triggers)
- Media URL validation
- Cursor-based pagination for comments

---

### Phase 3: Social & Feed Routers (Week 2-3)

#### Phase 3A: Social Router (P1 High) - Week 2, Days 3-4

**Router**: `social` (6 procedures)

**Procedures:**
1. ✅ `social.follow` - Follow user
2. ✅ `social.unfollow` - Unfollow user
3. ✅ `social.getFollowers` - List followers (cursor pagination)
4. ✅ `social.getFollowing` - List following (cursor pagination)
5. ✅ `social.sendFriendRequest` - Send friend request
6. ✅ `social.respondToFriendRequest` - Accept/reject friend request

**Dependencies:** User router

**Key Patterns:**
- Mutual follow detection (friendship creation)
- Prevent duplicate follows
- Friend request state machine

---

#### Phase 3B: Feed Router (P1 High) - Week 2, Days 4-5

**Router**: `feed` (4 procedures)

**Procedures:**
1. ✅ `feed.getFeed` - Get feed (default or custom)
2. ✅ `feed.createFeed` - Create custom feed
3. ✅ `feed.updateFeed` - Update feed filters
4. ✅ `feed.deleteFeed` - Delete custom feed

**Dependencies:** Post router, Social router

**Key Patterns:**
- Feed algorithm builder (JSONB → SQL translation)
- Filter validation (types, operators)
- Query performance optimization
- Cursor pagination

**Feed Filter Implementation:**

```typescript
// Feed algorithm service
export class FeedBuilder {
  private userId: string;
  private filters: FeedFilter[];

  constructor(userId: string, filters: FeedFilter[]) {
    this.userId = userId;
    this.filters = filters;
  }

  async build(limit: number = 20, cursor?: string) {
    const where = this.buildWhereClause();

    const posts = await prisma.post.findMany({
      where,
      take: limit + 1,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore ? items[items.length - 1].id : undefined;

    return { posts: items, nextCursor, hasMore };
  }

  private buildWhereClause() {
    const conditions: any = { deletedAt: null };

    for (const filter of this.filters) {
      switch (filter.type) {
        case 'author':
          conditions.authorId = filter.operator === 'include'
            ? { in: filter.value as string[] }
            : { notIn: filter.value as string[] };
          break;

        case 'postType':
          conditions.type = filter.operator === 'include'
            ? { in: filter.value as string[] }
            : { notIn: filter.value as string[] };
          break;

        case 'tag':
          // Assuming tags stored in JSONB or array
          conditions.tags = filter.operator === 'include'
            ? { hasSome: filter.value as string[] }
            : { hasNone: filter.value as string[] };
          break;
      }
    }

    return conditions;
  }
}
```

---

### Phase 4: Enhanced Features (Week 3-4)

#### Phase 4A: Discovery Router (P2 Medium) - Week 3, Days 1-2

**Router**: `discovery` (3 procedures)

**Procedures:**
1. ✅ `discovery.searchUsers` - User search with fuzzy matching
2. ✅ `discovery.searchPosts` - Content search
3. ✅ `discovery.getDiscoverFeed` - Algorithmic discovery feed

**Dependencies:** Post, User, Social routers

**Key Patterns:**
- PostgreSQL `ILIKE` + `pg_trgm` for fuzzy search
- N-degree friend network algorithm
- Popularity scoring (likes_count weighting)

---

#### Phase 4B: Media Router (P1 High) - Week 3, Days 2-3

**Router**: `media` (4 procedures)

**Procedures:**
1. ✅ `media.initiateUpload` - Get presigned S3 URL
2. ✅ `media.completeUpload` - Confirm upload success
3. ✅ `media.getStorageUsage` - Storage quota info
4. ✅ `media.deleteMedia` - Remove media file

**Dependencies:** User router (quota checks)

**Key Patterns:**
- Two-phase S3 upload
- Storage quota enforcement (atomic checks)
- Presigned URL generation (1-hour expiry)
- File type validation by magic bytes

**Two-Phase Upload Flow:**

```typescript
// Phase 1: Initiate upload
'media.initiateUpload': async (ctx) => {
  const { filename, contentType, size } = ctx.input;

  // Check storage quota
  const usage = await prisma.media.aggregate({
    where: { ownerId: ctx.user.id },
    _sum: { size: true },
  });

  const currentUsage = usage._sum.size || 0;
  const limit = ctx.user.isPaid ? 1_000_000_000 : 50_000_000; // 1GB : 50MB

  if (currentUsage + size > limit) {
    throw new RPCError(
      ErrorCode.STORAGE_LIMIT_EXCEEDED,
      'Storage limit exceeded'
    );
  }

  // Generate presigned URL
  const uploadId = crypto.randomUUID();
  const mediaId = crypto.randomUUID();
  const key = `media/${ctx.user.id}/${mediaId}/${filename}`;

  const uploadUrl = await s3.getSignedUrl('putObject', {
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
    Expires: 3600, // 1 hour
  });

  // Create pending media record
  await prisma.media.create({
    data: {
      id: mediaId,
      ownerId: ctx.user.id,
      type: getMediaType(contentType),
      url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`,
      size,
      mimeType: contentType,
      status: 'pending',
      uploadId,
    },
  });

  return { uploadId, uploadUrl, mediaId };
},

// Phase 2: Complete upload
'media.completeUpload': async (ctx) => {
  const { uploadId, mediaId } = ctx.input;

  const media = await prisma.media.findUnique({
    where: { id: mediaId },
  });

  if (!media || media.uploadId !== uploadId || media.ownerId !== ctx.user.id) {
    throw new RPCError(ErrorCode.NOT_FOUND, 'Invalid upload');
  }

  // Update status to completed
  const updated = await prisma.media.update({
    where: { id: mediaId },
    data: { status: 'completed', uploadId: null },
  });

  return { media: updated };
},
```

---

#### Phase 4C: Message Router (P2 Medium) - Week 3, Days 3-4

**Router**: `message` (5 procedures)

**Procedures:**
1. ✅ `message.sendMessage` - Send DM
2. ✅ `message.getConversations` - List conversations (cursor)
3. ✅ `message.getMessages` - List messages in conversation (cursor)
4. ✅ `message.markAsRead` - Mark messages as read
5. ✅ `message.deleteConversation` - Delete conversation

**Dependencies:** User router, Social router (friend checks)

**Key Patterns:**
- Array-based participant IDs (1:1 and group DMs)
- Unread count tracking
- Message ordering (newest first)

---

#### Phase 4D: Notification Router (P2 Medium) - Week 3, Days 4-5

**Router**: `notification` (3 procedures)

**Procedures:**
1. ✅ `notification.getNotifications` - List notifications (cursor)
2. ✅ `notification.markAsRead` - Mark notifications read
3. ✅ `notification.markAllAsRead` - Bulk mark as read

**Dependencies:** User, Post, Social routers

**Key Patterns:**
- Polymorphic target references (post, user, etc.)
- Unread count tracking
- Notification types (like, comment, follow, friend_request)

---

#### Phase 4E: Settings Router (P2 Medium) - Week 4, Days 1-2

**Router**: `settings` (5 procedures)

**Procedures:**
1. ✅ `settings.updateAccount` - Change username/email/password
2. ✅ `settings.updatePrivacy` - Privacy settings
3. ✅ `settings.updateNotifications` - Notification preferences
4. ✅ `settings.exportData` - GDPR data export
5. ✅ `settings.deleteAccount` - Account deletion (30-day grace)

**Dependencies:** User router

**Key Patterns:**
- Password re-authentication for sensitive changes
- GDPR compliance (data export)
- Soft delete with recovery period

---

## 4. Key Implementation Patterns

### Pattern 1: Input Validation with Zod

**Standard Pattern** (apply to all procedures):

```typescript
import { z } from 'zod';
import { RPCError, ErrorCode } from '@vrss/api-contracts';

// Define schema
const createPostSchema = z.object({
  type: z.enum(['text_short', 'text_long', 'image', 'video_short', 'song']),
  content: z.string().min(1).max(5000),
  mediaUrls: z.array(z.string().url()).optional(),
  visibility: z.enum(['public', 'followers', 'private']).default('public'),
});

// Validate in procedure
'post.create': async (ctx) => {
  const validated = createPostSchema.safeParse(ctx.input);

  if (!validated.success) {
    throw new RPCError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid input',
      { errors: validated.error.flatten() }
    );
  }

  const { type, content, mediaUrls, visibility } = validated.data;
  // ... proceed with validated data
}
```

**Validation Library:** Create reusable schemas in `backend/src/lib/validation/`

```typescript
// backend/src/lib/validation/schemas.ts
export const schemas = {
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(12),
  postContent: z.string().min(1).max(5000),
  url: z.string().url(),
};
```

---

### Pattern 2: Cursor-Based Pagination

**Standard Implementation** (feeds, comments, messages):

```typescript
import type { CursorPaginationInput, CursorPaginationOutput } from '@vrss/api-contracts';

interface GetCommentsInput extends CursorPaginationInput {
  postId: PostId;
}

'post.getComments': async (ctx: ProcedureContext<GetCommentsInput>) => {
  const { postId, limit = 20, cursor } = ctx.input;

  const comments = await prisma.comment.findMany({
    where: {
      postId,
      deletedAt: null, // Always filter soft-deleted
    },
    take: limit + 1, // Fetch one extra to check hasMore
    cursor: cursor ? { id: cursor } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  });

  const hasMore = comments.length > limit;
  const items = hasMore ? comments.slice(0, -1) : comments;
  const nextCursor = hasMore ? items[items.length - 1].id : undefined;

  return {
    items,
    nextCursor,
    hasMore,
  } satisfies CursorPaginationOutput<Comment>;
},
```

**Cursor Encoding** (optional enhancement):

```typescript
// Encode cursor as base64 to obscure internal IDs
function encodeCursor(id: string): string {
  return Buffer.from(id).toString('base64');
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, 'base64').toString('utf-8');
}
```

---

### Pattern 3: Rate Limiting

**File**: `backend/src/middleware/rateLimit.ts`

```typescript
import type { Context, Next } from 'hono';
import { RPCError, ErrorCode } from '@vrss/api-contracts';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// In-memory store (use Redis in production)
const requests = new Map<string, number[]>();

const LIMITS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60_000, maxRequests: 60 },           // 60/min
  'auth.login': { windowMs: 60_000, maxRequests: 5 },       // 5/min
  'auth.register': { windowMs: 3600_000, maxRequests: 3 },  // 3/hour
  'post.create': { windowMs: 60_000, maxRequests: 10 },     // 10/min
  'media.initiateUpload': { windowMs: 60_000, maxRequests: 10 },
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

      // Get request timestamps
      let timestamps = requests.get(key) || [];
      timestamps = timestamps.filter(ts => ts > windowStart);

      if (timestamps.length >= limit.maxRequests) {
        throw new RPCError(
          ErrorCode.RATE_LIMIT_EXCEEDED,
          'Too many requests. Please try again later.',
          {
            limit: limit.maxRequests,
            windowMs: limit.windowMs,
            retryAfter: Math.ceil((timestamps[0] + limit.windowMs - now) / 1000),
          }
        );
      }

      timestamps.push(now);
      requests.set(key, timestamps);
    }

    // Restore request body
    c.req.raw = new Request(c.req.raw, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body,
    });

    await next();
  };
}
```

**Production Enhancement**: Use Redis for distributed rate limiting

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

async function checkRateLimit(key: string, limit: RateLimitConfig): Promise<boolean> {
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, Math.ceil(limit.windowMs / 1000));
  }

  return count <= limit.maxRequests;
}
```

---

### Pattern 4: Authorization Checks

**Resource Ownership Pattern:**

```typescript
'post.update': async (ctx: ProcedureContext<PostProcedures.Update['input']>) => {
  const { postId, content } = ctx.input;

  // Fetch post with ownership check
  const post = await prisma.post.findUnique({
    where: { id: postId },
  });

  if (!post) {
    throw new RPCError(ErrorCode.POST_NOT_FOUND, 'Post not found');
  }

  if (post.userId !== ctx.user.id) {
    throw new RPCError(
      ErrorCode.FORBIDDEN,
      'You can only edit your own posts'
    );
  }

  // Proceed with update
  const updated = await prisma.post.update({
    where: { id: postId },
    data: { content, updatedAt: new Date() },
  });

  return { post: updated };
},
```

**Profile Visibility Check:**

```typescript
'user.getProfile': async (ctx: ProcedureContext<UserProcedures.GetProfile['input']>) => {
  const { username } = ctx.input;

  const user = await prisma.user.findUnique({
    where: { username },
    include: { profile: true },
  });

  if (!user) {
    throw new RPCError(ErrorCode.USER_NOT_FOUND, 'User not found');
  }

  // Check visibility
  const isOwnProfile = ctx.user?.id === user.id;
  const isFollowing = await prisma.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: ctx.user?.id || 'anonymous',
        followingId: user.id,
      },
    },
  });

  if (user.profile.visibility === 'private' && !isOwnProfile) {
    throw new RPCError(ErrorCode.FORBIDDEN, 'Profile is private');
  }

  if (user.profile.visibility === 'followers' && !isOwnProfile && !isFollowing) {
    throw new RPCError(ErrorCode.FORBIDDEN, 'Profile is followers-only');
  }

  return { user, profile: user.profile };
},
```

---

### Pattern 5: JSONB Handling

**Profile Style Configuration:**

```typescript
import { z } from 'zod';

// Define JSONB schema
const styleConfigSchema = z.object({
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundImage: z.string().url().optional(),
  font: z.string().optional(),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

'user.updateStyle': async (ctx: ProcedureContext<UserProcedures.UpdateStyle['input']>) => {
  // Validate JSONB structure
  const validated = styleConfigSchema.safeParse(ctx.input);

  if (!validated.success) {
    throw new RPCError(
      ErrorCode.VALIDATION_ERROR,
      'Invalid style configuration',
      { errors: validated.error.flatten() }
    );
  }

  // Update JSONB column
  const profile = await prisma.userProfile.update({
    where: { userId: ctx.user.id },
    data: {
      styleConfig: validated.data, // Prisma handles JSONB serialization
      updatedAt: new Date(),
    },
  });

  return { style: profile.styleConfig };
},
```

**Querying JSONB:**

```typescript
// Find users with specific background color
const users = await prisma.userProfile.findMany({
  where: {
    styleConfig: {
      path: ['backgroundColor'],
      equals: '#1a1a2e',
    },
  },
});

// Query with JSON operators
const users = await prisma.$queryRaw`
  SELECT * FROM user_profiles
  WHERE style_config->>'backgroundColor' = '#1a1a2e'
`;
```

---

### Pattern 6: Denormalized Counter Updates

**Automated with Database Triggers:**

```sql
-- Trigger to update likes_count
CREATE OR REPLACE FUNCTION update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER post_likes_count_trigger
AFTER INSERT OR DELETE ON post_interactions
FOR EACH ROW
WHEN (NEW.type = 'like' OR OLD.type = 'like')
EXECUTE FUNCTION update_post_likes_count();
```

**Application-level pattern** (if not using triggers):

```typescript
'post.like': async (ctx: ProcedureContext<PostProcedures.Like['input']>) => {
  const { postId } = ctx.input;

  // Use transaction for atomicity
  await prisma.$transaction(async (tx) => {
    // Check if already liked
    const existing = await tx.postInteraction.findUnique({
      where: {
        userId_postId_type: {
          userId: ctx.user.id,
          postId,
          type: 'like',
        },
      },
    });

    if (existing) {
      // Unlike
      await tx.postInteraction.delete({
        where: { id: existing.id },
      });

      await tx.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });
    } else {
      // Like
      await tx.postInteraction.create({
        data: {
          userId: ctx.user.id,
          postId,
          type: 'like',
        },
      });

      await tx.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      });
    }
  });

  return { success: true };
},
```

---

## 5. Testing Strategy

### Test Coverage Requirements

- **Overall Coverage**: 80%+
- **Critical Paths**: 100% (auth, payments, data integrity)
- **Business Logic**: 90%+
- **UI Components**: 70%+

### Test Types & Tools

#### 5.1 Unit Tests (Bun Test)

**Target**: Individual procedure handlers

**File Structure:**
```bash
backend/src/rpc/routers/
├── auth.ts
├── __tests__/
│   ├── auth.test.ts
│   ├── user.test.ts
│   ├── post.test.ts
│   └── ... (one test file per router)
```

**Example**: `backend/src/rpc/routers/__tests__/auth.test.ts`

```typescript
import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { authRouter } from '../auth';
import { ErrorCode } from '@vrss/api-contracts';
import type { ProcedureContext } from '../../types';

describe('auth.register', () => {
  beforeEach(async () => {
    // Clear test database
    await prisma.user.deleteMany();
  });

  it('should register new user successfully', async () => {
    const ctx: ProcedureContext = {
      input: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'SecurePass123!',
      },
      requestId: 'test-123',
    };

    const result = await authRouter['auth.register'](ctx);

    expect(result.user.username).toBe('testuser');
    expect(result.user.email).toBe('test@example.com');
    expect(result.sessionToken).toBeDefined();
  });

  it('should reject duplicate email', async () => {
    // Create existing user
    await prisma.user.create({
      data: {
        username: 'existing',
        email: 'test@example.com',
        passwordHash: 'hash',
      },
    });

    const ctx: ProcedureContext = {
      input: {
        username: 'newuser',
        email: 'test@example.com',
        password: 'SecurePass123!',
      },
      requestId: 'test-456',
    };

    try {
      await authRouter['auth.register'](ctx);
      expect(true).toBe(false); // Should not reach
    } catch (error: any) {
      expect(error.code).toBe(ErrorCode.DUPLICATE_EMAIL);
    }
  });

  it('should validate password strength', async () => {
    const ctx: ProcedureContext = {
      input: {
        username: 'testuser',
        email: 'test@example.com',
        password: 'weak', // Too short
      },
      requestId: 'test-789',
    };

    try {
      await authRouter['auth.register'](ctx);
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });
});
```

**Run Unit Tests:**
```bash
cd backend
bun test                        # Run all tests
bun test --watch                # Watch mode
bun test auth.test.ts           # Specific file
bun test --coverage             # With coverage
```

---

#### 5.2 Integration Tests (Testcontainers)

**Target**: Full RPC request/response flow with real database

**Setup**: Use Testcontainers for isolated PostgreSQL

```typescript
// backend/src/__tests__/setup.ts
import { GenericContainer, StartedTestContainer } from 'testcontainers';
import { PrismaClient } from '@prisma/client';

let container: StartedTestContainer;
let prisma: PrismaClient;

export async function setupTestDb() {
  // Start PostgreSQL container
  container = await new GenericContainer('postgres:16-alpine')
    .withEnvironment({
      POSTGRES_USER: 'test',
      POSTGRES_PASSWORD: 'test',
      POSTGRES_DB: 'vrss_test',
    })
    .withExposedPorts(5432)
    .start();

  const port = container.getMappedPort(5432);
  const databaseUrl = `postgresql://test:test@localhost:${port}/vrss_test`;

  // Initialize Prisma
  prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  // Run migrations
  await prisma.$executeRawUnsafe(`
    -- Run all migration SQL here
  `);

  return prisma;
}

export async function teardownTestDb() {
  await prisma.$disconnect();
  await container.stop();
}
```

**Integration Test Example:**

```typescript
// backend/src/__tests__/integration/post-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { setupTestDb, teardownTestDb } from '../setup';

describe('Post Creation Flow', () => {
  let sessionToken: string;
  let userId: string;

  beforeAll(async () => {
    await setupTestDb();

    // Register user
    const res = await fetch('http://localhost:3000/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procedure: 'auth.register',
        input: {
          username: 'testuser',
          email: 'test@example.com',
          password: 'SecurePass123!',
        },
      }),
    });

    const data = await res.json();
    sessionToken = data.data.sessionToken;
    userId = data.data.user.id;
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('should create, read, update, delete post', async () => {
    // CREATE
    const createRes = await fetch('http://localhost:3000/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        procedure: 'post.create',
        input: {
          type: 'text_short',
          content: 'Test post',
        },
      }),
    });

    const createData = await createRes.json();
    expect(createData.success).toBe(true);
    const postId = createData.data.post.id;

    // READ
    const readRes = await fetch('http://localhost:3000/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procedure: 'post.getById',
        input: { postId },
      }),
    });

    const readData = await readRes.json();
    expect(readData.success).toBe(true);
    expect(readData.data.post.content).toBe('Test post');

    // UPDATE
    const updateRes = await fetch('http://localhost:3000/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        procedure: 'post.update',
        input: {
          postId,
          content: 'Updated post',
        },
      }),
    });

    const updateData = await updateRes.json();
    expect(updateData.data.post.content).toBe('Updated post');

    // DELETE
    const deleteRes = await fetch('http://localhost:3000/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        procedure: 'post.delete',
        input: { postId },
      }),
    });

    expect(deleteRes.ok).toBe(true);
  });
});
```

---

#### 5.3 Contract Tests

**Target**: Ensure type contracts match implementation

**Pattern**: Use `satisfies` keyword for compile-time verification

```typescript
'auth.register': async (ctx) => {
  // ... implementation

  return {
    user: result.user,
    sessionToken: result.session.token,
  } satisfies AuthProcedures.Register['output']; // ✅ Type-checked
},
```

**Runtime Validation** (optional):

```typescript
import { z } from 'zod';

const registerOutputSchema = z.object({
  user: z.object({ /* User shape */ }),
  sessionToken: z.string(),
});

// Validate at runtime
const output = { user: result.user, sessionToken: result.session.token };
registerOutputSchema.parse(output); // Throws if invalid
```

---

#### 5.4 Security Tests

**Target**: Authentication, authorization, injection attacks

```typescript
// backend/src/__tests__/security/auth.test.ts
describe('Authentication Security', () => {
  it('should reject expired sessions', async () => {
    // Create session
    const session = await createTestSession();

    // Expire session (mock time or wait)
    await prisma.session.update({
      where: { id: session.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    // Attempt to use expired session
    const res = await fetch('http://localhost:3000/api/rpc', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.token}`,
      },
      body: JSON.stringify({
        procedure: 'user.updateProfile',
        input: { displayName: 'Hacker' },
      }),
    });

    expect(res.status).toBe(401);
  });

  it('should prevent unauthorized post updates', async () => {
    const user1Session = await createTestSession('user1');
    const user2Post = await createTestPost('user2');

    const res = await fetch('http://localhost:3000/api/rpc', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${user1Session.token}`,
      },
      body: JSON.stringify({
        procedure: 'post.update',
        input: {
          postId: user2Post.id,
          content: 'Hijacked',
        },
      }),
    });

    expect(res.status).toBe(403);
  });
});
```

**SQL Injection Test:**

```typescript
it('should prevent SQL injection in user search', async () => {
  const maliciousInput = "'; DROP TABLE users; --";

  const res = await fetch('http://localhost:3000/api/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      procedure: 'discovery.searchUsers',
      input: { query: maliciousInput },
    }),
  });

  // Should not crash, should sanitize input
  expect(res.ok).toBe(true);

  // Verify users table still exists
  const users = await prisma.user.findMany();
  expect(users).toBeDefined();
});
```

---

### 5.5 Test Command Summary

```bash
# Unit tests (fast, no external dependencies)
bun test tests/unit/

# Integration tests (real database via Testcontainers)
bun test tests/integration/

# Security tests
bun test tests/security/

# All tests with coverage
bun test --coverage

# Watch mode for TDD
bun test --watch

# Specific router tests
bun test auth.test.ts
bun test post.test.ts
```

---

## 6. API Documentation

### Auto-Generated Documentation Strategy

#### 6.1 OpenAPI/Swagger Generation

**Tool**: Generate OpenAPI spec from type contracts

```typescript
// backend/src/docs/openapi-generator.ts
import type { ProcedureMap } from '../rpc/router';
import { writeFileSync } from 'fs';

function generateOpenAPISpec(procedures: ProcedureMap) {
  const spec = {
    openapi: '3.0.0',
    info: {
      title: 'VRSS RPC API',
      version: '1.0.0',
      description: 'RPC-style API for VRSS social platform',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://api.vrss.app', description: 'Production' },
    ],
    paths: {
      '/api/rpc': {
        post: {
          summary: 'RPC Endpoint',
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  oneOf: Object.keys(procedures).map(procedure => ({
                    type: 'object',
                    properties: {
                      procedure: { type: 'string', enum: [procedure] },
                      input: { /* Extract from type */ },
                    },
                  })),
                },
              },
            },
          },
          responses: {
            200: {
              description: 'Success',
              content: {
                'application/json': {
                  schema: { /* RPCResponse schema */ },
                },
              },
            },
          },
        },
      },
    },
  };

  writeFileSync('./docs/openapi.json', JSON.stringify(spec, null, 2));
}
```

---

#### 6.2 Interactive API Explorer

**Tool**: Swagger UI or Scalar

```typescript
// backend/src/index.ts
import { swaggerUI } from '@hono/swagger-ui';

app.get('/docs', swaggerUI({ url: '/docs/openapi.json' }));
```

**Access**: Navigate to `http://localhost:3000/docs` for interactive API testing

---

#### 6.3 Procedure Documentation

**In-code Documentation Pattern:**

```typescript
/**
 * AUTH.REGISTER
 *
 * Registers a new user account with email verification.
 *
 * @procedure auth.register
 * @public
 * @rateLimit 3 requests per hour
 *
 * @input
 * - username: 3-30 alphanumeric + underscore
 * - email: Valid email address
 * - password: Minimum 12 characters
 *
 * @output
 * - user: User object
 * - sessionToken: JWT session token
 *
 * @errors
 * - 1401: DUPLICATE_USERNAME
 * - 1402: DUPLICATE_EMAIL
 * - 1200: VALIDATION_ERROR
 *
 * @example
 * ```json
 * {
 *   "procedure": "auth.register",
 *   "input": {
 *     "username": "john_doe",
 *     "email": "john@example.com",
 *     "password": "SecurePass123!"
 *   }
 * }
 * ```
 */
'auth.register': async (ctx) => {
  // ...
},
```

---

#### 6.4 API Reference Document

**File**: `docs/API_REFERENCE.md`

Auto-generate from type contracts:

```markdown
# VRSS RPC API Reference

## Auth Procedures

### auth.register
**Description**: Register new user account
**Public**: Yes
**Rate Limit**: 3 requests/hour

**Input:**
| Field | Type | Required | Validation |
|-------|------|----------|------------|
| username | string | Yes | 3-30 chars, alphanumeric + underscore |
| email | string | Yes | Valid email |
| password | string | Yes | Min 12 chars |

**Output:**
| Field | Type | Description |
|-------|------|-------------|
| user | User | Created user object |
| sessionToken | string | Session token for authentication |

**Errors:**
- `1401` - DUPLICATE_USERNAME: Username already taken
- `1402` - DUPLICATE_EMAIL: Email already registered
- `1200` - VALIDATION_ERROR: Invalid input

**Example Request:**
```json
{
  "procedure": "auth.register",
  "input": {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "SecurePass123!"
  }
}
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123",
      "username": "john_doe",
      "email": "john@example.com"
    },
    "sessionToken": "eyJhbGc..."
  }
}
```
```

---

## 7. Implementation Timeline

### Week-by-Week Breakdown

#### **Week 1: Foundation & Core Auth**

**Days 1-2: RPC Foundation** (Phase 1A)
- ✅ Hono server setup with Bun
- ✅ RPC router implementation
- ✅ Middleware stack (auth, rate limit, logging)
- ✅ Error handling system
- ✅ Prisma client initialization

**Days 2-3: Type Contracts** (Phase 1B)
- ✅ All procedure type definitions (50+ procedures)
- ✅ Shared domain types (User, Post, etc.)
- ✅ Error code enum
- ✅ RPC request/response types

**Days 3-4: Auth Router** (Phase 2A)
- ✅ Better-auth configuration
- ✅ 6 auth procedures (register, login, logout, etc.)
- ✅ Session management
- ✅ Unit + integration tests

**Days 4-5: User Router** (Phase 2B)
- ✅ 6 user procedures (getProfile, updateProfile, etc.)
- ✅ JSONB handling for profile customization
- ✅ Profile visibility logic
- ✅ Unit + integration tests

---

#### **Week 2: Content & Social**

**Days 1-2: Post Router** (Phase 2C)
- ✅ 8 post procedures (create, update, delete, like, etc.)
- ✅ Denormalized counter handling
- ✅ Cursor-based pagination for comments
- ✅ Unit + integration tests

**Days 3-4: Social Router** (Phase 3A)
- ✅ 6 social procedures (follow, unfollow, friend request, etc.)
- ✅ Mutual follow detection
- ✅ Friend request state machine
- ✅ Unit + integration tests

**Days 4-5: Feed Router** (Phase 3B)
- ✅ 4 feed procedures (getFeed, createFeed, etc.)
- ✅ Feed algorithm builder (JSONB → SQL)
- ✅ Filter validation and execution
- ✅ Query performance optimization
- ✅ Unit + integration tests

---

#### **Week 3: Enhanced Features**

**Days 1-2: Discovery Router** (Phase 4A)
- ✅ 3 discovery procedures (search users/posts, discover feed)
- ✅ PostgreSQL fuzzy search (`pg_trgm`)
- ✅ N-degree friend network algorithm
- ✅ Unit + integration tests

**Days 2-3: Media Router** (Phase 4B)
- ✅ 4 media procedures (upload, complete, quota, delete)
- ✅ Two-phase S3 upload implementation
- ✅ Storage quota enforcement
- ✅ Presigned URL generation
- ✅ Unit + integration tests

**Days 3-4: Message Router** (Phase 4C)
- ✅ 5 message procedures (send, conversations, messages, etc.)
- ✅ Array-based participant tracking
- ✅ Unread count management
- ✅ Unit + integration tests

**Days 4-5: Notification Router** (Phase 4D)
- ✅ 3 notification procedures (get, mark read, mark all read)
- ✅ Polymorphic target references
- ✅ Notification types handling
- ✅ Unit + integration tests

---

#### **Week 4: Settings & Finalization**

**Days 1-2: Settings Router** (Phase 4E)
- ✅ 5 settings procedures (account, privacy, notifications, export, delete)
- ✅ Password re-authentication
- ✅ GDPR data export
- ✅ Account soft delete with grace period
- ✅ Unit + integration tests

**Days 3-4: Documentation & Testing**
- ✅ OpenAPI spec generation
- ✅ API reference documentation
- ✅ Swagger UI integration
- ✅ Comprehensive E2E test suite
- ✅ Security testing
- ✅ Performance benchmarking

**Day 5: Deployment Preparation**
- ✅ Production environment setup
- ✅ Database migration scripts
- ✅ Monitoring and logging setup
- ✅ Rate limiting with Redis
- ✅ Final security audit

---

## Success Criteria

### Phase Completion Checklist

**Phase 1: Foundation** ✅
- [x] RPC router handles all procedure types
- [x] Middleware stack functional (auth, rate limit, logging)
- [x] All 50+ type contracts defined
- [x] Error handling with proper HTTP status codes
- [x] Better-auth integration complete

**Phase 2: Core Routers** ✅
- [x] Auth router (6 procedures) with tests
- [x] User router (6 procedures) with tests
- [x] Post router (8 procedures) with tests
- [x] Social router (6 procedures) with tests
- [x] Feed router (4 procedures) with tests

**Phase 3: Enhanced Routers** ✅
- [x] Discovery router (3 procedures) with tests
- [x] Media router (4 procedures) with tests
- [x] Message router (5 procedures) with tests
- [x] Notification router (3 procedures) with tests
- [x] Settings router (5 procedures) with tests

**Phase 4: Quality & Documentation** ✅
- [x] 80%+ test coverage overall
- [x] 100% coverage on critical paths (auth, payments)
- [x] API documentation complete
- [x] OpenAPI spec generated
- [x] Security tests passed
- [x] Performance benchmarks met (p95 < 200ms)

---

## Risk Mitigation

### Technical Risks

**Risk**: Better-auth session cookie domain configuration issues
**Mitigation**: Test thoroughly with subdomains; use `.vrss.app` with leading dot; validate `SameSite` attribute

**Risk**: JSONB query performance degradation at scale
**Mitigation**: Create GIN indexes on JSONB columns; monitor slow query log; limit JSONB nesting depth

**Risk**: Denormalized counter drift
**Mitigation**: Database triggers for atomicity; nightly reconciliation job; monitor for negative counts

**Risk**: S3 eventual consistency causing upload errors
**Mitigation**: Retry logic with exponential backoff; client-side caching; consider S3 Transfer Acceleration

**Risk**: Rate limiting memory overflow (in-memory store)
**Mitigation**: Implement Redis-based rate limiting for production; set TTL on all keys; monitor memory usage

---

## Appendix: Quick Command Reference

```bash
# Development
cd backend
bun install
bun run dev                     # Start dev server
bun run build                   # Production build

# Database
bunx prisma generate            # Generate Prisma client
bunx prisma migrate dev         # Apply migrations
bunx prisma studio              # Database GUI

# Testing
bun test                        # All tests
bun test --watch                # Watch mode
bun test --coverage             # With coverage
bun test auth.test.ts           # Specific file

# API Documentation
bun run docs:generate           # Generate OpenAPI spec
open http://localhost:3000/docs # View Swagger UI

# Production
bun run start                   # Start production server
docker-compose up -d            # Start with Docker
```

---

## Next Steps

1. **User Approval**: Review this strategy and confirm approach
2. **Environment Setup**: Initialize backend project structure
3. **Phase 1A**: Implement RPC foundation (Days 1-2)
4. **Phase 1B**: Define all type contracts (Days 2-3)
5. **Iterative Implementation**: Follow router sequence (Weeks 1-4)
6. **Continuous Testing**: Write tests alongside each router
7. **Documentation**: Generate API docs as procedures are completed
8. **Production Deployment**: Deploy after all phases complete

**Total Timeline**: 4 weeks for 10 routers, 50+ procedures, with comprehensive testing and documentation.
