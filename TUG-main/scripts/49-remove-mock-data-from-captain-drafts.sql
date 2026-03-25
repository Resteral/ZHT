-- Remove any existing mock data from captain draft tables
-- Clean up sample data and ensure tables are ready for real data

-- Clear existing sample data
DELETE FROM captain_draft_picks WHERE league_id IN (
  SELECT id FROM captain_draft_leagues WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%'
);

DELETE FROM captain_draft_participants WHERE league_id IN (
  SELECT id FROM captain_draft_leagues WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%'
);

DELETE FROM captain_draft_state WHERE league_id IN (
  SELECT id FROM captain_draft_leagues WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%'
);

DELETE FROM captain_draft_rosters WHERE league_id IN (
  SELECT id FROM captain_draft_leagues WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%'
);

DELETE FROM captain_draft_matches WHERE league_id IN (
  SELECT id FROM captain_draft_leagues WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%'
);

DELETE FROM captain_draft_leagues WHERE name LIKE '%Championship Draft%' OR name LIKE '%Quick Draft%' OR name LIKE '%Elite Draft%';

-- Ensure all tables are properly set up for real data
-- Add any missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_captain_draft_participants_user ON captain_draft_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_picks_captain ON captain_draft_picks(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_picks_player ON captain_draft_picks(player_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_rosters_captain ON captain_draft_rosters(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_rosters_player ON captain_draft_rosters(player_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_matches_team1 ON captain_draft_matches(team1_captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_matches_team2 ON captain_draft_matches(team2_captain_id);
