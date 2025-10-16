/**
 * Shared Domain Types
 * These types are used across frontend and backend
 */

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Post types
export type PostType = 'text_short' | 'text_long' | 'image_single' | 'image_gallery' | 'video' | 'song';

export interface Post {
  id: string;
  authorId: string;
  type: PostType;
  content: string | null;
  mediaUrls: string[] | null;
  metadata: Record<string, unknown> | null;
  isPublic: boolean;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Feed types
export interface CustomFeed {
  id: string;
  userId: string;
  name: string;
  algorithm: FeedAlgorithm;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedAlgorithm {
  blocks: FeedBlock[];
}

export interface FeedBlock {
  id: string;
  type: 'filter' | 'sort' | 'limit';
  config: Record<string, unknown>;
  order: number;
}

// Profile types
export type ProfileVisibility = 'public' | 'private' | 'followers_only';

export interface UserProfile {
  userId: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  visibility: ProfileVisibility;
  customStyles: ProfileStyles | null;
}

export interface ProfileStyles {
  background?: {
    type: 'color' | 'gradient' | 'image';
    value: string;
  };
  colors?: {
    primary?: string;
    secondary?: string;
    text?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
  music?: {
    url: string;
    autoplay: boolean;
  };
}

// Pagination
export interface CursorPagination {
  cursor?: string;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}
