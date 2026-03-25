-- Create the missing captain_drafts table that's referenced throughout the application
CREATE TABLE IF NOT EXISTS captain_drafts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    game TEXT NOT NULL,
    max_participants INTEGER DEFAULT 8,
    team_format TEXT DEFAULT '4v4',
    status TEXT DEFAULT 'waiting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    winner_team INTEGER,
    draft_data JSONB DEFAULT '{}'::jsonb
);

-- Create captain_draft_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS captain_draft_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draft_id UUID NOT NULL REFERENCES captain_drafts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    draft_position INTEGER DEFAULT 1,
    team_name VARCHAR(100),
    UNIQUE(draft_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_captain_drafts_creator_id ON captain_drafts(creator_id);
CREATE INDEX IF NOT EXISTS idx_captain_drafts_status ON captain_drafts(status);
CREATE INDEX IF NOT EXISTS idx_captain_drafts_game ON captain_drafts(game);
CREATE INDEX IF NOT EXISTS idx_captain_drafts_created_at ON captain_drafts(created_at);
CREATE INDEX IF NOT EXISTS idx_captain_draft_participants_draft_id ON captain_draft_participants(draft_id);
CREATE INDEX IF NOT EXISTS idx_captain_draft_participants_user_id ON captain_draft_participants(user_id);

-- Enable RLS
ALTER TABLE captain_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE captain_draft_participants ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for captain_drafts
CREATE POLICY "Users can view captain drafts" ON captain_drafts
    FOR SELECT USING (true);

CREATE POLICY "Users can create captain drafts" ON captain_drafts
    FOR INSERT WITH CHECK (creator_id = auth.uid());

CREATE POLICY "Creators can update their captain drafts" ON captain_drafts
    FOR UPDATE USING (creator_id = auth.uid());

-- Create RLS policies for captain_draft_participants
CREATE POLICY "Users can view captain draft participants" ON captain_draft_participants
    FOR SELECT USING (true);

CREATE POLICY "Users can join captain drafts" ON captain_draft_participants
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can leave captain drafts" ON captain_draft_participants
    FOR DELETE USING (user_id = auth.uid());
