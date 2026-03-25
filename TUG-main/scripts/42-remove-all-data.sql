-- Comprehensive data removal script
-- This script removes all data from tables while preserving structure

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Clear all data from tables if they exist
DO $$ 
DECLARE
    t_name TEXT;
    tables_to_clear TEXT[] := ARRAY[
        'match_participants', 'wager_match_participants', 'tournament_participants', 
        'auction_draft_participants', 'team_members', 'team_invitations', 
        'betting_markets', 'user_bets', 'announcements', 'user_achievements', 
        'match_history', 'player_statistics', 'draft_chat', 'system_alerts', 
        'admin_logs', 'matches', 'wager_matches', 'tournaments', 
        'auction_drafts', 'teams', 'games', 'venues', 'leagues', 'seasons',
        'user_wallets', 'profiles', 'users'
    ];
BEGIN
    FOREACH t_name IN ARRAY tables_to_clear LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t_name AND table_schema = 'public') THEN
            EXECUTE 'TRUNCATE TABLE public.' || quote_ident(t_name) || ' CASCADE';
        END IF;
    END LOOP;
END $$;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Log the data removal if the admin log table and action column exist
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'admin_activity_log' AND column_name = 'action') THEN
        INSERT INTO public.admin_activity_log (action, details) 
        VALUES ('DATA_REMOVAL', 'All data removed from database');
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_logs' AND table_schema = 'public') THEN
        INSERT INTO public.admin_logs (action, details, created_at) 
        VALUES ('DATA_REMOVAL', 'All data removed from database', NOW());
    END IF;
END $$;
