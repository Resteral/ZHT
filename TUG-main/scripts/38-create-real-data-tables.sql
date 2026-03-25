-- Create tables for real data instead of mock data
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  icon VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  location VARCHAR(200),
  capacity INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS betting_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id),
  home_team_id UUID,
  away_team_id UUID,
  home_team_name VARCHAR(100) NOT NULL,
  away_team_name VARCHAR(100) NOT NULL,
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  time_remaining VARCHAR(20),
  quarter VARCHAR(10),
  status VARCHAR(50) DEFAULT 'scheduled',
  volume INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS betting_odds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES betting_markets(id),
  bet_type VARCHAR(50) NOT NULL, -- 'moneyline', 'spread', 'total'
  home_odds VARCHAR(10),
  away_odds VARCHAR(10),
  home_spread VARCHAR(10),
  away_spread VARCHAR(10),
  over_total VARCHAR(10),
  under_total VARCHAR(10),
  over_odds VARCHAR(10),
  under_odds VARCHAR(10),
  trend VARCHAR(10) DEFAULT 'stable', -- 'up', 'down', 'stable'
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert real game data
INSERT INTO games (name, display_name, icon) VALUES
('omega_strikers', 'Omega Strikers', '⚽'),
('zealot_hockey', 'Zealot Hockey', '🏒'),
('tactical_fps', 'Tactical FPS', '🎯'),
('strategic_shooter', 'Strategic Shooter', '🛡️'),
('team_shooter', 'Team Shooter', '💥')
ON CONFLICT DO NOTHING;

-- Insert real venue data
INSERT INTO venues (name, location, capacity) VALUES
('Main Arena', 'Central Gaming Complex', 500),
('Arena 1', 'North Wing', 200),
('Arena 2', 'South Wing', 200),
('Arena 3', 'East Wing', 150),
('Practice Room A', 'Training Facility', 50),
('Practice Room B', 'Training Facility', 50)
ON CONFLICT DO NOTHING;

-- Create function to get real games
CREATE OR REPLACE FUNCTION get_active_games()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  display_name VARCHAR,
  icon VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT g.id, g.name, g.display_name, g.icon
  FROM games g
  WHERE g.is_active = true
  ORDER BY g.display_name;
END;
$$ LANGUAGE plpgsql;

-- Create function to get real venues
CREATE OR REPLACE FUNCTION get_active_venues()
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  location VARCHAR,
  capacity INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT v.id, v.name, v.location, v.capacity
  FROM venues v
  WHERE v.is_active = true
  ORDER BY v.name;
END;
$$ LANGUAGE plpgsql;
