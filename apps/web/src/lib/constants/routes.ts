/**
 * Route Constants - Phase 4.4
 *
 * Centralized route definitions for the application.
 * Prevents magic strings and enables easy route refactoring.
 */

export const ROUTES = {
  // Auth routes (public)
  LOGIN: "/login",
  REGISTER: "/register",
  VERIFY_EMAIL: "/verify-email",
  FORGOT_PASSWORD: "/forgot-password",
  RESET_PASSWORD: "/reset-password",

  // App routes (protected)
  HOME: "/",
  PROFILE: "/profile",
  USER_PROFILE: (username: string) => `/u/${username}`,
  POST: (postId: string) => `/post/${postId}`,
  SETTINGS: "/settings",
  NOTIFICATIONS: "/notifications",

  // Feed routes
  FEED: "/",
  EXPLORE: "/explore",

  // Social routes
  FOLLOWERS: (username: string) => `/u/${username}/followers`,
  FOLLOWING: (username: string) => `/u/${username}/following`,
} as const;
