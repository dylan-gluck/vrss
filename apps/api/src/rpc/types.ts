/**
 * RPC Types - Phase 2.3
 *
 * Core type definitions for the VRSS RPC infrastructure.
 * Defines the procedure context that all RPC handlers receive.
 *
 * @see docs/api-architecture.md for RPC patterns
 * @see docs/specs/001-vrss-social-platform/PLAN.md Phase 2.3
 */

import type { Context } from "hono";

/**
 * User type from Better-auth session (as set by auth middleware)
 * Note: This differs from Prisma's User type - Better-auth uses string IDs
 */
export type AuthUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
};

/**
 * Session type from Better-auth session (as set by auth middleware)
 * Note: This differs from Prisma's Session type - Better-auth uses string IDs
 */
export type AuthSession = {
  id: string;
  userId: string;
  expiresAt: Date;
  token: string;
  createdAt: Date;
  updatedAt: Date;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * ProcedureContext
 *
 * Context passed to every RPC procedure handler. Contains Hono context,
 * authentication state, request metadata, and input data.
 *
 * This context is populated by:
 * - authMiddleware: Sets user and session (null if not authenticated)
 * - RPC router: Extracts IP address, user agent, and embeds input
 *
 * @template TInput - Type of the input data (default: any)
 */
export interface ProcedureContext<TInput = any> {
  /**
   * Hono context for accessing request/response
   * Useful for setting cookies, headers, etc.
   */
  c: Context;

  /**
   * Authenticated user (null if not authenticated)
   * Populated by authMiddleware via Better-auth session validation
   */
  user: AuthUser | null;

  /**
   * Active session (null if not authenticated)
   * Populated by authMiddleware via Better-auth session validation
   */
  session: AuthSession | null;

  /**
   * Client IP address
   * Used for rate limiting, logging, and security
   */
  ip: string;

  /**
   * Client user agent
   * Used for session tracking and analytics
   */
  userAgent: string;

  /**
   * Procedure input data
   * Embedded in context for convenient access by handlers
   */
  input: TInput;
}

/**
 * ProcedureHandler
 *
 * Generic type for RPC procedure handlers.
 * Takes a context (with input embedded), returns a promise with output.
 *
 * @template TInput - Input type (validated by procedure)
 * @template TOutput - Output type
 */
export type ProcedureHandler<TInput = any, TOutput = any> = (
  ctx: ProcedureContext<TInput>
) => Promise<TOutput>;
