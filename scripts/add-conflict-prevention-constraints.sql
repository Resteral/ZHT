-- Add constraints and functions to prevent player pool and draft participant conflicts

-- Function to check for draft conflicts before allowing player pool changes
CREATE OR REPLACE FUNCTION check_player_pool_conflicts()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user is in any active drafts (excluding current tournament's draft)
    IF EXISTS (
        SELECT 1 
        FROM captain_draft_participants cdp
        JOIN captain_drafts cd ON cdp.draft_id = cd.id
        WHERE cdp.user_id = NEW.user_id 
        AND cd.status IN ('waiting', 'drafting', 'active')
        AND cd.match_id != NEW.tournament_id
    ) THEN
        RAISE EXCEPTION 'Player is already participating in an active draft';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent conflicts on player pool inserts/updates
DROP TRIGGER IF EXISTS trigger_check_player_pool_conflicts ON tournament_player_pool;
CREATE TRIGGER trigger_check_player_pool_conflicts
    BEFORE INSERT OR UPDATE ON tournament_player_pool
    FOR EACH ROW
    WHEN (NEW.status = 'available')
    EXECUTE FUNCTION check_player_pool_conflicts();

-- Function to check for player pool conflicts before allowing draft participation
CREATE OR REPLACE FUNCTION check_draft_participant_conflicts()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user is in any other tournament player pools as available
    IF EXISTS (
        SELECT 1 
        FROM tournament_player_pool tpp
        JOIN captain_drafts cd ON cd.match_id = tpp.tournament_id
        WHERE tpp.user_id = NEW.user_id 
        AND tpp.status = 'available'
        AND cd.id != NEW.draft_id
    ) THEN
        -- Update conflicting player pool entries to withdrawn
        UPDATE tournament_player_pool 
        SET status = 'withdrawn', updated_at = NOW()
        WHERE user_id = NEW.user_id 
        AND status = 'available'
        AND tournament_id != (
            SELECT match_id FROM captain_drafts WHERE id = NEW.draft_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent conflicts on draft participant inserts
DROP TRIGGER IF EXISTS trigger_check_draft_participant_conflicts ON captain_draft_participants;
CREATE TRIGGER trigger_check_draft_participant_conflicts
    BEFORE INSERT ON captain_draft_participants
    FOR EACH ROW
    EXECUTE FUNCTION check_draft_participant_conflicts();

-- Add index for better performance on conflict checks
CREATE INDEX IF NOT EXISTS idx_captain_drafts_match_status ON captain_drafts(match_id, status);
CREATE INDEX IF NOT EXISTS idx_tournament_player_pool_user_status ON tournament_player_pool(user_id, status);

-- Function to clean up abandoned player pool entries
CREATE OR REPLACE FUNCTION cleanup_abandoned_player_pools()
RETURNS void AS $$
BEGIN
    -- Mark players as withdrawn if they're in active drafts for other tournaments
    UPDATE tournament_player_pool 
    SET status = 'withdrawn', updated_at = NOW()
    WHERE status = 'available'
    AND user_id IN (
        SELECT DISTINCT cdp.user_id
        FROM captain_draft_participants cdp
        JOIN captain_drafts cd ON cdp.draft_id = cd.id
        WHERE cd.status IN ('waiting', 'drafting', 'active')
        AND cd.match_id != tournament_player_pool.tournament_id
    );
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_player_pool_conflicts() TO authenticated;
GRANT EXECUTE ON FUNCTION check_draft_participant_conflicts() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_abandoned_player_pools() TO authenticated;
