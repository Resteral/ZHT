-- Update auction system to integrate with team ownership

-- Ensure base auction tables exist
CREATE TABLE IF NOT EXISTS auction_leagues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    require_team_ownership BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auction_bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auction_id UUID REFERENCES auction_leagues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auction_picks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auction_id UUID REFERENCES auction_leagues(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add team_id to auction_bids table to track which team made the bid
ALTER TABLE auction_bids 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Add team_id to auction_picks table to track which team won the player
ALTER TABLE auction_picks 
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Update auction_leagues to require team ownership
ALTER TABLE auction_leagues 
ADD COLUMN IF NOT EXISTS require_team_ownership BOOLEAN DEFAULT true;

-- Create function to validate team ownership before bidding
CREATE OR REPLACE FUNCTION validate_team_ownership_for_auction(
  user_id UUID,
  league_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  user_team_count INTEGER;
BEGIN
  -- Check if user owns at least one team
  SELECT COUNT(*) INTO user_team_count
  FROM teams 
  WHERE owner_id = user_id AND status = 'active';
  
  RETURN user_team_count > 0;
END;
$$ LANGUAGE plpgsql;

-- Create function to assign purchased player to bidder's team
CREATE OR REPLACE FUNCTION assign_player_to_team(
  player_id UUID,
  team_id UUID,
  auction_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Add player to team roster
  INSERT INTO team_members (team_id, user_id, role, joined_at)
  VALUES (team_id, player_id, 'player', NOW())
  ON CONFLICT (team_id, user_id) DO NOTHING;
  
  -- Update auction pick with team assignment
  UPDATE auction_picks 
  SET team_id = team_id
  WHERE player_id = player_id AND auction_id = auction_id;
END;
$$ LANGUAGE plpgsql;
