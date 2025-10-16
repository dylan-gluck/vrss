# VRSS RPC API Quick Reference

## Table of Contents

- [Endpoint Overview](#endpoint-overview)
- [Error Codes Reference](#error-codes-reference)
- [Common Request Patterns](#common-request-patterns)
- [Response Patterns](#response-patterns)
- [RPC vs REST Comparison](#rpc-vs-rest-comparison)
- [Client SDK Cheatsheet](#client-sdk-cheatsheet)

---

## Endpoint Overview

### Authentication (`auth.*`)

| Procedure | Input | Output | Auth Required |
|-----------|-------|--------|---------------|
| `auth.register` | username, email, password | user, sessionToken | No |
| `auth.login` | email, password | user, sessionToken | No |
| `auth.getSession` | - | user, expiresAt | Yes |
| `auth.logout` | - | success | Yes |

### User Profiles (`user.*`)

| Procedure | Input | Output | Auth Required |
|-----------|-------|--------|---------------|
| `user.getProfile` | username | user, style, sections | No |
| `user.updateProfile` | displayName, bio, avatarUrl | user | Yes |
| `user.updateStyle` | ProfileStyle object | style | Yes |
| `user.updateSections` | sections[] | sections | Yes |

### Posts (`post.*`)

| Procedure | Input | Output | Auth Required |
|-----------|-------|--------|---------------|
| `post.create` | type, content, mediaIds, visibility | post | Yes |
| `post.getById` | postId | post, author | No |
| `post.update` | postId, content, visibility | post | Yes |
| `post.delete` | postId | success | Yes |
| `post.getComments` | postId, limit, cursor | comments[], nextCursor | No |

### Feeds (`feed.*`)

| Procedure | Input | Output | Auth Required |
|-----------|-------|--------|---------------|
| `feed.getFeed` | feedId, limit, cursor | posts[], nextCursor, hasMore | Yes |
| `feed.createFeed` | name, filters[] | feed | Yes |
| `feed.updateFeed` | feedId, name, filters[] | feed | Yes |
| `feed.deleteFeed` | feedId | success | Yes |
| `feed.listFeeds` | - | feeds[] | Yes |

### Social Graph (`social.*`)

| Procedure | Input | Output | Auth Required |
|-----------|-------|--------|---------------|
| `social.follow` | userId | following: true | Yes |
| `social.unfollow` | userId | following: false | Yes |
| `social.getFollowers` | userId, limit, cursor | followers[], nextCursor | No |
| `social.getFollowing` | userId, limit, cursor | following[], nextCursor | No |
| `social.sendFriendRequest` | userId | requestId, status | Yes |
| `social.respondToFriendRequest` | requestId, accept | status | Yes |
| `social.getFriends` | userId, limit, cursor | friends[], nextCursor | No |

### Discovery (`discovery.*`)

| Procedure | Input | Output | Auth Required |
|-----------|-------|--------|---------------|
| `discovery.searchUsers` | query, limit | users[] | No |
| `discovery.searchPosts` | query, limit, cursor | posts[], nextCursor | No |
| `discovery.getDiscoverFeed` | algorithmId, limit, cursor | posts[], nextCursor | Yes |
| `discovery.getTrending` | limit | posts[] | No |

### Messages (`message.*`)

| Procedure | Input | Output | Auth Required |
|-----------|-------|--------|---------------|
| `message.sendMessage` | recipientId, content, mediaIds | message | Yes |
| `message.getConversations` | limit, cursor | conversations[], nextCursor | Yes |
| `message.getMessages` | conversationId, limit, cursor | messages[], nextCursor | Yes |
| `message.markAsRead` | messageIds[] | success | Yes |
| `message.deleteConversation` | conversationId | success | Yes |

### Notifications (`notification.*`)

| Procedure | Input | Output | Auth Required |
|-----------|-------|--------|---------------|
| `notification.getNotifications` | limit, cursor | notifications[], nextCursor, unreadCount | Yes |
| `notification.markAsRead` | notificationIds[] | success | Yes |
| `notification.markAllAsRead` | - | success | Yes |
| `notification.deleteNotification` | notificationId | success | Yes |

### Media (`media.*`)

| Procedure | Input | Output | Auth Required |
|-----------|-------|--------|---------------|
| `media.initiateUpload` | filename, contentType, size | uploadId, uploadUrl, mediaId | Yes |
| `media.completeUpload` | uploadId, mediaId | media | Yes |
| `media.getStorageUsage` | - | used, limit, percentage | Yes |
| `media.listMedia` | limit, cursor | media[], nextCursor | Yes |
| `media.deleteMedia` | mediaId | success | Yes |

### Settings (`settings.*`)

| Procedure | Input | Output | Auth Required |
|-----------|-------|--------|---------------|
| `settings.updateAccount` | username, email, passwords | user | Yes |
| `settings.updatePrivacy` | profileVisibility, allowMessagesFrom, showFollowers | settings | Yes |
| `settings.getSettings` | - | settings | Yes |
| `settings.deleteAccount` | password, confirmation | success | Yes |

---

## Error Codes Reference

### Authentication Errors (1000-1099)

```typescript
1000: UNAUTHORIZED              // No authentication provided
1001: INVALID_CREDENTIALS       // Wrong email/password
1002: SESSION_EXPIRED          // Session token expired
1003: INVALID_TOKEN            // Malformed or invalid token
```

### Authorization Errors (1100-1199)

```typescript
1100: FORBIDDEN                // Access denied
1101: INSUFFICIENT_PERMISSIONS // User lacks required permissions
```

### Validation Errors (1200-1299)

```typescript
1200: VALIDATION_ERROR         // General validation failure
1201: INVALID_INPUT           // Input doesn't match schema
1202: MISSING_REQUIRED_FIELD  // Required field missing
1203: INVALID_FORMAT          // Field format incorrect
```

### Resource Errors (1300-1399)

```typescript
1300: NOT_FOUND               // Generic not found
1301: RESOURCE_NOT_FOUND      // Specific resource not found
1302: USER_NOT_FOUND          // User doesn't exist
1303: POST_NOT_FOUND          // Post doesn't exist
```

### Conflict Errors (1400-1499)

```typescript
1400: CONFLICT                // Generic conflict
1401: DUPLICATE_USERNAME      // Username already taken
1402: DUPLICATE_EMAIL         // Email already registered
1403: ALREADY_FOLLOWING       // Already following user
```

### Rate Limiting (1500-1599)

```typescript
1500: RATE_LIMIT_EXCEEDED     // Too many requests
1501: TOO_MANY_REQUESTS       // Specific endpoint rate limit
```

### Storage Errors (1600-1699)

```typescript
1600: STORAGE_LIMIT_EXCEEDED  // Storage quota exceeded
1601: INVALID_FILE_TYPE       // File type not allowed
1602: FILE_TOO_LARGE          // File exceeds size limit
```

### Server Errors (1900-1999)

```typescript
1900: INTERNAL_SERVER_ERROR   // Unexpected server error
1901: DATABASE_ERROR          // Database operation failed
1902: EXTERNAL_SERVICE_ERROR  // External service unavailable
```

---

## Common Request Patterns

### Basic Request

```typescript
POST /api/rpc

{
  "procedure": "user.getProfile",
  "input": {
    "username": "dylan"
  }
}
```

### With Authentication

```typescript
POST /api/rpc
Authorization: Bearer <session-token>

{
  "procedure": "post.create",
  "input": {
    "type": "text",
    "content": "Hello world!",
    "visibility": "public"
  }
}
```

### With Cursor Pagination

```typescript
{
  "procedure": "feed.getFeed",
  "input": {
    "feedId": "feed-123",
    "limit": 20,
    "cursor": "eyJpZCI6InBvc3QtMTIzIn0="
  }
}
```

### With Context Metadata

```typescript
{
  "procedure": "post.create",
  "input": { /* ... */ },
  "context": {
    "correlationId": "req-12345",
    "clientVersion": "1.0.0"
  }
}
```

---

## Response Patterns

### Success Response

```typescript
{
  "success": true,
  "data": {
    "user": {
      "id": "user-123",
      "username": "dylan",
      "displayName": "Dylan"
    }
  },
  "metadata": {
    "timestamp": 1697558400000,
    "requestId": "req-abc123"
  }
}
```

### Error Response

```typescript
{
  "success": false,
  "error": {
    "code": 1302,
    "message": "User 'dylan' not found",
    "details": {
      "username": "dylan",
      "suggestions": ["dylan123", "dylan_"]
    }
  },
  "metadata": {
    "timestamp": 1697558400000,
    "requestId": "req-abc123"
  }
}
```

### Paginated Response

```typescript
{
  "success": true,
  "data": {
    "posts": [/* ... */],
    "nextCursor": "eyJpZCI6InBvc3QtMjAwIn0=",
    "hasMore": true
  },
  "metadata": {
    "timestamp": 1697558400000,
    "requestId": "req-abc123"
  }
}
```

---

## RPC vs REST Comparison

### Endpoint Structure

**RPC (VRSS)**
```
POST /api/rpc
Body: { procedure: "user.getProfile", input: { username: "dylan" } }
```

**REST (Traditional)**
```
GET /api/v1/users/dylan
```

### Advantages of RPC Approach

| Feature | RPC (VRSS) | REST |
|---------|------------|------|
| **Type Safety** | ✅ End-to-end TypeScript | ❌ Manual type definitions |
| **Versioning** | ✅ Header-based + procedure versioning | ⚠️ URL-based versioning |
| **Batching** | ✅ Easy to add batch support | ❌ Requires separate endpoint |
| **Operations** | ✅ Clear operation names | ⚠️ Limited to HTTP verbs |
| **Discoverability** | ⚠️ Requires documentation | ✅ Self-documenting |
| **Caching** | ⚠️ Requires custom logic | ✅ Built-in HTTP caching |
| **Developer UX** | ✅ Auto-complete, type inference | ⚠️ Manual integration |

### Example: Creating a Post

**RPC (VRSS)**
```typescript
// Type-safe call with auto-completion
const result = await api.post.create({
  type: 'text',
  content: 'Hello world!',
  visibility: 'public'
});
```

**REST (Traditional)**
```typescript
// Manual typing and URL construction
const result = await fetch('/api/v1/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'text',
    content: 'Hello world!',
    visibility: 'public'
  })
});
const data = await result.json();
```

### Example: Complex Query

**RPC (VRSS)**
```typescript
// Single procedure call
const feed = await api.feed.getFeed({
  feedId: 'custom-feed-123',
  limit: 20,
  cursor: 'abc123'
});
```

**REST (Traditional)**
```typescript
// Multiple endpoints or complex query params
const feed = await fetch(
  '/api/v1/feeds/custom-feed-123?limit=20&cursor=abc123'
);
```

---

## Client SDK Cheatsheet

### Setup

```typescript
// Initialize client
import { apiClient } from '@vrss/api-client';

// Set authentication token
apiClient.setToken(sessionToken);

// Clear authentication
apiClient.clearToken();
```

### Making Calls

```typescript
// Direct call
const result = await apiClient.call<InputType, OutputType>(
  'procedure.name',
  inputData
);

// Using hooks (React)
import { useAuth, useUser, usePost } from '../api/hooks';

const auth = useAuth();
const user = useUser();
const post = usePost();

// Call procedures
await auth.login({ email, password });
const profile = await user.getProfile('username');
await post.create({ type: 'text', content: 'Hello' });
```

### Error Handling

```typescript
import { ClientRPCError, ErrorCode } from '@vrss/api-client';

try {
  await api.post.create(data);
} catch (err) {
  if (err instanceof ClientRPCError) {
    // Check error type
    if (err.isAuthError()) {
      // Handle auth errors (1000-1099)
      redirectToLogin();
    } else if (err.isValidationError()) {
      // Handle validation errors (1200-1299)
      showValidationErrors(err.details);
    } else if (err.code === ErrorCode.STORAGE_LIMIT_EXCEEDED) {
      // Handle specific error
      showUpgradePrompt();
    }

    // Generic error handling
    console.error(err.code, err.message, err.details);
  }
}
```

### React Query Integration

```typescript
// Query (GET-like operations)
const { data, isLoading, error } = useQuery({
  queryKey: ['user', username],
  queryFn: () => api.user.getProfile(username),
});

// Mutation (POST/PUT/DELETE-like operations)
const { mutate, isPending } = useMutation({
  mutationFn: (input: PostCreateInput) => api.post.create(input),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['feed'] });
  },
});

// Infinite query (pagination)
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useInfiniteQuery({
  queryKey: ['feed', feedId],
  queryFn: ({ pageParam }) => api.feed.getFeed({
    feedId,
    cursor: pageParam,
    limit: 20
  }),
  initialPageParam: undefined,
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

### File Upload

```typescript
// Step 1: Initiate upload
const { uploadUrl, mediaId } = await api.media.initiateUpload({
  filename: file.name,
  contentType: file.type,
  size: file.size
});

// Step 2: Upload to S3
await fetch(uploadUrl, {
  method: 'PUT',
  headers: { 'Content-Type': file.type },
  body: file
});

// Step 3: Complete upload
const { media } = await api.media.completeUpload({
  uploadId,
  mediaId
});

// Step 4: Use media in post
await api.post.create({
  type: 'image',
  content: 'Check out this photo!',
  mediaIds: [mediaId]
});
```

---

## Rate Limits

| Procedure | Limit | Window |
|-----------|-------|--------|
| `auth.login` | 5 requests | 1 minute |
| `auth.register` | 3 requests | 1 hour |
| `post.create` | 10 requests | 1 minute |
| `message.sendMessage` | 30 requests | 1 minute |
| `media.initiateUpload` | 10 requests | 1 minute |
| **Default** | 60 requests | 1 minute |

### Handling Rate Limits

```typescript
try {
  await api.post.create(data);
} catch (err) {
  if (err instanceof ClientRPCError) {
    if (err.code === ErrorCode.RATE_LIMIT_EXCEEDED) {
      // Show rate limit message
      toast.error('Too many requests. Please wait a moment.');

      // Retry after delay
      setTimeout(() => retry(), 60000);
    }
  }
}
```

---

## Pagination Guide

### Cursor-Based Pagination

All list endpoints use cursor-based pagination for performance:

```typescript
// Initial request
const page1 = await api.feed.getFeed({
  feedId: 'my-feed',
  limit: 20
});

// Next page
const page2 = await api.feed.getFeed({
  feedId: 'my-feed',
  limit: 20,
  cursor: page1.nextCursor
});

// Check if more pages
if (page1.hasMore) {
  // Load more
}
```

### Infinite Scroll Pattern

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';

function Feed() {
  const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: ({ pageParam }) => api.feed.getFeed({
      limit: 20,
      cursor: pageParam
    }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const { ref } = useInView({
    onChange: (inView) => {
      if (inView && hasNextPage) {
        fetchNextPage();
      }
    }
  });

  const posts = data?.pages.flatMap(page => page.posts) ?? [];

  return (
    <div>
      {posts.map(post => <PostCard key={post.id} post={post} />)}
      <div ref={ref}>Loading more...</div>
    </div>
  );
}
```

---

## Type Safety Examples

### Branded Types

```typescript
// Type-safe IDs prevent mixing different entity types
type UserId = string & { __brand: 'UserId' };
type PostId = string & { __brand: 'PostId' };

// Compile error: Type 'PostId' is not assignable to type 'UserId'
const userId: UserId = postId; // ❌ Error!

// Correct usage
const user = await api.user.getProfile(userId);
const post = await api.post.getById(postId);
```

### Input Validation

```typescript
// Input types enforce correct structure
type CreatePostInput = {
  type: 'text' | 'image' | 'video' | 'song';
  content: string;
  mediaIds?: MediaId[];
  visibility?: 'public' | 'followers' | 'private';
};

// Auto-complete and type checking
await api.post.create({
  type: 'text',        // ✅ Valid
  // type: 'blog',     // ❌ Error: Type '"blog"' is not assignable
  content: 'Hello',
  visibility: 'public' // ✅ Valid
  // visibility: 'friends' // ❌ Error: Type '"friends"' is not assignable
});
```

### Output Types

```typescript
// Return types are fully typed
const result = await api.user.getProfile('dylan');

// Auto-complete available
result.user.username;  // ✅ string
result.user.email;     // ✅ string
result.style.backgroundColor; // ✅ string | undefined
// result.user.foo;    // ❌ Property 'foo' does not exist
```

---

## Development Tips

### 1. Use TypeScript's `satisfies`

```typescript
// Ensure return matches contract
return {
  post: createdPost
} satisfies PostProcedures.Create['output'];
```

### 2. Leverage Union Types

```typescript
// Handle different error types
if (err instanceof ClientRPCError) {
  switch (err.code) {
    case ErrorCode.UNAUTHORIZED:
      // Handle auth
      break;
    case ErrorCode.VALIDATION_ERROR:
      // Handle validation
      break;
    default:
      // Generic handler
  }
}
```

### 3. Create Custom Hooks

```typescript
// Encapsulate complex logic
export function useCreatePost() {
  const { mutate, ...rest } = useMutation({
    mutationFn: api.post.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['feed']);
      toast.success('Post created!');
    },
    onError: (err) => {
      if (err.code === ErrorCode.STORAGE_LIMIT_EXCEEDED) {
        showUpgradeModal();
      } else {
        toast.error(err.message);
      }
    },
  });

  return { createPost: mutate, ...rest };
}
```

### 4. Environment Configuration

```typescript
// .env.development
VITE_API_URL=http://localhost:3001

// .env.production
VITE_API_URL=https://api.vrss.app

// Usage
const apiClient = new RPCClient(
  import.meta.env.VITE_API_URL
);
```

---

## Testing Patterns

### Mock API Calls

```typescript
import { mock } from 'bun:test';
import { apiClient } from '@vrss/api-client';

// Mock specific procedure
mock.module('@vrss/api-client', () => ({
  apiClient: {
    call: mock((procedure, input) => {
      if (procedure === 'user.getProfile') {
        return {
          user: { id: '1', username: 'testuser' },
          style: {},
          sections: []
        };
      }
    })
  }
}));
```

### Test RPC Handlers

```typescript
import { expect, test } from 'bun:test';
import { postRouter } from '../routers/post';

test('post.create should create post', async () => {
  const result = await postRouter['post.create']({
    input: {
      type: 'text',
      content: 'Test post'
    },
    user: { id: 'user-1' },
    requestId: 'test-123'
  });

  expect(result.post).toBeDefined();
  expect(result.post.content).toBe('Test post');
});
```

---

## Performance Tips

### 1. Batch Reads (Future)

```typescript
// Instead of multiple calls
const user1 = await api.user.getProfile('user1');
const user2 = await api.user.getProfile('user2');

// Use batch endpoint (when implemented)
const users = await api.user.getBatch(['user1', 'user2']);
```

### 2. Prefetch Data

```typescript
// Prefetch on hover
<Link
  to={`/user/${username}`}
  onMouseEnter={() => {
    queryClient.prefetchQuery({
      queryKey: ['user', username],
      queryFn: () => api.user.getProfile(username)
    });
  }}
>
```

### 3. Optimistic Updates

```typescript
const mutation = useMutation({
  mutationFn: api.post.like,
  onMutate: async (postId) => {
    // Optimistically update
    queryClient.setQueryData(['post', postId], (old) => ({
      ...old,
      stats: { ...old.stats, likes: old.stats.likes + 1 }
    }));
  }
});
```

---

## Security Checklist

- ✅ Always validate input on the backend
- ✅ Use branded types to prevent ID mixing
- ✅ Implement rate limiting on sensitive endpoints
- ✅ Validate session tokens in middleware
- ✅ Check resource ownership before modifications
- ✅ Sanitize user-generated content
- ✅ Use HTTPS in production
- ✅ Implement CORS correctly
- ✅ Never expose secrets in error messages
- ✅ Validate file types and sizes for uploads

---

## Useful Resources

- **Main Docs**: `/docs/api-architecture.md`
- **Implementation Guide**: `/docs/api-implementation-guide.md`
- **Type Contracts**: `packages/api-contracts/src/`
- **Backend Routers**: `apps/api/src/rpc/routers/`
- **Frontend Hooks**: `apps/pwa/src/api/hooks/`

---

## Quick Command Reference

```bash
# Start development server
bun run dev

# Run tests
bun test

# Type check
bun run typecheck

# Generate Prisma client
bunx prisma generate

# Run migrations
bunx prisma migrate dev

# Open Prisma Studio
bunx prisma studio

# Build for production
bun run build

# Start production server
bun start
```

---

This quick reference should be your go-to guide for daily development with the VRSS RPC API!
