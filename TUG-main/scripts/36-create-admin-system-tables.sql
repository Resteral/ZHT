-- Admin System Management Tables
-- Comprehensive admin functionality for platform management

-- Admin activity log
CREATE TABLE IF NOT EXISTS admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) NOT NULL,
  action_type VARCHAR(100) NOT NULL, -- create, update, delete, ban, unban, etc.
  target_type VARCHAR(100) NOT NULL, -- user, tournament, bet, etc.
  target_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System alerts and notifications
CREATE TABLE IF NOT EXISTS system_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type VARCHAR(50) NOT NULL, -- error, warning, info, critical
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR(100) NOT NULL, -- system, user_report, automated_check
  severity INTEGER DEFAULT 1, -- 1-5 scale
  status VARCHAR(20) DEFAULT 'active', -- active, acknowledged, resolved, dismissed
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id)
);

-- User reports and moderation
CREATE TABLE IF NOT EXISTS user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES auth.users(id) NOT NULL,
  reported_user_id UUID REFERENCES auth.users(id) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- harassment, cheating, inappropriate_content, etc.
  description TEXT NOT NULL,
  evidence_urls TEXT[], -- Screenshots, chat logs, etc.
  status VARCHAR(20) DEFAULT 'pending', -- pending, investigating, resolved, dismissed
  priority INTEGER DEFAULT 1, -- 1-5 scale
  assigned_to UUID REFERENCES auth.users(id),
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- User bans and suspensions
CREATE TABLE IF NOT EXISTS user_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  banned_by UUID REFERENCES auth.users(id) NOT NULL,
  ban_type VARCHAR(20) NOT NULL, -- temporary, permanent, shadow
  reason TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_date TIMESTAMP WITH TIME ZONE, -- NULL for permanent bans
  is_active BOOLEAN DEFAULT true,
  appeal_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lifted_at TIMESTAMP WITH TIME ZONE,
  lifted_by UUID REFERENCES auth.users(id)
);

-- Financial transactions and audit trail
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  transaction_type VARCHAR(50) NOT NULL, -- deposit, withdrawal, bet_win, bet_loss, tournament_entry, prize_payout
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, cancelled
  payment_method VARCHAR(50), -- stripe, paypal, crypto, internal
  external_transaction_id VARCHAR(255),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System configuration settings
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
  description TEXT,
  is_public BOOLEAN DEFAULT false, -- Whether setting is visible to non-admins
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Platform statistics cache
CREATE TABLE IF NOT EXISTS platform_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_date DATE NOT NULL,
  total_users INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  total_tournaments INTEGER DEFAULT 0,
  active_tournaments INTEGER DEFAULT 0,
  completed_tournaments INTEGER DEFAULT 0,
  total_bets INTEGER DEFAULT 0,
  total_bet_volume DECIMAL(12,2) DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  total_payouts DECIMAL(12,2) DEFAULT 0,
  system_uptime_percentage DECIMAL(5,2) DEFAULT 100,
  avg_response_time INTEGER DEFAULT 0, -- in milliseconds
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(stat_date)
);

-- Content moderation queue
CREATE TABLE IF NOT EXISTS moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL, -- chat_message, tournament_name, user_bio, etc.
  content_id UUID NOT NULL,
  content_text TEXT,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  flagged_reason VARCHAR(100) NOT NULL,
  auto_flagged BOOLEAN DEFAULT false,
  flagged_by UUID REFERENCES auth.users(id),
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, escalated
  moderator_id UUID REFERENCES auth.users(id),
  moderator_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Admin role permissions
CREATE TABLE IF NOT EXISTS admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  permission VARCHAR(100) NOT NULL, -- manage_users, manage_tournaments, manage_bets, etc.
  granted_by UUID REFERENCES auth.users(id) NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, permission)
);

-- System backup logs
CREATE TABLE IF NOT EXISTS backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type VARCHAR(50) NOT NULL, -- full, incremental, user_data, tournament_data
  status VARCHAR(20) NOT NULL, -- started, completed, failed
  file_size BIGINT,
  file_path TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Functions for admin operations
