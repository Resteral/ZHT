-- Create comprehensive scoring and MVP system for matches

-- Table for storing match scores submitted by players
CREATE TABLE IF NOT EXISTS match_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team1_score INTEGER NOT NULL CHECK (team1_score >= 0),
    team2_score INTEGER NOT NULL CHECK (team2_score >= 0),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id, player_id)
);

-- Table for MVP votes
CREATE TABLE IF NOT EXISTS mvp_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mvp_player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id, voter_id)
);

-- Table for player flags/reports
CREATE TABLE IF NOT EXISTS player_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flagged_player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL CHECK (flag_type IN ('afk', 'toxicity', 'griefing', 'cheating')),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(match_id, reporter_id, flagged_player_id, flag_type)
);

-- Table for tracking MVP awards on player profiles
CREATE TABLE IF NOT EXISTS player_mvp_awards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    awarded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(player_id, match_id)
);

-- Table for tracking player flags/badges
CREATE TABLE IF NOT EXISTS player_flag_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flag_type TEXT NOT NULL CHECK (flag_type IN ('afk', 'toxicity', 'griefing', 'cheating')),
    flag_count INTEGER DEFAULT 0,
    last_flagged TIMESTAMP WITH TIME ZONE,
    UNIQUE(player_id, flag_type)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_scores_match_id ON match_scores(match_id);
CREATE INDEX IF NOT EXISTS idx_mvp_votes_match_id ON mvp_votes(match_id);
CREATE INDEX IF NOT EXISTS idx_player_flags_match_id ON player_flags(match_id);
CREATE INDEX IF NOT EXISTS idx_player_mvp_awards_player_id ON player_mvp_awards(player_id);
CREATE INDEX IF NOT EXISTS idx_player_flag_summary_player_id ON player_flag_summary(player_id);

