-- Create seasonal tournaments table
CREATE TABLE IF NOT EXISTS seasonal_tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    season_number INTEGER NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registration', 'active', 'completed', 'cancelled')),
    registration_start TIMESTAMP WITH TIME ZONE,
    registration_end TIMESTAMP WITH TIME ZONE,
    total_prize_pool NUMERIC NOT NULL DEFAULT 0,
    max_participants INTEGER NOT NULL DEFAULT 500,
    current_participants INTEGER NOT NULL DEFAULT 0,
    elo_cutoff_minimum INTEGER NOT NULL DEFAULT 1200,
    season_type TEXT NOT NULL DEFAULT 'standard' CHECK (season_type IN ('standard', 'championship', 'special')),
    division_settings JSONB DEFAULT '{"premier": {"min_elo": 1800, "prize_share": 0.4}, "championship": {"min_elo": 1600, "prize_share": 0.3}, "league_one": {"min_elo": 1400, "prize_share": 0.2}, "league_two": {"min_elo": 1200, "prize_share": 0.1}}',
    lobby_integration_settings JSONB DEFAULT '{"track_all_formats": true, "elo_weight": 1.0, "win_bonus": 10, "participation_bonus": 5}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(season_number)
);

-- Create seasonal participants table
CREATE TABLE IF NOT EXISTS seasonal_tournament_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seasonal_tournament_id UUID NOT NULL REFERENCES seasonal_tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    starting_elo INTEGER NOT NULL,
    current_elo INTEGER NOT NULL,
    peak_elo INTEGER NOT NULL,
    lowest_elo INTEGER NOT NULL,
    total_matches_played INTEGER NOT NULL DEFAULT 0,
    total_wins INTEGER NOT NULL DEFAULT 0,
    total_losses INTEGER NOT NULL DEFAULT 0,
    seasonal_points INTEGER NOT NULL DEFAULT 0,
    current_division TEXT NOT NULL CHECK (current_division IN ('premier', 'championship', 'league_one', 'league_two')),
    highest_division_reached TEXT NOT NULL CHECK (highest_division_reached IN ('premier', 'championship', 'league_one', 'league_two')),
    current_rank INTEGER,
    best_rank INTEGER,
    lobby_stats JSONB DEFAULT '{"1v1": {"played": 0, "won": 0}, "2v2": {"played": 0, "won": 0}, "3v3": {"played": 0, "won": 0}, "5v5": {"played": 0, "won": 0}, "6v6": {"played": 0, "won": 0}}',
    achievements JSONB DEFAULT '[]',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seasonal_tournament_id, user_id)
);

-- Create seasonal leaderboards table
CREATE TABLE IF NOT EXISTS seasonal_leaderboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seasonal_tournament_id UUID NOT NULL REFERENCES seasonal_tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    division TEXT NOT NULL CHECK (division IN ('premier', 'championship', 'league_one', 'league_two')),
    rank INTEGER NOT NULL,
    elo_rating INTEGER NOT NULL,
    seasonal_points INTEGER NOT NULL,
    matches_played INTEGER NOT NULL,
    win_rate DECIMAL(5,2) NOT NULL,
    elo_change_from_start INTEGER NOT NULL,
    weekly_elo_change INTEGER NOT NULL DEFAULT 0,
    streak_type TEXT CHECK (streak_type IN ('win', 'loss')),
    current_streak INTEGER NOT NULL DEFAULT 0,
    best_streak INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(seasonal_tournament_id, user_id)
);

