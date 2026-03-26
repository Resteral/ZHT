-- Creating comprehensive database reset script to wipe everything to default
-- Reset all user statistics to default values
DO $$ 
BEGIN
    UPDATE users SET 
      elo_rating = 1200,
      mmr = 1200,
      total_games = 0,
      wins = 0,
      losses = 0,
      balance = 0.00,
      updated_at = NOW()
    WHERE id IS NOT NULL;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Could not reset user stats';
END $$;

-- Function to safely delete from table if it exists
CREATE OR REPLACE FUNCTION safe_delete_from(table_name_param TEXT)
RETURNS VOID AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name_param) THEN
        EXECUTE format('DELETE FROM %I', table_name_param);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Perform safe deletions across all platform tables
SELECT safe_delete_from('match_results');
SELECT safe_delete_from('match_scores');
SELECT safe_delete_from('score_submissions');
SELECT safe_delete_from('match_participants');
SELECT safe_delete_from('match_analytics');
SELECT safe_delete_from('player_analytics');
SELECT safe_delete_from('team_analytics');
SELECT safe_delete_from('csv_processing_logs');
SELECT safe_delete_from('elo_history');
SELECT safe_delete_from('bets');
SELECT safe_delete_from('betting_markets');
SELECT safe_delete_from('auction_bets');
SELECT safe_delete_from('draft_bids');
SELECT safe_delete_from('captain_draft_participants');
SELECT safe_delete_from('captain_drafts');
SELECT safe_delete_from('auction_draft_bids');
SELECT safe_delete_from('auction_drafts');
SELECT safe_delete_from('auction_league_participants');
SELECT safe_delete_from('auction_leagues');
SELECT safe_delete_from('league_memberships');
SELECT safe_delete_from('league_standings');
SELECT safe_delete_from('leagues');
SELECT safe_delete_from('matches');
SELECT safe_delete_from('player_performances');
SELECT safe_delete_from('player_mvp_awards');
SELECT safe_delete_from('mvp_votes');
SELECT safe_delete_from('financial_transactions');
SELECT safe_delete_from('user_wallets');
SELECT safe_delete_from('wager_match_results');
SELECT safe_delete_from('wager_match_transactions');
SELECT safe_delete_from('wager_matches');
SELECT safe_delete_from('team_battles');
SELECT safe_delete_from('team_rosters');
SELECT safe_delete_from('games');
SELECT safe_delete_from('schedules');
SELECT safe_delete_from('stat_imports');
SELECT safe_delete_from('player_flags');
SELECT safe_delete_from('player_flag_summary');
SELECT safe_delete_from('user_reports');
SELECT safe_delete_from('moderation_queue');
SELECT safe_delete_from('profile_interactions');
SELECT safe_delete_from('profile_views');
SELECT safe_delete_from('announcements');
SELECT safe_delete_from('system_alerts');
SELECT safe_delete_from('backup_logs');
SELECT safe_delete_from('platform_statistics');
SELECT safe_delete_from('scheduled_auctions');

-- Drop the helper function
DROP FUNCTION safe_delete_from(TEXT);

-- Reset premade teams to available
DO $$ 
BEGIN
    UPDATE premade_teams SET available = true WHERE id IS NOT NULL;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Could not reset premade teams';
END $$;

-- Log the reset operation if log table exists
DO $$ 
DECLARE
    admin_id_val UUID;
    has_ip_column BOOLEAN;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_activity_log') THEN
        -- Safely get admin ID from public.users
        SELECT id INTO admin_id_val FROM users WHERE username = 'admin' LIMIT 1;
        
        -- Check if ip_address column exists
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'admin_activity_log' AND column_name = 'ip_address'
        ) INTO has_ip_column;

        IF admin_id_val IS NOT NULL THEN
            IF has_ip_column THEN
                INSERT INTO admin_activity_log (
                  id, admin_user_id, action_type, target_type, description, created_at, ip_address
                ) VALUES (
                  gen_random_uuid(), admin_id_val, 'SYSTEM_RESET', 'DATABASE', 
                  'Complete database reset to default state', NOW(), '127.0.0.1'::inet
                );
            ELSE
                INSERT INTO admin_activity_log (
                  id, admin_user_id, action_type, target_type, description, created_at, metadata
                ) VALUES (
                  gen_random_uuid(), admin_id_val, 'SYSTEM_RESET', 'DATABASE', 
                  'Complete database reset to default state', NOW(), '{"ip": "127.0.0.1"}'::jsonb
                );
            END IF;
        END IF;
    END IF;
END $$;
