-- Add auto-bidding columns to player_auctions table
ALTER TABLE player_auctions 
ADD COLUMN IF NOT EXISTS auto_bid_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS max_auto_bid INTEGER DEFAULT 0;

-- Add auto-bid tracking to player_bids table
ALTER TABLE player_bids 
ADD COLUMN IF NOT EXISTS is_auto_bid BOOLEAN DEFAULT FALSE;

-- Create player bets table for betting on player performance
CREATE TABLE IF NOT EXISTS player_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bet_type TEXT NOT NULL CHECK (bet_type IN ('performance', 'match_outcome', 'elo_change')),
    bet_description TEXT NOT NULL,
    odds DECIMAL(5,2) NOT NULL DEFAULT 2.00,
    min_bet INTEGER NOT NULL DEFAULT 10,
    max_bet INTEGER NOT NULL DEFAULT 1000,
    total_pool INTEGER NOT NULL DEFAULT 0,
    bet_count INTEGER NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user bets table for tracking individual bets
CREATE TABLE IF NOT EXISTS user_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bet_id UUID NOT NULL REFERENCES player_bets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bet_amount INTEGER NOT NULL,
    potential_payout DECIMAL(10,2) NOT NULL,
    bet_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_bets_player ON player_bets(player_id);
CREATE INDEX IF NOT EXISTS idx_player_bets_status ON player_bets(status);
CREATE INDEX IF NOT EXISTS idx_player_bets_expires ON player_bets(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_bets_user ON user_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_bet ON user_bets(bet_id);
CREATE INDEX IF NOT EXISTS idx_user_bets_status ON user_bets(status);

-- Create function to handle auto-bidding
CREATE OR REPLACE FUNCTION handle_auto_bidding()
RETURNS TRIGGER AS $$
DECLARE
    auto_bidder RECORD;
    new_bid_amount INTEGER;
BEGIN
    -- Check if there are any auto-bidders for this auction
    FOR auto_bidder IN 
        SELECT DISTINCT pb.bidder_id, pa.max_auto_bid, u.username
        FROM player_bids pb
        JOIN player_auctions pa ON pa.id = pb.auction_id
        JOIN users u ON u.id = pb.bidder_id
        WHERE pb.auction_id = NEW.id
        AND pa.auto_bid_enabled = TRUE
        AND pa.max_auto_bid > NEW.current_bid
        AND pb.bidder_id != NEW.highest_bidder_id
        ORDER BY pa.max_auto_bid DESC
        LIMIT 1
    LOOP
        -- Calculate new bid amount (current bid + minimum increment)
        new_bid_amount := NEW.current_bid + 10;
        
        -- Don't exceed the auto-bidder's maximum
        IF new_bid_amount <= auto_bidder.max_auto_bid THEN
            -- Place auto-bid
            INSERT INTO player_bids (
                auction_id,
                bidder_id,
                bid_amount,
                bid_time,
                is_auto_bid
            ) VALUES (
                NEW.id,
                auto_bidder.bidder_id,
                new_bid_amount,
                NOW(),
                TRUE
            );
            
            -- Update auction
            UPDATE player_auctions 
            SET 
                current_bid = new_bid_amount,
                highest_bidder_id = auto_bidder.bidder_id,
                bid_count = bid_count + 1
            WHERE id = NEW.id;
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-bidding
CREATE TRIGGER trigger_handle_auto_bidding
    AFTER UPDATE OF current_bid ON player_auctions
    FOR EACH ROW
    WHEN (NEW.current_bid > OLD.current_bid)
    EXECUTE FUNCTION handle_auto_bidding();

-- Create function to resolve player bets
CREATE OR REPLACE FUNCTION resolve_player_bet(bet_id UUID, winning_outcome BOOLEAN)
RETURNS VOID AS $$
BEGIN
    -- Update bet status
    UPDATE player_bets 
    SET status = 'completed'
    WHERE id = bet_id;
    
    -- Update user bets based on outcome
    IF winning_outcome THEN
        UPDATE user_bets 
        SET status = 'won'
        WHERE bet_id = bet_id AND status = 'active';
    ELSE
        UPDATE user_bets 
        SET status = 'lost'
        WHERE bet_id = bet_id AND status = 'active';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert sample player bets for testing
INSERT INTO player_bets (
    player_id,
    bet_type,
    bet_description,
    odds,
    min_bet,
    max_bet,
    expires_at
) 
SELECT 
    u.id,
    CASE 
        WHEN u.elo_rating >= 1800 THEN 'performance'
        WHEN u.elo_rating >= 1600 THEN 'match_outcome'
        ELSE 'elo_change'
    END as bet_type,
    CASE 
        WHEN u.elo_rating >= 1800 THEN u.username || ' will win their next 3 matches'
        WHEN u.elo_rating >= 1600 THEN u.username || ' will score 15+ points in next match'
        ELSE u.username || ' will gain 50+ ELO this week'
    END as bet_description,
    CASE 
        WHEN u.elo_rating >= 1800 THEN 1.5
        WHEN u.elo_rating >= 1600 THEN 2.0
        ELSE 3.0
    END as odds,
    25 as min_bet,
    500 as max_bet,
    NOW() + INTERVAL '7 days' as expires_at
FROM users u
WHERE u.elo_rating >= 1400
ORDER BY u.elo_rating DESC
LIMIT 8
ON CONFLICT DO NOTHING;

-- Display enhanced bidding system data
SELECT 
    'Enhanced Player Auctions' as table_name,
    COUNT(*) as record_count
FROM player_auctions
UNION ALL
SELECT 
    'Player Bets' as table_name,
    COUNT(*) as record_count
FROM player_bets
UNION ALL
SELECT 
    'User Bets' as table_name,
    COUNT(*) as record_count
FROM user_bets
UNION ALL
SELECT 
    'Auto-Bid Enabled Auctions' as table_name,
    COUNT(*) as record_count
FROM player_auctions
WHERE auto_bid_enabled = TRUE;
