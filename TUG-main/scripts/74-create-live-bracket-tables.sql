-- Create tournament teams table for snake draft teams
CREATE TABLE IF NOT EXISTS tournament_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_name VARCHAR(100) NOT NULL,
    captain_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_team_elo INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team members table
CREATE TABLE IF NOT EXISTS tournament_team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position INTEGER NOT NULL, -- Draft position (1st pick, 2nd pick, etc.)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id),
    UNIQUE(team_id, position)
);

-- Create tournament matches table for live bracket
CREATE TABLE IF NOT EXISTS tournament_matches (
    id VARCHAR(100) PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    match_number INTEGER NOT NULL,
    team1_id UUID REFERENCES tournament_teams(id) ON DELETE SET NULL,
    team2_id UUID REFERENCES tournament_teams(id) ON DELETE SET NULL,
    team1_captain UUID REFERENCES users(id) ON DELETE SET NULL,
    team2_captain UUID REFERENCES users(id) ON DELETE SET NULL,
    team1_score INTEGER DEFAULT 0,
    team2_score INTEGER DEFAULT 0,
    winner_team_id UUID REFERENCES tournament_teams(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'live', 'completed')),
    bracket_position VARCHAR(20) NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    spectator_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create match spectators table
CREATE TABLE IF NOT EXISTS match_spectators (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id VARCHAR(100) NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id, user_id)
);

-- Create captain match performance table
CREATE TABLE IF NOT EXISTS captain_match_performance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id VARCHAR(100) NOT NULL REFERENCES tournament_matches(id) ON DELETE CASCADE,
    captain_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    saves INTEGER DEFAULT 0,
    mvp BOOLEAN DEFAULT FALSE,
    performance_score INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id, captain_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id ON tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_captain_id ON tournament_teams(captain_id);
CREATE INDEX IF NOT EXISTS idx_tournament_team_members_team_id ON tournament_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_team_members_user_id ON tournament_team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_status ON tournament_matches(status);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_round ON tournament_matches(round_number);
CREATE INDEX IF NOT EXISTS idx_match_spectators_match_id ON match_spectators(match_id);
CREATE INDEX IF NOT EXISTS idx_captain_performance_match_id ON captain_match_performance(match_id);
CREATE INDEX IF NOT EXISTS idx_captain_performance_captain_id ON captain_match_performance(captain_id);

-- Create function to automatically update team ELO when members are added
CREATE OR REPLACE FUNCTION update_team_total_elo()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tournament_teams 
    SET total_team_elo = (
        SELECT COALESCE(SUM(u.elo_rating), 0)
        FROM tournament_team_members ttm
        JOIN users u ON ttm.user_id = u.id
        WHERE ttm.team_id = COALESCE(NEW.team_id, OLD.team_id)
    ),
    updated_at = NOW()
    WHERE id = COALESCE(NEW.team_id, OLD.team_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for team ELO updates
DROP TRIGGER IF EXISTS trigger_update_team_elo_insert ON tournament_team_members;
CREATE TRIGGER trigger_update_team_elo_insert
    AFTER INSERT ON tournament_team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_team_total_elo();

DROP TRIGGER IF EXISTS trigger_update_team_elo_delete ON tournament_team_members;
CREATE TRIGGER trigger_update_team_elo_delete
    AFTER DELETE ON tournament_team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_team_total_elo();

-- Create function to calculate captain performance score
CREATE OR REPLACE FUNCTION calculate_captain_performance_score()
RETURNS TRIGGER AS $$
BEGIN
    NEW.performance_score = (NEW.goals * 10) + (NEW.assists * 8) + (ABS(NEW.saves) * 5) + (CASE WHEN NEW.mvp THEN 25 ELSE 0 END);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for captain performance scoring
DROP TRIGGER IF EXISTS trigger_calculate_performance_score ON captain_match_performance;
CREATE TRIGGER trigger_calculate_performance_score
    BEFORE INSERT OR UPDATE ON captain_match_performance
    FOR EACH ROW
    EXECUTE FUNCTION calculate_captain_performance_score();

-- Create function to get live bracket overview
CREATE OR REPLACE FUNCTION get_live_bracket_overview(tournament_id_param UUID)
RETURNS TABLE (
    total_matches INTEGER,
    completed_matches INTEGER,
    live_matches INTEGER,
    upcoming_matches INTEGER,
    total_spectators INTEGER,
    current_round INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_matches,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as completed_matches,
        COUNT(*) FILTER (WHERE status = 'live')::INTEGER as live_matches,
        COUNT(*) FILTER (WHERE status IN ('waiting', 'ready'))::INTEGER as upcoming_matches,
        COALESCE(SUM(spectator_count), 0)::INTEGER as total_spectators,
        COALESCE(MAX(round_number) FILTER (WHERE status = 'live'), 1)::INTEGER as current_round
    FROM tournament_matches
    WHERE tournament_id = tournament_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create function to get team performance summary
CREATE OR REPLACE FUNCTION get_team_performance_summary(tournament_id_param UUID)
RETURNS TABLE (
    team_id UUID,
    team_name VARCHAR,
    captain_username VARCHAR,
    matches_played INTEGER,
    wins INTEGER,
    losses INTEGER,
    total_goals INTEGER,
    total_assists INTEGER,
    total_saves INTEGER,
    mvp_count INTEGER,
    performance_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tt.id as team_id,
        tt.team_name,
        u.username as captain_username,
        COUNT(tm.id)::INTEGER as matches_played,
        COUNT(*) FILTER (WHERE tm.winner_team_id = tt.id)::INTEGER as wins,
        COUNT(*) FILTER (WHERE tm.winner_team_id IS NOT NULL AND tm.winner_team_id != tt.id)::INTEGER as losses,
        COALESCE(SUM(cmp.goals), 0)::INTEGER as total_goals,
        COALESCE(SUM(cmp.assists), 0)::INTEGER as total_assists,
        COALESCE(SUM(cmp.saves), 0)::INTEGER as total_saves,
        COUNT(*) FILTER (WHERE cmp.mvp = true)::INTEGER as mvp_count,
        COALESCE(SUM(cmp.performance_score), 0)::INTEGER as performance_score
    FROM tournament_teams tt
    JOIN users u ON tt.captain_id = u.id
    LEFT JOIN tournament_matches tm ON (tm.team1_id = tt.id OR tm.team2_id = tt.id) AND tm.status = 'completed'
    LEFT JOIN captain_match_performance cmp ON cmp.match_id = tm.id AND cmp.captain_id = tt.captain_id
    WHERE tt.tournament_id = tournament_id_param
    GROUP BY tt.id, tt.team_name, u.username
    ORDER BY performance_score DESC, wins DESC;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE tournament_teams IS 'Teams formed from snake draft with captains and members';
COMMENT ON TABLE tournament_team_members IS 'Individual team members with their draft positions';
COMMENT ON TABLE tournament_matches IS 'Live tournament bracket matches with real-time updates';
COMMENT ON TABLE match_spectators IS 'Users spectating live matches';
COMMENT ON TABLE captain_match_performance IS 'Captain performance data for scoring system';

COMMENT ON FUNCTION update_team_total_elo() IS 'Automatically calculates team total ELO when members change';
COMMENT ON FUNCTION calculate_captain_performance_score() IS 'Calculates captain performance score based on stats';
COMMENT ON FUNCTION get_live_bracket_overview(UUID) IS 'Returns comprehensive bracket statistics';
COMMENT ON FUNCTION get_team_performance_summary(UUID) IS 'Returns team performance summary with captain stats';
