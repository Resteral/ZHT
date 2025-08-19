-- Add missing columns to users table for better signup tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_source VARCHAR(50) DEFAULT 'web';
ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_ip INET;

-- Create signup_logs table for detailed tracking
CREATE TABLE IF NOT EXISTS signup_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(255),
  account_id VARCHAR(255),
  signup_attempt_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_signup_logs_created_at ON signup_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signup_logs_success ON signup_logs(success);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
