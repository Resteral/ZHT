-- Fix tournament team count defaults to use 4 teams instead of 8

-- Update existing tournaments that have the default 8 teams to use 4 teams
UPDATE tournaments 
SET player_pool_settings = jsonb_set(
    COALESCE(player_pool_settings, '{}'::jsonb),
    '{max_teams}',
    '4'::jsonb
)
WHERE 
    (player_pool_settings->>'max_teams')::int = 8
    AND status = 'registration'
    AND created_at > NOW() - INTERVAL '7 days'; -- Only update recent tournaments

-- Update tournaments that don't have max_teams set
UPDATE tournaments 
SET player_pool_settings = jsonb_set(
    COALESCE(player_pool_settings, '{}'::jsonb),
    '{max_teams}',
    '4'::jsonb
)
WHERE 
    player_pool_settings IS NULL 
    OR NOT (player_pool_settings ? 'max_teams')
    AND status = 'registration';

-- Update the default player_pool_settings for new tournaments
ALTER TABLE tournaments 
ALTER COLUMN player_pool_settings 
SET DEFAULT '{
    "max_teams": 4,
    "players_per_team": 4,
    "max_pool_size": 50,
    "draft_type": "auction",
    "auction_budget": 500
}'::jsonb;

-- Update the tournament teams creation function to use 4 teams as default
CREATE OR REPLACE FUNCTION create_tournament_teams()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create teams if max_teams setting exists and no teams exist yet
    IF NEW.player_pool_settings ? 'max_teams' THEN
        -- Check if teams already exist
        IF NOT EXISTS (SELECT 1 FROM tournament_teams WHERE tournament_id = NEW.id) THEN
            -- Create teams based on max_teams setting (default to 4 if not specified)
            INSERT INTO tournament_teams (tournament_id, team_name, draft_order, budget_remaining)
            SELECT 
                NEW.id,
                'Team ' || generate_series,
                generate_series,
                COALESCE((NEW.player_pool_settings->>'auction_budget')::decimal, 500)
            FROM generate_series(1, COALESCE((NEW.player_pool_settings->>'max_teams')::integer, 4));
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Log the changes
INSERT INTO tournament_status_history (tournament_id, previous_status, new_status, changed_by, change_type, changed_at)
SELECT 
    id,
    'system_update',
    'team_count_fixed',
    '00000000-0000-0000-0000-000000000000'::uuid,
    'automatic',
    NOW()
FROM tournaments 
WHERE (player_pool_settings->>'max_teams')::int = 4
AND status = 'registration'
AND created_at > NOW() - INTERVAL '7 days';
