# Frontend API Integration Guide

**Version**: 1.0
**Date**: 2025-10-16

This document provides specific examples of how the VRSS frontend integrates with the RPC API backend.

---

## Table of Contents

1. [RPC Client Setup](#rpc-client-setup)
2. [Feature API Modules](#feature-api-modules)
3. [File Upload Integration](#file-upload-integration)
4. [Real-time Updates](#real-time-updates)
5. [Error Handling](#error-handling)
6. [Caching Strategy](#caching-strategy)
7. [Optimistic Updates](#optimistic-updates)

---

## RPC Client Setup

### Enhanced RPC Client with Error Handling

```typescript
// src/lib/api/client.ts

import { useAuthStore } from '@/features/auth/stores/authStore';
import { useToast } from '@/components/ui/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class RPCError extends Error {
  constructor(
    message: string,
    public code: number,
    public data?: any
  ) {
    super(message);
    this.name = 'RPCError';
  }
}

interface RPCRequest {
  method: string;
  params?: any;
  id?: string;
}

interface RPCResponse<T = any> {
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: string;
}

class RPCClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async call<T = any>(method: string, params?: any): Promise<T> {
    const token = useAuthStore.getState().token;

    const request: RPCRequest = {
      method,
      params,
      id: crypto.randomUUID(),
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/rpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(request),
      });

      // Handle HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          // Unauthorized - clear auth and redirect to login
          useAuthStore.getState().logout();
          window.location.href = '/login';
          throw new RPCError('Unauthorized', 401);
        }

        if (response.status === 429) {
          throw new RPCError('Too many requests. Please try again later.', 429);
        }

        throw new RPCError(`HTTP error! status: ${response.status}`, response.status);
      }

      const data: RPCResponse<T> = await response.json();

      // Handle RPC errors
      if (data.error) {
        throw new RPCError(data.error.message, data.error.code, data.error.data);
      }

      return data.result as T;
    } catch (error) {
      if (error instanceof RPCError) {
        throw error;
      }

      // Network error
      throw new RPCError(
        'Network error. Please check your connection.',
        -1,
        error
      );
    }
  }

  async batch<T = any>(
    calls: Array<{ method: string; params?: any }>
  ): Promise<T[]> {
    const token = useAuthStore.getState().token;

    const requests: RPCRequest[] = calls.map((call) => ({
      method: call.method,
      params: call.params,
      id: crypto.randomUUID(),
    }));

    const response = await fetch(`${this.baseUrl}/api/rpc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(requests),
    });

    if (!response.ok) {
      throw new RPCError(`HTTP error! status: ${response.status}`, response.status);
    }

    const data: RPCResponse<T>[] = await response.json();

    return data.map((item) => {
      if (item.error) {
        throw new RPCError(item.error.message, item.error.code, item.error.data);
      }
      return item.result as T;
    });
  }
}

export const rpcClient = new RPCClient(API_BASE_URL);
```

---

## Feature API Modules

### Feed API

```typescript
// src/features/feed/api/feedApi.ts

import { rpcClient } from '@/lib/api/client';
import type { Post, FeedAlgorithm, CreatePostInput } from '../types/feed.types';

export const feedApi = {
  // Get feed with pagination
  async getFeed(params: {
    algorithmId?: string;
    cursor?: number;
    limit?: number;
  }) {
    return rpcClient.call<{
      posts: Post[];
      nextCursor: number | null;
      hasMore: boolean;
    }>('feed.get', {
      algorithmId: params.algorithmId,
      cursor: params.cursor || 0,
      limit: params.limit || 20,
    });
  },

  // Get single post
  async getPost(postId: string) {
    return rpcClient.call<Post>('post.get', { postId });
  },

  // Create post
  async createPost(input: CreatePostInput) {
    return rpcClient.call<Post>('post.create', { input });
  },

  // Update post
  async updatePost(postId: string, updates: Partial<CreatePostInput>) {
    return rpcClient.call<Post>('post.update', { postId, updates });
  },

  // Delete post
  async deletePost(postId: string) {
    return rpcClient.call<void>('post.delete', { postId });
  },

  // Like post
  async likePost(postId: string) {
    return rpcClient.call<{ likesCount: number }>('post.like', { postId });
  },

  // Unlike post
  async unlikePost(postId: string) {
    return rpcClient.call<{ likesCount: number }>('post.unlike', { postId });
  },

  // Bookmark post
  async bookmarkPost(postId: string) {
    return rpcClient.call<void>('post.bookmark', { postId });
  },

  // Unbookmark post
  async unbookmarkPost(postId: string) {
    return rpcClient.call<void>('post.unbookmark', { postId });
  },

  // Get comments
  async getComments(postId: string, cursor?: number) {
    return rpcClient.call<{
      comments: Comment[];
      nextCursor: number | null;
    }>('post.comments.get', { postId, cursor });
  },

  // Create comment
  async createComment(postId: string, content: string, parentId?: string) {
    return rpcClient.call<Comment>('post.comment.create', {
      postId,
      content,
      parentId,
    });
  },

  // Feed algorithms
  async getAlgorithms() {
    return rpcClient.call<FeedAlgorithm[]>('feed.algorithms.list');
  },

  async getAlgorithm(algorithmId: string) {
    return rpcClient.call<FeedAlgorithm>('feed.algorithm.get', { algorithmId });
  },

  async createAlgorithm(input: {
    name: string;
    blocks: FeedAlgorithm['blocks'];
  }) {
    return rpcClient.call<FeedAlgorithm>('feed.algorithm.create', { input });
  },

  async updateAlgorithm(
    algorithmId: string,
    updates: Partial<{ name: string; blocks: FeedAlgorithm['blocks'] }>
  ) {
    return rpcClient.call<FeedAlgorithm>('feed.algorithm.update', {
      algorithmId,
      updates,
    });
  },

  async deleteAlgorithm(algorithmId: string) {
    return rpcClient.call<void>('feed.algorithm.delete', { algorithmId });
  },
};
```

### Profile API

```typescript
// src/features/profile/api/profileApi.ts

import { rpcClient } from '@/lib/api/client';
import type { Profile, ProfileStyles, ProfileLayout } from '../types/profile.types';

export const profileApi = {
  // Get profile by username
  async getProfile(username: string) {
    return rpcClient.call<Profile>('profile.get', { username });
  },

  // Get current user's profile
  async getMyProfile() {
    return rpcClient.call<Profile>('profile.me');
  },

  // Update profile basics
  async updateProfile(updates: {
    displayName?: string;
    bio?: string;
    visibility?: 'public' | 'friends' | 'private';
  }) {
    return rpcClient.call<Profile>('profile.update', { updates });
  },

  // Update profile styles
  async updateStyles(styles: ProfileStyles) {
    return rpcClient.call<Profile>('profile.styles.update', { styles });
  },

  // Update profile layout
  async updateLayout(layout: ProfileLayout) {
    return rpcClient.call<Profile>('profile.layout.update', { layout });
  },

  // Get profile posts
  async getProfilePosts(username: string, cursor?: number) {
    return rpcClient.call<{
      posts: Post[];
      nextCursor: number | null;
    }>('profile.posts.get', { username, cursor });
  },

  // Follow/unfollow
  async followUser(userId: string) {
    return rpcClient.call<void>('user.follow', { userId });
  },

  async unfollowUser(userId: string) {
    return rpcClient.call<void>('user.unfollow', { userId });
  },

  // Get followers/following
  async getFollowers(username: string, cursor?: number) {
    return rpcClient.call<{
      users: User[];
      nextCursor: number | null;
    }>('user.followers.get', { username, cursor });
  },

  async getFollowing(username: string, cursor?: number) {
    return rpcClient.call<{
      users: User[];
      nextCursor: number | null;
    }>('user.following.get', { username, cursor });
  },
};
```

### Messages API

```typescript
// src/features/messages/api/messageApi.ts

import { rpcClient } from '@/lib/api/client';
import type { Message, Thread } from '../types/message.types';

export const messageApi = {
  // Get threads (conversations)
  async getThreads(cursor?: number) {
    return rpcClient.call<{
      threads: Thread[];
      nextCursor: number | null;
    }>('messages.threads.get', { cursor });
  },

  // Get messages in a thread
  async getMessages(threadId: string, cursor?: number) {
    return rpcClient.call<{
      messages: Message[];
      nextCursor: number | null;
    }>('messages.thread.get', { threadId, cursor });
  },

  // Send message
  async sendMessage(recipientId: string, content: string, mediaIds?: string[]) {
    return rpcClient.call<Message>('message.send', {
      recipientId,
      content,
      mediaIds,
    });
  },

  // Mark as read
  async markAsRead(threadId: string) {
    return rpcClient.call<void>('messages.thread.markRead', { threadId });
  },

  // Delete message
  async deleteMessage(messageId: string) {
    return rpcClient.call<void>('message.delete', { messageId });
  },

  // Search messages
  async searchMessages(query: string) {
    return rpcClient.call<Message[]>('messages.search', { query });
  },
};
```

### Notifications API

```typescript
// src/features/notifications/api/notificationApi.ts

import { rpcClient } from '@/lib/api/client';
import type { Notification } from '../types/notification.types';

export const notificationApi = {
  // Get notifications
  async getNotifications(cursor?: number) {
    return rpcClient.call<{
      notifications: Notification[];
      nextCursor: number | null;
      unreadCount: number;
    }>('notifications.get', { cursor });
  },

  // Mark as read
  async markAsRead(notificationId: string) {
    return rpcClient.call<void>('notification.markRead', { notificationId });
  },

  // Mark all as read
  async markAllAsRead() {
    return rpcClient.call<void>('notifications.markAllRead');
  },

  // Delete notification
  async deleteNotification(notificationId: string) {
    return rpcClient.call<void>('notification.delete', { notificationId });
  },

  // Get unread count
  async getUnreadCount() {
    return rpcClient.call<{ count: number }>('notifications.unreadCount');
  },
};
```

### Search API

```typescript
// src/features/search/api/searchApi.ts

import { rpcClient } from '@/lib/api/client';

export const searchApi = {
  // Search all
  async search(query: string, filters?: {
    type?: 'all' | 'users' | 'posts' | 'hashtags';
    dateFrom?: string;
    dateTo?: string;
  }) {
    return rpcClient.call<{
      users: User[];
      posts: Post[];
      hashtags: string[];
    }>('search', { query, filters });
  },

  // Search users
  async searchUsers(query: string, limit?: number) {
    return rpcClient.call<User[]>('search.users', { query, limit });
  },

  // Search posts
  async searchPosts(query: string, cursor?: number) {
    return rpcClient.call<{
      posts: Post[];
      nextCursor: number | null;
    }>('search.posts', { query, cursor });
  },

  // Search hashtags
  async searchHashtags(query: string, limit?: number) {
    return rpcClient.call<string[]>('search.hashtags', { query, limit });
  },

  // Get trending
  async getTrending() {
    return rpcClient.call<{
      hashtags: string[];
      posts: Post[];
    }>('search.trending');
  },
};
```

---

## File Upload Integration

### Two-Phase Upload Pattern

```typescript
// src/lib/api/uploadApi.ts

import { rpcClient } from './client';

export interface UploadSignature {
  uploadId: string;
  uploadUrl: string;
  fields: Record<string, string>;
  expiresAt: string;
}

export interface UploadedFile {
  id: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  size: number;
  mimeType: string;
}

export const uploadApi = {
  // Phase 1: Get signed upload URL
  async getUploadSignature(
    fileName: string,
    fileSize: number,
    mimeType: string,
    type: 'avatar' | 'post' | 'background' | 'attachment'
  ): Promise<UploadSignature> {
    return rpcClient.call('upload.getSignature', {
      fileName,
      fileSize,
      mimeType,
      type,
    });
  },

  // Phase 2: Upload to S3
  async uploadToS3(
    file: File,
    signature: UploadSignature,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const formData = new FormData();

    // Add signature fields
    Object.entries(signature.fields).forEach(([key, value]) => {
      formData.append(key, value);
    });

    // Add file
    formData.append('file', file);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }

      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 204) {
          resolve();
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', signature.uploadUrl);
      xhr.send(formData);
    });
  },

  // Phase 3: Confirm upload
  async confirmUpload(uploadId: string): Promise<UploadedFile> {
    return rpcClient.call('upload.confirm', { uploadId });
  },

  // Helper: Complete upload flow
  async uploadFile(
    file: File,
    type: 'avatar' | 'post' | 'background' | 'attachment',
    onProgress?: (progress: number) => void
  ): Promise<UploadedFile> {
    // Get signature
    const signature = await this.getUploadSignature(
      file.name,
      file.size,
      file.type,
      type
    );

    // Upload to S3
    await this.uploadToS3(file, signature, onProgress);

    // Confirm upload
    return this.confirmUpload(signature.uploadId);
  },

  // Delete file
  async deleteFile(fileId: string): Promise<void> {
    return rpcClient.call('upload.delete', { fileId });
  },
};
```

### Upload Hook

```typescript
// src/lib/hooks/useFileUpload.ts