-- Function to submit match score
CREATE OR REPLACE FUNCTION submit_match_score(
    p_match_id UUID,
    p_player_id UUID,
    p_team1_score INTEGER,
    p_team2_score INTEGER
) RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Insert or update the score
    INSERT INTO match_scores (match_id, player_id, team1_score, team2_score)
    VALUES (p_match_id, p_player_id, p_team1_score, p_team2_score)
    ON CONFLICT (match_id, player_id)
    DO UPDATE SET 
        team1_score = EXCLUDED.team1_score,
        team2_score = EXCLUDED.team2_score,
        submitted_at = NOW();
    
    result := json_build_object(
        'success', true,
        'message', 'Score submitted successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to vote for MVP
CREATE OR REPLACE FUNCTION vote_for_mvp(
    p_match_id UUID,
    p_voter_id UUID,
    p_mvp_player_id UUID
) RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Insert or update the MVP vote
    INSERT INTO mvp_votes (match_id, voter_id, mvp_player_id)
    VALUES (p_match_id, p_voter_id, p_mvp_player_id)
    ON CONFLICT (match_id, voter_id)
    DO UPDATE SET 
        mvp_player_id = EXCLUDED.mvp_player_id,
        voted_at = NOW();
    
    result := json_build_object(
        'success', true,
        'message', 'MVP vote submitted successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to flag a player
CREATE OR REPLACE FUNCTION flag_player(
    p_match_id UUID,
    p_reporter_id UUID,
    p_flagged_player_id UUID,
    p_flag_type TEXT,
    p_description TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    -- Insert the flag
    INSERT INTO player_flags (match_id, reporter_id, flagged_player_id, flag_type, description)
    VALUES (p_match_id, p_reporter_id, p_flagged_player_id, p_flag_type, p_description)
    ON CONFLICT (match_id, reporter_id, flagged_player_id, flag_type) DO NOTHING;
    
    -- Update flag summary
    INSERT INTO player_flag_summary (player_id, flag_type, flag_count, last_flagged)
    VALUES (p_flagged_player_id, p_flag_type, 1, NOW())
    ON CONFLICT (player_id, flag_type)
    DO UPDATE SET 
        flag_count = player_flag_summary.flag_count + 1,
        last_flagged = NOW();
    
    result := json_build_object(
        'success', true,
        'message', 'Player flagged successfully'
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to finalize match scoring
CREATE OR REPLACE FUNCTION finalize_match_scoring(
    p_match_id UUID
) RETURNS JSON AS $$
DECLARE
    total_participants INTEGER;
    total_scores INTEGER;
    consensus_score RECORD;
    mvp_winner RECORD;
    result JSON;
BEGIN
    -- Get total participants
    SELECT COUNT(*) INTO total_participants
    FROM match_participants
    WHERE match_id = p_match_id;
    
    -- Get total scores submitted
    SELECT COUNT(*) INTO total_scores
    FROM match_scores
    WHERE match_id = p_match_id;
    
    -- Check if majority of players have submitted scores
    IF total_scores < (total_participants / 2) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not enough scores submitted'
        );
    END IF;
    
    -- Find consensus score (most common score combination)
    SELECT team1_score, team2_score, COUNT(*) as vote_count
    INTO consensus_score
    FROM match_scores
    WHERE match_id = p_match_id
    GROUP BY team1_score, team2_score
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Check if consensus reached (majority agreement)
    IF consensus_score.vote_count < (total_scores / 2) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'No consensus on match score'
        );
    END IF;
    
    -- Check for unanimous MVP selection
    SELECT mvp_player_id, COUNT(*) as vote_count
    INTO mvp_winner
    FROM mvp_votes
    WHERE match_id = p_match_id
    GROUP BY mvp_player_id
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    -- Check if MVP is unanimous
    IF mvp_winner.vote_count != total_participants THEN
        RETURN json_build_object(
            'success', false,
            'error', 'MVP selection must be unanimous'
        );
    END IF;
    
    -- Award MVP
    INSERT INTO player_mvp_awards (player_id, match_id)
    VALUES (mvp_winner.mvp_player_id, p_match_id)
    ON CONFLICT (player_id, match_id) DO NOTHING;
    
    -- Update match with final score
    UPDATE matches 
    SET 
        status = 'completed',
        updated_at = NOW()
    WHERE id = p_match_id;
    
    result := json_build_object(
        'success', true,
        'message', 'Match scoring finalized',
        'final_score', json_build_object(
            'team1_score', consensus_score.team1_score,
            'team2_score', consensus_score.team2_score
        ),
        'mvp_player_id', mvp_winner.mvp_player_id
    );
    
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get match scoring status
CREATE OR REPLACE FUNCTION get_match_scoring_status(
    p_match_id UUID
) RETURNS JSON AS $$
DECLARE
    total_participants INTEGER;
    scores_submitted INTEGER;
    mvp_votes_submitted INTEGER;
    result JSON;
BEGIN
    -- Get participant count
    SELECT COUNT(*) INTO total_participants
    FROM match_participants
    WHERE match_id = p_match_id;
    
    -- Get scores submitted
    SELECT COUNT(*) INTO scores_submitted
    FROM match_scores
    WHERE match_id = p_match_id;
    
    -- Get MVP votes submitted
    SELECT COUNT(*) INTO mvp_votes_submitted
    FROM mvp_votes
    WHERE match_id = p_match_id;
    
    result := json_build_object(
        'total_participants', total_participants,
        'scores_submitted', scores_submitted,
        'mvp_votes_submitted', mvp_votes_submitted,
        'scores_needed', total_participants,
        'mvp_votes_needed', total_participants,
        'can_finalize', (scores_submitted >= total_participants AND mvp_votes_submitted >= total_participants)
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON match_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE ON mvp_votes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON player_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE ON player_mvp_awards TO authenticated;
GRANT SELECT, INSERT, UPDATE ON player_flag_summary TO authenticated;

GRANT EXECUTE ON FUNCTION submit_match_score TO authenticated;
GRANT EXECUTE ON FUNCTION vote_for_mvp TO authenticated;
GRANT EXECUTE ON FUNCTION flag_player TO authenticated;
GRANT EXECUTE ON FUNCTION finalize_match_scoring TO authenticated;
GRANT EXECUTE ON FUNCTION get_match_scoring_status TO authenticated;
