/**
 * useBookmarkPost Hook - Phase 5.1
 *
 * TanStack Query mutation hook for bookmarking/unbookmarking posts with optimistic updates
 * Features:
 * - Optimistic UI updates
 * - Automatic rollback on error
 * - Query cache invalidation on success
 *
 * @see docs/FRONTEND.md Section: "Mutation Hooks Pattern"
 */

import { api, rpcClient } from "@/lib/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Post } from "./useFeed";

interface BookmarkPostInput {
  postId: string;
  currentlyBookmarked: boolean;
}

/**
 * Update a post's bookmark status in the feed cache
 */
function updatePostInCache(feedData: any, postId: string, isBookmarked: boolean) {
  if (!feedData?.pages) return feedData;

  return {
    ...feedData,
    pages: feedData.pages.map((page: any) => ({
      ...page,
      posts: page.posts.map((post: Post) => {
        if (post.id === postId) {
          return {
            ...post,
            isBookmarked,
          };
        }
        return post;
      }),
    })),
  };
}

/**
 * Hook for bookmarking/unbookmarking posts with optimistic updates
 */
export function useBookmarkPost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, currentlyBookmarked }: BookmarkPostInput) => {
      // Call the appropriate API endpoint
      const procedure = currentlyBookmarked ? "post.unbookmark" : "post.bookmark";
      return rpcClient.call(procedure, { postId }, { mutation: true });
    },

    // Optimistic update before mutation
    onMutate: async ({ postId, currentlyBookmarked }: BookmarkPostInput) => {
      const newBookmarkedState = !currentlyBookmarked;

      // Cancel any outgoing refetches for feed queries
      await queryClient.cancelQueries({ queryKey: ["feed"] });

      // Snapshot the previous values
      const previousFeedData = queryClient.getQueriesData({ queryKey: ["feed"] });

      // Optimistically update all feed queries
      queryClient.setQueriesData({ queryKey: ["feed"] }, (oldData: any) => {
        if (!oldData) return oldData;
        return updatePostInCache(oldData, postId, newBookmarkedState);
      });

      // Return context for rollback
      return { previousFeedData };
    },

    // Rollback on error
    onError: (_error, _variables, context) => {
      // Restore the previous feed data
      if (context?.previousFeedData) {
        for (const [queryKey, data] of context.previousFeedData) {
          queryClient.setQueryData(queryKey, data);
        }
      }
    },

    // Invalidate queries on success to ensure data consistency
    onSuccess: () => {
      // Invalidate all feed queries to refetch latest data
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}
