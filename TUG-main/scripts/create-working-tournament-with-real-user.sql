-- Create a working tournament with the authenticated user
INSERT INTO tournaments (
    id,
    name,
    description,
    tournament_type,
    status,
    game,
    max_participants,
    entry_fee,
    prize_pool,
    start_date,
    end_date,
    created_by,
    created_at,
    updated_at,
    team_based,
    max_teams,
    player_pool_settings
) VALUES (
    gen_random_uuid(),
    'Test Snake Draft Tournament',
    'A test tournament to verify the system is working',
    'snake_draft',
    'waiting',
    'MOBA Game', -- replaced League of Legends with generic MOBA Game
    32,
    0,
    0,
    NOW() + INTERVAL '10 minutes',
    NOW() + INTERVAL '2 hours',
    '944b281e-89d5-46f7-b10b-2439f275e179', -- Use the authenticated user's ID from debug logs
    NOW(),
    NOW(),
    true,
    8,
    '{"draft_mode": "snake_draft", "num_teams": 8, "players_per_team": 4, "bracket_format": "single_elimination"}'::jsonb
);

-- Also create the system user as fallback
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
    'system@tuglobbies.com',
    'System User',
    1200,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;
