-- Adding comprehensive analytics tables for expanded tracking
-- Enhanced player performance tracking
CREATE TABLE IF NOT EXISTS player_performance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    elo_before INTEGER,
    elo_after INTEGER,
    elo_change INTEGER,
    performance_rating DECIMAL(5,2),
    mvp_votes INTEGER DEFAULT 0,
    flags_received INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team composition analytics
CREATE TABLE IF NOT EXISTS team_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    team_number INTEGER,
    avg_elo DECIMAL(8,2),
    total_kills INTEGER DEFAULT 0,
    total_deaths INTEGER DEFAULT 0,
    total_assists INTEGER DEFAULT 0,
    total_damage INTEGER DEFAULT 0,
    win_probability DECIMAL(5,2),
    actual_result VARCHAR(10), -- 'win', 'loss', 'draw'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match outcome predictions
CREATE TABLE IF NOT EXISTS match_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    predicted_winner INTEGER,
    confidence_score DECIMAL(5,2),
    actual_winner INTEGER,
    prediction_accuracy BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player streak tracking
CREATE TABLE IF NOT EXISTS player_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    streak_type VARCHAR(20), -- 'win', 'loss', 'mvp', 'kill'
    current_streak INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Advanced statistics view
CREATE OR REPLACE VIEW player_advanced_stats AS
SELECT 
    u.id,
    u.username,
    u.elo_rating,
    COUNT(DISTINCT pa.match_id) as matches_played,
    AVG(pa.kills) as avg_kills,
    AVG(pa.deaths) as avg_deaths,
    AVG(pa.assists) as avg_assists,
    AVG(pa.damage_dealt) as avg_damage,
    AVG(pa.accuracy) as avg_accuracy,
    SUM(CASE WHEN ta.actual_result = 'win' THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN ta.actual_result = 'loss' THEN 1 ELSE 0 END) as losses,
    ROUND(
        (SUM(CASE WHEN ta.actual_result = 'win' THEN 1 ELSE 0 END)::DECIMAL / 
         NULLIF(COUNT(DISTINCT pa.match_id), 0)) * 100, 2
    ) as win_percentage,
    AVG(ph.performance_rating) as avg_performance_rating,
    SUM(ph.mvp_votes) as total_mvp_votes
FROM users u
LEFT JOIN player_analytics pa ON u.id = pa.user_id
LEFT JOIN team_analytics ta ON pa.match_id = ta.match_id
LEFT JOIN player_performance_history ph ON u.id = ph.user_id
GROUP BY u.id, u.username, u.elo_rating;

-- Function to calculate performance rating
CREATE OR REPLACE FUNCTION calculate_performance_rating(
    p_kills INTEGER,
    p_deaths INTEGER,
    p_assists INTEGER,
    p_damage INTEGER,
    p_accuracy DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    RETURN ROUND(
        (p_kills * 3.0 + p_assists * 1.5 - p_deaths * 1.0 + 
         (p_damage / 1000.0) + (p_accuracy * 2.0)) / 5.0, 2
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update player streaks
CREATE OR REPLACE FUNCTION update_player_streaks(
    p_user_id UUID,
    p_match_result VARCHAR,
    p_was_mvp BOOLEAN
) RETURNS VOID AS $$
BEGIN
    -- Update win/loss streaks
    IF p_match_result = 'win' THEN
        UPDATE player_streaks 
        SET current_streak = current_streak + 1,
            best_streak = GREATEST(best_streak, current_streak + 1),
            last_updated = NOW()
        WHERE user_id = p_user_id AND streak_type = 'win';
        
        UPDATE player_streaks 
        SET current_streak = 0, last_updated = NOW()
        WHERE user_id = p_user_id AND streak_type = 'loss';
    ELSE
        UPDATE player_streaks 
        SET current_streak = current_streak + 1,
            best_streak = GREATEST(best_streak, current_streak + 1),
            last_updated = NOW()
        WHERE user_id = p_user_id AND streak_type = 'loss';
        
        UPDATE player_streaks 
        SET current_streak = 0, last_updated = NOW()
        WHERE user_id = p_user_id AND streak_type = 'win';
    END IF;
    
    -- Update MVP streak
    IF p_was_mvp THEN
        UPDATE player_streaks 
        SET current_streak = current_streak + 1,
            best_streak = GREATEST(best_streak, current_streak + 1),
            last_updated = NOW()
        WHERE user_id = p_user_id AND streak_type = 'mvp';
    ELSE
        UPDATE player_streaks 
        SET current_streak = 0, last_updated = NOW()
        WHERE user_id = p_user_id AND streak_type = 'mvp';
    END IF;
END;
$$ LANGUAGE plpgsql;
