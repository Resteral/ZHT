-- Fix the tournaments foreign key constraint to reference the correct users table
-- The issue is that the constraint references auth.users(id) but we're using the users table

DO $$
BEGIN
    -- Drop the existing foreign key constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'tournaments_created_by_fkey' 
        AND table_name = 'tournaments'
    ) THEN
        ALTER TABLE tournaments DROP CONSTRAINT tournaments_created_by_fkey;
        RAISE NOTICE 'Dropped existing tournaments_created_by_fkey constraint';
    END IF;
    
    -- Ensure the user "Resteral" exists in the users table
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
    
    RAISE NOTICE 'User Resteral verified/created in users table';
    
    -- Clean up any orphaned tournament records that reference non-existent users
    DELETE FROM tournaments 
    WHERE created_by IS NOT NULL 
    AND created_by NOT IN (SELECT id FROM users);
    
    RAISE NOTICE 'Cleaned up orphaned tournament records';
    
    -- Create the correct foreign key constraint referencing users(id) instead of auth.users(id)
    ALTER TABLE tournaments 
    ADD CONSTRAINT tournaments_created_by_fkey 
    FOREIGN KEY (created_by) 
    REFERENCES users(id) 
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Created tournaments_created_by_fkey constraint referencing users(id)';
    
    -- Update existing tournaments with null created_by to reference the current user
    UPDATE tournaments 
    SET created_by = '944b281e-89d5-46f7-b10b-2439f275e179'
    WHERE created_by IS NULL;
    
    RAISE NOTICE 'Updated existing tournaments to reference current user';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error occurred: %', SQLERRM;
        RAISE;
END $$;

-- Verify the constraint exists and references the correct table
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
