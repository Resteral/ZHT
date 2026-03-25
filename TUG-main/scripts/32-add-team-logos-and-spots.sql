-- Add team logo and spots functionality
ALTER TABLE teams 
ADD COLUMN logo_url TEXT,
ADD COLUMN max_players INTEGER DEFAULT 5,
ADD COLUMN current_players INTEGER DEFAULT 0;

-- Update tournaments to be team-based with flexible duration
ALTER TABLE tournaments 
ADD COLUMN max_teams INTEGER DEFAULT 8,
ADD COLUMN duration_hours INTEGER DEFAULT 72, -- 3 days default, but can be shorter
ADD COLUMN team_based BOOLEAN DEFAULT true;

-- Create team spots/roster management
CREATE TABLE team_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  position VARCHAR(50),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_captain BOOLEAN DEFAULT false,
  UNIQUE(team_id, user_id)
);

-- Function to manage team roster spots
CREATE OR REPLACE FUNCTION add_player_to_team(
  p_team_id UUID,
  p_user_id UUID,
  p_position VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  team_max_players INTEGER;
  team_current_players INTEGER;
BEGIN
  -- Get team limits
  SELECT max_players, current_players INTO team_max_players, team_current_players
  FROM teams WHERE id = p_team_id;
  
  -- Check if team has space
  IF team_current_players >= team_max_players THEN
    RETURN FALSE;
  END IF;
  
  -- Add player to roster
  INSERT INTO team_rosters (team_id, user_id, position)
  VALUES (p_team_id, p_user_id, p_position);
  
  -- Update current player count
  UPDATE teams 
  SET current_players = current_players + 1
  WHERE id = p_team_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
