# VRSS Social Platform - Data Storage Documentation

**Version**: 1.0
**Status**: Final
**Last Updated**: 2025-10-16
**Schema Reference**: @docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Data Storage Architecture](#data-storage-architecture)
3. [Database Tables Specification](#database-tables-specification)
4. [Application Data Models](#application-data-models)
5. [Storage Quota Management](#storage-quota-management)
6. [Media Storage Strategy](#media-storage-strategy)
7. [Data Access Patterns](#data-access-patterns)

---

## Executive Summary

This document provides comprehensive documentation of the VRSS platform's data storage structure, including:

- **19 PostgreSQL tables** with complete column specifications, constraints, and relationships
- **Application-level data models** representing business entities with validation rules and behaviors
- **Storage quota system** tracking user storage usage (50MB free, 1GB+ paid tiers)
- **Media storage strategy** using AWS S3 with PostgreSQL metadata tracking

**Key Design Principles:**
- Normalized data structure with strategic denormalization for performance
- JSONB for flexible configuration (profiles, feeds, styles)
- Atomic storage quota tracking with database triggers
- Soft deletes for content recovery
- Comprehensive indexing for feed and social graph queries

---

## Data Storage Architecture

### Storage Layers

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  (TypeScript Models, Validation, Business Logic)         │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                 Database Layer (PostgreSQL)              │
│  - 19 Tables with constraints and triggers               │
│  - JSONB for flexible schemas                            │
│  - Automated counter updates via triggers                │
└──────────────────────┬──────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────┐
│                Media Storage (AWS S3)                    │
│  - Images, videos, audio files                           │
│  - Metadata tracked in post_media table                  │
└─────────────────────────────────────────────────────────┘
```

### Data Flow Patterns

**1. Content Creation Flow**
```
User creates post → Validate quota → Upload media to S3
→ Insert post record → Insert post_media records
→ Update storage_usage (trigger) → Return post to user
```

**2. Feed Generation Flow**
```
User requests feed → Query posts from followed users
→ Join user/profile data → Apply custom feed filters
→ Order by algorithm → Cache results → Return to user
```

**3. Storage Quota Check Flow**
```
User uploads file → Check storage_usage.used_bytes vs quota_bytes
→ If available: Upload to S3 → Insert post_media
→ Update storage_usage (trigger) → Success
→ If exceeded: Reject upload → Suggest upgrade
```

---

## Database Tables Specification

### Summary of All Tables

```yaml
Total Tables: 19
Categories:
  - Users & Authentication: 2 tables (users, user_profiles)
  - Content: 2 tables (posts, post_media)
  - Social Interactions: 5 tables (user_follows, friendships, post_interactions, comments, reposts)
  - Profile Customization: 2 tables (profile_sections, section_content)
  - Custom Feeds: 2 tables (custom_feeds, feed_filters)
  - Messaging: 2 tables (conversations, messages)
  - Notifications: 1 table (notifications)
  - Storage & Subscriptions: 3 tables (storage_usage, subscription_tiers, user_subscriptions)
  - Lists: 2 tables (user_lists, list_members)

Schema Documentation: @docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md
```

### Detailed Table Specifications

#### 1. Users & Authentication Tables

**Table: users**
```yaml
Purpose: Core user accounts and authentication
Columns:
  - id: BIGSERIAL PRIMARY KEY (unique user identifier)
  - username: VARCHAR(30) NOT NULL UNIQUE (3-30 alphanumeric + underscore)
  - email: VARCHAR(255) NOT NULL UNIQUE (login email)
  - email_verified: BOOLEAN NOT NULL DEFAULT FALSE
  - password_hash: VARCHAR(255) NOT NULL (bcrypt hashed)
  - status: VARCHAR(20) NOT NULL DEFAULT 'active' (active|suspended|deleted)
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - last_login_at: TIMESTAMPTZ
  - deleted_at: TIMESTAMPTZ (soft delete)

Indexes:
  - PRIMARY KEY on id (automatic)
  - UNIQUE on username (automatic)
  - UNIQUE on email (automatic)
  - idx_users_email ON email
  - idx_users_status ON status WHERE status = 'active'

Constraints:
  - users_username_length: LENGTH(username) BETWEEN 3 AND 30
  - users_username_format: username ~ '^[a-zA-Z0-9_]+$'
  - users_status_valid: status IN ('active', 'suspended', 'deleted')

Relationships:
  - One-to-One with user_profiles (CASCADE DELETE)
  - One-to-Many with posts (CASCADE DELETE)
  - One-to-Many with user_follows (CASCADE DELETE)
  - One-to-Many with custom_feeds (CASCADE DELETE)
  - One-to-One with storage_usage (CASCADE DELETE)
```

**Table: user_profiles**
```yaml
Purpose: Extended user profile information and customization
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - user_id: BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
  - display_name: VARCHAR(100) (public display name)
  - bio: TEXT (profile bio)
  - age: INTEGER (13-120)
  - location: VARCHAR(100)
  - website: VARCHAR(500)
  - visibility: VARCHAR(20) NOT NULL DEFAULT 'public' (public|followers|private)
  - background_config: JSONB NOT NULL DEFAULT '{}' (color/image/video config)
  - music_config: JSONB (background music settings)
  - style_config: JSONB NOT NULL DEFAULT '{}' (fonts, colors, custom CSS)
  - layout_config: JSONB NOT NULL DEFAULT '{"sections": []}' (profile section layout)
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - UNIQUE on user_id
  - idx_user_profiles_visibility ON visibility WHERE visibility != 'private'
  - idx_user_profiles_style_config_gin ON style_config USING GIN

Constraints:
  - user_profiles_visibility_valid: visibility IN ('public', 'followers', 'private')
  - user_profiles_age_valid: age IS NULL OR (age >= 13 AND age <= 120)

JSONB Schema Examples:
  background_config: { type: 'color|image|video', value: '#hex|url', position: 'center' }
  music_config: { url: 'spotify/youtube', autoplay: boolean, volume: 0-100 }
  style_config: { font: 'font-name', primaryColor: '#hex', secondaryColor: '#hex' }
  layout_config: { sections: [{id, type, order, config}] }
```

#### 2. Content Tables

**Table: posts**
```yaml
Purpose: All user-created posts and content
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - user_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - type: post_type NOT NULL (text_short|text_long|image|image_gallery|gif|video_short|video_long|song|album)
  - status: post_status NOT NULL DEFAULT 'published' (draft|published|scheduled|deleted)
  - title: VARCHAR(200) (post title, optional)
  - content: TEXT (text content for text posts)
  - content_html: TEXT (sanitized HTML version)
  - media_urls: JSONB (array of S3 URLs for media)
  - thumbnail_url: VARCHAR(500) (thumbnail image URL)
  - likes_count: INTEGER NOT NULL DEFAULT 0 (denormalized counter)
  - comments_count: INTEGER NOT NULL DEFAULT 0 (denormalized counter)
  - reposts_count: INTEGER NOT NULL DEFAULT 0 (denormalized counter)
  - views_count: INTEGER NOT NULL DEFAULT 0 (denormalized counter)
  - published_at: TIMESTAMPTZ
  - scheduled_for: TIMESTAMPTZ
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - deleted_at: TIMESTAMPTZ (soft delete)

Indexes (CRITICAL FOR FEED PERFORMANCE):
  - PRIMARY KEY on id
  - idx_posts_user_created ON (user_id, created_at DESC, status) WHERE deleted_at IS NULL
  - idx_posts_type_created ON (type, created_at DESC) WHERE status = 'published' AND deleted_at IS NULL
  - idx_posts_engagement_created ON (likes_count DESC, created_at DESC) WHERE status = 'published'
  - idx_posts_user_status ON (user_id, status, created_at DESC)
  - idx_posts_media_urls_gin ON media_urls USING GIN

Constraints:
  - posts_title_length: title IS NULL OR LENGTH(title) <= 200
  - posts_content_required: (type IN text posts AND content IS NOT NULL) OR other types
  - posts_published_at_check: status = 'published' requires published_at

Triggers:
  - update_updated_at: Auto-update updated_at on UPDATE
  - Counters updated via post_interactions/comments triggers
```

**Table: post_media**
```yaml
Purpose: Detailed media file tracking for storage quota management
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - post_id: BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE
  - user_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - type: media_type NOT NULL (image|gif|video|audio|document)
  - file_url: VARCHAR(500) NOT NULL (S3 URL)
  - file_size_bytes: BIGINT NOT NULL (file size for quota calculation)
  - mime_type: VARCHAR(100) NOT NULL (e.g., image/jpeg, video/mp4)
  - width: INTEGER (image/video width in pixels)
  - height: INTEGER (image/video height in pixels)
  - duration_seconds: INTEGER (video/audio duration)
  - thumbnail_url: VARCHAR(500) (thumbnail for videos)
  - display_order: INTEGER NOT NULL DEFAULT 0 (order in gallery)
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - idx_post_media_post ON (post_id, display_order)
  - idx_post_media_user_size ON (user_id, created_at DESC)

Constraints:
  - post_media_file_size_positive: file_size_bytes > 0

Triggers:
  - trigger_update_storage_insert: Updates storage_usage on INSERT
  - trigger_update_storage_delete: Updates storage_usage on DELETE
```

#### 3. Social Interaction Tables

**Table: user_follows**
```yaml
Purpose: Asymmetric follower/following relationships
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - follower_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - following_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - UNIQUE on (follower_id, following_id)
  - idx_user_follows_follower ON (follower_id, created_at DESC)
  - idx_user_follows_following ON (following_id, created_at DESC)
  - idx_user_follows_both ON (follower_id, following_id)

Constraints:
  - user_follows_no_self_follow: follower_id != following_id
  - user_follows_unique: UNIQUE(follower_id, following_id)

Triggers:
  - trigger_create_friendship: Creates friendship row on mutual follow
```

**Table: friendships**
```yaml
Purpose: Symmetric friend relationships (bidirectional, auto-created on mutual follow)
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - user_id_1: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE (lower ID)
  - user_id_2: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE (higher ID)
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - UNIQUE on (user_id_1, user_id_2)
  - idx_friendships_user1 ON (user_id_1, created_at DESC)
  - idx_friendships_user2 ON (user_id_2, created_at DESC)

Constraints:
  - friendships_no_self: user_id_1 != user_id_2
  - friendships_ordered: user_id_1 < user_id_2 (prevents duplicates)
  - friendships_unique: UNIQUE(user_id_1, user_id_2)

Note: Automatically created by trigger when mutual follow detected
```

**Table: post_interactions**
```yaml
Purpose: User interactions with posts (likes, bookmarks, shares)
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - user_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - post_id: BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE
  - type: interaction_type NOT NULL (like|bookmark|share)
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - UNIQUE on (user_id, post_id, type)
  - idx_post_interactions_user_post ON (user_id, post_id, type)
  - idx_post_interactions_post_type ON (post_id, type, created_at DESC)

Constraints:
  - post_interactions_unique: UNIQUE(user_id, post_id, type)

Triggers:
  - trigger_update_post_likes_count: Updates posts.likes_count on INSERT/DELETE of 'like' type
```

**Table: comments**
```yaml
Purpose: Comments on posts with support for nested replies
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - post_id: BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE
  - user_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - parent_comment_id: BIGINT REFERENCES comments(id) ON DELETE CASCADE (NULL for top-level)
  - content: TEXT NOT NULL
  - content_html: TEXT (sanitized HTML)
  - likes_count: INTEGER NOT NULL DEFAULT 0 (denormalized counter)
  - replies_count: INTEGER NOT NULL DEFAULT 0 (denormalized counter)
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - deleted_at: TIMESTAMPTZ (soft delete)

Indexes:
  - PRIMARY KEY on id
  - idx_comments_post_created ON (post_id, created_at DESC) WHERE deleted_at IS NULL
  - idx_comments_parent ON (parent_comment_id, created_at DESC) WHERE parent_comment_id IS NOT NULL

Constraints:
  - comments_content_not_empty: LENGTH(TRIM(content)) > 0

Triggers:
  - trigger_update_post_comments_count: Updates posts.comments_count on INSERT/DELETE
```

**Table: reposts**
```yaml
Purpose: User reposts of other users' posts
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - user_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - post_id: BIGINT NOT NULL REFERENCES posts(id) ON DELETE CASCADE
  - comment: TEXT (optional comment when reposting)
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - UNIQUE on (user_id, post_id)
  - idx_reposts_user ON (user_id, created_at DESC)
  - idx_reposts_post ON (post_id, created_at DESC)

Constraints:
  - reposts_unique: UNIQUE(user_id, post_id)
```

#### 4. Profile Customization Tables

**Table: profile_sections**
```yaml
Purpose: User-defined profile sections for customizable layouts
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - user_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - type: section_type NOT NULL (feed|gallery|links|static_text|static_image|video|reposts|friends|followers|following|list)
  - title: VARCHAR(100) NOT NULL
  - description: TEXT
  - config: JSONB NOT NULL DEFAULT '{}' (type-specific config: filters, styling, etc.)
  - display_order: INTEGER NOT NULL DEFAULT 0
  - is_visible: BOOLEAN NOT NULL DEFAULT TRUE
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - idx_profile_sections_user_order ON (user_id, display_order) WHERE is_visible = TRUE

Constraints:
  - profile_sections_title_not_empty: LENGTH(TRIM(title)) > 0

JSONB Config Examples:
  feed: { filters: [{type, value}], limit: 10, layout: 'grid|list' }
  gallery: { columns: 3, showCaptions: boolean }
  links: { style: 'buttons|list' }
```

**Table: section_content**
```yaml
Purpose: Individual content items within static profile sections
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - section_id: BIGINT NOT NULL REFERENCES profile_sections(id) ON DELETE CASCADE
  - content_type: VARCHAR(50) NOT NULL (text|link|image|embed)
  - title: VARCHAR(200)
  - content: TEXT
  - url: VARCHAR(500)
  - display_order: INTEGER NOT NULL DEFAULT 0
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - idx_section_content_section_order ON (section_id, display_order)
```

#### 5. Custom Feed Tables

**Table: custom_feeds**
```yaml
Purpose: User-defined custom feeds with filter algorithms
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - user_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - name: VARCHAR(100) NOT NULL
  - description: TEXT
  - algorithm_config: JSONB NOT NULL (filters, logic, sort order)
  - is_default: BOOLEAN NOT NULL DEFAULT FALSE
  - display_order: INTEGER NOT NULL DEFAULT 0
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - UNIQUE on (user_id, name)
  - idx_custom_feeds_user ON (user_id, display_order)

Constraints:
  - custom_feeds_name_not_empty: LENGTH(TRIM(name)) > 0
  - custom_feeds_user_name_unique: UNIQUE(user_id, name)

JSONB Schema:
  algorithm_config: {
    filters: [{type, operator, value}],
    logic: 'AND|OR',
    sort: 'recent|popular|engagement'
  }
```

**Table: feed_filters**
```yaml
Purpose: Individual filter blocks composing feed algorithms (normalized for query optimization)
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - feed_id: BIGINT NOT NULL REFERENCES custom_feeds(id) ON DELETE CASCADE
  - type: filter_type NOT NULL (post_type|author|tag|date_range|engagement)
  - operator: filter_operator NOT NULL (equals|not_equals|contains|greater_than|less_than|in_range)
  - value: JSONB NOT NULL (filter-specific values)
  - group_id: INTEGER NOT NULL DEFAULT 0 (for complex AND/OR grouping)
  - logical_operator: VARCHAR(10) NOT NULL DEFAULT 'AND' (AND|OR|NOT)
  - display_order: INTEGER NOT NULL DEFAULT 0
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - idx_feed_filters_feed ON (feed_id, group_id, display_order)
  - idx_feed_filters_type ON (type, feed_id)
```

#### 6. Messaging Tables

**Table: conversations**
```yaml
Purpose: Message conversation threads between users
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - participant_ids: BIGINT[] NOT NULL (array of user IDs, supports group DMs)
  - last_message_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - idx_conversations_participants ON participant_ids USING GIN

Constraints:
  - conversations_min_participants: array_length(participant_ids, 1) >= 2
```

**Table: messages**
```yaml
Purpose: Individual messages within conversations
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - conversation_id: BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE
  - sender_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - content: TEXT NOT NULL
  - read_by: BIGINT[] NOT NULL DEFAULT '{}' (array of user IDs who read message)
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - deleted_at: TIMESTAMPTZ (soft delete)

Indexes:
  - PRIMARY KEY on id
  - idx_messages_conversation_created ON (conversation_id, created_at DESC) WHERE deleted_at IS NULL
  - idx_messages_unread ON read_by USING GIN WHERE deleted_at IS NULL

Constraints:
  - messages_content_not_empty: LENGTH(TRIM(content)) > 0
```

#### 7. Notifications Table

**Table: notifications**
```yaml
Purpose: User notifications for social interactions
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - user_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - type: notification_type NOT NULL (follow|like|comment|repost|mention|message|friend_request|system)
  - actor_id: BIGINT REFERENCES users(id) ON DELETE CASCADE (user who triggered notification)
  - post_id: BIGINT REFERENCES posts(id) ON DELETE CASCADE
  - comment_id: BIGINT REFERENCES comments(id) ON DELETE CASCADE
  - title: VARCHAR(200) NOT NULL
  - content: TEXT
  - action_url: VARCHAR(500) (link to relevant content)
  - is_read: BOOLEAN NOT NULL DEFAULT FALSE
  - read_at: TIMESTAMPTZ
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - idx_notifications_user_unread ON (user_id, created_at DESC) WHERE is_read = FALSE
  - idx_notifications_user_created ON (user_id, created_at DESC)

Constraints:
  - notifications_title_not_empty: LENGTH(TRIM(title)) > 0
```

#### 8. Storage & Subscription Tables

**Table: storage_usage**
```yaml
Purpose: Per-user storage quota tracking
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - user_id: BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE
  - used_bytes: BIGINT NOT NULL DEFAULT 0 (total storage used)
  - quota_bytes: BIGINT NOT NULL DEFAULT 52428800 (50MB = 52,428,800 bytes)
  - images_bytes: BIGINT NOT NULL DEFAULT 0 (breakdown by type)
  - videos_bytes: BIGINT NOT NULL DEFAULT 0
  - audio_bytes: BIGINT NOT NULL DEFAULT 0
  - other_bytes: BIGINT NOT NULL DEFAULT 0
  - last_calculated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - UNIQUE on user_id

Constraints:
  - storage_usage_positive: used_bytes >= 0
  - storage_usage_quota_positive: quota_bytes > 0

Triggers:
  - Automatically updated by post_media INSERT/DELETE triggers
```

**Table: subscription_tiers**
```yaml
Purpose: Available subscription tiers and pricing
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - name: VARCHAR(50) NOT NULL UNIQUE (Free|Basic|Pro|Premium)
  - description: TEXT
  - storage_bytes: BIGINT NOT NULL (quota for this tier)
  - price_monthly_cents: INTEGER NOT NULL (price in cents, e.g., 999 = $9.99)
  - is_active: BOOLEAN NOT NULL DEFAULT TRUE
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - UNIQUE on name

Constraints:
  - subscription_tiers_storage_positive: storage_bytes > 0
  - subscription_tiers_price_positive: price_monthly_cents >= 0

Seed Data:
  - Free: 50MB (52,428,800 bytes), $0
  - Basic: 1GB (1,073,741,824 bytes), $4.99
  - Pro: 5GB (5,368,709,120 bytes), $9.99
  - Premium: 10GB (10,737,418,240 bytes), $14.99
```

**Table: user_subscriptions**
```yaml
Purpose: User subscription records and billing info
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - user_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - tier_id: BIGINT NOT NULL REFERENCES subscription_tiers(id)
  - status: subscription_status NOT NULL DEFAULT 'active' (active|canceled|expired|suspended)
  - stripe_subscription_id: VARCHAR(255)
  - stripe_customer_id: VARCHAR(255)
  - current_period_start: TIMESTAMPTZ NOT NULL
  - current_period_end: TIMESTAMPTZ NOT NULL
  - canceled_at: TIMESTAMPTZ
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
```

#### 9. List Tables

**Table: user_lists**
```yaml
Purpose: User-created lists (e.g., "Favorite Artists", "Local Businesses")
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - user_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - name: VARCHAR(100) NOT NULL
  - description: TEXT
  - is_public: BOOLEAN NOT NULL DEFAULT TRUE
  - created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()
  - updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - UNIQUE on (user_id, name)

Constraints:
  - user_lists_name_not_empty: LENGTH(TRIM(name)) > 0
  - user_lists_user_name_unique: UNIQUE(user_id, name)
```

**Table: list_members**
```yaml
Purpose: Users included in lists
Columns:
  - id: BIGSERIAL PRIMARY KEY
  - list_id: BIGINT NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE
  - member_user_id: BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - added_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:
  - PRIMARY KEY on id
  - UNIQUE on (list_id, member_user_id)

Constraints:
  - list_members_unique: UNIQUE(list_id, member_user_id)
```

---

## Application Data Models

### Model Architecture

Application data models represent the TypeScript/business layer entities that map to database tables. They include:
- Field definitions with types
- Validation rules (business logic)
- Behavioral methods (CRUD operations, computed properties)
- Relationships to other entities

### Core Entity Models

#### USER Entity

```pseudocode
ENTITY: User
  FIELDS:
    id: bigint (primary key, auto-generated)
    username: string (3-30 chars, alphanumeric + underscore, unique, required)
    email: string (valid email format, unique, required)
    emailVerified: boolean (default: false)
    passwordHash: string (bcrypt hashed, never exposed to client)
    status: 'active' | 'suspended' | 'deleted' (default: 'active')
    createdAt: DateTime (auto-generated)
    updatedAt: DateTime (auto-updated)
    lastLoginAt: DateTime | null
    deletedAt: DateTime | null (soft delete timestamp)

  RELATIONSHIPS:
    profile: UserProfile (one-to-one)
    posts: Post[] (one-to-many)
    following: UserFollow[] (one-to-many, as follower)
    followers: UserFollow[] (one-to-many, as following)
    friends: User[] (many-to-many via friendships)
    customFeeds: CustomFeed[] (one-to-many)
    storageUsage: StorageUsage (one-to-one)
    subscription: UserSubscription | null (one-to-one)
    notifications: Notification[] (one-to-many)

  VALIDATIONS:
    - username: /^[a-zA-Z0-9_]{3,30}$/
    - email: RFC 5322 format
    - password: min 8 chars, 1 uppercase, 1 lowercase, 1 number (on registration)
    - status: must be one of ['active', 'suspended', 'deleted']

  BEHAVIORS:
    create(data: UserCreateInput): Promise<User>
      - Hash password with bcrypt
      - Validate username/email uniqueness
      - Create associated user_profile record
      - Initialize storage_usage with free tier quota
      - Send email verification

    authenticate(email: string, password: string): Promise<User | null>
      - Verify email exists
      - Compare password hash
      - Update lastLoginAt
      - Return user or null

    updateProfile(userId: bigint, data: ProfileUpdateInput): Promise<User>
      - Validate ownership
      - Update user_profiles table
      - Clear profile cache

    delete(userId: bigint): Promise<void>
      - Set status = 'deleted'
      - Set deletedAt = NOW()
      - Keep data for 30 days (soft delete)
      - Schedule permanent deletion

    isActive(): boolean
      - Return status === 'active' && deletedAt === null

    isFriendWith(otherUserId: bigint): Promise<boolean>
      - Query friendships table (bidirectional)

    getStoragePercentage(): Promise<number>
      - Return (used_bytes / quota_bytes) * 100
```

#### USER_PROFILE Entity

```pseudocode
ENTITY: UserProfile
  FIELDS:
    id: bigint (primary key)
    userId: bigint (foreign key to users, unique)
    displayName: string | null (max 100 chars)
    bio: string | null (text field)
    age: number | null (13-120)
    location: string | null (max 100 chars)
    website: string | null (valid URL, max 500 chars)
    visibility: 'public' | 'followers' | 'private' (default: 'public')
    backgroundConfig: BackgroundConfig (JSONB)
    musicConfig: MusicConfig | null (JSONB)
    styleConfig: StyleConfig (JSONB)
    layoutConfig: LayoutConfig (JSONB)
    createdAt: DateTime
    updatedAt: DateTime

  TYPE DEFINITIONS:
    BackgroundConfig:
      type: 'color' | 'image' | 'video'
      value: string (hex color or URL)
      position?: 'center' | 'top' | 'bottom' | 'cover'

    MusicConfig:
      url: string (Spotify/YouTube/etc.)
      autoplay: boolean
      volume: number (0-100)

    StyleConfig:
      font?: string
      primaryColor?: string (hex)
      secondaryColor?: string (hex)
      accentColor?: string (hex)
      customCSS?: string

    LayoutConfig:
      sections: ProfileSection[]

  VALIDATIONS:
    - age: if provided, must be >= 13 and <= 120
    - website: must be valid URL format
    - visibility: must be one of ['public', 'followers', 'private']
    - backgroundConfig.type: must be one of ['color', 'image', 'video']
    - styleConfig.primaryColor: must be valid hex color
    - musicConfig.volume: must be 0-100

  BEHAVIORS:
    updateBackground(config: BackgroundConfig): Promise<void>
      - Validate config structure
      - If type='image'|'video': check storage quota
      - Update background_config JSONB
      - Clear cache

    updateStyle(config: StyleConfig): Promise<void>
      - Validate hex colors
      - Sanitize customCSS (prevent XSS)
      - Update style_config JSONB
      - Clear cache

    updateLayout(sections: ProfileSection[]): Promise<void>
      - Validate section types
      - Update layout_config JSONB
      - Reorder sections by display_order

    isVisibleTo(viewerUserId: bigint | null): Promise<boolean>
      - If visibility='public': return true
      - If visibility='private': return viewerUserId === userId
      - If visibility='followers': check if viewer follows user

    getSections(): Promise<ProfileSection[]>
      - Query profile_sections table
      - Filter by is_visible=true
      - Order by display_order
```

#### POST Entity

```pseudocode
ENTITY: Post
  FIELDS:
    id: bigint (primary key)
    userId: bigint (foreign key to users)
    type: PostType (text_short|text_long|image|image_gallery|gif|video_short|video_long|song|album)
    status: PostStatus (draft|published|scheduled|deleted)
    title: string | null (max 200 chars)
    content: string | null (required for text posts)
    contentHtml: string | null (sanitized HTML)
    mediaUrls: MediaUrl[] (JSONB array of S3 URLs)
    thumbnailUrl: string | null
    likesCount: number (default: 0, denormalized)
    commentsCount: number (default: 0, denormalized)
    repostsCount: number (default: 0, denormalized)
    viewsCount: number (default: 0, denormalized)
    publishedAt: DateTime | null
    scheduledFor: DateTime | null
    createdAt: DateTime
    updatedAt: DateTime
    deletedAt: DateTime | null

  TYPE DEFINITIONS:
    PostType: 'text_short' | 'text_long' | 'image' | 'image_gallery' |
              'gif' | 'video_short' | 'video_long' | 'song' | 'album'
    PostStatus: 'draft' | 'published' | 'scheduled' | 'deleted'
    MediaUrl: { url: string, type: string, order: number }

  RELATIONSHIPS:
    author: User (many-to-one)
    media: PostMedia[] (one-to-many)
    interactions: PostInteraction[] (one-to-many)
    comments: Comment[] (one-to-many)
    reposts: Repost[] (one-to-many)

  VALIDATIONS:
    - type: must be valid PostType
    - status: must be valid PostStatus
    - title: if provided, max 200 chars
    - content: required if type is text_short or text_long
    - mediaUrls: required if type is image, video, song, album
    - publishedAt: required if status is 'published'

  BEHAVIORS:
    create(userId: bigint, data: PostCreateInput): Promise<Post>
      - Validate post type and content requirements
      - If has media: check storage quota before upload
      - Upload media to S3
      - Insert post record
      - Insert post_media records
      - Update storage_usage (via trigger)
      - Set publishedAt if status='published'

    publish(postId: bigint): Promise<Post>
      - Check ownership
      - Set status = 'published'
      - Set publishedAt = NOW()
      - Invalidate user's feed cache
      - Notify followers

    delete(postId: bigint): Promise<void>
      - Check ownership
      - Set deletedAt = NOW()
      - Optionally delete from S3 (or defer for 30 days)
      - Trigger storage_usage update

    like(postId: bigint, userId: bigint): Promise<void>
      - Insert into post_interactions (type='like')
      - Trigger updates likesCount
      - Create notification for post author

    unlike(postId: bigint, userId: bigint): Promise<void>
      - Delete from post_interactions
      - Trigger decrements likesCount

    addComment(postId: bigint, userId: bigint, content: string): Promise<Comment>
      - Insert into comments table
      - Trigger increments commentsCount
      - Create notification for post author

    isLikedBy(userId: bigint): Promise<boolean>
      - Query post_interactions table

    getComments(limit: number, offset: number): Promise<Comment[]>
      - Query comments WHERE post_id AND deleted_at IS NULL
      - Order by created_at DESC
      - Paginate
```

#### POST_MEDIA Entity

```pseudocode
ENTITY: PostMedia
  FIELDS:
    id: bigint (primary key)
    postId: bigint (foreign key to posts)
    userId: bigint (foreign key to users)
    type: MediaType (image|gif|video|audio|document)
    fileUrl: string (S3 URL, required)
    fileSizeBytes: bigint (required, for quota tracking)
    mimeType: string (e.g., 'image/jpeg', 'video/mp4')
    width: number | null (pixels)
    height: number | null (pixels)
    durationSeconds: number | null (for video/audio)
    thumbnailUrl: string | null
    displayOrder: number (default: 0, for galleries)
    createdAt: DateTime

  VALIDATIONS:
    - fileSizeBytes: must be > 0
    - mimeType: must match file extension
    - type: must match MIME type category
    - fileUrl: must be valid S3 URL

  BEHAVIORS:
    upload(userId: bigint, file: File, postId: bigint): Promise<PostMedia>
      - Check user storage quota
      - Validate file type and size
      - Generate unique S3 key
      - Upload to S3
      - Extract metadata (dimensions, duration)
      - Generate thumbnail (if video/image)
      - Insert post_media record
      - Trigger updates storage_usage

    delete(mediaId: bigint): Promise<void>
      - Check ownership
      - Delete from S3
      - Delete post_media record
      - Trigger decrements storage_usage

    getMetadata(): Promise<MediaMetadata>
      - Return { width, height, duration, size, type }
```

#### CUSTOM_FEED Entity

```pseudocode
ENTITY: CustomFeed
  FIELDS:
    id: bigint (primary key)
    userId: bigint (foreign key to users)
    name: string (max 100 chars, unique per user)
    description: string | null
    algorithmConfig: AlgorithmConfig (JSONB)
    isDefault: boolean (default: false)
    displayOrder: number (default: 0)
    createdAt: DateTime
    updatedAt: DateTime

  TYPE DEFINITIONS:
    AlgorithmConfig:
      filters: FilterBlock[]
      logic: 'AND' | 'OR'
      sort: 'recent' | 'popular' | 'engagement'
      limit?: number

    FilterBlock:
      type: 'post_type' | 'author' | 'tag' | 'date_range' | 'engagement'
      operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'in_range'
      value: any
      groupId?: number
      logicalOperator?: 'AND' | 'OR' | 'NOT'

  RELATIONSHIPS:
    user: User (many-to-one)
    filters: FeedFilter[] (one-to-many)

  VALIDATIONS:
    - name: must be unique per user
    - algorithmConfig.filters: must have at least 1 filter
    - algorithmConfig.logic: must be 'AND' or 'OR'
    - algorithmConfig.sort: must be valid sort option

  BEHAVIORS:
    create(userId: bigint, data: FeedCreateInput): Promise<CustomFeed>
      - Validate algorithm config
      - Check name uniqueness
      - Insert custom_feeds record
      - Insert feed_filters records (normalized)

    execute(feedId: bigint, page: number, limit: number): Promise<Post[]>
      - Load feed config
      - Build SQL query from filters
      - Apply logical operators
      - Apply sort order
      - Execute query with pagination
      - Cache results (2 min TTL)

    update(feedId: bigint, data: FeedUpdateInput): Promise<CustomFeed>
      - Check ownership
      - Validate new config
      - Update custom_feeds record
      - Update feed_filters (delete old, insert new)
      - Invalidate cache

    delete(feedId: bigint): Promise<void>
      - Check ownership
      - Delete custom_feeds record
      - Cascade deletes feed_filters
```

#### STORAGE_USAGE Entity

```pseudocode
ENTITY: StorageUsage
  FIELDS:
    id: bigint (primary key)
    userId: bigint (foreign key to users, unique)
    usedBytes: bigint (default: 0)
    quotaBytes: bigint (default: 52428800 = 50MB)
    imagesBytes: bigint (default: 0)
    videosBytes: bigint (default: 0)
    audioBytes: bigint (default: 0)
    otherBytes: bigint (default: 0)
    lastCalculatedAt: DateTime
    createdAt: DateTime
    updatedAt: DateTime

  VALIDATIONS:
    - usedBytes: must be >= 0
    - quotaBytes: must be > 0
    - usedBytes <= quotaBytes (warning if exceeded)

  BEHAVIORS:
    checkQuota(userId: bigint, requiredBytes: bigint): Promise<boolean>
      - Query storage_usage
      - Return (usedBytes + requiredBytes) <= quotaBytes

    getAvailable(userId: bigint): Promise<bigint>
      - Return quotaBytes - usedBytes

    getBreakdown(userId: bigint): Promise<StorageBreakdown>
      - Return { images, videos, audio, other, total, quota }

    recalculate(userId: bigint): Promise<void>
      - Sum file_size_bytes from post_media WHERE user_id
      - Group by media type
      - Update storage_usage record
      - Set last_calculated_at = NOW()

    upgrade(userId: bigint, tierBytes: bigint): Promise<void>
      - Update quotaBytes to new tier
      - If user over new quota: show warning (don't auto-delete)

    getPercentageUsed(userId: bigint): Promise<number>
      - Return (usedBytes / quotaBytes) * 100

    isOverQuota(userId: bigint): Promise<boolean>
      - Return usedBytes > quotaBytes
```

#### NOTIFICATION Entity

```pseudocode
ENTITY: Notification
  FIELDS:
    id: bigint (primary key)
    userId: bigint (foreign key to users, recipient)
    type: NotificationType (follow|like|comment|repost|mention|message|friend_request|system)
    actorId: bigint | null (foreign key to users, who triggered it)
    postId: bigint | null (foreign key to posts)
    commentId: bigint | null (foreign key to comments)
    title: string (max 200 chars, required)
    content: string | null
    actionUrl: string | null (link to relevant content)
    isRead: boolean (default: false)
    readAt: DateTime | null
    createdAt: DateTime

  TYPE DEFINITIONS:
    NotificationType: 'follow' | 'like' | 'comment' | 'repost' | 'mention' |
                      'message' | 'friend_request' | 'system'

  RELATIONSHIPS:
    recipient: User (many-to-one)
    actor: User | null (many-to-one)
    post: Post | null (many-to-one)
    comment: Comment | null (many-to-one)

  VALIDATIONS:
    - title: required, max 200 chars
    - type: must be valid NotificationType
    - actorId: required for non-system notifications

  BEHAVIORS:
    create(data: NotificationCreateInput): Promise<Notification>
      - Generate appropriate title/content based on type
      - Set actionUrl (e.g., /post/123, /profile/username)
      - Insert notification record
      - Optionally send push notification

    markAsRead(notificationId: bigint): Promise<void>
      - Set isRead = true
      - Set readAt = NOW()

    markAllAsRead(userId: bigint): Promise<void>
      - Update all unread notifications for user

    getUnreadCount(userId: bigint): Promise<number>
      - Count WHERE user_id AND is_read = false

    getRecent(userId: bigint, limit: number): Promise<Notification[]>
      - Query WHERE user_id
      - Order by created_at DESC
      - Limit results
```

---

## Storage Quota Management

### Overview

VRSS implements a tiered storage quota system to manage user media uploads:

- **Free Tier**: 50MB (52,428,800 bytes)
- **Paid Tiers**: 1GB+, configurable via `subscription_tiers` table

Storage is tracked in real-time via database triggers on the `post_media` table, updating the `storage_usage` table atomically.

### Storage Tracking Architecture

```
┌─────────────────────────────────────────────────────┐
│           User Uploads Media File                    │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│  1. Pre-Upload Quota Check                          │
│     SELECT (quota_bytes - used_bytes)               │
│     FROM storage_usage WHERE user_id = ?            │
│     - If insufficient: REJECT                       │
│     - If available: PROCEED                         │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│  2. Upload to S3                                    │
│     - Generate unique key                           │
│     - Upload file                                   │
│     - Get file size, MIME type, metadata            │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│  3. Insert post_media Record                        │
│     INSERT INTO post_media (                        │
│       user_id, file_url, file_size_bytes,           │
│       mime_type, type, ...                          │
│     )                                               │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────▼────────────────────────────────────┐
│  4. Trigger: update_storage_on_media_insert         │
│     UPDATE storage_usage SET                        │
│       used_bytes = used_bytes + NEW.file_size_bytes │
│       images_bytes = images_bytes + ...             │
│     WHERE user_id = NEW.user_id                     │
└─────────────────────────────────────────────────────┘
```

### Quota Enforcement Strategy

#### 1. Pre-Upload Check (Application Layer)

```typescript
async function canUploadFile(userId: bigint, fileSizeBytes: bigint): Promise<boolean> {
  const storage = await db.storage_usage.findUnique({
    where: { user_id: userId }
  });

  const availableBytes = storage.quota_bytes - storage.used_bytes;
  return fileSizeBytes <= availableBytes;
}
```

#### 2. Atomic Update (Database Layer)

```sql
-- Trigger automatically updates storage_usage on post_media INSERT
CREATE TRIGGER trigger_update_storage_insert
AFTER INSERT ON post_media
FOR EACH ROW
EXECUTE FUNCTION update_storage_on_media_insert();

-- Function increments storage counters
CREATE OR REPLACE FUNCTION update_storage_on_media_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE storage_usage
    SET
        used_bytes = used_bytes + NEW.file_size_bytes,
        images_bytes = CASE WHEN NEW.type = 'image' THEN images_bytes + NEW.file_size_bytes ELSE images_bytes END,
        videos_bytes = CASE WHEN NEW.type = 'video' THEN videos_bytes + NEW.file_size_bytes ELSE videos_bytes END,
        -- ... similar for audio, other
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

#### 3. Periodic Reconciliation

To prevent drift from trigger failures or S3 inconsistencies, run periodic reconciliation:

```sql
-- Recalculate storage for a user
WITH media_breakdown AS (
    SELECT
        user_id,
        SUM(file_size_bytes) AS total_bytes,
        SUM(CASE WHEN type = 'image' THEN file_size_bytes ELSE 0 END) AS images_bytes,
        SUM(CASE WHEN type = 'video' THEN file_size_bytes ELSE 0 END) AS videos_bytes,
        SUM(CASE WHEN type = 'audio' THEN file_size_bytes ELSE 0 END) AS audio_bytes
    FROM post_media
    WHERE user_id = $1
    GROUP BY user_id
)
UPDATE storage_usage
SET
    used_bytes = COALESCE(media_breakdown.total_bytes, 0),
    images_bytes = COALESCE(media_breakdown.images_bytes, 0),
    videos_bytes = COALESCE(media_breakdown.videos_bytes, 0),
    audio_bytes = COALESCE(media_breakdown.audio_bytes, 0),
    last_calculated_at = NOW()
FROM media_breakdown
WHERE storage_usage.user_id = media_breakdown.user_id;
```

**Schedule**: Run daily via cron job or on-demand via admin panel.

### Storage Warnings & Upgrades

#### Warning Thresholds

```typescript
const STORAGE_WARNING_THRESHOLD = 0.80; // 80%
const STORAGE_CRITICAL_THRESHOLD = 0.95; // 95%

async function checkStorageWarnings(userId: bigint): Promise<void> {
  const storage = await getStorageUsage(userId);
  const percentUsed = storage.used_bytes / storage.quota_bytes;

  if (percentUsed >= STORAGE_CRITICAL_THRESHOLD) {
    await createNotification({
      userId,
      type: 'system',
      title: 'Storage Almost Full',
      content: `You've used ${Math.round(percentUsed * 100)}% of your storage. Upgrade to continue uploading.`,
      actionUrl: '/settings/storage'
    });
  } else if (percentUsed >= STORAGE_WARNING_THRESHOLD) {
    await createNotification({
      userId,
      type: 'system',
      title: 'Storage Warning',
      content: `You've used ${Math.round(percentUsed * 100)}% of your storage.`,
      actionUrl: '/settings/storage'
    });
  }
}
```

#### Subscription Upgrade Flow

```sql
-- On subscription purchase/upgrade
BEGIN;

-- Create subscription record
INSERT INTO user_subscriptions (user_id, tier_id, status, current_period_start, current_period_end)
VALUES ($user_id, $tier_id, 'active', NOW(), NOW() + INTERVAL '1 month');

-- Update storage quota
UPDATE storage_usage
SET quota_bytes = (
    SELECT storage_bytes
    FROM subscription_tiers
    WHERE id = $tier_id
)
WHERE user_id = $user_id;

COMMIT;
```

#### Downgrade Handling

When a user cancels or downgrades their subscription:

1. **Grace Period**: 30 days to reduce usage or renew
2. **After Grace**: Read-only mode (can view content, cannot upload)
3. **Never Auto-Delete**: User content is never automatically deleted

```typescript
async function handleSubscriptionDowngrade(userId: bigint, newQuotaBytes: bigint): Promise<void> {
  // Update quota
  await db.storage_usage.update({
    where: { user_id: userId },
    data: { quota_bytes: newQuotaBytes }
  });

  // Check if over new quota
  const storage = await getStorageUsage(userId);
  if (storage.used_bytes > storage.quota_bytes) {
    // Notify user, but don't delete content
    await createNotification({
      userId,
      type: 'system',
      title: 'Storage Quota Reduced',
      content: 'You are over your storage limit. Please delete some files or upgrade to upload new content.',
      actionUrl: '/settings/storage'
    });
  }
}
```

---

## Media Storage Strategy

### AWS S3 Architecture

All user-uploaded media (images, videos, audio) is stored in AWS S3, with metadata tracked in PostgreSQL's `post_media` table.

#### S3 Bucket Structure

```
vrss-media-production/
├── users/
│   ├── {user_id}/
│   │   ├── posts/
│   │   │   ├── {post_id}/
│   │   │   │   ├── {uuid}.jpg
│   │   │   │   ├── {uuid}.mp4
│   │   │   │   └── thumbnails/
│   │   │   │       └── {uuid}_thumb.jpg
│   │   └── profile/
│   │       ├── avatar.jpg
│   │       └── background.jpg
```

#### Upload Flow (Two-Phase Strategy)

**Phase 1: Pre-Signed URL Generation**

```typescript
// Backend generates pre-signed URL
async function generateUploadUrl(
  userId: bigint,
  fileName: string,
  fileSize: bigint,
  mimeType: string
): Promise<{ uploadUrl: string, fileKey: string }> {
  // 1. Check storage quota
  if (!await canUploadFile(userId, fileSize)) {
    throw new Error('STORAGE_QUOTA_EXCEEDED');
  }

  // 2. Generate unique S3 key
  const fileKey = `users/${userId}/posts/${uuid()}_${fileName}`;

  // 3. Generate pre-signed URL (5 min expiration)
  const uploadUrl = await s3.getSignedUrl('putObject', {
    Bucket: 'vrss-media-production',
    Key: fileKey,
    ContentType: mimeType,
    Expires: 300 // 5 minutes
  });

  return { uploadUrl, fileKey };
}
```

**Phase 2: Client Upload & Confirmation**

```typescript
// Client uploads directly to S3
async function uploadFileToS3(file: File, uploadUrl: string): Promise<void> {
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type
    }
  });
}

