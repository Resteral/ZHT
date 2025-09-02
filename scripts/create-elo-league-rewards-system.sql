-- ELO League Rewards System
-- Comprehensive reward system for ELO league winners with automatic distribution

-- ELO League reward tiers table
CREATE TABLE IF NOT EXISTS elo_league_reward_tiers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier_name TEXT NOT NULL UNIQUE,
    division TEXT NOT NULL CHECK (division IN ('premier', 'championship', 'league_one', 'league_two')),
    rank_min INTEGER NOT NULL,
    rank_max INTEGER NOT NULL,
    monetary_reward NUMERIC NOT NULL DEFAULT 0,
    achievement_points INTEGER NOT NULL DEFAULT 0,
    trophy_type TEXT NOT NULL, -- gold, silver, bronze, participation
    trophy_title TEXT NOT NULL,
    trophy_description TEXT NOT NULL,
    trophy_icon TEXT NOT NULL DEFAULT 'trophy',
    trophy_rarity TEXT NOT NULL DEFAULT 'common' CHECK (trophy_rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ELO League reward history table
CREATE TABLE IF NOT EXISTS elo_league_reward_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seasonal_tournament_id UUID NOT NULL REFERENCES seasonal_tournaments(id) ON DELETE CASCADE,
    username TEXT NOT NULL,
    division TEXT NOT NULL,
    final_rank INTEGER NOT NULL,
    tier_name TEXT NOT NULL,
    monetary_reward NUMERIC NOT NULL DEFAULT 0,
    achievement_points INTEGER NOT NULL DEFAULT 0,
    trophy_type TEXT NOT NULL,
    trophy_title TEXT NOT NULL,
    trophy_description TEXT NOT NULL,
    trophy_icon TEXT NOT NULL,
    trophy_rarity TEXT NOT NULL,
    season_name TEXT NOT NULL,
    season_number INTEGER NOT NULL,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    claimed_at TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'expired')),
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, seasonal_tournament_id)
);

-- Insert ELO League reward tiers
INSERT INTO elo_league_reward_tiers (tier_name, division, rank_min, rank_max, monetary_reward, achievement_points, trophy_type, trophy_title, trophy_description, trophy_icon, trophy_rarity) VALUES
-- Premier Division Rewards
('Premier Champion', 'premier', 1, 1, 1000.00, 500, 'gold', 'Premier League Champion', 'Conquered the Premier Division - Elite of the Elite', 'crown', 'legendary'),
('Premier Elite', 'premier', 2, 3, 500.00, 300, 'silver', 'Premier League Elite', 'Top 3 finish in Premier Division', 'medal', 'epic'),
('Premier Master', 'premier', 4, 10, 250.00, 200, 'bronze', 'Premier League Master', 'Top 10 finish in Premier Division', 'award', 'rare'),
('Premier Competitor', 'premier', 11, 50, 100.00, 100, 'participation', 'Premier League Competitor', 'Competed in Premier Division', 'star', 'uncommon'),

-- Championship Division Rewards  
('Championship Winner', 'championship', 1, 1, 500.00, 300, 'gold', 'Championship Division Winner', 'Dominated the Championship Division', 'trophy', 'epic'),
('Championship Podium', 'championship', 2, 3, 200.00, 150, 'silver', 'Championship Division Podium', 'Top 3 finish in Championship Division', 'target', 'rare'),
('Championship Top 10', 'championship', 4, 10, 100.00, 100, 'bronze', 'Championship Division Top 10', 'Top 10 finish in Championship Division', 'shield', 'uncommon'),
('Championship Participant', 'championship', 11, 100, 50.00, 50, 'participation', 'Championship Division Participant', 'Competed in Championship Division', 'hexagon', 'common'),

-- League One Rewards
('League One Champion', 'league_one', 1, 1, 250.00, 200, 'gold', 'League One Champion', 'Won League One Division', 'trophy', 'rare'),
('League One Podium', 'league_one', 2, 3, 100.00, 100, 'silver', 'League One Podium', 'Top 3 finish in League One', 'medal', 'uncommon'),
('League One Top 10', 'league_one', 4, 10, 50.00, 75, 'bronze', 'League One Top 10', 'Top 10 finish in League One', 'award', 'common'),
('League One Participant', 'league_one', 11, 200, 25.00, 25, 'participation', 'League One Participant', 'Competed in League One Division', 'circle', 'common'),

