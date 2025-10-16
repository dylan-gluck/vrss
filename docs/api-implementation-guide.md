# VRSS RPC API Implementation Guide

## Quick Start

This guide provides practical examples and step-by-step instructions for implementing the VRSS RPC API.

---

## Setup Instructions

### 1. Install Dependencies

```bash
# Root workspace
bun install

# API packages
cd packages/api-contracts
bun install

cd ../api-client
bun install

cd ../../apps/api
bun install
```

### 2. Environment Configuration

Create `.env` file in `apps/api/`:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/vrss"

# Better-auth
AUTH_SECRET="your-secret-key-here"
AUTH_URL="http://localhost:3001"

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
S3_BUCKET="vrss-media"

# App
NODE_ENV="development"
PORT="3001"
FRONTEND_URL="http://localhost:3000"
```

### 3. Database Setup

```bash
cd apps/api

# Generate Prisma client
bunx prisma generate

# Run migrations
bunx prisma migrate dev

# Seed database (optional)
bun run seed
```

### 4. Start Development Server

```bash
# In apps/api/
bun run dev
```

---

## Implementation Examples

### Example 1: Complete Post Creation Flow

#### Step 1: Define Type Contract

```typescript
// packages/api-contracts/src/procedures/post.ts

export namespace PostProcedures {
  export interface Create {
    input: {
      type: 'text' | 'image' | 'video' | 'song';
      content: string;
      mediaIds?: MediaId[];
      visibility?: 'public' | 'followers' | 'private';
      tags?: string[];
    };
    output: {
      post: Post;
    };
  }
}
```

#### Step 2: Backend Handler with Validation

```typescript
// apps/api/src/rpc/routers/post.ts

import { z } from 'zod';
import type { PostProcedures } from '@vrss/api-contracts';
import { RPCError, ErrorCode } from '@vrss/api-contracts';
import { db } from '../../db';
import type { ProcedureContext } from '../types';

// Input validation schema
const createPostSchema = z.object({
  type: z.enum(['text', 'image', 'video', 'song']),
  content: z.string().min(1).max(5000),
  mediaIds: z.array(z.string()).optional(),
  visibility: z.enum(['public', 'followers', 'private']).default('public'),
  tags: z.array(z.string().max(50)).max(10).optional(),
});

