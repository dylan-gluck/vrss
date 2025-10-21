# Cross-Cutting Concepts

**Complete Documentation**: @docs/cross-cutting-concepts.md

## System-Wide Patterns

**Security**:
- Session-based authentication with Better-auth (HTTP-only cookies, 7-day expiration)
- Authorization patterns: Ownership validation, visibility enforcement, role-based access
- Data protection: bcrypt password hashing, TLS encryption, SQL injection prevention via Prisma

**Error Handling**:
- Standardized RPC error codes (1000-1999 ranges)
- Client-side error mapping with user-friendly messages
- Retry logic with exponential backoff for transient failures
- Offline queue for failed operations with background sync

**Performance**:
- Multi-layer caching: Browser (static assets) → TanStack Query (API responses) → CDN (media)
- Optimistic updates with automatic rollback on failure
- Connection pooling for database (10-20 connections)
- Virtualized lists for feed rendering

**Logging & Auditing**:
- Structured JSON logging with correlation IDs
- Audit trail for sensitive operations (account changes, admin actions)
- Request tracking through RPC calls with metadata

## Implementation Patterns (Pseudocode)

**Component Structure**:
```pseudocode
COMPONENT: Feature_Component
  ORGANIZE: By feature domain (/features/auth/, /features/feed/)
  STRUCTURE: hooks/, components/, stores/, api/
  EXPORT: Single index.ts per feature for clean imports
```

**State Management** (4 layers):
```pseudocode
LAYER_1: Server State (TanStack Query)
  - API data, cached with automatic refetch

LAYER_2: Global Client State (Zustand)
  - Auth state, UI state (theme, modals, sidebar)
  - Persisted to localStorage

LAYER_3: Feature State (Zustand per feature)
  - Feed builder state, profile editor state
  - Scoped to feature, not global

LAYER_4: Local Component State (React useState)
  - Form inputs, UI interactions, temporary state
```

**Data Processing**:
```pseudocode
FUNCTION: process_rpc_call(procedure, input)
  VALIDATE: input via Zod schema
  AUTHORIZE: session + ownership/visibility checks
  TRANSFORM: DTOs -> Domain entities
  EXECUTE: Business logic with Prisma
  RESPOND: Typed response OR error code
```

**Error Handling**:
```pseudocode
FUNCTION: handle_rpc_error(error)
  CLASSIFY: error.code (1000-1999 range)
  LOG: Error details + context
  MAP: Error code -> User-friendly message
  RESPOND: { success: false, error: { code, message, details } }
```

**Test Pattern**:
```pseudocode
TEST: "User can create post with media"
  SETUP: Authenticated user, valid media file
  EXECUTE: createPost RPC call
  VERIFY: Post created, media attached, storage updated, feed invalidated
```

## Integration Points

**Feature Integration Pattern**:
- **RPC Procedures**: Register in router (e.g., `/rpc/routers/post.ts`)
- **Stores**: Create Zustand store in feature (e.g., `/features/post/stores/postStore.ts`)
- **Event System**: Type-safe event emitter for cross-feature communication
- **Routes**: Register in React Router with lazy loading

**Data Flow** (Unidirectional with Optimistic Updates):
```
User Action → Optimistic UI Update → RPC Call → Database → Response → State Update → UI Render
             ↑ Rollback on error ↑
```

**Media Integration** (Two-Phase Upload):
```
1. Frontend: media.initiateUpload → Get presigned URL + mediaId
2. Frontend: Upload directly to S3 (no backend proxy)
3. Frontend: media.completeUpload → Backend validates S3 upload
```
