-- Tournament Trophy and Achievement Tracking System
-- Ensures all tournament participants are properly tracked for trophies and achievements

-- Enhanced tournament results tracking
CREATE TABLE IF NOT EXISTS tournament_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  participant_id UUID REFERENCES tournament_participants(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  final_position INTEGER NOT NULL,
  prize_amount DECIMAL(12,2) DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  tournament_name VARCHAR(255) NOT NULL,
  tournament_type VARCHAR(100) NOT NULL,
  game VARCHAR(100) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tournament_id, user_id)
);

-- Tournament achievements table
CREATE TABLE IF NOT EXISTS tournament_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  achievement_type VARCHAR(100) NOT NULL, -- first_tournament, tournament_winner, tournament_finalist, etc.
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  tournament_name VARCHAR(255),
  achievement_title VARCHAR(255) NOT NULL,
  achievement_description TEXT NOT NULL,
  icon VARCHAR(100) DEFAULT 'trophy',
  rarity VARCHAR(20) DEFAULT 'common', -- common, uncommon, rare, epic, legendary
  points INTEGER DEFAULT 0,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_type, tournament_id)
);

-- Function to record tournament results and award achievements
CREATE OR REPLACE FUNCTION record_tournament_completion(
  tournament_id_param UUID
)
RETURNS void AS $$
DECLARE
  tournament_record RECORD;
  participant_record RECORD;
  position INTEGER := 1;
BEGIN
  -- Get tournament details
  SELECT * INTO tournament_record FROM tournaments WHERE id = tournament_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tournament not found';
  END IF;
  
  -- Record results for all participants (ordered by performance/ELO for now)
  FOR participant_record IN
    SELECT 
      tp.*,
      u.username,
      u.elo_rating,
      COALESCE(tm.matches_won, 0) as matches_won,
      COALESCE(tm.matches_played, 0) as matches_played
    FROM tournament_participants tp
    JOIN users u ON tp.user_id = u.id
    LEFT JOIN (
      SELECT 
        tp2.user_id,
        COUNT(*) as matches_played,
        COUNT(CASE WHEN tm.winner_captain_id = tp2.user_id THEN 1 END) as matches_won
      FROM tournament_participants tp2
      LEFT JOIN tournament_matches tm ON (tm.team1_captain_id = tp2.user_id OR tm.team2_captain_id = tp2.user_id)
      WHERE tp2.tournament_id = tournament_id_param
      GROUP BY tp2.user_id
    ) tm ON tm.user_id = tp.user_id
    WHERE tp.tournament_id = tournament_id_param
    ORDER BY 
      COALESCE(tm.matches_won, 0) DESC,
      u.elo_rating DESC
  LOOP
    -- Record tournament result
    INSERT INTO tournament_results (
      tournament_id,
      participant_id,
      user_id,
      final_position,
      matches_played,
      matches_won,
      tournament_name,
      tournament_type,
      game
    ) VALUES (
      tournament_id_param,
      participant_record.id,
      participant_record.user_id,
      position,
      participant_record.matches_played,
      participant_record.matches_won,
      tournament_record.name,
      tournament_record.tournament_type,
      tournament_record.game
    ) ON CONFLICT (tournament_id, user_id) DO UPDATE SET
      final_position = EXCLUDED.final_position,
      matches_played = EXCLUDED.matches_played,
      matches_won = EXCLUDED.matches_won;
    
    -- Award achievements based on position
    PERFORM award_tournament_achievements(
      participant_record.user_id,
      tournament_id_param,
      tournament_record.name,
      position
    );
    
    -- Update user profile statistics
    UPDATE users SET
      total_games = total_games + participant_record.matches_played,
      wins = wins + participant_record.matches_won,
      losses = losses + (participant_record.matches_played - participant_record.matches_won)
    WHERE id = participant_record.user_id;
    
    position := position + 1;
  END LOOP;
  
  -- Mark tournament as completed
  UPDATE tournaments 
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE id = tournament_id_param;
  
END;
$$ LANGUAGE plpgsql;

-- Function to award tournament achievements
CREATE OR REPLACE FUNCTION award_tournament_achievements(
  user_id_param UUID,
  tournament_id_param UUID,
  tournament_name_param VARCHAR(255),
  final_position_param INTEGER
)
RETURNS void AS $$
DECLARE
  user_tournament_count INTEGER;
  user_wins_count INTEGER;
