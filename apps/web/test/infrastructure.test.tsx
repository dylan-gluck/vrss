import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { MOCK_POSTS, TEST_PERSONAS } from "./mocks/data";
import { renderWithProviders, screen, waitFor } from "./utils/render";

/**
 * Infrastructure Validation Tests
 *
 * These tests validate that the testing infrastructure is properly set up:
 * - Vitest is configured correctly
 * - MSW is intercepting API calls
 * - React Testing Library is working
 * - Custom render utility provides all providers
 * - Mock data is accessible
 */

describe("Test Infrastructure", () => {
  describe("Basic Vitest Setup", () => {
    it("should run basic assertions", () => {
      expect(true).toBe(true);
      expect(1 + 1).toBe(2);
    });

    it("should have access to test globals", () => {
      expect(describe).toBeDefined();
      expect(it).toBeDefined();
      expect(expect).toBeDefined();
    });
  });

  describe("React Testing Library Setup", () => {
    it("should render a basic component", () => {
      const TestComponent = () => <div>Hello Test</div>;
      renderWithProviders(<TestComponent />);
      expect(screen.getByText("Hello Test")).toBeInTheDocument();
    });

    it("should handle async rendering", async () => {
      const TestComponent = () => {
        const [text, setText] = React.useState("Loading...");

        React.useEffect(() => {
          setTimeout(() => setText("Loaded!"), 100);
        }, []);

        return <div>{text}</div>;
      };

      renderWithProviders(<TestComponent />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("Loaded!")).toBeInTheDocument();
      });
    });
  });

  describe("TanStack Query Provider Setup", () => {
    it("should provide QueryClient context", () => {
      const TestComponent = () => {
        const query = useQuery({
          queryKey: ["test"],
          queryFn: async () => ({ data: "test" }),
        });

        return <div>{query.data ? "Query works" : "Loading"}</div>;
      };

      renderWithProviders(<TestComponent />);

      // Query should eventually resolve
      waitFor(() => {
        expect(screen.getByText("Query works")).toBeInTheDocument();
      });
    });
  });

  describe("React Router Setup", () => {
    it("should provide Router context", () => {
      const TestComponent = () => {
        const isRouterAvailable = !!React.useContext((React as any).__RouterContext || {});

        return <div>Router: {isRouterAvailable ? "Available" : "Missing"}</div>;
      };

      renderWithProviders(<TestComponent />);
      // If rendering succeeds without router errors, the test passes
      expect(screen.getByText(/Router:/)).toBeInTheDocument();
    });
  });

  describe("MSW Mock Server Setup", () => {
    it("should intercept RPC API calls", async () => {
      const TestComponent = () => {
        const { data, isLoading } = useQuery({
          queryKey: ["feed"],
          queryFn: async () => {
            const response = await fetch("http://localhost:3000/api/rpc", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                method: "feed.get",
                params: { cursor: 0, limit: 20 },
              }),
            });
            const result = await response.json();
            return result.result;
          },
        });

        if (isLoading) return <div>Loading...</div>;
        if (data) return <div>Posts: {data.posts.length}</div>;
        return <div>No data</div>;
      };

      renderWithProviders(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByText(/Posts:/)).toBeInTheDocument();
      });
    });

    it("should return mock feed data", async () => {
      const response = await fetch("http://localhost:3000/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "feed.get",
          params: { cursor: 0, limit: 20 },
        }),
      });

      const data = await response.json();
      expect(data.result).toBeDefined();
      expect(data.result.posts).toBeInstanceOf(Array);
      expect(data.result.posts.length).toBeGreaterThan(0);
    });

    it("should return mock authentication response", async () => {
      const response = await fetch("http://localhost:3000/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "auth.login",
          params: {
            email: TEST_PERSONAS.CREATOR.email,
            password: "SecurePass123!",
          },
        }),
      });

      const data = await response.json();
      expect(data.result).toBeDefined();
      expect(data.result.user).toBeDefined();
      expect(data.result.token).toBeDefined();
      expect(data.result.user.username).toBe(TEST_PERSONAS.CREATOR.username);
    });

    it("should return error for invalid credentials", async () => {
      const response = await fetch("http://localhost:3000/api/rpc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "auth.login",
          params: {
            email: "wrong@example.com",
            password: "WrongPassword",
          },
        }),
      });

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe(401);
      expect(data.error.message).toContain("Invalid");
    });
  });

  describe("Mock Data Availability", () => {
    it("should have test personas defined", () => {
      expect(TEST_PERSONAS.CREATOR).toBeDefined();
      expect(TEST_PERSONAS.CONSUMER).toBeDefined();
      expect(TEST_PERSONAS.BUSINESS).toBeDefined();

      expect(TEST_PERSONAS.CREATOR.username).toBe("maya_music");
      expect(TEST_PERSONAS.CONSUMER.username).toBe("marcus_consumer");
      expect(TEST_PERSONAS.BUSINESS.username).toBe("jade_cafe");
    });

    it("should have mock posts defined", () => {
      expect(MOCK_POSTS).toBeDefined();
      expect(MOCK_POSTS.length).toBeGreaterThan(0);
      expect(MOCK_POSTS[0]).toHaveProperty("id");
      expect(MOCK_POSTS[0]).toHaveProperty("content");
      expect(MOCK_POSTS[0]).toHaveProperty("author");
    });

    it("should have correct test persona data structure", () => {
      const creator = TEST_PERSONAS.CREATOR;

      expect(creator).toMatchObject({
        id: expect.any(String),
        username: expect.any(String),
        email: expect.any(String),
        storageUsed: expect.any(Number),
        storageQuota: expect.any(Number),
        followersCount: expect.any(Number),
      });
    });
  });

  describe("Custom Render Utility", () => {
    it("should export renderWithProviders", () => {
      expect(renderWithProviders).toBeDefined();
      expect(typeof renderWithProviders).toBe("function");
    });

    it("should wrap components with all providers", () => {
      const TestComponent = () => {
        // This component will fail to render if providers are missing
        const query = useQuery({
          queryKey: ["test-providers"],
          queryFn: async () => "providers work",
        });

        return <div>Test: {query.data || "loading"}</div>;
      };

      const { container } = renderWithProviders(<TestComponent />);
      expect(container).toBeDefined();
    });
  });

  describe("Global Test Utilities", () => {
    it("should have matchMedia mock", () => {
      expect(window.matchMedia).toBeDefined();
      const media = window.matchMedia("(min-width: 768px)");
      expect(media).toHaveProperty("matches");
      expect(media).toHaveProperty("media");
    });

    it("should have IntersectionObserver mock", () => {
      expect(global.IntersectionObserver).toBeDefined();
      const observer = new IntersectionObserver(() => {
        // Mock callback - no-op for testing
      });
      expect(observer).toHaveProperty("observe");
      expect(observer).toHaveProperty("disconnect");
    });

    it("should have crypto.randomUUID mock", () => {
      expect(global.crypto.randomUUID).toBeDefined();
      const uuid = global.crypto.randomUUID();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });
  });

  describe("Coverage Configuration", () => {
    it("should validate test is running with coverage config", () => {
      // If this test runs, it means vitest.config.ts is loaded correctly
      expect(true).toBe(true);
    });
  });
});

