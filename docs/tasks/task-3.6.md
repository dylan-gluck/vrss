# Task 3.6: Media Router Implementation

**Phase**: 3.6 Media Router
**Duration**: 2 days
**Parallel**: true
**Status**: Not Started

---

## TASK

Implement the Media Router with 4 procedures for two-phase file upload, storage quota management, and S3 integration:

1. `media.initiateUpload` - Generate presigned S3 URL and check storage quota
2. `media.completeUpload` - Validate upload and create media record
3. `media.deleteMedia` - Delete media from S3 and update storage
4. `media.getStorageUsage` - Return user storage statistics

---

## CONTEXT

### Phase Document Reference
**Source**: `/Users/dylan/Workspace/projects/vrss/docs/specs/001-vrss-social-platform/PLAN/implementation-phases/phase-3-backend-api-implementation-duration-3-4-weeks-priority-p1.md`

**Task Definition** (Lines 185-214):
```markdown
## 3.6 Media Router `[duration: 2 days]` `[parallel: true]`

- [ ] **Prime Context**
    - [ ] Read `docs/api-architecture.md` Section: "Media Router" (4 procedures: initiateUpload, completeUpload, deleteMedia, getStorageUsage)
    - [ ] Read DATA_STORAGE_DOCUMENTATION.md (S3 upload flow, storage quotas)

- [ ] **Write Tests** `[activity: test-api]`
    - [ ] `media.initiateUpload` tests: Generate presigned URL, check quota
    - [ ] `media.completeUpload` tests: Validate upload, update storage used
    - [ ] `media.deleteMedia` tests: Delete from S3, update storage used
    - [ ] `media.getStorageUsage` tests: Return used/quota/percentage
    - [ ] Storage quota enforcement tests: Block upload if quota exceeded

- [ ] **Implement** `[activity: api-development]`
    - [ ] Create `apps/api/src/rpc/routers/media.ts`
    - [ ] Create `apps/api/src/lib/s3.ts` (S3 client initialization)
    - [ ] Implement `media.initiateUpload` (check quota with FOR UPDATE lock, generate presigned URL)
    - [ ] Implement `media.completeUpload` (validate upload, create post_media record, update storage)
    - [ ] Implement `media.deleteMedia` (delete from S3, update storage via trigger)
    - [ ] Implement `media.getStorageUsage`
    - [ ] Configure S3 in `.env` (MinIO for dev, AWS S3 for prod)

- [ ] **Validate**
    - [ ] Presigned URLs generated correctly (15min expiry)
    - [ ] Storage quota enforced (atomic check with FOR UPDATE)
    - [ ] Storage triggers update `storage_usage` table
    - [ ] S3 delete works
    - [ ] Test coverage: 90%+

**Success Criteria:** Two-phase file upload working, storage quotas enforced
```

---

## SDD_REQUIREMENTS

### Internal API Changes (Lines 1260-1276)

**Source**: `/Users/dylan/Workspace/projects/vrss/docs/specs/001-vrss-social-platform/SDD.md`

```yaml
Rate Limiting:
  Limits:
    media.initiateUpload: 10 requests/minute

File Upload Strategy:
  Pattern: Two-phase upload with S3 pre-signed URLs
  Phase_1_Initiate: Client calls media.initiateUpload → Server validates → Returns uploadUrl + mediaId
  Phase_2_Upload: Client uploads directly to S3 using pre-signed URL
  Phase_3_Complete: Client calls media.completeUpload → Server validates → Returns media record
  Allowed_Types: image/*, video/*, audio/*
  Storage_Limits: 50MB free, 1GB+ paid
```

### Media Router Type Contracts (Lines 460-501)

**Source**: `/Users/dylan/Workspace/projects/vrss/docs/api-architecture.md`

```typescript
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
```

### Media Router Implementation Example (Lines 1133-1332)

**Source**: `/Users/dylan/Workspace/projects/vrss/docs/api-architecture.md`

Key implementation details:
- Use `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- Check storage quota BEFORE generating presigned URL
- Generate presigned URL with 15-minute expiry (900 seconds)
- Validate file type against ALLOWED_TYPES
- Create media record with status='pending' during initiate
- Update status='completed' on completeUpload
- Storage quota enforcement with FOR UPDATE lock
- S3 key pattern: `media/${userId}/${mediaId}/${filename}`

---

## DATA_MODEL

### Database Schema

#### `post_media` Table (Lines 234-270)

**Source**: `/Users/dylan/Workspace/projects/vrss/docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md`

```sql
CREATE TYPE media_type AS ENUM ('image', 'gif', 'video', 'audio', 'document');

