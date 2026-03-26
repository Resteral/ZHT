-- Wipe CSV data and fix "already submitted" bug
-- This script removes orphaned match results and CSV data that's causing submission conflicts

-- Remove orphaned match results (results without corresponding completed matches)
DELETE FROM match_results 
WHERE match_id IN (
  SELECT mr.match_id 
  FROM match_results mr
  LEFT JOIN matches m ON mr.match_id = m.id
  WHERE m.status != 'completed' OR m.status IS NULL
);

-- Remove all CSV processing logs
DELETE FROM csv_processing_logs;

-- Remove all score submissions
DELETE FROM score_submissions;

-- Remove all match scores
DELETE FROM match_scores;

-- Remove match analytics with CSV data
DELETE FROM match_analytics WHERE csv_data IS NOT NULL;

-- Reset any matches stuck in inconsistent states
UPDATE matches 
SET status = 'drafting', 
    updated_at = NOW()
WHERE status NOT IN ('completed', 'cancelled') 
  AND id IN (
    SELECT DISTINCT match_id 
    FROM match_results
  );

-- Log the cleanup operation
INSERT INTO admin_activity_log (
  id,
  admin_user_id,
  action_type,
  target_type,
  description,
  created_at,
  metadata
) VALUES (
  gen_random_uuid(),
  '00000000-0000-0000-0000-000000000000', -- System user
  'DATA_CLEANUP',
  'CSV_DATA',
  'Wiped CSV data and fixed already submitted bug',
  NOW(),
  '{"operation": "csv_data_wipe", "reason": "fix_already_submitted_bug"}'::jsonb
);

-- Display cleanup summary
SELECT 
  'CSV data wipe completed' as status,
  NOW() as completed_at;
