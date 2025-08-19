-- Fix wager match database functions to use user_wallets instead of wallets table
-- Drop existing functions that reference the wrong table
DROP FUNCTION IF EXISTS create_wager_match(uuid, numeric, text);
DROP FUNCTION IF EXISTS join_wager_match(uuid, uuid);
DROP FUNCTION IF EXISTS complete_wager_match(uuid, uuid);
DROP FUNCTION IF EXISTS cancel_wager_match(uuid);

-- Create wager_matches table if it doesn't exist
CREATE TABLE IF NOT EXISTS wager_matches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id uuid REFERENCES auth.users(id) NOT NULL,
    challenger_id uuid REFERENCES auth.users(id),
    wager_amount numeric NOT NULL CHECK (wager_amount > 0),
    game text NOT NULL,
    status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed', 'cancelled')),
    winner_id uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    started_at timestamp with time zone,
    completed_at timestamp with time zone
);

-- Create function to create wager match
CREATE OR REPLACE FUNCTION create_wager_match(
    p_creator_id uuid,
    p_wager_amount numeric,
    p_game text
) RETURNS uuid AS $$
DECLARE
    v_match_id uuid;
    v_user_balance numeric;
BEGIN
    -- Check if user has sufficient balance
    SELECT balance INTO v_user_balance 
    FROM user_wallets 
    WHERE user_id = p_creator_id;
    
    IF v_user_balance IS NULL THEN
        RAISE EXCEPTION 'User wallet not found';
    END IF;
    
    IF v_user_balance < p_wager_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', p_wager_amount, v_user_balance;
    END IF;
    
    -- Deduct wager amount from creator's balance
    UPDATE user_wallets 
    SET balance = balance - p_wager_amount,
        updated_at = now()
    WHERE user_id = p_creator_id;
    
    -- Create wager match
    INSERT INTO wager_matches (creator_id, wager_amount, game)
    VALUES (p_creator_id, p_wager_amount, p_game)
    RETURNING id INTO v_match_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, amount, transaction_type, description, reference_id)
    VALUES (p_creator_id, -p_wager_amount, 'wager_stake', 'Wager match stake', v_match_id);
    
    RETURN v_match_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to join wager match
CREATE OR REPLACE FUNCTION join_wager_match(
    p_match_id uuid,
    p_challenger_id uuid
) RETURNS boolean AS $$
DECLARE
    v_wager_amount numeric;
    v_challenger_balance numeric;
BEGIN
    -- Get wager amount and check match status
    SELECT wager_amount INTO v_wager_amount
    FROM wager_matches 
    WHERE id = p_match_id AND status = 'waiting' AND creator_id != p_challenger_id;
    
    IF v_wager_amount IS NULL THEN
        RAISE EXCEPTION 'Wager match not found or not available';
    END IF;
    
    -- Check challenger balance
    SELECT balance INTO v_challenger_balance 
    FROM user_wallets 
    WHERE user_id = p_challenger_id;
    
    IF v_challenger_balance IS NULL THEN
        RAISE EXCEPTION 'Challenger wallet not found';
    END IF;
    
    IF v_challenger_balance < v_wager_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Required: %, Available: %', v_wager_amount, v_challenger_balance;
    END IF;
    
    -- Deduct wager amount from challenger's balance
    UPDATE user_wallets 
    SET balance = balance - v_wager_amount,
        updated_at = now()
    WHERE user_id = p_challenger_id;
    
    -- Update match with challenger
    UPDATE wager_matches 
    SET challenger_id = p_challenger_id,
        status = 'active',
        started_at = now()
    WHERE id = p_match_id;
    
    -- Record transaction
    INSERT INTO transactions (user_id, amount, transaction_type, description, reference_id)
    VALUES (p_challenger_id, -v_wager_amount, 'wager_stake', 'Wager match stake', p_match_id);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to complete wager match
CREATE OR REPLACE FUNCTION complete_wager_match(
    p_match_id uuid,
    p_winner_id uuid
) RETURNS boolean AS $$
DECLARE
    v_wager_amount numeric;
    v_creator_id uuid;
    v_challenger_id uuid;
    v_winner_payout numeric;
    v_loser_payout numeric;
    v_loser_id uuid;
