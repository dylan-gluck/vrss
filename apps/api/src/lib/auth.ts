/**
 * Better-auth Configuration
 *
 * Core authentication setup for VRSS Social Platform.
 * Uses Better-auth with Prisma adapter for PostgreSQL.
 *
 * @see docs/AUTHENTICATION.md for architecture details
 */

import { PrismaClient } from "@prisma/client";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { username } from "better-auth/plugins";

const prisma = new PrismaClient();

// Export secret for testing/verification (better-auth may not expose it in options)
const authSecret =
  process.env.BETTER_AUTH_SECRET ||
  (() => {
    throw new Error("BETTER_AUTH_SECRET environment variable is required");
  })();

const baseAuth = betterAuth({
  // Database adapter
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // Email/Password authentication
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // Disabled for MVP
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },

  // Email verification configuration (disabled for MVP)
  // emailVerification: {
  //   sendOnSignUp: true, // Automatically send verification email on signup
  //   autoSignInAfterVerification: true, // Auto-login after email verification
  //   expiresIn: 60 * 60 * 24, // 24 hours (86400 seconds)
  //   sendVerificationEmail: async ({ user, token }) => {
  //     // Import email service to send verification email
  //     const { sendVerificationEmail } = await import("./email");
  //     // Extract username from user (better-auth username plugin adds username field)
  //     const username = (user as any).username || user.name || user.email;
  //     // Send verification email using existing email service
  //     // Note: We use our custom email service which expects a token, not a URL
  //     await sendVerificationEmail(user.email, username, token);
  //   },
  // },

  // Session configuration
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (604800 seconds)
    updateAge: 60 * 60 * 24, // Update every 24 hours (86400 seconds)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes (300 seconds)
    },
  },

  // Security settings
  advanced: {
    cookieSameSite: "lax",
    cookieSecure: process.env.NODE_ENV === "production",
    cookiePrefix: "vrss",
    database: {
      generateId: false, // Use database auto-increment
    },
  },

  // Base URL for email links
  baseURL: process.env.APP_URL || "http://localhost:3000",

  // Secret for signing tokens (required, min 32 chars for security)
  secret: authSecret,

  // Trusted origins
  trustedOrigins: [
    process.env.APP_URL || "http://localhost:3000",
    process.env.WEB_URL || "http://localhost:5173",
  ],

  // Plugins
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
  ],
});

// Export auth with convenience aliases for common methods
export const auth = {
  ...baseAuth,
  options: {
    ...baseAuth.options,
    secret: authSecret, // Explicitly expose secret for verification
  },
  api: {
    ...baseAuth.api,
    // Convenience aliases for tests and common usage
    signUp: baseAuth.api.signUpEmail,
    signIn: baseAuth.api.signInEmail,
  },
};

export type Session = typeof baseAuth.$Infer.Session;
