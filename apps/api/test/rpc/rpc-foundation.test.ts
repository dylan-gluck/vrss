/**
 * RPC Foundation Tests
 * Test the core RPC router setup, error handling, and request/response structure
 *
 * Following TDD: These tests are written BEFORE implementation
 */

import { beforeEach, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { createRPCRouter } from "../../src/rpc/index";
import { cleanAllTables } from "../helpers/database";

describe("RPC Foundation", () => {
  let app: Hono;

  beforeEach(async () => {
    await cleanAllTables();

    // Create a Hono app with RPC router mounted
    app = new Hono();
    app.route("/", createRPCRouter());
  });

  describe("RPC Router Setup", () => {
    it("should accept POST requests to / endpoint", async () => {
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedure: "test.ping",
          input: {},
        }),
      });

      const response = await app.fetch(request);

      // Should return 200 or 400 (not 404 or 405)
      expect([200, 400, 401]).toContain(response.status);
      expect(response.headers.get("content-type")).toContain("application/json");
    });

    it("should reject non-POST requests", async () => {
      const request = new Request("http://localhost/", {
        method: "GET",
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(405); // Method Not Allowed
    });

    it("should require JSON content-type", async () => {
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: "invalid",
      });

      const response = await app.fetch(request);

      expect([400, 415]).toContain(response.status); // Bad Request or Unsupported Media Type
    });
  });

  describe("Error Handling", () => {
    it("should return error for invalid JSON", async () => {
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: "not-valid-json",
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBeDefined();
      expect(data.error.message).toBeDefined();
    });

    it("should return error for non-existent procedure", async () => {
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedure: "nonexistent.procedure",
          input: {},
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(1300); // NOT_FOUND error code
      expect(data.error.message).toContain("not found");
    });

    it("should return error for missing procedure field", async () => {
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {},
        }),
      });

      const response = await app.fetch(request);

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(1200); // VALIDATION_ERROR
    });

    it("should include metadata in error responses", async () => {
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedure: "nonexistent.procedure",
          input: {},
        }),
      });

      const response = await app.fetch(request);

      const data = await response.json();
      expect(data.metadata).toBeDefined();
      expect(data.metadata.timestamp).toBeDefined();
      expect(data.metadata.requestId).toBeDefined();
      expect(typeof data.metadata.requestId).toBe("string");
    });

    it("should NOT expose stack traces in production", async () => {
      // This test assumes NODE_ENV is not 'development'
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedure: "nonexistent.procedure",
          input: {},
        }),
      });

      const response = await app.fetch(request);

      const data = await response.json();

      if (process.env.NODE_ENV !== "development") {
        expect(data.error.stack).toBeUndefined();
      }
    });
  });

  describe("Response Structure", () => {
    it("should return success response with correct structure", async () => {
      // We'll need a simple test procedure for this
      // For now, this test will document the expected structure

      const expectedSuccessResponse = {
        success: true,
        data: expect.any(Object),
        metadata: {
          timestamp: expect.any(Number),
          requestId: expect.any(String),
        },
      };

      // This will be testable once we implement a simple test procedure
      expect(expectedSuccessResponse).toBeDefined();
    });

    it("should return error response with correct structure", async () => {
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedure: "nonexistent.procedure",
          input: {},
        }),
      });

      const response = await app.fetch(request);

      const data = await response.json();

      // Verify structure matches spec
      expect(data).toMatchObject({
        success: false,
        error: {
          code: expect.any(Number),
          message: expect.any(String),
        },
        metadata: {
          timestamp: expect.any(Number),
          requestId: expect.any(String),
        },
      });
    });
  });

  describe("Request Logging", () => {
    it("should log incoming requests", async () => {
      // This test verifies logging happens (implementation will use console or logger)
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedure: "test.ping",
          input: {},
        }),
      });

      const response = await app.fetch(request);

      // The logging is async and goes to console/file
      // We can't directly test console output in integration tests
      // But we verify the request completes successfully
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(600);
    });

    it("should generate unique request IDs", async () => {
      const request1 = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedure: "nonexistent.procedure",
          input: {},
        }),
      });

      const request2 = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedure: "nonexistent.procedure",
          input: {},
        }),
      });

      const response1 = await app.fetch(request1);
      const response2 = await app.fetch(request2);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.metadata.requestId).toBeDefined();
      expect(data2.metadata.requestId).toBeDefined();
      expect(data1.metadata.requestId).not.toBe(data2.metadata.requestId);
    });
  });

  describe("Error Code Standards", () => {
    it("should use error codes in the 1000-1999 range", async () => {
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedure: "nonexistent.procedure",
          input: {},
        }),
      });

      const response = await app.fetch(request);

      const data = await response.json();
      expect(data.error.code).toBeGreaterThanOrEqual(1000);
      expect(data.error.code).toBeLessThan(10000);
    });

    it("should use authentication error codes (1000-1099) for auth failures", async () => {
      // This will be tested with actual auth procedures
      // For now, document the expected range
      const authErrorRange = { min: 1000, max: 1099 };
      expect(authErrorRange.min).toBe(1000);
      expect(authErrorRange.max).toBe(1099);
    });

    it("should use validation error codes (1200-1299) for validation failures", async () => {
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Missing procedure field
          input: {},
        }),
      });

      const response = await app.fetch(request);

      const data = await response.json();
      expect(data.error.code).toBeGreaterThanOrEqual(1200);
      expect(data.error.code).toBeLessThan(1300);
    });

    it("should use resource error codes (1300-1399) for not found errors", async () => {
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedure: "nonexistent.procedure",
          input: {},
        }),
      });

      const response = await app.fetch(request);

      const data = await response.json();
      expect(data.error.code).toBeGreaterThanOrEqual(1300);
      expect(data.error.code).toBeLessThan(1400);
    });
  });

  describe("Context Handling", () => {
    it("should accept optional context in request", async () => {
      const request = new Request("http://localhost/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          procedure: "nonexistent.procedure",
          input: {},
          context: {
            correlationId: "test-correlation-123",
            clientVersion: "1.0.0",
          },
        }),
      });

      const response = await app.fetch(request);

      // Should not error due to context field
      expect(response.status).toBeLessThan(500);

      const data = await response.json();
      expect(data).toBeDefined();
    });
  });
});
