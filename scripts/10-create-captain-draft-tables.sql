-- Captain-based draft league system
CREATE TABLE IF NOT EXISTS captain_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  game VARCHAR(100) NOT NULL, -- zealot_hockey, call_of_duty, rainbow_six_siege, counter_strike
  max_teams INTEGER NOT NULL DEFAULT 8,
  players_per_team INTEGER NOT NULL DEFAULT 5,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  prize_pool DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'registration', -- registration, captain_selection, draft_in_progress, completed
  draft_date TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS captain_league_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES captain_leagues(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  role VARCHAR(50) NOT NULL DEFAULT 'player', -- captain, player
  team_id UUID,
  elo_rating INTEGER NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

CREATE TABLE IF NOT EXISTS captain_draft_picks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID REFERENCES captain_leagues(id) ON DELETE CASCADE,
  captain_id UUID REFERENCES auth.users(id),
  picked_player_id UUID REFERENCES auth.users(id),
  pick_order INTEGER NOT NULL,
  round_number INTEGER NOT NULL,
  picked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_captain_leagues_game ON captain_leagues(game);
CREATE INDEX IF NOT EXISTS idx_captain_leagues_status ON captain_leagues(status);
CREATE INDEX IF NOT EXISTS idx_captain_participants_league ON captain_league_participants(league_id);
CREATE INDEX IF NOT EXISTS idx_captain_participants_elo ON captain_league_participants(elo_rating DESC);
