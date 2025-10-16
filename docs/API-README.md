# VRSS RPC API Documentation

> **Type-safe RPC API architecture for the VRSS social platform, built on Bun + Hono**

## Overview

This documentation describes the RPC-style API for VRSS, a personalized social media platform. The API follows a procedure-based pattern (inspired by tRPC and JSON-RPC) that provides end-to-end type safety between the frontend PWA and backend services.

### Why RPC instead of REST?

The RPC pattern was chosen for VRSS because:

1. **Type Safety**: Shared TypeScript types eliminate runtime errors and provide auto-completion
2. **Developer Experience**: Procedure names are more intuitive than HTTP verb + URL combinations
3. **Future-Proof**: Easy to add features like request batching without API redesign
4. **Consistency**: Single endpoint pattern (`/api/rpc`) simplifies routing and middleware
5. **Better Tooling**: IDE auto-completion and type inference reduce development time

## Documentation Structure

### 📚 [API Architecture](./api-architecture.md)

**Complete technical specification of the RPC API**

Read this document for:
- RPC request/response structure and patterns
- Complete type-safe contract definitions for all procedures
- Error handling with standardized error codes
- Authentication integration with Better-auth
- File upload strategy using two-phase S3 uploads
- Backend implementation with Hono framework
- Frontend client SDK design
- Rate limiting and versioning strategies
- Project structure and organization

**Best for**: Understanding the overall architecture, making architectural decisions, and designing new features.

### 🛠️ [Implementation Guide](./api-implementation-guide.md)

**Practical examples and step-by-step implementation instructions**

Read this document for:
- Setup and installation instructions
- Complete implementation examples:
  - Post creation flow (validation, handlers, hooks, components)
  - Custom feed algorithm builder
  - File upload with progress tracking
- Testing strategies (unit, integration, component)
- Common patterns (optimistic updates, infinite scroll, error boundaries)
- Performance optimization techniques
- Deployment configuration (Docker, docker-compose)

**Best for**: Building features, writing tests, and implementing specific functionality.

### ⚡ [Quick Reference](./api-quick-reference.md)

**Concise reference guide for daily development**

Read this document for:
- Complete endpoint overview table
- Error codes reference (1000-1999)
- Common request/response patterns
- RPC vs REST comparison
- Client SDK cheatsheet
- Rate limits table
- Pagination guide
- Type safety examples
- Development tips
- Testing patterns

**Best for**: Quick lookups, debugging, and understanding specific procedures during development.

---

## Quick Start

### 1. Read the Architecture

Start with [api-architecture.md](./api-architecture.md) to understand:
- How the RPC pattern works
- Type contract system
- Overall design philosophy

### 2. Follow the Implementation Guide

Use [api-implementation-guide.md](./api-implementation-guide.md) to:
- Set up your development environment
- See complete working examples
- Learn testing strategies

### 3. Use Quick Reference Daily

Keep [api-quick-reference.md](./api-quick-reference.md) open while coding for:
- Endpoint lookups
- Error code meanings
- Common patterns

---

## API Highlights

### All MVP Features Supported

✅ **Authentication**: Register, login, session management
✅ **Profile Management**: CRUD for profiles, styles, sections, layouts
✅ **Content Operations**: Create/read/update/delete posts (text, images, videos, songs)
✅ **Feed Generation**: Custom feeds with filter algorithms
✅ **Social Graph**: Follow/unfollow, friend requests, followers/following
✅ **Discovery**: Search users, custom discovery algorithms
✅ **Messages**: Direct messaging, conversation threads
✅ **Notifications**: Fetch and manage notifications
✅ **Media Management**: Upload media, track storage usage
✅ **Settings**: Account settings, privacy controls, account deletion

### Key Features

- **End-to-end Type Safety**: Shared TypeScript types prevent runtime errors
- **Single Endpoint**: All RPC calls through `/api/rpc`
- **Standardized Errors**: Clear error codes (1000-1999) with helpful messages
- **File Uploads**: Two-phase S3 upload with progress tracking
- **Rate Limiting**: Protect against abuse with per-procedure limits
- **Pagination**: Efficient cursor-based pagination for all lists
- **Versioning**: Header-based versioning for API evolution

---

## Example Usage

### Backend: Define Procedure

```typescript
// apps/api/src/rpc/routers/post.ts
export const postRouter = {
  'post.create': async (ctx: ProcedureContext<PostProcedures.Create['input']>) => {
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const post = await db.post.create({
      data: {
        authorId: ctx.user.id,
        type: ctx.input.type,
        content: ctx.input.content,
        visibility: ctx.input.visibility || 'public',
      },
    });

    return { post } satisfies PostProcedures.Create['output'];
  },
};
```

### Frontend: Use Type-Safe Hook