CREATE TABLE post_media (
    id                  BIGSERIAL PRIMARY KEY,
    post_id             BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id             BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Media metadata
    type                media_type NOT NULL,
    file_url            VARCHAR(500) NOT NULL,
    file_size_bytes     BIGINT NOT NULL,
    mime_type           VARCHAR(100) NOT NULL,

    -- Image/video specific
    width               INTEGER,
    height              INTEGER,
    duration_seconds    INTEGER,  -- For video/audio

    -- Thumbnails
    thumbnail_url       VARCHAR(500),

    -- Order in gallery
    display_order       INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT post_media_file_size_positive CHECK (file_size_bytes > 0)
);

-- Indexes
CREATE INDEX idx_post_media_post ON post_media(post_id, display_order);
CREATE INDEX idx_post_media_user_size ON post_media(user_id, created_at DESC);
```

#### `storage_usage` Table (Lines 604-632)

**Source**: `/Users/dylan/Workspace/projects/vrss/docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md`

```sql
CREATE TABLE storage_usage (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Storage tracking (in bytes)
    used_bytes          BIGINT NOT NULL DEFAULT 0,
    quota_bytes         BIGINT NOT NULL DEFAULT 52428800,  -- 50MB default

    -- Breakdown by media type
    images_bytes        BIGINT NOT NULL DEFAULT 0,
    videos_bytes        BIGINT NOT NULL DEFAULT 0,
    audio_bytes         BIGINT NOT NULL DEFAULT 0,
    other_bytes         BIGINT NOT NULL DEFAULT 0,

    last_calculated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT storage_usage_positive CHECK (used_bytes >= 0),
    CONSTRAINT storage_usage_quota_positive CHECK (quota_bytes > 0)
);
```

### Storage Quota Management (Lines 1140-1345)

**Source**: `/Users/dylan/Workspace/projects/vrss/docs/specs/001-vrss-social-platform/DATA_STORAGE_DOCUMENTATION.md`

**Storage Architecture**:
```
1. Pre-Upload Quota Check
   SELECT (quota_bytes - used_bytes) FROM storage_usage WHERE user_id = ?
   - If insufficient: REJECT
   - If available: PROCEED

2. Upload to S3
   - Generate unique key
   - Upload file
   - Get file size, MIME type, metadata

3. Insert post_media Record
   INSERT INTO post_media (user_id, file_url, file_size_bytes, ...)

4. Trigger: update_storage_on_media_insert
   UPDATE storage_usage SET
     used_bytes = used_bytes + NEW.file_size_bytes,
     images_bytes = images_bytes + ... (if type = 'image')
   WHERE user_id = NEW.user_id
```

**Quota Limits**:
- Free Tier: 50MB (52,428,800 bytes)
- Basic: 1GB (1,073,741,824 bytes)
- Pro: 5GB (5,368,709,120 bytes)
- Premium: 10GB (10,737,418,240 bytes)

**Validation Rules**:
```typescript
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024;   // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;  // 100MB
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;   // 20MB
```

### S3 Upload Flow (Lines 1348-1439)

**Source**: `/Users/dylan/Workspace/projects/vrss/docs/specs/001-vrss-social-platform/DATA_STORAGE_DOCUMENTATION.md`

**Two-Phase Upload Pattern**:

**Phase 1: Pre-Signed URL Generation**
```typescript
async function generateUploadUrl(
  userId: bigint,
  fileName: string,
  fileSize: bigint,
  mimeType: string
): Promise<{ uploadUrl: string, fileKey: string }> {
  // 1. Check storage quota
  if (!await canUploadFile(userId, fileSize)) {
    throw new Error('STORAGE_QUOTA_EXCEEDED');
  }

  // 2. Generate unique S3 key
  const fileKey = `users/${userId}/posts/${uuid()}_${fileName}`;

  // 3. Generate pre-signed URL (15 min expiration)
  const uploadUrl = await s3.getSignedUrl('putObject', {
    Bucket: 'vrss-media-production',
    Key: fileKey,
    ContentType: mimeType,
    Expires: 900 // 15 minutes
  });

  return { uploadUrl, fileKey };
}
```

**Phase 2: Client Upload & Confirmation**
```typescript
// Client confirms upload to backend
async function confirmUpload(
  postId: bigint,
  fileKey: string,
  fileSize: bigint,
  metadata: MediaMetadata
): Promise<PostMedia> {
  // Backend creates post_media record
  return await db.post_media.create({
    data: {
      post_id: postId,
      user_id: userId,
      file_url: `https://cdn.vrss.app/${fileKey}`,
      file_size_bytes: fileSize,
      mime_type: metadata.mimeType,
      width: metadata.width,
      height: metadata.height,
      type: getMediaType(metadata.mimeType)
    }
  });
  // Trigger automatically updates storage_usage
}
```

---

## TYPE_CONTRACTS

### Type Definitions

**Source**: `/Users/dylan/Workspace/projects/vrss/packages/api-contracts/src/procedures/media.ts`

```typescript
export namespace MediaProcedures {
  // media.initiateUpload
  export namespace InitiateUpload {
    export interface Input {
      filename: string;
      contentType: string;
      size: number;
    }

