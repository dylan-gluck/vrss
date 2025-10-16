-- VRSS Database Initialization Script
-- Creates initial database structure, extensions, and basic configuration

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";         -- Trigram matching for text search
CREATE EXTENSION IF NOT EXISTS "btree_gin";       -- GIN index support for various types
CREATE EXTENSION IF NOT EXISTS "btree_gist";      -- GIST index support for various types

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'creator', 'business', 'admin', 'moderator');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_type AS ENUM ('text_short', 'text_long', 'image_single', 'image_gallery', 'image_gif', 'video_short', 'video_long', 'song_single', 'song_album');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE profile_visibility AS ENUM ('public', 'private', 'followers_only');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE storage_tier AS ENUM ('free', 'paid_basic', 'paid_premium');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('follow', 'like', 'comment', 'repost', 'mention', 'message');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE section_type AS ENUM ('feed', 'gallery', 'links', 'static_text', 'image', 'video', 'reposts', 'friends', 'followers', 'following', 'lists');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create function to calculate storage usage
CREATE OR REPLACE FUNCTION calculate_user_storage_usage(user_uuid UUID)
RETURNS BIGINT AS $$
    SELECT COALESCE(SUM(file_size_bytes), 0)::BIGINT
    FROM media_files
    WHERE user_id = user_uuid
    AND deleted_at IS NULL;
$$ LANGUAGE sql STABLE;

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE vrss TO vrss_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vrss_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO vrss_user;

-- Create initial admin user (password: admin123 - CHANGE IN PRODUCTION)
-- Password hash for 'admin123' using bcrypt
-- This is just for initial setup - should be changed immediately
INSERT INTO users (
    id,
    username,
    email,
    password_hash,
    role,
    storage_tier,
    storage_limit_bytes,
    email_verified,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'admin',
    'admin@vrss.local',
    '$2b$10$YourHashHere',  -- Replace with actual bcrypt hash
    'admin',
    'paid_premium',
    1073741824,  -- 1GB
    true,
    NOW(),
    NOW()
) ON CONFLICT (username) DO NOTHING;

-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'VRSS database initialized successfully';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, pg_trgm, btree_gin, btree_gist';
    RAISE NOTICE 'Custom types created: user_role, post_type, profile_visibility, storage_tier, notification_type, section_type';
    RAISE NOTICE 'Helper functions created: update_updated_at_column, calculate_user_storage_usage';
END $$;
