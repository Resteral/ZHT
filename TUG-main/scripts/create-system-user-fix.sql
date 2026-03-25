INSERT INTO users (
  id,
  username,
  email,
  display_name,
  elo_rating,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System',
  'system@tournament.local',
  'Tournament System',
  1200,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Also ensure the authenticated user exists
INSERT INTO users (
  id,
  username,
  email,
  display_name,
  elo_rating,
  created_at,
  updated_at
) VALUES (
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Resteral',
  'resteral@tournament.local',
  'Resteral',
  1200,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;
