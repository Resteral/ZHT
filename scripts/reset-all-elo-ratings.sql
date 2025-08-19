-- Reset all player ELO ratings to default starting value of 1200
UPDATE users 
SET elo_rating = 1200, 
    wins = 0, 
    losses = 0, 
    total_games = 0,
    updated_at = NOW()
WHERE elo_rating IS NOT NULL;

-- Clear ELO history to start fresh
DELETE FROM elo_history;

-- Update any existing match analytics that reference old ELO data
UPDATE match_analytics 
SET updated_at = NOW();

-- Log the ELO reset action
INSERT INTO admin_activity_log (
    id,
    admin_user_id,
    action_type,
    target_type,
    description,
    created_at,
    metadata
) VALUES (
    gen_random_uuid(),
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
    'SYSTEM_RESET',
    'ELO_RATINGS',
    'Reset all player ELO ratings to 1200 for TugLobbies launch',
    NOW(),
    '{"reset_value": 1200, "affected_users": "all"}'::jsonb
);
