-- Fix tournament teams creation for existing tournaments

-- First, let's ensure the tournament_teams table has the correct schema
-- Drop and recreate with the correct structure for draft tournaments
DROP TABLE IF EXISTS tournament_team_members CASCADE;
DROP TABLE IF EXISTS tournament_teams CASCADE;

-- Create tournament teams table with correct schema for draft tournaments
CREATE TABLE tournament_teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    team_captain UUID REFERENCES users(id),
    budget_remaining DECIMAL(10,2) DEFAULT 500,
    draft_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tournament team members table
CREATE TABLE tournament_team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position TEXT,
    draft_cost DECIMAL(10,2) DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_tournament_teams_tournament_id ON tournament_teams(tournament_id);
CREATE INDEX idx_tournament_teams_captain ON tournament_teams(team_captain);
CREATE INDEX idx_tournament_team_members_team_id ON tournament_team_members(team_id);
CREATE INDEX idx_tournament_team_members_user_id ON tournament_team_members(user_id);

-- Create function to create teams for existing tournaments
CREATE OR REPLACE FUNCTION create_teams_for_existing_tournaments()
RETURNS void AS $$
DECLARE
    tournament_record RECORD;
    max_teams_setting INTEGER;
    auction_budget_setting DECIMAL(10,2);
BEGIN
    -- Loop through all tournaments that have player_pool_settings but no teams
    FOR tournament_record IN 
        SELECT id, player_pool_settings 
        FROM tournaments 
        WHERE player_pool_settings IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM tournament_teams WHERE tournament_id = tournaments.id)
    LOOP
        -- Extract max_teams from player_pool_settings
        max_teams_setting := COALESCE((tournament_record.player_pool_settings->>'max_teams')::integer, 8);
        auction_budget_setting := COALESCE((tournament_record.player_pool_settings->>'auction_budget')::decimal, 500);
        
        -- Create teams for this tournament
        INSERT INTO tournament_teams (tournament_id, team_name, draft_order, budget_remaining)
        SELECT 
            tournament_record.id,
            'Team ' || generate_series,
            generate_series,
            auction_budget_setting
        FROM generate_series(1, max_teams_setting);
        
        RAISE NOTICE 'Created % teams for tournament %', max_teams_setting, tournament_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to create teams for existing tournaments
SELECT create_teams_for_existing_tournaments();

-- Recreate the trigger function with better error handling
CREATE OR REPLACE FUNCTION create_tournament_teams()
RETURNS TRIGGER AS $$
DECLARE
    max_teams_setting INTEGER;
    auction_budget_setting DECIMAL(10,2);
BEGIN
    -- Only create teams if max_teams setting exists and no teams exist yet
    IF NEW.player_pool_settings ? 'max_teams' THEN
        -- Check if teams already exist
        IF NOT EXISTS (SELECT 1 FROM tournament_teams WHERE tournament_id = NEW.id) THEN
            -- Extract settings
            max_teams_setting := COALESCE((NEW.player_pool_settings->>'max_teams')::integer, 8);
            auction_budget_setting := COALESCE((NEW.player_pool_settings->>'auction_budget')::decimal, 500);
            
            -- Create teams based on max_teams setting
            INSERT INTO tournament_teams (tournament_id, team_name, draft_order, budget_remaining)
            SELECT 
                NEW.id,
                'Team ' || generate_series,
                generate_series,
                auction_budget_setting
            FROM generate_series(1, max_teams_setting);
            
            RAISE NOTICE 'Auto-created % teams for tournament %', max_teams_setting, NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_tournament_teams ON tournaments;
CREATE TRIGGER trigger_create_tournament_teams
    AFTER INSERT OR UPDATE OF player_pool_settings ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION create_tournament_teams();

-- Grant permissions
GRANT ALL ON tournament_teams TO authenticated;
GRANT ALL ON tournament_team_members TO authenticated;

-- Clean up the temporary function
DROP FUNCTION create_teams_for_existing_tournaments();
