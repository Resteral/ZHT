-- Comprehensive data removal script
-- This script removes all data from tables while preserving structure

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Clear all data from tables in dependency order
TRUNCATE TABLE match_participants CASCADE;
TRUNCATE TABLE wager_match_participants CASCADE;
TRUNCATE TABLE tournament_participants CASCADE;
TRUNCATE TABLE auction_draft_participants CASCADE;
TRUNCATE TABLE team_members CASCADE;
TRUNCATE TABLE team_invitations CASCADE;
TRUNCATE TABLE betting_markets CASCADE;
TRUNCATE TABLE user_bets CASCADE;
TRUNCATE TABLE announcements CASCADE;
TRUNCATE TABLE user_achievements CASCADE;
TRUNCATE TABLE match_history CASCADE;
TRUNCATE TABLE player_statistics CASCADE;
TRUNCATE TABLE draft_chat CASCADE;
TRUNCATE TABLE system_alerts CASCADE;
TRUNCATE TABLE admin_logs CASCADE;

-- Clear main entity tables
TRUNCATE TABLE matches CASCADE;
TRUNCATE TABLE wager_matches CASCADE;
TRUNCATE TABLE tournaments CASCADE;
TRUNCATE TABLE auction_drafts CASCADE;
TRUNCATE TABLE teams CASCADE;
TRUNCATE TABLE games CASCADE;
TRUNCATE TABLE venues CASCADE;
TRUNCATE TABLE leagues CASCADE;
TRUNCATE TABLE seasons CASCADE;

-- Clear user-related data (keep users table structure but clear data)
TRUNCATE TABLE user_wallets CASCADE;
TRUNCATE TABLE profiles CASCADE;
TRUNCATE TABLE users CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences to start from 1
-- (Add sequence resets if needed for any serial columns)

-- Log the data removal
INSERT INTO admin_logs (action, details, created_at) 
VALUES ('DATA_REMOVAL', 'All data removed from database', NOW());
