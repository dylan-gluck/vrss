# API Documentation

**VRSS Social Platform - RPC API Reference**

This document provides complete reference for the VRSS API, which uses an RPC (Remote Procedure Call) architecture instead of traditional REST. It covers all 10 routers with ~60 procedures, request/response patterns, authentication, validation, and error handling.

---

## Table of Contents

1. [RPC Architecture](#rpc-architecture)
2. [API Endpoint](#api-endpoint)
3. [Authentication & Authorization](#authentication--authorization)
4. [Request/Response Format](#requestresponse-format)
5. [Validation Strategy](#validation-strategy)
6. [Error Handling](#error-handling)
7. [Pagination Patterns](#pagination-patterns)
8. [Type Safety](#type-safety)
9. [Router Reference](#router-reference)
10. [Procedure Catalog](#procedure-catalog)

---

## RPC Architecture

### Why RPC Instead of REST?

VRSS uses **RPC (Remote Procedure Call)** architecture instead of traditional REST for several compelling reasons:

**1. Type Safety End-to-End**
- Single source of truth for types (`@vrss/api-contracts`)
- Shared TypeScript types between frontend and backend
- Compile-time error detection for API changes
- Auto-completion in IDE for all procedures

**2. Simpler Client Code**
- No manual URL construction
- No HTTP method selection (GET/POST/PUT/DELETE)
- Function call syntax: `api.user.getProfile({ username })`
- Consistent error handling across all procedures

**3. Better Developer Experience**
- Clear procedure names: `auth.login`, `post.create`, `message.sendMessage`
- Self-documenting API (procedure names explain intent)
- Easier refactoring (rename procedure = update all callsites)
- No REST resource mapping complexity

**4. Flexible Functionality**
- Procedures can be actions, not just CRUD
- Examples: `post.like`, `social.follow`, `feed.get`
- Not constrained by resource-oriented thinking
- Better fit for social platform actions

**5. Performance Optimization**
- Single HTTP endpoint reduces connection overhead
- Batching support (future feature)
- Optimistic updates easier to implement
- Smaller payload sizes (no HTTP method/path overhead)

**Comparison:**

| Aspect | REST | RPC (VRSS) |
|--------|------|------------|
| Endpoint | Multiple (`/api/users/:id`, `/api/posts`) | Single (`/api/rpc`) |
| Method | HTTP verbs (GET, POST, PUT, DELETE) | Always POST |
| Type Safety | Manual type definitions | Shared contracts |
| Client Code | `fetch('/api/posts', { method: 'POST' })` | `api.post.create(data)` |
| Discoverability | OpenAPI/Swagger | TypeScript types |

### How RPC Works in VRSS

**Architecture:**
```
Frontend                 Network              Backend
--------                --------             --------
api.post.create()  →  POST /api/rpc  →  postRouter["post.create"]
   ↓                       ↓                      ↓
Zod validate         JSON parse          Zod validate
   ↓                       ↓                      ↓
Send request         HTTP transport       Execute procedure
   ↓                       ↓                      ↓
Await response      JSON serialize      Return result
   ↓
Update UI
```

**RPC Envelope:**
Every request wraps the procedure name and parameters:
```json
{
  "procedure": "post.create",
  "input": {
    "type": "text",
    "content": "Hello world!",
    "visibility": "public"
  }
}
```

**Router Resolution:**
1. Parse procedure name: `"post.create"` → router: `"post"`, method: `"create"`
2. Lookup router: `routers["post"]`
3. Lookup procedure: `postRouter["post.create"]`
4. Execute with context and input

**Context Object:**
Every procedure receives a `ProcedureContext`:
```typescript
{
  c: HonoContext           // Hono framework context
  user: User | null        // Authenticated user (from better-auth)
  session: Session | null  // Session info (from better-auth)
  input: Input             // Validated input (via Zod)
}
```

---

## API Endpoint

**Base URL:**
- Development: `http://localhost:3000/api/rpc`
- Production: `https://api.vrss.app/rpc`

**HTTP Method:** Always `POST`

**Content-Type:** `application/json`

**Headers:**
- `Content-Type: application/json` (required)
- `Cookie: <session-cookie>` (for authenticated requests)
- `X-CSRF-Token: <token>` (if CSRF protection enabled)

---

## Authentication & Authorization

### Session-Based Authentication

**Provider:** Better-auth with username plugin

**Session Storage:**
- Method: HTTP-only secure cookies
- Name: `better-auth.session_token`
- Duration: 7 days
- Sliding window: 24 hours
- Secure: true (HTTPS only in production)
- SameSite: Lax

**Authentication Flow:**
1. User calls `auth.register` → Creates account (no session)
2. User calls `auth.login` → Creates session, sets cookie
3. Subsequent requests include session cookie
4. Middleware validates session, populates `ctx.user` and `ctx.session`
5. User calls `auth.logout` → Destroys session, clears cookie

### Public vs Protected Procedures

**Public Procedures** (no authentication required):
- `auth.register` - User registration
- `auth.login` - User login
- `auth.verifyEmail` - Email verification
- `auth.resendVerification` - Resend verification email
- `user.getProfile` - View public profiles (visibility-based)
- `post.getById` - View public posts (visibility-based)
- `post.getComments` - View comments on public posts
- `discovery.searchUsers` - Search for users
- `discovery.searchPosts` - Search for posts

**Protected Procedures** (authentication required):
All other procedures require authentication. Throws `ErrorCode.UNAUTHORIZED` if not authenticated.

**Authorization Checks:**
Procedures perform granular authorization:
- **Ownership**: `post.update`, `post.delete` - Only owner can modify
- **Visibility**: `user.getProfile`, `post.getById` - Respects visibility settings
- **Relationship**: `message.getMessages` - Only participants can access
- **Admin**: (Future) Admin-only procedures

---

## Request/Response Format

### Request Format

**Standard RPC Request:**
```json
{
  "procedure": "<router>.<method>",
  "input": {
    // Procedure-specific input (validated by Zod)
  }
}
```

**Example: Create Post**
```json
{
  "procedure": "post.create",
  "input": {
    "type": "text",
    "content": "This is my first post!",
    "visibility": "public"
  }
}
```

**Example: Get User Profile**
```json
{
  "procedure": "user.getProfile",
  "input": {
    "username": "alice"
  }
}
```

### Response Format

**Success Response (200 OK):**
```json
{
  "success": true,
  "data": {
    // Procedure-specific response data
  }
}
```

**Example: Post Created**
```json
{
  "success": true,
  "data": {
    "post": {
      "id": "1234567890",
      "userId": "5678901234",
      "type": "text",
      "content": "This is my first post!",
      "visibility": "public",
      "likesCount": 0,
      "commentsCount": 0,
      "repostsCount": 0,
      "createdAt": "2025-10-21T12:00:00.000Z",
      "updatedAt": "2025-10-21T12:00:00.000Z"
    }
  }
}
```

**Error Response (4xx/5xx):**
```json
{
  "success": false,
  "error": {
    "code": 1011,
    "message": "Invalid username or password",
    "details": {}
  }
}
```

**Example: Validation Error**
```json
{
  "success": false,
  "error": {
    "code": 1001,
    "message": "Username must be at least 3 characters",
    "details": {
      "field": "username",
      "errors": [
        {
          "path": ["username"],
          "message": "Username must be at least 3 characters"
        }
      ]
    }
  }
}
```

---

## Validation Strategy

### Zod Schema Validation

**Location:** `apps/api/src/rpc/routers/schemas/`

**Pattern:**
1. Define Zod schema for each procedure input
2. Validate input with `.safeParse()` in procedure
3. Throw `ErrorCode.VALIDATION_ERROR` if validation fails
4. Use validated data (type-safe)

**Example Schema (user.ts):**
```typescript
const getProfileSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
})
```

**Example Validation (user router):**
```typescript
const validationResult = getProfileSchema.safeParse(ctx.input)
if (!validationResult.success) {
  const firstError = validationResult.error.errors[0]
  throw new RPCError(
    ErrorCode.VALIDATION_ERROR,
    firstError?.message || "Invalid input",
    { field: firstError?.path[0], errors: validationResult.error.errors }
  )
}
```

### Common Validation Rules

**Username:**
- Min: 3 chars
- Max: 30 chars
- Pattern: `/^[a-zA-Z0-9_]+$/`
- Case-insensitive uniqueness

**Email:**
- Max: 255 chars
- Standard email format (RFC 5322)
- Case-insensitive uniqueness

**Password:**
- Min: 12 chars
- Max: 128 chars
- Must contain: uppercase, lowercase, number, special char

**Post Content:**
- Text posts: Max 10,000 chars
- Required for text posts
- Optional for media posts

**Pagination:**
- Limit: 1-100 (default: 20)
- Cursor: String (BigInt ID as string)

---

## Error Handling

### Error Code Ranges

**1000-1099: Authentication Errors**
- `1010` - AUTH_EMAIL_NOT_VERIFIED
- `1011` - AUTH_INVALID_CREDENTIALS
- `1012` - AUTH_ACCOUNT_SUSPENDED
- `1013` - AUTH_ACCOUNT_DELETED
- `1014` - AUTH_RATE_LIMITED
- `1020` - AUTH_TOKEN_EXPIRED
- `1021` - AUTH_TOKEN_INVALID
- `1022` - AUTH_TOKEN_ALREADY_USED
- `1030` - AUTH_UNAUTHORIZED
- `1031` - AUTH_SESSION_EXPIRED

**1100-1199: User Errors**
- `1100` - USER_NOT_FOUND
- `1101` - USER_SUSPENDED

**1200-1299: Post Errors**
- `1200` - POST_NOT_FOUND

**1300-1399: General Errors**
- `1300` - VALIDATION_ERROR
- `1301` - NOT_FOUND
- `1302` - FORBIDDEN
- `1303` - CONFLICT
- `1304` - INTERNAL_SERVER_ERROR

**1400-1499: Conflict Errors**
- `1401` - AUTH_USERNAME_TAKEN
- `1402` - AUTH_EMAIL_TAKEN
- `1403` - ALREADY_FOLLOWING

**1500-1599: Storage Errors**
- `1500` - STORAGE_QUOTA_EXCEEDED
- `1501` - STORAGE_LIMIT_EXCEEDED
- `1502` - INVALID_FILE_TYPE
- `1503` - FILE_TOO_LARGE

**1600-1699: Feed Errors**
- `1600` - FEED_NOT_FOUND

### HTTP Status Code Mapping

**Error Code → HTTP Status:**
- `1000-1099` (Auth) → `401 Unauthorized` or `403 Forbidden`
- `1100-1199` (User) → `404 Not Found`
- `1200-1299` (Post) → `404 Not Found`
- `1300` (Validation) → `400 Bad Request`
- `1301` (Not Found) → `404 Not Found`
- `1302` (Forbidden) → `403 Forbidden`
- `1303` (Conflict) → `409 Conflict`
- `1304` (Internal) → `500 Internal Server Error`
- `1400-1499` (Conflict) → `409 Conflict`
- `1500-1599` (Storage) → `507 Insufficient Storage` or `413 Payload Too Large`
- `1600-1699` (Feed) → `404 Not Found`

### RPCError Class

**Definition:**
```typescript
class RPCError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message)
    this.name = "RPCError"
  }
}
```

**Usage:**
```typescript
throw new RPCError(
  ErrorCode.USER_NOT_FOUND,
  "User not found",
  { username }
)
```

### Error Response Structure

**Format:**
```typescript
{
  success: false,
  error: {
    code: number,
    message: string,
    details?: Record<string, unknown>
  }
}
```

**Validation Error Details:**
```typescript
{
  field: string,
  errors: ZodError[],
  fieldErrors: Record<string, string[]>
}
```

---

## Pagination Patterns

### Cursor-Based Pagination

**Why Cursor-Based?**
- Consistent results (no page drift)
- Efficient for large datasets
- Works with real-time updates
- No offset calculation overhead

**Request Parameters:**
```typescript
{
  limit: number    // Default: 20, Max: 100
  cursor?: string  // Optional: Last item ID from previous page
}
```

**Response Structure:**
```typescript
{
  items: T[],
  nextCursor: string | null,
  hasMore: boolean
}
```

**Pagination Flow:**
1. **First Page**: Send `{ limit: 20 }` (no cursor)
2. **Backend**: Fetch 21 items (limit + 1)
3. **Backend**: If 21 items fetched, `hasMore = true`, `nextCursor = item[19].id`
4. **Backend**: Return first 20 items
5. **Next Page**: Send `{ limit: 20, cursor: nextCursor }`
6. **Backend**: Fetch items WHERE `id < cursor` ORDER BY `id DESC` LIMIT 21
7. **Repeat** until `hasMore = false`

**Example:**

**Request 1 (First Page):**
```json
{
  "procedure": "post.getComments",
  "input": {
    "postId": "1234567890",
    "limit": 20
  }
}
```

**Response 1:**
```json
{
  "success": true,
  "data": {
    "comments": [ /* 20 comments */ ],
    "nextCursor": "9876543210",
    "hasMore": true
  }
}
```

**Request 2 (Next Page):**
```json
{
  "procedure": "post.getComments",
  "input": {
    "postId": "1234567890",
    "limit": 20,
    "cursor": "9876543210"
  }
}
```

**Procedures with Pagination:**
- `post.getComments` - Comments on a post
- `social.getFollowers` - User's followers
- `social.getFollowing` - Users followed by user
- `social.getFriends` - Mutual friends
- `feed.get` - Feed posts
- `message.getConversations` - User's conversations
- `message.getMessages` - Messages in conversation
- `notification.getNotifications` - User's notifications
- `discovery.searchUsers` - User search results
- `discovery.searchPosts` - Post search results
- `discovery.getDiscoverFeed` - Discover feed posts

---

## Type Safety

### End-to-End Type Safety

**Package:** `@vrss/api-contracts`

**Location:** `packages/api-contracts/src/`

**Purpose:** Single source of truth for API types shared between frontend and backend

**Structure:**
```
packages/api-contracts/src/
├── index.ts                     # Main export
├── types/
│   ├── user.ts                  # User types
│   ├── post.ts                  # Post types
│   ├── message.ts               # Message types
│   └── ...
├── procedures/
│   ├── auth.ts                  # Auth procedure signatures
│   ├── user.ts                  # User procedure signatures
│   ├── post.ts                  # Post procedure signatures
│   └── ...
└── error-codes.ts               # Error code enum
```

**Type Flow:**
```
Backend (Prisma)    API Contracts    Frontend (React)
-----------------   -------------    -----------------
Prisma types   →    Shared types  →  Component props
                         ↓
                    Procedure      →  API client calls
                    signatures
```

**Example Contract (user.ts):**
```typescript
export type UserProfile = {
  id: string
  username: string
  displayName: string | null
  bio: string | null
  avatarUrl: string | null
  visibility: "public" | "followers" | "private"
}

export type GetProfileInput = {
  username: string
}

export type GetProfileOutput = {
  user: UserProfile
  style: ProfileStyle
  sections: ProfileSection[]
}
```

**Benefits:**
1. **Compile-Time Safety**: TypeScript errors if API changes break frontend
2. **Auto-Completion**: IDE suggests available procedures and parameters
3. **Refactoring**: Rename type → update all references automatically
4. **Documentation**: Types serve as inline documentation

---

## Router Reference

### 10 Routers Overview

| Router | Purpose | Procedures | Authentication |
|--------|---------|------------|----------------|
| `auth` | Authentication & registration | 6 | Mixed |
| `user` | User profiles & customization | 5 | Mixed |
| `post` | Post management & interactions | 8 | Mixed |
| `social` | Follow/friend relationships | 5 | Required |
| `feed` | Custom feeds & algorithms | 4 | Required |
| `media` | Media upload & storage | 4 | Required |
| `message` | Direct messaging | 5 | Required |
| `notification` | Notifications | 3 | Required |
| `discovery` | Search & discovery feed | 3 | Mixed |
| `settings` | Account & privacy settings | 5 | Required |

**Total Procedures:** ~60 procedures across 10 routers

---

## Procedure Catalog

### 1. Auth Router (`auth`)

**File:** `apps/api/src/rpc/routers/auth.ts`

**Purpose:** User authentication, registration, and email verification

**Procedures:**

**`auth.register`** - Register new user
- **Input:** `{ username, email, password }`
- **Output:** `{ user, message }`
- **Auth:** Public
- **Validates:** Username uniqueness (case-insensitive), email uniqueness, password strength
- **Creates:** User record, Account record (better-auth)
- **Note:** Does NOT create session (must verify email or login)

**`auth.login`** - User login
- **Input:** `{ username, password }`
- **Output:** `{ user, sessionToken, expiresAt }`
- **Auth:** Public
- **Validates:** Account status (not suspended/deleted), password correctness
- **Creates:** Session (7-day cookie)
- **Updates:** User.lastLoginAt timestamp
- **Note:** Uses username for login (NOT email)

**`auth.logout`** - User logout
- **Input:** `{}`
- **Output:** `{ success, message }`
- **Auth:** Required
- **Destroys:** Session, clears cookie
- **Note:** Idempotent (safe to call multiple times)

**`auth.getSession`** - Get current session
- **Input:** `{}`
- **Output:** `{ user, expiresAt }`
- **Auth:** Required
- **Returns:** Current user and session info
- **Note:** Used for session validation

**`auth.verifyEmail`** - Verify email with token
- **Input:** `{ token }`
- **Output:** `{ user, sessionToken, expiresAt, message }`
- **Auth:** Public
- **Validates:** Token exists, not expired
- **Updates:** User.emailVerified = true
- **Creates:** Session (auto-login after verification)
- **Note:** Feature implemented but disabled for MVP

**`auth.resendVerification`** - Resend verification email
- **Input:** `{ email }`
- **Output:** `{ success, message }`
- **Auth:** Public
- **Validates:** Email exists, not already verified
- **Sends:** New verification email via better-auth
- **Note:** Returns success even if email doesn't exist (prevents enumeration)

---

### 2. User Router (`user`)

**File:** `apps/api/src/rpc/routers/user.ts`

**Purpose:** User profile management, style customization, profile sections

**Procedures:**

**`user.getProfile`** - Get user profile by username
- **Input:** `{ username }`
- **Output:** `{ user, style, sections }`
- **Auth:** Public (visibility-based)
- **Validates:** User exists, active status
- **Checks:** Profile visibility (public/followers/private)
- **Returns:** User info, style config, visible sections

**`user.updateProfile`** - Update profile information
- **Input:** `{ displayName?, bio?, avatarUrl?, visibility?, avatarSize? }`
- **Output:** `{ user }`
- **Auth:** Required (owner only)
- **Validates:** Avatar size against storage quota
- **Updates:** UserProfile record (upsert)
- **Updates:** StorageUsage if avatar uploaded

**`user.updateStyle`** - Update profile style configuration
- **Input:** `{ backgroundConfig?, musicConfig?, styleConfig? }`
- **Output:** `{ style }`
- **Auth:** Required (owner only)
- **Merges:** New config with existing config (partial updates)
- **Updates:** UserProfile JSONB fields

**`user.updateSections`** - Manage profile sections
- **Input:** `{ sections: [{ id?, type, title, description?, config, displayOrder, isVisible }] }`
- **Output:** `{ sections }`
- **Auth:** Required (owner only)
- **Logic:** Sections with IDs = update, without IDs = create, missing = delete
- **Transaction:** Atomic update (all or nothing)

**`user.getSections`** - Get profile sections
- **Input:** `{ username }`
- **Output:** `{ sections }`
- **Auth:** Public
- **Filters:** Only visible sections for non-owners
- **Returns:** All sections for owner

---

### 3. Post Router (`post`)

**File:** `apps/api/src/rpc/routers/post.ts`

**Purpose:** Post creation, retrieval, updates, deletion, likes, comments

**Procedures:**

**`post.create`** - Create new post
- **Input:** `{ type, content, mediaIds?, visibility }`
- **Output:** `{ post }`
- **Auth:** Required
- **Validates:** Media quota for non-text posts
- **Maps:** API type to DB type (text → text_short, image → image, etc.)
- **Creates:** Post record with initial counters at 0

**`post.getById`** - Get post by ID
- **Input:** `{ postId }`
- **Output:** `{ post, author }`
- **Auth:** Public (visibility-based)
- **Validates:** Post exists, not deleted
- **Checks:** Visibility permissions
- **Returns:** Post with author info

**`post.update`** - Update post content or visibility
- **Input:** `{ postId, content?, visibility? }`
- **Output:** `{ post }`
- **Auth:** Required (owner only)
- **Validates:** Post exists, ownership
- **Updates:** Content and/or visibility
- **Updates:** Post.updatedAt timestamp

**`post.delete`** - Soft delete post
- **Input:** `{ postId }`
- **Output:** `{ success }`
- **Auth:** Required (owner only)
- **Validates:** Post exists, ownership
- **Sets:** Post.deletedAt timestamp (soft delete)
- **Note:** Data preserved for 30 days

**`post.like`** - Like a post
- **Input:** `{ postId }`
- **Output:** `{ success, alreadyLiked }`
- **Auth:** Required
- **Validates:** Post exists, visible to user
- **Creates:** PostInteraction (type: like)
- **Trigger:** Increments Post.likesCount automatically
- **Note:** Idempotent (liking twice returns alreadyLiked=true)

**`post.unlike`** - Unlike a post
- **Input:** `{ postId }`
- **Output:** `{ success, wasNotLiked }`
- **Auth:** Required
- **Validates:** Post exists, visible to user
- **Deletes:** PostInteraction (type: like)
- **Trigger:** Decrements Post.likesCount automatically
- **Note:** Idempotent (unliking twice returns wasNotLiked=true)

**`post.comment`** - Add comment to post
- **Input:** `{ postId, content, parentCommentId? }`
- **Output:** `{ comment }`
- **Auth:** Required
- **Validates:** Post exists, visible to user, parent comment exists (if nested)
- **Creates:** Comment record
- **Trigger:** Increments Post.commentsCount automatically
- **Returns:** Comment with author info

**`post.getComments`** - Get comments for post
- **Input:** `{ postId, limit, cursor? }`
- **Output:** `{ comments, nextCursor, hasMore }`
- **Auth:** Public (visibility-based)
- **Validates:** Post exists, visible to user
- **Filters:** Top-level comments only (parentCommentId = null)
- **Pagination:** Cursor-based (limit 1-100, default 20)
- **Returns:** Comments with author info

---

### 4. Social Router (`social`)

**File:** `apps/api/src/rpc/routers/social.ts`

**Purpose:** Follow/unfollow users, retrieve followers/following/friends lists

**Procedures:**

**`social.follow`** - Follow a user
- **Input:** `{ userId }`
- **Output:** `{ following }`
- **Auth:** Required
- **Validates:** Target user exists, not self-follow, not already following
- **Creates:** UserFollow record
- **Trigger:** Creates Friendship if mutual follow detected
- **Returns:** `{ following: true }`

**`social.unfollow`** - Unfollow a user
- **Input:** `{ userId }`
- **Output:** `{ following }`
- **Auth:** Required
- **Validates:** Currently following
- **Deletes:** UserFollow record
- **Deletes:** Friendship (if exists, since no longer mutual)
- **Returns:** `{ following: false }`

**`social.getFollowers`** - Get list of followers
- **Input:** `{ userId?, limit, cursor? }`
- **Output:** `{ followers, nextCursor, hasMore }`
- **Auth:** Public
- **Defaults:** Current user if userId not provided
- **Pagination:** Cursor-based (limit 1-100, default 20)
- **Returns:** Users who follow the target user

**`social.getFollowing`** - Get list of users being followed
- **Input:** `{ userId?, limit, cursor? }`
- **Output:** `{ following, nextCursor, hasMore }`
- **Auth:** Public
- **Defaults:** Current user if userId not provided
- **Pagination:** Cursor-based (limit 1-100, default 20)
- **Returns:** Users that the target user follows

**`social.getFriends`** - Get list of mutual friends
- **Input:** `{ userId?, limit, cursor? }`
- **Output:** `{ friends, nextCursor, hasMore }`
- **Auth:** Public
- **Defaults:** Current user if userId not provided
- **Pagination:** Cursor-based (limit 1-100, default 20)
- **Queries:** Friendship table (bidirectional relationships)
- **Returns:** Users with mutual follow relationships

---

### 5. Feed Router (`feed`)

**File:** `apps/api/src/rpc/routers/feed.ts`

**Purpose:** Custom feed creation, management, and retrieval

**Procedures:**

**`feed.get`** - Get feed posts
- **Input:** `{ feedId?, limit, cursor? }`
- **Output:** `{ posts, nextCursor, hasMore }`
- **Auth:** Required
- **Default:** Default "Following" feed if feedId not provided
- **Custom:** Executes feed algorithm if feedId provided
- **Pagination:** Cursor-based (limit 1-100, default 20)
- **Returns:** Posts from followed users or custom feed

**`feed.create`** - Create custom feed
- **Input:** `{ name, filters, isDefault? }`
- **Output:** `{ feed }`
- **Auth:** Required
- **Validates:** Name uniqueness per user
- **Creates:** CustomFeed + FeedFilter records (transaction)
- **Unsets:** Other default feeds if isDefault=true
- **Returns:** Created feed with filters

**`feed.update`** - Update custom feed
- **Input:** `{ feedId, name?, filters?, isDefault? }`
- **Output:** `{ feed }`
- **Auth:** Required (owner only)
- **Validates:** Feed exists, ownership, name uniqueness (if changing name)
- **Updates:** CustomFeed record, replaces filters (transaction)
- **Unsets:** Other default feeds if isDefault=true
- **Returns:** Updated feed with filters

**`feed.delete`** - Delete custom feed
- **Input:** `{ feedId }`
- **Output:** `{ success }`
- **Auth:** Required (owner only)
- **Validates:** Feed exists, ownership
- **Deletes:** CustomFeed (CASCADE deletes FeedFilter records)
- **Returns:** Success confirmation

---

### 6. Media Router (`media`)

**File:** `apps/api/src/rpc/routers/media.ts`

**Purpose:** Two-phase media upload with S3 presigned URLs, storage management

**Procedures:**

**`media.initiateUpload`** - Generate presigned S3 URL
- **Input:** `{ filename, contentType, size }`
- **Output:** `{ uploadUrl, mediaId, expiresAt }`
- **Auth:** Required
- **Validates:** File type allowed, size within limits, storage quota available
- **Checks:** Storage quota with FOR UPDATE lock (prevents race conditions)
- **Generates:** Unique UUID mediaId, S3 key, presigned URL (15-min expiry)
- **Creates:** PendingUpload record
- **Returns:** Upload URL for client-side S3 upload

**`media.completeUpload`** - Confirm upload and create media record
- **Input:** `{ mediaId }`
- **Output:** `{ media }`
- **Auth:** Required
- **Validates:** PendingUpload exists, ownership, not expired
- **Creates:** PostMedia record (postId = null, attached to post later)
- **Deletes:** PendingUpload record
- **Trigger:** Updates StorageUsage automatically
- **Returns:** Media object with public URL

**`media.deleteMedia`** - Delete media from S3 and database
- **Input:** `{ mediaId }`
- **Output:** `{ success }`
- **Auth:** Required (owner only)
- **Validates:** Media exists, ownership
- **Deletes:** S3 object (graceful failure if S3 delete fails)
- **Deletes:** PostMedia record
- **Trigger:** Updates StorageUsage automatically
- **Returns:** Success confirmation

**`media.getStorageUsage`** - Get storage usage statistics
- **Input:** `{}`
- **Output:** `{ used, limit, percentage }`
- **Auth:** Required
- **Creates:** StorageUsage record if doesn't exist (new user)
- **Returns:** Used bytes, quota bytes, percentage used

---

### 7. Message Router (`message`)

**File:** `apps/api/src/rpc/routers/message.ts`

**Purpose:** Direct messaging and conversation management

**Procedures:**

**`message.sendMessage`** - Send a message
- **Input:** `{ conversationId?, recipientId?, content, mediaIds? }`
- **Output:** `{ message, conversation }`
- **Auth:** Required
- **Validates:** Either conversationId OR recipientId provided, recipient exists (if new), not self-message
- **Creates:** Conversation if new (ordered participant IDs)
- **Creates:** Message record (sender auto-added to readBy)
- **Updates:** Conversation.lastMessageAt
- **Returns:** Message and conversation info

**`message.getConversations`** - Get user's conversations
- **Input:** `{ limit, cursor? }`
- **Output:** `{ items, nextCursor, hasMore }`
- **Auth:** Required
- **Filters:** Conversations where user is participant
- **Sorts:** By lastMessageAt DESC (most recent first)
- **Pagination:** Cursor-based (limit 1-100, default 20)
- **Returns:** Conversations with unread counts

**`message.getMessages`** - Get messages in conversation
- **Input:** `{ conversationId, limit, cursor? }`
- **Output:** `{ items, nextCursor, hasMore }`
- **Auth:** Required (participant only)
- **Validates:** User is participant in conversation
- **Filters:** Non-deleted messages
- **Sorts:** By id DESC (newest first)
- **Pagination:** Cursor-based (limit 1-100, default 20)
- **Returns:** Messages with readBy info

**`message.markAsRead`** - Mark message as read
- **Input:** `{ messageId }`
- **Output:** `{ success }`
- **Auth:** Required (participant only)
- **Validates:** Message exists, user is participant
- **Updates:** Adds userId to readBy array (idempotent)
- **Returns:** Success confirmation

**`message.deleteConversation`** - Soft delete conversation
- **Input:** `{ conversationId }`
- **Output:** `{ success }`
- **Auth:** Required (participant only)
- **Validates:** Conversation exists, user is participant
- **Updates:** Sets deletedAt on all messages in conversation
- **Returns:** Success confirmation

---

### 8. Notification Router (`notification`)

**File:** `apps/api/src/rpc/routers/notification.ts`

**Purpose:** Notification retrieval, marking as read, deletion

**Procedures:**

**`notification.getNotifications`** - Get user's notifications
- **Input:** `{ limit, cursor?, unreadOnly? }`
- **Output:** `{ items, nextCursor, hasMore, unreadCount }`
- **Auth:** Required
- **Filters:** User's notifications, optionally unread only
- **Sorts:** By createdAt DESC (newest first)
- **Pagination:** Cursor-based (limit 1-100, default 20)
- **Returns:** Notifications with actor info, total unread count

**`notification.markAsRead`** - Bulk mark notifications as read
- **Input:** `{ notificationIds }`
- **Output:** `{ success, count }`
- **Auth:** Required (owner only)
- **Validates:** Notifications belong to user
- **Updates:** Sets isRead=true, readAt=now for all specified notifications
- **Returns:** Success and count of notifications marked

**`notification.deleteNotification`** - Delete notification
- **Input:** `{ notificationId }`
- **Output:** `{ success }`
- **Auth:** Required (owner only)
- **Validates:** Notification exists, ownership
- **Deletes:** Notification record (hard delete)
- **Returns:** Success confirmation

---

### 9. Discovery Router (`discovery`)

**File:** `apps/api/src/rpc/routers/discovery.ts`

**Purpose:** User/post search, personalized discovery feed

**Procedures:**

**`discovery.searchUsers`** - Search users by username or display name
- **Input:** `{ query, limit, cursor? }`
- **Output:** `{ items, nextCursor, hasMore }`
- **Auth:** Public
- **Searches:** Case-insensitive search on username and displayName
- **Filters:** Visibility-based (excludes private profiles unless owner)
- **Pagination:** Cursor-based (limit 1-100, default 20)
- **Returns:** Matching users with profile info

**`discovery.searchPosts`** - Search posts by content
- **Input:** `{ query, limit, cursor? }`
- **Output:** `{ items, nextCursor, hasMore }`
- **Auth:** Public
- **Searches:** Case-insensitive search on post content
- **Filters:** Visibility-based (public posts only or accessible to viewer)
- **Sorts:** By likesCount DESC, createdAt DESC (most popular first)
- **Pagination:** Cursor-based (limit 1-100, default 20)
- **Returns:** Matching posts with author and stats

**`discovery.getDiscoverFeed`** - Get personalized discovery feed
- **Input:** `{ limit, cursor? }`
- **Output:** `{ items, nextCursor, hasMore }`
- **Auth:** Required
- **Algorithm:** 2-degree network (friends + friends-of-friends)
- **Query:** CTE (Common Table Expression) for efficient graph traversal
- **Filters:** Public posts only from network users
- **Sorts:** By likesCount DESC, createdAt DESC (engagement + recency)
- **Pagination:** Cursor-based (limit 1-100, default 20)
- **Returns:** Posts from extended network

---

### 10. Settings Router (`settings`)

**File:** `apps/api/src/rpc/routers/settings.ts`

**Purpose:** Account settings, privacy settings, account deletion, data export

**Procedures:**

**`settings.getAccountSettings`** - Get current account settings
- **Input:** `{}`
- **Output:** `{ settings }`
- **Auth:** Required
- **Returns:** Username, email, emailVerified, createdAt

**`settings.updateAccount`** - Update account information
- **Input:** `{ username?, email?, currentPassword?, newPassword? }`
- **Output:** `{ success, user }`
- **Auth:** Required
- **Validates:** Current password (if provided), username uniqueness, email uniqueness
- **Updates:** Username, email (resets emailVerified), password
- **Returns:** Updated username and email

**`settings.updatePrivacy`** - Update privacy settings
- **Input:** `{ profileVisibility?, allowMessagesFrom?, showFollowers? }`
- **Output:** `{ settings }`
- **Auth:** Required
- **Updates:** UserProfile.visibility, styleConfig.privacy JSONB
- **Merges:** New privacy settings with existing styleConfig
- **Returns:** Updated privacy settings

**`settings.deleteAccount`** - Soft delete account
- **Input:** `{ password }`
- **Output:** `{ success }`
- **Auth:** Required
- **Validates:** Password correctness
- **Updates:** User.status = "deleted", User.deletedAt = now
- **Note:** Username remains reserved, data preserved for recovery

**`settings.exportData`** - Generate GDPR-compliant data export
- **Input:** `{}`
- **Output:** `{ data }`
- **Auth:** Required
- **Exports:** User profile, posts, comments, interactions, follows, friendships, messages, privacy settings
- **Format:** JSON object with all user data
- **Returns:** Complete data export for download

---

## Cross-References

**Related Documentation:**
- [DATA_MODEL.md](./DATA_MODEL.md) - Complete data model with all 28 models
- [DATABASE.md](./DATABASE.md) - Prisma schema, migrations, and database features
- [AUTHENTICATION.md](./AUTHENTICATION.md) - Better-auth integration and session management
- [FRONTEND.md](./FRONTEND.md) - Frontend API client and data fetching patterns

**Code Locations:**
- API routers: `apps/api/src/rpc/routers/`
- Zod schemas: `apps/api/src/rpc/routers/schemas/`
- Type contracts: `packages/api-contracts/src/`
- RPC middleware: `apps/api/src/rpc/middleware.ts`
- Error codes: `packages/api-contracts/src/error-codes.ts`

---

**Document Version:** 1.0
**Last Updated:** 2025-10-21
**Phase Status:** Phase 4.4 Complete (Authentication UI)
