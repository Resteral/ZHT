-- Create a simple test tournament to verify the system is working
INSERT INTO tournaments (
  id,
  name,
  description,
  tournament_type,
  status,
  max_participants,
  entry_fee,
  prize_pool,
  start_date,
  end_date,
  game,
  created_by,
  player_pool_settings,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Test Snake Draft Tournament',
  'A test tournament to verify the system is working',
  'snake_draft',
  'waiting',
  32,
  0,
  0,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '7 days',
  'zealot_hockey',
  '00000000-0000-0000-0000-000000000000',
  '{"draft_mode": "snake_draft", "num_teams": 8, "players_per_team": 4, "auto_start": true, "create_lobbies_on_finish": true, "bracket_type": "single_elimination"}',
  NOW(),
  NOW()
);

-- Ensure the system user exists
INSERT INTO users (id, username, email, elo_rating, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System',
  'system@tournament.local',
  1000,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
