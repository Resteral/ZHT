-- Rename captain draft tables to auction draft
ALTER TABLE captain_leagues RENAME TO auction_leagues;
ALTER TABLE captain_league_participants RENAME TO auction_league_participants;
ALTER TABLE captain_draft_picks RENAME TO auction_draft_bids;

-- Update column names to reflect auction concept
ALTER TABLE auction_leagues RENAME COLUMN draft_date TO auction_date;
ALTER TABLE auction_draft_bids RENAME COLUMN captain_id TO bidder_id;
ALTER TABLE auction_draft_bids RENAME COLUMN picked_player_id TO target_player_id;
ALTER TABLE auction_draft_bids RENAME COLUMN pick_order TO bid_order;
ALTER TABLE auction_draft_bids RENAME COLUMN round_number TO auction_round;
ALTER TABLE auction_draft_bids RENAME COLUMN picked_at TO bid_at;

-- Add auction-specific columns
ALTER TABLE auction_draft_bids ADD COLUMN IF NOT EXISTS bid_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE auction_leagues ADD COLUMN IF NOT EXISTS betting_enabled BOOLEAN DEFAULT true;
ALTER TABLE auction_leagues ADD COLUMN IF NOT EXISTS total_bets DECIMAL(10,2) DEFAULT 0;

-- Create auction betting table
CREATE TABLE IF NOT EXISTS auction_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES auction_leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  bet_type VARCHAR(50) NOT NULL, -- player_winner, team_winner, highest_bid, total_spent
  target_id UUID, -- player_id or team_id depending on bet_type
  bet_amount DECIMAL(10,2) NOT NULL,
  odds DECIMAL(5,2) NOT NULL,
  potential_payout DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'active', -- active, won, lost, cancelled
  placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Update indexes
DROP INDEX IF EXISTS idx_captain_leagues_game;
DROP INDEX IF EXISTS idx_captain_leagues_status;
DROP INDEX IF EXISTS idx_captain_participants_league;
DROP INDEX IF EXISTS idx_captain_participants_elo;

CREATE INDEX IF NOT EXISTS idx_auction_leagues_game ON auction_leagues(game);
CREATE INDEX IF NOT EXISTS idx_auction_leagues_status ON auction_leagues(status);
CREATE INDEX IF NOT EXISTS idx_auction_participants_league ON auction_league_participants(league_id);
CREATE INDEX IF NOT EXISTS idx_auction_participants_elo ON auction_league_participants(elo_rating DESC);
CREATE INDEX IF NOT EXISTS idx_auction_bets_league ON auction_bets(league_id);
CREATE INDEX IF NOT EXISTS idx_auction_bets_user ON auction_bets(user_id);
