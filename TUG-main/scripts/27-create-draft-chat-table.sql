-- Create draft chat messages table
CREATE TABLE IF NOT EXISTS draft_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    draft_id UUID NOT NULL REFERENCES captain_drafts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_draft_chat_messages_draft_id ON draft_chat_messages(draft_id);
CREATE INDEX IF NOT EXISTS idx_draft_chat_messages_created_at ON draft_chat_messages(created_at);

-- Enable RLS
ALTER TABLE draft_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view chat messages for drafts they're in" ON draft_chat_messages
    FOR SELECT USING (
        draft_id IN (
            SELECT draft_id FROM captain_draft_participants 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can send chat messages to drafts they're in" ON draft_chat_messages
    FOR INSERT WITH CHECK (
        user_id = auth.uid() AND
        draft_id IN (
            SELECT draft_id FROM captain_draft_participants 
            WHERE user_id = auth.uid()
        )
    );

-- Add started_at column to captain_drafts if it doesn't exist
ALTER TABLE captain_drafts ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE;
