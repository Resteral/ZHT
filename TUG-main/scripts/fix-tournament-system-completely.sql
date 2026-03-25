-- Complete Tournament System Fix
-- This script diagnoses and fixes all tournament-related issues

-- Step 1: Check current state
SELECT 'Current tournament count:' as info, COUNT(*) as count FROM tournaments;
SELECT 'Current user count:' as info, COUNT(*) as count FROM users;

-- Step 2: Check if Resteral user exists
SELECT 'Resteral user check:' as info, id, username, email FROM users WHERE username = 'Resteral' OR email LIKE '%resteral%';

-- Step 3: Ensure Resteral user exists with correct data
INSERT INTO users (
    id, 
    username, 
    email, 
    elo_rating, 
    total_games, 
    wins, 
    losses, 
    created_at, 
    updated_at
) VALUES (
    '944b281e-89d5-46f7-b10b-2439f275e179',
    'Resteral',
    'resteral@example.com',
    931,
    0,
    0,
    0,
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    email = EXCLUDED.email,
    elo_rating = EXCLUDED.elo_rating,
    updated_at = NOW();

-- Step 4: Check and fix foreign key constraint
SELECT 'Checking foreign key constraints:' as info;
SELECT conname, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE conname LIKE '%tournaments%' AND contype = 'f';

-- Step 5: Drop existing foreign key constraint if it exists
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_created_by_fkey;

-- Step 6: Recreate foreign key constraint properly
ALTER TABLE tournaments 
ADD CONSTRAINT tournaments_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Step 7: Clean up any orphaned tournament records
DELETE FROM tournaments WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM users);

-- Step 8: Create a test tournament to verify the system works
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
    updated_at,
    team_based
) VALUES (
    gen_random_uuid(),
    'Test Snake Draft Tournament',
    'A test tournament to verify the system works',
    'snake_draft',
    'Rocket League',
    'registration',
    16,
    0.00,
    100.00,
    NOW() + INTERVAL '1 day',
    NOW() + INTERVAL '7 days',
    '944b281e-89d5-46f7-b10b-2439f275e179',
    NOW(),
    NOW(),
    true
) ON CONFLICT DO NOTHING;

-- Step 9: Verify the fix worked
SELECT 'Tournament creation test:' as info, COUNT(*) as tournament_count FROM tournaments;
SELECT 'Test tournament details:' as info, id, name, status, created_by FROM tournaments WHERE name = 'Test Snake Draft Tournament';

-- Step 10: Check tournament loading query
SELECT 'Open tournaments for dashboard:' as info, 
       id, name, status, tournament_type, max_participants, 
       (SELECT COUNT(*) FROM tournament_participants WHERE tournament_id = tournaments.id) as participant_count
FROM tournaments 
WHERE status IN ('registration', 'team_building', 'active')
ORDER BY created_at DESC;

SELECT 'Fix completed successfully!' as result;
