/**
 * Shared Domain Types
 * These types are used across frontend and backend
 */

// User types
export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Post types
export type PostType =
  | "text_short"
  | "text_long"
  | "image_single"
  | "image_gallery"
  | "video"
  | "song";
export type PostVisibility = "public" | "private" | "followers_only" | "friends_only";

export interface PostStats {
  likeCount: number;
  commentCount: number;
  repostCount: number;
  viewCount: number;
}

export interface Post {
  id: string;
  authorId: string;
  type: PostType;
  content: string | null;
  mediaIds: string[];
  tags?: string[];
  visibility: PostVisibility;
  stats: PostStats;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

// Feed types
export type FeedFilterType = "user" | "post_type" | "tag" | "date";
export type FeedFilterOperator = "include" | "exclude";

export interface FeedFilter {
  type: FeedFilterType;
  operator: FeedFilterOperator;
  value: string[];
}

export interface CustomFeed {
  id: string;
  userId: string;
  name: string;
  filters: FeedFilter[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FeedAlgorithm {
  blocks: FeedBlock[];
}

export interface FeedBlock {
  id: string;
  type: "filter" | "sort" | "limit";
  config: Record<string, unknown>;
  order: number;
}

// Profile types
export type ProfileVisibility = "public" | "private" | "followers_only";

export interface UserProfile {
  userId: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  visibility: ProfileVisibility;
  customStyles: ProfileStyles | null;
}

export interface ProfileStyles {
  background?: {
    type: "color" | "gradient" | "image";
    value: string;
  };
  colors?: {
    primary?: string;
    secondary?: string;
    text?: string;
  };
  fonts?: {
    heading?: string;
    body?: string;
  };
  music?: {
    url: string;
    autoplay: boolean;
  };
}

// Social types
export type FriendshipStatus = "pending" | "accepted" | "rejected" | "blocked";

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

// Media types
export type MediaType = "image" | "video" | "audio";
export type MediaStatus = "pending" | "processing" | "ready" | "failed";

export interface Media {
  id: string;
  userId: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
  mimeType: string;
  status: MediaStatus;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Message types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  mediaIds?: string[];
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Conversation {
  id: string;
  participants: string[];
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Notification types
export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "friend_request"
  | "mention"
  | "repost";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string;
  targetId?: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

// Settings types
export interface AccountSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
}

export interface PrivacySettings {
  profileVisibility: ProfileVisibility;
  allowMessagesFrom: "everyone" | "followers" | "friends" | "nobody";
  allowTagging: boolean;
  showOnlineStatus: boolean;
}

// Pagination
export interface CursorPagination {
  cursor?: string;
  limit: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}
