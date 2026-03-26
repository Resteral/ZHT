-- Standardize Analytics Schema Consistency
-- Resolves conflicts between 'player_analytics' and 'match_analytics'
-- ensuring all scripts refer to the same source of truth for game statistics.

-- 1. Ensure 'player_analytics' is the primary table for individual game stats
-- (Aliasing to match_analytics if it exists, or creating new)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_analytics') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_analytics') THEN
        ALTER TABLE match_analytics RENAME TO player_analytics;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_analytics') THEN
        CREATE TABLE player_analytics (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            kills INTEGER DEFAULT 0,
            deaths INTEGER DEFAULT 0,
            assists INTEGER DEFAULT 0,
            damage_dealt INTEGER DEFAULT 0,
            damage_taken INTEGER DEFAULT 0,
            healing_done INTEGER DEFAULT 0,
            objective_score INTEGER DEFAULT 0,
            accuracy DECIMAL(5,2) DEFAULT 0,
            headshot_percentage DECIMAL(5,2) DEFAULT 0,
            time_alive INTEGER DEFAULT 0,
            score INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Standardize columns across all possible analytics table names
-- (In case legacy scripts created them)
DO $$ 
DECLARE
    table_rec RECORD;
BEGIN
    FOR table_rec IN SELECT table_name FROM information_schema.tables 
    WHERE table_name IN ('player_analytics', 'match_analytics', 'csv_analytics_data') 
    LOOP
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS kills INTEGER DEFAULT 0', table_rec.table_name);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deaths INTEGER DEFAULT 0', table_rec.table_name);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS assists INTEGER DEFAULT 0', table_rec.table_name);
        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS score INTEGER DEFAULT 0', table_rec.table_name);
    END LOOP;
END $$;

-- Standardize match_participants column names
DO $$ 
BEGIN
    -- Rename team_number to team_id if it exists to match the newer convention
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_participants' AND column_name = 'team_number') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_participants' AND column_name = 'team_id') THEN
        ALTER TABLE match_participants RENAME COLUMN team_number TO team_id;
    END IF;

    -- Ensure team_id exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'match_participants' AND column_name = 'team_id') THEN
        ALTER TABLE match_participants ADD COLUMN team_id INTEGER DEFAULT 1;
    END IF;
END $$;

-- 3. Fix the player_advanced_stats view to join correctly
CREATE OR REPLACE VIEW player_advanced_stats AS
SELECT 
    u.id,
    u.username,
    u.elo_rating,
    COUNT(DISTINCT pa.match_id) as matches_played,
    AVG(COALESCE(pa.kills, 0)) as avg_kills,
    AVG(COALESCE(pa.deaths, 0)) as avg_deaths,
    AVG(COALESCE(pa.assists, 0)) as avg_assists,
    AVG(COALESCE(pa.damage_dealt, 0)) as avg_damage,
    SUM(CASE WHEN ta.actual_result = 'win' OR ta.victory = true THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN ta.actual_result = 'loss' OR ta.victory = false THEN 1 ELSE 0 END) as losses,
    ROUND(
        (SUM(CASE WHEN ta.actual_result = 'win' OR ta.victory = true THEN 1 ELSE 0 END)::DECIMAL / 
         NULLIF(COUNT(DISTINCT pa.match_id), 0)) * 100, 2
    ) as win_percentage
FROM users u
LEFT JOIN player_analytics pa ON u.id = pa.user_id
LEFT JOIN team_analytics ta ON pa.match_id = ta.match_id 
  AND ta.team_number = (
    -- Subquery to find the player's team for that specific match
    SELECT team_id FROM match_participants 
    WHERE match_id = pa.match_id AND user_id = u.id 
    LIMIT 1
  )
GROUP BY u.id, u.username, u.elo_rating;

-- 4. Grant permissions
GRANT SELECT ON player_advanced_stats TO authenticated;
GRANT ALL ON player_analytics TO authenticated;

-- 5. Create teammate stats view for "Best/Worst Teammates"
-- This view identifies win rates for player pairs in same matches/teams
CREATE OR REPLACE VIEW teammate_stats AS
WITH teammate_pairs AS (
    -- Pair players who were on the same team in the same match
    SELECT 
        mp1.user_id as player_id,
        mp2.user_id as teammate_id,
        mp1.match_id,
        CASE WHEN pa.score > 0 THEN true ELSE false END as participated -- simplified check if stats exist
    FROM match_participants mp1
    JOIN match_participants mp2 ON mp1.match_id = mp2.match_id 
        AND mp1.team_id = mp2.team_id 
        AND mp1.user_id != mp2.user_id
    LEFT JOIN player_analytics pa ON mp1.match_id = pa.match_id AND mp1.user_id = pa.user_id
)
SELECT 
    tp.player_id,
    tp.teammate_id,
    u.username as teammate_username,
    COUNT(DISTINCT tp.match_id) as games_together,
    SUM(CASE WHEN ta.actual_result = 'win' OR ta.victory = true THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN ta.actual_result = 'loss' OR ta.victory = false THEN 1 ELSE 0 END) as losses,
    ROUND(
        (SUM(CASE WHEN ta.actual_result = 'win' OR ta.victory = true THEN 1 ELSE 0 END)::DECIMAL / 
         NULLIF(COUNT(DISTINCT tp.match_id), 0)) * 100, 2
    ) as win_percentage
FROM teammate_pairs tp
JOIN users u ON tp.teammate_id = u.id
JOIN team_analytics ta ON tp.match_id = ta.match_id 
  AND ta.team_number = (SELECT team_id FROM match_participants WHERE match_id = tp.match_id AND user_id = tp.player_id LIMIT 1)
GROUP BY tp.player_id, tp.teammate_id, u.username;

GRANT SELECT ON teammate_stats TO authenticated;

COMMENT ON TABLE player_analytics IS 'Individual player performance data for specific matches';
COMMENT ON VIEW player_advanced_stats IS 'Aggregated career statistics for all players';
COMMENT ON VIEW teammate_stats IS 'Win/loss history with specific teammates to identify best/worst partners';
