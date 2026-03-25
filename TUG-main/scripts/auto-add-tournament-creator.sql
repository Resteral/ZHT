-- Create function to automatically add tournament creator as participant
CREATE OR REPLACE FUNCTION auto_add_tournament_creator()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add creator if they have a valid user ID
  IF NEW.created_by IS NOT NULL THEN
    -- Insert creator as participant with conflict handling
    INSERT INTO tournament_participants (
      tournament_id, 
      user_id, 
      joined_at, 
      status,
      is_creator
    ) VALUES (
      NEW.id, 
      NEW.created_by, 
      NOW(), 
      'registered',
      true
    )
    ON CONFLICT (tournament_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically add tournament creator as participant
DROP TRIGGER IF EXISTS trigger_auto_add_tournament_creator ON tournaments;
CREATE TRIGGER trigger_auto_add_tournament_creator
  AFTER INSERT ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_tournament_creator();

-- Add is_creator column to tournament_participants if it doesn't exist
ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT FALSE;

-- Update existing tournament creators to be marked as participants
INSERT INTO tournament_participants (tournament_id, user_id, joined_at, status, is_creator)
SELECT 
  t.id,
  t.created_by,
  t.created_at,
  'registered',
  true
FROM tournaments t
WHERE t.created_by IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM tournament_participants tp 
    WHERE tp.tournament_id = t.id AND tp.user_id = t.created_by
  )
ON CONFLICT (tournament_id, user_id) DO UPDATE SET
  is_creator = true;
