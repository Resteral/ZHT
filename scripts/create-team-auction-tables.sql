-- Create tables for team auctions and tournament extensions

-- Team auctions table
CREATE TABLE IF NOT EXISTS team_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
  team_name VARCHAR(255) NOT NULL,
  captain_name VARCHAR(255) NOT NULL,
  player_count INTEGER DEFAULT 0,
  avg_elo INTEGER DEFAULT 1000,
  current_bid INTEGER DEFAULT 0,
  highest_bidder_id UUID REFERENCES users(id),
  highest_bidder_name VARCHAR(255),
  auction_end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'bidding', 'sold')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team auction bids table
CREATE TABLE IF NOT EXISTS team_auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_auction_id UUID NOT NULL REFERENCES team_auctions(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bidder_name VARCHAR(255) NOT NULL,
  bid_amount INTEGER NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament extensions table
CREATE TABLE IF NOT EXISTS tournament_extensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  original_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  new_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  extension_reason TEXT NOT NULL,
  approved_by UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add auction_price column to tournament_teams if it doesn't exist
ALTER TABLE tournament_teams 
ADD COLUMN IF NOT EXISTS auction_price INTEGER DEFAULT 0;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_team_auctions_tournament_id ON team_auctions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_team_auctions_status ON team_auctions(status);
CREATE INDEX IF NOT EXISTS idx_team_auction_bids_auction_id ON team_auction_bids(team_auction_id);
CREATE INDEX IF NOT EXISTS idx_tournament_extensions_tournament_id ON tournament_extensions(tournament_id);

-- Enable RLS
ALTER TABLE team_auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_auction_bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_extensions ENABLE ROW LEVEL SECURITY;

-- RLS policies for team auctions (readable by all, writable by authenticated users)
CREATE POLICY "Team auctions are viewable by everyone" ON team_auctions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create team auctions" ON team_auctions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Tournament creators can update their team auctions" ON team_auctions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM tournaments 
    WHERE tournaments.id = team_auctions.tournament_id 
    AND tournaments.created_by = auth.uid()
  )
);

-- RLS policies for team auction bids
CREATE POLICY "Team auction bids are viewable by everyone" ON team_auction_bids FOR SELECT USING (true);
CREATE POLICY "Authenticated users can place bids" ON team_auction_bids FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS policies for tournament extensions
CREATE POLICY "Tournament extensions are viewable by everyone" ON tournament_extensions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can request extensions" ON tournament_extensions FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Tournament creators can approve extensions" ON tournament_extensions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM tournaments 
    WHERE tournaments.id = tournament_extensions.tournament_id 
    AND tournaments.created_by = auth.uid()
  )
);

COMMENT ON TABLE team_auctions IS 'Auctions for entire teams in tournaments';
COMMENT ON TABLE team_auction_bids IS 'Bids placed on team auctions';
COMMENT ON TABLE tournament_extensions IS 'Requests to extend tournament duration';
