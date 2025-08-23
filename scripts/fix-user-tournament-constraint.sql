-- Fix user and tournament creation issues
-- First, ensure the user exists with proper data
INSERT INTO users (
    id, 
    username, 
    email, 
    elo_rating, 
    wins, 
    losses, 
    total_games, 
    created_at, 
    updated_at
) VALUES (
    '944b281e-89d5-46f7-b10b-2439f275e179',
    'Resteral',
    'resteral@example.com',
    1200,
    0,
    0,
    0,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    elo_rating = COALESCE(users.elo_rating, 1200),
    updated_at = NOW();

-- Verify the user exists
SELECT id, username, elo_rating FROM users WHERE id = '944b281e-89d5-46f7-b10b-2439f275e179';

-- Clean up any orphaned tournaments
DELETE FROM tournaments WHERE created_by NOT IN (SELECT id FROM users);

-- Create a test tournament to verify the constraint works
INSERT INTO tournaments (
    id,
    name,
    description,
    tournament_type,
    game,
    status,
    max_participants,
    entry_fee,
    prize_pool,
    start_date,
    end_date,
    created_by,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    'Test Snake Draft Championship',
    'Test tournament to verify constraint fix',
    'snake_draft',
    'Rocket League',
    'registration',
    16,
    10.00,
    150.00,
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '8 days',
    '944b281e-89d5-46f7-b10b-2439f275e179',
    NOW(),
    NOW()
);

-- Verify tournament was created successfully
SELECT id, name, created_by, status FROM tournaments WHERE name = 'Test Snake Draft Championship';
