-- Ensure system user exists for tournament creation
INSERT INTO users (id, username, email, display_name, elo_rating, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System',
  'system@example.com',
  'System User',
  1200,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Ensure authenticated user exists
INSERT INTO users (id, username, email, display_name, elo_rating, created_at, updated_at)
VALUES (
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Resteral',
  'resteral@example.com',
  'Resteral',
  1200,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create active tournaments that will show up immediately
INSERT INTO tournaments (
  id,
  created_by,
  name,
  tournament_type,
  description,
  status,
  game,
  prize_pool,
  entry_fee,
  start_date,
  end_date,
  max_participants,
  max_teams,
  team_based,
  player_pool_settings,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Elite Championship Tournament',
  'month_long_draft',
  'High-stakes tournament for elite players',
  'registration_open',
  'Tactical FPS',
  5000.00,
  50.00,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '7 days',
  64,
  16,
  true,
  '{"draft_mode": "snake_draft", "num_teams": 16, "players_per_team": 4, "pool_size": 64}'::jsonb,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Quick Strike Tournament',
  'month_long_draft',
  'Fast-paced tournament for quick matches',
  'registration_open',
  'Team Shooter',
  2500.00,
  25.00,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '3 days',
  32,
  8,
  true,
  '{"draft_mode": "linear_draft", "num_teams": 8, "players_per_team": 4, "pool_size": 32}'::jsonb,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Strategic Masters Cup',
  'month_long_draft',
  'Tournament for strategic gameplay enthusiasts',
  'registration_open',
  'Strategic Shooter',
  7500.00,
  75.00,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '10 days',
  48,
  12,
  true,
  '{"draft_mode": "snake_draft", "num_teams": 12, "players_per_team": 4, "pool_size": 48}'::jsonb,
  NOW(),
  NOW()
);

-- Add the authenticated user as a participant in each tournament
INSERT INTO tournament_participants (tournament_id, user_id, joined_at, elo_rating)
SELECT t.id, '944b281e-89d5-46f7-b10b-2439f275e179', NOW(), 1200
FROM tournaments t
WHERE t.created_by = '944b281e-89d5-46f7-b10b-2439f275e179'
ON CONFLICT (tournament_id, user_id) DO NOTHING;
