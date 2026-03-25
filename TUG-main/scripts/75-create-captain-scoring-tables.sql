-- Create captain tournament scores table
CREATE TABLE IF NOT EXISTS captain_tournament_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    captain_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    match_points INTEGER DEFAULT 0,
    performance_points INTEGER DEFAULT 0,
    draft_bonus_points INTEGER DEFAULT 0,
    team_performance_points INTEGER DEFAULT 0,
    matches_played INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    mvp_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(captain_id, tournament_id)
);

-- Create captain tournament bonuses table
CREATE TABLE IF NOT EXISTS captain_tournament_bonuses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    captain_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    bonus_type VARCHAR(50) NOT NULL,
    bonus_points INTEGER NOT NULL,
    description TEXT,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add additional columns to captain_match_performance table
DO $$ 
BEGIN
    -- Add team_won column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'captain_match_performance' 
        AND column_name = 'team_won'
    ) THEN
        ALTER TABLE captain_match_performance 
        ADD COLUMN team_won BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add match_points column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'captain_match_performance' 
        AND column_name = 'match_points'
    ) THEN
        ALTER TABLE captain_match_performance 
        ADD COLUMN match_points INTEGER DEFAULT 0;
    END IF;

    -- Add total_points column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'captain_match_performance' 
        AND column_name = 'total_points'
    ) THEN
        ALTER TABLE captain_match_performance 
        ADD COLUMN total_points INTEGER DEFAULT 0;
    END IF;

    -- Add tournament_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'captain_match_performance' 
        AND column_name = 'tournament_id'
    ) THEN
        ALTER TABLE captain_match_performance 
        ADD COLUMN tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_captain_tournament_scores_captain_id ON captain_tournament_scores(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_tournament_scores_tournament_id ON captain_tournament_scores(tournament_id);
CREATE INDEX IF NOT EXISTS idx_captain_tournament_scores_total_points ON captain_tournament_scores(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_captain_tournament_bonuses_captain_id ON captain_tournament_bonuses(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_tournament_bonuses_tournament_id ON captain_tournament_bonuses(tournament_id);
CREATE INDEX IF NOT EXISTS idx_captain_tournament_bonuses_type ON captain_tournament_bonuses(bonus_type);

-- Create function to automatically update captain tournament scores
CREATE OR REPLACE FUNCTION update_captain_tournament_score()
RETURNS TRIGGER AS $$
DECLARE
    tournament_id_val UUID;
BEGIN
    -- Get tournament_id from the match
    SELECT tm.tournament_id INTO tournament_id_val
    FROM tournament_matches tm
    WHERE tm.id = NEW.match_id;

    -- Update tournament_id in performance record
    NEW.tournament_id = tournament_id_val;

    -- Recalculate captain's total tournament score
    INSERT INTO captain_tournament_scores (
        captain_id,
        tournament_id,
        total_points,
        match_points,
        performance_points,
        matches_played,
        wins,
        losses,
        goals,
        assists,
        saves,
        mvp_count,
        updated_at
    )
    SELECT 
        NEW.captain_id,
        tournament_id_val,
        COALESCE(SUM(cmp.total_points), 0),
        COALESCE(SUM(cmp.match_points), 0),
        COALESCE(SUM(cmp.performance_score), 0),
        COUNT(*),
        COUNT(*) FILTER (WHERE cmp.team_won = true),
        COUNT(*) FILTER (WHERE cmp.team_won = false),
        COALESCE(SUM(cmp.goals), 0),
        COALESCE(SUM(cmp.assists), 0),
        COALESCE(SUM(cmp.saves), 0),
        COUNT(*) FILTER (WHERE cmp.mvp = true),
        NOW()
    FROM captain_match_performance cmp
    WHERE cmp.captain_id = NEW.captain_id 
    AND cmp.tournament_id = tournament_id_val
    ON CONFLICT (captain_id, tournament_id) 
    DO UPDATE SET
        total_points = EXCLUDED.total_points,
        match_points = EXCLUDED.match_points,
        performance_points = EXCLUDED.performance_points,
        matches_played = EXCLUDED.matches_played,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        goals = EXCLUDED.goals,
        assists = EXCLUDED.assists,
        saves = EXCLUDED.saves,
        mvp_count = EXCLUDED.mvp_count,
        updated_at = EXCLUDED.updated_at;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic score updates
DROP TRIGGER IF EXISTS trigger_update_captain_score ON captain_match_performance;
CREATE TRIGGER trigger_update_captain_score
    BEFORE INSERT OR UPDATE ON captain_match_performance
    FOR EACH ROW
    EXECUTE FUNCTION update_captain_tournament_score();

-- Create function to get captain leaderboard with rankings
CREATE OR REPLACE FUNCTION get_captain_leaderboard(tournament_id_param UUID)
RETURNS TABLE (
    rank INTEGER,
    captain_id UUID,
    captain_username VARCHAR,
    total_points INTEGER,
    match_points INTEGER,
    performance_points INTEGER,
    draft_bonus_points INTEGER,
    matches_played INTEGER,
    wins INTEGER,
    losses INTEGER,
    win_rate DECIMAL,
    goals INTEGER,
    assists INTEGER,
    saves INTEGER,
    mvp_count INTEGER,
    points_per_match DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROW_NUMBER() OVER (ORDER BY cts.total_points DESC)::INTEGER as rank,
        cts.captain_id,
        u.username as captain_username,
        cts.total_points,
        cts.match_points,
        cts.performance_points,
        cts.draft_bonus_points,
        cts.matches_played,
        cts.wins,
        cts.losses,
        CASE 
            WHEN cts.matches_played > 0 THEN ROUND((cts.wins::DECIMAL / cts.matches_played) * 100, 1)
            ELSE 0
        END as win_rate,
        cts.goals,
        cts.assists,
        cts.saves,
        cts.mvp_count,
        CASE 
            WHEN cts.matches_played > 0 THEN ROUND(cts.total_points::DECIMAL / cts.matches_played, 1)
            ELSE 0
        END as points_per_match
    FROM captain_tournament_scores cts
    JOIN users u ON cts.captain_id = u.id
    WHERE cts.tournament_id = tournament_id_param
    ORDER BY cts.total_points DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get tournament scoring statistics
CREATE OR REPLACE FUNCTION get_tournament_scoring_stats(tournament_id_param UUID)
RETURNS TABLE (
    total_captains INTEGER,
    total_matches INTEGER,
    total_points_awarded INTEGER,
    average_points_per_captain DECIMAL,
    highest_single_match_score INTEGER,
    most_mvps INTEGER,
    perfect_drafts INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT cts.captain_id)::INTEGER as total_captains,
        COALESCE(SUM(cts.matches_played), 0)::INTEGER as total_matches,
        COALESCE(SUM(cts.total_points), 0)::INTEGER as total_points_awarded,
        CASE 
            WHEN COUNT(DISTINCT cts.captain_id) > 0 THEN 
                ROUND(COALESCE(SUM(cts.total_points), 0)::DECIMAL / COUNT(DISTINCT cts.captain_id), 1)
            ELSE 0
        END as average_points_per_captain,
        COALESCE(MAX(cmp.total_points), 0)::INTEGER as highest_single_match_score,
        COALESCE(MAX(cts.mvp_count), 0)::INTEGER as most_mvps,
        COUNT(*) FILTER (WHERE cts.draft_bonus_points >= 25)::INTEGER as perfect_drafts
    FROM captain_tournament_scores cts
    LEFT JOIN captain_match_performance cmp ON cmp.captain_id = cts.captain_id AND cmp.tournament_id = cts.tournament_id
    WHERE cts.tournament_id = tournament_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to award automatic bonuses
CREATE OR REPLACE FUNCTION award_tournament_completion_bonuses(tournament_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    bonuses_awarded INTEGER := 0;
    captain_record RECORD;
BEGIN
    -- Award placement bonuses for top 3
    FOR captain_record IN 
        SELECT captain_id, rank, total_points
        FROM get_captain_leaderboard(tournament_id_param)
        WHERE rank <= 3
    LOOP
        INSERT INTO captain_tournament_bonuses (
            captain_id,
            tournament_id,
            bonus_type,
            bonus_points,
            description,
            awarded_at
        ) VALUES (
            captain_record.captain_id,
            tournament_id_param,
            'placement_' || captain_record.rank,
            CASE 
                WHEN captain_record.rank = 1 THEN 500
                WHEN captain_record.rank = 2 THEN 300
                WHEN captain_record.rank = 3 THEN 200
            END,
            CASE 
                WHEN captain_record.rank = 1 THEN '1st Place Finish'
                WHEN captain_record.rank = 2 THEN '2nd Place Finish'
                WHEN captain_record.rank = 3 THEN '3rd Place Finish'
            END,
            NOW()
        ) ON CONFLICT DO NOTHING;
        
        bonuses_awarded := bonuses_awarded + 1;
    END LOOP;

    -- Award MVP leader bonus
    INSERT INTO captain_tournament_bonuses (
        captain_id,
        tournament_id,
        bonus_type,
        bonus_points,
        description,
        awarded_at
    )
    SELECT 
        captain_id,
        tournament_id_param,
        'mvp_leader',
        100,
        'Most MVP Awards (' || mvp_count || ')',
        NOW()
    FROM get_captain_leaderboard(tournament_id_param)
    WHERE mvp_count = (SELECT MAX(mvp_count) FROM get_captain_leaderboard(tournament_id_param))
    AND mvp_count > 0
    LIMIT 1
    ON CONFLICT DO NOTHING;

    IF FOUND THEN
        bonuses_awarded := bonuses_awarded + 1;
    END IF;

    RETURN bonuses_awarded;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE captain_tournament_scores IS 'Comprehensive scoring data for tournament captains';
COMMENT ON TABLE captain_tournament_bonuses IS 'Special bonuses awarded to captains for achievements';

COMMENT ON FUNCTION update_captain_tournament_score() IS 'Automatically updates captain tournament scores when match performance is recorded';
COMMENT ON FUNCTION get_captain_leaderboard(UUID) IS 'Returns ranked leaderboard of captains with detailed statistics';
COMMENT ON FUNCTION get_tournament_scoring_stats(UUID) IS 'Returns comprehensive tournament scoring statistics';
COMMENT ON FUNCTION award_tournament_completion_bonuses(UUID) IS 'Awards automatic bonuses when tournament completes';

-- Insert initial scoring rules documentation
INSERT INTO tournament_activity_log (tournament_id, action, selection_type, captains_selected, timestamp)
SELECT 
    t.id,
    'scoring_system_initialized',
    'automatic',
    jsonb_build_object(
        'scoring_rules', jsonb_build_object(
            'win_points', 100,
            'loss_points', 25,
            'goal_points', 25,
            'assist_points', 20,
            'save_points', 5,
            'mvp_bonus', 50,
            'perfect_draft_bonus', 25
        )
    ),
    NOW()
FROM tournaments t
WHERE t.tournament_type = 'snake_draft'
ON CONFLICT DO NOTHING;
