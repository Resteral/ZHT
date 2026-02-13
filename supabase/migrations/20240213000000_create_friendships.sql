-- Drop table if it exists to ensure clean schema (for dev environment)
DROP TABLE IF EXISTS friendships;

-- Create friendships table
CREATE TABLE friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id_1 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_id_2 UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'blocked')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS friendships_user_id_1_idx ON friendships(user_id_1);
CREATE INDEX IF NOT EXISTS friendships_user_id_2_idx ON friendships(user_id_2);

-- Enable RLS
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;

-- Policies

-- Users can see their own friendships
CREATE POLICY "Users can view their own friendships"
  ON friendships
  FOR SELECT
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Users can insert a friendship request (initiator is user_id_1)
CREATE POLICY "Users can send friend requests"
  ON friendships
  FOR INSERT
  WITH CHECK (auth.uid() = user_id_1);

-- Users can update their own friendships (accepting/blocking)
CREATE POLICY "Users can update their own friendships"
  ON friendships
  FOR UPDATE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- Users can delete their own friendships
CREATE POLICY "Users can delete their own friendships"
  ON friendships
  FOR DELETE
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
