-- Automatic League Auction Scheduler System
-- Creates scheduled auction leagues automatically based on demand and timing

-- Auction schedule templates - defines when and how auctions should be created
CREATE TABLE IF NOT EXISTS auction_schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  game VARCHAR(100) NOT NULL,
  schedule_type VARCHAR(50) NOT NULL DEFAULT 'recurring', -- recurring, one_time, demand_based
  frequency VARCHAR(50), -- daily, weekly, bi_weekly, monthly
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc.
  time_of_day TIME NOT NULL,
  timezone VARCHAR(50) DEFAULT 'UTC',
  max_teams INTEGER DEFAULT 8,
  players_per_team INTEGER DEFAULT 5,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  prize_pool DECIMAL(10,2) DEFAULT 0,
  registration_duration_hours INTEGER DEFAULT 24, -- How long registration stays open
  auction_duration_minutes INTEGER DEFAULT 120,
  min_participants INTEGER DEFAULT 4, -- Minimum to start auction
  auto_start BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduled auction instances - actual auctions created from templates
CREATE TABLE IF NOT EXISTS scheduled_auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES auction_schedule_templates(id) ON DELETE CASCADE,
  auction_league_id UUID REFERENCES auction_leagues(id),
  scheduled_start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_opens_at TIMESTAMP WITH TIME ZONE NOT NULL,
  registration_closes_at TIMESTAMP WITH TIME ZONE NOT NULL,
  auction_starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, registration_open, auction_ready, in_progress, completed, cancelled
  participant_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auction scheduler settings - global configuration
CREATE TABLE IF NOT EXISTS auction_scheduler_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default scheduler settings
INSERT INTO auction_scheduler_settings (setting_key, setting_value, description) VALUES
('scheduler_enabled', 'true', 'Enable/disable automatic auction scheduling'),
('max_concurrent_auctions', '5', 'Maximum number of concurrent auctions allowed'),
('default_registration_hours', '24', 'Default registration period in hours'),
('min_players_auto_start', '6', 'Minimum players needed to auto-start auction'),
('notification_lead_time_hours', '2', 'Hours before auction to send notifications'),
('cleanup_completed_days', '7', 'Days to keep completed auction data')
ON CONFLICT (setting_key) DO NOTHING;

-- Function to create auction from template
CREATE OR REPLACE FUNCTION create_auction_from_template(template_id_param UUID, scheduled_time TIMESTAMP WITH TIME ZONE)
RETURNS UUID AS $$
DECLARE
  template_record RECORD;
  new_auction_id UUID;
  scheduled_auction_id UUID;
  registration_opens TIMESTAMP WITH TIME ZONE;
  registration_closes TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get template details
  SELECT * INTO template_record FROM auction_schedule_templates WHERE id = template_id_param AND is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or inactive';
  END IF;
  
  -- Calculate timing
  registration_opens := scheduled_time - INTERVAL '1 hour' * template_record.registration_duration_hours;
  registration_closes := scheduled_time - INTERVAL '30 minutes'; -- Close registration 30 min before auction
  
  -- Create auction league
  INSERT INTO auction_leagues (
    name,
    game,
    max_teams,
    players_per_team,
    entry_fee,
    prize_pool,
    auction_date,
    status,
    betting_enabled,
    auto_generated
  ) VALUES (
    template_record.name || ' - ' || TO_CHAR(scheduled_time, 'Mon DD, HH24:MI'),
    template_record.game,
    template_record.max_teams,
    template_record.players_per_team,
    template_record.entry_fee,
    template_record.prize_pool,
    scheduled_time,
    'registration',
    true,
    true
  ) RETURNING id INTO new_auction_id;
  
  -- Create scheduled auction record
  INSERT INTO scheduled_auctions (
    template_id,
    auction_league_id,
    scheduled_start_time,
    registration_opens_at,
    registration_closes_at,
    auction_starts_at,
    status
  ) VALUES (
    template_id_param,
    new_auction_id,
    scheduled_time,
    registration_opens,
    registration_closes,
    scheduled_time,
    'scheduled'
  ) RETURNING id INTO scheduled_auction_id;
  
  RETURN new_auction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to process scheduled auctions (called by cron job)
