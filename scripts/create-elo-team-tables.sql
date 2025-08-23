-- Create ELO teams table
CREATE TABLE IF NOT EXISTS elo_teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    max_players INTEGER NOT NULL DEFAULT 5,
    budget_remaining INTEGER NOT NULL DEFAULT 10000,
    budget_used INTEGER NOT NULL DEFAULT 0,
    total_elo INTEGER NOT NULL DEFAULT 0,
    average_elo DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'competing')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ELO team players table
CREATE TABLE IF NOT EXISTS elo_team_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES elo_teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position TEXT NOT NULL DEFAULT 'Player',
    acquisition_cost INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'benched', 'injured')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

-- Create player auctions table
CREATE TABLE IF NOT EXISTS player_auctions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starting_bid INTEGER NOT NULL DEFAULT 100,
    current_bid INTEGER NOT NULL DEFAULT 0,
    reserve_price INTEGER NOT NULL DEFAULT 100,
    highest_bidder_id UUID REFERENCES users(id) ON DELETE SET NULL,
    auction_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    auction_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    bid_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create player bids table
CREATE TABLE IF NOT EXISTS player_bids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auction_id UUID NOT NULL REFERENCES player_auctions(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bid_amount INTEGER NOT NULL,
    bid_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_elo_teams_owner ON elo_teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_elo_team_players_team ON elo_team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_elo_team_players_user ON elo_team_players(user_id);
CREATE INDEX IF NOT EXISTS idx_player_auctions_status ON player_auctions(status);
CREATE INDEX IF NOT EXISTS idx_player_auctions_end_time ON player_auctions(auction_end);
CREATE INDEX IF NOT EXISTS idx_player_bids_auction ON player_bids(auction_id);
CREATE INDEX IF NOT EXISTS idx_player_bids_bidder ON player_bids(bidder_id);

-- Create function to update team stats when players are added/removed
CREATE OR REPLACE FUNCTION update_team_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update team statistics when players are added or removed
    UPDATE elo_teams 
    SET 
        total_elo = (
            SELECT COALESCE(SUM(u.elo_rating), 0)
            FROM elo_team_players etp
            JOIN users u ON u.id = etp.user_id
            WHERE etp.team_id = COALESCE(NEW.team_id, OLD.team_id)
            AND etp.status = 'active'
        ),
        average_elo = (
            SELECT CASE 
                WHEN COUNT(*) > 0 THEN AVG(u.elo_rating)
                ELSE 0 
            END
            FROM elo_team_players etp
            JOIN users u ON u.id = etp.user_id
            WHERE etp.team_id = COALESCE(NEW.team_id, OLD.team_id)
            AND etp.status = 'active'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.team_id, OLD.team_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update team stats
CREATE TRIGGER trigger_update_team_stats_insert
    AFTER INSERT ON elo_team_players
    FOR EACH ROW
    EXECUTE FUNCTION update_team_stats();

CREATE TRIGGER trigger_update_team_stats_update
    AFTER UPDATE ON elo_team_players
    FOR EACH ROW
    EXECUTE FUNCTION update_team_stats();

CREATE TRIGGER trigger_update_team_stats_delete
    AFTER DELETE ON elo_team_players
    FOR EACH ROW
    EXECUTE FUNCTION update_team_stats();

-- Create function to automatically end expired auctions
CREATE OR REPLACE FUNCTION end_expired_auctions()
RETURNS VOID AS $$
BEGIN
    UPDATE player_auctions 
    SET status = 'completed'
    WHERE status = 'active' 
    AND auction_end < NOW();
END;
$$ LANGUAGE plpgsql;

-- Insert sample player auctions for testing
INSERT INTO player_auctions (
    player_id,
    starting_bid,
    current_bid,
    reserve_price,
    auction_end
) 
SELECT 
    u.id,
    CASE 
        WHEN u.elo_rating >= 1800 THEN 1000
        WHEN u.elo_rating >= 1600 THEN 500
        WHEN u.elo_rating >= 1400 THEN 250
        ELSE 100
    END as starting_bid,
    0 as current_bid,
    CASE 
        WHEN u.elo_rating >= 1800 THEN 1000
        WHEN u.elo_rating >= 1600 THEN 500
        WHEN u.elo_rating >= 1400 THEN 250
        ELSE 100
    END as reserve_price,
    NOW() + INTERVAL '24 hours' as auction_end
FROM users u
WHERE u.elo_rating >= 1400
ORDER BY u.elo_rating DESC
LIMIT 10
ON CONFLICT DO NOTHING;

-- Display sample data
SELECT 
    'ELO Teams' as table_name,
    COUNT(*) as record_count
FROM elo_teams
UNION ALL
SELECT 
    'Player Auctions' as table_name,
    COUNT(*) as record_count
FROM player_auctions
UNION ALL
SELECT 
    'Team Players' as table_name,
    COUNT(*) as record_count
FROM elo_team_players;
