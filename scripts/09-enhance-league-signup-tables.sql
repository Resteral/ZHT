-- Enhanced league and signup system
CREATE TABLE IF NOT EXISTS leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  league_type VARCHAR(50) NOT NULL DEFAULT 'fantasy', -- fantasy, tournament, season
  max_teams INTEGER NOT NULL DEFAULT 12,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  prize_pool DECIMAL(10,2) DEFAULT 0,
  draft_type VARCHAR(50) DEFAULT 'auction', -- auction, snake, linear
  status VARCHAR(50) NOT NULL DEFAULT 'registration', -- registration, draft_scheduled, in_season, completed
  draft_date TIMESTAMP WITH TIME ZONE,
  season_start TIMESTAMP WITH TIME ZONE,
  season_end TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS league_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  team_name VARCHAR(255) NOT NULL,
  entry_paid BOOLEAN DEFAULT FALSE,
  draft_position INTEGER,
  status VARCHAR(50) DEFAULT 'active', -- active, eliminated, champion
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

CREATE TABLE IF NOT EXISTS draft_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  draft_type VARCHAR(50) NOT NULL, -- auction, snake, tournament_bracket
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 120,
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS season_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
  season_name VARCHAR(255) NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  playoff_start TIMESTAMP WITH TIME ZONE,
  championship_date TIMESTAMP WITH TIME ZONE,
  regular_season_weeks INTEGER DEFAULT 14,
  playoff_weeks INTEGER DEFAULT 3,
  games_per_week INTEGER DEFAULT 1,
  status VARCHAR(50) DEFAULT 'planned', -- planned, active, completed
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leagues_status ON leagues(status);
CREATE INDEX IF NOT EXISTS idx_league_participants_league ON league_participants(league_id);
CREATE INDEX IF NOT EXISTS idx_draft_schedules_date ON draft_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_season_schedules_league ON season_schedules(league_id);