-- Create seasonal match tracking table
CREATE TABLE IF NOT EXISTS seasonal_match_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seasonal_tournament_id UUID NOT NULL REFERENCES seasonal_tournaments(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_format TEXT NOT NULL, -- '1v1', '2v2', etc.
    result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
    elo_before INTEGER NOT NULL,
    elo_after INTEGER NOT NULL,
    elo_change INTEGER NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    match_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create seasonal achievements table
CREATE TABLE IF NOT EXISTS seasonal_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    achievement_type TEXT NOT NULL CHECK (achievement_type IN ('elo', 'matches', 'streak', 'division', 'special')),
    requirements JSONB NOT NULL,
    reward_points INTEGER NOT NULL DEFAULT 0,
    reward_description TEXT,
    icon TEXT,
    rarity TEXT NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_seasonal_participants_tournament ON seasonal_tournament_participants(seasonal_tournament_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_participants_user ON seasonal_tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_participants_elo ON seasonal_tournament_participants(current_elo DESC);
CREATE INDEX IF NOT EXISTS idx_seasonal_participants_points ON seasonal_tournament_participants(seasonal_points DESC);
CREATE INDEX IF NOT EXISTS idx_seasonal_leaderboards_tournament_division ON seasonal_leaderboards(seasonal_tournament_id, division);
CREATE INDEX IF NOT EXISTS idx_seasonal_leaderboards_rank ON seasonal_leaderboards(rank);
CREATE INDEX IF NOT EXISTS idx_seasonal_match_tracking_tournament ON seasonal_match_tracking(seasonal_tournament_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_match_tracking_user ON seasonal_match_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_match_tracking_date ON seasonal_match_tracking(match_date);

-- Insert default seasonal achievements
INSERT INTO seasonal_achievements (name, description, achievement_type, requirements, reward_points, reward_description, icon, rarity) VALUES
('ELO Climber', 'Gain 100+ ELO points in a single season', 'elo', '{"elo_gain": 100}', 50, '+50 Seasonal Points', '📈', 'common'),
('ELO Master', 'Gain 200+ ELO points in a single season', 'elo', '{"elo_gain": 200}', 100, '+100 Seasonal Points', '🚀', 'rare'),
('ELO Legend', 'Gain 300+ ELO points in a single season', 'elo', '{"elo_gain": 300}', 200, '+200 Seasonal Points', '👑', 'epic'),
('Match Grinder', 'Play 50+ matches in a single season', 'matches', '{"matches_played": 50}', 75, '+75 Seasonal Points', '⚔️', 'common'),
('Match Warrior', 'Play 100+ matches in a single season', 'matches', '{"matches_played": 100}', 150, '+150 Seasonal Points', '🛡️', 'rare'),
('Win Streak', 'Achieve a 10+ game win streak', 'streak', '{"win_streak": 10}', 100, '+100 Seasonal Points', '🔥', 'rare'),
('Unstoppable', 'Achieve a 20+ game win streak', 'streak', '{"win_streak": 20}', 250, '+250 Seasonal Points', '⚡', 'legendary'),
('Division Climber', 'Get promoted to a higher division', 'division', '{"promotion": true}', 100, '+100 Seasonal Points', '📊', 'rare'),
('Premier League', 'Reach Premier Division', 'division', '{"division": "premier"}', 300, '+300 Seasonal Points', '💎', 'epic'),
('Format Master', 'Win matches in all 5 lobby formats', 'special', '{"all_formats": true}', 200, '+200 Seasonal Points', '🎯', 'epic')
ON CONFLICT (name) DO NOTHING;

-- Create function to update seasonal stats when matches complete
CREATE OR REPLACE FUNCTION update_seasonal_stats()
RETURNS TRIGGER AS $$
DECLARE
    active_season RECORD;
    participant_record RECORD;
    elo_change INTEGER;
    points_earned INTEGER;
    match_format TEXT;
BEGIN
    -- Get active seasonal tournament
    SELECT * INTO active_season 
    FROM seasonal_tournaments 
    WHERE status = 'active' 
    AND NOW() BETWEEN start_date AND end_date
    LIMIT 1;
    
    IF active_season IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get match format from the match
    SELECT match_type INTO match_format
    FROM matches 
    WHERE id = NEW.match_id;
    
    -- Get current user ELO and calculate change
    SELECT elo_rating INTO elo_change
    FROM users 
    WHERE id = NEW.user_id;
    
    -- Calculate points earned (base points + win bonus)
    points_earned := 5; -- Base participation points
    IF NEW.result = 'win' THEN
        points_earned := points_earned + 10; -- Win bonus
    END IF;
    
    -- Update or insert seasonal participant record
    INSERT INTO seasonal_tournament_participants (
        seasonal_tournament_id,
        user_id,
        username,
        starting_elo,
        current_elo,
        peak_elo,
        lowest_elo,
        current_division,
        highest_division_reached
    )
    SELECT 
        active_season.id,
        NEW.user_id,
        u.username,
        u.elo_rating,
        u.elo_rating,
        u.elo_rating,
        u.elo_rating,
        CASE 
            WHEN u.elo_rating >= 1800 THEN 'premier'
            WHEN u.elo_rating >= 1600 THEN 'championship'
            WHEN u.elo_rating >= 1400 THEN 'league_one'
            ELSE 'league_two'
        END,
        CASE 
            WHEN u.elo_rating >= 1800 THEN 'premier'
            WHEN u.elo_rating >= 1600 THEN 'championship'
            WHEN u.elo_rating >= 1400 THEN 'league_one'
            ELSE 'league_two'
        END
    FROM users u
    WHERE u.id = NEW.user_id
    ON CONFLICT (seasonal_tournament_id, user_id) 
    DO UPDATE SET
        current_elo = EXCLUDED.current_elo,
        peak_elo = GREATEST(seasonal_tournament_participants.peak_elo, EXCLUDED.current_elo),
        lowest_elo = LEAST(seasonal_tournament_participants.lowest_elo, EXCLUDED.current_elo),
        total_matches_played = seasonal_tournament_participants.total_matches_played + 1,
        total_wins = seasonal_tournament_participants.total_wins + CASE WHEN NEW.result = 'win' THEN 1 ELSE 0 END,
        total_losses = seasonal_tournament_participants.total_losses + CASE WHEN NEW.result = 'loss' THEN 1 ELSE 0 END,
        seasonal_points = seasonal_tournament_participants.seasonal_points + points_earned,
        current_division = CASE 
            WHEN EXCLUDED.current_elo >= 1800 THEN 'premier'
            WHEN EXCLUDED.current_elo >= 1600 THEN 'championship'
            WHEN EXCLUDED.current_elo >= 1400 THEN 'league_one'
            ELSE 'league_two'
        END,
        highest_division_reached = CASE 
            WHEN EXCLUDED.current_elo >= 1800 AND seasonal_tournament_participants.highest_division_reached != 'premier' THEN 'premier'
            WHEN EXCLUDED.current_elo >= 1600 AND seasonal_tournament_participants.highest_division_reached NOT IN ('premier', 'championship') THEN 'championship'
            WHEN EXCLUDED.current_elo >= 1400 AND seasonal_tournament_participants.highest_division_reached NOT IN ('premier', 'championship', 'league_one') THEN 'league_one'
            ELSE seasonal_tournament_participants.highest_division_reached
        END,
        lobby_stats = jsonb_set(
            seasonal_tournament_participants.lobby_stats,
            ARRAY[match_format, 'played'],
            ((seasonal_tournament_participants.lobby_stats->match_format->>'played')::int + 1)::text::jsonb
        ),
        last_activity = NOW();
    
    -- Insert match tracking record
    INSERT INTO seasonal_match_tracking (
        seasonal_tournament_id,
        match_id,
        user_id,
        match_format,
        result,
        elo_before,
        elo_after,
        elo_change,
        points_earned,
        match_date
    ) VALUES (
        active_season.id,
        NEW.match_id,
        NEW.user_id,
        match_format,
        NEW.result,
        elo_change,
        elo_change, -- This would be updated after ELO calculation
        0, -- This would be calculated after ELO update
        points_earned,
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update seasonal stats when matches complete
CREATE TRIGGER trigger_update_seasonal_stats
    AFTER INSERT ON match_participants
    FOR EACH ROW
    WHEN (NEW.result IS NOT NULL)
    EXECUTE FUNCTION update_seasonal_stats();

-- Insert current seasonal tournament
INSERT INTO seasonal_tournaments (
    name,
    season_number,
    start_date,
    end_date,
    status,
    registration_start,
    registration_end,
    total_prize_pool,
    max_participants,
    elo_cutoff_minimum
) VALUES (
    'Season 1 - Winter Championship',
    1,
    NOW(),
    NOW() + INTERVAL '3 months',
    'active',
    NOW() - INTERVAL '1 week',
    NOW() + INTERVAL '2 weeks',
    10000,
    500,
    1200
) ON CONFLICT (season_number) DO NOTHING;

-- Display initial data
SELECT 
    'Seasonal Tournaments' as table_name,
    COUNT(*) as record_count
FROM seasonal_tournaments
UNION ALL
SELECT 
    'Seasonal Achievements' as table_name,
    COUNT(*) as record_count
FROM seasonal_achievements
UNION ALL
SELECT 
    'Active Season' as table_name,
    COUNT(*) as record_count
FROM seasonal_tournaments
WHERE status = 'active';
