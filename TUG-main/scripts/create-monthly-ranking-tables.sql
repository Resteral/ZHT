-- Create monthly rankings table
CREATE TABLE IF NOT EXISTS monthly_rankings (
    id TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    elo_rating INTEGER NOT NULL DEFAULT 1200,
    previous_elo INTEGER NOT NULL DEFAULT 1200,
    elo_change INTEGER NOT NULL DEFAULT 0,
    monthly_points INTEGER NOT NULL DEFAULT 0,
    matches_played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    win_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    rank INTEGER NOT NULL,
    previous_rank INTEGER NOT NULL,
    rank_change INTEGER NOT NULL DEFAULT 0,
    division TEXT NOT NULL CHECK (division IN ('premier', 'championship', 'league_one', 'league_two')),
    previous_division TEXT NOT NULL,
    promotion_status TEXT CHECK (promotion_status IN ('promoted', 'relegated', 'maintained')),
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_monthly_rankings_month_year ON monthly_rankings(month, year);
CREATE INDEX IF NOT EXISTS idx_monthly_rankings_rank ON monthly_rankings(rank);
CREATE INDEX IF NOT EXISTS idx_monthly_rankings_division ON monthly_rankings(division);
CREATE INDEX IF NOT EXISTS idx_monthly_rankings_user_id ON monthly_rankings(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_rankings_elo_rating ON monthly_rankings(elo_rating DESC);

-- Create monthly tournament seasons table
CREATE TABLE IF NOT EXISTS monthly_tournament_seasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'registration', 'active', 'completed', 'cancelled')),
    registration_start TIMESTAMP WITH TIME ZONE,
    registration_end TIMESTAMP WITH TIME ZONE,
    season_start TIMESTAMP WITH TIME ZONE,
    season_end TIMESTAMP WITH TIME ZONE,
    total_prize_pool INTEGER NOT NULL DEFAULT 0,
    max_participants INTEGER NOT NULL DEFAULT 128,
    current_participants INTEGER NOT NULL DEFAULT 0,
    elo_cutoff_minimum INTEGER NOT NULL DEFAULT 1200,
    division_prize_distribution JSONB DEFAULT '{"premier": 0.5, "championship": 0.3, "league_one": 0.15, "league_two": 0.05}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(month, year)
);

-- Create monthly division standings table
CREATE TABLE IF NOT EXISTS monthly_division_standings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    season_id UUID NOT NULL REFERENCES monthly_tournament_seasons(id) ON DELETE CASCADE,
    division TEXT NOT NULL CHECK (division IN ('premier', 'championship', 'league_one', 'league_two')),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    elo_rating INTEGER NOT NULL,
    division_rank INTEGER NOT NULL,
    matches_played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    prize_earned INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(season_id, user_id)
);

-- Create indexes for division standings
CREATE INDEX IF NOT EXISTS idx_division_standings_season_division ON monthly_division_standings(season_id, division);
CREATE INDEX IF NOT EXISTS idx_division_standings_rank ON monthly_division_standings(division_rank);
CREATE INDEX IF NOT EXISTS idx_division_standings_points ON monthly_division_standings(points DESC);

-- Create monthly promotion/relegation log
CREATE TABLE IF NOT EXISTS monthly_promotion_relegation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    from_division TEXT NOT NULL,
    to_division TEXT NOT NULL,
    promotion_type TEXT NOT NULL CHECK (promotion_type IN ('promoted', 'relegated', 'maintained')),
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    elo_at_change INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for promotion/relegation tracking
CREATE INDEX IF NOT EXISTS idx_promotion_relegation_user ON monthly_promotion_relegation(user_id);
CREATE INDEX IF NOT EXISTS idx_promotion_relegation_month_year ON monthly_promotion_relegation(month, year);
CREATE INDEX IF NOT EXISTS idx_promotion_relegation_type ON monthly_promotion_relegation(promotion_type);

-- Insert initial monthly tournament season for current month
INSERT INTO monthly_tournament_seasons (
    name,
    month,
    year,
    status,
    registration_start,
    registration_end,
    season_start,
    season_end,
    total_prize_pool,
    max_participants,
    elo_cutoff_minimum
) VALUES (
    CONCAT(TO_CHAR(NOW(), 'Month'), ' ', EXTRACT(YEAR FROM NOW()), ' Elo League'),
    TO_CHAR(NOW(), 'Month'),
    EXTRACT(YEAR FROM NOW()),
    'registration',
    NOW(),
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '1 month',
    5000,
    128,
    1200
) ON CONFLICT (month, year) DO NOTHING;

