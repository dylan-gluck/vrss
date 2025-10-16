/**
 * RPC Router - Phase 3.1
 *
 * Central RPC router that handles all procedure calls for the VRSS Social Platform.
 * Implements standardized RPC pattern with proper error codes, metadata, and validation.
 *
 * Flow:
 * 1. Validate HTTP method (POST only)
 * 2. Validate Content-Type (application/json only)
 * 3. Parse and validate RPC request format: { procedure: string, input: any, context?: object }
 * 4. Apply auth middleware (sets user/session in context)
 * 5. Check if procedure is in PUBLIC_PROCEDURES set
 * 6. Route to appropriate procedure handler
 * 7. Return standardized response with metadata
 *
 * @see docs/api-architecture.md for RPC patterns
 * @see docs/specs/001-vrss-social-platform/SDD.md for error codes
 */

import { Hono } from "hono";
import { ErrorCode } from "@vrss/api-contracts";
import { authMiddleware } from "../middleware/auth";
import { ProcedureContext } from "./types";
import { authRouter } from "./routers/auth";
import { userRouter } from "./routers/user";
import { postRouter } from "./routers/post";

// =============================================================================
// PUBLIC PROCEDURES
// =============================================================================

/**
 * PUBLIC_PROCEDURES - Set of procedures accessible without authentication
 *
 * These procedures can be called by unauthenticated users. All other
 * procedures require authentication.
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
  ...userRouter,
  ...postRouter,
  // Additional routers will be added here in future phases:
  // ...discoveryRouter,
  // ...socialRouter,
  // ...feedRouter,
  // etc.
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create standardized RPC error response
 */
function createErrorResponse(
  code: number,
  message: string,
  details?: any,
  requestId?: string
) {
  const response: any = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === "development" &&
        details?.stack && { stack: details.stack }),
    },
    metadata: {
      timestamp: Date.now(),
      requestId: requestId || generateRequestId(),
    },
  };

  return response;
}

/**
 * Create standardized RPC success response
 */
function createSuccessResponse(data: any, requestId: string) {
  return {
    success: true,
    data,
    metadata: {
      timestamp: Date.now(),
      requestId,
    },
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
 * - Error handling with proper error codes
 * - Request logging with unique request IDs
 */
export function createRPCRouter(): Hono {
  const rpc = new Hono();

  // Apply auth middleware to all RPC requests
  // This populates c.get("user") and c.get("session") for all requests
  rpc.use("*", authMiddleware);

  // Reject non-POST requests
  rpc.on(["GET", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"], "/", (c) => {
    return c.json(
      { error: "Method Not Allowed", message: "Only POST requests are allowed" },
      405
    );
  });

  // RPC endpoint - all procedures called via POST to this endpoint
  rpc.post("/", async (c) => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    try {
      // Validate Content-Type
      const contentType = c.req.header("Content-Type");
      if (!contentType || !contentType.includes("application/json")) {
        return c.json(
          createErrorResponse(
            ErrorCode.VALIDATION_ERROR,
            "Content-Type must be application/json",
            undefined,
            requestId
          ),
          415
        );
      }

      // Parse request body
      let body: any;
      try {
        body = await c.req.json();
      } catch (error) {
        return c.json(
          createErrorResponse(
            ErrorCode.VALIDATION_ERROR,
            "Invalid JSON in request body",
            undefined,
            requestId
          ),
          400
        );
      }

      // Validate RPC request format
      if (!body || typeof body !== "object") {
        return c.json(
          createErrorResponse(
            ErrorCode.VALIDATION_ERROR,
            "Request must be a JSON object",
            undefined,
            requestId
          ),
          400
        );
      }

      if (typeof body.procedure !== "string" || !body.procedure) {
        return c.json(
          createErrorResponse(
            ErrorCode.VALIDATION_ERROR,
            "Missing or invalid 'procedure' field",
            undefined,
            requestId
          ),
          400
        );
      }

      const { procedure, input, context } = body;

      // Log procedure call
      console.log(`[RPC] ${requestId} ${procedure}`, {
        hasInput: input !== undefined,
        authenticated: c.get("user") !== null,
        correlationId: context?.correlationId,
      });

      // Check if procedure exists in registry
      const handler = PROCEDURE_REGISTRY[procedure];
      if (!handler) {
        const duration = Date.now() - startTime;
        console.log(
          `[RPC] ${requestId} ${procedure} - NOT_FOUND (${duration}ms)`
        );

        return c.json(
          createErrorResponse(
            ErrorCode.NOT_FOUND,
            `Procedure '${procedure}' not found`,
            undefined,
            requestId
          ),
          400
        );
      }

      // Check if procedure requires authentication
      const isPublicProcedure = PUBLIC_PROCEDURES.has(procedure);
      const user = c.get("user");

      if (!isPublicProcedure && !user) {
        const duration = Date.now() - startTime;
        console.log(
          `[RPC] ${requestId} ${procedure} - UNAUTHORIZED (${duration}ms)`
        );

        return c.json(
          createErrorResponse(
            ErrorCode.UNAUTHORIZED,
            "Authentication required",
            undefined,
            requestId
          ),
          401
        );
      }

      // Build procedure context
      const ctx: any = {
        c,
        user: c.get("user"),
        session: c.get("session"),
        ip: getClientIP(c),
        userAgent: getUserAgent(c),
        input: input || {},
        requestId,
        correlationId: context?.correlationId,
      };

      // Execute procedure handler
      const result = await handler(ctx);

      // Log success
      const duration = Date.now() - startTime;
      console.log(`[RPC] ${requestId} ${procedure} - SUCCESS (${duration}ms)`);

      // Return success response
      return c.json(createSuccessResponse(result, requestId), 200);
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Log error for debugging
      console.error(`[RPC] ${requestId} ERROR (${duration}ms)`, error);

      // Check if this is an RPC error with a code (from procedure handler)
      if (error.code && typeof error.code === "number") {
        // Map error codes to HTTP status codes
        let httpStatus = 400;
        if (error.code >= 1900) {
          // Server errors
          httpStatus = 500;
        } else if (error.code >= 1600) {
          // Storage errors
          httpStatus = 400;
        } else if (error.code >= 1500) {
          // Rate limiting
          httpStatus = 429;
        } else if (error.code >= 1400) {
          // Conflicts
          httpStatus = 409;
        } else if (error.code >= 1300) {
          // Not found
          httpStatus = 400;
        } else if (error.code >= 1200) {
          // Validation errors
          httpStatus = 400;
        } else if (error.code >= 1100) {
          // Authorization errors
          httpStatus = 403;
        } else if (error.code >= 1000) {
          // Authentication errors
          httpStatus = 401;
        }

        return c.json(
          createErrorResponse(
            error.code,
            error.message || "An error occurred",
            error.details,
            requestId
          ),
          httpStatus as any
        );
      }

      // Generic internal error
      return c.json(
        createErrorResponse(
          ErrorCode.INTERNAL_SERVER_ERROR,
          "Internal server error",
          process.env.NODE_ENV === "development"
            ? { message: error.message, stack: error.stack }
            : undefined,
          requestId
        ),
        500
      );
    }
  });

  return rpc;
}