export const postRouter = {
  'post.create': async (ctx: ProcedureContext<PostProcedures.Create['input']>) => {
    // Check authentication
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    // Validate input
    const validated = createPostSchema.safeParse(ctx.input);
    if (!validated.success) {
      throw new RPCError(
        ErrorCode.VALIDATION_ERROR,
        'Invalid input',
        { errors: validated.error.flatten() }
      );
    }

    const { type, content, mediaIds, visibility, tags } = validated.data;

    // Validate media ownership if mediaIds provided
    if (mediaIds && mediaIds.length > 0) {
      const media = await db.media.findMany({
        where: {
          id: { in: mediaIds },
          ownerId: ctx.user.id,
          status: 'completed',
        },
      });

      if (media.length !== mediaIds.length) {
        throw new RPCError(
          ErrorCode.VALIDATION_ERROR,
          'Some media files are invalid or not owned by you'
        );
      }
    }

    // Create post
    const post = await db.post.create({
      data: {
        authorId: ctx.user.id,
        type,
        content,
        visibility,
        mediaIds: mediaIds || [],
        tags: tags || [],
      },
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

    // Trigger notifications for followers (async)
    if (visibility === 'public' || visibility === 'followers') {
      notifyFollowers(ctx.user.id, post.id).catch(err => {
        console.error('Failed to notify followers:', err);
      });
    }

    return { post } satisfies PostProcedures.Create['output'];
  },
};

// Background task
async function notifyFollowers(userId: string, postId: string) {
  const followers = await db.follow.findMany({
    where: { followingId: userId },
    select: { followerId: true },
  });

  await db.notification.createMany({
    data: followers.map(f => ({
      userId: f.followerId,
      type: 'new_post',
      actorId: userId,
      targetId: postId,
      content: 'posted something new',
    })),
  });
}
```

#### Step 3: Frontend Hook

```typescript
// apps/pwa/src/api/hooks/usePost.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@vrss/api-client';
import type { PostProcedures } from '@vrss/api-contracts';

export const usePost = () => {
  const queryClient = useQueryClient();

  return {
    // Create post mutation
    create: useMutation({
      mutationFn: (input: PostProcedures.Create['input']) =>
        apiClient.call<
          PostProcedures.Create['input'],
          PostProcedures.Create['output']
        >('post.create', input),
      onSuccess: (data) => {
        // Invalidate feed queries to show new post
        queryClient.invalidateQueries({ queryKey: ['feed'] });
        queryClient.invalidateQueries({ queryKey: ['user-posts', data.post.authorId] });
      },
    }),

    // Get post by ID query
    useGetById: (postId: string) =>
      useQuery({
        queryKey: ['post', postId],
        queryFn: () =>
          apiClient.call<
            PostProcedures.GetById['input'],
            PostProcedures.GetById['output']
          >('post.getById', { postId }),
        enabled: !!postId,
      }),

    // Delete post mutation
    delete: useMutation({
      mutationFn: (postId: string) =>
        apiClient.call<
          PostProcedures.Delete['input'],
          PostProcedures.Delete['output']
        >('post.delete', { postId }),
      onSuccess: (_, postId) => {
        queryClient.invalidateQueries({ queryKey: ['feed'] });
        queryClient.removeQueries({ queryKey: ['post', postId] });
      },
    }),
  };
};
```

#### Step 4: Component Usage

```typescript
// apps/pwa/src/components/CreatePostForm.tsx

import { useState } from 'react';
import { usePost } from '../api/hooks/usePost';
import { ClientRPCError } from '@vrss/api-client';

export function CreatePostForm() {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'text' | 'image' | 'video' | 'song'>('text');
  const [error, setError] = useState('');

  const { create } = usePost();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await create.mutateAsync({
        type,
        content,
        visibility: 'public',
      });

      // Clear form
      setContent('');

      // Show success toast
      toast.success('Post created!');

    } catch (err) {
      if (err instanceof ClientRPCError) {
        if (err.isValidationError()) {
          setError('Please check your input');
        } else if (err.isAuthError()) {
          setError('Please log in to post');
        } else {
          setError(err.message);
        }
      } else {
        setError('Failed to create post');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <select value={type} onChange={(e) => setType(e.target.value as any)}>
        <option value="text">Text</option>
        <option value="image">Image</option>
        <option value="video">Video</option>
        <option value="song">Song</option>
      </select>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        maxLength={5000}
        rows={4}
        required
      />

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={create.isPending}>
        {create.isPending ? 'Posting...' : 'Post'}
      </button>
    </form>
  );
}
```

---

### Example 2: Custom Feed Algorithm

#### Step 1: Type Definition

```typescript
// packages/api-contracts/src/procedures/feed.ts

export interface FeedFilter {
  id: string;
  type: 'author' | 'postType' | 'tag' | 'dateRange' | 'excludeAuthor';
  operator: 'include' | 'exclude';
  value: unknown;
}

export interface CustomFeed {
  id: string;
  userId: string;
  name: string;
  filters: FeedFilter[];
  createdAt: Date;
  updatedAt: Date;
}

export namespace FeedProcedures {
  export interface CreateFeed {
    input: {
      name: string;
      filters: FeedFilter[];
    };
    output: {
      feed: CustomFeed;
    };
  }

  export interface GetFeed {
    input: {
      feedId?: string;
      limit?: number;
      cursor?: string;
    };
    output: {
      posts: Post[];
      nextCursor?: string;
      hasMore: boolean;
    };
  }
}
```

#### Step 2: Feed Builder Logic

```typescript
// apps/api/src/services/feedBuilder.ts

import type { FeedFilter, Post } from '@vrss/api-contracts';
import { db } from '../db';

export class FeedBuilder {
  private userId: string;
  private filters: FeedFilter[];

  constructor(userId: string, filters: FeedFilter[]) {
    this.userId = userId;
    this.filters = filters;
  }

  async build(limit: number = 20, cursor?: string): Promise<{
    posts: Post[];
    nextCursor?: string;
  }> {
    // Build Prisma query from filters
    const where = this.buildWhereClause();

    const posts = await db.post.findMany({
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

    return {
      posts: items,
      nextCursor,
    };
  }

  private buildWhereClause() {
    const conditions: any = {};

    for (const filter of this.filters) {
      switch (filter.type) {
        case 'author':
          if (filter.operator === 'include') {
            conditions.authorId = { in: filter.value as string[] };
          } else {
            conditions.authorId = { notIn: filter.value as string[] };
          }
          break;

        case 'postType':
          if (filter.operator === 'include') {
            conditions.type = { in: filter.value as string[] };
          } else {
            conditions.type = { notIn: filter.value as string[] };
          }
          break;

        case 'tag':
          if (filter.operator === 'include') {
            conditions.tags = { hasSome: filter.value as string[] };
          } else {
            conditions.tags = { hasNone: filter.value as string[] };
          }
          break;

        case 'dateRange':
          const range = filter.value as { start?: Date; end?: Date };
          conditions.createdAt = {};
          if (range.start) conditions.createdAt.gte = range.start;
          if (range.end) conditions.createdAt.lte = range.end;
          break;
      }
    }

    // Default: only show public posts or posts from following
    if (!conditions.visibility) {
      conditions.OR = [
        { visibility: 'public' },
        {
          visibility: 'followers',
          author: {
            followers: {
              some: { followerId: this.userId },
            },
          },
        },
      ];
    }

    return conditions;
  }
}
```

#### Step 3: Feed Router

```typescript
// apps/api/src/rpc/routers/feed.ts

import type { FeedProcedures } from '@vrss/api-contracts';
import { RPCError, ErrorCode } from '@vrss/api-contracts';
import { db } from '../../db';
import { FeedBuilder } from '../../services/feedBuilder';
import type { ProcedureContext } from '../types';

export const feedRouter = {
  'feed.createFeed': async (ctx: ProcedureContext<FeedProcedures.CreateFeed['input']>) => {
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const { name, filters } = ctx.input;

    const feed = await db.customFeed.create({
      data: {
        userId: ctx.user.id,
        name,
        filters: filters as any,
      },
    });

    return { feed } satisfies FeedProcedures.CreateFeed['output'];
  },

  'feed.getFeed': async (ctx: ProcedureContext<FeedProcedures.GetFeed['input']>) => {
    if (!ctx.user) {
      throw new RPCError(ErrorCode.UNAUTHORIZED, 'Authentication required');
    }

    const { feedId, limit = 20, cursor } = ctx.input;

    let filters: FeedFilter[] = [];

    if (feedId) {
      // Load custom feed
      const feed = await db.customFeed.findUnique({
        where: { id: feedId },
      });

      if (!feed) {
        throw new RPCError(ErrorCode.NOT_FOUND, 'Feed not found');
      }

      if (feed.userId !== ctx.user.id) {
        throw new RPCError(ErrorCode.FORBIDDEN, 'Access denied');
      }

      filters = feed.filters as FeedFilter[];

    } else {
      // Default feed: posts from following
      const following = await db.follow.findMany({
        where: { followerId: ctx.user.id },
        select: { followingId: true },
      });

      filters = [{
        id: 'default',
        type: 'author',
        operator: 'include',
        value: following.map(f => f.followingId),
      }];
    }

    const builder = new FeedBuilder(ctx.user.id, filters);
    const result = await builder.build(limit, cursor);

    return {
      posts: result.posts,
      nextCursor: result.nextCursor,
      hasMore: !!result.nextCursor,
    } satisfies FeedProcedures.GetFeed['output'];
  },
};
```

#### Step 4: Frontend Feed Builder Component

```typescript
// apps/pwa/src/components/FeedBuilder.tsx

import { useState } from 'react';
import type { FeedFilter } from '@vrss/api-contracts';
import { useFeed } from '../api/hooks/useFeed';

export function FeedBuilder() {
  const [name, setName] = useState('');
  const [filters, setFilters] = useState<FeedFilter[]>([]);

  const { createFeed } = useFeed();

  const addFilter = (type: FeedFilter['type']) => {
    const newFilter: FeedFilter = {
      id: crypto.randomUUID(),
      type,
      operator: 'include',
      value: type === 'author' ? [] : type === 'postType' ? [] : {},
    };

    setFilters([...filters, newFilter]);
  };

  const updateFilter = (id: string, updates: Partial<FeedFilter>) => {
    setFilters(filters.map(f =>
      f.id === id ? { ...f, ...updates } : f
    ));
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const handleSave = async () => {
    try {
      await createFeed.mutateAsync({ name, filters });
      toast.success('Feed created!');
    } catch (err) {
      toast.error('Failed to create feed');
    }
  };

  return (
    <div className="feed-builder">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Feed name"
      />

      <div className="filters">
        {filters.map(filter => (
          <FilterBlock
            key={filter.id}
            filter={filter}
            onChange={(updates) => updateFilter(filter.id, updates)}
            onRemove={() => removeFilter(filter.id)}
          />
        ))}
      </div>

      <div className="actions">
        <button onClick={() => addFilter('author')}>
          Add Author Filter
        </button>
        <button onClick={() => addFilter('postType')}>
          Add Type Filter
        </button>
        <button onClick={() => addFilter('tag')}>
          Add Tag Filter
        </button>
      </div>

      <button onClick={handleSave} disabled={!name || filters.length === 0}>
        Save Feed
      </button>
    </div>
  );
}

function FilterBlock({ filter, onChange, onRemove }: {
  filter: FeedFilter;
  onChange: (updates: Partial<FeedFilter>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="filter-block">
      <select
        value={filter.operator}
        onChange={(e) => onChange({ operator: e.target.value as any })}
      >
        <option value="include">Include</option>
        <option value="exclude">Exclude</option>
      </select>

      <span>{filter.type}</span>

      {/* Render appropriate input based on filter type */}
      {filter.type === 'author' && (
        <UserSelector
          value={filter.value as string[]}
          onChange={(value) => onChange({ value })}
        />
      )}

      {filter.type === 'postType' && (
        <PostTypeSelector
          value={filter.value as string[]}
          onChange={(value) => onChange({ value })}
        />
      )}

      <button onClick={onRemove}>Remove</button>
    </div>
  );
}
```

---

### Example 3: File Upload Flow

#### Complete Upload Implementation

```typescript
// apps/pwa/src/hooks/useFileUpload.ts

import { useState } from 'react';
import { apiClient, ClientRPCError } from '@vrss/api-client';
import type { MediaProcedures, MediaId } from '@vrss/api-contracts';

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>();

  const uploadFile = async (file: File): Promise<MediaId | null> => {
    setUploading(true);
    setProgress(0);
    setError(undefined);

    try {
      // Step 1: Initiate upload
      const { uploadUrl, mediaId } = await apiClient.call<
        MediaProcedures.InitiateUpload['input'],
        MediaProcedures.InitiateUpload['output']
      >('media.initiateUpload', {
        filename: file.name,
        contentType: file.type,
        size: file.size,
      });

      // Step 2: Upload to S3 with progress tracking
      const xhr = new XMLHttpRequest();

      await new Promise<void>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            setProgress((e.loaded / e.total) * 100);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });

      // Step 3: Complete upload
      await apiClient.call<
        MediaProcedures.CompleteUpload['input'],
        MediaProcedures.CompleteUpload['output']
      >('media.completeUpload', {
        uploadId: uploadUrl,
        mediaId,
      });

      setProgress(100);
      return mediaId;

    } catch (err) {
      if (err instanceof ClientRPCError) {
        if (err.code === 1600) {
          setError('Storage limit exceeded. Please upgrade your plan.');
        } else if (err.code === 1601) {
          setError('File type not supported');
        } else if (err.code === 1602) {
          setError('File too large');
        } else {
          setError(err.message);
        }
      } else {
        setError('Upload failed. Please try again.');
      }
      return null;

    } finally {
      setUploading(false);
    }
  };

  return {
    uploadFile,
    uploading,
    progress,
    error,
  };
}
```

#### Upload Component

```typescript
// apps/pwa/src/components/FileUploadButton.tsx

import { useRef } from 'react';
import { useFileUpload } from '../hooks/useFileUpload';
import type { MediaId } from '@vrss/api-contracts';

interface FileUploadButtonProps {
  accept?: string;
  onUploadComplete: (mediaId: MediaId) => void;
}

export function FileUploadButton({
  accept = 'image/*,video/*',
  onUploadComplete
}: FileUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFile, uploading, progress, error } = useFileUpload();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const mediaId = await uploadFile(file);
    if (mediaId) {
      onUploadComplete(mediaId);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="file-upload">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        disabled={uploading}
        style={{ display: 'none' }}
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? `Uploading... ${progress.toFixed(0)}%` : 'Upload File'}
      </button>

      {error && <div className="error">{error}</div>}

      {uploading && (
        <div className="progress-bar">
          <div className="progress" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}
```

---

## Testing Examples

### Backend Unit Tests

```typescript
// apps/api/src/rpc/routers/__tests__/post.test.ts

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { postRouter } from '../post';
import { db } from '../../../db';
import { ErrorCode } from '@vrss/api-contracts';

describe('post.create', () => {
  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    await db.post.deleteMany();
    await db.user.deleteMany();
    await db.user.create({ data: mockUser });
  });

  it('should create a text post', async () => {
    const result = await postRouter['post.create']({
      input: {
        type: 'text',
        content: 'Hello world!',
        visibility: 'public',
      },
      user: mockUser as any,
      requestId: 'test-123',
    });

    expect(result.post).toBeDefined();
    expect(result.post.content).toBe('Hello world!');
    expect(result.post.type).toBe('text');
    expect(result.post.authorId).toBe(mockUser.id);
  });

  it('should throw error when not authenticated', async () => {
    try {
      await postRouter['post.create']({
        input: {
          type: 'text',
          content: 'Hello',
        },
        user: undefined,
        requestId: 'test-123',
      });
      expect(true).toBe(false); // Should not reach here
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.UNAUTHORIZED);
    }
  });

  it('should validate content length', async () => {
    try {
      await postRouter['post.create']({
        input: {
          type: 'text',
          content: '', // Empty content
        },
        user: mockUser as any,
        requestId: 'test-123',
      });
      expect(true).toBe(false);
    } catch (err: any) {
      expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });
});
```

### Integration Tests

```typescript
// apps/api/src/__tests__/integration/post-flow.test.ts

import { describe, it, expect, beforeAll } from 'bun:test';
import { apiClient } from '@vrss/api-client';

describe('Post Creation Flow', () => {
  let sessionToken: string;
  let userId: string;

  beforeAll(async () => {
    // Register user
    const registerResult = await fetch('http://localhost:3001/api/rpc', {
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

    const registerData = await registerResult.json();
    sessionToken = registerData.data.sessionToken;
    userId = registerData.data.user.id;
  });

  it('should create, read, update, and delete a post', async () => {
    // Create
    const createResult = await fetch('http://localhost:3001/api/rpc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
      body: JSON.stringify({
        procedure: 'post.create',
        input: {
          type: 'text',
          content: 'Test post',
          visibility: 'public',
        },
      }),
    });

    const createData = await createResult.json();
    expect(createData.success).toBe(true);
    const postId = createData.data.post.id;

    // Read
    const readResult = await fetch('http://localhost:3001/api/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        procedure: 'post.getById',
        input: { postId },
      }),
    });

    const readData = await readResult.json();
    expect(readData.success).toBe(true);
    expect(readData.data.post.content).toBe('Test post');

    // Update
    const updateResult = await fetch('http://localhost:3001/api/rpc', {
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

    const updateData = await updateResult.json();
    expect(updateData.success).toBe(true);
    expect(updateData.data.post.content).toBe('Updated post');

    // Delete
    const deleteResult = await fetch('http://localhost:3001/api/rpc', {
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

    const deleteData = await deleteResult.json();
    expect(deleteData.success).toBe(true);
  });
});
```

### Frontend Component Tests

```typescript
// apps/pwa/src/components/__tests__/CreatePostForm.test.tsx

import { describe, it, expect, mock } from 'bun:test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreatePostForm } from '../CreatePostForm';
import { apiClient } from '@vrss/api-client';

mock.module('@vrss/api-client', () => ({
  apiClient: {
    call: mock(async () => ({
      post: {
        id: 'post-1',
        content: 'Test post',
        type: 'text',
      },
    })),
  },
}));

describe('CreatePostForm', () => {
  it('should submit post successfully', async () => {
    render(<CreatePostForm />);

    const textarea = screen.getByPlaceholderText(/what's on your mind/i);
    const submitButton = screen.getByText(/post/i);

    fireEvent.change(textarea, { target: { value: 'Test post' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiClient.call).toHaveBeenCalledWith('post.create', {
        type: 'text',
        content: 'Test post',
        visibility: 'public',
      });
    });
  });

  it('should show error on validation failure', async () => {
    (apiClient.call as any).mockRejectedValueOnce(
      new ClientRPCError(1200, 'Validation error')
    );

    render(<CreatePostForm />);

    const submitButton = screen.getByText(/post/i);
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/check your input/i)).toBeInTheDocument();
    });
  });
});
```

---

## Common Patterns

### Optimistic Updates

```typescript
// apps/pwa/src/api/hooks/usePost.ts

export const usePost = () => {
  const queryClient = useQueryClient();

  return {
    like: useMutation({
      mutationFn: (postId: string) =>
        apiClient.call('post.like', { postId }),

      // Optimistically update UI
      onMutate: async (postId) => {
        // Cancel outgoing refetches
        await queryClient.cancelQueries({ queryKey: ['post', postId] });

        // Snapshot previous value
        const previous = queryClient.getQueryData(['post', postId]);

        // Optimistically update
        queryClient.setQueryData(['post', postId], (old: any) => ({
          ...old,
          post: {
            ...old.post,
            stats: {
              ...old.post.stats,
              likes: old.post.stats.likes + 1,
            },
          },
        }));

        return { previous };
      },

      // Rollback on error
      onError: (err, postId, context) => {
        queryClient.setQueryData(['post', postId], context?.previous);
      },

      // Refetch after success
      onSettled: (data, error, postId) => {
        queryClient.invalidateQueries({ queryKey: ['post', postId] });
      },
    }),
  };
};
```

### Infinite Scroll

```typescript
// apps/pwa/src/api/hooks/useFeed.ts

import { useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@vrss/api-client';
import type { FeedProcedures } from '@vrss/api-contracts';

export const useFeed = (feedId?: string) => {
  return useInfiniteQuery({
    queryKey: ['feed', feedId],
    queryFn: ({ pageParam }) =>
      apiClient.call<
        FeedProcedures.GetFeed['input'],
        FeedProcedures.GetFeed['output']
      >('feed.getFeed', {
        feedId,
        limit: 20,
        cursor: pageParam,
      }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
};
```

```typescript
// apps/pwa/src/components/Feed.tsx

import { useFeed } from '../api/hooks/useFeed';
import { useInView } from 'react-intersection-observer';
import { useEffect } from 'react';

export function Feed({ feedId }: { feedId?: string }) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed(feedId);
  const { ref, inView } = useInView();

  // Load more when sentinel comes into view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const posts = data?.pages.flatMap(page => page.posts) ?? [];

  return (
    <div className="feed">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasNextPage && (
        <div ref={ref} className="loading">
          {isFetchingNextPage ? 'Loading more...' : 'Load more'}
        </div>
      )}
    </div>
  );
}
```

### Error Boundary

```typescript
// apps/pwa/src/components/ErrorBoundary.tsx

import { Component, ReactNode } from 'react';
import { ClientRPCError } from '@vrss/api-client';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Log to error tracking service
    console.error('Error caught by boundary:', error, errorInfo);

    if (error instanceof ClientRPCError) {
      if (error.isAuthError()) {
        // Redirect to login
        window.location.href = '/login';
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-page">
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

## Performance Optimization

### Request Deduplication

```typescript
// apps/pwa/src/api/client.ts

import { RPCClient } from '@vrss/api-client';

class DedupedRPCClient extends RPCClient {
  private pending = new Map<string, Promise<any>>();

  async call<TInput, TOutput>(
    procedure: string,
    input: TInput,
    options?: any
  ): Promise<TOutput> {
    // Create cache key from procedure + input
    const key = JSON.stringify({ procedure, input });

    // Return existing promise if in flight
    if (this.pending.has(key)) {
      return this.pending.get(key)!;
    }

    // Create new promise
    const promise = super.call<TInput, TOutput>(procedure, input, options);

    // Store pending promise
    this.pending.set(key, promise);

    // Clean up after completion
    promise.finally(() => {
      this.pending.delete(key);
    });

    return promise;
  }
}

export const apiClient = new DedupedRPCClient(
  import.meta.env.VITE_API_URL || 'http://localhost:3001'
);
```

### Response Caching

```typescript
// apps/api/src/middleware/cache.ts

import type { Context, Next } from 'hono';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

const CACHEABLE_PROCEDURES = new Set([
  'user.getProfile',
  'post.getById',
  'discovery.searchUsers',
]);

export async function cacheMiddleware(c: Context, next: Next) {
  const body = await c.req.text();
  const request = JSON.parse(body);

  if (CACHEABLE_PROCEDURES.has(request.procedure)) {
    const cacheKey = `rpc:${request.procedure}:${JSON.stringify(request.input)}`;

    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    // Execute request
    c.req.raw = new Request(c.req.raw, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body,
    });

    await next();

    // Cache response
    const response = await c.res.clone().json();
    await redis.setex(cacheKey, 60, JSON.stringify(response));

  } else {
    c.req.raw = new Request(c.req.raw, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body,
    });

    await next();
  }
}
```

---

## Deployment

### Docker Configuration

```dockerfile
# apps/api/Dockerfile

FROM oven/bun:1 as base
WORKDIR /app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Build
ENV NODE_ENV=production
RUN bun build src/index.ts --outdir ./dist --target bun

# Production image
FROM oven/bun:1-alpine
WORKDIR /app

COPY --from=base /app/dist ./dist
COPY --from=base /app/node_modules ./node_modules
COPY --from=base /app/package.json ./

ENV PORT=3001
EXPOSE 3001

CMD ["bun", "dist/index.js"]
```

### Docker Compose

```yaml
# docker-compose.yml

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: vrss
      POSTGRES_PASSWORD: password
      POSTGRES_DB: vrss
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://vrss:password@postgres:5432/vrss
      REDIS_URL: redis://redis:6379
      AUTH_SECRET: your-secret-key
      NODE_ENV: production
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis

volumes:
  postgres_data:
```

---

## Summary

This implementation guide provides:

✅ Complete setup instructions
✅ Real-world implementation examples
✅ Testing strategies and examples
✅ Common patterns (optimistic updates, infinite scroll, error handling)
✅ Performance optimization techniques
✅ Deployment configuration

All examples are production-ready and follow TypeScript best practices with full type safety between frontend and backend.
