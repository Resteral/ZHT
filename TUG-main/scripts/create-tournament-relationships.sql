-- Create missing foreign key relationships for tournament tables

-- Add foreign key constraints for tournament_matches table
ALTER TABLE tournament_matches 
ADD CONSTRAINT fk_tournament_matches_tournament 
FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

ALTER TABLE tournament_matches 
ADD CONSTRAINT fk_tournament_matches_team1 
FOREIGN KEY (team1_id) REFERENCES tournament_teams(id) ON DELETE CASCADE;

ALTER TABLE tournament_matches 
ADD CONSTRAINT fk_tournament_matches_team2 
FOREIGN KEY (team2_id) REFERENCES tournament_teams(id) ON DELETE CASCADE;

-- Add foreign key constraints for tournament_teams table
ALTER TABLE tournament_teams 
ADD CONSTRAINT fk_tournament_teams_tournament 
FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

-- Add foreign key constraints for tournament_participants table
ALTER TABLE tournament_participants 
ADD CONSTRAINT fk_tournament_participants_tournament 
FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE;

ALTER TABLE tournament_participants 
ADD CONSTRAINT fk_tournament_participants_user 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_teams ON tournament_matches(team1_id, team2_id);
CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id ON tournament_teams(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON tournament_participants(user_id);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
