-- Add check constraint to status column
ALTER TABLE tournaments 
DROP CONSTRAINT IF EXISTS tournaments_status_check;

ALTER TABLE tournaments 
ADD CONSTRAINT tournaments_status_check 
CHECK (status IN ('registration', 'active', 'completed', 'cancelled', 'drafting', 'in_progress', 'ready_check', 'waiting'));

-- Add check constraint to tournament_participants status
ALTER TABLE tournament_participants
DROP CONSTRAINT IF EXISTS tournament_participants_status_check;

ALTER TABLE tournament_participants
ADD CONSTRAINT tournament_participants_status_check
CHECK (status IN ('registered', 'eliminated', 'advanced', 'winner', 'pending_ready', 'ready'));
