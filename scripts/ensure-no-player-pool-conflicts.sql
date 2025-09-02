-- Comprehensive conflict prevention between tournament_participants and tournament_player_pool

-- First, clean up any existing conflicts
DELETE FROM tournament_player_pool 
WHERE (tournament_id, user_id) NOT IN (
    SELECT tournament_id, user_id 
    FROM tournament_participants
);

-- Function to ensure participant exists before adding to player pool
CREATE OR REPLACE FUNCTION ensure_tournament_participant_exists()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user is registered as tournament participant
    IF NOT EXISTS (
        SELECT 1 FROM tournament_participants 
        WHERE tournament_id = NEW.tournament_id 
        AND user_id = NEW.user_id
    ) THEN
        RAISE EXCEPTION 'User must be registered as tournament participant before joining player pool';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce participant requirement
DROP TRIGGER IF EXISTS trigger_ensure_participant_exists ON tournament_player_pool;
CREATE TRIGGER trigger_ensure_participant_exists
    BEFORE INSERT ON tournament_player_pool
    FOR EACH ROW
    EXECUTE FUNCTION ensure_tournament_participant_exists();

-- Function to automatically remove from player pool when participant is removed
CREATE OR REPLACE FUNCTION cleanup_player_pool_on_participant_removal()
RETURNS TRIGGER AS $$
BEGIN
    -- Remove from player pool when participant is removed
    DELETE FROM tournament_player_pool 
    WHERE tournament_id = OLD.tournament_id 
    AND user_id = OLD.user_id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic cleanup
DROP TRIGGER IF EXISTS trigger_cleanup_player_pool ON tournament_participants;
CREATE TRIGGER trigger_cleanup_player_pool
    AFTER DELETE ON tournament_participants
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_player_pool_on_participant_removal();

-- Enhanced conflict prevention function
CREATE OR REPLACE FUNCTION prevent_duplicate_tournament_entries()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent duplicate entries in tournament_participants
    IF TG_TABLE_NAME = 'tournament_participants' THEN
        IF EXISTS (
            SELECT 1 FROM tournament_participants 
            WHERE tournament_id = NEW.tournament_id 
            AND user_id = NEW.user_id 
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) THEN
            RAISE EXCEPTION 'User is already registered for this tournament';
        END IF;
    END IF;
    
    -- Prevent duplicate entries in tournament_player_pool
    IF TG_TABLE_NAME = 'tournament_player_pool' THEN
        IF EXISTS (
            SELECT 1 FROM tournament_player_pool 
            WHERE tournament_id = NEW.tournament_id 
            AND user_id = NEW.user_id 
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        ) THEN
            RAISE EXCEPTION 'User is already in the player pool for this tournament';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply duplicate prevention triggers
DROP TRIGGER IF EXISTS trigger_prevent_duplicate_participants ON tournament_participants;
CREATE TRIGGER trigger_prevent_duplicate_participants
    BEFORE INSERT OR UPDATE ON tournament_participants
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_tournament_entries();

DROP TRIGGER IF EXISTS trigger_prevent_duplicate_player_pool ON tournament_player_pool;
CREATE TRIGGER trigger_prevent_duplicate_player_pool
    BEFORE INSERT OR UPDATE ON tournament_player_pool
    FOR EACH ROW
    EXECUTE FUNCTION prevent_duplicate_tournament_entries();

-- Function to sync participant and player pool status
CREATE OR REPLACE FUNCTION sync_participant_player_pool_status()
RETURNS TRIGGER AS $$
BEGIN
    -- When participant status changes, update player pool status accordingly
    IF TG_TABLE_NAME = 'tournament_participants' THEN
        UPDATE tournament_player_pool 
        SET status = CASE 
            WHEN NEW.status = 'eliminated' THEN 'withdrawn'
            WHEN NEW.status = 'active' THEN 'available'
            ELSE status
        END,
        updated_at = NOW()
        WHERE tournament_id = NEW.tournament_id 
        AND user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create status sync trigger
DROP TRIGGER IF EXISTS trigger_sync_status ON tournament_participants;
CREATE TRIGGER trigger_sync_status
    AFTER UPDATE OF status ON tournament_participants
    FOR EACH ROW
    EXECUTE FUNCTION sync_participant_player_pool_status();

-- Create view for unified tournament participation
CREATE OR REPLACE VIEW unified_tournament_participation AS
SELECT 
    tp.tournament_id,
    tp.user_id,
    tp.status as participant_status,
    tp.joined_at,
    tp.team_name,
    tp.seed,
    tpp.status as pool_status,
    tpp.draft_position,
    tpp.captain_type,
    tpp.team_id as draft_team_id,
    u.username,
    u.elo_rating,
    t.name as tournament_name,
    t.tournament_type
FROM tournament_participants tp
LEFT JOIN tournament_player_pool tpp ON tp.tournament_id = tpp.tournament_id AND tp.user_id = tpp.user_id
LEFT JOIN users u ON tp.user_id = u.id
LEFT JOIN tournaments t ON tp.tournament_id = t.id;

-- Grant permissions
GRANT EXECUTE ON FUNCTION ensure_tournament_participant_exists() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_player_pool_on_participant_removal() TO authenticated;
GRANT EXECUTE ON FUNCTION prevent_duplicate_tournament_entries() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_participant_player_pool_status() TO authenticated;
GRANT SELECT ON unified_tournament_participation TO authenticated;

-- Add helpful indexes for conflict prevention
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_tournament ON tournament_participants(user_id, tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_player_pool_user_tournament ON tournament_player_pool(user_id, tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_status ON tournament_participants(tournament_id, status);
CREATE INDEX IF NOT EXISTS idx_tournament_player_pool_status ON tournament_player_pool(tournament_id, status);
