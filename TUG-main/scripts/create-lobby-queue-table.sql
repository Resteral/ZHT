-- Create lobby_queue table for matchmaking system
CREATE TABLE IF NOT EXISTS lobby_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  queue_type TEXT NOT NULL CHECK (queue_type IN ('maxed', 'unmaxed')),
  game_format TEXT NOT NULL CHECK (game_format IN ('snake_draft', 'auction_draft', 'linear_draft')),
  player_count INTEGER NOT NULL CHECK (player_count IN (2, 3, 4, 6)),
  elo_rating INTEGER NOT NULL DEFAULT 1000,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_lobby_queue_status ON lobby_queue(status);
CREATE INDEX IF NOT EXISTS idx_lobby_queue_type_format ON lobby_queue(queue_type, game_format, player_count);
CREATE INDEX IF NOT EXISTS idx_lobby_queue_user ON lobby_queue(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lobby_queue_joined_at ON lobby_queue(joined_at);

-- Enable Row Level Security
ALTER TABLE lobby_queue ENABLE ROW LEVEL SECURITY;

-- Allow users to see all queue entries
CREATE POLICY "Users can view all queue entries" ON lobby_queue
  FOR SELECT
  USING (true);

-- Allow users to insert their own queue entries
CREATE POLICY "Users can join queues" ON lobby_queue
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own queue entries
CREATE POLICY "Users can update their own queue entries" ON lobby_queue
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own queue entries
CREATE POLICY "Users can delete their own queue entries" ON lobby_queue
  FOR DELETE
  USING (auth.uid() = user_id);
