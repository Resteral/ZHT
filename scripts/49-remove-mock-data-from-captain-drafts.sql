-- Remove any existing mock data from captain draft tables
-- Clean up sample data and ensure tables are ready for real data

-- Clear existing sample data
-- Clear existing sample data if tables exist
DO $$ 
BEGIN 
    -- Clear captain_draft_picks
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'captain_draft_picks') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captain_draft_picks' AND column_name = 'league_id') THEN
            DELETE FROM captain_draft_picks WHERE league_id IN (SELECT id FROM captain_draft_leagues WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%');
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captain_draft_picks' AND column_name = 'draft_id') THEN
            DELETE FROM captain_draft_picks WHERE draft_id IN (SELECT id FROM captain_drafts WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%');
        END IF;
    END IF;

    -- Clear captain_draft_participants
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'captain_draft_participants') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captain_draft_participants' AND column_name = 'league_id') THEN
            DELETE FROM captain_draft_participants WHERE league_id IN (SELECT id FROM captain_draft_leagues WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%');
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captain_draft_participants' AND column_name = 'draft_id') THEN
            DELETE FROM captain_draft_participants WHERE draft_id IN (SELECT id FROM captain_drafts WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%');
        END IF;
    END IF;

    -- Clear captain_draft_state
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'captain_draft_state') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captain_draft_state' AND column_name = 'league_id') THEN
            DELETE FROM captain_draft_state WHERE league_id IN (SELECT id FROM captain_draft_leagues WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%');
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captain_draft_state' AND column_name = 'draft_id') THEN
            DELETE FROM captain_draft_state WHERE draft_id IN (SELECT id FROM captain_drafts WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%');
        END IF;
    END IF;

    -- Finally clear the main league/draft tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'captain_draft_leagues') THEN
        DELETE FROM captain_draft_leagues WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'captain_drafts') THEN
        DELETE FROM captain_drafts WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%';
    END IF;
END $$;

-- Ensure all tables are properly set up for real data
-- Add any missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_captain_draft_participants_user ON captain_draft_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_picks_captain ON captain_draft_picks(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_picks_player ON captain_draft_picks(player_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_rosters_captain ON captain_draft_rosters(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_rosters_player ON captain_draft_rosters(player_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_matches_team1 ON captain_draft_matches(team1_captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_matches_team2 ON captain_draft_matches(team2_captain_id);
