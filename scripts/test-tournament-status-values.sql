-- Test script to determine valid tournament status values
-- This will help identify what values are allowed by the tournaments_status_check constraint

-- First, let's see the actual constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'tournaments_status_check';

-- Test creating tournaments with different status values to see which ones work
-- We'll use a system user that should exist

-- Test 1: Try "pending" status
INSERT INTO tournaments (
    id,
    created_by,
    name,
    tournament_type,
    status,
    game,
    prize_pool,
    entry_fee,
    start_date,
    end_date,
    max_participants,
    player_pool_settings,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'Test Tournament - Pending Status',
    'draft',
    'pending',
    'zealot_hockey',
    1000.00,
    50.00,
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '8 days',
    16,
    '{"draft_mode": "snake_draft", "teams_per_match": 4, "players_per_team": 4, "auto_start": true}',
    NOW(),
    NOW()
);

-- If the above fails, we'll know "pending" isn't valid
-- Let's also try other common status values in separate statements
-- so we can see which ones work

-- Clean up the test tournament if it was created
DELETE FROM tournaments WHERE name LIKE 'Test Tournament%';
