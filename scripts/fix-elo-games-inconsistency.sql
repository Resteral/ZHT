-- Fix ELO rating inconsistency for users with 0 games played
-- Users with 0 total_games should have starting ELO of 1200

-- Reset ELO to 1200 for users with 0 games played
UPDATE users 
SET 
  elo_rating = 1200,
  wins = 0,
  losses = 0,
  total_games = 0
WHERE total_games = 0 OR total_games IS NULL;

-- Ensure data consistency by updating total_games to match wins + losses
UPDATE users 
SET total_games = COALESCE(wins, 0) + COALESCE(losses, 0)
WHERE total_games != (COALESCE(wins, 0) + COALESCE(losses, 0));

-- Log the changes made
INSERT INTO admin_activity_log (
  admin_user_id,
  action_type,
  target_type,
  description,
  metadata
) VALUES (
  (SELECT id FROM users WHERE username = 'Resteral' LIMIT 1),
  'data_correction',
  'user_stats',
  'Fixed ELO rating inconsistency for users with 0 games played',
  '{"script": "fix-elo-games-inconsistency.sql", "action": "reset_elo_for_zero_games"}'::jsonb
);

-- Display affected users for verification
SELECT 
  username,
  elo_rating,
  total_games,
  wins,
  losses,
  created_at
FROM users 
WHERE username = 'Resteral' OR total_games = 0
ORDER BY username;
