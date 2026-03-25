-- Make email column nullable and add xP/60 calculation support
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Add index for better performance on account_id lookups
CREATE INDEX IF NOT EXISTS idx_users_account_id ON users(account_id);

-- Update CSV analytics to support xP/60 calculations
ALTER TABLE csv_analytics_data 
ADD COLUMN IF NOT EXISTS expected_points_60 NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS possession_rating NUMERIC DEFAULT 0;
