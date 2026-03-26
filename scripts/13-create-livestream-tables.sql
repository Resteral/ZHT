-- Create livestream tables
CREATE TABLE IF NOT EXISTS livestreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE SET NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  stream_url VARCHAR(500) NOT NULL,
  platform VARCHAR(50) NOT NULL DEFAULT 'custom', -- twitch, youtube, custom
  stream_key VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'offline', -- offline, live, ended
  viewer_count INTEGER DEFAULT 0,
  chat_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS stream_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES livestreams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stream_viewers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id UUID REFERENCES livestreams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(stream_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_livestreams_game_id ON livestreams(game_id);
CREATE INDEX IF NOT EXISTS idx_livestreams_status ON livestreams(status);
CREATE INDEX IF NOT EXISTS idx_stream_chat_stream_id ON stream_chat(stream_id);
CREATE INDEX IF NOT EXISTS idx_stream_chat_created_at ON stream_chat(created_at);
CREATE INDEX IF NOT EXISTS idx_stream_viewers_stream_id ON stream_viewers(stream_id);

-- Enable RLS
ALTER TABLE livestreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_viewers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view livestreams" ON livestreams FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create livestreams" ON livestreams FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own livestreams" ON livestreams FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Anyone can view chat messages" ON stream_chat FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send chat messages" ON stream_chat FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view stream viewers" ON stream_viewers FOR SELECT USING (true);
CREATE POLICY "Authenticated users can join streams" ON stream_viewers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update their own viewer status" ON stream_viewers FOR UPDATE USING (user_id = auth.uid());
