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
  email: emailSchema,
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

/**
 * Hash password using Bun's built-in bcrypt
 */
async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 12, // Production strength
  });
}

/**
 * Verify password against hash
 */
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await Bun.password.verify(password, hash);
}

/**
 * Generate a random verification token
 */
function generateVerificationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Generate a random session token
 */
function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString("base64url");
}

/**
 * Send verification email using the email service
 * Requires username for email personalization
 */
async function sendVerificationEmail(
  email: string,
  username: string,
  token: string
): Promise<void> {
  const { sendVerificationEmail: sendEmail } = await import("../../lib/email");
  await sendEmail(email, username, token);
}

// =============================================================================
// PROCEDURE CONTEXT TYPE
// =============================================================================

interface ProcedureContext<TInput = unknown> {
  input: TInput;
  user?: {
    id: bigint;
    username: string;
    email: string;
    emailVerified: boolean;
  };
  session?: {
    id: bigint;
    token: string;
    expiresAt: Date;
  };
}

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
    // Validate input
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

    // Check email uniqueness
    const existingEmail = await prisma.user.findUnique({
      where: { email: trimmedEmail },
    });

    if (existingEmail) {
      throw new RPCError(AuthErrorCode.AUTH_EMAIL_TAKEN, "Email already registered", {
        field: "email",
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        username: trimmedUsername,
        email: trimmedEmail,
        passwordHash,
        emailVerified: false,
        status: "active",
      },
    });

    // Generate verification token (24-hour expiry)
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: trimmedEmail,
        token: verificationToken,
        expires: tokenExpiry,
      },
    });

    // Send verification email
    await sendVerificationEmail(trimmedEmail, trimmedUsername, verificationToken);

    // Return user (without session - must verify email first)
    return {
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
      },
      message: "Registration successful. Please check your email to verify your account.",
    };
  },

  /**
   * auth.login - User login
   *
   * Validates credentials, checks email verification status, account status,
   * and creates a session. Returns user and session token.
   *
   * @throws {RPCError} AUTH_INVALID_CREDENTIALS - Invalid email or password
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

    const { email, password } = validationResult.data;
    const trimmedEmail = email.trim().toLowerCase();

    // Find user (case-insensitive email search)
    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: trimmedEmail,
          mode: "insensitive",
        },
      },
    });

    // User not found - use generic error to prevent email enumeration
    if (!user) {
      throw new RPCError(AuthErrorCode.AUTH_INVALID_CREDENTIALS, "Invalid email or password");
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new RPCError(AuthErrorCode.AUTH_INVALID_CREDENTIALS, "Invalid email or password");
    }

    // Check account status
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

    // Check email verification
    if (!user.emailVerified) {
      throw new RPCError(
        AuthErrorCode.AUTH_EMAIL_NOT_VERIFIED,
        "Email not verified. Please check your inbox.",
        { requiresVerification: true }
      );
    }

    // Create session (7-day expiry)
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt,
        userAgent: "User Agent", // TODO: Get from request headers
        ipAddress: "0.0.0.0", // TODO: Get from request
        lastActivityAt: new Date(),
      },
    });

    // Update lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Return user and session token
    return {
      user: {
        id: user.id.toString(),
        username: user.username,
        email: user.email,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
      },
      sessionToken: session.token,
      expiresAt: session.expiresAt.toISOString(),
    };
  },

  /**
   * auth.logout - User logout
   *
   * Destroys the current session.
   *
   * @throws {RPCError} AUTH_UNAUTHORIZED - Not logged in
   */
  "auth.logout": async (ctx: ProcedureContext<void>) => {
    // Check if user is authenticated
    if (!ctx.user || !ctx.session) {
      throw new RPCError(AuthErrorCode.AUTH_UNAUTHORIZED, "Not logged in");
    }

    // Delete session
    await prisma.session.delete({
      where: { id: ctx.session.id },
    });

    return {
      success: true,
      message: "Logged out successfully",
    };
  },

  /**
   * auth.getSession - Get current session
   *
   * Returns the current user and session information.
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
        username: ctx.user.username,
        email: ctx.user.email,
        emailVerified: ctx.user.emailVerified,
      },
      expiresAt: ctx.session.expiresAt.toISOString(),
    };
  },

  /**
   * auth.verifyEmail - Verify email with token
   *
   * Validates the verification token, marks email as verified,
   * creates a session, and returns user with session token.
   *
   * @throws {RPCError} AUTH_TOKEN_INVALID - Token not found
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

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      throw new RPCError(AuthErrorCode.AUTH_TOKEN_INVALID, "Invalid verification token");
    }

    // Check if token is expired
    if (verificationToken.expires.getTime() < Date.now()) {
      // Delete expired token
      await prisma.verificationToken.delete({
        where: { token },
      });

      throw new RPCError(
        AuthErrorCode.AUTH_TOKEN_EXPIRED,
        "Verification token expired. Please request a new one."
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
    });

    if (!user) {
      throw new RPCError(AuthErrorCode.AUTH_TOKEN_INVALID, "Invalid verification token");
    }

    // Mark email as verified
    const verifiedUser = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    // Delete verification token (one-time use)
    await prisma.verificationToken.delete({
      where: { token },
    });

    // Create session (7-day expiry)
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await prisma.session.create({
      data: {
        userId: verifiedUser.id,
        token: sessionToken,
        expiresAt,
        userAgent: "User Agent", // TODO: Get from request headers
        ipAddress: "0.0.0.0", // TODO: Get from request
        lastActivityAt: new Date(),
      },
    });

    // Return user and session token
    return {
      user: {
        id: verifiedUser.id.toString(),
        username: verifiedUser.username,
        email: verifiedUser.email,
        emailVerified: verifiedUser.emailVerified,
        createdAt: verifiedUser.createdAt.toISOString(),
      },
      sessionToken: session.token,
      expiresAt: session.expiresAt.toISOString(),
      message: "Email verified successfully",
    };
  },

  /**
   * auth.resendVerification - Resend verification email
   *
   * Generates a new verification token and sends a new verification email.
   * Only works for unverified users.
   *
   * @throws {RPCError} VALIDATION_ERROR - Invalid email format
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

    // Find user
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

    // Delete any existing verification tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: trimmedEmail },
    });

    // Generate new verification token (24-hour expiry)
    const verificationToken = generateVerificationToken();
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await prisma.verificationToken.create({
      data: {
        identifier: trimmedEmail,
        token: verificationToken,
        expires: tokenExpiry,
      },
    });

    // Send verification email
    await sendVerificationEmail(trimmedEmail, user.username, verificationToken);

    return {
      success: true,
      message: "Verification email sent. Please check your inbox.",
    };
  },
};
