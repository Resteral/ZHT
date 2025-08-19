-- Fix missing foreign key relationships for analytics tables

-- Add foreign key constraint between player_analytics and users
ALTER TABLE player_analytics 
ADD CONSTRAINT fk_player_analytics_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add foreign key constraint between player_analytics and matches
ALTER TABLE player_analytics 
ADD CONSTRAINT fk_player_analytics_match_id 
FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- Add foreign key constraint between team_analytics and matches
ALTER TABLE team_analytics 
ADD CONSTRAINT fk_team_analytics_match_id 
FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- Add foreign key constraint between match_analytics and matches
ALTER TABLE match_analytics 
ADD CONSTRAINT fk_match_analytics_match_id 
FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

-- Add foreign key constraint between match_analytics and users (for mvp_user_id)
ALTER TABLE match_analytics 
ADD CONSTRAINT fk_match_analytics_mvp_user_id 
FOREIGN KEY (mvp_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_player_analytics_user_id ON player_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_player_analytics_match_id ON player_analytics(match_id);
CREATE INDEX IF NOT EXISTS idx_player_analytics_score ON player_analytics(score DESC);
CREATE INDEX IF NOT EXISTS idx_team_analytics_match_id ON team_analytics(match_id);
CREATE INDEX IF NOT EXISTS idx_match_analytics_match_id ON match_analytics(match_id);
