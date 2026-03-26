-- Tournament Lifecycle Service Dependencies
-- Provides missing tables required by the tournament-lifecycle-service.ts
-- ensuring robust cleanup, archiving, and notifications.

-- 1. Tournament Cleanup Schedule
CREATE TABLE IF NOT EXISTS public.tournament_cleanup_schedule (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    scheduled_cleanup_at TIMESTAMP WITH TIME ZONE NOT NULL,
    cleanup_policy JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, failed
    error_message TEXT,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tournament_id)
);

-- 2. Tournament Archives (for long-term storage of completed tournaments)
CREATE TABLE IF NOT EXISTS public.tournament_archives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL,
    tournament_data JSONB NOT NULL,
    preserve_results BOOLEAN DEFAULT true,
    archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. General Notifications Table (standardized)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL, -- tournament_cleanup, match_start, prize_payout, etc.
    tournament_id UUID,
    is_read BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cleanup_status ON public.tournament_cleanup_schedule(status);
CREATE INDEX IF NOT EXISTS idx_cleanup_date ON public.tournament_cleanup_schedule(scheduled_cleanup_at);
CREATE INDEX IF NOT EXISTS idx_archives_tournament_id ON public.tournament_archives(tournament_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);

-- 5. Enable RLS
ALTER TABLE public.tournament_cleanup_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_archives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can view cleanup schedule' AND tablename = 'tournament_cleanup_schedule') THEN
        CREATE POLICY "Admins can view cleanup schedule" ON tournament_cleanup_schedule
            FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view their own notifications' AND tablename = 'notifications') THEN
        CREATE POLICY "Users can view their own notifications" ON notifications
            FOR SELECT USING (user_id = auth.uid());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update their own notifications' AND tablename = 'notifications') THEN
        CREATE POLICY "Users can update their own notifications" ON notifications
            FOR UPDATE USING (user_id = auth.uid());
    END IF;
END $$;

-- 7. Grant permissions
GRANT SELECT ON public.tournament_cleanup_schedule TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT UPDATE ON public.notifications TO authenticated;

COMMENT ON TABLE tournament_cleanup_schedule IS 'Tracks scheduled data cleanup tasks for completed or cancelled tournaments';
COMMENT ON TABLE tournament_archives IS 'Persistent storage for full tournament data snapshots after deletion';
COMMENT ON TABLE notifications IS 'Centralized notification system for all platform events';