import { useState } from 'react';
import { uploadApi } from '../api/uploadApi';
import type { UploadedFile } from '../api/uploadApi';
import { useToast } from '@/components/ui/use-toast';

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const upload = async (
    file: File,
    type: 'avatar' | 'post' | 'background' | 'attachment'
  ): Promise<UploadedFile | null> => {
    setIsUploading(true);
    setProgress(0);

    try {
      const result = await uploadApi.uploadFile(file, type, (progress) => {
        setProgress(progress);
      });

      toast({
        title: 'Upload successful',
        description: `${file.name} uploaded successfully`,
      });

      return result;
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return {
    upload,
    isUploading,
    progress,
  };
}
```

### Usage in Components

```typescript
// src/features/feed/components/CreatePost/PostComposer.tsx

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MediaUpload } from './MediaUpload';
import { useFileUpload } from '@/lib/hooks/useFileUpload';
import { feedApi } from '../../api/feedApi';

export const PostComposer: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { upload, isUploading, progress } = useFileUpload();
  const { register, handleSubmit } = useForm();

  const handleMediaUpload = async (files: File[]) => {
    const results = await Promise.all(
      files.map((file) => upload(file, 'post'))
    );

    const successfulUploads = results.filter((r) => r !== null) as UploadedFile[];
    setUploadedFiles([...uploadedFiles, ...successfulUploads]);
  };

  const onSubmit = async (data: any) => {
    await feedApi.createPost({
      content: data.content,
      mediaIds: uploadedFiles.map((f) => f.id),
      type: uploadedFiles.length > 0 ? 'image' : 'text',
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <textarea {...register('content')} />

      <MediaUpload
        type="image"
        multiple
        onUpload={handleMediaUpload}
      />

      {isUploading && <Progress value={progress} />}

      <Button type="submit" disabled={isUploading}>
        Post
      </Button>
    </form>
  );
};
```

---

## Real-time Updates

### Polling Implementation

```typescript
// src/features/notifications/hooks/useNotificationPolling.ts

import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '../api/notificationApi';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useOnline } from '@/lib/hooks/useOnline';

