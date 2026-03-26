-- Migration: Add Profile Linking for Steam and Epic Games
-- This enables users to link their IDs so opponents can easily add them.

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS steam_id TEXT,
ADD COLUMN IF NOT EXISTS epic_games_id TEXT;

-- Update RLS (Policies should already allow users to update their own row, but let's be explicit if needed)
-- Referring back to initial_schema:
-- create policy "Users can update their own profile" on public.users for update using (auth.uid() = id);
-- This policy covers the new columns!

COMMENT ON COLUMN public.users.steam_id IS 'Steam ID or profile link for social connectivity';
COMMENT ON COLUMN public.users.epic_games_id IS 'Epic Games display name or ID for social connectivity';
