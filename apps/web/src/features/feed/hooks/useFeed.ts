/**
 * useFeed Hook - Phase 5.1
 *
 * TanStack Query infinite query hook for fetching feed posts
 * Features:
 * - Cursor-based pagination
 * - Automatic caching and refetching
 * - Support for custom feed algorithms
 *
 * @see docs/FRONTEND.md Section: "Data Fetching"
 */

import { api } from "@/lib/api/client";
import { useInfiniteQuery } from "@tanstack/react-query";

/**
 * Post type definition
 */
export interface Post {
  id: string;
  type: "text" | "image" | "video" | "song";
  author: {
    id: string;
    username: string;
    avatarUrl: string;
  };
  content: string;
  media: Array<{
    id: string;
    type: "image" | "video" | "audio";
    url: string;
    thumbnailUrl?: string;
    alt?: string;
    title?: string;
    artist?: string;
    width?: number;
    height?: number;
  }>;
  hashtags: string[];
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Feed response type
 */
interface FeedResponse {
  posts: Post[];
  nextCursor?: number;
  hasMore: boolean;
}

/**
 * useFeed hook options
 */
export interface UseFeedOptions {
  /**
   * Algorithm ID for custom feed filtering
   * If not specified, uses the default "Following" feed
   */
  algorithmId?: string;

  /**
   * Number of posts per page
   * Default: 20
   */
  limit?: number;

  /**
   * Enable/disable the query
   * Default: true
   */
  enabled?: boolean;
}

/**
 * Fetch feed posts with infinite scroll support
 */
export function useFeed(options: UseFeedOptions = {}) {
  const { algorithmId, limit = 20, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: ["feed", { algorithmId, limit }],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await api.feed.get({
        cursor: pageParam,
        limit,
        algorithmId,
      });

      return response as FeedResponse;
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.nextCursor : undefined;
    },
    initialPageParam: 0,
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
