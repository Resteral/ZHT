-- Fix the tournaments foreign key constraint issue
-- This script diagnoses and fixes the tournaments_created_by_fkey constraint

-- First, let's check the current constraint
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='tournaments'
    AND tc.constraint_name='tournaments_created_by_fkey';

-- Check if the user exists
SELECT id, username, email FROM users WHERE id = '944b281e-89d5-46f7-b10b-2439f275e179';

-- Check for any orphaned tournament records
SELECT id, name, created_by FROM tournaments 
WHERE created_by NOT IN (SELECT id FROM users);

-- Drop the existing constraint if it exists
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_created_by_fkey;

-- Recreate the foreign key constraint properly
ALTER TABLE tournaments 
ADD CONSTRAINT tournaments_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES users(id) 
ON DELETE SET NULL;

-- Verify the constraint was created
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='tournaments'
    AND tc.constraint_name='tournaments_created_by_fkey';

-- Test tournament creation with the user
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
    'Test Snake Draft Championship',
    'Test tournament to verify foreign key constraint',
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

-- Clean up the test tournament
DELETE FROM tournaments WHERE name = 'Test Snake Draft Championship';

SELECT 'Foreign key constraint fixed successfully!' as result;
