-- Update default user settings to $25 starting balance, 1200 ELO, and $5 game payment

-- Update default starting balance to $25 and ELO to 1200
ALTER TABLE users 
ALTER COLUMN balance SET DEFAULT 25.00,
ALTER COLUMN elo_rating SET DEFAULT 1200;

-- Update existing users who have default values
UPDATE users 
SET balance = 25.00 
WHERE balance IS NULL OR balance = 0;

UPDATE users 
SET elo_rating = 1200 
WHERE elo_rating IS NULL OR elo_rating = 1500;

-- Update game participation reward to $5 instead of $50
UPDATE captain_drafts 
SET game_reward = 5 
WHERE game_reward = 50 OR game_reward IS NULL;

-- Create function to award $5 per game played (updated from $50)
CREATE OR REPLACE FUNCTION award_game_participation(user_id UUID, draft_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Award $5 for participating in the game
  INSERT INTO wallet_transactions (user_id, amount, transaction_type, description)
  VALUES (user_id, 5, 'game_participation', 'ELO match participation reward');
  
  -- Update user balance
  UPDATE users 
  SET balance = balance + 5
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Update tournament participation rewards to be consistent
UPDATE tournaments 
SET entry_fee = 0 
WHERE entry_fee IS NULL;

-- Update user wallet default starting balance
ALTER TABLE user_wallets 
ALTER COLUMN balance SET DEFAULT 25.00;

-- Update existing user wallets
UPDATE user_wallets 
SET balance = 25.00,
    total_deposited = 25.00
WHERE balance = 0 OR balance IS NULL;

-- Create index for better performance on balance queries
CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance);
CREATE INDEX IF NOT EXISTS idx_users_elo_rating ON users(elo_rating DESC);
