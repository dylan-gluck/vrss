/**
 * RPC Router - Phase 2.3
 *
 * Central RPC router that handles all procedure calls for the VRSS Social Platform.
 * Implements public/protected procedure routing with auth middleware integration.
 *
 * Flow:
 * 1. Apply authMiddleware to all RPC requests (sets user/session in context)
 * 2. Parse and validate RPC request format: { procedure: string, input?: any }
 * 3. Extract router and procedure name (e.g., "auth.login" → router="auth", proc="login")
 * 4. Check if procedure is in PUBLIC_PROCEDURES set
 * 5. Apply requireAuth middleware if procedure is protected
 * 6. Route to appropriate procedure handler
 * 7. Return standardized response: { data: any } or { error: { code: number, message: string } }
 *
 * @see docs/api-architecture.md for RPC patterns
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 2.3
 */

import { Hono } from "hono";
import { authMiddleware, requireAuth } from "../middleware/auth";
import { ProcedureContext } from "./types";
import { authRouter } from "./routers/auth";

// =============================================================================
// PUBLIC PROCEDURES
// =============================================================================

/**
 * PUBLIC_PROCEDURES - Set of procedures accessible without authentication
 *
 * These procedures can be called by unauthenticated users. All other
 * procedures require authentication (enforced by requireAuth middleware).
 *
 * Public procedures:
 * - auth.* (all auth procedures - register, login, verify, etc.)
 * - user.getProfile (view public user profiles)
 * - post.getById (view individual posts)
 * - discovery.* (all discovery procedures - search, explore)
 */
export const PUBLIC_PROCEDURES = new Set([
  // Auth procedures (all public)
  "auth.register",
  "auth.login",
  "auth.verifyEmail",
  "auth.resendVerification",
  "auth.getSession",
  "auth.logout",

  // Public user procedures
  "user.getProfile",

  // Public post procedures
  "post.getById",

  // Discovery procedures (all public)
  "discovery.searchUsers",
  "discovery.searchPosts",
  "discovery.getDiscoverFeed",
]);

// =============================================================================
// PROCEDURE REGISTRY
// =============================================================================

/**
 * Procedure registry mapping procedure names to handlers
 * Organized by router (e.g., auth.*, user.*, post.*, etc.)
 */
const PROCEDURE_REGISTRY: Record<string, any> = {
  ...authRouter,
  // Additional routers will be added here in future phases:
  // ...userRouter,
  // ...postRouter,
  // ...discoveryRouter,
  // etc.
};

// =============================================================================
// ERROR CODES
// =============================================================================

enum RPCErrorCode {
  // RPC framework errors (0-99)
  RPC_PARSE_ERROR = 1,
  RPC_INVALID_REQUEST = 2,
  RPC_PROCEDURE_NOT_FOUND = 3,
  RPC_INTERNAL_ERROR = 4,
  RPC_UNAUTHORIZED = 5,
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Create standardized RPC error response
 */
function createErrorResponse(code: number, message: string, details?: any) {
  return {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * Create standardized RPC success response
 */
function createSuccessResponse(data: any) {
  return {
    data,
  };
}

/**
 * Extract client IP address from request
 * Checks X-Forwarded-For header first (for proxies), falls back to connection IP
 */
function getClientIP(c: any): string {
  const forwardedFor = c.req.header("X-Forwarded-For");
  if (forwardedFor) {
    // X-Forwarded-For can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  // Fallback to direct connection IP (Hono/Bun specific)
  return c.req.header("X-Real-IP") || "unknown";
}

/**
 * Extract user agent from request
 */
function getUserAgent(c: any): string {
  return c.req.header("User-Agent") || "unknown";
}

// =============================================================================
// RPC ROUTER
// =============================================================================

/**
 * Create RPC router
 *
 * Returns a Hono app configured with:
 * - Auth middleware (all requests)
 * - RPC request parsing and validation
 * - Procedure routing
 * - Public/protected procedure handling
 * - Error handling
 * - Request logging
 */
export function createRPCRouter(): Hono {
  const rpc = new Hono();

  // Apply auth middleware to all RPC requests
  // This populates c.get("user") and c.get("session") for all requests
  rpc.use("*", authMiddleware);

  // RPC endpoint - all procedures called via POST to this endpoint
  rpc.post("/", async (c) => {
    try {
      // Parse request body
      let body: any;
      try {
        body = await c.req.json();
      } catch (error) {
        return c.json(
          createErrorResponse(
            RPCErrorCode.RPC_PARSE_ERROR,
            "Invalid JSON in request body"
          ),
          400
        );
      }

      // Validate RPC request format
      if (!body || typeof body !== "object") {
        return c.json(
          createErrorResponse(
            RPCErrorCode.RPC_INVALID_REQUEST,
            "Request must be a JSON object"
          ),
          400
        );
      }

      if (typeof body.procedure !== "string" || !body.procedure) {
        return c.json(
          createErrorResponse(
            RPCErrorCode.RPC_INVALID_REQUEST,
            "Missing or invalid 'procedure' field"
          ),
          400
        );
      }

      const { procedure, input } = body;

      // Log procedure call
      console.log(`[RPC] ${procedure}`, {
        hasInput: input !== undefined,
        authenticated: c.get("user") !== null,
      });

      // Check if procedure exists in registry
      const handler = PROCEDURE_REGISTRY[procedure];
      if (!handler) {
        return c.json(
          createErrorResponse(
            RPCErrorCode.RPC_PROCEDURE_NOT_FOUND,
            `Procedure '${procedure}' not found`
          ),
          404
        );
      }

      // Check if procedure requires authentication
      const isPublicProcedure = PUBLIC_PROCEDURES.has(procedure);
      const user = c.get("user");

      if (!isPublicProcedure && !user) {
        return c.json(
          createErrorResponse(
            RPCErrorCode.RPC_UNAUTHORIZED,
            "Authentication required"
          ),
          401
        );
      }

      // Build procedure context
      // Note: The context structure matches what procedure handlers expect
      // The handlers access input via ctx.input, user via ctx.user, etc.
      const ctx: any = {
        c,
        user: c.get("user"),
        session: c.get("session"),
        ip: getClientIP(c),
        userAgent: getUserAgent(c),
        input, // Embed input in context for backward compatibility
      };

      // Execute procedure handler
      const result = await handler(ctx);

      // Return success response
      return c.json(createSuccessResponse(result), 200);
    } catch (error: any) {
      // Log error for debugging
      console.error("[RPC Error]", error);

      // Check if this is an RPC error with a code (from procedure handler)
      if (error.code && typeof error.code === "number") {
        return c.json(
          createErrorResponse(
            error.code,
            error.message || "An error occurred",
            error.details
          ),
          // Map error codes to HTTP status codes
          // 1000-1099: Auth errors → 400/401
          // 2000-2099: Validation errors → 400
          // 3000-3099: Resource errors → 404
          // 4000-4099: Permission errors → 403
          // 5000+: Server errors → 500
          error.code >= 5000
            ? 500
            : error.code >= 4000
            ? 403
            : error.code >= 3000
            ? 404
            : error.code >= 1030
            ? 401
            : 400
        );
      }

      // Generic internal error
      return c.json(
        createErrorResponse(
          RPCErrorCode.RPC_INTERNAL_ERROR,
          "Internal server error"
        ),
        500
      );
    }
  });

  return rpc;
}
