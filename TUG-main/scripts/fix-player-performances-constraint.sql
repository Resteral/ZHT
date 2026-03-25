-- Fix foreign key constraint and ensure proper data structure
-- Drop existing constraint if it exists
ALTER TABLE player_performances DROP CONSTRAINT IF EXISTS player_performances_player_id_fkey;

-- Add proper foreign key constraint to users table
ALTER TABLE player_performances ADD CONSTRAINT player_performances_player_id_fkey 
    FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_player_performances_player_id ON player_performances(player_id);
CREATE INDEX IF NOT EXISTS idx_player_performances_game_date ON player_performances(game_date);

-- Ensure player_analytics table has proper indexes for CSV coordination
CREATE INDEX IF NOT EXISTS idx_player_analytics_match_user ON player_analytics(match_id, user_id);
CREATE INDEX IF NOT EXISTS idx_player_analytics_user_id ON player_analytics(user_id);

-- Create function to safely upsert player performance data
CREATE OR REPLACE FUNCTION upsert_player_performance(
    p_player_id UUID,
    p_match_id UUID,
    p_stats JSONB,
    p_game_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    p_season VARCHAR DEFAULT '2025'
)
RETURNS UUID AS $$
DECLARE
    performance_id UUID;
BEGIN
    -- Insert or update player performance
    INSERT INTO player_performances (
        id,
        player_id,
        stats,
        game_date,
        season,
        created_at,
        points_scored,
        opponent
    ) VALUES (
        gen_random_uuid(),
        p_player_id,
        p_stats,
        p_game_date,
        p_season,
        NOW(),
        COALESCE((p_stats->>'goals')::numeric, 0) + COALESCE((p_stats->>'assists')::numeric, 0),
        'Match ' || p_match_id::text
    )
    ON CONFLICT (player_id, game_date, season) 
    DO UPDATE SET
        stats = EXCLUDED.stats,
        points_scored = EXCLUDED.points_scored,
        created_at = NOW()
    RETURNING id INTO performance_id;
    
    RETURN performance_id;
END;
$$ LANGUAGE plpgsql;
