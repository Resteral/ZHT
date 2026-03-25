-- Add premade teams league type and 1v1 battle system
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS league_mode VARCHAR(50) DEFAULT 'standard';
-- league_mode options: 'standard', 'premade_teams', '1v1_battles'

-- Create premade teams table
CREATE TABLE IF NOT EXISTS premade_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  game VARCHAR(100) NOT NULL,
  players JSONB NOT NULL, -- Array of player objects with stats
  overall_rating INTEGER DEFAULT 0,
  price DECIMAL(10,2) DEFAULT 0,
  available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create 1v1 battles table
CREATE TABLE IF NOT EXISTS team_battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  team1_id UUID NOT NULL,
  team2_id UUID NOT NULL,
  team1_owner UUID REFERENCES auth.users(id),
  team2_owner UUID REFERENCES auth.users(id),
  pot_amount DECIMAL(10,2) NOT NULL,
  winner_id UUID,
  winner_payout DECIMAL(10,2), -- 75% of pot
  platform_fee DECIMAL(10,2), -- 25% of pot
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  battle_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample premade teams
INSERT INTO premade_teams (name, description, game, players, overall_rating, price) VALUES
('Elite Strikers', 'Professional-level team with top scorers', 'zealot_hockey', 
 '[{"name":"Alex Thunder","position":"Forward","rating":95},{"name":"Mike Blaze","position":"Defense","rating":92},{"name":"Sam Ice","position":"Goalie","rating":94}]', 
 94, 150.00),
('Speed Demons', 'Fast-paced aggressive team', 'call_of_duty', 
 '[{"name":"Rapid Fire","position":"Assault","rating":91},{"name":"Ghost Walker","position":"Sniper","rating":93},{"name":"Shield Master","position":"Support","rating":89}]', 
 91, 120.00),
('Tactical Force', 'Strategic team with excellent coordination', 'rainbow_six_siege', 
 '[{"name":"Breach King","position":"Breacher","rating":90},{"name":"Watch Tower","position":"Intel","rating":92},{"name":"Iron Wall","position":"Anchor","rating":88}]', 
 90, 110.00);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_premade_teams_game ON premade_teams(game);
CREATE INDEX IF NOT EXISTS idx_team_battles_league ON team_battles(league_id);
CREATE INDEX IF NOT EXISTS idx_team_battles_status ON team_battles(status);
