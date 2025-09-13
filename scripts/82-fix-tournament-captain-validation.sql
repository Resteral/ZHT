-- Fix tournament validation to properly check for teams with captains
-- This ensures tournaments can only start when teams have captains assigned

-- Add function to validate tournament readiness
CREATE OR REPLACE FUNCTION validate_tournament_readiness(tournament_id_param UUID)
RETURNS JSON AS $$
DECLARE
    tournament_record RECORD;
    teams_with_captains INTEGER;
    total_participants INTEGER;
    required_teams INTEGER;
    players_per_team INTEGER;
    min_players INTEGER;
    result JSON;
BEGIN
    -- Get tournament details
    SELECT 
        t.*,
        COALESCE(t.max_teams, (t.player_pool_settings->>'max_teams')::INTEGER, 4) as calculated_max_teams,
        COALESCE((t.player_pool_settings->>'players_per_team')::INTEGER, 4) as calculated_players_per_team
    INTO tournament_record
    FROM tournaments t
    WHERE t.id = tournament_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'ready', false,
            'error', 'Tournament not found'
        );
    END IF;
    
    -- Calculate requirements
    required_teams := tournament_record.calculated_max_teams;
    players_per_team := tournament_record.calculated_players_per_team;
    min_players := required_teams * players_per_team;
    
    -- Count teams with captains
    SELECT COUNT(*)
    INTO teams_with_captains
    FROM tournament_teams tt
    WHERE tt.tournament_id = tournament_id_param
    AND tt.captain_id IS NOT NULL;
    
    -- Count total participants
    SELECT COUNT(*)
    INTO total_participants
    FROM tournament_participants tp
    WHERE tp.tournament_id = tournament_id_param
    AND tp.status = 'registered';
    
    -- Build result
    result := json_build_object(
        'ready', (teams_with_captains >= required_teams AND total_participants >= min_players),
        'teams_with_captains', teams_with_captains,
        'required_teams', required_teams,
        'total_participants', total_participants,
        'min_players', min_players,
        'missing_captains', GREATEST(0, required_teams - teams_with_captains),
        'missing_players', GREATEST(0, min_players - total_participants),
        'tournament_status', tournament_record.status
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to prevent tournament start without proper validation
CREATE OR REPLACE FUNCTION prevent_invalid_tournament_start()
RETURNS TRIGGER AS $$
DECLARE
    validation_result JSON;
BEGIN
    -- Only check when status changes to 'drafting' or 'active'
    IF NEW.status IN ('drafting', 'active') AND OLD.status = 'registration' THEN
        validation_result := validate_tournament_readiness(NEW.id);
        
        IF NOT (validation_result->>'ready')::BOOLEAN THEN
            RAISE EXCEPTION 'Cannot start tournament: %', 
                CASE 
                    WHEN (validation_result->>'missing_captains')::INTEGER > 0 THEN
                        format('Need %s more teams with captains (%s/%s)', 
                            validation_result->>'missing_captains',
                            validation_result->>'teams_with_captains',
                            validation_result->>'required_teams')
                    WHEN (validation_result->>'missing_players')::INTEGER > 0 THEN
                        format('Need %s more players (%s/%s)',
                            validation_result->>'missing_players',
                            validation_result->>'total_participants',
                            validation_result->>'min_players')
                    ELSE 'Tournament requirements not met'
                END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS validate_tournament_start_trigger ON tournaments;
CREATE TRIGGER validate_tournament_start_trigger
    BEFORE UPDATE ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION prevent_invalid_tournament_start();

-- Grant permissions
GRANT EXECUTE ON FUNCTION validate_tournament_readiness(UUID) TO authenticated;

-- Add helpful view for tournament readiness
CREATE OR REPLACE VIEW tournament_readiness AS
SELECT 
    t.id,
    t.name,
    t.status,
    t.max_participants,
    COALESCE(t.max_teams, (t.player_pool_settings->>'max_teams')::INTEGER, 4) as required_teams,
    COALESCE((t.player_pool_settings->>'players_per_team')::INTEGER, 4) as players_per_team,
    COUNT(DISTINCT tt.id) FILTER (WHERE tt.captain_id IS NOT NULL) as teams_with_captains,
    COUNT(DISTINCT tp.user_id) FILTER (WHERE tp.status = 'registered') as registered_players,
    (COUNT(DISTINCT tt.id) FILTER (WHERE tt.captain_id IS NOT NULL) >= 
     COALESCE(t.max_teams, (t.player_pool_settings->>'max_teams')::INTEGER, 4)) as has_enough_captains,
    (COUNT(DISTINCT tp.user_id) FILTER (WHERE tp.status = 'registered') >= 
     COALESCE(t.max_teams, (t.player_pool_settings->>'max_teams')::INTEGER, 4) * 
     COALESCE((t.player_pool_settings->>'players_per_team')::INTEGER, 4)) as has_enough_players
FROM tournaments t
LEFT JOIN tournament_teams tt ON t.id = tt.tournament_id
LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
GROUP BY t.id, t.name, t.status, t.max_participants, t.max_teams, t.player_pool_settings;

-- Grant access to the view
GRANT SELECT ON tournament_readiness TO authenticated;

COMMENT ON FUNCTION validate_tournament_readiness(UUID) IS 'Validates if a tournament is ready to start by checking teams with captains and player count';
COMMENT ON VIEW tournament_readiness IS 'Shows tournament readiness status including captain and player requirements';
