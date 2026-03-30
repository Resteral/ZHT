-- Add missing columns for consensus-based score reporting to tournament_participants
-- This is required for report_tournament_score and teammate synergy analytics.

ALTER TABLE public.tournament_participants 
ADD COLUMN IF NOT EXISTS reported_team1_score INTEGER,
ADD COLUMN IF NOT EXISTS reported_team2_score INTEGER,
ADD COLUMN IF NOT EXISTS reported_csv_code TEXT;

-- Index for consensus performance
CREATE INDEX IF NOT EXISTS idx_tournament_participants_scores 
ON public.tournament_participants(tournament_id, reported_team1_score, reported_team2_score);
-- User Account Linking and CSV Stats Enhancements
-- 1. Add account_id to users for external account linking (StarCraft/Zealot Hockey)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_users_account_id ON public.users(account_id);

-- 2. Add csv_code to tournament_participants for score reporting
ALTER TABLE public.tournament_participants ADD COLUMN IF NOT EXISTS reported_csv_code TEXT;

-- 3. Update report_tournament_score to handle CSV data
CREATE OR REPLACE FUNCTION report_tournament_score(
    p_tournament_id UUID,
    p_team1_score INTEGER,
    p_team2_score INTEGER,
    p_csv_code TEXT DEFAULT NULL
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
        RETURN json_build_object('success', true, 'consensus', true, 'error', 'Match already finalized');
    END IF;

    -- 1. Update the participant's report AND store CSV if provided
    UPDATE public.tournament_participants
    SET reported_team1_score = p_team1_score,
        reported_team2_score = p_team2_score,
        reported_csv_code = COALESCE(p_csv_code, reported_csv_code)
    WHERE tournament_id = p_tournament_id AND user_id = v_user_id;

    -- 2. Check for consensus
    SELECT COUNT(*) INTO v_participant_count FROM public.tournament_participants WHERE tournament_id = p_tournament_id;
    SELECT COUNT(*) INTO v_consensus_count FROM public.tournament_participants WHERE tournament_id = p_tournament_id
      AND reported_team1_score = p_team1_score AND reported_team2_score = p_team2_score;

    -- 3. If unanimous consensus attained
    IF v_participant_count > 0 AND v_participant_count = v_consensus_count THEN
        -- Get tournament data
        SELECT prize_pool INTO v_tournament_prize_pool FROM public.tournaments WHERE id = p_tournament_id;

        -- Identify teams by draft_order
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
                    -- Record Match History (before ELO update to capture elo_before)
                    INSERT INTO public.match_history (
                        player_id, opponent_id, game, match_type, tournament_id, 
                        result, player_score, opponent_score, elo_before, elo_after, elo_change, match_date
                    )
                    SELECT 
                        v_record.user_id, 
                        (SELECT user_id FROM public.tournament_team_members WHERE team_id = v_team2_id LIMIT 1), 
                        'Zealot Hockey', 'tournament', p_tournament_id,
                        CASE WHEN v_winning_team_id = v_team1_id THEN 'win' WHEN v_winning_team_id IS NULL THEN 'draw' ELSE 'loss' END,
                        p_team1_score, p_team2_score,
                        u.elo_rating,
                        u.elo_rating + v_elo_change1,
                        v_elo_change1, NOW()
                    FROM public.users u WHERE u.id = v_record.user_id;

                    -- Update user balance and ELO
                    UPDATE public.users SET 
                        balance = balance + v_payout_per_player,
                        elo_rating = elo_rating + v_elo_change1,
                        updated_at = NOW()
                    WHERE id = v_record.user_id;

                    IF v_payout_per_player > 0 THEN
                        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_transactions') THEN
                            INSERT INTO public.financial_transactions (user_id, amount, transaction_type, status, description, processed_at)
                            VALUES (v_record.user_id, v_payout_per_player, 'prize_payout', 'completed', 'Consensus prize for team 1', NOW());
                        ELSEIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
                            INSERT INTO public.transactions (user_id, amount, type, provider, status, external_id, created_at)
                            VALUES (v_record.user_id, v_payout_per_player, 'wager_payout', 'platform', 'completed', 'tournament_payout_' || p_tournament_id, NOW());
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
                    -- Record Match History
                    INSERT INTO public.match_history (
                        player_id, opponent_id, game, match_type, tournament_id, 
                        result, player_score, opponent_score, elo_before, elo_after, elo_change, match_date
                    )
                    SELECT 
                        v_record.user_id, 
                        (SELECT user_id FROM public.tournament_team_members WHERE team_id = v_team1_id LIMIT 1), 
                        'Zealot Hockey', 'tournament', p_tournament_id,
                        CASE WHEN v_winning_team_id = v_team2_id THEN 'win' WHEN v_winning_team_id IS NULL THEN 'draw' ELSE 'loss' END,
                        p_team2_score, p_team1_score,
                        u.elo_rating,
                        u.elo_rating + v_elo_change2,
                        v_elo_change2, NOW()
                    FROM public.users u WHERE u.id = v_record.user_id;

                    -- Update user balance and ELO
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
                            INSERT INTO public.transactions (user_id, amount, type, provider, status, external_id, created_at)
                            VALUES (v_record.user_id, v_payout_per_player, 'wager_payout', 'platform', 'completed', 'tournament_payout_' || p_tournament_id, NOW());
                        END IF;
                    END IF;
                END LOOP;
            END IF;
        END IF;

        -- 6. Trigger CSV Analytics if present (Enabled in Script 68)
        IF p_csv_code IS NOT NULL AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'parse_and_store_csv_analytics') THEN
            PERFORM parse_and_store_csv_analytics(p_tournament_id, p_csv_code);
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

