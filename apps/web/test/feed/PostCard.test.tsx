import React from "react";
import { describe, expect, it } from "vitest";
import { PostCard } from "@/features/feed/components/PostCard";
import type { Post } from "@/features/feed/hooks/useFeed";
import { MOCK_POSTS, TEST_PERSONAS } from "../mocks/data";
import { renderWithProviders, screen, waitFor } from "../utils/render";

/**
 * PostCard Component Tests
 *
 * Tests for different post type renderers (text, image, video, song)
 */

describe("PostCard", () => {
  describe("Text Post Rendering", () => {
    it("should render text post content", () => {
      const textPost = MOCK_POSTS[0] as Post;
      renderWithProviders(<PostCard post={textPost} />);

      expect(screen.getByTestId("post-content")).toHaveTextContent(textPost.content);
    });

    it("should render author information", () => {
      const textPost = MOCK_POSTS[0] as Post;
      renderWithProviders(<PostCard post={textPost} />);

      expect(screen.getByTestId("author-username")).toHaveTextContent("maya_music");
      expect(screen.getByTestId("author-avatar")).toHaveAttribute(
        "src",
        TEST_PERSONAS.CREATOR.avatarUrl
      );
    });

    it("should render hashtags", () => {
      const textPost = MOCK_POSTS[0] as Post;
      renderWithProviders(<PostCard post={textPost} />);

      const hashtags = screen.getAllByTestId("hashtag");
      expect(hashtags).toHaveLength(2);
      expect(hashtags[0]).toHaveTextContent("#indie");
      expect(hashtags[1]).toHaveTextContent("#newmusic");
    });

    it("should render engagement metrics", () => {
      const textPost = MOCK_POSTS[0] as Post;
      renderWithProviders(<PostCard post={textPost} />);

      expect(screen.getByTestId("likes-count")).toHaveTextContent("45 likes");
      expect(screen.getByTestId("comments-count")).toHaveTextContent("12 comments");
      expect(screen.getByTestId("shares-count")).toHaveTextContent("3 shares");
    });

    it("should render timestamp", () => {
      const textPost = MOCK_POSTS[0] as Post;
      renderWithProviders(<PostCard post={textPost} />);

      const timestamp = screen.getByTestId("timestamp");
      expect(timestamp).toBeInTheDocument();
      expect(timestamp).toHaveAttribute("dateTime", textPost.createdAt);
    });
  });

  describe("Image Post Rendering", () => {
    it("should render image post with media", () => {
      const imagePost = MOCK_POSTS[1] as Post;
      renderWithProviders(<PostCard post={imagePost} />);

      expect(screen.getByTestId("post-content")).toHaveTextContent(
        "Album cover reveal! What do you think?"
      );
      expect(screen.getByTestId("post-image")).toHaveAttribute(
        "src",
        "https://example.com/images/album-cover-thumb.jpg"
      );
      expect(screen.getByTestId("post-image")).toHaveAttribute("alt", "Album cover artwork");
    });

    it("should display thumbnail for better performance", () => {
      const imagePost = MOCK_POSTS[1] as Post;
      renderWithProviders(<PostCard post={imagePost} />);

      // The component uses thumbnailUrl by default
      expect(screen.getByTestId("post-image")).toHaveAttribute(
        "src",
        "https://example.com/images/album-cover-thumb.jpg"
      );
    });

    it("should handle image loading errors", async () => {
      const imagePostWithBadUrl: Post = {
        ...(MOCK_POSTS[1] as Post),
        media: [
          {
            id: "bad-image",
            type: "image" as const,
            url: "invalid-url.jpg",
            thumbnailUrl: "invalid-url-thumb.jpg",
            alt: "Bad image",
          },
        ],
      };

      renderWithProviders(<PostCard post={imagePostWithBadUrl} />);

      const image = screen.getByTestId("post-image");
      // Trigger error
      image.dispatchEvent(new Event("error"));

      // Should show error message after state update
      await waitFor(() => {
        expect(screen.getByTestId("image-error")).toBeInTheDocument();
      });
    });
  });

  describe("Video Post Rendering", () => {
    it("should render video player", () => {
      const videoPost: Post = {
        ...(MOCK_POSTS[0] as Post),
        type: "video" as const,
        media: [
          {
            id: "media-video-001",
            type: "video" as const,
            url: "https://example.com/videos/test.mp4",
            thumbnailUrl: "https://example.com/videos/test-thumb.jpg",
          },
        ],
      };

      renderWithProviders(<PostCard post={videoPost} />);

      const video = screen.getByTestId("post-video");
      expect(video).toHaveAttribute("src", "https://example.com/videos/test.mp4");
      expect(video).toHaveAttribute("poster", "https://example.com/videos/test-thumb.jpg");
      expect(video).toHaveAttribute("controls");
    });
  });

  describe("Song Post Rendering", () => {
    it("should render audio player for song post", () => {
      const songPost: Post = {
        ...(MOCK_POSTS[0] as Post),
        type: "song" as const,
        media: [
          {
            id: "media-audio-001",
            type: "audio" as const,
            url: "https://example.com/audio/song.mp3",
            title: "Test Song",
            artist: "Maya Music",
          },
        ],
      };

      renderWithProviders(<PostCard post={songPost} />);

      expect(screen.getByTestId("post-audio")).toHaveAttribute(
        "src",
        "https://example.com/audio/song.mp3"
      );
      expect(screen.getByTestId("song-title")).toHaveTextContent("Test Song");
      expect(screen.getByTestId("song-artist")).toHaveTextContent("Maya Music");
    });
  });

  describe("Interaction Buttons", () => {
    it("should render like button", () => {
      const post = MOCK_POSTS[0] as Post;
      renderWithProviders(<PostCard post={post} />);

      const likeButton = screen.getByTestId("like-btn");
      expect(likeButton).toBeInTheDocument();
      expect(likeButton).toHaveTextContent("45");
    });

    it("should render comment button", () => {
      const post = MOCK_POSTS[0] as Post;
      renderWithProviders(<PostCard post={post} />);

      const commentButton = screen.getByTestId("comment-btn");
      expect(commentButton).toBeInTheDocument();
      expect(commentButton).toHaveTextContent("12");
    });

    it("should render share button", () => {
      const post = MOCK_POSTS[0] as Post;
      renderWithProviders(<PostCard post={post} />);

      const shareButton = screen.getByTestId("share-btn");
      expect(shareButton).toBeInTheDocument();
      expect(shareButton).toHaveTextContent("3");
    });

    it("should render bookmark button", () => {
      const post = MOCK_POSTS[0] as Post;
      renderWithProviders(<PostCard post={post} />);

      const bookmarkButton = screen.getByTestId("bookmark-btn");
      expect(bookmarkButton).toBeInTheDocument();
      expect(bookmarkButton).toHaveTextContent("📑");
    });
  });

  describe("State Indicators", () => {
    it("should show liked state", () => {
      const likedPost: Post = { ...(MOCK_POSTS[0] as Post), isLiked: true };
      renderWithProviders(<PostCard post={likedPost} />);

      const likeButton = screen.getByTestId("like-btn");
      expect(likeButton).toHaveClass("liked");
      expect(likeButton).toHaveAttribute("aria-pressed", "true");
      expect(likeButton).toHaveTextContent("❤️");
    });

    it("should show bookmarked state", () => {
      const bookmarkedPost: Post = { ...(MOCK_POSTS[0] as Post), isBookmarked: true };
      renderWithProviders(<PostCard post={bookmarkedPost} />);

      const bookmarkButton = screen.getByTestId("bookmark-btn");
      expect(bookmarkButton).toHaveClass("bookmarked");
      expect(bookmarkButton).toHaveAttribute("aria-pressed", "true");
      expect(bookmarkButton).toHaveTextContent("🔖");
    });
  });
});
