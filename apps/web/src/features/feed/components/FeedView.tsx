/**
 * FeedView Component - Phase 5.1
 *
 * Main feed view component with infinite scroll
 * Features:
 * - Infinite scroll with TanStack Query
 * - Virtual scrolling for performance (>100 posts)
 * - Loading states and error handling
 * - Empty state
 *
 * @see docs/FRONTEND.md Section: "Feed System"
 */

import React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useFeed } from "../hooks/useFeed";
import { PostCard } from "./PostCard";
import { PostComposer } from "./CreatePost";

interface FeedViewProps {
  /**
   * Algorithm ID for custom feed filtering
   */
  algorithmId?: string;

  /**
   * Number of posts per page
   */
  limit?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Main feed view component
 */
export function FeedView({ algorithmId, limit = 20, className }: FeedViewProps) {
  const {
    data,
    error,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useFeed({ algorithmId, limit });

  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const parentRef = React.useRef<HTMLDivElement | null>(null);

  // Get all posts from all pages
  const posts = data?.pages.flatMap((page) => page.posts) ?? [];

  // Use virtual scrolling for large feeds (>100 posts)
  const useVirtualScroll = posts.length > 100;

  const virtualizer = useVirtualizer({
    count: posts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimated height of a post card
    overscan: 5, // Number of items to render outside the visible area
    enabled: useVirtualScroll,
  });

  // Set up intersection observer for infinite scroll
  React.useEffect(() => {
    if (isLoading || !hasNextPage) return;

    const target = loadMoreRef.current;
    if (!target) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        threshold: 0.1,
        rootMargin: "100px",
      }
    );

    observerRef.current.observe(target);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [isLoading, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Initial loading state
  if (isLoading) {
    return (
      <div className={className} data-testid="feed-view">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className={className} data-testid="feed-view">
        <div className="flex flex-col items-center justify-center py-12 gap-4">
          <div className="text-red-600" data-testid="error-message">
            {error instanceof Error ? error.message : "Failed to load feed"}
          </div>
          <button
            type="button"
            onClick={() => {
              setRetryCount(retryCount + 1);
              refetch();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            data-testid="retry-btn"
          >
            Retry ({retryCount})
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (posts.length === 0) {
    return (
      <div className={className} data-testid="feed-view">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-500">No posts yet</div>
        </div>
      </div>
    );
  }

  return (
    <div className={className} data-testid="feed-view">
      {/* Post Composer */}
      <PostComposer />

      {/* Post List */}
      {useVirtualScroll ? (
        <div
          ref={parentRef}
          className="h-[calc(100vh-200px)] overflow-auto"
          data-testid="post-list"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const post = posts[virtualItem.index];
              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                  className="pb-4"
                >
                  {post && <PostCard post={post} data-testid={`post-${post.id}`} />}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4" data-testid="post-list">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} data-testid={`post-${post.id}`} />
          ))}
        </div>
      )}

      {/* Load More Trigger (for infinite scroll) */}
      {hasNextPage && (
        <div ref={loadMoreRef} className="py-4 text-center">
          {isFetchingNextPage ? (
            <div data-testid="loading-more">Loading more...</div>
          ) : (
            <button
              type="button"
              onClick={() => fetchNextPage()}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              data-testid="load-more"
            >
              Load More
            </button>
          )}
        </div>
      )}

      {/* End of Feed Message */}
      {!hasNextPage && posts.length > 0 && (
        <div className="py-4 text-center text-gray-500" data-testid="end-message">
          You've reached the end
        </div>
      )}
    </div>
  );
}