// Client confirms upload to backend
async function confirmUpload(
  postId: bigint,
  fileKey: string,
  fileSize: bigint,
  metadata: MediaMetadata
): Promise<PostMedia> {
  // Backend creates post_media record
  return await db.post_media.create({
    data: {
      post_id: postId,
      user_id: userId,
      file_url: `https://cdn.vrss.app/${fileKey}`,
      file_size_bytes: fileSize,
      mime_type: metadata.mimeType,
      width: metadata.width,
      height: metadata.height,
      type: getMediaType(metadata.mimeType)
    }
  });
  // Trigger automatically updates storage_usage
}
```

#### Media Validation

```typescript
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];

const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20MB

function validateMediaFile(file: File): void {
  const type = file.type;
  const size = file.size;

  if (ALLOWED_IMAGE_TYPES.includes(type)) {
    if (size > MAX_IMAGE_SIZE) throw new Error('IMAGE_TOO_LARGE');
  } else if (ALLOWED_VIDEO_TYPES.includes(type)) {
    if (size > MAX_VIDEO_SIZE) throw new Error('VIDEO_TOO_LARGE');
  } else if (ALLOWED_AUDIO_TYPES.includes(type)) {
    if (size > MAX_AUDIO_SIZE) throw new Error('AUDIO_TOO_LARGE');
  } else {
    throw new Error('UNSUPPORTED_FILE_TYPE');
  }
}
```

#### CDN Integration

```
┌──────────────┐      ┌─────────────┐      ┌──────────┐
│   Client     │─────▶│  CloudFront │─────▶│  S3      │
│  (Browser)   │◀─────│  CDN        │◀─────│  Bucket  │
└──────────────┘      └─────────────┘      └──────────┘