BEGIN
    -- Get match details
    SELECT wager_amount, creator_id, challenger_id 
    INTO v_wager_amount, v_creator_id, v_challenger_id
    FROM wager_matches 
    WHERE id = p_match_id AND status = 'active';
    
    IF v_wager_amount IS NULL THEN
        RAISE EXCEPTION 'Active wager match not found';
    END IF;
    
    -- Validate winner
    IF p_winner_id != v_creator_id AND p_winner_id != v_challenger_id THEN
        RAISE EXCEPTION 'Invalid winner ID';
    END IF;
    
    -- Calculate payouts (winner gets 75%, loser gets 25%)
    v_winner_payout := (v_wager_amount * 2) * 0.75;
    v_loser_payout := (v_wager_amount * 2) * 0.25;
    v_loser_id := CASE WHEN p_winner_id = v_creator_id THEN v_challenger_id ELSE v_creator_id END;
    
    -- Pay winner
    UPDATE user_wallets 
    SET balance = balance + v_winner_payout,
        updated_at = now()
    WHERE user_id = p_winner_id;
    
    -- Pay loser
    UPDATE user_wallets 
    SET balance = balance + v_loser_payout,
        updated_at = now()
    WHERE user_id = v_loser_id;
    
    -- Update match status
    UPDATE wager_matches 
    SET status = 'completed',
        winner_id = p_winner_id,
        completed_at = now()
    WHERE id = p_match_id;
    
    -- Record transactions
    INSERT INTO transactions (user_id, amount, transaction_type, description, reference_id)
    VALUES 
        (p_winner_id, v_winner_payout, 'wager_win', 'Wager match winnings', p_match_id),
        (v_loser_id, v_loser_payout, 'wager_loss', 'Wager match consolation', p_match_id);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create function to cancel wager match
CREATE OR REPLACE FUNCTION cancel_wager_match(
    p_match_id uuid
) RETURNS boolean AS $$
DECLARE
    v_wager_amount numeric;
    v_creator_id uuid;
    v_challenger_id uuid;
    v_status text;
BEGIN
    -- Get match details
    SELECT wager_amount, creator_id, challenger_id, status
    INTO v_wager_amount, v_creator_id, v_challenger_id, v_status
    FROM wager_matches 
    WHERE id = p_match_id;
    
    IF v_wager_amount IS NULL THEN
        RAISE EXCEPTION 'Wager match not found';
    END IF;
    
    IF v_status = 'completed' OR v_status = 'cancelled' THEN
        RAISE EXCEPTION 'Cannot cancel completed or already cancelled match';
    END IF;
    
    -- Refund creator
    UPDATE user_wallets 
    SET balance = balance + v_wager_amount,
        updated_at = now()
    WHERE user_id = v_creator_id;
    
    -- Refund challenger if they joined
    IF v_challenger_id IS NOT NULL THEN
        UPDATE user_wallets 
        SET balance = balance + v_wager_amount,
            updated_at = now()
        WHERE user_id = v_challenger_id;
        
        -- Record challenger refund transaction
        INSERT INTO transactions (user_id, amount, transaction_type, description, reference_id)
        VALUES (v_challenger_id, v_wager_amount, 'wager_refund', 'Wager match cancelled - refund', p_match_id);
    END IF;
    
    -- Update match status
    UPDATE wager_matches 
    SET status = 'cancelled'
    WHERE id = p_match_id;
    
    -- Record creator refund transaction
    INSERT INTO transactions (user_id, amount, transaction_type, description, reference_id)
    VALUES (v_creator_id, v_wager_amount, 'wager_refund', 'Wager match cancelled - refund', p_match_id);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wager_matches_creator_id ON wager_matches(creator_id);
CREATE INDEX IF NOT EXISTS idx_wager_matches_challenger_id ON wager_matches(challenger_id);
CREATE INDEX IF NOT EXISTS idx_wager_matches_status ON wager_matches(status);
CREATE INDEX IF NOT EXISTS idx_wager_matches_created_at ON wager_matches(created_at);
