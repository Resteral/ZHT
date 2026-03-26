-- Enhanced Captain Auction System Tables

-- Captain auction statistics tracking
CREATE TABLE IF NOT EXISTS captain_auction_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    captain_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    total_auctions INTEGER DEFAULT 0,
    successful_bids INTEGER DEFAULT 0,
    total_spent DECIMAL(10,2) DEFAULT 0,
    average_bid DECIMAL(10,2) DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    top_player_acquired TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(captain_id, tournament_id)
);

-- Auction bid history for detailed tracking
CREATE TABLE IF NOT EXISTS auction_bid_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    captain_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES tournament_teams(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    bid_amount DECIMAL(10,2) NOT NULL,
    won_bid BOOLEAN DEFAULT FALSE,
    auction_round INTEGER DEFAULT 1,
    time_remaining INTEGER DEFAULT 60,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Captain bidding strategies
CREATE TABLE IF NOT EXISTS captain_bid_strategies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    captain_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    strategy_name VARCHAR(100) NOT NULL,
    auto_bid_enabled BOOLEAN DEFAULT FALSE,
    max_bid_amount DECIMAL(10,2) DEFAULT 100,
    bid_increment DECIMAL(10,2) DEFAULT 5,
    target_positions TEXT[], -- Array of position preferences
    priority_players UUID[], -- Array of player IDs
    budget_allocation JSONB, -- Flexible budget allocation rules
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(captain_id, tournament_id, strategy_name)
);

-- Captain auction privileges and special features
CREATE TABLE IF NOT EXISTS captain_auction_privileges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    captain_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    privilege_type VARCHAR(50) NOT NULL, -- 'budget_bonus', 'early_access', 'auto_bid', etc.
    privilege_value JSONB, -- Flexible privilege configuration
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced tournament teams with captain customization
ALTER TABLE tournament_teams 
ADD COLUMN IF NOT EXISTS captain_auction_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS auction_performance_score DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS preferred_bid_strategy VARCHAR(50) DEFAULT 'manual';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_captain_auction_stats_captain ON captain_auction_stats(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_auction_stats_tournament ON captain_auction_stats(tournament_id);
CREATE INDEX IF NOT EXISTS idx_auction_bid_history_captain ON auction_bid_history(captain_id);
CREATE INDEX IF NOT EXISTS idx_auction_bid_history_tournament ON auction_bid_history(tournament_id);
CREATE INDEX IF NOT EXISTS idx_captain_bid_strategies_captain ON captain_bid_strategies(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_auction_privileges_captain ON captain_auction_privileges(captain_id);

-- Functions for captain auction analytics
CREATE OR REPLACE FUNCTION update_captain_auction_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update captain stats when a bid is placed
    INSERT INTO captain_auction_stats (captain_id, tournament_id, total_auctions, successful_bids, total_spent, average_bid, win_rate)
    VALUES (NEW.captain_id, NEW.tournament_id, 1, 
            CASE WHEN NEW.won_bid THEN 1 ELSE 0 END,
            CASE WHEN NEW.won_bid THEN NEW.bid_amount ELSE 0 END,
            NEW.bid_amount,
            CASE WHEN NEW.won_bid THEN 100.0 ELSE 0.0 END)
    ON CONFLICT (captain_id, tournament_id) 
    DO UPDATE SET
        total_auctions = captain_auction_stats.total_auctions + 1,
        successful_bids = captain_auction_stats.successful_bids + CASE WHEN NEW.won_bid THEN 1 ELSE 0 END,
        total_spent = captain_auction_stats.total_spent + CASE WHEN NEW.won_bid THEN NEW.bid_amount ELSE 0 END,
        average_bid = (captain_auction_stats.total_spent + CASE WHEN NEW.won_bid THEN NEW.bid_amount ELSE 0 END) / 
                     NULLIF(captain_auction_stats.successful_bids + CASE WHEN NEW.won_bid THEN 1 ELSE 0 END, 0),
        win_rate = ((captain_auction_stats.successful_bids + CASE WHEN NEW.won_bid THEN 1 ELSE 0 END)::DECIMAL / 
                   (captain_auction_stats.total_auctions + 1)) * 100,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update captain stats
DROP TRIGGER IF EXISTS trigger_update_captain_auction_stats ON auction_bid_history;
CREATE TRIGGER trigger_update_captain_auction_stats
    AFTER INSERT ON auction_bid_history
    FOR EACH ROW
    EXECUTE FUNCTION update_captain_auction_stats();

-- Function to get captain auction leaderboard
CREATE OR REPLACE FUNCTION get_captain_auction_leaderboard(tournament_id_param UUID)
RETURNS TABLE (
    captain_id UUID,
    captain_name TEXT,
    team_name TEXT,
    total_auctions INTEGER,
    successful_bids INTEGER,
    win_rate DECIMAL,
    total_spent DECIMAL,
    average_bid DECIMAL,
    performance_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cas.captain_id,
        u.username as captain_name,
        tt.team_name,
        cas.total_auctions,
        cas.successful_bids,
        cas.win_rate,
        cas.total_spent,
        cas.average_bid,
        tt.auction_performance_score
    FROM captain_auction_stats cas
    JOIN users u ON cas.captain_id = u.id
    JOIN tournament_teams tt ON cas.captain_id = tt.team_captain AND cas.tournament_id = tt.tournament_id
    WHERE cas.tournament_id = tournament_id_param
    ORDER BY cas.win_rate DESC, cas.successful_bids DESC, cas.total_spent DESC;
END;
$$ LANGUAGE plpgsql;

-- Sample captain privileges data
INSERT INTO captain_auction_privileges (captain_id, tournament_id, privilege_type, privilege_value, is_active)
SELECT 
    tt.team_captain,
    tt.tournament_id,
    'budget_bonus',
    '{"bonus_amount": 50, "description": "Elite Captain Bonus"}'::jsonb,
    true
FROM tournament_teams tt
WHERE tt.team_captain IS NOT NULL
ON CONFLICT DO NOTHING;

-- Update existing teams with default auction settings
UPDATE tournament_teams 
SET captain_auction_settings = '{
    "auto_bid_enabled": false,
    "preferred_increment": 5,
    "risk_tolerance": "medium",
    "target_player_types": ["balanced"]
}'::jsonb
WHERE captain_auction_settings = '{}' OR captain_auction_settings IS NULL;

COMMIT;
