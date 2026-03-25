-- Fix hardcoded team defaults in tournament settings
-- This script ensures all tournaments use their configured team settings instead of hardcoded values

-- Update tournaments that have hardcoded 8 teams to use their actual settings
UPDATE tournaments 
SET player_pool_settings = jsonb_set(
  COALESCE(player_pool_settings, '{}'::jsonb),
  '{max_teams}',
  CASE 
    WHEN (player_pool_settings->>'num_teams')::int IS NOT NULL 
    THEN (player_pool_settings->>'num_teams')::jsonb
    WHEN max_participants = 16 THEN '4'::jsonb
    WHEN max_participants = 15 THEN '3'::jsonb
    WHEN max_participants = 20 THEN '4'::jsonb
    ELSE '4'::jsonb
  END
)
WHERE player_pool_settings IS NULL 
   OR (player_pool_settings->>'max_teams') IS NULL
   OR (player_pool_settings->>'max_teams')::int = 8;

-- Ensure num_teams and max_teams are consistent
UPDATE tournaments 
SET player_pool_settings = jsonb_set(
  player_pool_settings,
  '{num_teams}',
  player_pool_settings->'max_teams'
)
WHERE (player_pool_settings->>'num_teams') IS NULL
   OR (player_pool_settings->>'num_teams') != (player_pool_settings->>'max_teams');

-- Update players_per_team based on max_participants and team count
UPDATE tournaments 
SET player_pool_settings = jsonb_set(
  player_pool_settings,
  '{players_per_team}',
  CASE 
    WHEN max_participants IS NOT NULL AND (player_pool_settings->>'max_teams')::int IS NOT NULL
    THEN (max_participants / (player_pool_settings->>'max_teams')::int)::text::jsonb
    ELSE '4'::jsonb
  END
)
WHERE (player_pool_settings->>'players_per_team') IS NULL;

-- Create missing tournament teams for tournaments that need them
INSERT INTO tournament_teams (tournament_id, team_name, team_number, created_at)
SELECT 
  t.id,
  'Team ' || generate_series.num,
  generate_series.num,
  NOW()
FROM tournaments t
CROSS JOIN generate_series(1, COALESCE((t.player_pool_settings->>'max_teams')::int, 4)) AS generate_series(num)
WHERE NOT EXISTS (
  SELECT 1 FROM tournament_teams tt 
  WHERE tt.tournament_id = t.id 
  AND tt.team_number = generate_series.num
)
AND t.status IN ('registration', 'active', 'drafting');

-- Add index for better performance on tournament settings queries
CREATE INDEX IF NOT EXISTS idx_tournaments_player_pool_settings_max_teams 
ON tournaments USING gin ((player_pool_settings->'max_teams'));

-- Add constraint to ensure max_teams is reasonable
ALTER TABLE tournaments 
ADD CONSTRAINT check_max_teams_reasonable 
CHECK ((player_pool_settings->>'max_teams')::int BETWEEN 2 AND 16);

COMMENT ON CONSTRAINT check_max_teams_reasonable ON tournaments IS 
'Ensures tournament max_teams is between 2 and 16 teams';
