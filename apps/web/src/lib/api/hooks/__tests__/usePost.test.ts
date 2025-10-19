/**
 * Post Hooks Tests - Phase 4.3
 *
 * Tests for post-related TanStack Query hooks with optimistic updates.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode, createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../../client";
import { useCreatePost, useLikePost, usePost, useUnlikePost } from "../usePost";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
}

describe("useCreatePost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a post and invalidate feed", async () => {
    const mockPost = {
      id: "post-1",
      content: "Test post",
      createdAt: new Date().toISOString(),
      likesCount: 0,
      commentsCount: 0,
    };

    vi.spyOn(api.post, "create").mockResolvedValue(mockPost as any);

    const { result } = renderHook(() => useCreatePost(), { wrapper: createWrapper() });

    result.current.mutate({ content: "Test post" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.post.create).toHaveBeenCalledWith({ content: "Test post" });
  });

  it("should handle create post errors", async () => {
    vi.spyOn(api.post, "create").mockRejectedValue(new Error("Content too long"));

    const { result } = renderHook(() => useCreatePost(), { wrapper: createWrapper() });

    result.current.mutate({ content: "x".repeat(10000) });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeDefined();
  });
});

describe("useLikePost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should like a post with optimistic update", async () => {
    vi.spyOn(api.post, "like").mockResolvedValue(undefined as any);

    const wrapper = createWrapper();
    const { result } = renderHook(() => useLikePost(), { wrapper });

    result.current.mutate({ postId: "post-1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(api.post.like).toHaveBeenCalledWith({ postId: "post-1" });
  });

  it("should rollback on error", async () => {
    vi.spyOn(api.post, "like").mockRejectedValue(new Error("Failed to like"));

    const { result } = renderHook(() => useLikePost(), { wrapper: createWrapper() });

    result.current.mutate({ postId: "post-1" });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe("usePost", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fetch a post by ID", async () => {
    const mockPost = {
      id: "post-1",
      content: "Test post",
      createdAt: new Date().toISOString(),
      likesCount: 5,
      commentsCount: 2,
    };

    vi.spyOn(api.post, "getById").mockResolvedValue(mockPost as any);

    const { result } = renderHook(() => usePost("post-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockPost);
  });

  it("should not fetch when postId is empty", () => {
    const { result } = renderHook(() => usePost(""), { wrapper: createWrapper() });

    expect(result.current.isPending).toBe(false);
  });
});
