-- Creating active tournaments to restore the tournament system
-- Insert the authenticated user first to ensure foreign key constraints work
INSERT INTO users (id, username, email, display_name, elo_rating, created_at, updated_at)
VALUES (
    '944b281e-89d5-46f7-b10b-2439f275e179',
    'Resteral',
    'resteral@example.com',
    'Resteral',
    1200,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name,
    updated_at = NOW();

-- Create system user as fallback
INSERT INTO users (id, username, email, display_name, elo_rating, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'System',
    'system@tuglobbies.com',
    'System User',
    1000,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Create active tournaments
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
(
    gen_random_uuid(),
    '944b281e-89d5-46f7-b10b-2439f275e179',
    'Elite Championship Draft',
    'month_long_draft',
    'High-stakes tournament for experienced players. Snake draft format with ELO-based matchmaking.',
    'registration_open',
    'Tactical FPS',
    500.00,
    25.00,
    NOW() + INTERVAL '2 hours',
    NOW() + INTERVAL '7 days',
    32,
    8,
    true,
    '{"draft_mode": "snake_draft", "num_teams": 8, "players_per_team": 4, "elo_range": {"min": 1000, "max": 2000}}'::jsonb,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    '944b281e-89d5-46f7-b10b-2439f275e179',
    'Weekend Warriors Tournament',
    'month_long_draft',
    'Casual weekend tournament for all skill levels. Linear draft with balanced teams.',
    'registration_open',
    'Team Shooter',
    250.00,
    15.00,
    NOW() + INTERVAL '4 hours',
    NOW() + INTERVAL '5 days',
    24,
    6,
    true,
    '{"draft_mode": "linear_draft", "num_teams": 6, "players_per_team": 4, "elo_range": {"min": 800, "max": 1500}}'::jsonb,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    '944b281e-89d5-46f7-b10b-2439f275e179',
    'Pro League Qualifier',
    'month_long_draft',
    'Qualifying tournament for the professional league. Captain draft format.',
    'registration_open',
    'Strategic Shooter',
    1000.00,
    50.00,
    NOW() + INTERVAL '6 hours',
    NOW() + INTERVAL '10 days',
    40,
    10,
    true,
    '{"draft_mode": "captain_draft", "num_teams": 10, "players_per_team": 4, "elo_range": {"min": 1200, "max": 2500}}'::jsonb,
    NOW(),
    NOW()
);

-- Add the creator as a participant in each tournament
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
WHERE t.created_by = '944b281e-89d5-46f7-b10b-2439f275e179';
