-- Force update wager match functions to use correct user_wallets table
-- This ensures the functions are properly updated even if previous script wasn't executed

-- Drop all existing wager match functions
DROP FUNCTION IF EXISTS create_wager_match(uuid, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS join_wager_match(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS complete_wager_match(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS cancel_wager_match(uuid) CASCADE;

-- Recreate create_wager_match function with correct table reference
CREATE OR REPLACE FUNCTION create_wager_match(
    p_creator_id uuid,
    p_wager_amount numeric,
    p_game text
) RETURNS uuid AS $$
DECLARE
    v_match_id uuid;
    v_user_balance numeric;
BEGIN
    -- Using user_wallets table instead of wallets
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
    INSERT INTO financial_transactions (user_id, amount, transaction_type, description, reference_id)
    VALUES (p_creator_id, -p_wager_amount, 'wager_stake', 'Wager match stake', v_match_id);
    
    RETURN v_match_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_wager_match(uuid, numeric, text) TO authenticated;
