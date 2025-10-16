-- VRSS Database Schema - Core Tables
-- MVP schema for social platform with customizable profiles and feeds

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,

    -- Profile information
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,

    -- User settings
    role user_role NOT NULL DEFAULT 'user',
    profile_visibility profile_visibility NOT NULL DEFAULT 'public',
    storage_tier storage_tier NOT NULL DEFAULT 'free',
    storage_limit_bytes BIGINT NOT NULL DEFAULT 52428800, -- 50MB

    -- Verification and status
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verification_token VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_banned BOOLEAN NOT NULL DEFAULT false,
    banned_until TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_username ON users(username) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Profile customizations table
CREATE TABLE IF NOT EXISTS profile_customizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Style customization
    background_type VARCHAR(20) CHECK (background_type IN ('color', 'image', 'gradient')),
    background_value TEXT,
    background_music_url TEXT,

    -- Font and colors
    font_family VARCHAR(100),
    primary_color VARCHAR(7),
    secondary_color VARCHAR(7),
    text_color VARCHAR(7),

    -- Layout settings
    layout_template VARCHAR(50),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX idx_profile_customizations_user_id ON profile_customizations(user_id);
CREATE TRIGGER update_profile_customizations_updated_at BEFORE UPDATE ON profile_customizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Profile sections table
CREATE TABLE IF NOT EXISTS profile_sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Section configuration
    section_type section_type NOT NULL,
    title VARCHAR(100),
    position INTEGER NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT true,

    -- Section-specific configuration (JSON)
    config JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, position)
);

CREATE INDEX idx_profile_sections_user_id ON profile_sections(user_id);
CREATE INDEX idx_profile_sections_position ON profile_sections(user_id, position);
CREATE TRIGGER update_profile_sections_updated_at BEFORE UPDATE ON profile_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Post content
    post_type post_type NOT NULL,
    content TEXT,
    title VARCHAR(255),

    -- Metadata
    tags TEXT[],
    is_pinned BOOLEAN NOT NULL DEFAULT false,

    -- Privacy and moderation
    is_public BOOLEAN NOT NULL DEFAULT true,
    is_comments_enabled BOOLEAN NOT NULL DEFAULT true,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    moderation_status VARCHAR(20) DEFAULT 'approved',

    -- Engagement counters (denormalized for performance)
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    reposts_count INTEGER NOT NULL DEFAULT 0,
    views_count INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT valid_likes_count CHECK (likes_count >= 0),
    CONSTRAINT valid_comments_count CHECK (comments_count >= 0),
    CONSTRAINT valid_reposts_count CHECK (reposts_count >= 0),
    CONSTRAINT valid_views_count CHECK (views_count >= 0)
);

CREATE INDEX idx_posts_user_id ON posts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_created_at ON posts(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_post_type ON posts(post_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_tags ON posts USING GIN(tags) WHERE deleted_at IS NULL;
CREATE INDEX idx_posts_is_public ON posts(is_public) WHERE deleted_at IS NULL;
CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Media files table
CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,

    -- File information
    file_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,

    -- Storage information
    storage_path TEXT NOT NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'local',

    -- Media metadata
    width INTEGER,
    height INTEGER,
    duration_seconds INTEGER,
    thumbnail_url TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT valid_file_size CHECK (file_size_bytes > 0)
);

CREATE INDEX idx_media_files_user_id ON media_files(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_files_post_id ON media_files(post_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_media_files_created_at ON media_files(created_at);

-- Follows table (social graph)
CREATE TABLE IF NOT EXISTS follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_following_id ON follows(following_id);
CREATE INDEX idx_follows_created_at ON follows(created_at);

-- Likes table
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, post_id)
);

CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);
CREATE INDEX idx_likes_created_at ON likes(created_at);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,

    -- Comment content
    content TEXT NOT NULL,

    -- Engagement counters
    likes_count INTEGER NOT NULL DEFAULT 0,

    -- Moderation
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    moderation_status VARCHAR(20) DEFAULT 'approved',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT valid_comment_content CHECK (char_length(content) > 0),
    CONSTRAINT valid_likes_count CHECK (likes_count >= 0)
);

CREATE INDEX idx_comments_post_id ON comments(post_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_user_id ON comments(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reposts table
CREATE TABLE IF NOT EXISTS reposts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,

    -- Optional comment on repost
    comment TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, post_id)
);

CREATE INDEX idx_reposts_user_id ON reposts(user_id);
CREATE INDEX idx_reposts_post_id ON reposts(post_id);
CREATE INDEX idx_reposts_created_at ON reposts(created_at);

-- Custom feeds table
CREATE TABLE IF NOT EXISTS custom_feeds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Feed configuration
    name VARCHAR(100) NOT NULL,
    description TEXT,
    algorithm_config JSONB NOT NULL,

    -- Settings
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_public BOOLEAN NOT NULL DEFAULT false,
    position INTEGER,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, name)
);

CREATE INDEX idx_custom_feeds_user_id ON custom_feeds(user_id);
CREATE INDEX idx_custom_feeds_position ON custom_feeds(user_id, position);
CREATE INDEX idx_custom_feeds_is_default ON custom_feeds(user_id, is_default);
CREATE TRIGGER update_custom_feeds_updated_at BEFORE UPDATE ON custom_feeds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Message content
    content TEXT NOT NULL,

    -- Status
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    CONSTRAINT no_self_message CHECK (sender_id != recipient_id),
    CONSTRAINT valid_message_content CHECK (char_length(content) > 0)
);

CREATE INDEX idx_messages_sender_id ON messages(sender_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_conversation ON messages(sender_id, recipient_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_messages_is_read ON messages(recipient_id, is_read) WHERE deleted_at IS NULL;

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Notification details
    notification_type notification_type NOT NULL,
    actor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID,  -- Generic ID (post_id, comment_id, etc.)

    -- Content
    content TEXT,

    -- Status
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT no_self_notification CHECK (user_id != actor_id)
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Blocked users table
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(blocker_id, blocked_id),
    CONSTRAINT no_self_block CHECK (blocker_id != blocked_id)
);

CREATE INDEX idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX idx_blocked_users_blocked_id ON blocked_users(blocked_id);

-- Sessions table (optional, for session management)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Session data
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Log table creation
DO $$
BEGIN
    RAISE NOTICE 'VRSS core tables created successfully';
    RAISE NOTICE 'Tables: users, profile_customizations, profile_sections, posts, media_files';
    RAISE NOTICE 'Tables: follows, likes, comments, reposts, custom_feeds';
    RAISE NOTICE 'Tables: messages, notifications, blocked_users, sessions';
END $$;