CREATE OR REPLACE FUNCTION process_scheduled_auctions()
RETURNS void AS $$
DECLARE
  auction_record RECORD;
  current_time TIMESTAMP WITH TIME ZONE := NOW();
BEGIN
  -- Open registration for scheduled auctions
  FOR auction_record IN
    SELECT sa.*, al.name as auction_name
    FROM scheduled_auctions sa
    JOIN auction_leagues al ON sa.auction_league_id = al.id
    WHERE sa.status = 'scheduled' 
    AND sa.registration_opens_at <= current_time
  LOOP
    -- Update auction status to registration open
    UPDATE auction_leagues 
    SET status = 'registration' 
    WHERE id = auction_record.auction_league_id;
    
    UPDATE scheduled_auctions 
    SET status = 'registration_open', updated_at = current_time
    WHERE id = auction_record.id;
    
    -- Create notification for auction opening
    INSERT INTO notifications (
      title,
      message,
      notification_type,
      metadata
    ) VALUES (
      'New Auction Available',
      'Registration is now open for ' || auction_record.auction_name,
      'auction_registration_open',
      jsonb_build_object('auction_id', auction_record.auction_league_id)
    );
  END LOOP;
  
  -- Close registration and prepare for auction start
  FOR auction_record IN
    SELECT sa.*, al.name as auction_name
    FROM scheduled_auctions sa
    JOIN auction_leagues al ON sa.auction_league_id = al.id
    WHERE sa.status = 'registration_open' 
    AND sa.registration_closes_at <= current_time
  LOOP
    -- Count participants
    UPDATE scheduled_auctions 
    SET participant_count = (
      SELECT COUNT(*) FROM auction_league_participants 
      WHERE auction_league_id = auction_record.auction_league_id
    )
    WHERE id = auction_record.id;
    
    -- Check if minimum participants met
    IF auction_record.participant_count >= (
      SELECT COALESCE(min_participants, 4) 
      FROM auction_schedule_templates 
      WHERE id = auction_record.template_id
    ) THEN
      UPDATE scheduled_auctions 
      SET status = 'auction_ready', updated_at = current_time
      WHERE id = auction_record.id;
    ELSE
      -- Cancel auction due to insufficient participants
      UPDATE auction_leagues 
      SET status = 'cancelled' 
      WHERE id = auction_record.auction_league_id;
      
      UPDATE scheduled_auctions 
      SET status = 'cancelled', updated_at = current_time
      WHERE id = auction_record.id;
    END IF;
  END LOOP;
  
  -- Start auctions that are ready
  FOR auction_record IN
    SELECT sa.*, al.name as auction_name
    FROM scheduled_auctions sa
    JOIN auction_leagues al ON sa.auction_league_id = al.id
    WHERE sa.status = 'auction_ready' 
    AND sa.auction_starts_at <= current_time
  LOOP
    -- Start the auction
    UPDATE auction_leagues 
    SET status = 'auction_in_progress' 
    WHERE id = auction_record.auction_league_id;
    
    UPDATE scheduled_auctions 
    SET status = 'in_progress', updated_at = current_time
    WHERE id = auction_record.id;
    
    -- Initialize auction draft state
    INSERT INTO auction_draft_state (
      auction_league_id,
      current_round,
      current_captain_index,
      time_remaining,
      status
    ) VALUES (
      auction_record.auction_league_id,
      1,
      0,
      1800, -- 30 minutes
      'active'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_auction_schedule_templates_active ON auction_schedule_templates(is_active, game);
CREATE INDEX IF NOT EXISTS idx_scheduled_auctions_status ON scheduled_auctions(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_auctions_timing ON scheduled_auctions(registration_opens_at, auction_starts_at);
