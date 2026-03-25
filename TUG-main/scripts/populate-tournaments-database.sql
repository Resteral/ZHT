-- Create sample tournaments for the authenticated user
-- User ID from debug logs: 944b281e-89d5-46f7-b10b-2439f275e179

-- First ensure the user exists in the database
INSERT INTO users (id, username, email, display_name, elo_rating, created_at, updated_at)
VALUES (
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Resteral',
  'resteral@example.com',
  'Resteral',
  1200,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Create active tournaments
INSERT INTO tournaments (
  id,
  name,
  description,
  tournament_type,
  status,
  game,
  max_participants,
  max_teams,
  team_based,
  entry_fee,
  prize_pool,
  start_date,
  end_date,
  created_by,
  created_at,
  updated_at,
  player_pool_settings
) VALUES 
(
  gen_random_uuid(),
  'Weekly Championship',
  'Join our weekly championship tournament with great prizes!',
  'month_long_draft',
  'registration_open',
  'Tactical FPS',
  32,
  8,
  true,
  10.00,
  250.00,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '7 days',
  '944b281e-89d5-46f7-b10b-2439f275e179',
  NOW(),
  NOW(),
  '{"draft_mode": "snake_draft", "num_teams": 8, "players_per_team": 4, "pool_size": 32}'::jsonb
),
(
  gen_random_uuid(),
  'Friday Night Showdown',
  'End your week with an epic tournament battle!',
  'month_long_draft',
  'registration_open',
  'Team Shooter',
  24,
  6,
  true,
  5.00,
  120.00,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '5 days',
  '944b281e-89d5-46f7-b10b-2439f275e179',
  NOW(),
  NOW(),
  '{"draft_mode": "linear_draft", "num_teams": 6, "players_per_team": 4, "pool_size": 24}'::jsonb
),
(
  gen_random_uuid(),
  'Beginner Tournament',
  'Perfect for new players to get started in competitive play!',
  'month_long_draft',
  'registration_open',
  'Strategic Shooter',
  16,
  4,
  true,
  0.00,
  50.00,
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '10 days',
  '944b281e-89d5-46f7-b10b-2439f275e179',
  NOW(),
  NOW(),
  '{"draft_mode": "snake_draft", "num_teams": 4, "players_per_team": 4, "pool_size": 16}'::jsonb
);

-- Add the tournament creator as the first participant in each tournament
INSERT INTO tournament_participants (tournament_id, user_id, joined_at, status)
SELECT t.id, '944b281e-89d5-46f7-b10b-2439f275e179', NOW(), 'registered'
FROM tournaments t 
WHERE t.created_by = '944b281e-89d5-46f7-b10b-2439f275e179'
ON CONFLICT (tournament_id, user_id) DO NOTHING;
