-- 0. Table: users & profiles (Ensure critical columns exist)
ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1200;
ALTER TABLE users ADD COLUMN IF NOT EXISTS mmr INTEGER DEFAULT 1200;
ALTER TABLE users ADD COLUMN IF NOT EXISTS balance DECIMAL(12,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    favorite_game VARCHAR(100) DEFAULT 'omega_strikers',
    favorite_race VARCHAR(100),
    total_matches_played INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_losses INTEGER DEFAULT 0,
    win_rate DECIMAL(5,2) DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_win_streak INTEGER DEFAULT 0,
    total_earnings DECIMAL(12,2) DEFAULT 0,
    tournaments_won INTEGER DEFAULT 0,
    tournaments_participated INTEGER DEFAULT 0,
    average_match_duration INTEGER DEFAULT 0,
    profile_visibility VARCHAR(20) DEFAULT 'public',
    match_history_visibility VARCHAR(20) DEFAULT 'public',
    show_online_status BOOLEAN DEFAULT true,
    elo_rating INTEGER DEFAULT 1200,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all current users have a profile
INSERT INTO user_profiles (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;

-- 1. Table: wallet_transactions (Required for tournament prize distribution)

-- 2. Table: captain_drafts
CREATE TABLE IF NOT EXISTS captain_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    game TEXT NOT NULL,
    max_participants INTEGER DEFAULT 8,
    team_format TEXT DEFAULT '4v4',
    status TEXT DEFAULT 'waiting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    winner_team INTEGER,
    entry_fee DECIMAL(12,2) DEFAULT 0,
    prize_pool DECIMAL(12,2) DEFAULT 0,
    draft_data JSONB DEFAULT '{}'::jsonb
);

-- 3. Table: captain_draft_participants
CREATE TABLE IF NOT EXISTS captain_draft_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draft_id UUID REFERENCES captain_drafts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    draft_position INTEGER DEFAULT 1,
    team_name VARCHAR(100),
    UNIQUE(draft_id, user_id)
);

-- Fix: Convert league_id to draft_id if it exists in participants
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captain_draft_participants' AND column_name = 'league_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captain_draft_participants' AND column_name = 'draft_id') THEN
            ALTER TABLE captain_draft_participants RENAME COLUMN league_id TO draft_id;
        END IF;
    END IF;
    
    -- Ensure draft_id exists if the table was somehow created without it
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captain_draft_participants' AND column_name = 'draft_id') THEN
        ALTER TABLE captain_draft_participants ADD COLUMN draft_id UUID REFERENCES captain_drafts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Create other Draft components if missing (rosters, picks, state)
CREATE TABLE IF NOT EXISTS captain_draft_rosters (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draft_id UUID REFERENCES captain_drafts(id) ON DELETE CASCADE,
    team_number INTEGER,
    players JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS captain_draft_picks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draft_id UUID REFERENCES captain_drafts(id) ON DELETE CASCADE,
    pick_number INTEGER,
    player_id UUID REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS captain_draft_state (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draft_id UUID REFERENCES captain_drafts(id) ON DELETE CASCADE,
    current_turn_index INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false
);

-- 5. Create wallet_transactions (Required for tournament prize distribution)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL,
    description TEXT,
    reference_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create admin_activity_log
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    target_type TEXT NOT NULL,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Table: player_performances
CREATE TABLE IF NOT EXISTS player_performances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stats JSONB DEFAULT '{}'::jsonb,
    game_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    season VARCHAR DEFAULT '2025',
    points_scored NUMERIC DEFAULT 0,
    opponent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, game_date, season)
);

-- 7b. Table: player_analytics
CREATE TABLE IF NOT EXISTS player_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    match_id UUID,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stats JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Table update: tournament_participants
ALTER TABLE tournament_participants ADD COLUMN IF NOT EXISTS team_number INTEGER DEFAULT 0;

-- 9. Auction System Tables
CREATE TABLE IF NOT EXISTS auction_leagues (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    creator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    require_team_ownership BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auction_bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auction_id UUID REFERENCES auction_leagues(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auction_picks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    auction_id UUID REFERENCES auction_leagues(id) ON DELETE CASCADE,
    player_id UUID REFERENCES users(id) ON DELETE CASCADE,
    team_id UUID REFERENCES teams(id),
    amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Cleanup & Security
CREATE INDEX IF NOT EXISTS idx_captain_draft_participants_draft_id ON captain_draft_participants(draft_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);

GRANT ALL ON captain_drafts TO authenticated, service_role;
GRANT ALL ON captain_draft_participants TO authenticated, service_role;
GRANT ALL ON wallet_transactions TO authenticated, service_role;
GRANT ALL ON admin_activity_log TO authenticated, service_role;
GRANT ALL ON player_performances TO authenticated, service_role;
GRANT ALL ON captain_draft_rosters TO authenticated, service_role;
GRANT ALL ON captain_draft_picks TO authenticated, service_role;
GRANT ALL ON captain_draft_state TO authenticated, service_role;

ALTER TABLE captain_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE captain_draft_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Simple Policies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow select' AND tablename = 'captain_drafts') THEN
        CREATE POLICY "Allow select" ON captain_drafts FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow select' AND tablename = 'captain_draft_participants') THEN
        CREATE POLICY "Allow select" ON captain_draft_participants FOR SELECT USING (true);
    END IF;
END $$;
