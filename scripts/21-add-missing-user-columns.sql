-- Add missing columns to users table for account_id and balance
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS account_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS balance NUMERIC(10,2) DEFAULT 25.00;

-- Create index on account_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);

-- Update existing users to have a balance if they don't have one
UPDATE users SET balance = 25.00 WHERE balance IS NULL;
