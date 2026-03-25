-- Ensure system user exists for tournament creation
INSERT INTO users (id, username, email, display_name, elo_rating, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System',
  'system@example.com',
  'System User',
  1000,
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

-- Create three active tournaments with valid status values
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
  team_based,
  max_teams,
  player_pool_settings,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Snake Draft Championship',
  'month_long_draft',
  'Competitive snake draft tournament with ELO-based matchmaking',
  'draft',
  'zealot_hockey',
  500.00,
  25.00,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '7 days',
  32,
  true,
  8,
  '{"draft_mode": "snake_draft", "num_teams": 8, "players_per_team": 4, "ready_to_start": true}',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Linear Draft Tournament',
  'month_long_draft',
  'Fast-paced linear draft tournament for competitive players',
  'draft',
  'tactical_fps',
  300.00,
  15.00,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 days',
  24,
  true,
  6,
  '{"draft_mode": "linear_draft", "num_teams": 6, "players_per_team": 4, "ready_to_start": true}',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Team Shooter Championship',
  'month_long_draft',
  'Elite tournament for the best team shooter players',
  'draft',
  'team_shooter',
  750.00,
  50.00,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '10 days',
  40,
  true,
  10,
  '{"draft_mode": "snake_draft", "num_teams": 10, "players_per_team": 4, "ready_to_start": true}',
  NOW(),
  NOW()
);

-- Register the authenticated user as first participant in each tournament
INSERT INTO tournament_participants (
  tournament_id,
  user_id,
  joined_at,
  elo_at_join
)
SELECT 
  t.id,
  '944b281e-89d5-46f7-b10b-2439f275e179',
  NOW(),
  1200
FROM tournaments t
WHERE t.created_by = '944b281e-89d5-46f7-b10b-2439f275e179'
ON CONFLICT (tournament_id, user_id) DO NOTHING;
