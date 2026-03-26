-- Fix captain draft tables to use consistent draft_id references
DO $$ 
DECLARE
    t_name TEXT;
BEGIN 
    -- Tables to process
    FOR t_name IN SELECT UNNEST(ARRAY['captain_draft_participants', 'captain_draft_rosters', 'captain_draft_picks', 'captain_draft_state'])
    LOOP
        -- Check if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t_name) THEN
            -- Rename league_id to draft_id if it exists
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'league_id') THEN
                IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'draft_id') THEN
                    EXECUTE format('ALTER TABLE %I RENAME COLUMN league_id TO draft_id', t_name);
                END IF;
            END IF;
            
            -- Ensure draft_id column exists
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t_name AND column_name = 'draft_id') THEN
                EXECUTE format('ALTER TABLE %I ADD COLUMN draft_id UUID REFERENCES captain_drafts(id) ON DELETE CASCADE', t_name);
            END IF;
            
            -- Re-add constraints safely
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I_league_id_fkey', t_name, t_name);
            EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I_draft_id_fkey', t_name, t_name);
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I_draft_id_fkey FOREIGN KEY (draft_id) REFERENCES captain_drafts(id) ON DELETE CASCADE', t_name, t_name);
        END IF;
    END LOOP;
END $$;

-- Add missing columns to participants
ALTER TABLE captain_draft_participants 
ADD COLUMN IF NOT EXISTS draft_position INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS team_name VARCHAR(100);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_captain_draft_participants_draft_id ON captain_draft_participants(draft_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_rosters_draft_id ON captain_draft_rosters(draft_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_picks_draft_id ON captain_draft_picks(draft_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_state_draft_id ON captain_draft_state(draft_id);
