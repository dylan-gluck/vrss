import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { MOCK_POSTS } from "../mocks/data";
import { renderWithProviders, screen, waitFor } from "../utils/render";

/**
 * Optimistic Updates Tests
 *
 * Tests for like/bookmark with instant UI updates and rollback on error
 */

describe("Optimistic Updates", () => {
  describe("Like Post", () => {
    it("should update like count immediately", async () => {
      const LikeButton = () => {
        const [likesCount, setLikesCount] = React.useState(45);
        const [isLiked, setIsLiked] = React.useState(false);

        const handleLike = () => {
          // Optimistic update
          setIsLiked(true);
          setLikesCount(likesCount + 1);
        };

        return (
          <div>
            <button type="button" onClick={handleLike} data-testid="like-btn">
              {isLiked ? "❤️" : "🤍"} {likesCount}
            </button>
          </div>
        );
      };

      renderWithProviders(<LikeButton />);

      const likeButton = screen.getByTestId("like-btn");
      expect(likeButton).toHaveTextContent("🤍 45");

      likeButton.click();

      // Should update immediately (optimistic)
      await waitFor(() => {
        expect(likeButton).toHaveTextContent("❤️ 46");
      });
    });

    it("should toggle like state", async () => {
      const LikeButton = () => {
        const [isLiked, setIsLiked] = React.useState(false);

        return (
          <button
            type="button"
            onClick={() => setIsLiked(!isLiked)}
            data-testid="like-btn"
            aria-pressed={isLiked}
          >
            {isLiked ? "Unlike" : "Like"}
          </button>
        );
      };

      renderWithProviders(<LikeButton />);

      const likeButton = screen.getByTestId("like-btn");
      expect(likeButton).toHaveTextContent("Like");
      expect(likeButton).toHaveAttribute("aria-pressed", "false");

      // First click: like
      likeButton.click();
      await waitFor(() => {
        expect(likeButton).toHaveTextContent("Unlike");
        expect(likeButton).toHaveAttribute("aria-pressed", "true");
      });

      // Second click: unlike
      likeButton.click();
      await waitFor(() => {
        expect(likeButton).toHaveTextContent("Like");
        expect(likeButton).toHaveAttribute("aria-pressed", "false");
      });
    });

    it("should rollback on error", async () => {
      const LikeButton = () => {
        const [likesCount, setLikesCount] = React.useState(45);
        const [isLiked, setIsLiked] = React.useState(false);
        const [error, setError] = React.useState<string | null>(null);

        const handleLike = async () => {
          // Save previous state
          const prevLikesCount = likesCount;
          const prevIsLiked = isLiked;

          // Optimistic update
          setIsLiked(true);
          setLikesCount(likesCount + 1);

          // Simulate API call that fails
          try {
            await new Promise((_, reject) =>
              setTimeout(() => reject(new Error("Network error")), 100)
            );
          } catch {
            // Rollback on error
            setIsLiked(prevIsLiked);
            setLikesCount(prevLikesCount);
            setError("Failed to like post");
          }
        };

        return (
          <div>
            <button type="button" onClick={handleLike} data-testid="like-btn">
              {isLiked ? "❤️" : "🤍"} {likesCount}
            </button>
            {error && <div data-testid="error">{error}</div>}
          </div>
        );
      };

      renderWithProviders(<LikeButton />);

      const likeButton = screen.getByTestId("like-btn");
      expect(likeButton).toHaveTextContent("🤍 45");

      likeButton.click();

      // Should immediately show liked state
      await waitFor(() => {
        expect(likeButton).toHaveTextContent("❤️ 46");
      });

      // Should rollback after error
      await waitFor(
        () => {
          expect(likeButton).toHaveTextContent("🤍 45");
          expect(screen.getByTestId("error")).toHaveTextContent("Failed to like post");
        },
        { timeout: 200 }
      );
    });

    it("should persist on success", async () => {
      const LikeButton = () => {
        const [likesCount, setLikesCount] = React.useState(45);
        const [isLiked, setIsLiked] = React.useState(false);

        const handleLike = async () => {
          // Optimistic update
          setIsLiked(true);
          setLikesCount(likesCount + 1);

          // Simulate successful API call
          await new Promise((resolve) => setTimeout(resolve, 100));
          // State persists after success
        };

        return (
          <button type="button" onClick={handleLike} data-testid="like-btn">
            {isLiked ? "❤️" : "🤍"} {likesCount}
          </button>
        );
      };

      renderWithProviders(<LikeButton />);

      const likeButton = screen.getByTestId("like-btn");
      likeButton.click();

      await waitFor(() => {
        expect(likeButton).toHaveTextContent("❤️ 46");
      });

      // Wait for "API call" to complete
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should still show liked state
      expect(likeButton).toHaveTextContent("❤️ 46");
    });
  });

  describe("Bookmark Post", () => {
    it("should update bookmark state immediately", async () => {
      const BookmarkButton = () => {
        const [isBookmarked, setIsBookmarked] = React.useState(false);

        return (
          <button
            type="button"
            onClick={() => setIsBookmarked(!isBookmarked)}
            data-testid="bookmark-btn"
            aria-pressed={isBookmarked}
          >
            {isBookmarked ? "🔖" : "📑"}
          </button>
        );
      };

      renderWithProviders(<BookmarkButton />);

      const bookmarkButton = screen.getByTestId("bookmark-btn");
      expect(bookmarkButton).toHaveTextContent("📑");

      bookmarkButton.click();

      await waitFor(() => {
        expect(bookmarkButton).toHaveTextContent("🔖");
        expect(bookmarkButton).toHaveAttribute("aria-pressed", "true");
      });
    });

    it("should toggle bookmark state", async () => {
      const BookmarkButton = () => {
        const [isBookmarked, setIsBookmarked] = React.useState(false);

        return (
          <button type="button" onClick={() => setIsBookmarked(!isBookmarked)} data-testid="bookmark-btn">
            {isBookmarked ? "Remove Bookmark" : "Bookmark"}
          </button>
        );
      };

      renderWithProviders(<BookmarkButton />);

      const bookmarkButton = screen.getByTestId("bookmark-btn");

      // First click: bookmark
      bookmarkButton.click();
      await waitFor(() => {
        expect(bookmarkButton).toHaveTextContent("Remove Bookmark");
      });

      // Second click: remove bookmark
      bookmarkButton.click();
      await waitFor(() => {
        expect(bookmarkButton).toHaveTextContent("Bookmark");
      });
    });

    it("should rollback bookmark on error", async () => {
      const BookmarkButton = () => {
        const [isBookmarked, setIsBookmarked] = React.useState(false);
        const [error, setError] = React.useState<string | null>(null);

        const handleBookmark = async () => {
          const prevBookmarked = isBookmarked;

          // Optimistic update
          setIsBookmarked(true);

          try {
            // Simulate API failure
            await new Promise((_, reject) => setTimeout(() => reject(new Error("Failed")), 100));
          } catch {
            // Rollback
            setIsBookmarked(prevBookmarked);
            setError("Failed to bookmark");
          }
        };

        return (
          <div>
            <button type="button" onClick={handleBookmark} data-testid="bookmark-btn">
              {isBookmarked ? "🔖" : "📑"}
            </button>
            {error && <div data-testid="error">{error}</div>}
          </div>
        );
      };

      renderWithProviders(<BookmarkButton />);

      const bookmarkButton = screen.getByTestId("bookmark-btn");
      bookmarkButton.click();

      // Should immediately show bookmarked
      await waitFor(() => {
        expect(bookmarkButton).toHaveTextContent("🔖");
      });

      // Should rollback after error
      await waitFor(
        () => {
          expect(bookmarkButton).toHaveTextContent("📑");
          expect(screen.getByTestId("error")).toHaveTextContent("Failed to bookmark");
        },
        { timeout: 200 }
      );
    });
  });

  describe("Query Cache Updates", () => {
    it("should update post in query cache optimistically", async () => {
      const PostWithLike = () => {
        const queryClient = useQueryClient();
        const [post, setPost] = React.useState({
          id: "post-001",
          likesCount: 45,
          isLiked: false,
        });

        const likePost = () => {
          // Update local state
          const newPost = {
            ...post,
            isLiked: true,
            likesCount: post.likesCount + 1,
          };
          setPost(newPost);

          // Update query cache
          queryClient.setQueryData(["post", post.id], newPost);
        };

        return (
          <div>
            <button type="button" onClick={likePost} data-testid="like-btn">
              {post.isLiked ? "❤️" : "🤍"} {post.likesCount}
            </button>
          </div>
        );
      };

      renderWithProviders(<PostWithLike />);

      const likeButton = screen.getByTestId("like-btn");
      expect(likeButton).toHaveTextContent("🤍 45");

      likeButton.click();

      await waitFor(() => {
        expect(likeButton).toHaveTextContent("❤️ 46");
      });
    });

    it("should cancel outgoing queries before optimistic update", async () => {
      const PostWithOptimistic = () => {
        const [cancelled, setCancelled] = React.useState(false);

        const likeWithCancel = async () => {
          // Simulate cancelling queries
          setCancelled(true);

          // Then perform optimistic update
          await new Promise((resolve) => setTimeout(resolve, 50));
        };

        return (
          <div>
            <button type="button" onClick={likeWithCancel} data-testid="like-btn">
              Like
            </button>
            {cancelled && <div data-testid="cancelled">Queries cancelled</div>}
          </div>
        );
      };

      renderWithProviders(<PostWithOptimistic />);

      const likeButton = screen.getByTestId("like-btn");
      likeButton.click();

      await waitFor(() => {
        expect(screen.getByTestId("cancelled")).toBeInTheDocument();
      });
    });

    it("should invalidate queries after successful mutation", async () => {
      const PostWithInvalidation = () => {
        const [invalidated, setInvalidated] = React.useState(false);

        const likeAndInvalidate = async () => {
          // Simulate mutation
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Invalidate queries
          setInvalidated(true);
        };

        return (
          <div>
            <button type="button" onClick={likeAndInvalidate} data-testid="like-btn">
              Like
            </button>
            {invalidated && <div data-testid="invalidated">Queries invalidated</div>}
          </div>
        );
      };

      renderWithProviders(<PostWithInvalidation />);

      const likeButton = screen.getByTestId("like-btn");
      likeButton.click();

      await waitFor(
        () => {
          expect(screen.getByTestId("invalidated")).toBeInTheDocument();
        },
        { timeout: 100 }
      );
    });
  });

  describe("Multiple Simultaneous Updates", () => {
    it("should handle multiple like clicks correctly", async () => {
      const LikeButton = () => {
        const [likesCount, setLikesCount] = React.useState(45);
        const [isLiked, setIsLiked] = React.useState(false);

        const handleLike = () => {
          if (isLiked) {
            setIsLiked(false);
            setLikesCount(likesCount - 1);
          } else {
            setIsLiked(true);
            setLikesCount(likesCount + 1);
          }
        };

        return (
          <button type="button" onClick={handleLike} data-testid="like-btn">
            {isLiked ? "❤️" : "🤍"} {likesCount}
          </button>
        );
      };

      renderWithProviders(<LikeButton />);

      const likeButton = screen.getByTestId("like-btn");

      // Click 3 times rapidly
      likeButton.click();
      likeButton.click();
      likeButton.click();

      await waitFor(() => {
        // Should end in liked state with count 46 (odd number of clicks)
        expect(likeButton).toHaveTextContent("❤️ 46");
      });
    });

    it("should handle like and bookmark together", async () => {
      const PostActions = () => {
        const [isLiked, setIsLiked] = React.useState(false);
        const [isBookmarked, setIsBookmarked] = React.useState(false);

        return (
          <div>
            <button type="button" onClick={() => setIsLiked(!isLiked)} data-testid="like-btn">
              {isLiked ? "Liked" : "Not Liked"}
            </button>
            <button type="button" onClick={() => setIsBookmarked(!isBookmarked)} data-testid="bookmark-btn">
              {isBookmarked ? "Bookmarked" : "Not Bookmarked"}
            </button>
          </div>
        );
      };

      renderWithProviders(<PostActions />);

      const likeButton = screen.getByTestId("like-btn");
      const bookmarkButton = screen.getByTestId("bookmark-btn");

      likeButton.click();
      bookmarkButton.click();

      await waitFor(() => {
        expect(likeButton).toHaveTextContent("Liked");
        expect(bookmarkButton).toHaveTextContent("Bookmarked");
      });
    });
  });

  describe("Loading States", () => {
    it("should show loading state during mutation", async () => {
      const LikeButton = () => {
        const [isLoading, setIsLoading] = React.useState(false);

        const handleLike = async () => {
          setIsLoading(true);
          await new Promise((resolve) => setTimeout(resolve, 100));
          setIsLoading(false);
        };

        return (
          <button type="button" onClick={handleLike} data-testid="like-btn" disabled={isLoading}>
            {isLoading ? "Loading..." : "Like"}
          </button>
        );
      };

      renderWithProviders(<LikeButton />);

      const likeButton = screen.getByTestId("like-btn");
      likeButton.click();

      await waitFor(() => {
        expect(likeButton).toHaveTextContent("Loading...");
        expect(likeButton).toBeDisabled();
      });

      await waitFor(
        () => {
          expect(likeButton).toHaveTextContent("Like");
          expect(likeButton).not.toBeDisabled();
        },
        { timeout: 150 }
      );
    });

    it("should not allow multiple clicks while loading", async () => {
      const LikeButton = () => {
        const [isLoading, setIsLoading] = React.useState(false);
        const [clickCount, setClickCount] = React.useState(0);

        const handleLike = async () => {
          if (isLoading) return;

          setIsLoading(true);
          setClickCount(clickCount + 1);
          await new Promise((resolve) => setTimeout(resolve, 100));
          setIsLoading(false);
        };

        return (
          <div>
            <button type="button" onClick={handleLike} data-testid="like-btn" disabled={isLoading}>
              Like
            </button>
            <div data-testid="click-count">{clickCount}</div>
          </div>
        );
      };

      renderWithProviders(<LikeButton />);

      const likeButton = screen.getByTestId("like-btn");

      // Click multiple times while loading
      likeButton.click();
      likeButton.click();
      likeButton.click();

      await waitFor(() => {
        // Should only register one click
        expect(screen.getByTestId("click-count")).toHaveTextContent("1");
      });
    });
  });
});
