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
  player_pool_settings,
  created_at,
  updated_at
) VALUES 
-- Active Tournament 1: Starting Soon
(
  gen_random_uuid(),
  'Weekend Warriors Championship',
  'Join the ultimate weekend tournament! Draft starts in 30 minutes.',
  'month_long_draft',
  'registration_open',
  'Strategic Shooter',
  32,
  8,
  true,
  25.00,
  800.00,
  NOW() + INTERVAL '30 minutes',
  NOW() + INTERVAL '3 days',
  '944b281e-89d5-46f7-b10b-2439f275e179',
  '{"draft_mode": "snake_draft", "num_teams": 8, "players_per_team": 4, "pool_size": 32}',
  NOW(),
  NOW()
),
-- Active Tournament 2: Registration Open
(
  gen_random_uuid(),
  'Elite Tactical Tournament',
  'High-stakes tournament for experienced players. Registration closes in 2 hours!',
  'month_long_draft',
  'registration_open',
  'Tactical FPS',
  64,
  16,
  true,
  50.00,
  3200.00,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '5 days',
  '944b281e-89d5-46f7-b10b-2439f275e179',
  '{"draft_mode": "snake_draft", "num_teams": 16, "players_per_team": 4, "pool_size": 64}',
  NOW(),
  NOW()
),
-- Active Tournament 3: Free Entry
(
  gen_random_uuid(),
  'Newcomer Friendly Cup',
  'Perfect for new players! Free entry, great prizes. Join now!',
  'month_long_draft',
  'registration_open',
  'Team Shooter',
  24,
  6,
  true,
  0.00,
  500.00,
  NOW() + INTERVAL '1 hour',
  NOW() + INTERVAL '2 days',
  '944b281e-89d5-46f7-b10b-2439f275e179',
  '{"draft_mode": "linear_draft", "num_teams": 6, "players_per_team": 4, "pool_size": 24}',
  NOW(),
  NOW()
);

-- Add the authenticated user as a participant in the first tournament
INSERT INTO tournament_participants (
  tournament_id,
  user_id,
  joined_at,
  elo_rating
) 
SELECT 
  t.id,
  '944b281e-89d5-46f7-b10b-2439f275e179',
  NOW(),
  1051
FROM tournaments t 
WHERE t.name = 'Weekend Warriors Championship'
LIMIT 1;
