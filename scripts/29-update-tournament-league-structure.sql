-- Update tournaments and leagues to support team vs solo play with duration settings

-- Add duration and play type columns to tournaments
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS play_type VARCHAR(20) DEFAULT 'team' CHECK (play_type IN ('team', 'solo')),
ADD COLUMN IF NOT EXISTS max_duration_days INTEGER DEFAULT 3;

-- Add duration and play type columns to leagues  
ALTER TABLE leagues
ADD COLUMN IF NOT EXISTS duration_days INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS play_type VARCHAR(20) DEFAULT 'team' CHECK (play_type IN ('team', 'solo')),
ADD COLUMN IF NOT EXISTS max_duration_days INTEGER DEFAULT 90;

-- Update captain drafts to remove entry fees and set $50 reward
ALTER TABLE captain_drafts 
ALTER COLUMN entry_fee SET DEFAULT 0,
ADD COLUMN IF NOT EXISTS game_reward INTEGER DEFAULT 50;

-- Create function to award $50 per game played
CREATE OR REPLACE FUNCTION award_game_participation(user_id UUID, draft_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Award $50 for participating in the game
  INSERT INTO wallet_transactions (user_id, amount, transaction_type, description)
  VALUES (user_id, 50, 'game_participation', 'ELO match participation reward');
  
  -- Update user balance
  UPDATE users 
  SET balance = balance + 50
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournaments_play_type ON tournaments(play_type);
CREATE INDEX IF NOT EXISTS idx_tournaments_duration ON tournaments(duration_days);
CREATE INDEX IF NOT EXISTS idx_leagues_play_type ON leagues(play_type);
CREATE INDEX IF NOT EXISTS idx_leagues_duration ON leagues(duration_days);

-- Update existing records to have proper defaults
UPDATE tournaments SET duration_days = 3 WHERE duration_days IS NULL;
UPDATE tournaments SET play_type = 'team' WHERE play_type IS NULL;
UPDATE leagues SET duration_days = 30 WHERE duration_days IS NULL;
UPDATE leagues SET play_type = 'team' WHERE play_type IS NULL;
UPDATE captain_drafts SET entry_fee = 0, game_reward = 50 WHERE entry_fee > 0;
