-- Create score submissions table for consensus-based validation
CREATE TABLE IF NOT EXISTS score_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  submitter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  team1_score INTEGER NOT NULL,
  team2_score INTEGER NOT NULL,
  csv_code TEXT NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_validated BOOLEAN DEFAULT FALSE,
  UNIQUE(match_id, submitter_id)
);

-- Create match results table for final validated scores
CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
  team1_score INTEGER NOT NULL,
  team2_score INTEGER NOT NULL,
  winning_team INTEGER, -- 1 or 2, null for tie
  match_duration INTEGER, -- in minutes
  csv_code TEXT NOT NULL,
  validated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_submissions INTEGER DEFAULT 0,
  consensus_threshold INTEGER DEFAULT 3 -- minimum matching submissions needed
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_score_submissions_match_id ON score_submissions(match_id);
CREATE INDEX IF NOT EXISTS idx_score_submissions_submitter_id ON score_submissions(submitter_id);
CREATE INDEX IF NOT EXISTS idx_match_results_match_id ON match_results(match_id);

-- Function to validate scores when enough matching submissions exist
CREATE OR REPLACE FUNCTION validate_match_scores(p_match_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_consensus_count INTEGER;
  v_team1_score INTEGER;
  v_team2_score INTEGER;
  v_csv_code TEXT;
  v_threshold INTEGER := 3; -- Minimum matching submissions
BEGIN
  -- Find the most common score combination
  SELECT 
    team1_score, 
    team2_score, 
    csv_code,
    COUNT(*) as submission_count
  INTO v_team1_score, v_team2_score, v_csv_code, v_consensus_count
  FROM score_submissions 
  WHERE match_id = p_match_id
  GROUP BY team1_score, team2_score, csv_code
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  -- If we have enough matching submissions, validate the result
  IF v_consensus_count >= v_threshold THEN
    INSERT INTO match_results (
      match_id, 
      team1_score, 
      team2_score, 
      winning_team,
      csv_code,
      total_submissions,
      consensus_threshold
    ) VALUES (
      p_match_id,
      v_team1_score,
      v_team2_score,
      CASE 
        WHEN v_team1_score > v_team2_score THEN 1
        WHEN v_team2_score > v_team1_score THEN 2
        ELSE NULL -- Tie
      END,
      v_csv_code,
      v_consensus_count,
      v_threshold
    )
    ON CONFLICT (match_id) DO UPDATE SET
      team1_score = EXCLUDED.team1_score,
      team2_score = EXCLUDED.team2_score,
      winning_team = EXCLUDED.winning_team,
      csv_code = EXCLUDED.csv_code,
      total_submissions = EXCLUDED.total_submissions,
      validated_at = NOW();

    -- Update match status to completed
    UPDATE matches 
    SET status = 'completed', updated_at = NOW()
    WHERE id = p_match_id;

    -- Mark all matching submissions as validated
    UPDATE score_submissions 
    SET is_validated = TRUE
    WHERE match_id = p_match_id 
      AND team1_score = v_team1_score 
      AND team2_score = v_team2_score
      AND csv_code = v_csv_code;

    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;
