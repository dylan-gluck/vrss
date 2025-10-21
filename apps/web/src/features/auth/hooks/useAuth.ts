/**
 * Auth Hook - Better-auth Integration
 *
 * Wrapper around better-auth client for authentication operations.
 * Uses better-auth's built-in session management (cookie-based).
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { signIn, signOut, signUp, useSession } from "@/lib/auth/client";
import type { LoginCredentials, RegisterData } from "../types/auth.types";

/**
 * Hook for authentication operations
 * Uses better-auth for all auth functionality
 */
export function useAuth() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: session, isPending: isSessionLoading } = useSession();

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const result = await signIn.username({
        username: credentials.username,
        password: credentials.password,
      });

      if (result.error) {
        throw new Error(result.error.message || "Login failed");
      }

      return result;
    },
    onSuccess: () => {
      // Navigate to home after successful login
      navigate("/");
    },
    onError: (error: Error) => {
      console.error("Login failed:", error);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterData) => {
      const result = await signUp.email({
        email: data.email,
        password: data.password,
        name: data.username,
        username: data.username,
      });

      if (result.error) {
        throw new Error(result.error.message || "Registration failed");
      }

      return result;
    },
    onSuccess: () => {
      // After registration, navigate to home
      navigate("/");
    },
    onError: (error: Error) => {
      console.error("Registration failed:", error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSuccess: () => {
      queryClient.clear();
      navigate("/login");
    },
    onError: (error: Error) => {
      console.error("Logout failed:", error);
      // Even if API call fails, clear local state and navigate
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

    // Auth state from better-auth session
    isAuthenticated: !!session?.user,
    user: session?.user || null,
    isSessionLoading,
  };
}
