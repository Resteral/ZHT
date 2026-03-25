-- Creating sample tournaments with debug logging to ensure they appear in the database

-- First, ensure system user exists
INSERT INTO users (id, username, email, elo_rating, total_games, wins, losses, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System',
  NULL,
  1200,
  0,
  0,
  0,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create sample tournaments that should be visible immediately
INSERT INTO tournaments (
  id,
  name,
  description,
  tournament_type,
  game,
  max_participants,
  entry_fee,
  prize_pool,
  start_date,
  end_date,
  created_by,
  status,
  team_based,
  player_pool_settings,
  created_at,
  updated_at
) VALUES 
(
  gen_random_uuid(),
  'Quick Snake Draft Tournament',
  'Fast-paced snake draft tournament - 16 players, 4 teams',
  'snake_draft',
  'hockey',
  16,
  10,
  128,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '7 days',
  '00000000-0000-0000-0000-000000000000',
  'registration',
  false,
  '{"draft_type": "snake_draft", "duration_days": 7, "phases_enabled": true}',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Linear Draft Championship',
  'Linear draft tournament with 32 players across 8 teams',
  'linear_draft',
  'hockey',
  32,
  25,
  640,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '14 days',
  '00000000-0000-0000-0000-000000000000',
  'registration',
  false,
  '{"draft_type": "linear_draft", "duration_days": 14, "phases_enabled": true}',
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  'Auction Draft Elite',
  'High-stakes auction draft tournament - 64 players maximum',
  'auction_draft',
  'hockey',
  64,
  50,
  2560,
  NOW() + INTERVAL '3 hours',
  NOW() + INTERVAL '30 days',
  '00000000-0000-0000-0000-000000000000',
  'registration',
  false,
  '{"draft_type": "auction_draft", "duration_days": 30, "phases_enabled": true}',
  NOW(),
  NOW()
);

-- Verify tournaments were created
SELECT 
  id,
  name,
  tournament_type,
  status,
  max_participants,
  entry_fee,
  prize_pool,
  start_date,
  end_date
FROM tournaments 
ORDER BY created_at DESC;
