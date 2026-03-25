-- Creating sample tournaments to populate the tournaments page
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
  created_at
) VALUES 
(
  gen_random_uuid(),
  'Weekly Snake Draft Championship',
  'Fast-paced snake draft tournament with instant team formation',
  'snake_draft',
  'hockey',
  32,
  25.00,
  600.00,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '7 days',
  '00000000-0000-0000-0000-000000000000',
  'registration',
  false,
  '{"draft_type": "snake_draft", "duration_days": 7, "phases_enabled": true}',
  NOW()
),
(
  gen_random_uuid(),
  'Monthly Linear Draft League',
  'Extended linear draft tournament with multiple phases',
  'linear_draft',
  'hockey',
  64,
  50.00,
  2400.00,
  NOW() + INTERVAL '1 day',
  NOW() + INTERVAL '30 days',
  '00000000-0000-0000-0000-000000000000',
  'registration',
  false,
  '{"draft_type": "linear_draft", "duration_days": 30, "phases_enabled": true}',
  NOW()
),
(
  gen_random_uuid(),
  'Elite Auction Draft Tournament',
  'High-stakes auction draft with premium prize pool',
  'auction_draft',
  'hockey',
  16,
  100.00,
  1200.00,
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '14 days',
  '00000000-0000-0000-0000-000000000000',
  'registration',
  false,
  '{"draft_type": "auction_draft", "duration_days": 14, "phases_enabled": true}',
  NOW()
);

-- Create system user if it doesn't exist
INSERT INTO users (
  id,
  username,
  email,
  elo_rating,
  total_games,
  wins,
  losses,
  created_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System',
  null,
  1200,
  0,
  0,
  0,
  NOW()
) ON CONFLICT (id) DO NOTHING;
