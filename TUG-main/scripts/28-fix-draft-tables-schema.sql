-- Fix captain draft tables to use consistent draft_id references
-- Update captain_draft_participants table
ALTER TABLE captain_draft_participants 
DROP CONSTRAINT IF EXISTS captain_draft_participants_league_id_fkey;

ALTER TABLE captain_draft_participants 
ADD CONSTRAINT captain_draft_participants_draft_id_fkey 
FOREIGN KEY (draft_id) REFERENCES captain_drafts(id) ON DELETE CASCADE;

-- Update captain_draft_rosters table
ALTER TABLE captain_draft_rosters 
DROP CONSTRAINT IF EXISTS captain_draft_rosters_league_id_fkey;

ALTER TABLE captain_draft_rosters 
ADD CONSTRAINT captain_draft_rosters_draft_id_fkey 
FOREIGN KEY (draft_id) REFERENCES captain_drafts(id) ON DELETE CASCADE;

-- Update captain_draft_picks table
ALTER TABLE captain_draft_picks 
DROP CONSTRAINT IF EXISTS captain_draft_picks_league_id_fkey;

ALTER TABLE captain_draft_picks 
ADD CONSTRAINT captain_draft_picks_draft_id_fkey 
FOREIGN KEY (draft_id) REFERENCES captain_drafts(id) ON DELETE CASCADE;

-- Update captain_draft_state table
ALTER TABLE captain_draft_state 
DROP CONSTRAINT IF EXISTS captain_draft_state_league_id_fkey;

ALTER TABLE captain_draft_state 
ADD CONSTRAINT captain_draft_state_draft_id_fkey 
FOREIGN KEY (draft_id) REFERENCES captain_drafts(id) ON DELETE CASCADE;

-- Add missing columns if they don't exist
ALTER TABLE captain_draft_participants 
ADD COLUMN IF NOT EXISTS draft_position INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS team_name VARCHAR(100);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_captain_draft_participants_draft_id ON captain_draft_participants(draft_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_rosters_draft_id ON captain_draft_rosters(draft_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_picks_draft_id ON captain_draft_picks(draft_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_state_draft_id ON captain_draft_state(draft_id);
