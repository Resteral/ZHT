-- Create wager matches system
CREATE TABLE IF NOT EXISTS wager_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    opponent_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wager_amount DECIMAL(10,2) NOT NULL,
    game VARCHAR(100) NOT NULL DEFAULT 'Omega Strikers',
    status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'in_progress', 'completed', 'cancelled')),
    winner_id UUID REFERENCES users(id) ON DELETE SET NULL,
    creator_ready BOOLEAN DEFAULT FALSE,
    opponent_ready BOOLEAN DEFAULT FALSE,
    match_start_time TIMESTAMP WITH TIME ZONE,
    match_end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wager match results table
CREATE TABLE IF NOT EXISTS wager_match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES wager_matches(id) ON DELETE CASCADE,
    creator_score INTEGER DEFAULT 0,
    opponent_score INTEGER DEFAULT 0,
    match_duration INTEGER, -- in seconds
    replay_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wager match transactions table
CREATE TABLE IF NOT EXISTS wager_match_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES wager_matches(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('stake', 'payout', 'refund')),
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_wager_matches_status ON wager_matches(status);
CREATE INDEX IF NOT EXISTS idx_wager_matches_creator ON wager_matches(creator_id);
CREATE INDEX IF NOT EXISTS idx_wager_matches_opponent ON wager_matches(opponent_id);
CREATE INDEX IF NOT EXISTS idx_wager_matches_created_at ON wager_matches(created_at);

-- Function to create a wager match
CREATE OR REPLACE FUNCTION create_wager_match(
    p_creator_id UUID,
    p_wager_amount DECIMAL,
    p_game VARCHAR DEFAULT 'Omega Strikers'
) RETURNS UUID AS $$
DECLARE
    v_match_id UUID;
    v_creator_balance DECIMAL;
BEGIN
    -- Updated to use user_wallets table instead of wallets
    -- Check if creator has sufficient balance
    SELECT balance INTO v_creator_balance FROM user_wallets WHERE user_id = p_creator_id;
    
    IF v_creator_balance < p_wager_amount THEN
        RAISE EXCEPTION 'Insufficient balance to create wager match';
    END IF;
    
    -- Create the wager match
    INSERT INTO wager_matches (creator_id, wager_amount, game)
    VALUES (p_creator_id, p_wager_amount, p_game)
    RETURNING id INTO v_match_id;
    
    -- Updated to use user_wallets table instead of wallets
    -- Deduct stake from creator's wallet
    UPDATE user_wallets 
    SET balance = balance - p_wager_amount,
        updated_at = NOW()
    WHERE user_id = p_creator_id;
    
    -- Record the stake transaction
    INSERT INTO wager_match_transactions (match_id, user_id, transaction_type, amount)
    VALUES (v_match_id, p_creator_id, 'stake', p_wager_amount);
    
    RETURN v_match_id;
END;
$$ LANGUAGE plpgsql;

