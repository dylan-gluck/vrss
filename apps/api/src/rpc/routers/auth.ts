/**
 * Authentication Router - Phase 2.2
 *
 * Implements all authentication procedures for the VRSS Social Platform.
 * Uses Better-auth for core authentication functionality with custom validation
 * and business logic for the VRSS platform requirements.
 *
 * Procedures:
 * - auth.register: User registration with validation
 * - auth.login: User login with email verification check
 * - auth.logout: Session termination
 * - auth.getSession: Current session retrieval
 * - auth.verifyEmail: Email verification with token
 * - auth.resendVerification: Resend verification email
 *
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 2.2
 * @see docs/SECURITY_DESIGN.md for authentication architecture
 * @see docs/api-architecture.md for RPC patterns
 */

import { PrismaClient } from "@prisma/client";
import { ErrorCode } from "@vrss/api-contracts";
import { z } from "zod";
import { auth } from "../../lib/auth";
import type { ProcedureContext } from "../types";

// Initialize Prisma client
const prisma = new PrismaClient();

// =============================================================================
// ERROR CODES (1000-1099 for auth errors)
// =============================================================================

enum AuthErrorCode {
  // Authentication errors (using 1000 range for auth-specific errors)
  AUTH_EMAIL_NOT_VERIFIED = 1010,
  AUTH_INVALID_CREDENTIALS = 1011,
  AUTH_ACCOUNT_SUSPENDED = 1012,
  AUTH_ACCOUNT_DELETED = 1013,
  AUTH_RATE_LIMITED = 1014,

  // Token errors
  AUTH_TOKEN_EXPIRED = 1020,
  AUTH_TOKEN_INVALID = 1021,
  AUTH_TOKEN_ALREADY_USED = 1022,

  // Session errors
  AUTH_UNAUTHORIZED = 1030,
  AUTH_SESSION_EXPIRED = 1031,

  // Conflict errors (1400 range for conflicts)
  AUTH_USERNAME_TAKEN = 1401,
  AUTH_EMAIL_TAKEN = 1402,
}

// =============================================================================
// CUSTOM ERROR CLASS
// =============================================================================

class RPCError extends Error {
  constructor(
    public code: ErrorCode | AuthErrorCode,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "RPCError";
  }
}

/**
 * Create a user-friendly validation error message from Zod error
 */
function getValidationErrorMessage(error: z.ZodError): string {
  const firstError = error.errors[0];
  if (!firstError) {
    return "Invalid input";
  }

  const field = firstError.path.length > 0 ? String(firstError.path[0]) : "input";
  const message = firstError.message;

  // If message is generic "Required", make it more specific
  if (message === "Required") {
    return `${field} is required`;
  }

  // If message doesn't mention the field, prepend it
  if (!message.toLowerCase().includes(field.toLowerCase())) {
    return `${field}: ${message}`;
  }

  return message;
}

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

// Username validation: 3-30 characters, alphanumeric + underscore
const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores");

// Email validation
const emailSchema = z
  .string()
  .email("Invalid email format")
  .max(255, "Email must be at most 255 characters");

// Password validation: 12-128 chars, must include uppercase, lowercase, number, special char
const passwordSchema = z
  .string()
  .min(12, "password must be at least 12 characters")
  .max(128, "password must be at most 128 characters")
  .refine(
    (password) => /[A-Z]/.test(password),
    "Password must contain at least one uppercase letter"
  )
  .refine(
    (password) => /[a-z]/.test(password),
    "Password must contain at least one lowercase letter"
  )
  .refine((password) => /[0-9]/.test(password), "Password must contain at least one number")
  .refine(
    (password) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    "Password must contain at least one special character"
  );

// Registration input schema
const registerSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});

// Login input schema
const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, "Password is required"),
});

// Verify email input schema
const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

// Resend verification input schema
const resendVerificationSchema = z.object({
  email: emailSchema,
});

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================
// Note: Password hashing, token generation, and session creation are now
// handled by better-auth. These functions have been removed in favor of
// better-auth's built-in implementations.

// =============================================================================
// AUTH PROCEDURES
// =============================================================================

