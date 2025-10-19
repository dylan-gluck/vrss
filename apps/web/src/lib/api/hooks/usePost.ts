/**
 * Post Hooks - Phase 4.3
 *
 * TanStack Query hooks for post-related procedures.
 * Includes optimistic updates for better UX.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

/**
 * Hook to create a new post
 * Uses optimistic updates to immediately show the post in the feed
 *
 * @example
 * const { mutate: createPost, isPending } = useCreatePost();
 * createPost({ content: 'Hello world!', media: [] });
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { content: string; media?: unknown[] }) => api.post.create(input),
    onMutate: async (newPost) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["feed"] });

      // Snapshot previous value
      const previousFeed = queryClient.getQueryData(["feed"]);

      // Optimistically update feed
      queryClient.setQueryData(["feed"], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          pages: old.pages.map((page: any, index: number) =>
            index === 0
              ? {
                  ...page,
                  posts: [
                    {
                      id: `temp-${Date.now()}`,
                      content: newPost.content,
                      createdAt: new Date().toISOString(),
                      likesCount: 0,
                      commentsCount: 0,
                      isLiked: false,
                      isBookmarked: false,
                      // ... other fields will be filled by server
                    },
                    ...page.posts,
                  ],
                }
              : page
          ),
        };
      });

      return { previousFeed };
    },
    onError: (_error, _newPost, context) => {
      // Rollback optimistic update on error
      if (context?.previousFeed) {
        queryClient.setQueryData(["feed"], context.previousFeed);
      }
    },
    onSettled: () => {
      // Refetch feed after mutation completes
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

/**
 * Hook to get a post by ID
 *
 * @example
 * const { data: post, isLoading } = usePost('post-123');
 */
export function usePost(postId: string) {
  return useQuery({
    queryKey: ["post", postId],
    queryFn: () => api.post.getById({ postId }),
    enabled: !!postId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to update a post
 *
 * @example
 * const { mutate: updatePost } = useUpdatePost();
 * updatePost({ postId: '123', updates: { content: 'Updated content' } });
 */
export function useUpdatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { postId: string; updates: Record<string, unknown> }) =>
      api.post.update(input),
    onSuccess: (_data, variables) => {
      // Invalidate post and feed queries
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

/**
 * Hook to delete a post
 *
 * @example
 * const { mutate: deletePost } = useDeletePost();
 * deletePost({ postId: '123' });
 */
export function useDeletePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { postId: string }) => api.post.delete(input),
    onSuccess: (_data, variables) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ["post", variables.postId] });
      queryClient.invalidateQueries({ queryKey: ["feed"] });
    },
  });
}

/**
 * Hook to like a post
 * Uses optimistic updates for instant feedback
 *
 * @example
 * const { mutate: likePost } = useLikePost();
 * likePost({ postId: '123' });
 */
export function useLikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { postId: string }) => api.post.like(input),
    onMutate: async (variables) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["post", variables.postId] });

      // Snapshot previous value
      const previousPost = queryClient.getQueryData(["post", variables.postId]);

      // Optimistically update
      queryClient.setQueryData(["post", variables.postId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: true,
          likesCount: old.likesCount + 1,
        };
      });

      return { previousPost };
    },
    onError: (_error, variables, context) => {
      // Rollback on error
      if (context?.previousPost) {
        queryClient.setQueryData(["post", variables.postId], context.previousPost);
      }
    },
    onSettled: (_data, _error, variables) => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}

/**
 * Hook to unlike a post
 *
 * @example
 * const { mutate: unlikePost } = useUnlikePost();
 * unlikePost({ postId: '123' });
 */
export function useUnlikePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { postId: string }) => api.post.unlike(input),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ["post", variables.postId] });

      const previousPost = queryClient.getQueryData(["post", variables.postId]);

      queryClient.setQueryData(["post", variables.postId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          isLiked: false,
          likesCount: Math.max(0, old.likesCount - 1),
        };
      });

      return { previousPost };
    },
    onError: (_error, variables, context) => {
      if (context?.previousPost) {
        queryClient.setQueryData(["post", variables.postId], context.previousPost);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: ["post", variables.postId] });
    },
  });
}
