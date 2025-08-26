-- Fix missing database relationships for tournament tables
-- This ensures proper foreign key constraints and relationships

-- Add foreign key constraint between tournament_participants and users if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tournament_participants_user_id_fkey'
    ) THEN
        ALTER TABLE tournament_participants 
        ADD CONSTRAINT tournament_participants_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key constraint between tournament_matches and tournament_teams if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tournament_matches_team1_fkey'
    ) THEN
        ALTER TABLE tournament_matches 
        ADD CONSTRAINT tournament_matches_team1_fkey 
        FOREIGN KEY (team1_captain_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tournament_matches_team2_fkey'
    ) THEN
        ALTER TABLE tournament_matches 
        ADD CONSTRAINT tournament_matches_team2_fkey 
        FOREIGN KEY (team2_captain_id) REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key constraint between tournament_teams and teams if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tournament_teams_team_id_fkey'
    ) THEN
        ALTER TABLE tournament_teams 
        ADD CONSTRAINT tournament_teams_team_id_fkey 
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Refresh the schema cache by analyzing tables
ANALYZE tournament_participants;
ANALYZE tournament_matches;
ANALYZE tournament_teams;
ANALYZE users;
ANALYZE teams;

-- Create indexes for better performance on foreign key lookups
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_team1_captain ON tournament_matches(team1_captain_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_team2_captain ON tournament_matches(team2_captain_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_team_id ON tournament_teams(team_id);
