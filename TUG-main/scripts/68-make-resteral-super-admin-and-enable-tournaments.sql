-- Make resteral a super admin and enable tournament creation for all users

-- First, check if resteral exists and update their role to super admin
UPDATE users 
SET 
  elo_rating = COALESCE(elo_rating, 1200),
  mmr = COALESCE(mmr, 1200),
  total_games = COALESCE(total_games, 0),
  wins = COALESCE(wins, 0),
  losses = COALESCE(losses, 0),
  balance = COALESCE(balance, 0),
  updated_at = NOW()
WHERE username = 'resteral';

-- Add resteral as super admin if they don't exist
INSERT INTO users (
  id,
  username,
  email,
  display_name,
  elo_rating,
  mmr,
  total_games,
  wins,
  losses,
  balance,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'resteral',
  'resteral@platform.com',
  'Resteral (Super Admin)',
  1200,
  1200,
  0,
  0,
  0,
  0,
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE SET
  display_name = 'Resteral (Super Admin)',
  updated_at = NOW();

-- Grant super admin permissions to resteral
INSERT INTO admin_permissions (
  user_id,
  permission,
  granted_by,
  granted_at,
  is_active
) 
SELECT 
  u.id,
  perm.permission,
  u.id, -- Self-granted for initial setup
  NOW(),
  true
FROM users u
CROSS JOIN (
  VALUES 
    ('manage_users'),
    ('manage_tournaments'),
    ('manage_bets'),
    ('manage_finances'),
    ('manage_system'),
    ('super_admin'),
    ('create_tournaments'),
    ('moderate_content'),
    ('view_analytics'),
    ('manage_leagues')
) AS perm(permission)
WHERE u.username = 'resteral'
ON CONFLICT (user_id, permission) DO UPDATE SET
  is_active = true,
  granted_at = NOW();

-- Enable tournament creation globally for all users
UPDATE system_settings 
SET 
  setting_value = 'true',
  updated_at = NOW()
WHERE setting_key = 'tournament_creation_enabled';

-- Insert tournament creation setting if it doesn't exist
INSERT INTO system_settings (
  setting_key,
  setting_value,
  setting_type,
  description,
  is_public,
  created_at,
  updated_at
) VALUES (
  'tournament_creation_enabled',
  'true',
  'boolean',
  'Allow all users to create tournaments',
  true,
  NOW(),
  NOW()
) ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = 'true',
  updated_at = NOW();

-- Log the admin activity for resteral being made super admin
INSERT INTO admin_activity_log (
  admin_user_id,
  action_type,
  target_type,
  target_id,
  description,
  metadata,
  created_at
)
SELECT 
  u.id,
  'role_update',
  'user',
  u.id,
  'User resteral granted super admin privileges',
  '{"role": "super_admin", "permissions": ["manage_users", "manage_tournaments", "manage_bets", "manage_finances", "manage_system", "super_admin", "create_tournaments", "moderate_content", "view_analytics", "manage_leagues"]}',
  NOW()
FROM users u
WHERE u.username = 'resteral';

-- Log the system setting change for tournament creation
INSERT INTO admin_activity_log (
  admin_user_id,
  action_type,
  target_type,
  description,
  metadata,
  created_at
)
SELECT 
  u.id,
  'system_setting_update',
  'system_setting',
  'Enabled tournament creation for all users',
  '{"setting_key": "tournament_creation_enabled", "old_value": "false", "new_value": "true"}',
  NOW()
FROM users u
WHERE u.username = 'resteral';