-- Function to join a wager match
CREATE OR REPLACE FUNCTION join_wager_match(
    p_match_id UUID,
    p_opponent_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_wager_amount DECIMAL;
    v_opponent_balance DECIMAL;
    v_match_status VARCHAR;
BEGIN
    -- Get match details
    SELECT wager_amount, status INTO v_wager_amount, v_match_status
    FROM wager_matches WHERE id = p_match_id;
    
    IF v_match_status != 'open' THEN
        RAISE EXCEPTION 'Match is not available for joining';
    END IF;
    
    -- Updated to use user_wallets table instead of wallets
    -- Check if opponent has sufficient balance
    SELECT balance INTO v_opponent_balance FROM user_wallets WHERE user_id = p_opponent_id;
    
    IF v_opponent_balance < v_wager_amount THEN
        RAISE EXCEPTION 'Insufficient balance to join wager match';
    END IF;
    
    -- Update match with opponent
    UPDATE wager_matches 
    SET opponent_id = p_opponent_id,
        status = 'matched',
        updated_at = NOW()
    WHERE id = p_match_id;
    
    -- Updated to use user_wallets table instead of wallets
    -- Deduct stake from opponent's wallet
    UPDATE user_wallets 
    SET balance = balance - v_wager_amount,
        updated_at = NOW()
    WHERE user_id = p_opponent_id;
    
    -- Record the stake transaction
    INSERT INTO wager_match_transactions (match_id, user_id, transaction_type, amount)
    VALUES (p_match_id, p_opponent_id, 'stake', v_wager_amount);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to complete a wager match
CREATE OR REPLACE FUNCTION complete_wager_match(
    p_match_id UUID,
    p_winner_id UUID,
    p_creator_score INTEGER DEFAULT 0,
    p_opponent_score INTEGER DEFAULT 0
) RETURNS BOOLEAN AS $$
DECLARE
    v_wager_amount DECIMAL;
    v_creator_id UUID;
    v_opponent_id UUID;
    v_winner_payout DECIMAL;
    v_loser_payout DECIMAL;
BEGIN
    -- Get match details
    SELECT wager_amount, creator_id, opponent_id 
    INTO v_wager_amount, v_creator_id, v_opponent_id
    FROM wager_matches WHERE id = p_match_id;
    
    -- Calculate payouts (winner gets 75%, loser gets 25%)
    v_winner_payout := v_wager_amount * 2 * 0.75;
    v_loser_payout := v_wager_amount * 2 * 0.25;
    
    -- Update match status
    UPDATE wager_matches 
    SET status = 'completed',
        winner_id = p_winner_id,
        match_end_time = NOW(),
        updated_at = NOW()
    WHERE id = p_match_id;
    
    -- Record match results
    INSERT INTO wager_match_results (match_id, creator_score, opponent_score)
    VALUES (p_match_id, p_creator_score, p_opponent_score);
    
    -- Updated to use user_wallets table instead of wallets
    -- Pay out winner
    UPDATE user_wallets 
    SET balance = balance + v_winner_payout,
        updated_at = NOW()
    WHERE user_id = p_winner_id;
    
    -- Updated to use user_wallets table instead of wallets
    -- Pay out loser (25% consolation)
    UPDATE user_wallets 
    SET balance = balance + v_loser_payout,
        updated_at = NOW()
    WHERE user_id = CASE WHEN p_winner_id = v_creator_id THEN v_opponent_id ELSE v_creator_id END;
    
    -- Record payout transactions
    INSERT INTO wager_match_transactions (match_id, user_id, transaction_type, amount)
    VALUES 
        (p_match_id, p_winner_id, 'payout', v_winner_payout),
        (p_match_id, CASE WHEN p_winner_id = v_creator_id THEN v_opponent_id ELSE v_creator_id END, 'payout', v_loser_payout);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to cancel a wager match and refund stakes
CREATE OR REPLACE FUNCTION cancel_wager_match(p_match_id UUID) RETURNS BOOLEAN AS $$
DECLARE
    v_wager_amount DECIMAL;
    v_creator_id UUID;
    v_opponent_id UUID;
    v_match_status VARCHAR;
BEGIN
    -- Get match details
    SELECT wager_amount, creator_id, opponent_id, status
    INTO v_wager_amount, v_creator_id, v_opponent_id, v_match_status
    FROM wager_matches WHERE id = p_match_id;
    
    IF v_match_status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot cancel completed or already cancelled match';
    END IF;
    
    -- Update match status
    UPDATE wager_matches 
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_match_id;
    
    -- Updated to use user_wallets table instead of wallets
    -- Refund creator
    UPDATE user_wallets 
    SET balance = balance + v_wager_amount,
        updated_at = NOW()
    WHERE user_id = v_creator_id;
    
    INSERT INTO wager_match_transactions (match_id, user_id, transaction_type, amount)
    VALUES (p_match_id, v_creator_id, 'refund', v_wager_amount);
    
    -- Refund opponent if they joined
    IF v_opponent_id IS NOT NULL THEN
        -- Updated to use user_wallets table instead of wallets
        UPDATE user_wallets 
        SET balance = balance + v_wager_amount,
            updated_at = NOW()
        WHERE user_id = v_opponent_id;
        
        INSERT INTO wager_match_transactions (match_id, user_id, transaction_type, amount)
        VALUES (p_match_id, v_opponent_id, 'refund', v_wager_amount);
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