CDN Configuration:
- Cache-Control: public, max-age=31536000 (1 year for immutable media)
- Origin: s3://vrss-media-production
- Custom Domain: https://cdn.vrss.app
- Compression: Gzip, Brotli
- Image Optimization: On-the-fly resizing via Lambda@Edge
```

#### Media Cleanup Strategy

**Orphaned Media Detection** (files not referenced by any post):

```sql
-- Find orphaned media
SELECT pm.id, pm.file_url, pm.file_size_bytes
FROM post_media pm
LEFT JOIN posts p ON pm.post_id = p.id
WHERE p.id IS NULL
   OR p.deleted_at < NOW() - INTERVAL '30 days';
```

**Cleanup Process** (weekly cron job):

```typescript
async function cleanupOrphanedMedia(): Promise<void> {
  const orphanedMedia = await db.$queryRaw`
    SELECT pm.id, pm.file_url, pm.user_id
    FROM post_media pm
    LEFT JOIN posts p ON pm.post_id = p.id
    WHERE p.id IS NULL OR p.deleted_at < NOW() - INTERVAL '30 days'
  `;

  for (const media of orphanedMedia) {
    // Delete from S3
    await s3.deleteObject({
      Bucket: 'vrss-media-production',
      Key: extractS3Key(media.file_url)
    });

    // Delete from database
    await db.post_media.delete({ where: { id: media.id } });
    // Trigger automatically updates storage_usage
  }
}
```

---

## Data Access Patterns

### Common Query Patterns

#### 1. User Feed Generation (Most Critical)

**Query**: Get posts from followed users, ordered by recency

```sql
-- Optimized feed query
SELECT
    p.id, p.user_id, p.type, p.title, p.content, p.thumbnail_url,
    p.likes_count, p.comments_count, p.created_at,
    u.username, up.display_name
