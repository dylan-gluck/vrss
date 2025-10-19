-- Migration: Add storage_usage automatic update triggers
-- Phase 3.6: Media Router - Database Triggers
-- This migration implements automatic storage_usage tracking via database triggers

-- ============================================
-- FUNCTION: Update storage on media INSERT
-- ============================================
CREATE OR REPLACE FUNCTION update_storage_on_media_insert()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE storage_usage
    SET
        used_bytes = used_bytes + NEW.file_size_bytes,
        images_bytes = CASE WHEN NEW.type = 'image' THEN images_bytes + NEW.file_size_bytes ELSE images_bytes END,
        videos_bytes = CASE WHEN NEW.type = 'video' THEN videos_bytes + NEW.file_size_bytes ELSE videos_bytes END,
        audio_bytes = CASE WHEN NEW.type = 'audio' THEN audio_bytes + NEW.file_size_bytes ELSE audio_bytes END,
        other_bytes = CASE WHEN NEW.type NOT IN ('image', 'video', 'audio') THEN other_bytes + NEW.file_size_bytes ELSE other_bytes END,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Update storage on media DELETE
-- ============================================
CREATE OR REPLACE FUNCTION update_storage_on_media_delete()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE storage_usage
    SET
        used_bytes = GREATEST(0, used_bytes - OLD.file_size_bytes),
        images_bytes = CASE WHEN OLD.type = 'image' THEN GREATEST(0, images_bytes - OLD.file_size_bytes) ELSE images_bytes END,
        videos_bytes = CASE WHEN OLD.type = 'video' THEN GREATEST(0, videos_bytes - OLD.file_size_bytes) ELSE videos_bytes END,
        audio_bytes = CASE WHEN OLD.type = 'audio' THEN GREATEST(0, audio_bytes - OLD.file_size_bytes) ELSE audio_bytes END,
        other_bytes = CASE WHEN OLD.type NOT IN ('image', 'video', 'audio') THEN GREATEST(0, other_bytes - OLD.file_size_bytes) ELSE other_bytes END,
        updated_at = NOW()
    WHERE user_id = OLD.user_id;

    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-increment storage on INSERT
-- ============================================
CREATE TRIGGER trigger_update_storage_insert
AFTER INSERT ON post_media
FOR EACH ROW
EXECUTE FUNCTION update_storage_on_media_insert();

-- ============================================
-- TRIGGER: Auto-decrement storage on DELETE
-- ============================================
CREATE TRIGGER trigger_update_storage_delete
AFTER DELETE ON post_media
FOR EACH ROW
EXECUTE FUNCTION update_storage_on_media_delete();

-- ============================================
-- NOTES:
-- - Triggers run automatically on post_media INSERT/DELETE
-- - Uses GREATEST(0, ...) to prevent negative values
-- - Updates timestamp for cache invalidation
-- - MediaType enum: image, gif, video, audio, document
-- ============================================
