-- Creating comprehensive foreign key constraint fix
-- Check current constraint and recreate it properly
DO $$
BEGIN
    -- Drop existing foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tournaments_created_by_fkey' 
        AND table_name = 'tournaments'
    ) THEN
        ALTER TABLE tournaments DROP CONSTRAINT tournaments_created_by_fkey;
        RAISE NOTICE 'Dropped existing tournaments_created_by_fkey constraint';
    END IF;
    
    -- Ensure the user exists (create if missing)
    INSERT INTO users (id, username, email, elo_rating, wins, losses, total_games, created_at, updated_at)
    VALUES (
        '944b281e-89d5-46f7-b10b-2439f275e179',
        'Resteral',
        'resteral@example.com',
        1200,
        0,
        0,
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        updated_at = NOW();
    
    RAISE NOTICE 'User Resteral verified/created in database';
    
    -- Clean up any orphaned tournament records
    DELETE FROM tournaments 
    WHERE created_by NOT IN (SELECT id FROM users);
    
    RAISE NOTICE 'Cleaned up orphaned tournament records';
    
    -- Recreate the foreign key constraint properly
    ALTER TABLE tournaments 
    ADD CONSTRAINT tournaments_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Recreated tournaments_created_by_fkey constraint with ON DELETE SET NULL';
    
    -- Test tournament creation
    INSERT INTO tournaments (
        id,
        name,
        description,
        tournament_type,
        game,
        max_participants,
        entry_fee,
        prize_pool,
        start_date,
        end_date,
        created_by,
        status,
        team_based,
        created_at,
        updated_at
    ) VALUES (
        gen_random_uuid(),
        'Test Tournament',
        'Test tournament to verify constraint',
        'snake_draft',
        'hockey',
        64,
        0,
        10000,
        NOW() + INTERVAL '1 day',
        NOW() + INTERVAL '28 days',
        '944b281e-89d5-46f7-b10b-2439f275e179',
        'registration',
        false,
        NOW(),
        NOW()
    );
    
    RAISE NOTICE 'Test tournament created successfully - constraint is working';
    
    -- Clean up test tournament
    DELETE FROM tournaments WHERE name = 'Test Tournament';
    
    RAISE NOTICE 'Test tournament cleaned up';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
        RAISE;
END $$;

-- Verify the constraint exists
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'tournaments'
    AND tc.constraint_name = 'tournaments_created_by_fkey';
