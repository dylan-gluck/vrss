-- Friendship creation trigger
-- Automatically creates a friendship record when mutual follow is detected

CREATE OR REPLACE FUNCTION create_friendship_on_mutual_follow()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the reverse follow relationship exists (mutual follow)
    IF EXISTS (
        SELECT 1 FROM user_follows
        WHERE follower_id = NEW.following_id
        AND following_id = NEW.follower_id
    ) THEN
        -- Insert friendship with ordered user IDs (lower ID first)
        INSERT INTO friendships (user_id_1, user_id_2)
        VALUES (
            LEAST(NEW.follower_id, NEW.following_id),
            GREATEST(NEW.follower_id, NEW.following_id)
        )
        ON CONFLICT (user_id_1, user_id_2) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on user_follows table
CREATE TRIGGER trigger_create_friendship
AFTER INSERT ON user_follows
FOR EACH ROW
EXECUTE FUNCTION create_friendship_on_mutual_follow();
