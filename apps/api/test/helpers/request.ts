/**
 * API Request Test Helpers
 *
 * Utilities for making HTTP requests to the API with authentication,
 * JSON handling, and response validation.
 */

import type { Hono } from "hono";
import type { TestAuthContext } from "./auth";

/**
 * Response wrapper with convenience methods
 */
export class TestResponse {
  constructor(
    public response: Response,
    public status: number,
    public headers: Headers,
    public body: any
  ) {}

  /**
   * Get JSON body (already parsed)
   */
  json(): any {
    return this.body;
  }

  /**
   * Check if response was successful (2xx)
   */
  isOk(): boolean {
    return this.status >= 200 && this.status < 300;
  }

  /**
   * Check if response has specific status
   */
  hasStatus(status: number): boolean {
    return this.status === status;
  }

  /**
   * Get a header value
   */
  getHeader(name: string): string | null {
    return this.headers.get(name);
  }

  /**
   * Assert response is successful
   */
  expectOk(): this {
    if (!this.isOk()) {
      throw new Error(
        `Expected successful response, got ${this.status}: ${JSON.stringify(this.body)}`
      );
    }
    return this;
  }

  /**
   * Assert response has specific status
   */
  expectStatus(status: number): this {
    if (this.status !== status) {
      throw new Error(
        `Expected status ${status}, got ${this.status}: ${JSON.stringify(this.body)}`
      );
    }
    return this;
  }

  /**
   * Assert response body matches partial object
   */
  expectBodyContains(partial: Record<string, any>): this {
    for (const [key, value] of Object.entries(partial)) {
      if (this.body[key] !== value) {
        throw new Error(`Expected body.${key} to be ${value}, got ${this.body[key]}`);
      }
    }
    return this;
  }
}

/**
 * Request builder for API testing
 */
export class TestRequest {
  private headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  private queryParams: Record<string, string> = {};

  constructor(
    private app: Hono,
    private method: string,
    private path: string
  ) {}

  /**
   * Add authentication header
   */
  auth(token: string): this {
    this.headers.Authorization = `Bearer ${token}`;
    return this;
  }

  /**
   * Add authentication from test context
   */
  withAuth(context: TestAuthContext): this {
    return this.auth(context.token);
  }

  /**
   * Set a header
   */
  header(name: string, value: string): this {
    this.headers[name] = value;
    return this;
  }

  /**
   * Set multiple headers
   */
  setHeaders(headers: Record<string, string>): this {
    Object.assign(this.headers, headers);
    return this;
  }

  /**
   * Add query parameter
   */
  query(key: string, value: string): this {
    this.queryParams[key] = value;
    return this;
  }

  /**
   * Add multiple query parameters
   */
  setQueryParams(params: Record<string, string>): this {
    Object.assign(this.queryParams, params);
    return this;
  }

  /**
   * Build the full URL with query parameters
   */
  private buildUrl(): string {
    const url = new URL(this.path, "http://localhost");
    for (const [key, value] of Object.entries(this.queryParams)) {
      url.searchParams.append(key, value);
    }
    return url.pathname + url.search;
  }

  /**
   * Send the request with optional JSON body
   */
  async send(body?: any): Promise<TestResponse> {
    const url = this.buildUrl();

    const request = new Request(url, {
      method: this.method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const response = await this.app.fetch(request);
    const status = response.status;
    const headers = response.headers;

    // Parse body as JSON if possible
    let parsedBody: any;
    const contentType = headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      parsedBody = await response.json();
    } else {
      parsedBody = await response.text();
    }

    return new TestResponse(response, status, headers, parsedBody);
  }
}

/**
 * API test client
 * Provides a fluent interface for making test requests
 */
export class ApiTestClient {
  constructor(private app: Hono) {}

  /**
   * Make a GET request
   */
  get(path: string): TestRequest {
    return new TestRequest(this.app, "GET", path);
  }

  /**
   * Make a POST request
   */
  post(path: string): TestRequest {
    return new TestRequest(this.app, "POST", path);
  }

  /**
   * Make a PUT request
   */
  put(path: string): TestRequest {
    return new TestRequest(this.app, "PUT", path);
  }

  /**
   * Make a PATCH request
   */
  patch(path: string): TestRequest {
    return new TestRequest(this.app, "PATCH", path);
  }

  /**
   * Make a DELETE request
   */
  delete(path: string): TestRequest {
    return new TestRequest(this.app, "DELETE", path);
  }

  /**
   * Make a request with authentication
   */
  authenticated(context: TestAuthContext) {
    return {
      get: (path: string) => this.get(path).withAuth(context),
      post: (path: string) => this.post(path).withAuth(context),
      put: (path: string) => this.put(path).withAuth(context),
      patch: (path: string) => this.patch(path).withAuth(context),
      delete: (path: string) => this.delete(path).withAuth(context),
    };
  }
}

/**
 * Create an API test client for a Hono app
 */
export function createApiClient(app: Hono): ApiTestClient {
  return new ApiTestClient(app);
}

/**
 * Helper to extract cookies from response headers
 */
export function extractCookies(response: TestResponse): Record<string, string> {
  const cookies: Record<string, string> = {};
  const setCookie = response.headers.get("set-cookie");

  if (setCookie) {
    const cookiePairs = setCookie.split(";");
    for (const pair of cookiePairs) {
      const [key, value] = pair.trim().split("=");
      if (key && value) {
        cookies[key] = value;
      }
    }
  }

  return cookies;
}

/**
 * Helper to build cookie header string
 */
export function buildCookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
}

/**
 * Simple mock request for unit testing handlers
 */
export function mockRequest(
  path: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  } = {}
): Request {
  const url = new URL(path, "http://localhost");

  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      url.searchParams.append(key, value);
    }
  }

  return new Request(url.toString(), {
    method: options.method || "GET",
    headers: options.headers || {},
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

/**
 * Assert response matches expected shape
 */
export function expectResponse(
  response: TestResponse,
  expected: {
    status?: number;
    body?: any;
    headers?: Record<string, string>;
  }
): void {
  if (expected.status !== undefined) {
    response.expectStatus(expected.status);
  }

  if (expected.body !== undefined) {
    if (typeof expected.body === "object") {
      response.expectBodyContains(expected.body);
    } else {
      if (response.body !== expected.body) {
        throw new Error(`Expected body to be ${expected.body}, got ${response.body}`);
      }
    }
  }

  if (expected.headers !== undefined) {
    for (const [key, value] of Object.entries(expected.headers)) {
      const actual = response.getHeader(key);
      if (actual !== value) {
        throw new Error(`Expected header ${key} to be ${value}, got ${actual}`);
      }
    }
  }
}