    export interface Output {
      uploadUrl: string;
      mediaId: string;
      expiresAt: Date;
    }
  }

  // media.completeUpload
  export namespace CompleteUpload {
    export interface Input {
      mediaId: string;
    }

    export interface Output {
      media: Media;
    }
  }

  // media.getStorageUsage
  export namespace GetStorageUsage {
    export type Input = Record<string, never>;

    export interface Output {
      used: number;
      limit: number;
      percentage: number;
    }
  }

  // media.deleteMedia
  export namespace DeleteMedia {
    export interface Input {
      mediaId: string;
    }

    export interface Output {
      success: boolean;
    }
  }
}

// Supporting types
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
```

---

## ERROR_CODES

**Source**: `/Users/dylan/Workspace/projects/vrss/docs/api-architecture.md` (Lines 600-649)

```typescript
export enum ErrorCode {
  // Authentication errors (1000-1099)
  UNAUTHORIZED = 1000,

  // Validation errors (1200-1299)
  VALIDATION_ERROR = 1200,
  INVALID_INPUT = 1201,

  // Resource errors (1300-1399)
  NOT_FOUND = 1300,

  // Storage errors (1600-1699)
  STORAGE_LIMIT_EXCEEDED = 1600,
  INVALID_FILE_TYPE = 1601,
  FILE_TOO_LARGE = 1602,

  // Server errors (1900-1999)
  INTERNAL_SERVER_ERROR = 1900,
  EXTERNAL_SERVICE_ERROR = 1902,
}
```

---

## IMPLEMENTATION_PATTERNS

### Existing Router Patterns

**Reference Implementations**:
1. **Post Router**: `/Users/dylan/Workspace/projects/vrss/apps/api/src/rpc/routers/post.ts`
   - Lines 1-100: Error handling, validation, type mapping
   - Shows Prisma usage, RPCError class, validation patterns

2. **User Router**: `/Users/dylan/Workspace/projects/vrss/apps/api/src/rpc/routers/user.ts`
   - Storage quota checking patterns
   - Profile update patterns

3. **Feed Router**: `/Users/dylan/Workspace/projects/vrss/apps/api/src/rpc/routers/feed.ts`
   - Complex validation patterns
   - Business logic separation

### Router Structure Pattern

All routers follow this structure:
```typescript
// 1. Imports
import { PrismaClient } from "@prisma/client";
import { ErrorCode } from "@vrss/api-contracts";
import type { z } from "zod";
import type { ProcedureContext } from "../types";
import { /* schemas */ } from "./schemas/media";

// 2. Initialize Prisma
const prisma = new PrismaClient();

// 3. RPCError class
class RPCError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "RPCError";
  }
}

// 4. Helper functions
function getValidationError(validationResult: any) { ... }

// 5. Export router object
export const mediaRouter = {
  "media.initiateUpload": async (ctx: ProcedureContext<...>) => { ... },
  "media.completeUpload": async (ctx: ProcedureContext<...>) => { ... },
  "media.getStorageUsage": async (ctx: ProcedureContext<...>) => { ... },
  "media.deleteMedia": async (ctx: ProcedureContext<...>) => { ... },
};
```

### Schema Validation Pattern

Create `/Users/dylan/Workspace/projects/vrss/apps/api/src/rpc/routers/schemas/media.ts`:

```typescript
import { z } from "zod";

export const initiateUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^(image|video|audio)\//),
  size: z.number().positive().int(),
});

export const completeUploadSchema = z.object({
  mediaId: z.string().uuid(),
});

