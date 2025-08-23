-- Add missing tournament_mode column to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS tournament_mode boolean DEFAULT false;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_matches_tournament_mode ON matches(tournament_mode);

-- Update existing matches to have tournament_mode = false by default
UPDATE matches SET tournament_mode = false WHERE tournament_mode IS NULL;
