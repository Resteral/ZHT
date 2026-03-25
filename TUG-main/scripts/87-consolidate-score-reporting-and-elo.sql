-- Consolidated ELO and Score Reporting System
-- This script provides a single, robust source of truth for tournament score reporting,
-- consensus validation, ELO calculation, and prize distribution.

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
    -- ELO variables
    v_k_factor INTEGER := 32;
    v_avg_elo_team1 NUMERIC;
    v_avg_elo_team2 NUMERIC;
    v_exp_score1 NUMERIC;
    v_exp_score2 NUMERIC;
    v_elo_change1 INTEGER;
    v_elo_change2 INTEGER;
    v_actual_score1 NUMERIC;
    v_actual_score2 NUMERIC;
BEGIN
    v_user_id := auth.uid();
    
    -- 0. Check if tournament is already completed
    SELECT (status = 'completed') INTO v_is_completed FROM public.tournaments WHERE id = p_tournament_id;
    IF v_is_completed THEN
        -- If already completed, just return the consensus info
        RETURN json_build_object('success', true, 'consensus', true, 'error', 'Match already finalized');
    END IF;

    -- 1. Update the participant's report
    UPDATE public.tournament_participants
    SET reported_team1_score = p_team1_score,
        reported_team2_score = p_team2_score
    WHERE tournament_id = p_tournament_id AND user_id = v_user_id;

    -- 2. Check if all participants who are part of the match have reported
    -- (Counting total participants in the tournament)
    SELECT COUNT(*) INTO v_participant_count FROM public.tournament_participants WHERE tournament_id = p_tournament_id;
    
    -- Check how many have reported matching scores
    SELECT COUNT(*) INTO v_consensus_count FROM public.tournament_participants WHERE tournament_id = p_tournament_id
      AND reported_team1_score = p_team1_score AND reported_team2_score = p_team2_score;

    -- 3. If unanimous consensus attained
    IF v_participant_count > 0 AND v_participant_count = v_consensus_count THEN
        -- Get tournament data
        SELECT prize_pool INTO v_tournament_prize_pool FROM public.tournaments WHERE id = p_tournament_id;

        -- Identify teams by draft_order (Standardized in Script 84/85)
        SELECT id INTO v_team1_id FROM public.tournament_teams WHERE tournament_id = p_tournament_id AND (draft_order = 1 OR team_name ILIKE '%Team 1%') LIMIT 1;
        SELECT id INTO v_team2_id FROM public.tournament_teams WHERE tournament_id = p_tournament_id AND (draft_order = 2 OR team_name ILIKE '%Team 2%') LIMIT 1;

        -- Fallback if draft_order missing
        IF v_team1_id IS NULL THEN
            SELECT id INTO v_team1_id FROM public.tournament_teams WHERE tournament_id = p_tournament_id ORDER BY created_at LIMIT 1;
        END IF;
        IF v_team2_id IS NULL THEN
            SELECT id INTO v_team2_id FROM public.tournament_teams WHERE tournament_id = p_tournament_id ORDER BY created_at OFFSET 1 LIMIT 1;
        END IF;

        -- Calculate Average ELO for teams
        SELECT COALESCE(AVG(u.elo_rating), 1200) INTO v_avg_elo_team1 
        FROM public.users u 
        JOIN public.tournament_team_members tm ON u.id = tm.user_id 
        WHERE tm.team_id = v_team1_id;
        
        SELECT COALESCE(AVG(u.elo_rating), 1200) INTO v_avg_elo_team2 
        FROM public.users u 
        JOIN public.tournament_team_members tm ON u.id = tm.user_id 
        WHERE tm.team_id = v_team2_id;

        -- Expected scores
        v_exp_score1 := 1 / (1 + POWER(10, (v_avg_elo_team2 - v_avg_elo_team1) / 400.0));
        v_exp_score2 := 1 - v_exp_score1;

        -- Determine result
        IF p_team1_score > p_team2_score THEN
            v_winning_team_id := v_team1_id;
            v_actual_score1 := 1;
            v_actual_score2 := 0;
        ELSIF p_team2_score > p_team1_score THEN
            v_winning_team_id := v_team2_id;
            v_actual_score1 := 0;
            v_actual_score2 := 1;
        ELSE
            v_winning_team_id := NULL; -- Tie
            v_actual_score1 := 0.5;
            v_actual_score2 := 0.5;
        END IF;

        -- Calculate ELO changes
        v_elo_change1 := ROUND(v_k_factor * (v_actual_score1 - v_exp_score1));
        v_elo_change2 := ROUND(v_k_factor * (v_actual_score2 - v_exp_score2));

        -- Finalize tournament status
        UPDATE public.tournaments SET status = 'completed', updated_at = NOW() WHERE id = p_tournament_id;

        -- 4. Payout and ELO Updates for Team 1
        IF v_team1_id IS NOT NULL THEN
            SELECT COUNT(*) INTO v_winner_count FROM public.tournament_team_members WHERE team_id = v_team1_id;
            IF v_winner_count > 0 THEN
                v_payout_per_player := CASE 
                    WHEN v_winning_team_id = v_team1_id THEN v_tournament_prize_pool / v_winner_count
                    WHEN v_winning_team_id IS NULL THEN (v_tournament_prize_pool / 2) / v_winner_count
                    ELSE 0
                END;

                FOR v_record IN SELECT user_id FROM public.tournament_team_members WHERE team_id = v_team1_id LOOP
                    UPDATE public.users SET 
                        balance = balance + v_payout_per_player,
                        elo_rating = elo_rating + v_elo_change1,
                        updated_at = NOW()
                    WHERE id = v_record.user_id;

                    IF v_payout_per_player > 0 THEN
                        -- Primary transaction table from Script 36
                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions') THEN
                            INSERT INTO public.financial_transactions (user_id, amount, transaction_type, status, description, processed_at)
                            VALUES (v_record.user_id, v_payout_per_player, 'prize_payout', 'completed', 'Consensus prize for team 1', NOW());
                        ELSEIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
                            INSERT INTO public.transactions (user_id, amount, type, status, description, created_at)
                            VALUES (v_record.user_id, v_payout_per_player, 'arena_prize', 'completed', 'Consensus prize for team 1', NOW());
                        END IF;
                    END IF;
                END LOOP;
            END IF;
        END IF;

        -- 5. Payout and ELO Updates for Team 2
        IF v_team2_id IS NOT NULL THEN
            SELECT COUNT(*) INTO v_winner_count FROM public.tournament_team_members WHERE team_id = v_team2_id;
            IF v_winner_count > 0 THEN
                v_payout_per_player := CASE 
                    WHEN v_winning_team_id = v_team2_id THEN v_tournament_prize_pool / v_winner_count
                    WHEN v_winning_team_id IS NULL THEN (v_tournament_prize_pool / 2) / v_winner_count
                    ELSE 0
                END;

                FOR v_record IN SELECT user_id FROM public.tournament_team_members WHERE team_id = v_team2_id LOOP
                    UPDATE public.users SET 
                        balance = balance + v_payout_per_player,
                        elo_rating = elo_rating + v_elo_change2,
                        updated_at = NOW()
                    WHERE id = v_record.user_id;

                    IF v_payout_per_player > 0 THEN
                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions') THEN
                            INSERT INTO public.financial_transactions (user_id, amount, transaction_type, status, description, processed_at)
                            VALUES (v_record.user_id, v_payout_per_player, 'prize_payout', 'completed', 'Consensus prize for team 2', NOW());
                        ELSEIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
                            INSERT INTO public.transactions (user_id, amount, type, status, description, created_at)
                            VALUES (v_record.user_id, v_payout_per_player, 'arena_prize', 'completed', 'Consensus prize for team 2', NOW());
                        END IF;
                    END IF;
                END LOOP;
            END IF;
        END IF;

        RETURN json_build_object(
            'success', true, 
            'consensus', true, 
            'elo_change_team1', v_elo_change1, 
            'elo_change_team2', v_elo_change2
        );
    END IF;

    -- No consensus yet
    RETURN json_build_object('success', true, 'consensus', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION report_tournament_score(UUID, INTEGER, INTEGER) IS 
'Records user score reports and automatically finalizes matches upon unanimous consensus, calculating ELO and distributing prizes.';
