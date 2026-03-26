-- Migration: Add Account Settings and Profile Customization fields
-- This adds a JSONB settings column for flexible preferences and ensures common profile fields are present.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{
  "notifications": {
    "match_starts": true,
    "match_results": true,
    "platform_news": false
  },
  "privacy": {
    "public_profile": true,
    "show_elo": true
  }
}'::jsonb;

-- Note: username column already exists in initial_schema.sql

COMMENT ON COLUMN public.users.settings IS 'User-specific preferences including notifications and privacy toggles';
COMMENT ON COLUMN public.users.avatar_url IS 'URL to the user profile picture';
