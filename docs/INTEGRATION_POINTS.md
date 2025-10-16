# VRSS Integration Points Documentation

**Version**: 1.0
**Date**: 2025-10-16
**Status**: Design Phase

## Table of Contents

1. [Overview](#overview)
2. [Inter-Component Communication](#inter-component-communication)
3. [External Service Integrations](#external-service-integrations)
4. [Authentication Integration](#authentication-integration)
5. [Data Flow Diagrams](#data-flow-diagrams)
6. [Integration Patterns](#integration-patterns)
7. [Error Handling & Resilience](#error-handling--resilience)

---

## Overview

This document outlines all integration points in the VRSS social platform MVP, describing how components communicate and interact within the monolith architecture.

### Architecture Context

- **Architecture Pattern**: Monolith with containerized applications
- **Communication Style**: RPC-based API with HTTP/JSON
- **Authentication**: Better-auth (session-based, database-backed)
- **Storage**: S3-compatible object storage
- **Database**: PostgreSQL with Prisma ORM

---

## Inter-Component Communication

### 1. Frontend PWA ↔ Backend API

```yaml
# Frontend to Backend Communication
From: Frontend PWA (React + Vite)
To: Backend API (Bun + Hono)
  protocol: HTTP/RPC (POST /api/rpc)
  transport: HTTPS over TCP
  format: JSON
  authentication: Session cookies (Better-auth)

  # RPC Request Structure
  request_format:
    procedure: string                    # e.g., "user.getProfile", "post.create"
    input: object                        # Typed input payload
    context:
      correlationId: string (optional)   # Client-generated request tracking
      clientVersion: string (optional)   # PWA version for compatibility

  # RPC Response Structure (Success)
  response_success:
    success: true
    data: object                         # Typed response payload
    metadata:
      timestamp: number                  # Server timestamp
      requestId: string                  # Server-generated request ID

  # RPC Response Structure (Error)
  response_error:
    success: false
    error:
      code: number                       # Standardized error code (1000-9999)
      message: string                    # Human-readable error message
      details: object (optional)         # Additional error context
    metadata:
      timestamp: number
      requestId: string

  # Connection Properties
  timeout: 30s (request timeout)
  retry_policy: exponential_backoff
  max_retries: 3
  keepalive: true

  # Data Flow Pattern
  data_flow: |
    User Action → Component Event Handler →
    RPC Client Call → HTTP Request →
    Backend Middleware (auth, validation) →
    Business Logic → Database Query →
    Response Transformation → HTTP Response →
    Client State Update → UI Render

  # Documentation Reference
  doc: "@/docs/api-architecture.md"
  sections: [RPC Request/Response Structure, Frontend Client]
```

### 2. Backend API ↔ Frontend PWA (Responses)

```yaml
# Backend to Frontend Communication
From: Backend API (Bun + Hono)
To: Frontend PWA (React + Vite)
  protocol: HTTP Response (JSON)
  status_codes:
    200: Success
    400: Client error (validation, business logic)
    401: Unauthorized (authentication required)
    403: Forbidden (insufficient permissions)
    404: Not found
    413: Payload too large (storage quota)
    429: Too many requests (rate limit)
    500: Server error

  # Response Headers
  headers:
    Content-Type: application/json
    Cache-Control: varies by endpoint
    X-Request-Id: string
    X-RateLimit-Limit: number
    X-RateLimit-Remaining: number
    Set-Cookie: vrss_session (authentication)

  # Data Flow Pattern
  data_flow: |
    Database Result → Business Logic Transformation →
    Response Serialization → JSON Encoding →
    HTTP Response → Network → Client Parsing →
    State Management (TanStack Query) → UI Update

  # Documentation Reference
  doc: "@/docs/frontend-api-integration.md"
  sections: [RPC Client Implementation, Error Handling]
```

### 3. Frontend PWA ↔ Service Worker (PWA)

```yaml
# Frontend to Service Worker Communication
From: Frontend PWA
To: Service Worker (Workbox)
  protocol: Service Worker API
  communication_channels:
    - Message passing (postMessage)
    - Fetch event interception
    - Cache API
    - Background sync

  # Offline Strategy
  offline_support:
    strategy: NetworkFirst for API calls, CacheFirst for static assets
    cache_storage:
      api-cache:
        expiration: 24 hours
        max_entries: 100
      image-cache:
        expiration: 30 days
        max_entries: 200
      static-cache:
        expiration: 7 days

  # Background Sync
  background_sync:
    enabled: true
    operations:
      - post_creation: queue failed posts for retry
      - media_upload: retry failed uploads
      - interaction: queue likes, comments when offline

  # Documentation Reference
  doc: "@/docs/frontend-architecture.md"
  sections: [PWA Configuration, Offline Strategy]
```

---

## External Service Integrations

### 1. S3-Compatible Storage Integration

```yaml
# S3 Storage Integration
Service: S3-Compatible Object Storage (MinIO local / AWS S3 production)
Purpose: Media file storage (images, videos, audio)
Integration_Pattern: Two-phase presigned URL upload

# Architecture
architecture: |
  Client → Backend (request upload URL) →
  Backend (generate presigned URL + mediaId) →
  Client (direct upload to S3) →
  Client (confirm upload) →
  Backend (validate + update database)

# Phase 1: Initiate Upload
initiate_upload:
  endpoint: media.initiateUpload
  request:
    filename: string
    contentType: string (MIME type)
    size: number (bytes)

  backend_actions:
    - Validate file type (image/*, video/*, audio/*)
    - Check storage quota (user.storageUsed + size <= user.storageLimit)
    - Generate unique mediaId (UUID)
    - Generate S3 key: "media/{userId}/{mediaId}/{filename}"
    - Create presigned PUT URL (1 hour expiration)
    - Create pending media record in database

  response:
    uploadId: string
    uploadUrl: string (presigned S3 URL)
    mediaId: string
    expiresAt: timestamp

# Phase 2: Direct Upload
direct_upload:
  from: Frontend PWA
  to: S3 Bucket
  method: HTTP PUT
  url: presigned URL from Phase 1
  headers:
    Content-Type: matches original request
  body: file binary data

  s3_validation:
    - Content-Type enforcement
    - Size limit enforcement
    - Bucket ACL (private, no public access)
    - Server-side encryption (AES-256)

# Phase 3: Complete Upload
complete_upload:
  endpoint: media.completeUpload
  request:
    uploadId: string
    mediaId: string

  backend_actions:
    - Verify media record exists
    - Verify ownership (media.ownerId === currentUser.id)
    - Verify S3 object exists (HeadObject)
    - Update media status: pending → completed
    - Update user storage quota (atomic increment)
    - Generate CDN URL for access

  response:
    media:
      id: mediaId
      url: string (CDN URL)
      type: image|video|audio
      size: number

# Storage Configuration
storage:
  local_development:
    provider: MinIO
    endpoint: http://minio:9000
    bucket: vrss-media
    access: Docker network

  production:
    provider: AWS S3
    region: us-east-1
    bucket: vrss-production-media
    cdn: CloudFront distribution
    access: Presigned URLs only

# Security Controls
security:
  - No public bucket access
  - Presigned URLs with 1-hour expiration
  - File type validation (magic bytes)
  - Size limit enforcement (50MB free, 1GB paid)
  - Virus scanning (production)
  - User quota tracking

# Critical Data
critical_data:
  - Media files: user-generated content
  - Storage quota: per-user tracking
  - Media metadata: database records

# Error Handling
error_scenarios:
  - InvalidFileType (1601): File type not allowed
  - FileTooLarge (1602): Exceeds size limit
  - StorageQuotaExceeded (1600): User quota exceeded
  - UploadVerificationFailed: S3 object not found
  - PresignedUrlExpired: Upload took longer than 1 hour

# Documentation Reference
doc: "@/docs/api-architecture.md"
sections: [File Upload Strategy, Two-Phase Upload Pattern]
related_docs:
  - "@/docs/SECURITY_DESIGN.md" (Media Upload Security)
```

### 2. PostgreSQL Database Integration

```yaml
# Database Integration
From: Backend API (Bun + Hono)
To: PostgreSQL Database
  protocol: PostgreSQL wire protocol (TCP)
  transport: TLS-encrypted connection
  orm: Prisma ORM
  connection_pool:
    max_connections: 10
    idle_timeout: 20s
    connect_timeout: 10s

# Data Access Pattern
data_access:
  pattern: Repository pattern with ORM
  flow: |
    Business Logic → Service Layer →
    Repository Layer → Prisma Client →
    Connection Pool → PostgreSQL →
    Query Execution → Result Set →
    ORM Mapping → TypeScript Objects

# Query Types
query_types:
  - CRUD operations (Create, Read, Update, Delete)
  - Complex queries (feeds, discovery algorithms)
  - Aggregations (storage usage, statistics)
  - Joins (users + posts + profiles)
  - Transactions (atomic operations)

# Example Data Flow
example_post_creation:
  1_service_layer: |
    PostService.create(userId, postData)
  2_repository_layer: |
    PostRepository.create({ userId, type, content, mediaIds })
  3_prisma_query: |
    prisma.post.create({
      data: { userId, type, content, mediaIds },
      include: { user: true }
    })
  4_sql_execution: |
    INSERT INTO posts (user_id, type, content, media_urls, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    RETURNING *
  5_response_mapping: |
    Post object with user relation

# Connection Security
security:
  - TLS/SSL encryption in transit
  - Connection string in environment variables
  - No hardcoded credentials
  - Row-level security (future enhancement)
  - Prepared statements (SQL injection prevention)

# Performance Optimization
performance:
  - Connection pooling
  - Query optimization (indexes)
  - Selective field loading
  - Pagination (cursor-based)
  - Caching layer (Redis, future)

# Critical Data
critical_data:
  - User accounts and authentication
  - Posts and content
  - Social relationships
  - Session tokens
  - Storage quota tracking

# Documentation Reference
doc: "@/docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md"
related_docs:
  - "@/docs/architecture/MONOLITH_ARCHITECTURE.md" (Database Management)
```

---

## Authentication Integration

### Better-auth Integration Points

```yaml
# Better-auth Integration
Service: Better-auth Library
Purpose: Session-based authentication and authorization
Integration_Type: Embedded library (not external service)

# Authentication Flow: Registration
registration_flow:
  1_client_request:
    endpoint: auth.register
    payload:
      username: string
      email: string
      password: string

  2_backend_processing:
    - Validate input (Zod schema)
    - Check username uniqueness (custom logic)
    - Call Better-auth signUp.email()
    - Better-auth hashes password (bcrypt, 10 rounds)
    - Create user record in database
    - Create verification token
    - Send verification email (optional)

  3_response:
    user: User object
    sessionToken: string
    requiresVerification: boolean

# Authentication Flow: Login
login_flow:
  1_client_request:
    endpoint: auth.login
    payload:
      email: string
      password: string

  2_backend_processing:
    - Rate limit check (10 attempts per 15 min)
    - Call Better-auth signIn.email()
    - Find user by email
    - Verify password (bcrypt compare)
    - Check email verification status
    - Create session record
    - Generate session token (256-bit random)

  3_response:
    user: User object
    sessionToken: string
    Set-Cookie: vrss_session (HttpOnly, Secure, SameSite=Lax)

# Session Management
session_management:
  storage: PostgreSQL database
  structure:
    id: string (CUID)
    userId: string
    token: string (unique, indexed)
    expiresAt: timestamp (7 days from creation)
    ipAddress: string (optional)
    userAgent: string (optional)

  validation:
    - Middleware extracts token from cookie/header
    - Query session by token
    - Check expiration
    - Load user data
    - Attach to request context

  refresh:
    strategy: Sliding window
    update_age: 24 hours (refresh if older)
    automatic: true (on each request)

# Session Cookie Configuration
session_cookie:
  name: vrss_session
  httpOnly: true (prevents XSS access)
  secure: true (HTTPS only in production)
  sameSite: lax (CSRF protection)
  path: /
  maxAge: 604800 (7 days in seconds)
  domain: .vrss.app (production)

# Authorization Middleware
authorization:
  middleware_chain:
    1_authMiddleware: Extract and validate session
    2_requireAuth: Enforce authentication
    3_requireVerifiedEmail: Enforce email verification
    4_requireOwnership: Check resource ownership
    5_checkStorageQuota: Verify storage limits

  public_procedures:
    - auth.register
    - auth.login
    - user.getProfile
    - post.getById
    - discovery.searchUsers
    - discovery.getDiscoverFeed

  protected_procedures:
    - All other endpoints require authentication

# Integration with RPC Router
rpc_integration:
  middleware_order:
    1. CORS middleware
    2. Auth middleware (attach user to context)
    3. Rate limiting middleware
    4. RPC router (procedure execution)

  context_enrichment:
    c.set('user', session.user)
    c.set('session', session.session)

  authorization_check:
    if (!PUBLIC_PROCEDURES.has(procedure) && !c.get('user'))
      return 401 Unauthorized

# Critical Data
critical_data:
  - Password hashes (bcrypt)
  - Session tokens (database)
  - User credentials
  - Authentication state

# Security Features
security:
  - Password hashing (bcrypt, 10 rounds)
  - Session token cryptographic randomness (256-bit)
  - HttpOnly cookies (XSS prevention)
  - SameSite cookies (CSRF protection)
  - Rate limiting (brute force prevention)
  - Email verification (optional)
  - Secure password requirements (12+ chars, complexity)

# Documentation Reference
doc: "@/docs/SECURITY_DESIGN.md"
sections: [Better-auth Integration, Authentication Flows, Session Management]
related_docs:
  - "@/docs/AUTH_FLOWS.md" (Visual flow diagrams)
  - "@/docs/SECURITY_IMPLEMENTATION_GUIDE.md" (Implementation)
```

---

## Data Flow Diagrams

### Complete User Action → Response Flow

```yaml
# Example: Create Post Flow
create_post_complete_flow:

  # 1. User Interaction
  step_1_user_action:
    component: PostCreationForm (React)
    action: User clicks "Publish" button
    data:
      content: "Hello World"
      type: "text_short"
      mediaIds: []

  # 2. Frontend Validation
  step_2_client_validation:
    component: Form validation (Zod)
    checks:
      - Content not empty
      - Content length <= 5000 chars
      - Media IDs valid (if present)
    outcome: Validation passed

  # 3. RPC Client Call
  step_3_rpc_call:
    component: usePost hook
    method: post.create()
    request:
      procedure: "post.create"
      input:
        type: "text_short"
        content: "Hello World"
        visibility: "public"

  # 4. HTTP Request
  step_4_http_request:
    method: POST
    url: https://api.vrss.app/api/rpc
    headers:
      Content-Type: application/json
      Cookie: vrss_session=<session-token>
    body: { procedure, input, context }

  # 5. Backend Middleware Chain
  step_5_middleware:
    5a_cors: Validate origin
    5b_auth: Extract session token → Query session → Load user
    5c_rate_limit: Check 10 posts/min limit
    5d_router: Route to procedure handler

  # 6. Business Logic
  step_6_business_logic:
    handler: postRouter['post.create']
    context:
      input: { type, content, visibility }
      user: { id, username, ... }
      requestId: <uuid>

    validation:
      - User authenticated ✓
      - Email verified ✓
      - Input valid ✓

    processing:
      - Sanitize content (XSS prevention)
      - Generate post ID
      - Set timestamps

  # 7. Database Operation
  step_7_database:
    repository: PostRepository.create()
    prisma_query: |
      prisma.post.create({
        data: {
          userId: user.id,
          type: 'text_short',
          content: sanitizedContent,
          visibility: 'public',
          status: 'published',
          createdAt: NOW()
        },
        include: { user: true }
      })

    sql_execution: |
      INSERT INTO posts (
        user_id, type, content, visibility,
        status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *

    result: Post record with user relation

  # 8. Response Transformation
  step_8_response:
    service_layer_return: { post: Post }
    rpc_response_format:
      success: true
      data:
        post:
          id: "123"
          userId: "456"
          type: "text_short"
          content: "Hello World"
          createdAt: "2025-10-16T12:00:00Z"
          user:
            username: "johndoe"
            displayName: "John Doe"
      metadata:
        timestamp: 1729080000
        requestId: <uuid>

  # 9. HTTP Response
  step_9_http_response:
    status: 200 OK
    headers:
      Content-Type: application/json
      X-Request-Id: <uuid>
      Cache-Control: no-cache
    body: RPC response JSON

  # 10. Client Processing
  step_10_client:
    rpc_client: Parse JSON response
    error_check: success === true ✓
    data_extraction: response.data.post

  # 11. State Update
  step_11_state:
    state_manager: TanStack Query
    cache_update:
      - Invalidate feed queries
      - Update post list cache
      - Optimistic update (already applied)

  # 12. UI Render
  step_12_ui:
    component: Feed component
    action: Render new post in feed
    user_feedback: Success toast notification

# Total Latency Breakdown
latency_breakdown:
  client_validation: ~10ms
  network_request: ~50-200ms (depends on geography)
  middleware_processing: ~5ms
  business_logic: ~10ms
  database_query: ~20-50ms
  response_serialization: ~5ms
  network_response: ~50-200ms
  client_processing: ~10ms
  ui_render: ~16ms (60fps)

  total_estimate: 150-500ms
```

### File Upload Complete Flow

```yaml
# Example: Upload Profile Picture
upload_profile_picture_flow:

  # Phase 1: Request Upload URL
  phase_1_initiate:

    1_user_action:
      component: ProfileEditor
      action: User selects image file
      data:
        file: File object (2MB JPEG)
        filename: "profile.jpg"
        contentType: "image/jpeg"
        size: 2097152

    2_client_validation:
      checks:
        - File type is image/* ✓
        - File size <= 50MB ✓
        - Content type allowed ✓

    3_rpc_call:
      procedure: media.initiateUpload
      input: { filename, contentType, size }

    4_backend_processing:
      - Check storage quota (current + 2MB <= limit) ✓
      - Validate file type ✓
      - Generate mediaId: <uuid>
      - Generate S3 key: "media/456/<uuid>/profile.jpg"
      - Create presigned URL (1 hour expiration)
      - Create pending media record

    5_response:
      uploadId: <uuid>
      uploadUrl: "https://s3.amazonaws.com/vrss-media/..."
      mediaId: <uuid>
      expiresAt: 1729083600

  # Phase 2: Direct S3 Upload
  phase_2_upload:

    1_client_upload:
      method: PUT
      url: presigned S3 URL
      headers:
        Content-Type: image/jpeg
      body: File binary data

    2_s3_processing:
      - Validate Content-Type header
      - Write object to bucket
      - Apply server-side encryption (AES-256)
      - Return 200 OK

    3_client_receives:
      status: 200 OK
      data: S3 response (minimal)

  # Phase 3: Confirm Upload
  phase_3_complete:

    1_rpc_call:
      procedure: media.completeUpload
      input: { uploadId, mediaId }

    2_backend_verification:
      - Query media record
      - Verify ownership ✓
      - Verify uploadId match ✓
      - Call S3 HeadObject (verify file exists) ✓
      - Update media status: pending → completed
      - Update user storage quota (+2MB)

    3_response:
      media:
        id: <uuid>
        url: "https://cdn.vrss.app/media/456/..."
        type: "image"
        size: 2097152

    4_client_update:
      - Update profile with new avatarUrl
      - Call user.updateProfile({ avatarUrl: media.url })
      - Invalidate user profile cache
      - UI updates with new profile picture

# Error Recovery Scenarios
error_scenarios:

  upload_timeout:
    scenario: Client upload takes > 1 hour
    detection: Presigned URL expired
    recovery:
      - Client detects 403 Forbidden from S3
      - Request new upload URL
      - Retry upload with new URL

  network_failure:
    scenario: Connection lost during upload
    detection: fetch() rejects with network error
    recovery:
      - Exponential backoff retry (3 attempts)
      - If all fail, queue for background sync
      - Notify user of failure

  storage_quota_exceeded:
    scenario: User quota exhausted during upload
    detection: Backend returns 1600 error code
    recovery:
      - Show quota exceeded modal
      - Offer upgrade to paid tier
      - Do not retry upload

  s3_verification_failed:
    scenario: Upload succeeded but S3 object not found
    detection: HeadObject returns 404
    recovery:
      - Mark media record as failed
      - Notify user of failure
      - Do not update storage quota
      - Allow retry (new upload)
```

---

## Integration Patterns

### Request/Response Pattern

```yaml
# Synchronous RPC Pattern
pattern: Request/Response (Synchronous)
use_cases:
  - CRUD operations (create, read, update, delete)
  - User interactions (like, follow, comment)
  - Profile updates
  - Settings changes

characteristics:
  - Client blocks waiting for response
  - Immediate feedback to user
  - Single round-trip
  - Error handling in-place

example_procedures:
  - user.getProfile
  - post.create
  - post.update
  - social.follow
  - settings.updatePrivacy

timeout: 30 seconds
retry_strategy: Exponential backoff (3 retries)
```

### Two-Phase Pattern

```yaml
# Two-Phase Pattern (Asynchronous)
pattern: Initiate → Execute → Confirm
use_cases:
  - File uploads (large files)
  - Long-running operations
  - External service integration

characteristics:
  - Client initiates operation
  - Receives temporary credentials/URLs
  - Performs operation independently
  - Confirms completion

example: File Upload (described in detail above)

phases:
  1. Initiate: Get presigned URL and mediaId
  2. Execute: Upload directly to S3
  3. Confirm: Notify backend of completion

advantages:
  - Reduces backend load
  - Faster uploads (direct to S3)
  - Better error isolation
  - Scalable for large files
```

### Polling Pattern (Future Enhancement)

```yaml
# Polling Pattern
pattern: Client polls for updates
use_cases:
  - Notifications (MVP)
  - Unread message count
  - Feed updates

characteristics:
  - Client requests updates periodically
  - Server returns changes since last poll
  - Cursor-based or timestamp-based

example:
  procedure: notification.getNotifications
  interval: 30 seconds
  request: { since: lastPolledTimestamp }
  response: { notifications: [], newCount: 5 }

future_enhancement:
  - Replace with WebSocket for real-time updates
  - Use Server-Sent Events (SSE)
  - Implement push notifications
```

---

## Error Handling & Resilience

### Error Code Ranges

```yaml
# Standardized Error Codes
error_code_ranges:
  1000-1099: Authentication errors
    1000: UNAUTHORIZED
    1001: INVALID_CREDENTIALS
    1002: SESSION_EXPIRED
    1003: INVALID_TOKEN

  1100-1199: Authorization errors
    1100: FORBIDDEN
    1101: INSUFFICIENT_PERMISSIONS

  1200-1299: Validation errors
    1200: VALIDATION_ERROR
    1201: INVALID_INPUT
    1202: MISSING_REQUIRED_FIELD
    1203: INVALID_FORMAT

  1300-1399: Resource errors
    1300: NOT_FOUND
    1301: RESOURCE_NOT_FOUND
    1302: USER_NOT_FOUND
    1303: POST_NOT_FOUND

  1400-1499: Conflict errors
    1400: CONFLICT
    1401: DUPLICATE_USERNAME
    1402: DUPLICATE_EMAIL
    1403: ALREADY_FOLLOWING

  1500-1599: Rate limiting
    1500: RATE_LIMIT_EXCEEDED
    1501: TOO_MANY_REQUESTS

  1600-1699: Storage errors
    1600: STORAGE_LIMIT_EXCEEDED
    1601: INVALID_FILE_TYPE
    1602: FILE_TOO_LARGE

  1900-1999: Server errors
    1900: INTERNAL_SERVER_ERROR
    1901: DATABASE_ERROR
    1902: EXTERNAL_SERVICE_ERROR

  9999: UNKNOWN_ERROR

# Documentation Reference
doc: "@/docs/api-architecture.md"
section: "Error Codes"
```

### Retry Strategies

```yaml
# Client-Side Retry Logic
retry_strategies:

  authentication_errors:
    codes: [1000, 1001, 1002, 1003]
    retry: false
    action: Redirect to login page

  validation_errors:
    codes: [1200-1299]
    retry: false
    action: Display validation errors to user

  resource_errors:
    codes: [1300-1399]
    retry: false
    action: Display "not found" message

  rate_limit_errors:
    codes: [1500, 1501]
    retry: true
    strategy: Wait for Retry-After header
    max_wait: 60 seconds

  server_errors:
    codes: [1900-1999]
    retry: true
    strategy: Exponential backoff
    base_delay: 1 second
    max_retries: 3
    max_delay: 10 seconds

  network_errors:
    retry: true
    strategy: Exponential backoff
    base_delay: 1 second
    max_retries: 3
    max_delay: 10 seconds

# Backend Resilience
backend_resilience:

  database_errors:
    - Connection pool exhaustion: Queue requests
    - Query timeout: Log and return 500
    - Deadlock: Automatic retry (Prisma)
    - Connection lost: Reconnect automatically

  s3_errors:
    - Service unavailable: Return 503, retry client-side
    - Presigned URL generation failed: Log and return 500
    - Object not found: Return 404

  rate_limiting:
    - Redis unavailable: Fallback to in-memory limiter
    - Counter exceeded: Return 429 with Retry-After
```

### Circuit Breaker Pattern (Future)

```yaml
# Circuit Breaker for External Services
circuit_breaker:
  purpose: Prevent cascading failures

  states:
    closed: Normal operation, requests pass through
    open: Failures exceeded threshold, reject immediately
    half_open: Test if service recovered

  configuration:
    failure_threshold: 5 consecutive failures
    timeout: 30 seconds
    reset_timeout: 60 seconds

  apply_to:
    - S3 API calls
    - Email service (future)
    - Payment gateway (future)

# Not implemented in MVP
status: Future enhancement
```

---

## Summary

### Key Integration Points

1. **Frontend PWA ↔ Backend API**
   - RPC-based communication over HTTP/JSON
   - POST /api/rpc single endpoint
   - Session cookie authentication
   - Type-safe contracts via shared TypeScript types

2. **Backend API ↔ S3 Storage**
   - Two-phase presigned URL upload
   - Direct client-to-S3 transfer
   - Backend validation and confirmation
   - Storage quota enforcement

3. **Backend API ↔ PostgreSQL**
   - Prisma ORM for type-safe queries
   - Connection pooling
   - Transaction support
   - Query optimization

4. **Better-auth Integration**
   - Session-based authentication
   - Database-backed sessions
   - Middleware-based authorization
   - Password hashing (bcrypt)

### Data Flow Patterns

- **User Action → UI**: Synchronous RPC with optimistic updates
- **File Upload**: Two-phase async pattern
- **Authentication**: Session cookie + middleware validation
- **State Management**: TanStack Query with cache invalidation

### Documentation References

- **API Architecture**: `/docs/api-architecture.md`
- **Security Design**: `/docs/SECURITY_DESIGN.md`
- **Frontend Integration**: `/docs/frontend-api-integration.md`
- **Database Schema**: `/docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md`
- **Monolith Architecture**: `/docs/architecture/MONOLITH_ARCHITECTURE.md`

---

**Document Control**
- **Created**: 2025-10-16
- **Last Updated**: 2025-10-16
- **Version**: 1.0
- **Status**: Complete
- **Next Review**: Post-implementation validation
