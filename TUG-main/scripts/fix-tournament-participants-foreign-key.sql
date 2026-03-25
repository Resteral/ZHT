-- Fix tournament_participants foreign key constraint to reference users table instead of auth.users
-- This resolves the foreign key constraint violation error when joining tournaments

-- Drop the existing foreign key constraint that references auth.users
ALTER TABLE tournament_participants 
DROP CONSTRAINT IF EXISTS tournament_participants_user_id_fkey;

-- Add the correct foreign key constraint that references the users table
ALTER TABLE tournament_participants 
ADD CONSTRAINT tournament_participants_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Verify the constraint was created correctly
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
    AND tc.table_name = 'tournament_participants'
    AND kcu.column_name = 'user_id';

-- Create index for better performance on foreign key lookups
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON tournament_participants(user_id);

-- Refresh the schema cache
ANALYZE tournament_participants;
ANALYZE users;