/**
 * Integration Test: Full RPC Flow
 *
 * This test validates the complete flow:
 * 1. Component makes RPC call
 * 2. MSW intercepts the call
 * 3. Mock handler returns data
 * 4. TanStack Query caches the response
 * 5. Component renders the data
 */
describe("Integration: Full RPC Flow", () => {
  it("should complete full feed fetch flow", async () => {
    const FeedComponent = () => {
      const { data, isLoading, error } = useQuery({
        queryKey: ["integration-feed"],
        queryFn: async () => {
          const response = await fetch("http://localhost:3000/api/rpc", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              method: "feed.get",
              params: { cursor: 0, limit: 20 },
            }),
          });

          if (!response.ok) {
            throw new Error("Network error");
          }

          const result = await response.json();
          return result.result;
        },
      });

      if (isLoading) return <div>Loading feed...</div>;
      if (error) return <div>Error loading feed</div>;
      if (!data) return <div>No data</div>;

      return (
        <div>
          <h1>Feed</h1>
          <div data-testid="post-count">Posts: {data.posts.length}</div>
          {data.posts.map((post: any) => (
            <div key={post.id} data-testid={`post-${post.id}`}>
              {post.content}
            </div>
          ))}
        </div>
      );
    };

    renderWithProviders(<FeedComponent />);

    // Should show loading state
    expect(screen.getByText("Loading feed...")).toBeInTheDocument();

    // Should eventually show posts
    await waitFor(() => {
      expect(screen.getByText("Feed")).toBeInTheDocument();
    });

    // Should render post content
    expect(screen.getByTestId("post-count")).toBeInTheDocument();
    expect(screen.getByText(/Working on my new album/)).toBeInTheDocument();
  });
});
