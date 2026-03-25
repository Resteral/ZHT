-- Adding team-based tournament enhancements and automatic scheduling
-- Enhanced tournament system for team-based competitions

-- Add team support to tournaments
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_team_based BOOLEAN DEFAULT false;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS game VARCHAR(100) DEFAULT 'omega_strikers';
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS duration_hours INTEGER DEFAULT 72; -- 3 days default
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS auto_schedule BOOLEAN DEFAULT true;

-- Enhanced tournament participants for team support
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS registration_fee_paid BOOLEAN DEFAULT false;

-- Tournament scheduling table
CREATE TABLE IF NOT EXISTS tournament_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  match_id UUID REFERENCES tournament_brackets(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  venue VARCHAR(255),
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament results and statistics
CREATE TABLE IF NOT EXISTS tournament_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES tournament_participants(id),
  team_id UUID REFERENCES teams(id),
  final_position INTEGER NOT NULL,
  prize_amount DECIMAL(10,2) DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament notifications
CREATE TABLE IF NOT EXISTS tournament_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES tournament_participants(id),
  notification_type VARCHAR(100) NOT NULL, -- registration_confirmed, match_scheduled, tournament_started, etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to automatically schedule tournament matches
CREATE OR REPLACE FUNCTION schedule_tournament_matches(tournament_id_param UUID)
RETURNS void AS $$
DECLARE
  tournament_record RECORD;
  match_record RECORD;
  current_time TIMESTAMP WITH TIME ZONE;
  match_interval INTERVAL;
BEGIN
  -- Get tournament details
  SELECT * INTO tournament_record FROM tournaments WHERE id = tournament_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  
  -- Calculate match interval based on tournament duration
  match_interval := INTERVAL '1 hour' * (tournament_record.duration_hours / 10); -- Spread matches over tournament duration
  current_time := tournament_record.start_date;
  
  -- Schedule all matches
  FOR match_record IN 
    SELECT * FROM tournament_brackets 
    WHERE tournament_id = tournament_id_param 
    ORDER BY round_number, match_number
  LOOP
    INSERT INTO tournament_schedule (tournament_id, match_id, scheduled_time)
    VALUES (tournament_id_param, match_record.id, current_time);
    
    current_time := current_time + match_interval;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to distribute tournament prizes
CREATE OR REPLACE FUNCTION distribute_tournament_prizes(tournament_id_param UUID)
RETURNS void AS $$
DECLARE
  tournament_record RECORD;
  participant_record RECORD;
  prize_distribution DECIMAL[] := ARRAY[0.50, 0.30, 0.20]; -- 1st: 50%, 2nd: 30%, 3rd: 20%
  position INTEGER := 1;
BEGIN
  -- Get tournament details
  SELECT * INTO tournament_record FROM tournaments WHERE id = tournament_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  
  -- Distribute prizes to top 3 finishers
  FOR participant_record IN
    SELECT tp.*, tr.final_position
    FROM tournament_participants tp
    JOIN tournament_results tr ON tp.id = tr.participant_id
    WHERE tp.tournament_id = tournament_id_param
    ORDER BY tr.final_position
    LIMIT 3
  LOOP
    -- Calculate prize amount
    DECLARE
      prize_amount DECIMAL(10,2);
    BEGIN
      prize_amount := tournament_record.prize_pool * prize_distribution[position];
      
      -- Update tournament results
      UPDATE tournament_results 
      SET prize_amount = prize_amount
      WHERE participant_id = participant_record.id;
      
      -- Add to user wallet
      PERFORM update_user_balance(participant_record.user_id, prize_amount);
      
      -- Record transaction
      INSERT INTO wallet_transactions (user_id, amount, transaction_type, description, reference_id)
      VALUES (
        participant_record.user_id,
        prize_amount,
        'tournament_prize',
        'Tournament prize - Position ' || position || ' in ' || tournament_record.name,
        tournament_id_param
      );
      
      position := position + 1;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_schedule_tournament ON tournament_schedule(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_schedule_time ON tournament_schedule(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament ON tournament_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_position ON tournament_results(final_position);
CREATE INDEX IF NOT EXISTS idx_tournament_notifications_participant ON tournament_notifications(participant_id);