```typescript
// apps/pwa/src/components/CreatePostForm.tsx
import { usePost } from '../api/hooks/usePost';

function CreatePostForm() {
  const { create } = usePost();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await create.mutateAsync({
        type: 'text',
        content: 'Hello world!',
        visibility: 'public',
      });

      toast.success('Post created!');
    } catch (err) {
      if (err instanceof ClientRPCError) {
        toast.error(err.message);
      }
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Type Safety in Action

```typescript
// Full type inference and auto-completion
const result = await apiClient.call<
  PostProcedures.Create['input'],
  PostProcedures.Create['output']
>('post.create', {
  type: 'text',     // ✅ Auto-complete: 'text' | 'image' | 'video' | 'song'
  content: 'Hello', // ✅ Type: string
  visibility: 'public' // ✅ Auto-complete: 'public' | 'followers' | 'private'
});

// result.post is fully typed
result.post.id;        // ✅ string
result.post.content;   // ✅ string
result.post.authorId;  // ✅ UserId
```

---

## Technology Stack

- **Runtime**: [Bun](https://bun.sh) - Fast JavaScript runtime
- **Framework**: [Hono](https://hono.dev) - Lightweight web framework
- **Authentication**: [Better-auth](https://better-auth.com) - Modern auth solution
- **Database**: PostgreSQL with [Prisma](https://prisma.io) ORM
- **Storage**: AWS S3 for media files
- **Type System**: TypeScript with branded types
- **Frontend**: React PWA with React Query

---

## Project Structure

```
vrss/
├── packages/
│   ├── api-contracts/        # Shared types (contracts)
│   │   ├── src/
│   │   │   ├── index.ts      # Procedure definitions
│   │   │   ├── errors.ts     # Error codes
│   │   │   └── types.ts      # Entities and types
│   │   └── package.json
│   │
│   └── api-client/           # Frontend RPC client
│       ├── src/
│       │   └── index.ts      # RPCClient class
│       └── package.json
│
├── apps/
│   ├── api/                  # Backend API (Bun + Hono)
│   │   ├── src/
│   │   │   ├── index.ts      # Server entry
│   │   │   ├── rpc/
│   │   │   │   ├── router.ts # Main RPC router
│   │   │   │   └── routers/  # Procedure handlers
│   │   │   ├── middleware/   # Auth, rate limit, etc.
│   │   │   └── services/     # Business logic
│   │   └── package.json
│   │
│   └── pwa/                  # Frontend PWA
│       ├── src/
│       │   ├── api/
│       │   │   └── hooks.ts  # Typed API hooks
│       │   └── components/
│       └── package.json
│
└── docs/
    ├── api-architecture.md            # Technical spec
    ├── api-implementation-guide.md    # Practical examples
    ├── api-quick-reference.md         # Daily reference
    └── API-README.md                  # This file
```

---

## Development Workflow

### Adding a New Feature

1. **Define Type Contract** in `packages/api-contracts/src/`
   ```typescript
   export namespace FeatureProcedures {
     export interface DoSomething {
       input: { field: string };
       output: { result: string };
     }
   }
   ```

2. **Implement Backend Handler** in `apps/api/src/rpc/routers/`
   ```typescript
   export const featureRouter = {
     'feature.doSomething': async (ctx) => {
       // Implementation
       return { result: 'done' } satisfies FeatureProcedures.DoSomething['output'];
     },
   };
   ```

3. **Create Frontend Hook** in `apps/pwa/src/api/hooks/`
   ```typescript
   export const useFeature = () => ({
     doSomething: (field: string) =>
       apiClient.call('feature.doSomething', { field }),
   });
   ```

4. **Use in Component**
   ```typescript
   const { doSomething } = useFeature();
   const result = await doSomething('value');
   ```

---

## Common Patterns

### Error Handling

```typescript
try {
  await api.post.create(data);
} catch (err) {
  if (err instanceof ClientRPCError) {
    if (err.isAuthError()) {
      redirectToLogin();
    } else if (err.isValidationError()) {
      showErrors(err.details);
    } else {
      toast.error(err.message);
    }
  }
}
```

### Pagination

```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['feed'],
  queryFn: ({ pageParam }) =>
    api.feed.getFeed({ cursor: pageParam, limit: 20 }),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
});
```

### File Upload

```typescript
// 1. Initiate
const { uploadUrl, mediaId } = await api.media.initiateUpload({
  filename: file.name,
  contentType: file.type,
  size: file.size
});

// 2. Upload to S3
await fetch(uploadUrl, {
  method: 'PUT',
  body: file
});

// 3. Complete
await api.media.completeUpload({ uploadId, mediaId });
```

---

## Testing

### Backend Unit Tests

```typescript
import { expect, test } from 'bun:test';

test('post.create should create post', async () => {
  const result = await postRouter['post.create']({
    input: { type: 'text', content: 'Test' },
    user: mockUser,
    requestId: 'test-123',
  });

  expect(result.post).toBeDefined();
  expect(result.post.content).toBe('Test');
});
```

### Frontend Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';

test('should submit post', async () => {
  render(<CreatePostForm />);

  fireEvent.change(screen.getByPlaceholderText('Content'), {
    target: { value: 'Test post' }
  });

  fireEvent.click(screen.getByText('Post'));

  await waitFor(() => {
    expect(apiClient.call).toHaveBeenCalledWith('post.create', {
      type: 'text',
      content: 'Test post',
    });
  });
});
```

