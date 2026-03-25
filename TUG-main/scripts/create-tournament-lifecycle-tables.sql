-- Tournament lifecycle management tables

-- Tournament status history for rollback support
CREATE TABLE IF NOT EXISTS tournament_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  previous_status VARCHAR(50) NOT NULL,
  new_status VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES users(id),
  change_type VARCHAR(20) DEFAULT 'manual', -- manual, automatic, rollback
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

-- Tournament cleanup scheduling
CREATE TABLE IF NOT EXISTS tournament_cleanup_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  scheduled_cleanup_at TIMESTAMP WITH TIME ZONE NOT NULL,
  cleanup_policy JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'scheduled', -- scheduled, running, completed, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Tournament archives for data preservation
CREATE TABLE IF NOT EXISTS tournament_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL, -- Not a foreign key since original may be deleted
  tournament_data JSONB NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preserve_results BOOLEAN DEFAULT TRUE,
  archive_size_bytes INTEGER,
  metadata JSONB DEFAULT '{}'
);

-- Tournament lifecycle monitoring logs
CREATE TABLE IF NOT EXISTS tournament_lifecycle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- status_change, cleanup_scheduled, error, etc.
  event_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  severity VARCHAR(10) DEFAULT 'info' -- info, warning, error
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tournament_status_history_tournament ON tournament_status_history(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_status_history_changed_at ON tournament_status_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tournament_cleanup_schedule_scheduled ON tournament_cleanup_schedule(scheduled_cleanup_at);
CREATE INDEX IF NOT EXISTS idx_tournament_cleanup_schedule_status ON tournament_cleanup_schedule(status);
CREATE INDEX IF NOT EXISTS idx_tournament_archives_tournament ON tournament_archives(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_lifecycle_logs_tournament ON tournament_lifecycle_logs(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_lifecycle_logs_event_type ON tournament_lifecycle_logs(event_type);

-- Function to automatically log status changes
CREATE OR REPLACE FUNCTION log_tournament_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO tournament_lifecycle_logs (tournament_id, event_type, event_data)
    VALUES (
      NEW.id,
      'status_change',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'changed_at', NOW()
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically log status changes
CREATE TRIGGER tournament_status_change_log_trigger
  AFTER UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION log_tournament_status_change();

-- Function to clean up expired tournaments
CREATE OR REPLACE FUNCTION cleanup_expired_tournaments() RETURNS void AS $$
DECLARE
  cleanup_record RECORD;
BEGIN
  FOR cleanup_record IN 
    SELECT tournament_id, cleanup_policy 
    FROM tournament_cleanup_schedule 
    WHERE status = 'scheduled' 
    AND scheduled_cleanup_at <= NOW()
  LOOP
    -- This would call the cleanup service in a real implementation
    -- For now, just update the status
    UPDATE tournament_cleanup_schedule 
    SET status = 'completed', completed_at = NOW()
    WHERE tournament_id = cleanup_record.tournament_id;
    
    INSERT INTO tournament_lifecycle_logs (tournament_id, event_type, event_data)
    VALUES (
      cleanup_record.tournament_id,
      'cleanup_executed',
      jsonb_build_object('executed_at', NOW())
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Enhanced tournament status enum with more granular states
ALTER TABLE tournaments DROP CONSTRAINT IF EXISTS tournaments_status_check;
ALTER TABLE tournaments ADD CONSTRAINT tournaments_status_check 
  CHECK (status IN ('registration', 'drafting', 'active', 'completed', 'cancelled', 'archived'));

COMMENT ON TABLE tournament_status_history IS 'Tracks all tournament status changes for rollback support';
COMMENT ON TABLE tournament_cleanup_schedule IS 'Manages automated tournament cleanup with configurable policies';
COMMENT ON TABLE tournament_archives IS 'Preserves tournament data after cleanup';
COMMENT ON TABLE tournament_lifecycle_logs IS 'Comprehensive logging for tournament lifecycle events';
COMMENT ON FUNCTION cleanup_expired_tournaments() IS 'Automated cleanup function for expired tournaments';
