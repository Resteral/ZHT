-- Create tables for storing parsed CSV analytical data for stat tracking
CREATE TABLE IF NOT EXISTS match_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  player_id UUID REFERENCES users(id) ON DELETE CASCADE,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  damage_dealt INTEGER DEFAULT 0,
  damage_taken INTEGER DEFAULT 0,
  healing_done INTEGER DEFAULT 0,
  objective_score INTEGER DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) DEFAULT 0,
  headshot_percentage DECIMAL(5,2) DEFAULT 0,
  time_alive INTEGER DEFAULT 0, -- in seconds
  items_collected INTEGER DEFAULT 0,
  abilities_used INTEGER DEFAULT 0,
  distance_traveled INTEGER DEFAULT 0,
  raw_csv_data TEXT, -- store original CSV for reference
  parsed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  team_number INTEGER NOT NULL, -- 1 or 2
  total_kills INTEGER DEFAULT 0,
  total_deaths INTEGER DEFAULT 0,
  total_damage INTEGER DEFAULT 0,
  total_healing INTEGER DEFAULT 0,
  objectives_completed INTEGER DEFAULT 0,
  team_score INTEGER DEFAULT 0,
  match_duration INTEGER DEFAULT 0, -- in seconds
  victory BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_match_analytics_match_id ON match_analytics(match_id);
CREATE INDEX IF NOT EXISTS idx_match_analytics_player_id ON match_analytics(player_id);
CREATE INDEX IF NOT EXISTS idx_team_analytics_match_id ON team_analytics(match_id);

-- Function to parse CSV data and store analytics
CREATE OR REPLACE FUNCTION parse_and_store_csv_analytics(
  p_match_id UUID,
  p_csv_code TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  csv_lines TEXT[];
  line_data TEXT[];
  player_record RECORD;
  team1_score INTEGER := 0;
  team2_score INTEGER := 0;
  match_duration INTEGER := 0;
BEGIN
  -- Split CSV into lines
  csv_lines := string_to_array(p_csv_code, E'\n');
  
  -- Skip header line and process data lines
  FOR i IN 2..array_length(csv_lines, 1) LOOP
    IF csv_lines[i] IS NOT NULL AND trim(csv_lines[i]) != '' THEN
      -- Split line by comma
      line_data := string_to_array(csv_lines[i], ',');
      
      -- Ensure we have enough columns (adjust based on your CSV format)
      IF array_length(line_data, 1) >= 10 THEN
        -- Insert player analytics (adjust column mapping as needed)
        INSERT INTO match_analytics (
          match_id,
          player_id,
          kills,
          deaths,
          assists,
          damage_dealt,
          damage_taken,
          healing_done,
          objective_score,
          accuracy_percentage,
          raw_csv_data
        ) VALUES (
          p_match_id,
          (SELECT id FROM users WHERE username = trim(line_data[1]) LIMIT 1),
          COALESCE(line_data[2]::INTEGER, 0),
          COALESCE(line_data[3]::INTEGER, 0),
          COALESCE(line_data[4]::INTEGER, 0),
          COALESCE(line_data[5]::INTEGER, 0),
          COALESCE(line_data[6]::INTEGER, 0),
          COALESCE(line_data[7]::INTEGER, 0),
          COALESCE(line_data[8]::INTEGER, 0),
          COALESCE(line_data[9]::DECIMAL, 0),
          p_csv_code
        );
      END IF;
    END IF;
  END LOOP;
  
  -- Calculate team analytics from individual player data
  INSERT INTO team_analytics (match_id, team_number, total_kills, total_deaths, total_damage, total_healing)
  SELECT 
    p_match_id,
    1 as team_number,
    SUM(ma.kills),
    SUM(ma.deaths),
    SUM(ma.damage_dealt),
    SUM(ma.healing_done)
  FROM match_analytics ma
  JOIN match_participants mp ON ma.player_id = mp.user_id
  WHERE ma.match_id = p_match_id AND mp.match_id = p_match_id AND mp.team_number = 1;
  
  INSERT INTO team_analytics (match_id, team_number, total_kills, total_deaths, total_damage, total_healing)
  SELECT 
    p_match_id,
    2 as team_number,
    SUM(ma.kills),
    SUM(ma.deaths),
    SUM(ma.damage_dealt),
    SUM(ma.healing_done)
  FROM match_analytics ma
  JOIN match_participants mp ON ma.player_id = mp.user_id
  WHERE ma.match_id = p_match_id AND mp.match_id = p_match_id AND mp.team_number = 2;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
