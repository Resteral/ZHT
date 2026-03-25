-- Fix tournament settings consistency to ensure validation uses correct settings
-- This ensures all tournaments have proper player_pool_settings and validation works correctly

-- Update tournaments that don't have player_pool_settings
UPDATE tournaments 
SET player_pool_settings = jsonb_build_object(
    'max_teams', COALESCE(max_teams, 4),
    'players_per_team', 4,
    'max_pool_size', 50,
    'draft_type', 'auction',
    'auction_budget', 500
)
WHERE player_pool_settings IS NULL OR player_pool_settings = '{}'::jsonb;

-- Ensure all tournaments have consistent team structure
-- Create missing teams for tournaments that should have them
INSERT INTO tournament_teams (tournament_id, team_name, draft_order, budget_remaining)
SELECT 
    t.id,
    'Team ' || generate_series,
    generate_series,
    COALESCE((t.player_pool_settings->>'auction_budget')::decimal, 500)
FROM tournaments t
CROSS JOIN generate_series(1, (t.player_pool_settings->>'max_teams')::integer)
WHERE NOT EXISTS (
    SELECT 1 FROM tournament_teams tt 
    WHERE tt.tournament_id = t.id
)
AND t.player_pool_settings ? 'max_teams';

-- Update the validation function to use player_pool_settings consistently
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
    -- Get tournament details with proper settings
    SELECT 
        t.*,
        (t.player_pool_settings->>'max_teams')::INTEGER as calculated_max_teams,
        (t.player_pool_settings->>'players_per_team')::INTEGER as calculated_players_per_team
    INTO tournament_record
    FROM tournaments t
    WHERE t.id = tournament_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'ready', false,
            'error', 'Tournament not found'
        );
    END IF;
    
    -- Use settings from player_pool_settings JSONB column
    required_teams := COALESCE(tournament_record.calculated_max_teams, 4);
    players_per_team := COALESCE(tournament_record.calculated_players_per_team, 4);
    min_players := required_teams * players_per_team;
    
    -- Count teams with captains assigned
    SELECT COUNT(*)
    INTO teams_with_captains
    FROM tournament_teams tt
    WHERE tt.tournament_id = tournament_id_param
    AND tt.captain_id IS NOT NULL;
    
    -- Count total registered participants
    SELECT COUNT(*)
    INTO total_participants
    FROM tournament_participants tp
    WHERE tp.tournament_id = tournament_id_param
    AND tp.status = 'registered';
    
    -- Build result with detailed validation info
    result := json_build_object(
        'ready', (teams_with_captains >= required_teams AND total_participants >= min_players),
        'teams_with_captains', teams_with_captains,
        'required_teams', required_teams,
        'total_participants', total_participants,
        'min_players', min_players,
        'players_per_team', players_per_team,
        'missing_captains', GREATEST(0, required_teams - teams_with_captains),
        'missing_players', GREATEST(0, min_players - total_participants),
        'tournament_status', tournament_record.status,
        'settings_source', 'player_pool_settings'
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the tournament readiness view to use player_pool_settings
DROP VIEW IF EXISTS tournament_readiness;
CREATE VIEW tournament_readiness AS
SELECT 
    t.id,
    t.name,
    t.status,
    t.max_participants,
    (t.player_pool_settings->>'max_teams')::INTEGER as required_teams,
    (t.player_pool_settings->>'players_per_team')::INTEGER as players_per_team,
    ((t.player_pool_settings->>'max_teams')::INTEGER * (t.player_pool_settings->>'players_per_team')::INTEGER) as total_slots_needed,
    COUNT(DISTINCT tt.id) FILTER (WHERE tt.captain_id IS NOT NULL) as teams_with_captains,
    COUNT(DISTINCT tp.user_id) FILTER (WHERE tp.status = 'registered') as registered_players,
    (COUNT(DISTINCT tt.id) FILTER (WHERE tt.captain_id IS NOT NULL) >= 
     (t.player_pool_settings->>'max_teams')::INTEGER) as has_enough_captains,
    (COUNT(DISTINCT tp.user_id) FILTER (WHERE tp.status = 'registered') >= 
     ((t.player_pool_settings->>'max_teams')::INTEGER * (t.player_pool_settings->>'players_per_team')::INTEGER)) as has_enough_players,
    (COUNT(DISTINCT tt.id) FILTER (WHERE tt.captain_id IS NOT NULL) >= 
     (t.player_pool_settings->>'max_teams')::INTEGER AND
     COUNT(DISTINCT tp.user_id) FILTER (WHERE tp.status = 'registered') >= 
     ((t.player_pool_settings->>'max_teams')::INTEGER * (t.player_pool_settings->>'players_per_team')::INTEGER)) as ready_to_start
FROM tournaments t
LEFT JOIN tournament_teams tt ON t.id = tt.tournament_id
LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
WHERE t.player_pool_settings IS NOT NULL
GROUP BY t.id, t.name, t.status, t.max_participants, t.player_pool_settings;

-- Grant permissions
GRANT SELECT ON tournament_readiness TO authenticated;

-- Add helpful function to get tournament requirements
CREATE OR REPLACE FUNCTION get_tournament_requirements(tournament_id_param UUID)
RETURNS JSON AS $$
DECLARE
    tournament_record RECORD;
    result JSON;
BEGIN
    SELECT 
        t.id,
        t.name,
        t.status,
        (t.player_pool_settings->>'max_teams')::INTEGER as max_teams,
        (t.player_pool_settings->>'players_per_team')::INTEGER as players_per_team,
        (t.player_pool_settings->>'draft_type')::TEXT as draft_type
    INTO tournament_record
    FROM tournaments t
    WHERE t.id = tournament_id_param;
    
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Tournament not found');
    END IF;
    
    result := json_build_object(
        'tournament_id', tournament_record.id,
        'tournament_name', tournament_record.name,
        'status', tournament_record.status,
        'max_teams', COALESCE(tournament_record.max_teams, 4),
        'players_per_team', COALESCE(tournament_record.players_per_team, 4),
        'total_players_needed', COALESCE(tournament_record.max_teams, 4) * COALESCE(tournament_record.players_per_team, 4),
        'draft_type', COALESCE(tournament_record.draft_type, 'auction')
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_tournament_requirements(UUID) TO authenticated;

COMMENT ON FUNCTION validate_tournament_readiness(UUID) IS 'Validates tournament readiness using player_pool_settings for accurate team and player requirements';
COMMENT ON FUNCTION get_tournament_requirements(UUID) IS 'Returns tournament requirements from player_pool_settings';
COMMENT ON VIEW tournament_readiness IS 'Shows tournament readiness using player_pool_settings for accurate validation';
