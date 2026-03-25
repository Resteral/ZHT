-- Remove player pool system and simplify tournaments

-- Drop player pool related tables
DROP TABLE IF EXISTS tournament_player_pool CASCADE;
DROP TABLE IF EXISTS tournament_teams CASCADE;
DROP TABLE IF EXISTS tournament_team_members CASCADE;

-- Remove player pool settings column from tournaments
ALTER TABLE tournaments DROP COLUMN IF EXISTS player_pool_settings;

-- Add simplified settings column
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "draft_mode": "snake_draft",
  "pick_time_limit": 60,
  "auto_start": true,
  "num_teams": 4,
  "players_per_team": 4,
  "create_lobbies_on_finish": true
}'::jsonb;

-- Add columns to track lobby creation
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS lobbies_created INTEGER DEFAULT 0;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Add tournament_id to matches table for lobby tracking
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL;

-- Drop player pool related functions and triggers
DROP FUNCTION IF EXISTS create_tournament_teams() CASCADE;
DROP FUNCTION IF EXISTS make_pool_public_on_host() CASCADE;
DROP TRIGGER IF EXISTS trigger_create_tournament_teams ON tournaments;
DROP TRIGGER IF EXISTS trigger_make_pool_public_on_host ON tournaments;

-- Drop player pool related views
DROP VIEW IF EXISTS public_tournament_pools;

-- Create function to automatically create lobbies when tournament finishes
CREATE OR REPLACE FUNCTION create_lobbies_on_tournament_finish()
RETURNS TRIGGER AS $$
DECLARE
    lobby_count INTEGER;
    lobby_name TEXT;
    i INTEGER;
BEGIN
    -- Check if tournament status changed to completed and should create lobbies
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND 
       NEW.settings ? 'create_lobbies_on_finish' AND 
       (NEW.settings->>'create_lobbies_on_finish')::boolean = true THEN
        
        -- Calculate number of lobbies to create based on teams
        lobby_count := COALESCE((NEW.settings->>'num_teams')::integer, 4) / 2;
        
        -- Create lobbies for tournament matches
        FOR i IN 1..lobby_count LOOP
            lobby_name := NEW.name || ' - Match ' || i;
            
            INSERT INTO matches (
                name,
                match_type,
                status,
                max_participants,
                description,
                game_state,
                tournament_id,
                created_at
            ) VALUES (
                lobby_name,
                '4v4_draft',
                'waiting',
                COALESCE((NEW.settings->>'players_per_team')::integer, 4) * 2,
                'Tournament match from ' || NEW.name,
                'lobby',
                NEW.id,
                NOW()
            );
        END LOOP;
        
        -- Update tournament with lobby count
        NEW.lobbies_created := lobby_count;
        NEW.completed_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic lobby creation
CREATE TRIGGER trigger_create_lobbies_on_tournament_finish
    BEFORE UPDATE OF status ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION create_lobbies_on_tournament_finish();

-- Grant permissions
GRANT ALL ON tournaments TO authenticated;
GRANT ALL ON matches TO authenticated;
