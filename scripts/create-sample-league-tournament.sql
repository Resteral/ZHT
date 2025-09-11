-- Create a sample ZHL League Tournament for testing
INSERT INTO tournaments (
  id,
  name,
  description,
  game,
  tournament_type,
  status,
  max_participants,
  entry_fee,
  prize_pool,
  start_date,
  end_date,
  team_based,
  created_by,
  player_pool_settings,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'ZHL Winter League Championship',
  'Long-term competitive ZHL league tournament with leaderboard progression and seasonal rewards. Join the ultimate hockey competition!',
  'hockey',
  'league', -- Setting tournament_type to 'league' to show in ZHL League section
  'registration',
  64,
  25.00,
  5000.00,
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '35 days', -- 35-day duration for long-term league
  true,
  (SELECT id FROM users WHERE username = 'Resteral' LIMIT 1), -- Set creator to Resteral
  jsonb_build_object(
    'max_teams', 16,
    'draft_mode', 'snake_draft',
    'players_per_team', 4,
    'auto_start', false,
    'create_lobbies_on_finish', true,
    'bracket_type', 'round_robin',
    'auction_budget', 500,
    'duration_type', 'long',
    'league_format', 'seasonal'
  ),
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'ZHL Spring League Series',
  'Competitive spring season league with weekly matches and playoff structure. Perfect for dedicated players looking for long-term competition.',
  'hockey',
  'league', -- Another league tournament
  'active',
  32,
  15.00,
  2500.00,
  NOW() - INTERVAL '5 days',
  NOW() + INTERVAL '25 days',
  true,
  (SELECT id FROM users WHERE username = 'Resteral' LIMIT 1),
  jsonb_build_object(
    'max_teams', 8,
    'draft_mode', 'auction',
    'players_per_team', 6,
    'auto_start', false,
    'create_lobbies_on_finish', true,
    'bracket_type', 'swiss',
    'auction_budget', 750,
    'duration_type', 'long',
    'league_format', 'seasonal'
  ),
  NOW() - INTERVAL '5 days',
  NOW()
);

-- Add some participants to make the tournaments look active
INSERT INTO tournament_participants (
  id,
  tournament_id,
  user_id,
  joined_at,
  status,
  is_creator
)
SELECT 
  gen_random_uuid(),
  t.id,
  u.id,
  NOW() - INTERVAL '1 hour' * (ROW_NUMBER() OVER ()),
  'registered',
  CASE WHEN u.username = 'Resteral' THEN true ELSE false END
FROM tournaments t
CROSS JOIN (
  SELECT id, username FROM users 
  WHERE username IN ('Resteral', 'TestUser1', 'TestUser2', 'TestUser3', 'TestUser4')
  LIMIT 5
) u
WHERE t.tournament_type = 'league'
AND t.name IN ('ZHL Winter League Championship', 'ZHL Spring League Series');