COMMENT ON COLUMN public.users.account_id IS 'External account handle for games (Zealot Hockey/SC2 ID)';
COMMENT ON COLUMN public.tournament_participants.reported_csv_code IS 'Optional CSV statistical data submitted by-participant at match end';
-- Create tables for storing parsed CSV analytical data for stat tracking
DROP TABLE IF EXISTS match_analytics CASCADE;
DROP TABLE IF EXISTS team_analytics CASCADE;
DROP TABLE IF EXISTS player_analytics CASCADE;

CREATE TABLE IF NOT EXISTS match_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  damage_dealt INTEGER DEFAULT 0,
  damage_taken INTEGER DEFAULT 0,
  healing_done INTEGER DEFAULT 0,
  objective_score INTEGER DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) DEFAULT 0,
  headshot_percentage DECIMAL(5,2) DEFAULT 0,
  time_alive INTEGER DEFAULT 0, -- in seconds
  items_collected INTEGER DEFAULT 0,
  abilities_used INTEGER DEFAULT 0,
  distance_traveled INTEGER DEFAULT 0,
  raw_csv_data TEXT, -- store original CSV for reference
  parsed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_number INTEGER NOT NULL, -- 1 or 2
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  total_damage INTEGER DEFAULT 0,
  total_healing INTEGER DEFAULT 0,
  objectives_completed INTEGER DEFAULT 0,
  team_score INTEGER DEFAULT 0,
  match_duration INTEGER DEFAULT 0, -- in seconds
  victory BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_match_analytics_match_id ON match_analytics(match_id);
CREATE INDEX IF NOT EXISTS idx_match_analytics_player_id ON match_analytics(player_id);
CREATE INDEX IF NOT EXISTS idx_team_analytics_match_id ON team_analytics(match_id);