CREATE OR REPLACE FUNCTION log_admin_activity(
  admin_id UUID,
  action_type_param VARCHAR(100),
  target_type_param VARCHAR(100),
  target_id_param UUID,
  description_param TEXT,
  metadata_param JSONB DEFAULT '{}'
)
RETURNS void AS $$
BEGIN
  INSERT INTO admin_activity_log (
    admin_user_id, action_type, target_type, target_id, description, metadata
  ) VALUES (
    admin_id, action_type_param, target_type_param, target_id_param, description_param, metadata_param
  );
END;
$$ LANGUAGE plpgsql;

-- Function to create system alert
CREATE OR REPLACE FUNCTION create_system_alert(
  alert_type_param VARCHAR(50),
  title_param VARCHAR(255),
  message_param TEXT,
  source_param VARCHAR(100) DEFAULT 'system',
  severity_param INTEGER DEFAULT 1,
  metadata_param JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO system_alerts (
    alert_type, title, message, source, severity, metadata
  ) VALUES (
    alert_type_param, title_param, message_param, source_param, severity_param, metadata_param
  ) RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update platform statistics
CREATE OR REPLACE FUNCTION update_platform_statistics(stat_date_param DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
BEGIN
  INSERT INTO platform_statistics (
    stat_date,
    total_users,
    active_users,
    new_users,
    total_tournaments,
    active_tournaments,
    completed_tournaments,
    total_bets,
    total_bet_volume,
    total_revenue,
    total_payouts
  ) VALUES (
    stat_date_param,
    (SELECT COUNT(*) FROM auth.users),
    (SELECT COUNT(*) FROM auth.users WHERE last_sign_in_at > NOW() - INTERVAL '24 hours'),
    (SELECT COUNT(*) FROM auth.users WHERE created_at::date = stat_date_param),
    (SELECT COUNT(*) FROM tournaments),
    (SELECT COUNT(*) FROM tournaments WHERE status = 'active'),
    (SELECT COUNT(*) FROM tournaments WHERE status = 'completed'),
    (SELECT COUNT(*) FROM bets),
    (SELECT COALESCE(SUM(amount), 0) FROM bets),
    (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE transaction_type IN ('tournament_entry', 'bet_loss')),
    (SELECT COALESCE(SUM(amount), 0) FROM financial_transactions WHERE transaction_type IN ('prize_payout', 'bet_win'))
  )
  ON CONFLICT (stat_date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    new_users = EXCLUDED.new_users,
    total_tournaments = EXCLUDED.total_tournaments,
    active_tournaments = EXCLUDED.active_tournaments,
    completed_tournaments = EXCLUDED.completed_tournaments,
    total_bets = EXCLUDED.total_bets,
    total_bet_volume = EXCLUDED.total_bet_volume,
    total_revenue = EXCLUDED.total_revenue,
    total_payouts = EXCLUDED.total_payouts;
END;
$$ LANGUAGE plpgsql;

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('maintenance_mode', 'false', 'boolean', 'Enable maintenance mode to restrict platform access', false),
('new_user_registration', 'true', 'boolean', 'Allow new users to register', true),
('tournament_creation_enabled', 'true', 'boolean', 'Allow users to create tournaments', true),
('betting_system_enabled', 'true', 'boolean', 'Enable betting features', true),
('default_elo_rating', '1200', 'number', 'Default ELO rating for new users', true),
('max_tournament_entry_fee', '1000', 'number', 'Maximum tournament entry fee in USD', true),
('max_concurrent_tournaments', '50', 'number', 'Maximum number of concurrent tournaments', false),
('session_timeout_minutes', '60', 'number', 'User session timeout in minutes', false),
('platform_fee_percentage', '5', 'number', 'Platform fee percentage on transactions', false),
('min_withdrawal_amount', '10', 'number', 'Minimum withdrawal amount in USD', true)
ON CONFLICT (setting_key) DO NOTHING;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_admin ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_date ON admin_activity_log(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_activity_log_action ON admin_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_user_reports_status ON user_reports(status);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_user ON user_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bans_active ON user_bans(is_active);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user ON financial_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_platform_statistics_date ON platform_statistics(stat_date);
CREATE INDEX IF NOT EXISTS idx_moderation_queue_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_admin_permissions_user ON admin_permissions(user_id);
