-- Enhanced Snake Draft System Tables

-- Snake draft settings and configurations
CREATE TABLE IF NOT EXISTS snake_draft_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    total_rounds INTEGER DEFAULT 6,
    pick_time_limit INTEGER DEFAULT 120, -- seconds per pick
    auto_pick_enabled BOOLEAN DEFAULT TRUE,
    draft_order_algorithm VARCHAR(50) DEFAULT 'elo_based', -- 'elo_based', 'random', 'manual'
    captain_selection_method VARCHAR(50) DEFAULT 'highest_elo', -- 'highest_elo', 'random', 'manual'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id)
);

-- Snake draft state tracking
CREATE TABLE IF NOT EXISTS snake_draft_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'captain_selection', 'active', 'paused', 'completed'
    current_round INTEGER DEFAULT 1,
    current_pick INTEGER DEFAULT 1,
    current_team_id UUID REFERENCES tournament_teams(id),
    time_remaining INTEGER DEFAULT 120,
    draft_order JSONB, -- Array of team IDs in draft order
    pick_history JSONB DEFAULT '[]', -- Array of pick objects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id)
);

-- Snake draft picks tracking
CREATE TABLE IF NOT EXISTS snake_draft_picks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID REFERENCES tournament_teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    pick_number INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    pick_time_taken INTEGER, -- seconds taken to make the pick
    was_auto_pick BOOLEAN DEFAULT FALSE,
    pick_value_score DECIMAL(5,2), -- calculated value of the pick
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Captain draft strategies and preferences
CREATE TABLE IF NOT EXISTS captain_draft_strategies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    captain_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    strategy_name VARCHAR(100) NOT NULL,
    target_positions TEXT[], -- Array of preferred positions
    priority_players UUID[], -- Array of player IDs to target
    avoid_players UUID[], -- Array of player IDs to avoid
    auto_pick_threshold INTEGER DEFAULT 10, -- seconds remaining to trigger auto-pick
    risk_tolerance VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    draft_philosophy TEXT, -- Free text strategy notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(captain_id, tournament_id)
);

