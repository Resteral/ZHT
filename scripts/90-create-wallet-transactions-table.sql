-- Create wallet_transactions table if it doesn't exist to fix tournament prize distribution
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL, -- 'tournament_prize', 'tournament_entry', 'wager_win', etc.
    description TEXT,
    reference_id UUID, -- tournament_id, match_id, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);

-- Grant permissions to authenticated users
GRANT ALL ON wallet_transactions TO authenticated;
GRANT ALL ON wallet_transactions TO service_role;
