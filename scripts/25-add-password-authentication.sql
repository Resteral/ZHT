-- Add password_hash column to users table for secure authentication
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Create index on username for faster login queries
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update any existing users to have a default password hash (they'll need to reset)
-- This is just for development - in production you'd handle this differently
UPDATE users SET password_hash = '$2a$12$dummy.hash.for.existing.users' WHERE password_hash IS NULL;
