/**
 * RPC Client - Phase 4.3
 *
 * Type-safe RPC client for communicating with the VRSS API.
 * Features:
 * - Automatic auth token attachment
 * - Request/response serialization
 * - Error handling with custom error types
 * - Offline queue integration
 * - Request timeout support
 *
 * @see docs/frontend-architecture.md Section: "API Client Layer"
 */

import type {
  RPCRequest,
  RPCResponse,
  RPCRequestContext,
  ErrorCode,
} from '@vrss/api-contracts';
import { useAuthStore } from '../store/authStore';
import { useOfflineStore } from '../store/offlineStore';

/**
 * Base API URL from environment variables
 * Defaults to http://localhost:3000 for development
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

/**
 * Default request timeout (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Custom RPC Error class with error code and details
 */
export class RPCError extends Error {
  code: number;
  details?: unknown;

  constructor(code: number, message: string, details?: unknown) {
    super(message);
    this.name = 'RPCError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RPCError);
    }
  }
}

/**
 * RPC Call Options
 */
export interface RPCCallOptions {
  /**
   * Whether this is a mutation (will be queued if offline)
   * Default: inferred from procedure name (mutations are creates/updates/deletes)
   */
  mutation?: boolean;

  /**
   * Request timeout in milliseconds
   * Default: 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Additional request context
   */
  context?: Partial<RPCRequestContext>;

  /**
   * AbortSignal for request cancellation
   */
  signal?: AbortSignal;
}

/**
 * Infer if a procedure is a mutation based on its name
 */
function isMutationProcedure(procedure: string): boolean {
  const mutationKeywords = ['create', 'update', 'delete', 'remove', 'add', 'set', 'login', 'logout', 'register'];
  const procedureLower = procedure.toLowerCase();
  return mutationKeywords.some((keyword) => procedureLower.includes(keyword));
}

/**
 * Create timeout promise that rejects after specified duration
 */
function createTimeoutPromise(timeout: number): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('Request timeout'));
    }, timeout);
  });
}

/**
 * RPC Client class
 */
class RPCClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * Make an RPC call to the backend
   *
   * @param procedure - The procedure to call (e.g., 'auth.login', 'post.create')
   * @param input - The input data for the procedure
   * @param options - Additional options for the call
   * @returns The response data
   * @throws RPCError if the call fails
   */
  async call<TInput = unknown, TOutput = unknown>(
    procedure: string,
    input: TInput,
    options: RPCCallOptions = {}
  ): Promise<TOutput> {
    const {
      mutation = isMutationProcedure(procedure),
      timeout = DEFAULT_TIMEOUT,
      context = {},
      signal,
    } = options;

    // Get auth token from store
    const token = useAuthStore.getState().token;
    const isOnline = useOfflineStore.getState().isOnline;

    // Build request
    const requestId = crypto.randomUUID();
    const request: RPCRequest<TInput> = {
      procedure,
      input,
      context: {
        requestId,
        ...context,
      },
    };

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Create fetch promise
    const fetchPromise = fetch(`${this.baseUrl}/api/rpc`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
      signal,
    });

    // Race between fetch and timeout
    try {
      const response = await Promise.race([fetchPromise, createTimeoutPromise(timeout)]);

      // Parse response
      const data: RPCResponse<TOutput> = await response.json();

      // Handle error response
      if (!response.ok || !data.success || data.error) {
        const error = data.error || {
          code: 9999,
          message: 'Unknown error',
        };

        throw new RPCError(error.code, error.message, error.details);
      }

      return data.data as TOutput;
    } catch (error) {
      // If this is a network error and we're offline and it's a mutation, queue it
      if (!isOnline && mutation && error instanceof Error && error.message !== 'Request timeout') {
        useOfflineStore.getState().addToQueue({
          type: 'RPC_CALL',
          payload: {
            procedure,
            input,
          },
        });
      }

      // Re-throw the error
      throw error;
    }
  }

  /**
   * Make multiple RPC calls in a batch
   * All calls are executed in parallel
   *
   * @param calls - Array of procedure calls
   * @returns Array of results (in same order as calls)
   */
  async batch<T = unknown>(
    calls: Array<{ procedure: string; input: unknown; options?: RPCCallOptions }>
  ): Promise<T[]> {
    const promises = calls.map((call) =>
      this.call(call.procedure, call.input, call.options)
    );

    return Promise.all(promises);
  }
}

/**
 * Singleton RPC client instance
 */
export const rpcClient = new RPCClient(API_BASE_URL);

/**
 * Type-safe wrapper functions for common procedures
 * These provide better TypeScript inference
 */
export const api = {
  /**
   * Auth procedures
   */
  auth: {
    login: (input: { email: string; password: string }) =>
      rpcClient.call('auth.login', input),

    register: (input: { username: string; email: string; password: string }) =>
      rpcClient.call('auth.register', input),

    logout: () => rpcClient.call('auth.logout', {}),

    getSession: () => rpcClient.call('auth.getSession', {}),
  },

  /**
   * User procedures
   */
  user: {
    getProfile: (input: { username: string }) =>
      rpcClient.call('user.getProfile', input),

    updateProfile: (input: { updates: Record<string, unknown> }) =>
      rpcClient.call('user.updateProfile', input),
  },

  /**
   * Post procedures
   */
  post: {
    create: (input: { content: string; media?: unknown[] }) =>
      rpcClient.call('post.create', input, { mutation: true }),

    getById: (input: { postId: string }) => rpcClient.call('post.getById', input),

    update: (input: { postId: string; updates: Record<string, unknown> }) =>
      rpcClient.call('post.update', input, { mutation: true }),

    delete: (input: { postId: string }) =>
      rpcClient.call('post.delete', input, { mutation: true }),

    like: (input: { postId: string }) =>
      rpcClient.call('post.like', input, { mutation: true }),

    unlike: (input: { postId: string }) =>
      rpcClient.call('post.unlike', input, { mutation: true }),
  },

  /**
   * Feed procedures
   */
  feed: {
    get: (input: { cursor?: number; limit?: number; algorithmId?: string }) =>
      rpcClient.call('feed.get', input),
  },

  /**
   * Social procedures
   */
  social: {
    follow: (input: { userId: string }) =>
      rpcClient.call('social.follow', input, { mutation: true }),

    unfollow: (input: { userId: string }) =>
      rpcClient.call('social.unfollow', input, { mutation: true }),

    getFollowers: (input: { userId: string; cursor?: number; limit?: number }) =>
      rpcClient.call('social.getFollowers', input),

    getFollowing: (input: { userId: string; cursor?: number; limit?: number }) =>
      rpcClient.call('social.getFollowing', input),
  },
};