const POLL_INTERVAL = 30000; // 30 seconds

export function useNotificationPolling() {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isOnline = useOnline();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initial fetch
  const { data } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationApi.getUnreadCount(),
    enabled: isAuthenticated && isOnline,
    staleTime: POLL_INTERVAL,
  });

  // Polling
  useEffect(() => {
    if (!isAuthenticated || !isOnline) return;

    intervalRef.current = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    }, POLL_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, isOnline, queryClient]);

  return {
    unreadCount: data?.count ?? 0,
  };
}
```

### Message Polling

```typescript
// src/features/messages/hooks/useMessagePolling.ts

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/stores/authStore';
import { useOnline } from '@/lib/hooks/useOnline';

const POLL_INTERVAL = 10000; // 10 seconds

export function useMessagePolling(threadId?: string) {
  const queryClient = useQueryClient();
  const location = useLocation();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isOnline = useOnline();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !isOnline) return;

    // Poll more frequently when in messages view
    const isInMessagesView = location.pathname.startsWith('/messages');
    const interval = isInMessagesView ? 5000 : POLL_INTERVAL;

    intervalRef.current = setInterval(() => {
      // Invalidate threads list
      queryClient.invalidateQueries({ queryKey: ['messages', 'threads'] });

      // If viewing a specific thread, invalidate it
      if (threadId) {
        queryClient.invalidateQueries({ queryKey: ['messages', 'thread', threadId] });
      }
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isAuthenticated, isOnline, threadId, location.pathname, queryClient]);
}
```

---

## Error Handling

### Global Error Handler

```typescript
// src/lib/api/errorHandler.ts

