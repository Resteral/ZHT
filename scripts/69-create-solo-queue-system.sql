-- Create solo queue table for automatic matchmaking
CREATE TABLE IF NOT EXISTS solo_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  preferred_format VARCHAR(10) NOT NULL DEFAULT '4v4',
  status VARCHAR(20) NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one queue entry per user
  UNIQUE(user_id, status)
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_solo_queue_status_format ON solo_queue(status, preferred_format);
CREATE INDEX IF NOT EXISTS idx_solo_queue_created_at ON solo_queue(created_at);

-- Enable RLS
ALTER TABLE solo_queue ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view all queue entries" ON solo_queue FOR SELECT USING (true);
CREATE POLICY "Users can insert their own queue entries" ON solo_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own queue entries" ON solo_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own queue entries" ON solo_queue FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create matches when queue fills
CREATE OR REPLACE FUNCTION auto_create_match_from_queue()
RETURNS TRIGGER AS $$
DECLARE
  queue_format VARCHAR(10);
  required_players INTEGER;
  available_players INTEGER;
  match_id UUID;
  player_record RECORD;
BEGIN
  -- Get the format from the new queue entry
  queue_format := NEW.preferred_format;
  
  -- Calculate required players (1v1 = 2, 2v2 = 4, etc.)
  required_players := (CAST(SUBSTRING(queue_format FROM 1 FOR 1) AS INTEGER)) * 2;
  
  -- Count available players in this format
  SELECT COUNT(*) INTO available_players
  FROM solo_queue 
  WHERE preferred_format = queue_format 
  AND status = 'waiting';
  
  -- If we have enough players, create a match
  IF available_players >= required_players THEN
    -- Create the match
    INSERT INTO matches (
      name,
      match_type,
      max_participants,
      status,
      game,
      entry_fee,
      prize_pool
    ) VALUES (
      queue_format || ' Solo Queue Match',
      queue_format || '_draft',
      required_players,
      'waiting',
      'Omega Strikers',
      0,
      required_players * 10
    ) RETURNING id INTO match_id;
    
    -- Add players to the match
    FOR player_record IN 
      SELECT user_id 
      FROM solo_queue 
      WHERE preferred_format = queue_format 
      AND status = 'waiting'
      ORDER BY created_at
      LIMIT required_players
    LOOP
      INSERT INTO match_participants (match_id, user_id)
      VALUES (match_id, player_record.user_id);
    END LOOP;
    
    -- Remove players from queue
    DELETE FROM solo_queue 
    WHERE preferred_format = queue_format 
    AND status = 'waiting'
    AND user_id IN (
      SELECT user_id 
      FROM solo_queue 
      WHERE preferred_format = queue_format 
      AND status = 'waiting'
      ORDER BY created_at
      LIMIT required_players
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-match creation
DROP TRIGGER IF EXISTS trigger_auto_create_match ON solo_queue;
CREATE TRIGGER trigger_auto_create_match
  AFTER INSERT ON solo_queue
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_match_from_queue();
