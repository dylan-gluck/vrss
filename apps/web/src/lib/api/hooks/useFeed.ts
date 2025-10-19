/**
 * Feed Hooks - Phase 4.3
 *
 * TanStack Query hooks for feed-related procedures.
 * Supports infinite scrolling with cursor-based pagination.
 */

import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../client";

/**
 * Hook to get the user's feed with infinite scrolling
 *
 * @example
 * const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useFeed();
 */
export function useFeed(
  options: {
    algorithmId?: string;
    limit?: number;
    enabled?: boolean;
  } = {}
) {
  const { algorithmId, limit = 20, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: ["feed", algorithmId],
    queryFn: ({ pageParam = 0 }) =>
      api.feed.get({
        cursor: pageParam,
        limit,
        algorithmId,
      }),
    getNextPageParam: (lastPage: any) => {
      // Return nextCursor if it exists, otherwise return undefined to stop pagination
      return lastPage.nextCursor ?? undefined;
    },
    initialPageParam: 0,
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
