-- Make resteral a super admin and enable tournament creation for all users
-- Resolved 23503 error by ensuring resteral exists in all required tables with the correct ID

-- First, ensure resteral exists in public.users with the correct ID
-- The ID '6918e90a-7290-454c-889e-986786289f76' was identified as the culprit in FK violations
INSERT INTO public.users (
  id,
  username,
  email,
  display_name,
  elo_rating,
  mmr,
  balance,
  created_at,
  updated_at
) VALUES (
  '6918e90a-7290-454c-889e-986786289f76',
  'resteral',
  'resteral@platform.com',
  'Resteral (Super Admin)',
  1200,
  1200,
  0,
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE SET
  id = EXCLUDED.id, -- Force synchronization of ID
  display_name = 'Resteral (Super Admin)',
  updated_at = NOW();

-- Also attempt to ensure they are in auth.users to satisfy strict database constraints
-- This is a fallback to prevent 23503 errors if the FK points to auth.users
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at)
VALUES ('6918e90a-7290-454c-889e-986786289f76', 'resteral@platform.com', '{"display_name": "Resteral"}'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;

-- Grant super admin permissions to resteral
-- We use a DO block for maximum flexibility with permission lists
DO $$ 
DECLARE
    v_user_id UUID;
    v_perms TEXT[] := ARRAY[
        'manage_users', 'manage_tournaments', 'manage_bets', 
        'manage_finances', 'manage_system', 'super_admin', 
        'create_tournaments', 'moderate_content', 'view_analytics', 'manage_leagues'
    ];
    v_p TEXT;
BEGIN
    SELECT id INTO v_user_id FROM public.users WHERE username = 'resteral';
    
    IF v_user_id IS NOT NULL THEN
        FOREACH v_p IN ARRAY v_perms LOOP
            INSERT INTO admin_permissions (user_id, permission, granted_by, granted_at, is_active)
            VALUES (v_user_id, v_p, v_user_id, NOW(), true)
            ON CONFLICT (user_id, permission) DO UPDATE SET is_active = true;
        END LOOP;
    END IF;
END $$;

-- Enable tournament creation globally for all users
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

-- Log the admin activity for resteral being made super admin using a robust approach
DO $$ 
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM public.users WHERE username = 'resteral';
    
    IF v_user_id IS NOT NULL THEN
        -- Safely log activity to either admin_activity_log or legacy admin_logs
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_log') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_activity_log' AND column_name = 'target_id') THEN
                INSERT INTO admin_activity_log (admin_user_id, action_type, target_type, target_id, description, metadata, created_at)
                VALUES (v_user_id, 'role_update', 'user', v_user_id, 'User resteral granted super admin privileges', '{"role": "super_admin"}'::jsonb, NOW());
            ELSE
                -- Legacy fallback for different column names
                INSERT INTO admin_activity_log (admin_user_id, action_type, description, metadata, created_at)
                VALUES (v_user_id, 'role_update', 'User resteral granted super admin privileges', '{"role": "super_admin"}'::jsonb, NOW());
            END IF;
        ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_logs') THEN
            INSERT INTO admin_logs (action, details, created_at)
            VALUES ('SUPER_ADMIN_GRANTED', 'User resteral granted super admin privileges', NOW());
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Admin logging skipped: %', SQLERRM;
END $$;
