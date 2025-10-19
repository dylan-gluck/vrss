/**
 * Auth Hooks - Phase 4.3
 *
 * TanStack Query hooks for authentication procedures.
 * Provides type-safe hooks with automatic caching and state management.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AuthProcedures } from "@vrss/api-contracts";
import { useAuthStore } from "../../store/authStore";
import { api, rpcClient } from "../client";

/**
 * Hook to login a user
 *
 * @example
 * const { mutate: login, isPending, isError } = useLogin();
 * login({ email: 'user@example.com', password: 'password123' });
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (input: AuthProcedures.Login.Input) => api.auth.login(input),
    onSuccess: (data: AuthProcedures.Login.Output) => {
      // Update auth store
      setUser(data.user, data.sessionToken);

      // Invalidate any cached queries that depend on auth state
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

/**
 * Hook to register a new user
 *
 * @example
 * const { mutate: register } = useRegister();
 * register({ username: 'john', email: 'john@example.com', password: 'password123' });
 */
export function useRegister() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);

  return useMutation({
    mutationFn: (input: AuthProcedures.Register.Input) => api.auth.register(input),
    onSuccess: (data: AuthProcedures.Register.Output) => {
      // Update auth store
      setUser(data.user, data.sessionToken);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

/**
 * Hook to logout the current user
 *
 * @example
 * const { mutate: logout } = useLogout();
 * logout();
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const authLogout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      // Clear auth store
      authLogout();

      // Clear all cached queries
      queryClient.clear();
    },
  });
}

/**
 * Hook to get the current session
 *
 * @example
 * const { data: session, isLoading } = useSession();
 */
export function useSession() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return useQuery({
    queryKey: ["session"],
    queryFn: () => api.auth.getSession(),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

/**
 * Hook to check if user is authenticated
 * This is a convenience hook that returns auth state from the store
 *
 * @example
 * const { isAuthenticated, user } = useAuth();
 */
export function useAuth() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);

  return {
    isAuthenticated,
    user,
    isLoading,
  };
}
