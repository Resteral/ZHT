-- Create active tournaments that will show up in the active tournaments section
-- First ensure the authenticated user exists in the users table
INSERT INTO users (id, username, display_name, email, elo_rating, created_at, updated_at)
VALUES (
    '944b281e-89d5-46f7-b10b-2439f275e179',
    'Resteral',
    'Resteral',
    'resteral@example.com',
    1200,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

-- Create system user as fallback
INSERT INTO users (id, username, display_name, email, elo_rating, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'System',
    'System User',
    'system@tuglobbies.com',
    1000,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create active tournaments in different stages
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
    max_teams,
    team_based,
    player_pool_settings,
    created_at,
    updated_at
) VALUES 
-- Tournament 1: Registration Open
(
    gen_random_uuid(),
    '944b281e-89d5-46f7-b10b-2439f275e179',
    'Elite Tactical FPS Championship',
    'month_long_draft',
    'High-stakes tournament for the best tactical FPS players',
    'registration_open',
    'Tactical FPS',
    5000.00,
    50.00,
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '7 days',
    32,
    8,
    true,
    '{"draft_mode": "snake_draft", "num_teams": 8, "players_per_team": 4, "pool_size": 32}',
    NOW(),
    NOW()
),
-- Tournament 2: Starting Soon
(
    gen_random_uuid(),
    '944b281e-89d5-46f7-b10b-2439f275e179',
    'Team Shooter Pro League',
    'month_long_draft',
    'Professional team shooter competition with live streaming',
    'registration_open',
    'Team Shooter',
    3000.00,
    25.00,
    NOW() + INTERVAL '30 minutes',
    NOW() + INTERVAL '5 days',
    24,
    6,
    true,
    '{"draft_mode": "linear_draft", "num_teams": 6, "players_per_team": 4, "pool_size": 24}',
    NOW(),
    NOW()
),
-- Tournament 3: Open Registration
(
    gen_random_uuid(),
    '944b281e-89d5-46f7-b10b-2439f275e179',
    'Strategic Shooter Masters',
    'month_long_draft',
    'Strategic gameplay tournament for experienced players',
    'registration_open',
    'Strategic Shooter',
    2500.00,
    20.00,
    NOW() + INTERVAL '4 hours',
    NOW() + INTERVAL '6 days',
    20,
    5,
    true,
    '{"draft_mode": "snake_draft", "num_teams": 5, "players_per_team": 4, "pool_size": 20}',
    NOW(),
    NOW()
);

-- Add the tournament creator as the first participant in each tournament
INSERT INTO tournament_participants (
    id,
    tournament_id,
    user_id,
    status,
    joined_at
)
SELECT 
    gen_random_uuid(),
    t.id,
    '944b281e-89d5-46f7-b10b-2439f275e179',
    'registered',
    NOW()
FROM tournaments t
WHERE t.created_by = '944b281e-89d5-46f7-b10b-2439f275e179'
ON CONFLICT DO NOTHING;
