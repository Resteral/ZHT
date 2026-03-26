-- Create draft scheduling and notification tables

-- Ensure dependencies exist
ALTER TABLE public.tournament_teams ADD COLUMN IF NOT EXISTS team_captain UUID REFERENCES users(id);

-- Draft schedules table
CREATE TABLE IF NOT EXISTS public.draft_schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    league_id UUID REFERENCES public.leagues(id) ON DELETE CASCADE,
    draft_type VARCHAR(50) NOT NULL DEFAULT 'snake', -- auction, snake, linear
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 120,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Draft notifications table
CREATE TABLE IF NOT EXISTS public.draft_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID REFERENCES public.draft_schedules(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- 24_hour_reminder, 1_hour_reminder, 15_minute_reminder
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, sent, cancelled
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tournament schedule templates table
CREATE TABLE IF NOT EXISTS public.tournament_schedule_templates (
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
CREATE INDEX IF NOT EXISTS idx_draft_schedules_tournament ON public.draft_schedules(tournament_id);
CREATE INDEX IF NOT EXISTS idx_draft_schedules_league ON public.draft_schedules(league_id);
CREATE INDEX IF NOT EXISTS idx_draft_schedules_date ON public.draft_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_draft_schedules_status ON public.draft_schedules(status);

CREATE INDEX IF NOT EXISTS idx_draft_notifications_schedule ON public.draft_notifications(schedule_id);
CREATE INDEX IF NOT EXISTS idx_draft_notifications_scheduled_for ON public.draft_notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_draft_notifications_status ON public.draft_notifications(status);

CREATE INDEX IF NOT EXISTS idx_tournament_schedule_templates_active ON public.tournament_schedule_templates(is_active);

-- Enable RLS
ALTER TABLE public.draft_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draft_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_schedule_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for draft_schedules
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view tournament draft schedules" ON public.draft_schedules;
    CREATE POLICY "Users can view tournament draft schedules" ON public.draft_schedules
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.tournaments 
                WHERE id = public.draft_schedules.tournament_id 
                AND (created_by = auth.uid() OR status = 'active')
            )
            OR EXISTS (
                SELECT 1 FROM public.tournament_player_pool 
                WHERE tournament_id = public.draft_schedules.tournament_id 
                AND user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.tournament_teams 
                WHERE tournament_id = public.draft_schedules.tournament_id 
                AND team_captain = auth.uid()
            )
        );

    DROP POLICY IF EXISTS "Tournament organizers can manage draft schedules" ON public.draft_schedules;
    CREATE POLICY "Tournament organizers can manage draft schedules" ON public.draft_schedules
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.tournaments 
                WHERE id = public.draft_schedules.tournament_id 
                AND created_by = auth.uid()
            )
        );
END $$;

-- Create policies for draft_notifications
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Users can view their draft notifications" ON public.draft_notifications;
    CREATE POLICY "Users can view their draft notifications" ON public.draft_notifications
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM public.draft_schedules ds
                JOIN public.tournaments t ON t.id = ds.tournament_id
                WHERE ds.id = public.draft_notifications.schedule_id
                AND (
                    t.created_by = auth.uid()
                    OR EXISTS (
                        SELECT 1 FROM public.tournament_player_pool 
                        WHERE tournament_id = t.id AND user_id = auth.uid()
                    )
                    OR EXISTS (
                        SELECT 1 FROM public.tournament_teams 
                        WHERE tournament_id = t.id AND team_captain = auth.uid()
                    )
                )
            )
        );
END $$;

-- Create policies for tournament_schedule_templates
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Anyone can view active templates" ON public.tournament_schedule_templates;
    CREATE POLICY "Anyone can view active templates" ON public.tournament_schedule_templates
        FOR SELECT USING (is_active = true);

    DROP POLICY IF EXISTS "Admins can manage templates" ON public.tournament_schedule_templates;
    CREATE POLICY "Admins can manage templates" ON public.tournament_schedule_templates
        FOR ALL USING (
            EXISTS (
                SELECT 1 FROM public.users 
                WHERE id = auth.uid() 
                AND role = 'admin'
            )
        );
END $$;

-- Grant permissions
GRANT ALL ON public.draft_schedules TO authenticated;
GRANT ALL ON public.draft_notifications TO authenticated;
GRANT ALL ON public.tournament_schedule_templates TO authenticated;
