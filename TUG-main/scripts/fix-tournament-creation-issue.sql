-- Fix Tournament Creation Issue
-- This script diagnoses and fixes the foreign key constraint error

-- First, let's check if the user exists
DO $$
DECLARE
    user_count INTEGER;
    user_record RECORD;
BEGIN
    -- Check if Resteral user exists
    SELECT COUNT(*) INTO user_count 
    FROM users 
    WHERE username = 'Resteral' OR id = '944b281e-89d5-46f7-b10b-2439f275e179';
    
    RAISE NOTICE 'Found % users matching Resteral', user_count;
    
    -- Get user details
    FOR user_record IN 
        SELECT id, username, email, elo_rating, created_at 
        FROM users 
        WHERE username = 'Resteral' OR id = '944b281e-89d5-46f7-b10b-2439f275e179'
    LOOP
        RAISE NOTICE 'User: ID=%, Username=%, Email=%, ELO=%, Created=%', 
            user_record.id, user_record.username, user_record.email, 
            user_record.elo_rating, user_record.created_at;
    END LOOP;
    
    -- If user doesn't exist, create them
    IF user_count = 0 THEN
        RAISE NOTICE 'Creating Resteral user...';
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
            1200,
            0,
            0,
            0,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Created Resteral user successfully';
    END IF;
    
    -- Now try to create a test tournament
    RAISE NOTICE 'Creating test tournament...';
    INSERT INTO tournaments (
        id,
        name,
        description,
        game,
        tournament_type,
        status,
        max_participants,
        entry_fee,
        prize_pool,
        start_date,
        created_by,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'Snake Draft Championship Test',
        'Test tournament to verify creation works',
        'Rocket League',
        'snake_draft',
        'registration',
        16,
        10.00,
        150.00,
        NOW() + INTERVAL '1 day',
        '944b281e-89d5-46f7-b10b-2439f275e179',
        NOW(),
        NOW()
    );
    RAISE NOTICE 'Test tournament created successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
END $$;

-- Clean up any duplicate or invalid tournament records
DELETE FROM tournaments 
WHERE name = 'Snake Draft Championship Test' 
AND created_at < NOW() - INTERVAL '1 hour';

-- Verify the fix worked
SELECT 
    t.id,
    t.name,
    t.created_by,
    u.username as creator_username
FROM tournaments t
LEFT JOIN users u ON t.created_by = u.id
WHERE t.name LIKE '%Snake Draft%'
ORDER BY t.created_at DESC
LIMIT 5;