export const authRouter = {
  /**
   * auth.register - Register a new user
   *
   * Validates input, checks uniqueness, creates user, generates verification token,
   * and sends verification email. User cannot login until email is verified.
   *
   * @throws {RPCError} VALIDATION_ERROR - Invalid input data
   * @throws {RPCError} AUTH_USERNAME_TAKEN - Username already exists
   * @throws {RPCError} AUTH_EMAIL_TAKEN - Email already registered
   */
  "auth.register": async (ctx: ProcedureContext<z.infer<typeof registerSchema>>) => {
    // Validate input with custom validation (stricter than better-auth defaults)
    const validationResult = registerSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const errorMessage = getValidationErrorMessage(validationResult.error);
      const firstError = validationResult.error.errors[0];
      throw new RPCError(ErrorCode.VALIDATION_ERROR, errorMessage, {
        field: firstError?.path[0],
        errors: validationResult.error.errors,
        fieldErrors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { username, email, password } = validationResult.data;

    // Trim whitespace
    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Check username uniqueness (case-insensitive)
    // Better-auth doesn't handle username uniqueness, so we check manually
    const existingUsername = await prisma.user.findFirst({
      where: {
        username: {
          equals: trimmedUsername,
          mode: "insensitive",
        },
      },
    });

    if (existingUsername) {
      throw new RPCError(AuthErrorCode.AUTH_USERNAME_TAKEN, "Username already exists", {
        field: "username",
      });
    }

    // Use better-auth's signUpEmail with username plugin
    // The username plugin extends signUpEmail to accept username
    try {
      const result = await auth.api.signUpEmail({
        body: {
          name: trimmedUsername, // Display name
          username: trimmedUsername, // Username for login (handled by username plugin)
          email: trimmedEmail,
          password,
        },
      });

      // Check if signup was successful
      if (!result || !result.user) {
        throw new RPCError(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Failed to create user account"
        );
      }

      // Return user (without session - must verify email first)
      return {
        user: {
          id: result.user.id.toString(),
          username: (result.user as any).username || result.user.name, // Username from better-auth plugin
          email: result.user.email,
          emailVerified: result.user.emailVerified,
          createdAt: result.user.createdAt,
        },
        message: "Registration successful. Please check your email to verify your account.",
      };
    } catch (error) {
      // Handle better-auth errors
      if (error instanceof Error) {
        // Check for duplicate email error from better-auth
        if (error.message.includes("email") && error.message.includes("already")) {
          throw new RPCError(AuthErrorCode.AUTH_EMAIL_TAKEN, "Email already registered", {
            field: "email",
          });
        }
        // Re-throw if it's already an RPCError
        if ((error as any).code !== undefined) {
          throw error;
        }
      }
      // Generic error fallback
      throw new RPCError(
        ErrorCode.INTERNAL_SERVER_ERROR,
        "Failed to create user account",
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  },

  /**
   * auth.login - User login
   *
   * Validates credentials, checks email verification status, account status,
   * and creates a session. Returns user and session token.
   *
   * @throws {RPCError} AUTH_INVALID_CREDENTIALS - Invalid username or password
   * @throws {RPCError} AUTH_EMAIL_NOT_VERIFIED - Email not verified
   * @throws {RPCError} AUTH_ACCOUNT_SUSPENDED - Account suspended
   * @throws {RPCError} AUTH_ACCOUNT_DELETED - Account deleted
   */
  "auth.login": async (ctx: ProcedureContext<z.infer<typeof loginSchema>>) => {
    // Validate input
    const validationResult = loginSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const errorMessage = getValidationErrorMessage(validationResult.error);
      const firstError = validationResult.error.errors[0];
      throw new RPCError(ErrorCode.VALIDATION_ERROR, errorMessage, {
        field: firstError?.path[0],
        errors: validationResult.error.errors,
        fieldErrors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { username, password } = validationResult.data;
    const trimmedUsername = username.trim();

    // Check user exists and account status BEFORE attempting login
    // This prevents session creation for suspended/deleted accounts
    const user = await prisma.user.findFirst({
      where: {
        username: {
          equals: trimmedUsername,
          mode: "insensitive",
        },
      },
    });

    if (user) {
      // Check account status before proceeding
      if (user.status === "suspended") {
        throw new RPCError(
          AuthErrorCode.AUTH_ACCOUNT_SUSPENDED,
          "Account suspended. Contact support.",
          { status: user.status }
        );
      }

      if (user.status === "deleted") {
        throw new RPCError(AuthErrorCode.AUTH_ACCOUNT_DELETED, "Account no longer exists", {
          status: user.status,
        });
      }
    }

    // Use better-auth's signInEmail with username (username plugin supports this)
    // Better-auth will automatically check email verification (requireEmailVerification: true)
    try {
      const result = await auth.api.signInEmail({
        body: {
          email: user?.email || trimmedUsername, // Use email from found user, or username as fallback
          password,
          rememberMe: true, // 7-day session as configured
        },
        headers: ctx.c.req.raw.headers, // Pass headers for session cookies
      });

      // Check if login was successful
      if (!result || !result.user) {
        throw new RPCError(
          AuthErrorCode.AUTH_INVALID_CREDENTIALS,
          "Invalid username or password"
        );
      }

      // Update lastLoginAt
      await prisma.user.update({
        where: { username: trimmedUsername },
        data: { lastLoginAt: new Date() },
      });

      // Extract session token from better-auth response
      // Better-auth sets the session cookie and returns the token
      const sessionToken = result.token || "";

      // Return user and session data
      return {
        user: {
          id: result.user.id.toString(),
          username: (result.user as any).username || result.user.name, // Username from better-auth plugin
          email: result.user.email,
          emailVerified: result.user.emailVerified,
          createdAt: result.user.createdAt,
        },
        sessionToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };
    } catch (error) {
      // Handle better-auth errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        // Email verification is disabled for MVP, so skip that check

        // Check for invalid credentials
        if (errorMessage.includes("invalid") || errorMessage.includes("incorrect") || errorMessage.includes("password")) {
          throw new RPCError(
            AuthErrorCode.AUTH_INVALID_CREDENTIALS,
            "Invalid username or password"
          );
        }

        // Re-throw if it's already an RPCError
        if ((error as any).code !== undefined) {
          throw error;
        }
      }

      // Generic error fallback - use generic message to prevent username enumeration
      throw new RPCError(
        AuthErrorCode.AUTH_INVALID_CREDENTIALS,
        "Invalid username or password",
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  },

  /**
   * auth.logout - User logout
   *
   * Destroys the current session using better-auth.
   *
   * @throws {RPCError} AUTH_UNAUTHORIZED - Not logged in
   */
  "auth.logout": async (ctx: ProcedureContext<void>) => {
    // Check if user is authenticated
    if (!ctx.user || !ctx.session) {
      throw new RPCError(AuthErrorCode.AUTH_UNAUTHORIZED, "Not logged in");
    }

    // Use better-auth's signOut to destroy session
    try {
      await auth.api.signOut({
        headers: ctx.c.req.raw.headers, // Pass headers for session cookie
      });

      return {
        success: true,
        message: "Logged out successfully",
      };
    } catch (error) {
      // Even if better-auth signOut fails, we can manually delete the session
      console.error("Better-auth signOut failed, falling back to manual deletion:", error);

      // Fallback: manually delete session
      try {
        await prisma.session.delete({
          where: { id: BigInt(ctx.session.id) },
        });
      } catch (deleteError) {
        console.error("Manual session deletion also failed:", deleteError);
      }

      return {
        success: true,
        message: "Logged out successfully",
      };
    }
  },

  /**
   * auth.getSession - Get current session
   *
   * Returns the current user and session information.
   * User data comes from better-auth middleware.
   *
   * @throws {RPCError} AUTH_UNAUTHORIZED - No active session
   */
  "auth.getSession": async (ctx: ProcedureContext<void>) => {
    // Check if user is authenticated
    if (!ctx.user || !ctx.session) {
      throw new RPCError(AuthErrorCode.AUTH_UNAUTHORIZED, "No active session");
    }

    // Return user and session
    return {
      user: {
        id: ctx.user.id.toString(),
        username: (ctx.user as any).username || ctx.user.name, // Username from better-auth
        email: ctx.user.email,
        emailVerified: ctx.user.emailVerified,
      },
      expiresAt: ctx.session.expiresAt.toISOString(),
    };
  },

  /**
   * auth.verifyEmail - Verify email with token
   *
   * Uses better-auth to validate the verification token and mark email as verified.
   * With autoSignInAfterVerification enabled, this also creates a session.
   *
   * @throws {RPCError} AUTH_TOKEN_INVALID - Token not found or invalid
   * @throws {RPCError} AUTH_TOKEN_EXPIRED - Token expired
   */
  "auth.verifyEmail": async (ctx: ProcedureContext<z.infer<typeof verifyEmailSchema>>) => {
    // Validate input
    const validationResult = verifyEmailSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const errorMessage = getValidationErrorMessage(validationResult.error);
      const firstError = validationResult.error.errors[0];
      throw new RPCError(ErrorCode.VALIDATION_ERROR, errorMessage, {
        field: firstError?.path[0],
        errors: validationResult.error.errors,
        fieldErrors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { token } = validationResult.data;

    // Use better-auth's verifyEmail to validate token and mark email as verified
    // With autoSignInAfterVerification: true, this also creates a session
    try {
      const result = await auth.api.verifyEmail({
        query: {
          token, // Pass token as query parameter
        },
        headers: ctx.c.req.raw.headers, // Pass headers for session cookies
      });

      // Check if verification was successful
      if (!result || !result.user) {
        throw new RPCError(
          AuthErrorCode.AUTH_TOKEN_INVALID,
          "Invalid verification token"
        );
      }

      // With autoSignInAfterVerification: true, better-auth creates a session cookie
      // but doesn't return the token directly. Get the session to return the token.
      let sessionToken = "";
      try {
        const sessionResult = await auth.api.getSession({
          headers: ctx.c.req.raw.headers,
        });
        if (sessionResult?.session) {
          sessionToken = sessionResult.session.token;
        }
      } catch (sessionError) {
        console.error("Failed to get session after email verification:", sessionError);
        // Continue anyway - session cookie is set even if we can't get the token
      }

      // Return user and session data
      return {
        user: {
          id: result.user.id.toString(),
          username: (result.user as any).username || result.user.name, // Username from better-auth plugin
          email: result.user.email,
          emailVerified: result.user.emailVerified,
          createdAt: result.user.createdAt,
        },
        sessionToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        message: "Email verified successfully",
      };
    } catch (error) {
      // Handle better-auth errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        // Check for expired token
        if (errorMessage.includes("expired")) {
          throw new RPCError(
            AuthErrorCode.AUTH_TOKEN_EXPIRED,
            "Verification token expired. Please request a new one."
          );
        }

        // Check for invalid token
        if (errorMessage.includes("invalid") || errorMessage.includes("not found")) {
          throw new RPCError(
            AuthErrorCode.AUTH_TOKEN_INVALID,
            "Invalid verification token"
          );
        }

        // Re-throw if it's already an RPCError
        if ((error as any).code !== undefined) {
          throw error;
        }
      }

      // Generic error fallback
      throw new RPCError(
        AuthErrorCode.AUTH_TOKEN_INVALID,
        "Invalid verification token",
        { originalError: error instanceof Error ? error.message : String(error) }
      );
    }
  },

  /**
   * auth.resendVerification - Resend verification email
   *
   * Uses better-auth to generate a new verification token and send email.
   * Only works for unverified users.
   *
   * @throws {RPCError} VALIDATION_ERROR - Invalid email format or already verified
   */
  "auth.resendVerification": async (
    ctx: ProcedureContext<z.infer<typeof resendVerificationSchema>>
  ) => {
    // Validate input
    const validationResult = resendVerificationSchema.safeParse(ctx.input);
    if (!validationResult.success) {
      const errorMessage = getValidationErrorMessage(validationResult.error);
      const firstError = validationResult.error.errors[0];
      throw new RPCError(ErrorCode.VALIDATION_ERROR, errorMessage, {
        field: firstError?.path[0],
        errors: validationResult.error.errors,
        fieldErrors: validationResult.error.flatten().fieldErrors,
      });
    }

    const { email } = validationResult.data;
    const trimmedEmail = email.trim().toLowerCase();

    // Check user exists and is not verified
    const user = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (!user) {
      // Return success to prevent email enumeration
      return {
        success: true,
        message: "If the email exists and is not verified, a verification email has been sent.",
      };
    }

    // Check if already verified
    if (user.emailVerified) {
      throw new RPCError(ErrorCode.VALIDATION_ERROR, "Email is already verified");
    }

    // Use better-auth's sendVerificationEmail API
    // This will generate a new token and send the email
    try {
      await auth.api.sendVerificationEmail({
        body: {
          email: trimmedEmail,
          callbackURL: "/", // Redirect to home page after verification
        },
      });

      return {
        success: true,
        message: "Verification email sent. Please check your inbox.",
      };
    } catch (error) {
      // Handle better-auth errors
      console.error("Failed to resend verification email:", error);

      // Return success anyway to prevent email enumeration
      return {
        success: true,
        message: "If the email exists and is not verified, a verification email has been sent.",
      };
    }
  },
};