import { RPCError } from './client';
import { useToast } from '@/components/ui/use-toast';

export function handleRPCError(error: unknown) {
  const { toast } = useToast();

  if (error instanceof RPCError) {
    // Map error codes to user-friendly messages
    const errorMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      401: 'You need to be logged in to do that.',
      403: 'You don\'t have permission to do that.',
      404: 'The requested resource was not found.',
      409: 'This action conflicts with existing data.',
      429: 'Too many requests. Please slow down.',
      500: 'Something went wrong on our end. Please try again.',
    };

    const message = errorMessages[error.code] || error.message;

    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
    });
  } else if (error instanceof Error) {
    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive',
    });
  } else {
    toast({
      title: 'Error',
      description: 'An unexpected error occurred',
      variant: 'destructive',
    });
  }
}
```

### Query Error Handling

```typescript
// src/features/feed/hooks/useFeed.ts

import { useInfiniteQuery } from '@tanstack/react-query';
import { feedApi } from '../api/feedApi';
import { handleRPCError } from '@/lib/api/errorHandler';

export function useFeed(algorithmId?: string) {
  return useInfiniteQuery({
    queryKey: ['feed', algorithmId],
    queryFn: ({ pageParam = 0 }) =>
      feedApi.getFeed({ algorithmId, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    onError: handleRPCError,
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error instanceof RPCError && error.code >= 400 && error.code < 500) {
        return false;
      }
      return failureCount < 3;
    },
  });
}
```

### Mutation Error Handling

```typescript
// src/features/feed/hooks/useCreatePost.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { feedApi } from '../api/feedApi';
import { handleRPCError } from '@/lib/api/errorHandler';
import { useToast } from '@/components/ui/use-toast';

