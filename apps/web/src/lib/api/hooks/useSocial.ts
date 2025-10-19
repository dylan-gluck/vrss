/**
 * Social Hooks - Phase 4.3
 *
 * TanStack Query hooks for social interaction procedures.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../client";

/**
 * Hook to follow a user
 *
 * @example
 * const { mutate: follow } = useFollow();
 * follow({ userId: 'user-123' });
 */
export function useFollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { userId: string }) => api.social.follow(input),
    onSuccess: (_data, variables) => {
      // Invalidate followers/following lists
      queryClient.invalidateQueries({ queryKey: ["followers", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
    },
  });
}

/**
 * Hook to unfollow a user
 *
 * @example
 * const { mutate: unfollow } = useUnfollow();
 * unfollow({ userId: 'user-123' });
 */
export function useUnfollow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { userId: string }) => api.social.unfollow(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["followers", variables.userId] });
      queryClient.invalidateQueries({ queryKey: ["following"] });
      queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
    },
  });
}

/**
 * Hook to get a user's followers
 *
 * @example
 * const { data: followers } = useFollowers('user-123');
 */
export function useFollowers(userId: string, options: { limit?: number } = {}) {
  const { limit = 20 } = options;

  return useQuery({
    queryKey: ["followers", userId],
    queryFn: () => api.social.getFollowers({ userId, limit }),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to get a user's following list
 *
 * @example
 * const { data: following } = useFollowing('user-123');
 */
export function useFollowing(userId: string, options: { limit?: number } = {}) {
  const { limit = 20 } = options;

  return useQuery({
    queryKey: ["following", userId],
    queryFn: () => api.social.getFollowing({ userId, limit }),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}
