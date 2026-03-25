-- Enhance captain_drafts table to support tournament integration
ALTER TABLE captain_drafts ADD COLUMN IF NOT EXISTS tournament_owner UUID REFERENCES users(id);
ALTER TABLE captain_drafts ADD COLUMN IF NOT EXISTS tournament_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE captain_drafts ADD COLUMN IF NOT EXISTS elo_difference INTEGER DEFAULT 0;

-- Add indexes for tournament draft queries
CREATE INDEX IF NOT EXISTS idx_captain_drafts_tournament_mode ON captain_drafts(tournament_mode);
CREATE INDEX IF NOT EXISTS idx_captain_drafts_tournament_owner ON captain_drafts(tournament_owner);

-- Enhance captain_draft_participants table with ELO tracking
ALTER TABLE captain_draft_participants ADD COLUMN IF NOT EXISTS elo_rating INTEGER DEFAULT 1200;

-- Create function to automatically create teams from draft results
CREATE OR REPLACE FUNCTION create_teams_from_draft_results(draft_id UUID) RETURNS void AS $$
DECLARE
  draft_record RECORD;
  team1_id UUID;
  team2_id UUID;
BEGIN
  -- Get draft information
  SELECT * INTO draft_record FROM captain_drafts WHERE id = draft_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Draft not found';
  END IF;
  
  -- Create Team 1 (Captain 1's team)
  INSERT INTO tournament_teams (
    tournament_id,
    team_name,
    team_captain,
    created_at
  ) VALUES (
    draft_record.match_id,
    'Team ' || (SELECT username FROM users WHERE id = draft_record.captain1_id),
    draft_record.captain1_id,
    NOW()
  ) RETURNING id INTO team1_id;
  
  -- Create Team 2 (Captain 2's team)  
  INSERT INTO tournament_teams (
    tournament_id,
    team_name,
    team_captain,
    created_at
  ) VALUES (
    draft_record.match_id,
    'Team ' || (SELECT username FROM users WHERE id = draft_record.captain2_id),
    draft_record.captain2_id,
    NOW()
  ) RETURNING id INTO team2_id;
  
  -- Add team members based on draft picks
  INSERT INTO tournament_team_members (team_id, user_id, joined_at)
  SELECT 
    CASE WHEN team = 1 THEN team1_id ELSE team2_id END,
    user_id,
    NOW()
  FROM captain_draft_participants 
  WHERE draft_id = draft_id AND team IS NOT NULL;
  
  RAISE NOTICE 'Created teams from draft results for draft %', draft_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically create teams when draft completes
CREATE OR REPLACE FUNCTION trigger_create_teams_from_draft() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.tournament_mode = TRUE THEN
    PERFORM create_teams_from_draft_results(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER captain_draft_completion_trigger
  AFTER UPDATE ON captain_drafts
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_teams_from_draft();

COMMENT ON COLUMN captain_drafts.tournament_owner IS 'Highest ELO player who becomes tournament owner';
COMMENT ON COLUMN captain_drafts.tournament_mode IS 'Flag to identify tournament drafts vs regular drafts';
COMMENT ON COLUMN captain_drafts.elo_difference IS 'ELO difference between highest and lowest captain';
COMMENT ON FUNCTION create_teams_from_draft_results(UUID) IS 'Automatically creates tournament teams from completed draft results';
