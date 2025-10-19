/**
 * User Hooks - Phase 4.3
 *
 * TanStack Query hooks for user-related procedures.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../../store/authStore";
import { api } from "../client";

/**
 * Hook to get a user's profile
 *
 * @example
 * const { data: profile, isLoading } = useUserProfile('johndoe');
 */
export function useUserProfile(username: string) {
  return useQuery({
    queryKey: ["user", "profile", username],
    queryFn: () => api.user.getProfile({ username }),
    enabled: !!username,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook to update the current user's profile
 *
 * @example
 * const { mutate: updateProfile } = useUpdateProfile();
 * updateProfile({ bio: 'New bio', displayName: 'New Name' });
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const updateUser = useAuthStore((state) => state.updateUser);
  const currentUser = useAuthStore((state) => state.user);

  return useMutation({
    mutationFn: (updates: Record<string, unknown>) => api.user.updateProfile({ updates }),
    onSuccess: (_data, variables) => {
      // Update auth store
      updateUser(variables);

      // Invalidate profile queries
      if (currentUser?.username) {
        queryClient.invalidateQueries({
          queryKey: ["user", "profile", currentUser.username],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}
