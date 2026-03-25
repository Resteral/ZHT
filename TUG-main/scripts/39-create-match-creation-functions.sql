-- Create database functions for match creation

-- Function to create generic matches
CREATE OR REPLACE FUNCTION create_match(
  p_creator_id UUID,
  p_name TEXT,
  p_game TEXT,
  p_match_type TEXT,
  p_max_participants INTEGER DEFAULT 8,
  p_entry_fee DECIMAL DEFAULT 0,
  p_prize_pool DECIMAL DEFAULT 0,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_match_id UUID;
BEGIN
  -- Insert new match
  INSERT INTO matches (
    creator_id,
    name,
    description,
    game,
    match_type,
    max_participants,
    entry_fee,
    prize_pool,
    start_date,
    status,
    created_at
  ) VALUES (
    p_creator_id,
    p_name,
    p_description,
    p_game,
    p_match_type,
    p_max_participants,
    p_entry_fee,
    p_prize_pool,
    p_start_date,
    'waiting',
    NOW()
  ) RETURNING id INTO v_match_id;

  -- Add creator as first participant
  INSERT INTO match_participants (
    match_id,
    user_id,
    joined_at
  ) VALUES (
    v_match_id,
    p_creator_id,
    NOW()
  );

  RETURN v_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create captain drafts
CREATE OR REPLACE FUNCTION create_captain_draft(
  p_creator_id UUID,
  p_name TEXT,
  p_game TEXT,
  p_max_participants INTEGER DEFAULT 8,
  p_team_format TEXT DEFAULT '1v1',
  p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_draft_id UUID;
BEGIN
  -- Insert new captain draft
  INSERT INTO captain_drafts (
    creator_id,
    name,
    description,
    game,
    max_participants,
    team_format,
    status,
    created_at
  ) VALUES (
    p_creator_id,
    p_name,
    p_description,
    p_game,
    p_max_participants,
    p_team_format,
    'waiting',
    NOW()
  ) RETURNING id INTO v_draft_id;

  -- Add creator as first participant
  INSERT INTO captain_draft_participants (
    draft_id,
    user_id,
    joined_at
  ) VALUES (
    v_draft_id,
    p_creator_id,
    NOW()
  );

  RETURN v_draft_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create matches table if it doesn't exist
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  game TEXT NOT NULL,
  match_type TEXT NOT NULL,
  max_participants INTEGER DEFAULT 8,
  entry_fee DECIMAL DEFAULT 0,
  prize_pool DECIMAL DEFAULT 0,
  start_date TIMESTAMP,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create match participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS match_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(match_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_matches_creator_id ON matches(creator_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_game ON matches(game);
CREATE INDEX IF NOT EXISTS idx_match_participants_match_id ON match_participants(match_id);
CREATE INDEX IF NOT EXISTS idx_match_participants_user_id ON match_participants(user_id);
