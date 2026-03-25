-- CSV Analytics data storage tables
CREATE TABLE IF NOT EXISTS csv_analytics_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id VARCHAR(255) NOT NULL, -- The AccountID from CSV (e.g., 1-S2-1-5822233)
  user_id UUID REFERENCES users(id), -- Link to platform user who uploaded
  team INTEGER NOT NULL,
  steals_turnovers INTEGER DEFAULT 0,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  shots INTEGER DEFAULT 0,
  pickups INTEGER DEFAULT 0,
  passes INTEGER DEFAULT 0,
  passes_received INTEGER DEFAULT 0,
  possession_time DECIMAL(10,2) DEFAULT 0,
  shots_against INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  goalie_time INTEGER DEFAULT 0,
  skater_time INTEGER DEFAULT 0,
  game_session VARCHAR(255), -- To group data from same CSV upload
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS csv_upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  filename VARCHAR(255),
  total_records INTEGER DEFAULT 0,
  processed_records INTEGER DEFAULT 0,
  upload_status VARCHAR(50) DEFAULT 'processing', -- processing, completed, failed
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_csv_analytics_account_id ON csv_analytics_data(account_id);
CREATE INDEX IF NOT EXISTS idx_csv_analytics_user_id ON csv_analytics_data(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_analytics_session ON csv_analytics_data(game_session);
CREATE INDEX IF NOT EXISTS idx_csv_upload_sessions_user ON csv_upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_csv_upload_sessions_status ON csv_upload_sessions(upload_status);

-- Enable RLS for security
ALTER TABLE csv_analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE csv_upload_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Users can access data for their account IDs
CREATE POLICY "Users can view CSV data for their account IDs" ON csv_analytics_data
  FOR SELECT USING (
    account_id IN (
      SELECT DISTINCT account_id 
      FROM csv_analytics_data 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own CSV data" ON csv_analytics_data
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their upload sessions" ON csv_upload_sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their upload sessions" ON csv_upload_sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());
