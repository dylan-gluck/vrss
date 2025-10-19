-- Post Interaction Counter Triggers
-- Automatically update likesCount and commentsCount when interactions are created/deleted

-- Function to increment post likes count when a like is added
CREATE OR REPLACE FUNCTION increment_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE posts
    SET likes_count = likes_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement post likes count when a like is removed
CREATE OR REPLACE FUNCTION decrement_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE posts
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Function to increment post comments count when a comment is added
CREATE OR REPLACE FUNCTION increment_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE posts
    SET comments_count = comments_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement post comments count when a comment is deleted
CREATE OR REPLACE FUNCTION decrement_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE posts
    SET comments_count = GREATEST(0, comments_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Trigger for incrementing likes count when a like interaction is created
CREATE TRIGGER trigger_increment_likes_count
AFTER INSERT ON post_interactions
FOR EACH ROW
WHEN (NEW.type = 'like')
EXECUTE FUNCTION increment_post_likes_count();

-- Trigger for decrementing likes count when a like interaction is deleted
CREATE TRIGGER trigger_decrement_likes_count
AFTER DELETE ON post_interactions
FOR EACH ROW
WHEN (OLD.type = 'like')
EXECUTE FUNCTION decrement_post_likes_count();

-- Trigger for incrementing comments count when a comment is created
CREATE TRIGGER trigger_increment_comments_count
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION increment_post_comments_count();

-- Trigger for decrementing comments count when a comment is deleted
CREATE TRIGGER trigger_decrement_comments_count
AFTER DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION decrement_post_comments_count();
