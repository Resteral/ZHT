-- Create tournament player pool system tables

-- Tournament player pool table
CREATE TABLE IF NOT EXISTS tournament_player_pool (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'drafted', 'withdrawn')),
    draft_position INTEGER,
    team_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, user_id)
);

-- Tournament teams table
CREATE TABLE IF NOT EXISTS tournament_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    team_captain UUID REFERENCES users(id),
    budget_remaining DECIMAL(10,2) DEFAULT 0,
    draft_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament team members table
CREATE TABLE IF NOT EXISTS tournament_team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position TEXT,
    draft_cost DECIMAL(10,2) DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Add player pool settings to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS player_pool_settings JSONB DEFAULT '{
    "max_teams": 8,
    "players_per_team": 5,
    "max_pool_size": 50,
    "draft_type": "auction",
    "auction_budget": 500
}'::jsonb;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_player_pool_tournament ON tournament_player_pool(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_player_pool_user ON tournament_player_pool(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_player_pool_status ON tournament_player_pool(status);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament ON tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_team_members_team ON tournament_team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_team_members_user ON tournament_team_members(user_id);

-- Create function to automatically create teams when tournament settings change
CREATE OR REPLACE FUNCTION create_tournament_teams()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create teams if max_teams setting exists and no teams exist yet
    IF NEW.player_pool_settings ? 'max_teams' THEN
        -- Check if teams already exist
        IF NOT EXISTS (SELECT 1 FROM tournament_teams WHERE tournament_id = NEW.id) THEN
            -- Create teams based on max_teams setting
            INSERT INTO tournament_teams (tournament_id, team_name, draft_order, budget_remaining)
            SELECT 
                NEW.id,
                'Team ' || generate_series,
                generate_series,
                COALESCE((NEW.player_pool_settings->>'auction_budget')::decimal, 500)
            FROM generate_series(1, (NEW.player_pool_settings->>'max_teams')::integer);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create teams
DROP TRIGGER IF EXISTS trigger_create_tournament_teams ON tournaments;
CREATE TRIGGER trigger_create_tournament_teams
    AFTER INSERT OR UPDATE OF player_pool_settings ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION create_tournament_teams();

-- Grant permissions
GRANT ALL ON tournament_player_pool TO authenticated;
GRANT ALL ON tournament_teams TO authenticated;
GRANT ALL ON tournament_team_members TO authenticated;