export function useCreatePost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: feedApi.createPost,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      toast({
        title: 'Post created',
        description: 'Your post has been published',
      });
    },
    onError: handleRPCError,
  });
}
```

---

## Caching Strategy

### Query Configuration

```typescript
// src/lib/api/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
});
```

### Feature-Specific Cache Times

```typescript
// src/features/feed/hooks/useFeed.ts

export function useFeed(algorithmId?: string) {
  return useInfiniteQuery({
    queryKey: ['feed', algorithmId],
    queryFn: ({ pageParam = 0 }) =>
      feedApi.getFeed({ algorithmId, cursor: pageParam }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 2, // 2 minutes (fresher for feed)
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}

// src/features/profile/hooks/useProfile.ts

export function useProfile(username: string) {
  return useQuery({
    queryKey: ['profile', username],
    queryFn: () => profileApi.getProfile(username),
    staleTime: 1000 * 60 * 10, // 10 minutes (less frequent updates)
    gcTime: 1000 * 60 * 60, // 1 hour
  });
}
```

### Cache Invalidation

```typescript
// src/features/feed/hooks/useCreatePost.ts

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: feedApi.createPost,
    onSuccess: () => {
      // Invalidate all feed queries
      queryClient.invalidateQueries({ queryKey: ['feed'] });

      // Invalidate user's profile
      const username = useAuthStore.getState().user?.username;
      if (username) {
        queryClient.invalidateQueries({ queryKey: ['profile', username] });
      }
    },
  });
}
```

---

## Optimistic Updates

### Like Post Example

```typescript
// src/features/feed/hooks/useLikePost.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { feedApi } from '../api/feedApi';
import type { Post } from '../types/feed.types';

