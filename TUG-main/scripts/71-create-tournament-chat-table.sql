-- Create tournament chat table for draft room communication

CREATE TABLE IF NOT EXISTS tournament_chat (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_chat_tournament ON tournament_chat(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_chat_created_at ON tournament_chat(created_at);

-- Enable RLS
ALTER TABLE tournament_chat ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view tournament chat" ON tournament_chat
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tournament_player_pool 
            WHERE tournament_id = tournament_chat.tournament_id 
            AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM tournament_teams 
            WHERE tournament_id = tournament_chat.tournament_id 
            AND team_captain = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM tournaments 
            WHERE id = tournament_chat.tournament_id 
            AND created_by = auth.uid()
        )
    );

CREATE POLICY "Participants can send messages" ON tournament_chat
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND (
            EXISTS (
                SELECT 1 FROM tournament_player_pool 
                WHERE tournament_id = tournament_chat.tournament_id 
                AND user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM tournament_teams 
                WHERE tournament_id = tournament_chat.tournament_id 
                AND team_captain = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM tournaments 
                WHERE id = tournament_chat.tournament_id 
                AND created_by = auth.uid()
            )
        )
    );

-- Grant permissions
GRANT ALL ON tournament_chat TO authenticated;
