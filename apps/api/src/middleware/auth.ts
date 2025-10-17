/**
 * Authentication Middleware
 *
 * Provides session validation, public/protected procedures, and sliding window
 * session refresh for the VRSS Social Platform API.
 *
 * @see docs/SECURITY_DESIGN.md lines 260-361 for architecture details
 */

import { PrismaClient } from "@prisma/client";
import type { Context, MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";

const prisma = new PrismaClient();

// Lazy load auth to avoid circular dependency
let authInstance: any = null;
function getAuth() {
  if (!authInstance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    authInstance = require("../lib/auth").auth;
  }
  return authInstance;
}

// =============================================================================
// TYPE AUGMENTATION
// =============================================================================

/**
 * Type for Better-auth session response
 */
type SessionResponse = {
  user: {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    image?: string | null;
  };
  session: {
    id: string;
    userId: string;
    expiresAt: Date;
    token: string;
    createdAt: Date;
    updatedAt: Date;
    ipAddress?: string | null;
    userAgent?: string | null;
  };
};

/**
 * Extend Hono's context with user and session data
 */
declare module "hono" {
  interface ContextVariableMap {
    user: SessionResponse["user"] | null;
    session: SessionResponse["session"] | null;
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Extract Bearer token from Authorization header
 *
 * Supports format: "Bearer <token>"
 *
 * @param c - Hono context
 * @returns Session token or null if not found or malformed
 */
function extractBearerToken(c: Context): string | null {
  const authHeader = c.req.header("Authorization");

  if (!authHeader) {
    return null;
  }

  // Check for "Bearer " prefix (note the space)
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }

  // Extract token after "Bearer "
  const token = authHeader.substring(7).trim();

  // Validate token is not empty and doesn't contain spaces
  if (!token || token.includes(" ")) {
    return null;
  }

  return token;
}

/**
 * Update session lastActivityAt timestamp and extend expiry
 *
 * Uses Prisma to update the session's lastActivityAt field to the current time
 * and extends the expiresAt to maintain a sliding window (7 days from now).
 * This maintains the sliding window for session expiry.
 *
 * @param sessionId - Database session ID (bigint)
 */
async function updateSessionActivity(sessionId: string): Promise<void> {
  try {
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    await prisma.session.update({
      where: { id: BigInt(sessionId) },
      data: {
        lastActivityAt: now,
        expiresAt: newExpiresAt,
      },
    });
  } catch (error) {
    // Log error but don't throw - session refresh is not critical
    console.error("Failed to update session activity:", error);
  }
}

// =============================================================================
// MIDDLEWARE
// =============================================================================

/**
 * Auth Middleware
 *
 * Validates session and attaches user/session to context if authenticated.
 * Does NOT require authentication - allows both public and protected procedures.
 *
 * Flow:
 * 1. Extract session token from cookie or Authorization header
 * 2. Validate session via Better-auth API
 * 3. Check sliding window and refresh if needed (>24h since last activity)
 * 4. Attach user and session to context
 * 5. Continue to next middleware/handler regardless of auth status
 *
 * @param c - Hono context
 * @param next - Next middleware/handler
 */
export const authMiddleware: MiddlewareHandler = async (c, next) => {
  // Extract session token from cookie or Authorization header
  const cookieToken = getCookie(c, "vrss.session_token");
  const bearerToken = extractBearerToken(c);
  const sessionToken = cookieToken || bearerToken;

  // If no token, continue without authentication (public procedure)
  if (!sessionToken) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  try {
    // Validate session via Better-auth API
    const auth = getAuth();
    const sessionData = (await auth.api.getSession({
      headers: c.req.raw.headers,
    })) as SessionResponse | null;

    // If session is invalid or expired, continue without authentication
    if (!sessionData || !sessionData.user || !sessionData.session) {
      c.set("user", null);
      c.set("session", null);
      await next();
      return;
    }

    // Attach user and session to context
    c.set("user", sessionData.user);
    c.set("session", sessionData.session);

    // Implement sliding window session refresh
    // Update lastActivityAt if older than 24 hours (86400000ms)
    const session = sessionData.session;
    const lastActivityAt = new Date(session.updatedAt);
    const timeSinceActivity = Date.now() - lastActivityAt.getTime();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000; // 86400000ms

    if (timeSinceActivity >= TWENTY_FOUR_HOURS) {
      // Update session activity asynchronously (don't wait)
      // Note: Better-auth sessions use 'id' field, not 'token'
      // We need to look up the session by token to get the ID
      const dbSession = await prisma.session.findUnique({
        where: { token: sessionToken },
        select: { id: true },
      });

      if (dbSession) {
        // Fire-and-forget update (don't block request)
        updateSessionActivity(dbSession.id.toString()).catch((error) => {
          console.error("Session refresh failed:", error);
        });
      }
    }
  } catch (error) {
    // Log error but don't expose details to client
    console.error("Session validation failed:", error);

    // Continue without authentication on error
    c.set("user", null);
    c.set("session", null);
  }

  await next();
};

/**
 * Require Auth Middleware
 *
 * Enforces authentication requirement. Must be used after authMiddleware.
 *
 * Returns 401 Unauthorized if user is not authenticated.
 *
 * @param c - Hono context
 * @param next - Next middleware/handler
 */
export const requireAuth: MiddlewareHandler = async (c, next) => {
  const user = c.get("user");

  if (!user) {
    return c.json(
      {
        error: "Unauthorized",
        message: "Authentication required",
      },
      401
    );
  }

  await next();
};

/**
 * Require Verified Email Middleware
 *
 * Enforces email verification requirement. Must be used after authMiddleware.
 *
 * Returns 403 Forbidden if user's email is not verified.
 *
 * @param c - Hono context
 * @param next - Next middleware/handler
 */
export const requireVerifiedEmail: MiddlewareHandler = async (c, next) => {
  const user = c.get("user");

  if (!user || !user.emailVerified) {
    return c.json(
      {
        error: "Forbidden",
        message: "Email verification required",
      },
      403
    );
  }

  await next();
};