-- Create function to automatically update monthly rankings
CREATE OR REPLACE FUNCTION update_monthly_rankings()
RETURNS TRIGGER AS $$
BEGIN
    -- This function would be called when match results are updated
    -- to automatically recalculate monthly rankings
    
    -- Update the user's monthly ranking entry if it exists
    UPDATE monthly_rankings 
    SET 
        elo_rating = (SELECT elo_rating FROM users WHERE id = NEW.user_id),
        matches_played = matches_played + 1,
        wins = CASE WHEN NEW.result = 'win' THEN wins + 1 ELSE wins END,
        losses = CASE WHEN NEW.result = 'loss' THEN losses + 1 ELSE losses END,
        win_rate = CASE 
            WHEN matches_played + 1 > 0 THEN 
                ((CASE WHEN NEW.result = 'win' THEN wins + 1 ELSE wins END)::DECIMAL / (matches_played + 1)) * 100
            ELSE 0 
        END,
        updated_at = NOW()
    WHERE user_id = NEW.user_id 
    AND month = TO_CHAR(NOW(), 'Month')
    AND year = EXTRACT(YEAR FROM NOW());
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update monthly rankings when matches complete
CREATE TRIGGER trigger_update_monthly_rankings
    AFTER UPDATE OF result ON match_participants
    FOR EACH ROW
    WHEN (NEW.result IS DISTINCT FROM OLD.result AND NEW.result IN ('win', 'loss'))
    EXECUTE FUNCTION update_monthly_rankings();

-- Create function to generate end-of-month rankings
CREATE OR REPLACE FUNCTION generate_end_of_month_rankings()
RETURNS VOID AS $$
DECLARE
    current_month TEXT := TO_CHAR(NOW(), 'Month');
    current_year INTEGER := EXTRACT(YEAR FROM NOW());
    user_record RECORD;
    rank_counter INTEGER := 1;
BEGIN
    -- Delete existing rankings for current month
    DELETE FROM monthly_rankings 
    WHERE month = current_month AND year = current_year;
    
    -- Generate new rankings based on current ELO
    FOR user_record IN 
        SELECT 
            u.id,
            u.username,
            u.elo_rating,
            COALESCE(prev.elo_rating, u.elo_rating) as previous_elo,
            COALESCE(prev.rank, rank_counter) as previous_rank
        FROM users u
        LEFT JOIN monthly_rankings prev ON prev.user_id = u.id 
            AND prev.month = (
                CASE 
                    WHEN EXTRACT(MONTH FROM NOW()) = 1 THEN 'December'
                    ELSE TO_CHAR(NOW() - INTERVAL '1 month', 'Month')
                END
            )
            AND prev.year = (
                CASE 
                    WHEN EXTRACT(MONTH FROM NOW()) = 1 THEN current_year - 1
                    ELSE current_year
                END
            )
        WHERE u.elo_rating >= 1200
        ORDER BY u.elo_rating DESC
    LOOP
        INSERT INTO monthly_rankings (
            id,
            user_id,
            username,
            elo_rating,
            previous_elo,
            elo_change,
            rank,
            previous_rank,
            rank_change,
            division,
            previous_division,
            month,
            year
        ) VALUES (
            user_record.id || '_' || current_month || '_' || current_year,
            user_record.id,
            user_record.username,
            user_record.elo_rating,
            user_record.previous_elo,
            user_record.elo_rating - user_record.previous_elo,
            rank_counter,
            user_record.previous_rank,
            user_record.previous_rank - rank_counter,
            CASE 
                WHEN user_record.elo_rating >= 1800 THEN 'premier'
                WHEN user_record.elo_rating >= 1600 THEN 'championship'
                WHEN user_record.elo_rating >= 1400 THEN 'league_one'
                ELSE 'league_two'
            END,
            CASE 
                WHEN user_record.previous_elo >= 1800 THEN 'premier'
                WHEN user_record.previous_elo >= 1600 THEN 'championship'
                WHEN user_record.previous_elo >= 1400 THEN 'league_one'
                ELSE 'league_two'
            END,
            current_month,
            current_year
        );
        
        rank_counter := rank_counter + 1;
    END LOOP;
    
    RAISE NOTICE 'Generated monthly rankings for % % with % players', current_month, current_year, rank_counter - 1;
END;
$$ LANGUAGE plpgsql;

-- Test the monthly ranking generation
SELECT generate_end_of_month_rankings();

-- Display current monthly rankings
SELECT 
    rank,
    username,
    elo_rating,
    division,
    elo_change,
    rank_change,
    CASE 
        WHEN rank_change > 0 THEN '↑ ' || rank_change
        WHEN rank_change < 0 THEN '↓ ' || ABS(rank_change)
        ELSE '→ 0'
    END as trend
FROM monthly_rankings 
WHERE month = TO_CHAR(NOW(), 'Month') 
AND year = EXTRACT(YEAR FROM NOW())
ORDER BY rank
LIMIT 20;
