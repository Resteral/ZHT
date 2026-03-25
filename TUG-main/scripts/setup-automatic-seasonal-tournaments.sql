-- Ensure seasonal tournament system is properly configured for automatic operation

-- Update existing seasonal tournaments table to support automatic management
ALTER TABLE seasonal_tournaments 
ADD COLUMN IF NOT EXISTS auto_managed BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS next_season_prepared BOOLEAN DEFAULT false;

-- Create function to automatically transition seasons
CREATE OR REPLACE FUNCTION auto_transition_seasonal_tournaments()
RETURNS void AS $$
DECLARE
    current_season RECORD;
    next_season_number INTEGER;
BEGIN
    -- Find active season that has ended
    SELECT * INTO current_season
    FROM seasonal_tournaments 
    WHERE status = 'active' 
    AND end_date < NOW()
    AND auto_managed = true
    LIMIT 1;
    
    IF current_season IS NOT NULL THEN
        -- Mark current season as completed
        UPDATE seasonal_tournaments 
        SET status = 'completed', updated_at = NOW()
        WHERE id = current_season.id;
        
        -- Calculate next season number
        next_season_number := current_season.season_number + 1;
        
        -- Create new season
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
            elo_cutoff_minimum,
            season_type,
            auto_managed
        ) VALUES (
            'Season ' || next_season_number || ' - ' || 
            CASE (next_season_number - 1) % 4
                WHEN 0 THEN 'Spring Championship'
                WHEN 1 THEN 'Summer League'
                WHEN 2 THEN 'Autumn Tournament'
                ELSE 'Winter Series'
            END,
            next_season_number,
            NOW(),
            NOW() + INTERVAL '90 days',
            'active',
            NOW(),
            NOW() + INTERVAL '14 days',
            10000,
            500,
            1200,
            'standard',
            true
        );
        
        RAISE NOTICE 'Automatically transitioned to Season %', next_season_number;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create initial season if none exists
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
    elo_cutoff_minimum,
    season_type,
    auto_managed
) 
SELECT 
    'Season 1 - Spring Championship',
    1,
    NOW(),
    NOW() + INTERVAL '90 days',
    'active',
    NOW(),
    NOW() + INTERVAL '14 days',
    10000,
    500,
    1200,
    'standard',
    true
WHERE NOT EXISTS (
    SELECT 1 FROM seasonal_tournaments WHERE status IN ('active', 'upcoming')
);

-- Create index for automatic management queries
CREATE INDEX IF NOT EXISTS idx_seasonal_tournaments_auto_management 
ON seasonal_tournaments(status, end_date, auto_managed) 
WHERE auto_managed = true;

-- Display current status
SELECT 
    'Current Seasonal Tournament Status' as info,
    name,
    season_number,
    status,
    start_date,
    end_date,
    current_participants,
    auto_managed
FROM seasonal_tournaments 
WHERE status IN ('active', 'upcoming')
ORDER BY season_number DESC;