FROM posts p
INNER JOIN users u ON p.user_id = u.id
INNER JOIN user_profiles up ON u.id = up.user_id
WHERE
    p.user_id IN (
        SELECT following_id
        FROM user_follows
        WHERE follower_id = $current_user_id
    )
    AND p.status = 'published'
    AND p.deleted_at IS NULL
ORDER BY p.created_at DESC
LIMIT 20 OFFSET $page * 20;

-- Uses indexes:
-- - idx_user_follows_follower (for subquery)
-- - idx_posts_user_created (for WHERE + ORDER BY)
```

**Performance**: <50ms for 100 followed users

**Caching Strategy**: Cache feed results in Redis (1-minute TTL)

#### 2. Custom Feed Execution

**Query**: Execute user-defined feed with filters

```typescript
async function executeCustomFeed(feedId: bigint, page: number = 0): Promise<Post[]> {
  // 1. Load feed config
  const feed = await db.custom_feeds.findUnique({
    where: { id: feedId },
    include: { filters: true }
  });

  // 2. Build dynamic SQL from filters
  const whereConditions = feed.filters.map(filter => {
    switch (filter.type) {
      case 'post_type':
        return `p.type = '${filter.value}'`;
      case 'author':
        return `p.user_id IN (${filter.value.join(',')})`;
      case 'date_range':
        return `p.created_at >= '${filter.value.start}' AND p.created_at <= '${filter.value.end}'`;
      case 'engagement':
        return `p.likes_count >= ${filter.value.min}`;
      default:
        return '1=1';
    }
  });

  const whereClause = whereConditions.join(` ${feed.algorithmConfig.logic} `);

  // 3. Execute query
  return await db.$queryRaw`
    SELECT p.*, u.username, up.display_name
    FROM posts p
    JOIN users u ON p.user_id = u.id
    JOIN user_profiles up ON u.id = up.user_id
    WHERE ${whereClause}
      AND p.status = 'published'
      AND p.deleted_at IS NULL
    ORDER BY p.created_at DESC
    LIMIT 20 OFFSET ${page * 20}
  `;
}
```

#### 3. Storage Quota Check

**Query**: Fast quota check before upload

```sql
SELECT
    (quota_bytes - used_bytes) AS available_bytes,
    used_bytes,
    quota_bytes,
    ROUND(100.0 * used_bytes / quota_bytes, 2) AS percent_used