export const deleteMediaSchema = z.object({
  mediaId: z.string().uuid(),
});

export const getStorageUsageSchema = z.object({});
```

### Test Pattern

**Reference**: `/Users/dylan/Workspace/projects/vrss/apps/api/test/rpc/post.test.ts`

```typescript
import { describe, it, expect, beforeEach } from "bun:test";
import { createTestUser } from "../fixtures/userBuilder";
import { cleanDatabase } from "../setup";

describe("Media Router", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe("media.initiateUpload", () => {
    it("should generate presigned URL for valid image", async () => { ... });
    it("should reject upload when quota exceeded", async () => { ... });
    it("should reject invalid file types", async () => { ... });
  });

  describe("media.completeUpload", () => {
    it("should create media record on successful upload", async () => { ... });
    it("should update storage_usage correctly", async () => { ... });
  });

  describe("media.deleteMedia", () => {
    it("should delete media from S3 and database", async () => { ... });
    it("should update storage_usage on delete", async () => { ... });
  });

  describe("media.getStorageUsage", () => {
    it("should return accurate storage statistics", async () => { ... });
  });
});
```

---

## ENVIRONMENT_CONFIGURATION

Add to `.env`:
```bash
# S3 Configuration (MinIO for development, AWS S3 for production)
S3_ENDPOINT=http://localhost:9000  # MinIO dev endpoint
S3_REGION=us-east-1
S3_BUCKET=vrss-media-dev
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_USE_PATH_STYLE=true  # Required for MinIO

# Production settings (comment out for dev)
# S3_ENDPOINT=https://s3.amazonaws.com
# S3_BUCKET=vrss-media-production
# S3_ACCESS_KEY_ID=<aws-access-key>
# S3_SECRET_ACCESS_KEY=<aws-secret-key>
# S3_USE_PATH_STYLE=false

# CDN (optional)
CDN_URL=https://cdn.vrss.app
```

---

## DEPENDENCIES

Install required S3 packages:
```bash
bun add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

---

## SUCCESS

### Completion Criteria

1. **Tests Pass**:
   - All media router tests pass (minimum 90% coverage)
   - Storage quota enforcement tests pass
   - S3 integration tests pass (with MinIO)

2. **Functionality**:
   - Presigned URLs generated with 15-minute expiry
   - Storage quota enforced atomically (FOR UPDATE lock)
   - Media uploads complete successfully
   - Storage usage tracked accurately
   - Media deletion works (S3 + database)

3. **Performance**:
   - Quota check: <10ms
   - Presigned URL generation: <100ms
   - Storage usage query: <10ms

4. **Code Quality**:
   - Follows existing router patterns
   - Proper error handling with ErrorCode enum
   - Type-safe with Zod validation
   - Well-documented with JSDoc comments

5. **Specification Compliance**:
   - All 4 procedures implemented per API specification
   - Storage limits enforced (50MB free tier)
   - File type validation per allowed types
   - Two-phase upload pattern implemented correctly

---

## IMPLEMENTATION_CHECKLIST

