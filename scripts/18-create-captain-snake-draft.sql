-- Create Captain Snake Draft System with Passing First Pick for 4v4 Games

-- Captain Draft Leagues Table
CREATE TABLE IF NOT EXISTS captain_draft_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  game_type VARCHAR(50) NOT NULL,
  team_size INTEGER NOT NULL CHECK (team_size IN (1, 2, 3, 4, 5, 6)),
  max_teams INTEGER NOT NULL DEFAULT 8,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  prize_pool DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'registration' CHECK (status IN ('registration', 'drafting', 'active', 'completed')),
  draft_start_time TIMESTAMP,
  allow_first_pick_pass BOOLEAN DEFAULT FALSE, -- Added for 4v4 passing first pick
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Captain Draft Participants Table
CREATE TABLE IF NOT EXISTS captain_draft_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES captain_draft_leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  is_captain BOOLEAN DEFAULT FALSE,
  team_name VARCHAR(255),
  draft_position INTEGER,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

-- Draft Picks Table
CREATE TABLE IF NOT EXISTS captain_draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES captain_draft_leagues(id) ON DELETE CASCADE,
  captain_id UUID REFERENCES users(id),
  player_id UUID REFERENCES users(id),
  pick_number INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  passed BOOLEAN DEFAULT FALSE, -- Added for tracking passed picks
  picked_at TIMESTAMP DEFAULT NOW()
);

-- Draft State Table for managing current draft status
CREATE TABLE IF NOT EXISTS captain_draft_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES captain_draft_leagues(id) ON DELETE CASCADE UNIQUE,
  current_pick INTEGER DEFAULT 1,
  current_round INTEGER DEFAULT 1,
  current_captain_id UUID REFERENCES users(id),
  draft_order JSONB, -- Array of captain IDs in draft order
  snake_direction VARCHAR(10) DEFAULT 'forward' CHECK (snake_direction IN ('forward', 'reverse')),
  time_per_pick INTEGER DEFAULT 60, -- seconds
  pick_deadline TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Team Rosters Table
CREATE TABLE IF NOT EXISTS captain_draft_rosters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES captain_draft_leagues(id) ON DELETE CASCADE,
  captain_id UUID REFERENCES users(id),
  player_id UUID REFERENCES users(id),
  position VARCHAR(50),
  added_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(league_id, player_id)
);

-- Matches Table for 1v1 through 6v6 games
CREATE TABLE IF NOT EXISTS captain_draft_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES captain_draft_leagues(id) ON DELETE CASCADE,
  team1_captain_id UUID REFERENCES users(id),
  team2_captain_id UUID REFERENCES users(id),
  scheduled_time TIMESTAMP,
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  winner_captain_id UUID REFERENCES users(id),
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Function to automatically set allow_first_pick_pass for 4v4 games
CREATE OR REPLACE FUNCTION set_first_pick_pass_for_4v4()
RETURNS TRIGGER AS $$
BEGIN
  -- Automatically enable first pick passing for 4v4 games
  IF NEW.team_size = 4 THEN
    NEW.allow_first_pick_pass = TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set first pick pass for 4v4 games
DROP TRIGGER IF EXISTS trigger_set_first_pick_pass ON captain_draft_leagues;
CREATE TRIGGER trigger_set_first_pick_pass
  BEFORE INSERT OR UPDATE ON captain_draft_leagues
  FOR EACH ROW
  EXECUTE FUNCTION set_first_pick_pass_for_4v4();

-- Function to handle snake draft order
CREATE OR REPLACE FUNCTION get_next_draft_pick(league_uuid UUID)
RETURNS TABLE(
  next_captain_id UUID,
  pick_number INTEGER,
  round_number INTEGER,
  can_pass BOOLEAN
) AS $$
DECLARE
  draft_state_rec RECORD;
  total_captains INTEGER;
  league_rec RECORD;
BEGIN
  -- Get league info
  SELECT * INTO league_rec FROM captain_draft_leagues WHERE id = league_uuid;
  
  -- Get current draft state
  SELECT * INTO draft_state_rec FROM captain_draft_state WHERE league_id = league_uuid;
  
  -- Get total number of captains
  SELECT COUNT(*) INTO total_captains 
  FROM captain_draft_participants 
  WHERE league_id = league_uuid AND is_captain = TRUE;
  
  -- Calculate next pick based on snake draft
  IF draft_state_rec.snake_direction = 'forward' THEN
    -- Forward direction: 1, 2, 3, 4...
    IF draft_state_rec.current_pick >= total_captains THEN
      -- End of round, reverse direction
      UPDATE captain_draft_state 
      SET snake_direction = 'reverse', 
          current_round = current_round + 1,
          current_pick = total_captains
      WHERE league_id = league_uuid;
      
      draft_state_rec.current_round := draft_state_rec.current_round + 1;
      draft_state_rec.snake_direction := 'reverse';
    ELSE
      -- Continue forward
      UPDATE captain_draft_state 
      SET current_pick = current_pick + 1
      WHERE league_id = league_uuid;
      
      draft_state_rec.current_pick := draft_state_rec.current_pick + 1;
    END IF;
  ELSE
    -- Reverse direction: 4, 3, 2, 1...
    IF draft_state_rec.current_pick <= 1 THEN
      -- End of round, go forward
      UPDATE captain_draft_state 
      SET snake_direction = 'forward', 
          current_round = current_round + 1,
          current_pick = 1
      WHERE league_id = league_uuid;
      
      draft_state_rec.current_round := draft_state_rec.current_round + 1;
      draft_state_rec.snake_direction := 'forward';
    ELSE
      -- Continue reverse
      UPDATE captain_draft_state 
      SET current_pick = current_pick - 1
      WHERE league_id = league_uuid;
      
      draft_state_rec.current_pick := draft_state_rec.current_pick - 1;
    END IF;
  END IF;
  
  -- Get the captain ID for current pick
  SELECT (draft_state_rec.draft_order->>(draft_state_rec.current_pick - 1))::UUID INTO next_captain_id;
  
  -- Check if captain can pass (only first pick in 4v4 games)
  RETURN QUERY SELECT 
    next_captain_id,
    draft_state_rec.current_pick,
    draft_state_rec.current_round,
    (league_rec.allow_first_pick_pass AND draft_state_rec.current_round = 1) AS can_pass;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample data for testing
INSERT INTO captain_draft_leagues (name, game_type, team_size, max_teams, entry_fee, created_by) 
VALUES 
  ('4v4 Championship Draft', 'StarCraft II', 4, 8, 25.00, (SELECT id FROM users LIMIT 1)),
  ('2v2 Quick Draft', 'StarCraft II', 2, 6, 10.00, (SELECT id FROM users LIMIT 1)),
  ('1v1 Elite Draft', 'StarCraft II', 1, 8, 50.00, (SELECT id FROM users LIMIT 1))
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_captain_draft_leagues_status ON captain_draft_leagues(status);
CREATE INDEX IF NOT EXISTS idx_captain_draft_participants_league ON captain_draft_participants(league_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_picks_league ON captain_draft_picks(league_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_state_league ON captain_draft_state(league_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_matches_league ON captain_draft_matches(league_id);
