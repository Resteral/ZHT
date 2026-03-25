-- Create announcements table for system announcements and notifications
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,ww
    content TEXT NOT NULL,
    announcement_type VARCHAR(50) DEFAULT 'general' CHECK (announcement_type IN ('general', 'maintenance', 'feature', 'tournament', 'system')),
    priority INTEGER DEFAULT 1 CHECK (priority BETWEEN 1 AND 5), -- 1 = low, 5 = critical
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'scheduled', 'expired')),
    author_id UUID REFERENCES users(id) ON DELETE SET NULL,
    target_audience VARCHAR(50) DEFAULT 'all' CHECK (target_audience IN ('all', 'admins', 'premium', 'new_users')),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_pinned BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_announcements_status ON public.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_type ON public.announcements(announcement_type);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON public.announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON public.announcements(priority DESC);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON public.announcements(is_pinned) WHERE is_pinned = TRUE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_announcements_updated_at ON public.announcements;
CREATE TRIGGER trigger_update_announcements_updated_at
    BEFORE UPDATE ON public.announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_announcements_updated_at();

-- Insert some sample announcements
INSERT INTO public.announcements (title, content, announcement_type, priority, author_id) VALUES
('Welcome to the Fantasy Sports Platform!', 'Welcome to our fantasy sports platform! Create teams, join leagues, and compete with friends.', 'general', 2, NULL),
('New ELO Draft System Available', 'Try our new ELO draft system with 1v1, 2v2, 3v3, 4v4, 5v5, and 6v6 formats. FREE entry with $50 rewards per player!', 'feature', 3, NULL),
('Tournament Registration Open', 'Registration is now open for upcoming tournaments. Check the tournaments page for details.', 'tournament', 2, NULL);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;
