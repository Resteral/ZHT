-- Create the system user that the tournament creation system expects
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
    created_at,
    updated_at,
    balance
) VALUES (
    '00000000-0000-0000-0000-000000000000',
    'System',
    'system@tuglobbies.com',
    'System User',
    1200,
    1200,
    0,
    0,
    0,
    NOW(),
    NOW(),
    0.00
) ON CONFLICT (id) DO NOTHING;

-- Verify the system user was created
SELECT id, username, display_name FROM users WHERE id = '00000000-0000-0000-0000-000000000000';
