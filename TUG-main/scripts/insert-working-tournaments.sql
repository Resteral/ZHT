-- Creating actual tournament data that will be visible to users
INSERT INTO tournaments (
  id,
  name,
  description,
  tournament_type,
  league_mode,
  status,
  max_participants,
  entry_fee,
  prize_pool,
  start_date,
  created_at,
  settings
) VALUES 
(
  gen_random_uuid(),
  'Snake Draft Tournament',
  'Join the pool and get drafted by team captains based on ELO rankings',
  'snake_draft',
  'snake_draft',
  'registration',
  999999,
  0,
  0,
  NOW() + INTERVAL '30 minutes',
  NOW(),
  '{"pool_size": 20, "teams": 4, "players_per_team": 5, "bracket_type": "single_elimination"}'::jsonb
),
(
  gen_random_uuid(),
  'Linear Draft Tournament', 
  'Traditional draft format with team captains selecting players in order',
  'linear_draft',
  'linear_draft',
  'registration',
  999999,
  0,
  0,
  NOW() + INTERVAL '1 hour',
  NOW(),
  '{"pool_size": 16, "teams": 4, "players_per_team": 4, "bracket_type": "round_robin"}'::jsonb
),
(
  gen_random_uuid(),
  'Auction Draft Tournament',
  'Bid on players to build your ultimate team within budget constraints',
  'auction_draft', 
  'auction_draft',
  'registration',
  999999,
  0,
  0,
  NOW() + INTERVAL '2 hours',
  NOW(),
  '{"pool_size": 24, "teams": 6, "players_per_team": 4, "bracket_type": "double_elimination"}'::jsonb
);