export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId, isLiked }: { postId: string; isLiked: boolean }) =>
      isLiked ? feedApi.unlikePost(postId) : feedApi.likePost(postId),

    onMutate: async ({ postId, isLiked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['feed'] });

      // Snapshot previous value
      const previousFeed = queryClient.getQueryData(['feed']);

      // Optimistically update
      queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            posts: page.posts.map((post: Post) =>
              post.id === postId
                ? {
                    ...post,
                    isLiked: !isLiked,
                    likesCount: post.likesCount + (isLiked ? -1 : 1),
                  }
                : post
            ),
          })),
        };
      });

      return { previousFeed };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousFeed) {
        queryClient.setQueryData(['feed'], context.previousFeed);
      }
    },

    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}
```

### Update Profile Example

```typescript
// src/features/profile/hooks/useUpdateProfile.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profileApi';
import { useAuthStore } from '@/features/auth/stores/authStore';
import type { Profile } from '../types/profile.types';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const username = useAuthStore((state) => state.user?.username);

  return useMutation({
    mutationFn: profileApi.updateProfile,

    onMutate: async (updates) => {
      if (!username) return;

      await queryClient.cancelQueries({ queryKey: ['profile', username] });

      const previousProfile = queryClient.getQueryData<Profile>([
        'profile',
        username,
      ]);

      queryClient.setQueryData<Profile>(['profile', username], (old) =>
        old ? { ...old, ...updates } : old
      );

      return { previousProfile };
    },

    onError: (err, variables, context) => {
      if (context?.previousProfile && username) {
        queryClient.setQueryData(['profile', username], context.previousProfile);
      }
    },

    onSettled: () => {
      if (username) {
        queryClient.invalidateQueries({ queryKey: ['profile', username] });
      }
    },
  });
}
```

---

## Request Batching

### Batch Loading Multiple Profiles

```typescript
// src/features/profile/hooks/useProfiles.ts

import { useQuery } from '@tanstack/react-query';
import { rpcClient } from '@/lib/api/client';
import type { Profile } from '../types/profile.types';

export function useProfiles(usernames: string[]) {
  return useQuery({
    queryKey: ['profiles', usernames],
    queryFn: async () => {
      const calls = usernames.map((username) => ({
        method: 'profile.get',
        params: { username },
      }));

      return rpcClient.batch<Profile>(calls);
    },
    enabled: usernames.length > 0,
  });
}
```

---

## Type Safety

### Shared Type Definitions

```typescript
// src/types/api.types.ts

// These should ideally be generated from backend schema
// or shared via a common package

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: number | null;
  hasMore: boolean;
  total?: number;
}

export interface ErrorResponse {
  code: number;
  message: string;
  data?: any;
}

export interface SuccessResponse<T> {
  result: T;
}

// Helper type for RPC methods
export type RPCMethod<TParams = void, TResult = void> = TParams extends void
  ? () => Promise<TResult>
  : (params: TParams) => Promise<TResult>;
```

---

## Testing API Integration

### Mocking RPC Calls

```typescript
// src/lib/api/__mocks__/client.ts

export const rpcClient = {
  call: vi.fn(),
  batch: vi.fn(),
};

// In tests:
import { rpcClient } from '@/lib/api/client';

vi.mock('@/lib/api/client');

test('creates post successfully', async () => {
  const mockPost = { id: '1', content: 'Test post' };

  vi.mocked(rpcClient.call).mockResolvedValueOnce(mockPost);

  const result = await feedApi.createPost({ content: 'Test post' });

  expect(result).toEqual(mockPost);
  expect(rpcClient.call).toHaveBeenCalledWith('post.create', {
    input: { content: 'Test post' },
  });
});
```

---

## Summary

This guide demonstrates:

1. **Type-safe RPC client** with error handling
2. **Feature-specific API modules** for all features
3. **Two-phase file upload** integration
4. **Real-time updates** via polling
5. **Global error handling** with user-friendly messages
6. **Caching strategy** with TanStack Query
7. **Optimistic updates** for better UX
8. **Request batching** for efficiency
9. **Type safety** throughout

All API integrations follow consistent patterns and leverage TanStack Query for caching, error handling, and optimistic updates.
