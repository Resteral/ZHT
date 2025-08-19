-- Fix email column to allow null values and ensure signup works
-- Drop any existing not-null constraint on email column
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Make sure email column allows null values
ALTER TABLE users ALTER COLUMN email SET DEFAULT NULL;

-- Update any existing records with empty emails to null
UPDATE users SET email = NULL WHERE email = '' OR email IS NULL;
