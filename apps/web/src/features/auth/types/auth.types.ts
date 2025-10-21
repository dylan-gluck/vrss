/**
 * Auth Types - Phase 4.4
 *
 * Type definitions for authentication feature.
 * These types align with the Better-auth backend and api-contracts.
 */

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PasswordStrength {
  score: 0 | 1 | 2 | 3 | 4;
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}
