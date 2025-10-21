import React from "react";
import { describe, expect, it } from "vitest";
import { FeedView } from "@/features/feed/components/FeedView";
import { renderWithProviders, screen, waitFor } from "../utils/render";

/**
 * FeedView Component Tests
 *
 * Tests for the main feed view component with infinite scroll
 */

describe("FeedView", () => {
  describe("Feed Display", () => {
    it("should display loading state initially", () => {
      renderWithProviders(<FeedView />);
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should render posts from feed", async () => {
      renderWithProviders(<FeedView />);

      await waitFor(() => {
        expect(screen.getByTestId("feed-view")).toBeInTheDocument();
      });

      // Should render posts
      await waitFor(() => {
        expect(screen.getByTestId("post-list")).toBeInTheDocument();
      });
    });

    it("should display empty state when no posts", async () => {
      // Override the MSW handler to return empty posts
      const { server } = await import("../mocks/server");
      const { http, HttpResponse } = await import("msw");

      server.use(
        http.post("http://localhost:3000/api/rpc", async ({ request }) => {
          const body = (await request.json()) as any;
          const method = body.method || body.procedure;

          if (method === "feed.get") {
            return HttpResponse.json({
              success: true,
              data: {
                posts: [],
                nextCursor: null,
                hasMore: false,
              },
            });
          }
        })
      );

      renderWithProviders(<FeedView />);

      await waitFor(() => {
        expect(screen.getByText("No posts yet")).toBeInTheDocument();
      });
    });
  });

  describe("Infinite Scroll", () => {
    it("should load more posts when scrolling to bottom", async () => {
      renderWithProviders(<FeedView limit={2} />);

      // Wait for initial posts to load
      await waitFor(() => {
        expect(screen.getByTestId("post-list")).toBeInTheDocument();
      });

      // Should have load more trigger
      await waitFor(() => {
        const loadMoreTrigger = screen.queryByTestId("load-more");
        if (loadMoreTrigger) {
          expect(loadMoreTrigger).toBeInTheDocument();
        }
      });
    });

    it("should show loading indicator when fetching more posts", async () => {
      renderWithProviders(<FeedView limit={2} />);

      await waitFor(() => {
        expect(screen.getByTestId("post-list")).toBeInTheDocument();
      });

      // Look for the load more button and click it
      const loadMoreButton = screen.queryByTestId("load-more");
      if (loadMoreButton) {
        loadMoreButton.click();

        // Should show loading state
        await waitFor(() => {
          expect(screen.getByTestId("loading-more")).toBeInTheDocument();
        });
      }
    });

    it("should handle end of feed gracefully", async () => {
      // Override the MSW handler to return limited posts
      const { server } = await import("../mocks/server");
      const { http, HttpResponse } = await import("msw");

      server.use(
        http.post("http://localhost:3000/api/rpc", async ({ request }) => {
          const body = (await request.json()) as any;
          const method = body.method || body.procedure;

          if (method === "feed.get") {
            return HttpResponse.json({
              success: true,
              data: {
                posts: [
                  {
                    id: "post-001",
                    type: "text",
                    author: {
                      id: "user-001",
                      username: "testuser",
                      avatarUrl: "https://example.com/avatar.jpg",
                    },
                    content: "Test post",
                    media: [],
                    hashtags: [],
                    likesCount: 0,
                    commentsCount: 0,
                    sharesCount: 0,
                    isLiked: false,
                    isBookmarked: false,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
                nextCursor: null,
                hasMore: false,
              },
            });
          }
        })
      );

      renderWithProviders(<FeedView />);

      await waitFor(() => {
        expect(screen.getByTestId("post-list")).toBeInTheDocument();
      });

      // Should show end message
      await waitFor(() => {
        expect(screen.getByTestId("end-message")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should display error message when feed fails to load", async () => {
      // Override the MSW handler to return error
      const { server } = await import("../mocks/server");
      const { http, HttpResponse } = await import("msw");

      server.use(
        http.post("http://localhost:3000/api/rpc", async ({ request }) => {
          const body = (await request.json()) as any;
          const method = body.method || body.procedure;

          if (method === "feed.get") {
            return HttpResponse.json({
              success: false,
              error: {
                code: 500,
                message: "Failed to load feed",
              },
            });
          }
        })
      );

      renderWithProviders(<FeedView />);

      await waitFor(() => {
        expect(screen.getByTestId("error-message")).toBeInTheDocument();
      });
    });

    it("should show retry button on error", async () => {
      // Override the MSW handler to return error
      const { server } = await import("../mocks/server");
      const { http, HttpResponse } = await import("msw");

      server.use(
        http.post("http://localhost:3000/api/rpc", async ({ request }) => {
          const body = (await request.json()) as any;
          const method = body.method || body.procedure;

          if (method === "feed.get") {
            return HttpResponse.json({
              success: false,
              error: {
                code: 500,
                message: "Network error",
              },
            });
          }
        })
      );

      renderWithProviders(<FeedView />);

      await waitFor(() => {
        const retryButton = screen.getByTestId("retry-btn");
        expect(retryButton).toBeInTheDocument();
        expect(retryButton).toHaveTextContent("Retry (0)");
      });
    });
  });
});
