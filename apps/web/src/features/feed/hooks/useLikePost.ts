/**
 * useLikePost Hook - Phase 5.1
 *
 * TanStack Query mutation hook for liking/unliking posts with optimistic updates
 * Features:
 * - Optimistic UI updates
 * - Automatic rollback on error
 * - Query cache invalidation on success
 *
 * @see docs/FRONTEND.md Section: "Mutation Hooks Pattern"
 */

import { api } from "@/lib/api/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Post } from "./useFeed";

interface LikePostInput {
  postId: string;
  currentlyLiked: boolean;
}

/**
 * Update a post's like status in the feed cache
 */
function updatePostInCache(feedData: any, postId: string, isLiked: boolean, likesCount: number) {
  if (!feedData?.pages) return feedData;

  return {
    ...feedData,
    pages: feedData.pages.map((page: any) => ({
      ...page,
      posts: page.posts.map((post: Post) => {
        if (post.id === postId) {
          return {
            ...post,
            isLiked,
            likesCount,
          };
        }
        return post;
      }),
    })),
  };
}

/**
 * Hook for liking/unliking posts with optimistic updates
 */
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, currentlyLiked }: LikePostInput) => {
      // Call the appropriate API endpoint
      if (currentlyLiked) {
        return api.post.unlike({ postId });
      }
      return api.post.like({ postId });
    },

    // Optimistic update before mutation
    onMutate: async ({ postId, currentlyLiked }: LikePostInput) => {
      const newLikedState = !currentlyLiked;

      // Cancel any outgoing refetches for feed queries
      await queryClient.cancelQueries({ queryKey: ["feed"] });

      // Snapshot the previous values
      const previousFeedData = queryClient.getQueriesData({ queryKey: ["feed"] });

      // Optimistically update all feed queries
      queryClient.setQueriesData({ queryKey: ["feed"] }, (oldData: any) => {
        if (!oldData) return oldData;

        // Find the post and update its like count
        const post = oldData.pages
          ?.flatMap((page: any) => page.posts)
          .find((p: Post) => p.id === postId);

        if (!post) return oldData;

        const newLikesCount = newLikedState
          ? post.likesCount + 1
          : Math.max(0, post.likesCount - 1);

        return updatePostInCache(oldData, postId, newLikedState, newLikesCount);
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
