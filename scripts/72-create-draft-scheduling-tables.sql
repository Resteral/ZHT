-- Create draft scheduling and notification tables

-- Draft schedules table
CREATE TABLE IF NOT EXISTS draft_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
    league_id UUID REFERENCES leagues(id) ON DELETE CASCADE,
    draft_type VARCHAR(50) NOT NULL DEFAULT 'snake', -- auction, snake, linear
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 120,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draft notifications table
CREATE TABLE IF NOT EXISTS draft_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES draft_schedules(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 24_hour_reminder, 1_hour_reminder, 15_minute_reminder
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, sent, cancelled
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament schedule templates table
CREATE TABLE IF NOT EXISTS tournament_schedule_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    tournament_type VARCHAR(50) NOT NULL,
    draft_type VARCHAR(50) NOT NULL DEFAULT 'snake',
    schedule_type VARCHAR(50) NOT NULL DEFAULT 'one_time', -- one_time, recurring
    frequency VARCHAR(50), -- daily, weekly, monthly
    day_of_week INTEGER, -- 0-6 for Sunday-Saturday
    time_of_day TIME NOT NULL,
    duration_minutes INTEGER DEFAULT 120,
    max_teams INTEGER DEFAULT 8,
    players_per_team INTEGER DEFAULT 5,
    entry_fee DECIMAL(10,2) DEFAULT 0,
    prize_pool DECIMAL(10,2) DEFAULT 0,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_draft_schedules_tournament ON draft_schedules(tournament_id);
CREATE INDEX IF NOT EXISTS idx_draft_schedules_league ON draft_schedules(league_id);
CREATE INDEX IF NOT EXISTS idx_draft_schedules_date ON draft_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_draft_schedules_status ON draft_schedules(status);

CREATE INDEX IF NOT EXISTS idx_draft_notifications_schedule ON draft_notifications(schedule_id);
CREATE INDEX IF NOT EXISTS idx_draft_notifications_scheduled_for ON draft_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_draft_notifications_status ON draft_notifications(status);

CREATE INDEX IF NOT EXISTS idx_tournament_schedule_templates_active ON tournament_schedule_templates(is_active);

-- Enable RLS
ALTER TABLE draft_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_schedule_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for draft_schedules
CREATE POLICY "Users can view tournament draft schedules" ON draft_schedules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE id = draft_schedules.tournament_id 
            AND (created_by = auth.uid() OR status = 'active')
        )
        OR EXISTS (
            SELECT 1 FROM tournament_player_pool 
            WHERE tournament_id = draft_schedules.tournament_id 
            AND user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM tournament_teams 
            WHERE tournament_id = draft_schedules.tournament_id 
            AND team_captain = auth.uid()
        )
    );

CREATE POLICY "Tournament organizers can manage draft schedules" ON draft_schedules
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM tournaments 
            WHERE id = draft_schedules.tournament_id 
            AND created_by = auth.uid()
        )
    );

-- Create policies for draft_notifications
CREATE POLICY "Users can view their draft notifications" ON draft_notifications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM draft_schedules ds
            JOIN tournaments t ON t.id = ds.tournament_id
            WHERE ds.id = draft_notifications.schedule_id
            AND (
                t.created_by = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM tournament_player_pool 
                    WHERE tournament_id = t.id AND user_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM tournament_teams 
                    WHERE tournament_id = t.id AND team_captain = auth.uid()
                )
            )
        )
    );

-- Create policies for tournament_schedule_templates
CREATE POLICY "Anyone can view active templates" ON tournament_schedule_templates
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage templates" ON tournament_schedule_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

-- Grant permissions
GRANT ALL ON draft_schedules TO authenticated;
GRANT ALL ON draft_notifications TO authenticated;
GRANT ALL ON tournament_schedule_templates TO authenticated;
