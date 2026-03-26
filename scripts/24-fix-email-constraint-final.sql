-- Remove any existing constraints on email column and make it nullable
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add a check to ensure the column can accept null values
ALTER TABLE users ALTER COLUMN email SET DEFAULT NULL;

-- Update any existing records with empty emails to null
UPDATE users SET email = NULL WHERE email = '' OR email IS NULL;
