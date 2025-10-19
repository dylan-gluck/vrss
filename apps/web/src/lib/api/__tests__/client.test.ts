/**
 * RPC Client Tests - Phase 4.3
 *
 * Tests for the RPC client that handles all API communication.
 * Following TDD principles: write tests first, then implement.
 *
 * Test coverage:
 * - Basic RPC request/response
 * - Auth token attachment
 * - Error handling (401, 403, 500, network errors)
 * - Offline queue integration
 */

import { ErrorCode } from "@vrss/api-contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "../../store/authStore";
import { useOfflineStore } from "../../store/offlineStore";
import { rpcClient } from "../client";
import { server } from "../../../../test/mocks/server";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe("RPC Client", () => {
  beforeEach(() => {
    // Disable MSW for unit tests - we want to mock fetch directly
    server.close();

    // Reset mocks
    mockFetch.mockClear();

    // Reset stores
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    useOfflineStore.setState({
      isOnline: true,
      queue: [],
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();

    // Re-enable MSW for other tests
    server.listen();
  });

  describe("Basic Request/Response", () => {
    it("should make a successful RPC call", async () => {
      const mockResponse = {
        success: true,
        data: { id: "123", name: "Test User" },
        metadata: {
          timestamp: Date.now(),
          requestId: "req_123",
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await rpcClient.call("user.getProfile", { username: "testuser" });

      expect(result).toEqual(mockResponse.data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/rpc"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should send correct request format", async () => {
      const mockResponse = {
        success: true,
        data: {},
        metadata: { timestamp: Date.now(), requestId: "req_123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await rpcClient.call("auth.login", { email: "test@test.com", password: "password123" });

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody).toMatchObject({
        procedure: "auth.login",
        input: {
          email: "test@test.com",
          password: "password123",
        },
      });
    });

    it("should include context in the request", async () => {
      const mockResponse = {
        success: true,
        data: {},
        metadata: { timestamp: Date.now(), requestId: "req_123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await rpcClient.call(
        "user.getProfile",
        { username: "test" },
        { context: { correlationId: "test-123" } }
      );

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.context).toBeDefined();
      expect(requestBody.context.correlationId).toBe("test-123");
    });
  });

  describe("Authentication Token Attachment", () => {
    it("should attach Bearer token when user is authenticated", async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: { id: "1", username: "test", email: "test@test.com", avatarUrl: null },
        token: "test-token-123",
        isAuthenticated: true,
        isLoading: false,
      });

      const mockResponse = {
        success: true,
        data: {},
        metadata: { timestamp: Date.now(), requestId: "req_123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await rpcClient.call("post.create", { content: "Test post" });

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers.Authorization).toBe("Bearer test-token-123");
    });

    it("should not include Authorization header when not authenticated", async () => {
      const mockResponse = {
        success: true,
        data: {},
        metadata: { timestamp: Date.now(), requestId: "req_123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await rpcClient.call("auth.login", { email: "test@test.com", password: "pass" });

      const fetchCall = mockFetch.mock.calls[0];
      const headers = fetchCall[1].headers;

      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle 401 Unauthorized errors", async () => {
      const errorResponse = {
        success: false,
        error: {
          code: ErrorCode.UNAUTHORIZED,
          message: "Authentication required",
        },
        metadata: { timestamp: Date.now(), requestId: "req_123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => errorResponse,
      });

      await expect(rpcClient.call("post.create", { content: "Test" })).rejects.toThrow(
        "Authentication required"
      );
    });

    it("should handle 403 Forbidden errors", async () => {
      const errorResponse = {
        success: false,
        error: {
          code: ErrorCode.FORBIDDEN,
          message: "Access denied",
        },
        metadata: { timestamp: Date.now(), requestId: "req_123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => errorResponse,
      });

      await expect(rpcClient.call("user.delete", { userId: "123" })).rejects.toThrow(
        "Access denied"
      );
    });

    it("should handle 500 Internal Server errors", async () => {
      const errorResponse = {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: "Internal server error",
        },
        metadata: { timestamp: Date.now(), requestId: "req_123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => errorResponse,
      });

      await expect(rpcClient.call("post.create", { content: "Test" })).rejects.toThrow(
        "Internal server error"
      );
    });

    it("should handle validation errors with details", async () => {
      const errorResponse = {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Validation failed",
          details: {
            username: "Username must be at least 3 characters",
            email: "Invalid email format",
          },
        },
        metadata: { timestamp: Date.now(), requestId: "req_123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      });

      try {
        await rpcClient.call("auth.register", {
          username: "ab",
          email: "invalid",
          password: "pass",
        });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.message).toBe("Validation failed");
        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(error.details).toBeDefined();
      }
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(rpcClient.call("post.create", { content: "Test" })).rejects.toThrow(
        "Network error"
      );
    });

    it("should throw custom error class with error details", async () => {
      const errorResponse = {
        success: false,
        error: {
          code: ErrorCode.NOT_FOUND,
          message: "User not found",
          details: { userId: "123" },
        },
        metadata: { timestamp: Date.now(), requestId: "req_123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => errorResponse,
      });

      try {
        await rpcClient.call("user.getProfile", { username: "nonexistent" });
        expect.fail("Should have thrown error");
      } catch (error: any) {
        expect(error.code).toBe(ErrorCode.NOT_FOUND);
        expect(error.message).toBe("User not found");
        expect(error.details).toEqual({ userId: "123" });
      }
    });
  });

  describe("Offline Queue Integration", () => {
    it("should add failed mutations to offline queue when offline", async () => {
      // Set offline
      useOfflineStore.setState({ isOnline: false, queue: [] });

      const addToQueueSpy = vi.spyOn(useOfflineStore.getState(), "addToQueue");

      // Mock network failure
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      try {
        await rpcClient.call("post.create", { content: "Test post" }, { mutation: true });
      } catch (_error) {
        // Error is expected
      }

      expect(addToQueueSpy).toHaveBeenCalledWith({
        type: "RPC_CALL",
        payload: {
          procedure: "post.create",
          input: { content: "Test post" },
        },
      });
    });

    it("should not queue queries when offline, only mutations", async () => {
      useOfflineStore.setState({ isOnline: false, queue: [] });

      const addToQueueSpy = vi.spyOn(useOfflineStore.getState(), "addToQueue");

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      try {
        await rpcClient.call("feed.get", { limit: 20 }, { mutation: false });
      } catch (_error) {
        // Error is expected
      }

      expect(addToQueueSpy).not.toHaveBeenCalled();
    });

    it("should not queue when online even if request fails", async () => {
      useOfflineStore.setState({ isOnline: true, queue: [] });

      const addToQueueSpy = vi.spyOn(useOfflineStore.getState(), "addToQueue");

      const errorResponse = {
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: "Validation failed",
        },
        metadata: { timestamp: Date.now(), requestId: "req_123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => errorResponse,
      });

      try {
        await rpcClient.call("post.create", { content: "" }, { mutation: true });
      } catch (_error) {
        // Error is expected
      }

      expect(addToQueueSpy).not.toHaveBeenCalled();
    });
  });

  describe("Request Context", () => {
    it("should allow custom context in requests", async () => {
      const mockResponse = {
        success: true,
        data: {},
        metadata: { timestamp: Date.now(), requestId: "req_123" },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      await rpcClient.call(
        "post.create",
        { content: "Test" },
        { context: { correlationId: "custom-correlation-id" } }
      );

      const fetchCall = mockFetch.mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1].body);

      expect(requestBody.context.correlationId).toBe("custom-correlation-id");
    });
  });

  describe("Timeout Handling", () => {
    it("should timeout long-running requests", async () => {
      // Mock a slow fetch that takes longer than timeout
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            // Never resolve within timeout period
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({ success: true, data: {} }),
                }),
              10000 // 10 second delay
            );
          })
      );

      // Call with very short timeout
      const promise = rpcClient.call("post.create", { content: "Test" }, { timeout: 100 });

      // Wait for timeout to trigger
      await expect(promise).rejects.toThrow("Request timeout");
    });
  });
});
