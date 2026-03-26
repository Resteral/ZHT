-- Create tournament auction draft system tables
CREATE TABLE IF NOT EXISTS tournament_auction_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'paused', 'completed', 'cancelled')),
    current_player_id UUID REFERENCES tournament_player_pool(id),
    current_bidder_id UUID REFERENCES tournament_teams(id),
    current_bid_amount NUMERIC DEFAULT 0,
    bid_timer_seconds INTEGER DEFAULT 30,
    bid_deadline TIMESTAMP WITH TIME ZONE,
    auction_round INTEGER DEFAULT 1,
    total_rounds INTEGER DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    settings JSONB DEFAULT '{}'::jsonb
);

-- Create auction bids table for tournament auctions
CREATE TABLE IF NOT EXISTS tournament_auction_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_session_id UUID NOT NULL REFERENCES tournament_auction_sessions(id) ON DELETE CASCADE,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES tournament_player_pool(id) ON DELETE CASCADE,
    bid_amount NUMERIC NOT NULL CHECK (bid_amount > 0),
    is_winning_bid BOOLEAN DEFAULT false,
    bid_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    auction_round INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team budgets table for auction management
CREATE TABLE IF NOT EXISTS tournament_team_budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    initial_budget NUMERIC NOT NULL DEFAULT 500,
    current_budget NUMERIC NOT NULL DEFAULT 500,
    spent_amount NUMERIC DEFAULT 0,
    players_acquired INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 4,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id, team_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_auction_sessions_tournament_id ON tournament_auction_sessions(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_auction_sessions_status ON tournament_auction_sessions(status);
CREATE INDEX IF NOT EXISTS idx_tournament_auction_bids_session_id ON tournament_auction_bids(auction_session_id);
CREATE INDEX IF NOT EXISTS idx_tournament_auction_bids_tournament_id ON tournament_auction_bids(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_team_budgets_tournament_id ON tournament_team_budgets(tournament_id);

-- Function to initialize team budgets when auction starts
CREATE OR REPLACE FUNCTION initialize_tournament_team_budgets(tournament_id_param UUID)
RETURNS VOID AS $$
DECLARE
    team_record RECORD;
    auction_budget NUMERIC;
    players_per_team INTEGER;
BEGIN
    -- Get auction budget from tournament settings
    SELECT 
        COALESCE((player_pool_settings->>'auction_budget')::NUMERIC, 500) as budget,
        COALESCE((player_pool_settings->>'players_per_team')::INTEGER, 4) as max_players
    INTO auction_budget, players_per_team
    FROM tournaments 
    WHERE id = tournament_id_param;
    
    -- Initialize budgets for all teams in the tournament
    FOR team_record IN 
        SELECT id FROM tournament_teams WHERE tournament_id = tournament_id_param
    LOOP
        INSERT INTO tournament_team_budgets (
            tournament_id, 
            team_id, 
            initial_budget, 
            current_budget,
            max_players
        ) VALUES (
            tournament_id_param,
            team_record.id,
            auction_budget,
            auction_budget,
            players_per_team
        ) ON CONFLICT (tournament_id, team_id) DO UPDATE SET
            initial_budget = auction_budget,
            current_budget = auction_budget,
            max_players = players_per_team,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update team budget after successful bid
CREATE OR REPLACE FUNCTION update_team_budget_after_bid(
    tournament_id_param UUID,
    team_id_param UUID,
    bid_amount_param NUMERIC
)
RETURNS VOID AS $$
BEGIN
    UPDATE tournament_team_budgets 
    SET 
        current_budget = current_budget - bid_amount_param,
        spent_amount = spent_amount + bid_amount_param,
        players_acquired = players_acquired + 1,
        updated_at = NOW()
    WHERE tournament_id = tournament_id_param AND team_id = team_id_param;
END;
$$ LANGUAGE plpgsql;
