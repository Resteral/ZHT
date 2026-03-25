-- Create tables for manual league scheduling system

-- League games table for manually scheduled games
CREATE TABLE IF NOT EXISTS league_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team1_id UUID NOT NULL,
  team2_id UUID NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  game_type VARCHAR(20) NOT NULL CHECK (game_type IN ('regular', 'playoff_semi', 'playoff_final')),
  status VARCHAR(20) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed')),
  team1_score INTEGER DEFAULT 0,
  team2_score INTEGER DEFAULT 0,
  series_info JSONB, -- For playoff series tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- League standings table
CREATE TABLE IF NOT EXISTS league_standings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL,
  team_name VARCHAR(255) NOT NULL,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, team_id)
);

-- Function to update team records
CREATE OR REPLACE FUNCTION update_team_record(
  team_id UUID,
  is_win BOOLEAN,
  points_earned INTEGER
) RETURNS VOID AS $$
BEGIN
  INSERT INTO league_standings (team_id, wins, losses, points, games_played)
  VALUES (
    team_id,
    CASE WHEN is_win THEN 1 ELSE 0 END,
    CASE WHEN is_win THEN 0 ELSE 1 END,
    points_earned,
    1
  )
  ON CONFLICT (league_id, team_id)
  DO UPDATE SET
    wins = league_standings.wins + CASE WHEN is_win THEN 1 ELSE 0 END,
    losses = league_standings.losses + CASE WHEN is_win THEN 0 ELSE 1 END,
    points = league_standings.points + points_earned,
    games_played = league_standings.games_played + 1,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_league_games_league_id ON league_games(league_id);
CREATE INDEX IF NOT EXISTS idx_league_games_scheduled_date ON league_games(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_league_games_status ON league_games(status);
CREATE INDEX IF NOT EXISTS idx_league_standings_league_id ON league_standings(league_id);
CREATE INDEX IF NOT EXISTS idx_league_standings_points ON league_standings(points DESC);