-- League Two Rewards
('League Two Champion', 'league_two', 1, 1, 100.00, 100, 'gold', 'League Two Champion', 'Won League Two Division', 'trophy', 'uncommon'),
('League Two Podium', 'league_two', 2, 3, 50.00, 50, 'silver', 'League Two Podium', 'Top 3 finish in League Two', 'medal', 'common'),
('League Two Top 10', 'league_two', 4, 10, 25.00, 25, 'bronze', 'League Two Top 10', 'Top 10 finish in League Two', 'star', 'common'),
('League Two Participant', 'league_two', 11, 500, 10.00, 10, 'participation', 'League Two Participant', 'Competed in League Two Division', 'dot', 'common');

-- Function to distribute ELO league rewards when season ends
CREATE OR REPLACE FUNCTION distribute_elo_league_rewards(seasonal_tournament_id_param UUID)
RETURNS void AS $$
DECLARE
    season_record RECORD;
    participant_record RECORD;
    reward_tier RECORD;
    total_distributed NUMERIC := 0;
BEGIN
    -- Get season details
    SELECT * INTO season_record 
    FROM seasonal_tournaments 
    WHERE id = seasonal_tournament_id_param;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Seasonal tournament not found';
    END IF;
    
    -- Process rewards for each participant
    FOR participant_record IN
        SELECT 
            sp.*,
            ROW_NUMBER() OVER (PARTITION BY sp.current_division ORDER BY sp.seasonal_points DESC, sp.current_elo DESC) as division_rank
        FROM seasonal_tournament_participants sp
        WHERE sp.seasonal_tournament_id = seasonal_tournament_id_param
        ORDER BY sp.current_division, sp.seasonal_points DESC, sp.current_elo DESC
    LOOP
        -- Find appropriate reward tier
        SELECT * INTO reward_tier
        FROM elo_league_reward_tiers
        WHERE division = participant_record.current_division
        AND participant_record.division_rank BETWEEN rank_min AND rank_max
        ORDER BY rank_min ASC
        LIMIT 1;
        
        IF FOUND THEN
            -- Record reward in history
            INSERT INTO elo_league_reward_history (
                user_id,
                seasonal_tournament_id,
                username,
                division,
                final_rank,
                tier_name,
                monetary_reward,
                achievement_points,
                trophy_type,
                trophy_title,
                trophy_description,
                trophy_icon,
                trophy_rarity,
                season_name,
                season_number
            ) VALUES (
                participant_record.user_id,
                seasonal_tournament_id_param,
                participant_record.username,
                participant_record.current_division,
                participant_record.division_rank,
                reward_tier.tier_name,
                reward_tier.monetary_reward,
                reward_tier.achievement_points,
                reward_tier.trophy_type,
                reward_tier.trophy_title,
                reward_tier.trophy_description,
                reward_tier.trophy_icon,
                reward_tier.trophy_rarity,
                season_record.name,
                season_record.season_number
            ) ON CONFLICT (user_id, seasonal_tournament_id) DO NOTHING;
            
            -- Add monetary reward to user wallet
            IF reward_tier.monetary_reward > 0 THEN
                INSERT INTO user_wallets (user_id, balance, total_winnings, updated_at)
                VALUES (participant_record.user_id, reward_tier.monetary_reward, reward_tier.monetary_reward, NOW())
                ON CONFLICT (user_id) DO UPDATE SET
                    balance = user_wallets.balance + reward_tier.monetary_reward,
                    total_winnings = user_wallets.total_winnings + reward_tier.monetary_reward,
                    updated_at = NOW();
                
                total_distributed := total_distributed + reward_tier.monetary_reward;
            END IF;
            
            -- Award achievement trophy
            INSERT INTO tournament_achievements (
                user_id,
                achievement_type,
                tournament_name,
                achievement_title,
                achievement_description,
                icon,
                rarity,
                points,
                metadata
            ) VALUES (
                participant_record.user_id,
                'elo_league_' || reward_tier.trophy_type,
                season_record.name,
                reward_tier.trophy_title,
                reward_tier.trophy_description,
                reward_tier.trophy_icon,
                reward_tier.trophy_rarity,
                reward_tier.achievement_points,
                jsonb_build_object(
                    'division', participant_record.current_division,
                    'rank', participant_record.division_rank,
                    'season_number', season_record.season_number,
                    'elo_rating', participant_record.current_elo,
                    'seasonal_points', participant_record.seasonal_points
                )
            ) ON CONFLICT (user_id, achievement_type, tournament_name) DO NOTHING;
            
            RAISE NOTICE 'Awarded % (%) to % - Division: %, Rank: %', 
                reward_tier.trophy_title, 
                reward_tier.monetary_reward, 
                participant_record.username,
                participant_record.current_division,
                participant_record.division_rank;
        END IF;
    END LOOP;
    
    -- Update season status
    UPDATE seasonal_tournaments 
    SET 
        status = 'completed',
        updated_at = NOW()
    WHERE id = seasonal_tournament_id_param;
    
    RAISE NOTICE 'ELO League rewards distributed successfully. Total: $%', total_distributed;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's ELO league rewards
