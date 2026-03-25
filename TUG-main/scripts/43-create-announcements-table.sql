-- Create announcements table for system announcements and notifications
-- Ensure columns exist if table was already created differently
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS announcement_type VARCHAR(50) DEFAULT 'general';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 1;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_audience VARCHAR(50) DEFAULT 'all';
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Force drop potentially conflicting constraints
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_priority_check;
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_type_check;
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_status_check;
ALTER TABLE public.announcements DROP CONSTRAINT IF EXISTS announcements_announcement_type_check;

-- Handle modernization and re-add constraints
DO $$ 
BEGIN 
    -- Add modern standardized constraints
    ALTER TABLE public.announcements ADD CONSTRAINT announcements_priority_check CHECK (priority BETWEEN 1 AND 5);
    ALTER TABLE public.announcements ADD CONSTRAINT announcements_type_check CHECK (announcement_type IN ('general', 'maintenance', 'feature', 'tournament', 'system'));
    ALTER TABLE public.announcements ADD CONSTRAINT announcements_status_check CHECK (status IN ('active', 'inactive', 'scheduled', 'expired'));
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Constraint modernization skipped: %', SQLERRM;
END $$;

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

-- Insert sample data safely specifying ALL columns to avoid default/null issues
INSERT INTO public.announcements (
    title, 
    content, 
    announcement_type, 
    priority, 
    status, 
    is_pinned, 
    view_count, 
    metadata
) VALUES
('Welcome to the Fantasy Sports Platform!', 'Welcome to our fantasy sports platform! Create teams, join leagues, and compete with friends.', 'general', 1, 'active', false, 0, '{}'::jsonb),
('New ELO Draft System Available', 'Try our new ELO draft system with 1v1, 2v2, 3v3, 4v4, 5v5, and 6v6 formats. FREE entry with $50 rewards per player!', 'feature', 3, 'active', false, 0, '{}'::jsonb),
('Tournament Registration Open', 'Registration is now open for upcoming tournaments. Check the tournaments page for details.', 'tournament', 2, 'active', false, 0, '{}'::jsonb);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;