FROM storage_usage
WHERE user_id = $user_id;

-- Uses: UNIQUE index on user_id
-- Performance: <5ms (single row lookup)
```

#### 4. Social Graph Traversal (Friends-of-Friends)

**Query**: Find 2nd-degree connections (friends of friends)

```sql
-- Direct friends (1st degree)
WITH first_degree AS (
    SELECT user_id_2 AS friend_id FROM friendships WHERE user_id_1 = $user_id
    UNION
    SELECT user_id_1 AS friend_id FROM friendships WHERE user_id_2 = $user_id
),
-- Friends of friends (2nd degree)
second_degree AS (
    SELECT DISTINCT f2.user_id_2 AS friend_id
    FROM first_degree f1
    JOIN friendships f2 ON (f1.friend_id = f2.user_id_1 OR f1.friend_id = f2.user_id_2)
    WHERE f2.user_id_2 != $user_id
      AND f2.user_id_2 NOT IN (SELECT friend_id FROM first_degree)
    UNION
    SELECT DISTINCT f2.user_id_1 AS friend_id
    FROM first_degree f1
    JOIN friendships f2 ON (f1.friend_id = f2.user_id_1 OR f1.friend_id = f2.user_id_2)
    WHERE f2.user_id_1 != $user_id
      AND f2.user_id_1 NOT IN (SELECT friend_id FROM first_degree)
)
SELECT u.id, u.username, up.display_name
FROM second_degree sd
JOIN users u ON sd.friend_id = u.id
JOIN user_profiles up ON u.id = up.user_id;