-- Draft analytics and insights
CREATE TABLE IF NOT EXISTS snake_draft_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID REFERENCES tournament_teams(id) ON DELETE CASCADE,
    total_team_value DECIMAL(10,2) DEFAULT 0,
    average_player_elo DECIMAL(7,2) DEFAULT 0,
    best_pick_round INTEGER,
    worst_pick_round INTEGER,
    draft_efficiency_score DECIMAL(5,2), -- How well the team drafted relative to available options
    position_balance_score DECIMAL(5,2), -- How balanced the team composition is
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, team_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_snake_draft_state_tournament ON snake_draft_state(tournament_id);
CREATE INDEX IF NOT EXISTS idx_snake_draft_picks_tournament ON snake_draft_picks(tournament_id);
CREATE INDEX IF NOT EXISTS idx_snake_draft_picks_team ON snake_draft_picks(team_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_strategies_captain ON captain_draft_strategies(captain_id);
CREATE INDEX IF NOT EXISTS idx_snake_draft_analytics_tournament ON snake_draft_analytics(tournament_id);

-- Functions for snake draft management
CREATE OR REPLACE FUNCTION generate_snake_draft_order(tournament_id_param UUID)
RETURNS JSONB AS $$
DECLARE
    teams_data JSONB;
    draft_order JSONB := '[]';
    team_count INTEGER;
    total_rounds INTEGER := 6;
    round_num INTEGER;
    team_record RECORD;
BEGIN
    -- Get teams ordered by draft_order
    SELECT jsonb_agg(
        jsonb_build_object(
            'team_id', id,
            'team_name', team_name,
            'draft_order', draft_order
        ) ORDER BY draft_order
    ) INTO teams_data
    FROM tournament_teams
    WHERE tournament_id = tournament_id_param;
    
    team_count := jsonb_array_length(teams_data);
    
    -- Generate snake draft order
    FOR round_num IN 1..total_rounds LOOP
        IF round_num % 2 = 1 THEN
            -- Odd rounds: normal order
            FOR i IN 0..(team_count - 1) LOOP
                draft_order := draft_order || (teams_data->i->'team_id');
            END LOOP;
        ELSE
            -- Even rounds: reverse order
            FOR i IN REVERSE (team_count - 1)..0 LOOP
                draft_order := draft_order || (teams_data->i->'team_id');
            END LOOP;
        END IF;
    END LOOP;
    
    RETURN draft_order;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate draft pick value
CREATE OR REPLACE FUNCTION calculate_pick_value(
    player_id_param UUID,
    pick_number_param INTEGER,
    total_picks_param INTEGER
) RETURNS DECIMAL AS $$
DECLARE
    player_elo INTEGER;
    position_scarcity DECIMAL := 1.0;
    pick_value DECIMAL;
BEGIN
    -- Get player ELO
    SELECT elo INTO player_elo
    FROM users
    WHERE id = player_id_param;
    
    -- Calculate position scarcity multiplier (simplified)
    -- In a real implementation, this would consider remaining players at each position
    position_scarcity := 1.0 + (pick_number_param::DECIMAL / total_picks_param::DECIMAL * 0.5);
    
    -- Calculate pick value based on ELO and position in draft
    pick_value := (player_elo::DECIMAL / 1000.0) * position_scarcity;
    
    RETURN ROUND(pick_value, 2);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update draft analytics after each pick
CREATE OR REPLACE FUNCTION update_draft_analytics()
RETURNS TRIGGER AS $$
BEGIN
    -- Update team analytics after each pick
    INSERT INTO snake_draft_analytics (tournament_id, team_id, total_team_value, average_player_elo)
    SELECT 
        NEW.tournament_id,
        NEW.team_id,
        COALESCE(SUM(p.pick_value_score), 0) as total_value,
        COALESCE(AVG(u.elo), 0) as avg_elo
    FROM snake_draft_picks p
    JOIN users u ON p.player_id = u.id
    WHERE p.tournament_id = NEW.tournament_id AND p.team_id = NEW.team_id
    ON CONFLICT (tournament_id, team_id) 
    DO UPDATE SET
        total_team_value = EXCLUDED.total_team_value,
        average_player_elo = EXCLUDED.average_player_elo,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_draft_analytics
    AFTER INSERT ON snake_draft_picks
    FOR EACH ROW
    EXECUTE FUNCTION update_draft_analytics();

-- Initialize snake draft settings for existing tournaments
INSERT INTO snake_draft_settings (tournament_id, total_rounds, pick_time_limit)
SELECT id, 6, 120
FROM tournaments
WHERE draft_type = 'snake'
ON CONFLICT (tournament_id) DO NOTHING;

-- Grant permissions
GRANT ALL ON snake_draft_settings TO authenticated;
GRANT ALL ON snake_draft_state TO authenticated;
GRANT ALL ON snake_draft_picks TO authenticated;
GRANT ALL ON captain_draft_strategies TO authenticated;
GRANT ALL ON snake_draft_analytics TO authenticated;

-- Enable RLS
ALTER TABLE snake_draft_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE snake_draft_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE snake_draft_picks ENABLE ROW LEVEL SECURITY;
ALTER TABLE captain_draft_strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE snake_draft_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view snake draft settings for tournaments they participate in"
    ON snake_draft_settings FOR SELECT
    USING (
        tournament_id IN (
            SELECT tournament_id FROM tournament_teams tt
            JOIN tournament_team_members ttm ON tt.id = ttm.team_id
            WHERE ttm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view snake draft state for tournaments they participate in"
    ON snake_draft_state FOR SELECT
    USING (
        tournament_id IN (
            SELECT tournament_id FROM tournament_teams tt
            JOIN tournament_team_members ttm ON tt.id = ttm.team_id
            WHERE ttm.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can view snake draft picks for tournaments they participate in"
    ON snake_draft_picks FOR SELECT
    USING (
        tournament_id IN (
            SELECT tournament_id FROM tournament_teams tt
            JOIN tournament_team_members ttm ON tt.id = ttm.team_id
            WHERE ttm.user_id = auth.uid()
        )
    );

CREATE POLICY "Captains can manage their draft strategies"
    ON captain_draft_strategies FOR ALL
    USING (captain_id = auth.uid());

CREATE POLICY "Users can view draft analytics for tournaments they participate in"
    ON snake_draft_analytics FOR SELECT
    USING (
        tournament_id IN (
            SELECT tournament_id FROM tournament_teams tt
            JOIN tournament_team_members ttm ON tt.id = ttm.team_id
            WHERE ttm.user_id = auth.uid()
        )
    );
