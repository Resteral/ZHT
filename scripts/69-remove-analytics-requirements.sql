-- Remove analytics system and fix CSV code requirement
-- Make csv_code nullable in score_submissions table
ALTER TABLE score_submissions ALTER COLUMN csv_code DROP NOT NULL;

-- Drop analytics tables if they exist
DROP TABLE IF EXISTS match_analytics CASCADE;
DROP TABLE IF EXISTS team_analytics CASCADE;
DROP TABLE IF EXISTS csv_analytics_data CASCADE;
DROP TABLE IF EXISTS csv_upload_sessions CASCADE;

-- Drop the CSV parsing function
DROP FUNCTION IF EXISTS parse_and_store_csv_analytics(UUID, TEXT);

-- Remove analytics-related indexes
DROP INDEX IF EXISTS idx_match_analytics_match_id;
DROP INDEX IF EXISTS idx_match_analytics_player_id;
DROP INDEX IF EXISTS idx_team_analytics_match_id;
DROP INDEX IF EXISTS idx_csv_analytics_account_id;
DROP INDEX IF EXISTS idx_csv_analytics_user_id;
DROP INDEX IF EXISTS idx_csv_analytics_session;
DROP INDEX IF EXISTS idx_csv_upload_sessions_user;
DROP INDEX IF EXISTS idx_csv_upload_sessions_status;
