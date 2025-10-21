/**
 * PostCard Component - Phase 5.1
 *
 * Main post card component that renders different post types
 * Supports: text, image, video, song posts
 *
 * @see docs/FRONTEND.md Section: "Feed Components"
 */

import { cn } from "@/lib/utils/cn";
import React from "react";
import { useBookmarkPost } from "../../hooks/useBookmarkPost";
import type { Post } from "../../hooks/useFeed";
import { useLikePost } from "../../hooks/useLikePost";

interface PostCardProps {
  post: Post;
  className?: string;
}

/**
 * Format timestamp to relative time or date
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

/**
 * Post media renderer for images
 */
function ImageMedia({ media }: { media: Post["media"][0] }) {
  const [imageError, setImageError] = React.useState(false);

  if (imageError) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 h-64 rounded-lg"
        data-testid="image-error"
      >
        <p className="text-gray-500">Failed to load image</p>
      </div>
    );
  }

  return (
    <img
      src={media.thumbnailUrl || media.url}
      alt={media.alt || "Post image"}
      className="w-full h-auto rounded-lg"
      data-testid="post-image"
      onError={() => setImageError(true)}
      loading="lazy"
    />
  );
}

/**
 * Post media renderer for videos
 */
function VideoMedia({ media }: { media: Post["media"][0] }) {
  return (
    <video
      src={media.url}
      poster={media.thumbnailUrl}
      controls
      className="w-full h-auto rounded-lg"
      data-testid="post-video"
      preload="metadata"
    >
      <track kind="captions" />
      Your browser does not support the video tag.
    </video>
  );
}

/**
 * Post media renderer for audio/songs
 */
function AudioMedia({ media }: { media: Post["media"][0] }) {
  return (
    <div className="bg-gray-100 p-4 rounded-lg" data-testid="audio-player">
      <audio src={media.url} controls className="w-full mb-2" data-testid="post-audio">
        <track kind="captions" />
        Your browser does not support the audio element.
      </audio>
      {media.title && (
        <div className="font-medium" data-testid="song-title">
          {media.title}
        </div>
      )}
      {media.artist && (
        <div className="text-sm text-gray-600" data-testid="song-artist">
          {media.artist}
        </div>
      )}
    </div>
  );
}

/**
 * Main PostCard component
 */
export function PostCard({ post, className }: PostCardProps) {
  const likeMutation = useLikePost();
  const bookmarkMutation = useBookmarkPost();

  const handleLike = () => {
    likeMutation.mutate({
      postId: post.id,
      currentlyLiked: post.isLiked,
    });
  };

  const handleBookmark = () => {
    bookmarkMutation.mutate({
      postId: post.id,
      currentlyBookmarked: post.isBookmarked,
    });
  };

  return (
    <div
      className={cn("bg-white border border-gray-200 rounded-lg p-4 shadow-sm", className)}
      data-testid="post-card"
    >
      {/* Author Header */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={post.author.avatarUrl}
          alt="avatar"
          className="w-10 h-10 rounded-full"
          data-testid="author-avatar"
        />
        <div className="flex-1">
          <div className="font-medium" data-testid="author-username">
            {post.author.username}
          </div>
          <time className="text-sm text-gray-500" dateTime={post.createdAt} data-testid="timestamp">
            {formatTimestamp(post.createdAt)}
          </time>
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-3">
        <p className="text-gray-900 whitespace-pre-wrap" data-testid="post-content">
          {post.content}
        </p>
      </div>

      {/* Hashtags */}
      {post.hashtags && post.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3" data-testid="hashtags">
          {post.hashtags.map((tag) => (
            <span
              key={tag}
              className="text-blue-600 hover:underline cursor-pointer text-sm"
              data-testid="hashtag"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <div className="mb-3 space-y-2">
          {post.media.map((item) => {
            if (item.type === "image") {
              return <ImageMedia key={item.id} media={item} />;
            }
            if (item.type === "video") {
              return <VideoMedia key={item.id} media={item} />;
            }
            if (item.type === "audio") {
              return <AudioMedia key={item.id} media={item} />;
            }
            return null;
          })}
        </div>
      )}

      {/* Engagement Metrics */}
      <div className="flex items-center gap-4 mb-3 text-sm text-gray-600">
        <span data-testid="likes-count">{post.likesCount} likes</span>
        <span data-testid="comments-count">{post.commentsCount} comments</span>
        <span data-testid="shares-count">{post.sharesCount} shares</span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 border-t border-gray-200 pt-3">
        <button
          type="button"
          onClick={handleLike}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 transition-colors",
            post.isLiked && "liked"
          )}
          data-testid="like-btn"
          aria-label="Like post"
          aria-pressed={post.isLiked}
          disabled={likeMutation.isPending}
        >
          {post.isLiked ? "❤️" : "🤍"} {post.likesCount}
        </button>

        <button
          type="button"
          onClick={() => {
            // TODO: Implement comment functionality
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          data-testid="comment-btn"
          aria-label="Comment on post"
        >
          💬 {post.commentsCount}
        </button>

        <button
          type="button"
          onClick={() => {
            // TODO: Implement share functionality
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          data-testid="share-btn"
          aria-label="Share post"
        >
          🔁 {post.sharesCount}
        </button>

        <button
          type="button"
          onClick={handleBookmark}
          className={cn(
            "flex items-center justify-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors",
            post.isBookmarked && "bookmarked"
          )}
          data-testid="bookmark-btn"
          aria-label={post.isBookmarked ? "Remove bookmark" : "Bookmark post"}
          aria-pressed={post.isBookmarked}
          disabled={bookmarkMutation.isPending}
        >
          {post.isBookmarked ? "🔖" : "📑"}
        </button>
      </div>
    </div>
  );
}
