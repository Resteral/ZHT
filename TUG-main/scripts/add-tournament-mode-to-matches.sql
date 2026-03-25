-- Add tournament_mode column to matches table to distinguish tournament lobbies from regular lobbies
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_mode BOOLEAN DEFAULT FALSE;

-- Add tournament_owner column to captain_drafts table to track highest ELO player as owner
ALTER TABLE captain_drafts ADD COLUMN IF NOT EXISTS tournament_owner UUID REFERENCES users(id);

-- Create index for tournament mode filtering
CREATE INDEX IF NOT EXISTS idx_matches_tournament_mode ON matches(tournament_mode);

-- Create function to automatically clean up completed tournaments
CREATE OR REPLACE FUNCTION cleanup_completed_tournaments() RETURNS void AS $$
BEGIN
  -- Delete tournament lobbies that have been completed for more than 24 hours
  DELETE FROM matches 
  WHERE tournament_mode = true 
    AND status IN ('completed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '24 hours';
    
  RAISE NOTICE 'Cleaned up completed tournament lobbies';
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job to run cleanup daily (if pg_cron is available)
-- SELECT cron.schedule('cleanup-tournaments', '0 2 * * *', 'SELECT cleanup_completed_tournaments();');

COMMENT ON COLUMN matches.tournament_mode IS 'Flag to identify tournament lobbies vs regular lobbies';
COMMENT ON COLUMN captain_drafts.tournament_owner IS 'Highest ELO player who becomes tournament owner';
COMMENT ON FUNCTION cleanup_completed_tournaments() IS 'Automatically removes completed tournament lobbies after 24 hours';
