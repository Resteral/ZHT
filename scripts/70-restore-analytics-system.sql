-- Restore Analytics System
-- This script restores the analytics tables and functions that were previously removed

-- Create player analytics table
CREATE TABLE IF NOT EXISTS player_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  damage_dealt INTEGER DEFAULT 0,
  damage_taken INTEGER DEFAULT 0,
  healing_done INTEGER DEFAULT 0,
  accuracy DECIMAL(5,2) DEFAULT 0.00,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team analytics table
CREATE TABLE IF NOT EXISTS team_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  total_damage INTEGER DEFAULT 0,
  total_healing INTEGER DEFAULT 0,
  team_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create match analytics table
CREATE TABLE IF NOT EXISTS match_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  duration_seconds INTEGER,
  total_kills INTEGER DEFAULT 0,
  total_damage INTEGER DEFAULT 0,
  mvp_user_id UUID REFERENCES auth.users(id),
  csv_data TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to parse and store CSV analytics
CREATE OR REPLACE FUNCTION parse_and_store_csv_analytics(
  p_match_id UUID,
  p_csv_data TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  csv_lines TEXT[];
  line_data TEXT[];
  player_data RECORD;
  team_stats RECORD;
BEGIN
  -- Split CSV into lines
  csv_lines := string_to_array(p_csv_data, E'\n');
  
  -- Skip header line and process each player line
  FOR i IN 2..array_length(csv_lines, 1) LOOP
    IF csv_lines[i] IS NOT NULL AND length(trim(csv_lines[i])) > 0 THEN
      line_data := string_to_array(csv_lines[i], ',');
      
      -- Insert player analytics (assuming CSV format: username,kills,deaths,assists,damage,healing,accuracy,score)
      IF array_length(line_data, 1) >= 8 THEN
        INSERT INTO player_analytics (
          match_id, user_id, kills, deaths, assists, damage_dealt, healing_done, accuracy, score
        )
        SELECT 
          p_match_id,
          u.id,
          COALESCE(line_data[2]::INTEGER, 0),
          COALESCE(line_data[3]::INTEGER, 0),
          COALESCE(line_data[4]::INTEGER, 0),
          COALESCE(line_data[5]::INTEGER, 0),
          COALESCE(line_data[6]::INTEGER, 0),
          COALESCE(line_data[7]::DECIMAL, 0.00),
          COALESCE(line_data[8]::INTEGER, 0)
        FROM auth.users u
        WHERE u.raw_user_meta_data->>'username' = trim(line_data[1])
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END LOOP;
  
  -- Store raw CSV data in match analytics
  INSERT INTO match_analytics (match_id, csv_data)
  VALUES (p_match_id, p_csv_data)
  ON CONFLICT (match_id) DO UPDATE SET
    csv_data = EXCLUDED.csv_data,
    updated_at = NOW();
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Make CSV code optional in score_submissions
ALTER TABLE score_submissions ALTER COLUMN csv_code DROP NOT NULL;

-- Enable RLS on analytics tables
ALTER TABLE player_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for analytics tables
CREATE POLICY "Users can view all analytics" ON player_analytics FOR SELECT USING (true);
CREATE POLICY "Users can view all team analytics" ON team_analytics FOR SELECT USING (true);
CREATE POLICY "Users can view all match analytics" ON match_analytics FOR SELECT USING (true);
