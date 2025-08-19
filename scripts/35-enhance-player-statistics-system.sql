-- Enhanced Player Statistics and Match History System
-- Comprehensive tracking of player performance, achievements, and detailed statistics

-- Enhanced user profiles with detailed statistics
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS favorite_game VARCHAR(100) DEFAULT 'omega_strikers';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS favorite_race VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_matches_played INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_wins INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_losses INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS longest_win_streak INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(12,2) DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tournaments_won INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tournaments_participated INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS average_match_duration INTEGER DEFAULT 0; -- in minutes
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS profile_visibility VARCHAR(20) DEFAULT 'public'; -- public, friends, private
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS match_history_visibility VARCHAR(20) DEFAULT 'public';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS show_online_status BOOLEAN DEFAULT true;

-- Detailed match history table
CREATE TABLE IF NOT EXISTS match_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES auth.users(id) NOT NULL,
  opponent_id UUID REFERENCES auth.users(id),
  game VARCHAR(100) NOT NULL,
  match_type VARCHAR(50) NOT NULL, -- tournament, league, casual, ranked
  tournament_id UUID REFERENCES tournaments(id),
  league_id UUID REFERENCES auction_leagues(id),
  result VARCHAR(10) NOT NULL, -- win, loss, draw
  player_score INTEGER DEFAULT 0,
  opponent_score INTEGER DEFAULT 0,
  elo_before INTEGER NOT NULL,
  elo_after INTEGER NOT NULL,
  elo_change INTEGER NOT NULL,
  match_duration INTEGER, -- in minutes
  match_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  season VARCHAR(50),
  metadata JSONB DEFAULT '{}', -- Additional match data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player achievements system
CREATE TABLE IF NOT EXISTS player_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  achievement_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(100),
  rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, epic, legendary, mythic
  category VARCHAR(50), -- gameplay, social, progression, special
  points INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  progress INTEGER DEFAULT 100, -- percentage completed
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_id)
);

-- Player statistics by game
CREATE TABLE IF NOT EXISTS player_game_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  game VARCHAR(100) NOT NULL,
  matches_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  win_rate DECIMAL(5,2) DEFAULT 0,
  current_elo INTEGER DEFAULT 1200,
  peak_elo INTEGER DEFAULT 1200,
  lowest_elo INTEGER DEFAULT 1200,
  current_streak INTEGER DEFAULT 0,
  longest_win_streak INTEGER DEFAULT 0,
  longest_loss_streak INTEGER DEFAULT 0,
  total_playtime INTEGER DEFAULT 0, -- in minutes
  average_match_duration INTEGER DEFAULT 0,
  tournaments_won INTEGER DEFAULT 0,
  tournaments_participated INTEGER DEFAULT 0,
  earnings DECIMAL(12,2) DEFAULT 0,
  last_played TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, game)
);

-- Player performance trends
CREATE TABLE IF NOT EXISTS player_performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  game VARCHAR(100) NOT NULL,
  date DATE NOT NULL,
  elo_rating INTEGER NOT NULL,
  matches_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  earnings DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, game, date)
);

