-- Add tournament participation reward tracking
CREATE OR REPLACE FUNCTION update_user_balance(user_id UUID, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  -- Update user balance
  UPDATE user_profiles 
  SET wallet_balance = COALESCE(wallet_balance, 0) + amount,
      updated_at = NOW()
  WHERE user_id = update_user_balance.user_id;
  
  -- If user doesn't exist, this won't fail but won't update anything
  IF NOT FOUND THEN
    RAISE NOTICE 'User profile not found for user_id: %', user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add index for wallet transactions reference_id
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference_id);

-- Add tournament participation transaction type
ALTER TABLE wallet_transactions 
ADD CONSTRAINT check_transaction_type 
CHECK (transaction_type IN ('game_reward', 'tournament_participation', 'battle_winnings', 'purchase', 'refund', 'admin_adjustment'));