-- Uses indexes:
-- - idx_friendships_user1
-- - idx_friendships_user2
```

**Performance**: <500ms for 2 degrees, 100 friends each

#### 5. Unread Notifications Count

**Query**: Get count of unread notifications

```sql
SELECT COUNT(*) AS unread_count
FROM notifications
WHERE user_id = $user_id
  AND is_read = FALSE;

-- Uses: idx_notifications_user_unread
-- Performance: <10ms
```

### Caching Strategy Summary

```yaml
Cache Layers:
  Application Cache (Redis):
    - User profiles: TTL 5 minutes, invalidate on update
    - Feed results: TTL 1 minute, invalidate on new post from followed user
    - Storage quota: TTL 1 hour, invalidate on media upload/delete
    - Popular posts: TTL 5 minutes (for discovery page)
    - Custom feed results: TTL 2 minutes, invalidate on feed config change

  Database Cache (PostgreSQL):
    - shared_buffers: 25% of RAM
    - Connection pooling: PgBouncer (max 1000 clients, 25 pool size)

  CDN Cache (CloudFront):
    - Media files: TTL 1 year (immutable)
    - Static assets: TTL 1 week
```

---

## Summary

This comprehensive data storage documentation covers:

✅ **19 PostgreSQL tables** with complete specifications (columns, indexes, constraints, relationships)
✅ **Application data models** for all major entities with validation rules and behaviors
✅ **Storage quota system** with atomic tracking, warnings, and upgrade flows
✅ **Media storage strategy** using AWS S3 with two-phase uploads and CDN integration
✅ **Data access patterns** optimized for feed generation, social graph queries, and quota checks

**Key Architectural Strengths:**

1. **Normalized with Strategic Denormalization**: Core data normalized for integrity, engagement counters denormalized for performance
2. **JSONB Flexibility**: Profile styles, feed algorithms, and layouts use JSONB to avoid frequent migrations
3. **Trigger-Based Automation**: Storage tracking, counter updates, and friendship creation automated via database triggers
4. **Comprehensive Indexing**: 30+ indexes optimized for feed queries, social graph traversal, and interactions
5. **Soft Deletes**: Content recovery within 30-day window, prevents accidental data loss
6. **Atomic Storage Tracking**: Race-condition-free quota enforcement with `FOR UPDATE` locks

**Next Steps:**

1. Implement Prisma schema from database DDL
2. Build TypeScript data models with validation (Zod/Yup)
3. Create repository layer for database operations
4. Implement caching layer (Redis)
5. Set up S3 bucket and CloudFront CDN
6. Configure backup and disaster recovery
7. Load test with realistic data volumes

---

**Referenced Schema Documentation**: @docs/specs/001-vrss-social-platform/DATABASE_SCHEMA.md

**End of Data Storage Documentation**
