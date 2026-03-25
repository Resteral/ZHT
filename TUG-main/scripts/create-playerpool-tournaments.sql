INSERT INTO users (id, username, email, display_name, elo_rating, created_at, updated_at)
VALUES 
  ('944b281e-89d5-46f7-b10b-2439f275e179', 'Resteral', 'resteral@example.com', 'Resteral', 1200, NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000000', 'System', 'system@example.com', 'System User', 1000, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  display_name = EXCLUDED.display_name,
  updated_at = NOW();

-- Create tournaments with proper player pool settings
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
  player_pool_settings,
  team_based,
  max_teams,
  created_at, 
  updated_at
) VALUES 
(
  gen_random_uuid(),
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Strategic Shooter Championship',
  'month_long_draft',
  'Competitive tournament with snake draft system',
  'registration_open',
  'strategic_shooter',
  5000.00,
  25.00,
  NOW() + INTERVAL '2 hours',
  NOW() + INTERVAL '7 days',
  32,
  '{
    "draft_mode": "snake_draft",
    "num_teams": 8,
    "players_per_team": 4,
    "pool_size": 32,
    "draft_order": "snake"
  }'::jsonb,
  true,
  8,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Team Shooter Pro League',
  'month_long_draft',
  'Professional league with linear draft format',
  'registration_open',
  'team_shooter',
  10000.00,
  50.00,
  NOW() + INTERVAL '4 hours',
  NOW() + INTERVAL '10 days',
  48,
  '{
    "draft_mode": "linear_draft",
    "num_teams": 12,
    "players_per_team": 4,
    "pool_size": 48,
    "draft_order": "linear"
  }'::jsonb,
  true,
  12,
  NOW(),
  NOW()
),
(
  gen_random_uuid(),
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Tactical FPS Masters',
  'month_long_draft',
  'Elite tournament for tactical FPS players',
  'registration_open',
  'tactical_fps',
  15000.00,
  75.00,
  NOW() + INTERVAL '6 hours',
  NOW() + INTERVAL '14 days',
  64,
  '{
    "draft_mode": "snake_draft",
    "num_teams": 16,
    "players_per_team": 4,
    "pool_size": 64,
    "draft_order": "snake"
  }'::jsonb,
  true,
  16,
  NOW(),
  NOW()
);

-- Register the authenticated user as a participant in each tournament
INSERT INTO tournament_participants (tournament_id, user_id, joined_at, status)
SELECT t.id, '944b281e-89d5-46f7-b10b-2439f275e179', NOW(), 'registered'
FROM tournaments t
WHERE t.created_by = '944b281e-89d5-46f7-b10b-2439f275e179'
ON CONFLICT (tournament_id, user_id) DO NOTHING;
