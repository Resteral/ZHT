-- Create tournament activity log table for captain selection tracking
CREATE TABLE IF NOT EXISTS tournament_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    selection_type VARCHAR(20),
    captains_selected JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_activity_log_tournament_id ON tournament_activity_log(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_activity_log_action ON tournament_activity_log(action);
CREATE INDEX IF NOT EXISTS idx_tournament_activity_log_timestamp ON tournament_activity_log(timestamp);

-- Add captain_type column to tournament_player_pool if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tournament_player_pool' 
        AND column_name = 'captain_type'
    ) THEN
        ALTER TABLE tournament_player_pool 
        ADD COLUMN captain_type VARCHAR(20) CHECK (captain_type IN ('high_elo', 'low_elo'));
    END IF;
END $$;

-- Add updated_at column to tournament_player_pool if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tournament_player_pool' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE tournament_player_pool 
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Create function to automatically select captains when pool reaches minimum size
CREATE OR REPLACE FUNCTION auto_select_captains_on_pool_size()
RETURNS TRIGGER AS $$
DECLARE
    player_count INTEGER;
    tournament_captains_count INTEGER;
BEGIN
    -- Count available players in the tournament pool
    SELECT COUNT(*) INTO player_count
    FROM tournament_player_pool
    WHERE tournament_id = NEW.tournament_id 
    AND status = 'available';

    -- Count existing captains
    SELECT COUNT(*) INTO tournament_captains_count
    FROM tournament_player_pool
    WHERE tournament_id = NEW.tournament_id 
    AND status = 'captain';

    -- If we have at least 4 players and no captains yet, trigger captain selection
    IF player_count >= 4 AND tournament_captains_count = 0 THEN
        -- This would typically call the captain selection service
        -- For now, we'll just log that captain selection should happen
        INSERT INTO tournament_activity_log (
            tournament_id,
            action,
            selection_type,
            captains_selected,
            timestamp
        ) VALUES (
            NEW.tournament_id,
            'captain_selection_trigger',
            'automatic',
            jsonb_build_object('message', 'Pool reached minimum size for captain selection'),
            NOW()
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic captain selection
DROP TRIGGER IF EXISTS trigger_auto_select_captains ON tournament_player_pool;
CREATE TRIGGER trigger_auto_select_captains
    AFTER INSERT ON tournament_player_pool
    FOR EACH ROW
    EXECUTE FUNCTION auto_select_captains_on_pool_size();

-- Create function to get tournament captain statistics
CREATE OR REPLACE FUNCTION get_tournament_captain_stats(tournament_id_param UUID)
RETURNS TABLE (
    total_players INTEGER,
    available_players INTEGER,
    captains_count INTEGER,
    high_elo_captain JSONB,
    low_elo_captain JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH captain_data AS (
        SELECT 
            tpp.captain_type,
            jsonb_build_object(
                'user_id', tpp.user_id,
                'username', u.username,
                'elo_rating', u.elo_rating,
                'captain_type', tpp.captain_type
            ) as captain_info
        FROM tournament_player_pool tpp
        JOIN users u ON tpp.user_id = u.id
        WHERE tpp.tournament_id = tournament_id_param
        AND tpp.status = 'captain'
    ),
    pool_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'available') as available,
            COUNT(*) FILTER (WHERE status = 'captain') as captains
        FROM tournament_player_pool
        WHERE tournament_id = tournament_id_param
    )
    SELECT 
        ps.total::INTEGER,
        ps.available::INTEGER,
        ps.captains::INTEGER,
        (SELECT captain_info FROM captain_data WHERE captain_type = 'high_elo'),
        (SELECT captain_info FROM captain_data WHERE captain_type = 'low_elo')
    FROM pool_stats ps;
END;
$$ LANGUAGE plpgsql;

-- Insert initial data or update existing records
INSERT INTO tournament_activity_log (tournament_id, action, selection_type, captains_selected, timestamp)
SELECT 
    t.id,
    'system_initialization',
    'automatic',
    jsonb_build_object('message', 'Captain selection system initialized'),
    NOW()
FROM tournaments t
WHERE t.tournament_type = 'snake_draft'
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE tournament_activity_log IS 'Tracks all tournament activities including captain selections';
COMMENT ON COLUMN tournament_activity_log.action IS 'Type of action performed (captain_selection, team_formation, etc.)';
COMMENT ON COLUMN tournament_activity_log.selection_type IS 'How captains were selected (automatic, manual)';
COMMENT ON COLUMN tournament_activity_log.captains_selected IS 'JSON data about selected captains';

COMMENT ON FUNCTION auto_select_captains_on_pool_size() IS 'Automatically triggers captain selection when pool reaches minimum size';
COMMENT ON FUNCTION get_tournament_captain_stats(UUID) IS 'Returns comprehensive captain statistics for a tournament';