### Phase 1: Setup (30 min)
- [ ] Install S3 dependencies (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- [ ] Create `/apps/api/src/lib/s3.ts` with S3 client initialization
- [ ] Configure MinIO for local development
- [ ] Add S3 environment variables to `.env`
- [ ] Test S3 connection

### Phase 2: Schemas (30 min)
- [ ] Create `/apps/api/src/rpc/routers/schemas/media.ts`
- [ ] Define `initiateUploadSchema`
- [ ] Define `completeUploadSchema`
- [ ] Define `deleteMediaSchema`
- [ ] Define `getStorageUsageSchema`

### Phase 3: Media Router Implementation (4 hours)
- [ ] Create `/apps/api/src/rpc/routers/media.ts`
- [ ] Implement `media.initiateUpload`:
  - [ ] Validate input (filename, contentType, size)
  - [ ] Check storage quota with FOR UPDATE lock
  - [ ] Validate file type against allowed types
  - [ ] Check file size limits
  - [ ] Generate unique S3 key
  - [ ] Generate presigned URL (15min expiry)
  - [ ] Return uploadUrl, mediaId, expiresAt
- [ ] Implement `media.completeUpload`:
  - [ ] Validate mediaId
  - [ ] Create post_media record
  - [ ] Return media object
- [ ] Implement `media.deleteMedia`:
  - [ ] Validate ownership
  - [ ] Delete from S3
  - [ ] Delete from post_media (trigger updates storage)
  - [ ] Return success
- [ ] Implement `media.getStorageUsage`:
  - [ ] Query storage_usage table
  - [ ] Calculate percentage
  - [ ] Return used/limit/percentage

### Phase 4: Tests (3 hours)
- [ ] Create `/apps/api/test/rpc/media.test.ts`
- [ ] Write `media.initiateUpload` tests:
  - [ ] Generate presigned URL for valid image
  - [ ] Reject when quota exceeded
  - [ ] Reject invalid file types
  - [ ] Reject oversized files
  - [ ] Return correct expiry time
- [ ] Write `media.completeUpload` tests:
  - [ ] Create media record successfully
  - [ ] Update storage_usage correctly
  - [ ] Validate media metadata
- [ ] Write `media.deleteMedia` tests:
  - [ ] Delete from S3
  - [ ] Delete from database
  - [ ] Update storage_usage
  - [ ] Prevent unauthorized deletion
- [ ] Write `media.getStorageUsage` tests:
  - [ ] Return accurate statistics
  - [ ] Calculate percentage correctly
  - [ ] Handle zero usage

### Phase 5: Integration & Validation (1 hour)
- [ ] Register media router in RPC router (`/apps/api/src/rpc/index.ts`)
- [ ] Test full upload flow (initiate → upload → complete)
- [ ] Verify storage quota enforcement
- [ ] Test with different file types
- [ ] Verify presigned URL expiry
- [ ] Run all tests and achieve 90%+ coverage

---

## RELEVANT_FILES

### Must Read (Implementation)
1. `/Users/dylan/Workspace/projects/vrss/docs/api-architecture.md` (Lines 460-501, 1133-1332)
2. `/Users/dylan/Workspace/projects/vrss/docs/specs/001-vrss-social-platform/DATA_STORAGE_DOCUMENTATION.md` (Lines 1140-1520)
3. `/Users/dylan/Workspace/projects/vrss/docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md` (Lines 234-270, 604-632)
4. `/Users/dylan/Workspace/projects/vrss/packages/api-contracts/src/procedures/media.ts`

### Reference Patterns
1. `/Users/dylan/Workspace/projects/vrss/apps/api/src/rpc/routers/post.ts` (Error handling, validation)
2. `/Users/dylan/Workspace/projects/vrss/apps/api/src/rpc/routers/user.ts` (Storage quota patterns)
3. `/Users/dylan/Workspace/projects/vrss/apps/api/test/rpc/post.test.ts` (Test patterns)

### Create New Files
1. `/Users/dylan/Workspace/projects/vrss/apps/api/src/lib/s3.ts` (S3 client)
2. `/Users/dylan/Workspace/projects/vrss/apps/api/src/rpc/routers/media.ts` (Media router)
3. `/Users/dylan/Workspace/projects/vrss/apps/api/src/rpc/routers/schemas/media.ts` (Validation schemas)
4. `/Users/dylan/Workspace/projects/vrss/apps/api/test/rpc/media.test.ts` (Tests)

---

## NOTES

### Critical Implementation Details

1. **Atomic Quota Checking**: Use `SELECT FOR UPDATE` to prevent race conditions
   ```typescript
   const storage = await prisma.$queryRaw`
     SELECT * FROM storage_usage
     WHERE user_id = ${userId}
     FOR UPDATE
   `;
   ```

2. **Presigned URL Expiry**: Set to 900 seconds (15 minutes) per spec

3. **S3 Key Pattern**: `users/${userId}/posts/${uuid()}_${filename}`

4. **File Type Validation**: Strict MIME type checking against allowed types

5. **Storage Trigger**: The database trigger automatically updates `storage_usage` on `post_media` INSERT/DELETE

6. **MinIO vs AWS S3**:
   - Dev: MinIO with path-style URLs
   - Prod: AWS S3 with virtual-hosted style

7. **Error Handling**: Use specific ErrorCode values:
   - `STORAGE_LIMIT_EXCEEDED` (1600)
   - `INVALID_FILE_TYPE` (1601)
   - `FILE_TOO_LARGE` (1602)

### Testing Strategy

1. Use MinIO for local S3 testing
2. Mock S3 client for unit tests if needed
3. Test quota enforcement with multiple concurrent requests
4. Verify storage_usage updates via database triggers
5. Test presigned URL expiry behavior

---

**END OF TASK CONTEXT**
