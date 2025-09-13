-- Team name history tracking
CREATE TABLE IF NOT EXISTS team_name_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES tournament_teams(id) ON DELETE CASCADE,
    old_name VARCHAR(100) NOT NULL,
    new_name VARCHAR(100) NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_name_history_team ON team_name_history(team_id);
CREATE INDEX IF NOT EXISTS idx_team_name_history_changed_at ON team_name_history(changed_at);

-- Grant permissions
GRANT ALL ON team_name_history TO authenticated;

-- Enable RLS
ALTER TABLE team_name_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "Users can view name history for teams they participate in"
    ON team_name_history FOR SELECT
    USING (
        team_id IN (
            SELECT tt.id FROM tournament_teams tt
            JOIN tournament_team_members ttm ON tt.id = ttm.team_id
            WHERE ttm.user_id = auth.uid()
        )
    );

CREATE POLICY "Team captains can manage name history"
    ON team_name_history FOR ALL
    USING (
        team_id IN (
            SELECT id FROM tournament_teams
            WHERE captain_id = auth.uid()
        )
    );