BEGIN
  -- First tournament participation
  SELECT COUNT(*) INTO user_tournament_count
  FROM tournament_results
  WHERE user_id = user_id_param;
  
  IF user_tournament_count = 1 THEN
    INSERT INTO tournament_achievements (
      user_id, achievement_type, tournament_id, tournament_name,
      achievement_title, achievement_description, icon, rarity, points
    ) VALUES (
      user_id_param, 'first_tournament', tournament_id_param, tournament_name_param,
      'Tournament Debut', 'Participated in your first tournament', 'trophy', 'common', 10
    ) ON CONFLICT (user_id, achievement_type, tournament_id) DO NOTHING;
  END IF;
  
  -- Tournament winner (1st place)
  IF final_position_param = 1 THEN
    INSERT INTO tournament_achievements (
      user_id, achievement_type, tournament_id, tournament_name,
      achievement_title, achievement_description, icon, rarity, points
    ) VALUES (
      user_id_param, 'tournament_winner', tournament_id_param, tournament_name_param,
      'Tournament Champion', 'Won a tournament', 'crown', 'rare', 50
    ) ON CONFLICT (user_id, achievement_type, tournament_id) DO NOTHING;
    
    -- Check for multiple wins
    SELECT COUNT(*) INTO user_wins_count
    FROM tournament_results
    WHERE user_id = user_id_param AND final_position = 1;
    
    IF user_wins_count = 5 THEN
      INSERT INTO tournament_achievements (
        user_id, achievement_type, tournament_name,
        achievement_title, achievement_description, icon, rarity, points
      ) VALUES (
        user_id_param, 'tournament_veteran', tournament_name_param,
        'Tournament Veteran', 'Won 5 tournaments', 'medal', 'epic', 100
      ) ON CONFLICT (user_id, achievement_type, tournament_id) DO NOTHING;
    END IF;
    
    IF user_wins_count = 10 THEN
      INSERT INTO tournament_achievements (
        user_id, achievement_type, tournament_name,
        achievement_title, achievement_description, icon, rarity, points
      ) VALUES (
        user_id_param, 'tournament_legend', tournament_name_param,
        'Tournament Legend', 'Won 10 tournaments', 'star', 'legendary', 200
      ) ON CONFLICT (user_id, achievement_type, tournament_id) DO NOTHING;
    END IF;
  END IF;
  
  -- Tournament finalist (2nd place)
  IF final_position_param = 2 THEN
    INSERT INTO tournament_achievements (
      user_id, achievement_type, tournament_id, tournament_name,
      achievement_title, achievement_description, icon, rarity, points
    ) VALUES (
      user_id_param, 'tournament_finalist', tournament_id_param, tournament_name_param,
      'Tournament Finalist', 'Reached the finals of a tournament', 'target', 'uncommon', 25
    ) ON CONFLICT (user_id, achievement_type, tournament_id) DO NOTHING;
  END IF;
  
  -- Top 3 finish
  IF final_position_param <= 3 THEN
    INSERT INTO tournament_achievements (
      user_id, achievement_type, tournament_id, tournament_name,
      achievement_title, achievement_description, icon, rarity, points
    ) VALUES (
      user_id_param, 'tournament_podium', tournament_id_param, tournament_name_param,
      'Podium Finish', 'Finished in the top 3 of a tournament', 'award', 'uncommon', 20
    ) ON CONFLICT (user_id, achievement_type, tournament_id) DO NOTHING;
  END IF;
  
END;
$$ LANGUAGE plpgsql;

-- Function to get user tournament trophies
CREATE OR REPLACE FUNCTION get_user_tournament_trophies(user_id_param UUID)
RETURNS TABLE (
  achievement_id UUID,
  achievement_title VARCHAR(255),
  achievement_description TEXT,
  icon VARCHAR(100),
  rarity VARCHAR(20),
  points INTEGER,
  tournament_name VARCHAR(255),
  unlocked_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ta.id,
    ta.achievement_title,
    ta.achievement_description,
    ta.icon,
    ta.rarity,
    ta.points,
    ta.tournament_name,
    ta.unlocked_at
  FROM tournament_achievements ta
  WHERE ta.user_id = user_id_param
  ORDER BY ta.unlocked_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get user tournament statistics
CREATE OR REPLACE FUNCTION get_user_tournament_stats(user_id_param UUID)
RETURNS TABLE (
  tournaments_participated INTEGER,
  tournaments_won INTEGER,
  tournaments_top3 INTEGER,
  total_matches_played INTEGER,
  total_matches_won INTEGER,
  win_rate DECIMAL(5,2),
  total_achievement_points INTEGER,
  best_finish INTEGER,
  recent_tournaments JSONB
) AS $$
DECLARE
  stats RECORD;
BEGIN
  SELECT 
    COUNT(*) as participated,
    COUNT(CASE WHEN final_position = 1 THEN 1 END) as won,
    COUNT(CASE WHEN final_position <= 3 THEN 1 END) as top3,
    SUM(matches_played) as total_matches,
    SUM(matches_won) as total_wins,
    CASE 
      WHEN SUM(matches_played) > 0 THEN 
        ROUND((SUM(matches_won)::DECIMAL / SUM(matches_played)) * 100, 2)
      ELSE 0 
    END as win_percentage,
    MIN(final_position) as best_position
  INTO stats
  FROM tournament_results
  WHERE user_id = user_id_param;
  
  RETURN QUERY
  SELECT 
    COALESCE(stats.participated, 0)::INTEGER,
    COALESCE(stats.won, 0)::INTEGER,
    COALESCE(stats.top3, 0)::INTEGER,
    COALESCE(stats.total_matches, 0)::INTEGER,
    COALESCE(stats.total_wins, 0)::INTEGER,
    COALESCE(stats.win_percentage, 0.00),
    COALESCE((SELECT SUM(points) FROM tournament_achievements WHERE user_id = user_id_param), 0)::INTEGER,
    COALESCE(stats.best_position, 999)::INTEGER,
    (
      SELECT COALESCE(json_agg(
        json_build_object(
          'tournament_name', tournament_name,
          'final_position', final_position,
          'completed_at', completed_at
        ) ORDER BY completed_at DESC
      ), '[]'::json)::jsonb
      FROM tournament_results 
      WHERE user_id = user_id_param 
      LIMIT 5
    );
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_results_user ON tournament_results(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_tournament ON tournament_results(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_results_position ON tournament_results(final_position);
CREATE INDEX IF NOT EXISTS idx_tournament_achievements_user ON tournament_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_achievements_type ON tournament_achievements(achievement_type);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON tournament_results TO authenticated;
GRANT SELECT, INSERT, UPDATE ON tournament_achievements TO authenticated;
GRANT EXECUTE ON FUNCTION record_tournament_completion TO authenticated;
GRANT EXECUTE ON FUNCTION award_tournament_achievements TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tournament_trophies TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_tournament_stats TO authenticated;
