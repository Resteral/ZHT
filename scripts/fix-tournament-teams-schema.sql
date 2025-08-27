-- Fix tournament teams database schema mismatch
-- The tournament_teams table doesn't have a team_name column, it references teams via team_id

-- Drop the existing trigger that's causing the error
DROP TRIGGER IF EXISTS trigger_create_tournament_teams ON tournaments;
DROP FUNCTION IF EXISTS create_tournament_teams();

-- Create updated function that works with actual database schema
CREATE OR REPLACE FUNCTION create_tournament_teams()
RETURNS TRIGGER AS $$
DECLARE
    team_record RECORD;
    team_counter INTEGER := 1;
    max_teams_count INTEGER;
BEGIN
    -- Only create teams if max_teams setting exists and no teams exist yet
    IF NEW.player_pool_settings ? 'max_teams' THEN
        max_teams_count := (NEW.player_pool_settings->>'max_teams')::integer;
        
        -- Check if teams already exist for this tournament
        IF NOT EXISTS (SELECT 1 FROM tournament_teams WHERE tournament_id = NEW.id) THEN
            -- Create teams and link them to tournament
            FOR team_counter IN 1..max_teams_count LOOP
                -- First create a team record in the teams table
                INSERT INTO teams (name, description, game, is_active)
                VALUES (
                    'Team ' || team_counter,
                    'Auto-generated team for tournament: ' || NEW.name,
                    COALESCE(NEW.game, 'hockey'),
                    true
                )
                RETURNING * INTO team_record;
                
                -- Then create the tournament_teams record referencing the team
                INSERT INTO tournament_teams (tournament_id, team_id, auction_price, is_active, registered_at)
                VALUES (
                    NEW.id,
                    team_record.id,
                    COALESCE((NEW.player_pool_settings->>'auction_budget')::integer, 500),
                    true,
                    NOW()
                );
            END LOOP;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated trigger
CREATE TRIGGER trigger_create_tournament_teams
    AFTER INSERT OR UPDATE OF player_pool_settings ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION create_tournament_teams();

-- Updated tournament service to use correct database structure