-- Player social features
CREATE TABLE IF NOT EXISTS player_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES auth.users(id) NOT NULL,
  following_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS player_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID REFERENCES auth.users(id) NOT NULL,
  challenged_id UUID REFERENCES auth.users(id) NOT NULL,
  game VARCHAR(100) NOT NULL,
  wager_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, declined, completed, cancelled
  message TEXT,
  match_id UUID REFERENCES match_history(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Function to update player statistics after a match
CREATE OR REPLACE FUNCTION update_player_stats_after_match(
  player_id_param UUID,
  opponent_id_param UUID,
  game_param VARCHAR(100),
  result_param VARCHAR(10),
  elo_change_param INTEGER,
  new_elo INTEGER,
  match_duration_param INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Update overall user profile stats
  UPDATE user_profiles 
  SET 
    total_matches_played = total_matches_played + 1,
    total_wins = CASE WHEN result_param = 'win' THEN total_wins + 1 ELSE total_wins END,
    total_losses = CASE WHEN result_param = 'loss' THEN total_losses + 1 ELSE total_losses END,
    win_rate = CASE 
      WHEN total_matches_played + 1 > 0 THEN 
        ROUND(((CASE WHEN result_param = 'win' THEN total_wins + 1 ELSE total_wins END)::DECIMAL / (total_matches_played + 1)) * 100, 2)
      ELSE 0 
    END,
    current_streak = CASE 
      WHEN result_param = 'win' AND current_streak >= 0 THEN current_streak + 1
      WHEN result_param = 'win' AND current_streak < 0 THEN 1
      WHEN result_param = 'loss' AND current_streak <= 0 THEN current_streak - 1
      WHEN result_param = 'loss' AND current_streak > 0 THEN -1
      ELSE current_streak
    END,
    longest_win_streak = CASE 
      WHEN result_param = 'win' AND (current_streak + 1) > longest_win_streak THEN current_streak + 1
      ELSE longest_win_streak
    END,
    elo_rating = new_elo,
    updated_at = NOW()
  WHERE user_id = player_id_param;

  -- Update or insert game-specific stats
  INSERT INTO player_game_stats (
    user_id, game, matches_played, wins, losses, win_rate, current_elo, 
    peak_elo, current_streak, longest_win_streak, total_playtime, last_played
  ) VALUES (
    player_id_param, game_param, 1, 
    CASE WHEN result_param = 'win' THEN 1 ELSE 0 END,
    CASE WHEN result_param = 'loss' THEN 1 ELSE 0 END,
    CASE WHEN result_param = 'win' THEN 100.0 ELSE 0.0 END,
    new_elo, new_elo, 
    CASE WHEN result_param = 'win' THEN 1 WHEN result_param = 'loss' THEN -1 ELSE 0 END,
    CASE WHEN result_param = 'win' THEN 1 ELSE 0 END,
    COALESCE(match_duration_param, 0), NOW()
  )
  ON CONFLICT (user_id, game) DO UPDATE SET
    matches_played = player_game_stats.matches_played + 1,
    wins = CASE WHEN result_param = 'win' THEN player_game_stats.wins + 1 ELSE player_game_stats.wins END,
    losses = CASE WHEN result_param = 'loss' THEN player_game_stats.losses + 1 ELSE player_game_stats.losses END,
    win_rate = ROUND(((CASE WHEN result_param = 'win' THEN player_game_stats.wins + 1 ELSE player_game_stats.wins END)::DECIMAL / (player_game_stats.matches_played + 1)) * 100, 2),
    current_elo = new_elo,
    peak_elo = GREATEST(player_game_stats.peak_elo, new_elo),
    lowest_elo = LEAST(player_game_stats.lowest_elo, new_elo),
    current_streak = CASE 
      WHEN result_param = 'win' AND player_game_stats.current_streak >= 0 THEN player_game_stats.current_streak + 1
      WHEN result_param = 'win' AND player_game_stats.current_streak < 0 THEN 1
      WHEN result_param = 'loss' AND player_game_stats.current_streak <= 0 THEN player_game_stats.current_streak - 1
      WHEN result_param = 'loss' AND player_game_stats.current_streak > 0 THEN -1
      ELSE player_game_stats.current_streak
    END,
    longest_win_streak = CASE 
      WHEN result_param = 'win' AND (player_game_stats.current_streak + 1) > player_game_stats.longest_win_streak 
      THEN player_game_stats.current_streak + 1
      ELSE player_game_stats.longest_win_streak
    END,
    total_playtime = player_game_stats.total_playtime + COALESCE(match_duration_param, 0),
    last_played = NOW(),
    updated_at = NOW();

  -- Record daily performance
  INSERT INTO player_performance_history (user_id, game, date, elo_rating, matches_played, wins, losses)
  VALUES (
    player_id_param, game_param, CURRENT_DATE, new_elo, 1,
    CASE WHEN result_param = 'win' THEN 1 ELSE 0 END,
    CASE WHEN result_param = 'loss' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, game, date) DO UPDATE SET
    elo_rating = new_elo,
    matches_played = player_performance_history.matches_played + 1,
    wins = player_performance_history.wins + CASE WHEN result_param = 'win' THEN 1 ELSE 0 END,
    losses = player_performance_history.losses + CASE WHEN result_param = 'loss' THEN 1 ELSE 0 END;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_and_award_achievements(user_id_param UUID)
RETURNS void AS $$
DECLARE
  user_stats RECORD;
  game_stats RECORD;
BEGIN
  -- Get user overall stats
  SELECT * INTO user_stats FROM user_profiles WHERE user_id = user_id_param;
  
  -- First Victory Achievement
  IF user_stats.total_wins = 1 THEN
    INSERT INTO player_achievements (user_id, achievement_id, title, description, icon, rarity, category)
    VALUES (user_id_param, 'first_victory', 'First Victory', 'Win your first match', 'trophy', 'common', 'gameplay')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  
  -- Winning Streak Achievements
  IF user_stats.current_streak = 5 THEN
    INSERT INTO player_achievements (user_id, achievement_id, title, description, icon, rarity, category)
    VALUES (user_id_param, 'win_streak_5', 'Winning Streak', 'Win 5 matches in a row', 'star', 'uncommon', 'gameplay')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  
  IF user_stats.current_streak = 10 THEN
    INSERT INTO player_achievements (user_id, achievement_id, title, description, icon, rarity, category)
    VALUES (user_id_param, 'win_streak_10', 'Unstoppable', 'Win 10 matches in a row', 'zap', 'rare', 'gameplay')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  
  -- ELO Milestone Achievements
  IF user_stats.elo_rating >= 1500 THEN
    INSERT INTO player_achievements (user_id, achievement_id, title, description, icon, rarity, category)
    VALUES (user_id_param, 'silver_rank', 'Silver Rank', 'Reach 1500 ELO rating', 'shield', 'uncommon', 'progression')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  
  IF user_stats.elo_rating >= 1800 THEN
    INSERT INTO player_achievements (user_id, achievement_id, title, description, icon, rarity, category)
    VALUES (user_id_param, 'diamond_rank', 'Diamond Rank', 'Reach 1800 ELO rating', 'crown', 'epic', 'progression')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  
  -- Tournament Achievements
  IF user_stats.tournaments_won = 1 THEN
    INSERT INTO player_achievements (user_id, achievement_id, title, description, icon, rarity, category)
    VALUES (user_id_param, 'tournament_champion', 'Tournament Champion', 'Win your first tournament', 'trophy', 'rare', 'gameplay')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
  
  -- Earnings Achievements
  IF user_stats.total_earnings >= 1000 THEN
    INSERT INTO player_achievements (user_id, achievement_id, title, description, icon, rarity, category)
    VALUES (user_id_param, 'high_roller', 'High Roller', 'Earn $1000 total', 'target', 'epic', 'progression')
    ON CONFLICT (user_id, achievement_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_history_player ON match_history(player_id);
CREATE INDEX IF NOT EXISTS idx_match_history_opponent ON match_history(opponent_id);
CREATE INDEX IF NOT EXISTS idx_match_history_date ON match_history(match_date);
CREATE INDEX IF NOT EXISTS idx_match_history_game ON match_history(game);
CREATE INDEX IF NOT EXISTS idx_player_achievements_user ON player_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_player_game_stats_user ON player_game_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_player_game_stats_game ON player_game_stats(game);
CREATE INDEX IF NOT EXISTS idx_player_performance_user_game ON player_performance_history(user_id, game);
CREATE INDEX IF NOT EXISTS idx_player_follows_follower ON player_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_player_follows_following ON player_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_player_challenges_challenger ON player_challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_player_challenges_challenged ON player_challenges(challenged_id);
