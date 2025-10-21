/**
 * Auth API Client - Phase 4.4
 *
 * Type-safe API methods for authentication procedures.
 * Uses the RPC client from @/lib/api/client with proper typing.
 */

import { api } from "@/lib/api/client";
import type { AuthProcedures } from "@vrss/api-contracts";
import type { AuthResponse, LoginCredentials, RegisterData } from "../types/auth.types";

/**
 * Authentication API methods
 */
export const authApi = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.auth.login(credentials);
    return {
      user: response.user,
      token: response.sessionToken,
    };
  },

  /**
   * Register a new user account
   */
  async register(data: RegisterData): Promise<AuthResponse> {
    // Remove confirmPassword as it's only for client-side validation
    const { confirmPassword, ...registerInput } = data;
    const response = await api.auth.register(registerInput as AuthProcedures.Register.Input);
    return {
      user: response.user,
      token: response.sessionToken,
    };
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    await api.auth.logout();
  },

  /**
   * Get current user session
   */
  async getCurrentUser() {
    const response = await api.auth.getSession();
    return response.user;
  },

  /**
   * Refresh auth token
   */
  async refreshToken(): Promise<{ token: string }> {
    // This would be implemented if Better-auth provides token refresh
    // For now, sessions are cookie-based, so this may not be needed
    throw new Error("Token refresh not implemented for session-based auth");
  },
};
