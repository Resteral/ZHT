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
    'registration',
    'Tactical FPS',
    32,
    0,
    0,
    NOW() + INTERVAL '1 hour',
    NOW() + INTERVAL '1 day',
    '944b281e-89d5-46f7-b10b-2439f275e179',
    NOW(),
    NOW(),
    true,
    8,
    '{"draft_mode": "snake_draft", "num_teams": 8, "players_per_team": 4}'::jsonb
);

-- Also insert the authenticated user as a tournament participant
INSERT INTO tournament_participants (
    tournament_id,
    user_id,
    joined_at,
    status
) VALUES (
    (SELECT id FROM tournaments WHERE name = 'Test Snake Draft Tournament' LIMIT 1),
    '944b281e-89d5-46f7-b10b-2439f275e179',
    NOW(),
    'registered'
);