-- Function to parse CSV data and store analytics
DROP FUNCTION IF EXISTS parse_and_store_csv_analytics(UUID, TEXT) CASCADE;
CREATE OR REPLACE FUNCTION parse_and_store_csv_analytics(
  p_match_id UUID,
  p_csv_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  csv_lines TEXT[];
  line_data TEXT[];
  player_record RECORD;
  team1_score INTEGER := 0;
  team2_score INTEGER := 0;
  match_duration INTEGER := 0;
BEGIN
  -- Split CSV into lines
  csv_lines := string_to_array(p_csv_code, E'\n');
  
  -- Skip header line and process data lines
  FOR i IN 2..array_length(csv_lines, 1) LOOP
    IF csv_lines[i] IS NOT NULL AND trim(csv_lines[i]) != '' THEN
      -- Split line by comma
      line_data := string_to_array(csv_lines[i], ',');
      
      -- Ensure we have enough columns (adjust based on your CSV format)
      IF array_length(line_data, 1) >= 10 THEN
        -- Insert player analytics (adjust column mapping as needed)
        INSERT INTO match_analytics (
          match_id,
          player_id,
          kills,
          deaths,
          assists,
          damage_dealt,
          damage_taken,
          healing_done,
          objective_score,
          accuracy_percentage,
          raw_csv_data
        ) VALUES (
          p_match_id,
          (SELECT id FROM users WHERE username = trim(line_data[1]) LIMIT 1),
          COALESCE(line_data[2]::INTEGER, 0),
          COALESCE(line_data[3]::INTEGER, 0),
          COALESCE(line_data[4]::INTEGER, 0),
          COALESCE(line_data[5]::INTEGER, 0),
          COALESCE(line_data[6]::INTEGER, 0),
          COALESCE(line_data[7]::INTEGER, 0),
          COALESCE(line_data[8]::INTEGER, 0),
          COALESCE(line_data[9]::DECIMAL, 0),
          p_csv_code
        );
      END IF;
    END IF;
  END LOOP;
  
  -- Calculate team analytics from individual player data
  INSERT INTO team_analytics (match_id, team_number, total_kills, total_deaths, total_damage, total_healing)
  SELECT 
    p_match_id,
    1 as team_number,
    SUM(ma.kills),
    SUM(ma.deaths),
    SUM(ma.damage_dealt),
    SUM(ma.healing_done)
  FROM match_analytics ma
  JOIN match_participants mp ON ma.player_id = mp.user_id
  WHERE ma.match_id = p_match_id AND mp.match_id = p_match_id AND mp.team_id = 1;
  
  INSERT INTO team_analytics (match_id, team_number, total_kills, total_deaths, total_damage, total_healing)
  SELECT 
    p_match_id,
    2 as team_number,
    SUM(ma.kills),
    SUM(ma.deaths),
    SUM(ma.damage_dealt),
    SUM(ma.healing_done)
  FROM match_analytics ma
  JOIN match_participants mp ON ma.player_id = mp.user_id
  WHERE ma.match_id = p_match_id AND mp.match_id = p_match_id AND mp.team_id = 2;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
-- Teammate Performance Analytics (Synergy & Friction)
-- This script provides views to analyze player performance correlations.

-- 1. Flattened view of all teammate pairings in matches
CREATE OR REPLACE VIEW v_teammate_pairings AS
SELECT 
    tm1.user_id as player_id,
    tm2.user_id as teammate_id,
    tm1.team_id,
    t.id as tournament_id,
    t.name as tournament_name,
    CASE 
        WHEN t.status = 'completed' AND (
            (p1.reported_team1_score > p1.reported_team2_score AND tt.draft_order = 1) OR
            (p1.reported_team2_score > p1.reported_team1_score AND tt.draft_order = 2)
        ) THEN 'win'
        WHEN t.status = 'completed' AND p1.reported_team1_score = p1.reported_team2_score THEN 'draw'
        ELSE 'loss'
    END as match_result,
    t.end_date as match_date
FROM tournament_team_members tm1
JOIN tournament_team_members tm2 ON tm1.team_id = tm2.team_id AND tm1.user_id != tm2.user_id
JOIN tournament_teams tt ON tm1.team_id = tt.id
JOIN tournaments t ON tt.tournament_id = t.id
JOIN tournament_participants p1 ON tm1.user_id = p1.user_id AND p1.tournament_id = t.id
WHERE t.status = 'completed';

-- 2. Aggregated Synergy & Friction Stats
CREATE OR REPLACE VIEW v_player_synergy_stats AS
SELECT 
    tp.player_id,
    tp.teammate_id,
    COUNT(*) as games_played,
    COUNT(*) FILTER (WHERE tp.match_result = 'win') as wins,
    COUNT(*) FILTER (WHERE tp.match_result = 'loss') as losses,
    ROUND((COUNT(*) FILTER (WHERE tp.match_result = 'win'))::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) as win_rate,
    AVG(mh.elo_change) as avg_elo_gain
FROM v_teammate_pairings tp
LEFT JOIN match_history mh ON tp.player_id = mh.player_id AND tp.tournament_id = mh.tournament_id
GROUP BY tp.player_id, tp.teammate_id;

-- 3. Top Synergy Partners
CREATE OR REPLACE VIEW v_top_synergy_partners AS
SELECT 
    u1.username as player,
    u2.username as teammate,
    ss.games_played,
    ss.win_rate,
    ss.avg_elo_gain
FROM v_player_synergy_stats ss
JOIN users u1 ON ss.player_id = u1.id
JOIN users u2 ON ss.teammate_id = u2.id
WHERE ss.games_played >= 2
ORDER BY ss.win_rate DESC, ss.avg_elo_gain DESC;

-- 4. Highest Friction Partners
CREATE OR REPLACE VIEW v_highest_friction_partners AS
SELECT 
    u1.username as player,
    u2.username as teammate,
    ss.games_played,
    ss.win_rate,
    ss.avg_elo_gain
FROM v_player_synergy_stats ss
JOIN users u1 ON ss.player_id = u1.id
JOIN users u2 ON ss.teammate_id = u2.id
WHERE ss.games_played >= 2
ORDER BY ss.win_rate ASC, ss.avg_elo_gain ASC;
