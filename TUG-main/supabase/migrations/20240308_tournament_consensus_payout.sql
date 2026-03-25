-- Atomic RPC for consensus-based score reporting and payouts
CREATE OR REPLACE FUNCTION report_tournament_score(
    p_tournament_id UUID,
    p_team1_score INTEGER,
    p_team2_score INTEGER
) RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_participant_count INTEGER;
    v_consensus_count INTEGER;
    v_tournament_prize_pool NUMERIC;
    v_winning_team_id UUID;
    v_winner_count INTEGER;
    v_payout_per_player NUMERIC;
    v_team1_id UUID;
    v_team2_id UUID;
    v_record RECORD;
    v_is_completed BOOLEAN;
BEGIN
    v_user_id := auth.uid();
    
    -- 0. Check if tournament is already completed
    SELECT (status = 'completed') INTO v_is_completed FROM tournaments WHERE id = p_tournament_id;
    IF v_is_completed THEN
        RETURN json_build_object('success', false, 'error', 'Tournament already completed');
    END IF;

    -- 1. Update the participant's report
    UPDATE tournament_participants
    SET reported_team1_score = p_team1_score,
        reported_team2_score = p_team2_score
    WHERE tournament_id = p_tournament_id AND user_id = v_user_id;

    -- 2. Check if all participants have reported and if they agree
    SELECT COUNT(*) INTO v_participant_count
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id;

    SELECT COUNT(*) INTO v_consensus_count
    FROM tournament_participants
    WHERE tournament_id = p_tournament_id
      AND reported_team1_score = p_team1_score
      AND reported_team2_score = p_team2_score;

    -- 3. If unanimous consensus
    IF v_participant_count > 0 AND v_participant_count = v_consensus_count THEN
        -- Get tournament data
        SELECT prize_pool INTO v_tournament_prize_pool
        FROM tournaments WHERE id = p_tournament_id;

        -- Identify teams (Assuming Team 1 is the first one created, Team 2 is the second)
        SELECT id INTO v_team1_id FROM tournament_teams WHERE tournament_id = p_tournament_id ORDER BY created_at LIMIT 1;
        SELECT id INTO v_team2_id FROM tournament_teams WHERE tournament_id = p_tournament_id ORDER BY created_at OFFSET 1 LIMIT 1;

        IF p_team1_score > p_team2_score THEN
            v_winning_team_id := v_team1_id;
        ELSIF p_team2_score > p_team1_score THEN
            v_winning_team_id := v_team2_id;
        ELSE
            -- Tie? Handle as split prize
            v_winning_team_id := NULL; -- Signifies a split
        END IF;

        -- Update tournament status
        UPDATE tournaments SET status = 'completed', updated_at = NOW() WHERE id = p_tournament_id;

        IF v_winning_team_id IS NOT NULL THEN
            -- Payout to winning team
            SELECT COUNT(*) INTO v_winner_count FROM tournament_team_members WHERE team_id = v_winning_team_id;
            
            IF v_winner_count > 0 THEN
                v_payout_per_player := v_tournament_prize_pool / v_winner_count;

                FOR v_record IN SELECT user_id FROM tournament_team_members WHERE team_id = v_winning_team_id LOOP
                    -- Atomic increment balance
                    UPDATE users SET balance = balance + v_payout_per_player WHERE id = v_record.user_id;
                    
                    -- Log transaction
                    INSERT INTO transactions (user_id, amount, type, provider, status, external_id)
                    VALUES (v_record.user_id, v_payout_per_player, 'tournament_payout', 'platform', 'completed', 'tournament_payout_' || p_tournament_id);
                END LOOP;
            END IF;
        ELSE
            -- Split prize for tie (split between all participants)
            v_payout_per_player := v_tournament_prize_pool / v_participant_count;
            FOR v_record IN SELECT user_id FROM tournament_participants WHERE tournament_id = p_tournament_id LOOP
                UPDATE users SET balance = balance + v_payout_per_player WHERE id = v_record.user_id;
                
                INSERT INTO transactions (user_id, amount, type, provider, status, external_id)
                VALUES (v_record.user_id, v_payout_per_player, 'tournament_payout', 'platform', 'completed', 'tournament_payout_tie_' || p_tournament_id);
            END LOOP;
        END IF;

        RETURN json_build_object('success', true, 'consensus', true);
    END IF;

    RETURN json_build_object('success', true, 'consensus', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