---

## API Endpoints Summary

| Category | Procedures | Auth Required |
|----------|-----------|---------------|
| **Authentication** | register, login, getSession, logout | Varies |
| **User Profiles** | getProfile, updateProfile, updateStyle, updateSections | Varies |
| **Posts** | create, getById, update, delete, getComments | Varies |
| **Feeds** | getFeed, createFeed, updateFeed, deleteFeed, listFeeds | Yes |
| **Social** | follow, unfollow, getFollowers, getFollowing, friendRequest | Varies |
| **Discovery** | searchUsers, searchPosts, getDiscoverFeed, getTrending | Varies |
| **Messages** | sendMessage, getConversations, getMessages, markAsRead | Yes |
| **Notifications** | getNotifications, markAsRead, markAllAsRead, delete | Yes |
| **Media** | initiateUpload, completeUpload, getStorageUsage, delete | Yes |
| **Settings** | updateAccount, updatePrivacy, getSettings, deleteAccount | Yes |

See [api-quick-reference.md](./api-quick-reference.md) for complete details.

---

## Error Codes

| Range | Category | Examples |
|-------|----------|----------|
| 1000-1099 | Authentication | UNAUTHORIZED, INVALID_CREDENTIALS, SESSION_EXPIRED |
| 1100-1199 | Authorization | FORBIDDEN, INSUFFICIENT_PERMISSIONS |
| 1200-1299 | Validation | VALIDATION_ERROR, INVALID_INPUT, MISSING_REQUIRED_FIELD |
| 1300-1399 | Resources | NOT_FOUND, USER_NOT_FOUND, POST_NOT_FOUND |
| 1400-1499 | Conflicts | DUPLICATE_USERNAME, DUPLICATE_EMAIL, ALREADY_FOLLOWING |
| 1500-1599 | Rate Limiting | RATE_LIMIT_EXCEEDED, TOO_MANY_REQUESTS |
| 1600-1699 | Storage | STORAGE_LIMIT_EXCEEDED, INVALID_FILE_TYPE, FILE_TOO_LARGE |
| 1900-1999 | Server | INTERNAL_SERVER_ERROR, DATABASE_ERROR, EXTERNAL_SERVICE_ERROR |

---

## Rate Limits

| Procedure | Limit | Window |
|-----------|-------|--------|
| auth.login | 5 | 1 minute |
| auth.register | 3 | 1 hour |
| post.create | 10 | 1 minute |
| message.sendMessage | 30 | 1 minute |
| media.initiateUpload | 10 | 1 minute |
| **Default** | 60 | 1 minute |

---

## Performance Considerations

- **Pagination**: All list endpoints use cursor-based pagination (max 100 per request)
- **Caching**: Public data cached with appropriate TTLs
- **Rate Limiting**: Per-user and per-procedure limits
- **Request Deduplication**: Identical in-flight requests are deduplicated
- **Optimistic Updates**: UI updates before server confirmation
- **Batching**: Future enhancement for multiple procedures in one request

---

## Security

- ✅ Input validation on all procedures
- ✅ Authentication required for sensitive operations
- ✅ Authorization checks for resource access
- ✅ Rate limiting to prevent abuse
- ✅ CORS configured for trusted origins
- ✅ SQL injection protection via Prisma
- ✅ File type and size validation
- ✅ Secrets never exposed in errors

---

## Future Enhancements

Potential additions to the API:

1. **Request Batching**: Multiple procedures in one HTTP request
2. **WebSocket Support**: Real-time notifications and messages
3. **GraphQL Layer**: Optional GraphQL interface over RPC
4. **API Playground**: Interactive documentation with live testing
5. **SDK Generation**: Auto-generated SDKs for mobile platforms
6. **Webhooks**: Event notifications to external services
7. **API Analytics**: Usage tracking and performance monitoring

---

## Getting Help

- **Architecture Questions**: See [api-architecture.md](./api-architecture.md)
- **Implementation Help**: See [api-implementation-guide.md](./api-implementation-guide.md)
- **Quick Lookups**: See [api-quick-reference.md](./api-quick-reference.md)
- **Code Examples**: Check implementation guide for complete working examples
- **Type Definitions**: Refer to `packages/api-contracts/src/`

---

## Contributing

When adding new procedures:

1. Define types in `api-contracts` first
2. Implement backend handler with proper validation
3. Add frontend hook with type safety
4. Write unit tests for backend logic
5. Write integration tests for full flow
6. Update documentation

---

## License

This API documentation is part of the VRSS project. See project LICENSE for details.

---

**Built with ❤️ using Bun, Hono, and TypeScript**
