-- Fix tournament minimum player requirements
-- This script ensures tournaments have consistent minimum player calculations

-- Update any tournaments that might have inconsistent settings
UPDATE tournaments 
SET player_pool_settings = jsonb_set(
  COALESCE(player_pool_settings, '{}'::jsonb),
  '{players_per_team}',
  CASE 
    WHEN max_participants = 15 THEN '5'::jsonb
    WHEN max_participants = 20 THEN '5'::jsonb  
    ELSE '4'::jsonb
  END
)
WHERE player_pool_settings IS NULL 
   OR player_pool_settings->>'players_per_team' IS NULL;

-- Update max_teams based on max_participants for consistency
UPDATE tournaments 
SET max_teams = CASE 
  WHEN max_participants = 15 THEN 3  -- 3 teams × 5 players
  WHEN max_participants = 20 AND (player_pool_settings->>'players_per_team')::int = 5 THEN 4  -- 4 teams × 5 players
  WHEN max_participants = 20 AND (player_pool_settings->>'players_per_team')::int = 4 THEN 5  -- 5 teams × 4 players
  ELSE 4  -- Default: 4 teams × 4 players = 16
END
WHERE max_teams IS NULL 
   OR max_teams = 0;

-- Ensure player_pool_settings has the correct structure
UPDATE tournaments 
SET player_pool_settings = jsonb_set(
  COALESCE(player_pool_settings, '{}'::jsonb),
  '{player_organization}',
  '"teams"'::jsonb
)
WHERE player_pool_settings->>'player_organization' IS NULL;

-- Add indexes for better performance on tournament queries
CREATE INDEX IF NOT EXISTS idx_tournaments_settings_lookup 
ON tournaments(id, max_teams, max_participants) 
WHERE status IN ('registration', 'drafting');

-- Create a function to calculate minimum players consistently
CREATE OR REPLACE FUNCTION calculate_tournament_minimum_players(
  tournament_max_teams INTEGER,
  tournament_max_participants INTEGER,
  tournament_settings JSONB
) RETURNS INTEGER AS $$
DECLARE
  players_per_team INTEGER;
  num_teams INTEGER;
BEGIN
  -- Extract players per team from settings
  players_per_team := COALESCE((tournament_settings->>'players_per_team')::INTEGER, 4);
  
  -- Use max_teams if available, otherwise calculate from max_participants
  IF tournament_max_teams IS NOT NULL AND tournament_max_teams > 0 THEN
    num_teams := tournament_max_teams;
  ELSE
    -- Calculate teams based on max_participants
    num_teams := CASE 
      WHEN tournament_max_participants = 15 THEN 3
      WHEN tournament_max_participants = 20 AND players_per_team = 5 THEN 4
      WHEN tournament_max_participants = 20 AND players_per_team = 4 THEN 5
      ELSE 4
    END;
  END IF;
  
  RETURN num_teams * players_per_team;
END;
$$ LANGUAGE plpgsql;

-- Test the function with some sample data
DO $$
DECLARE
  test_result INTEGER;
BEGIN
  -- Test 3 teams × 5 players = 15
  test_result := calculate_tournament_minimum_players(3, 15, '{"players_per_team": 5}'::jsonb);
  ASSERT test_result = 15, 'Expected 15 players for 3x5 configuration';
  
  -- Test 4 teams × 4 players = 16  
  test_result := calculate_tournament_minimum_players(4, 16, '{"players_per_team": 4}'::jsonb);
  ASSERT test_result = 16, 'Expected 16 players for 4x4 configuration';
  
  RAISE NOTICE 'Tournament minimum player calculation tests passed!';
END;
$$;
