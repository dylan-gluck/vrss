/**
 * Auth Hook - Phase 4.4
 *
 * TanStack Query mutations for authentication procedures.
 * Integrates with AuthStore and provides navigation on success.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { useAuthStore } from "../stores/authStore";
import type { LoginCredentials, RegisterData } from "../types/auth.types";

/**
 * Hook for authentication operations
 * Provides login, register, logout mutations with automatic state management
 */
export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setUser, logout: logoutStore, isAuthenticated, user } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginCredentials) => authApi.login(credentials),
    onSuccess: (data) => {
      setUser(data.user, data.token);
      // Navigate to home after successful login
      navigate("/");
    },
    onError: (error: Error) => {
      console.error("Login failed:", error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterData) => authApi.register(data),
    onSuccess: (data) => {
      setUser(data.user, data.token);
      // After registration, navigate to home
      // Email verification will be handled by backend if required
      navigate("/");
    },
    onError: (error: Error) => {
      console.error("Registration failed:", error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      logoutStore();
      queryClient.clear();
      navigate("/login");
    },
    onError: (error: Error) => {
      console.error("Logout failed:", error);
      // Even if API call fails, clear local state
      logoutStore();
      queryClient.clear();
      navigate("/login");
    },
  });

  return {
    // Mutations
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,

    // Loading states
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isLoggingOut: logoutMutation.isPending,

    // Error states
    loginError: loginMutation.error,
    registerError: registerMutation.error,

    // Auth state
    isAuthenticated,
    user,
  };
}
