-- Create database functions for money transactions
CREATE OR REPLACE FUNCTION send_money_transaction(
  sender_id UUID,
  recipient_id UUID,
  amount DECIMAL,
  description TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  sender_balance DECIMAL;
  transaction_id UUID;
  result JSON;
BEGIN
  -- Check if sender has sufficient balance
  SELECT balance INTO sender_balance
  FROM user_wallets
  WHERE user_id = sender_id;

  IF sender_balance IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Sender wallet not found');
  END IF;

  IF sender_balance < amount THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient balance');
  END IF;

  -- Start transaction
  BEGIN
    -- Deduct from sender
    UPDATE user_wallets
    SET balance = balance - amount,
        total_withdrawn = total_withdrawn + amount,
        updated_at = NOW()
    WHERE user_id = sender_id;

    -- Add to recipient (create wallet if doesn't exist)
    INSERT INTO user_wallets (user_id, balance, total_deposited, created_at, updated_at)
    VALUES (recipient_id, amount, amount, NOW(), NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
      balance = user_wallets.balance + amount,
      total_deposited = user_wallets.total_deposited + amount,
      updated_at = NOW();

    -- Create transaction records
    transaction_id := gen_random_uuid();

    -- Sender transaction (debit)
    INSERT INTO financial_transactions (
      id, user_id, amount, transaction_type, description, status, created_at, metadata
    ) VALUES (
      gen_random_uuid(),
      sender_id,
      -amount,
      'send',
      COALESCE(description, 'Money sent'),
      'completed',
      NOW(),
      json_build_object(
        'other_user', (
          SELECT json_build_object('username', username, 'display_name', display_name)
          FROM users WHERE id = recipient_id
        ),
        'transaction_pair_id', transaction_id
      )
    );

    -- Recipient transaction (credit)
    INSERT INTO financial_transactions (
      id, user_id, amount, transaction_type, description, status, created_at, metadata
    ) VALUES (
      gen_random_uuid(),
      recipient_id,
      amount,
      'receive',
      COALESCE(description, 'Money received'),
      'completed',
      NOW(),
      json_build_object(
        'other_user', (
          SELECT json_build_object('username', username, 'display_name', display_name)
          FROM users WHERE id = sender_id
        ),
        'transaction_pair_id', transaction_id
      )
    );

    result := json_build_object(
      'success', true,
      'transaction_id', transaction_id,
      'amount', amount
    );

    RETURN result;

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$;

-- Create function to get user wallet balance
CREATE OR REPLACE FUNCTION get_user_wallet_balance(user_uuid UUID)
RETURNS DECIMAL
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_balance DECIMAL;
BEGIN
  SELECT balance INTO user_balance
  FROM user_wallets
  WHERE user_id = user_uuid;

  RETURN COALESCE(user_balance, 0);
END;
$$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_created 
ON financial_transactions(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id 
ON user_wallets(user_id);

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION send_money_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_wallet_balance TO authenticated;