CREATE OR REPLACE FUNCTION get_user_elo_league_rewards(user_id_param UUID)
RETURNS TABLE (
    reward_id UUID,
    season_name TEXT,
    division TEXT,
    final_rank INTEGER,
    trophy_title TEXT,
    trophy_description TEXT,
    trophy_icon TEXT,
    trophy_rarity TEXT,
    monetary_reward NUMERIC,
    achievement_points INTEGER,
    awarded_at TIMESTAMP WITH TIME ZONE,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        elrh.id,
        elrh.season_name,
        elrh.division,
        elrh.final_rank,
        elrh.trophy_title,
        elrh.trophy_description,
        elrh.trophy_icon,
        elrh.trophy_rarity,
        elrh.monetary_reward,
        elrh.achievement_points,
        elrh.awarded_at,
        elrh.status
    FROM elo_league_reward_history elrh
    WHERE elrh.user_id = user_id_param
    ORDER BY elrh.awarded_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to claim pending rewards
CREATE OR REPLACE FUNCTION claim_elo_league_reward(reward_id_param UUID, user_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
    reward_record RECORD;
BEGIN
    -- Get reward details
    SELECT * INTO reward_record
    FROM elo_league_reward_history
    WHERE id = reward_id_param AND user_id = user_id_param AND status = 'pending';
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Mark as claimed
    UPDATE elo_league_reward_history
    SET 
        status = 'claimed',
        claimed_at = NOW()
    WHERE id = reward_id_param;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_elo_league_reward_history_user ON elo_league_reward_history(user_id);
CREATE INDEX IF NOT EXISTS idx_elo_league_reward_history_season ON elo_league_reward_history(seasonal_tournament_id);
CREATE INDEX IF NOT EXISTS idx_elo_league_reward_history_status ON elo_league_reward_history(status);
CREATE INDEX IF NOT EXISTS idx_elo_league_reward_tiers_division ON elo_league_reward_tiers(division);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON elo_league_reward_tiers TO authenticated;
GRANT SELECT, INSERT, UPDATE ON elo_league_reward_history TO authenticated;
GRANT EXECUTE ON FUNCTION distribute_elo_league_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_elo_league_rewards TO authenticated;
GRANT EXECUTE ON FUNCTION claim_elo_league_reward TO authenticated;

-- Display reward tiers
SELECT 
    division,
    tier_name,
    CONCAT(rank_min, '-', rank_max) as rank_range,
    CONCAT('$', monetary_reward) as prize,
    CONCAT(achievement_points, ' pts') as points,
    trophy_title
FROM elo_league_reward_tiers
ORDER BY 
    CASE division 
        WHEN 'premier' THEN 1 
        WHEN 'championship' THEN 2 
        WHEN 'league_one' THEN 3 
        WHEN 'league_two' THEN 4 
    END,
    rank_min;
