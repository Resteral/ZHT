-- Profile view tracking and analytics tables
CREATE TABLE IF NOT EXISTS profile_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id UUID REFERENCES auth.users(id),
  viewed_profile_id UUID REFERENCES auth.users(id) NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  page_source TEXT, -- Which page the profile was viewed from
  view_duration INTEGER, -- Time spent viewing in seconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profile_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  target_user_id UUID REFERENCES auth.users(id) NOT NULL,
  interaction_type TEXT NOT NULL, -- 'view', 'follow', 'challenge', 'message'
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON profile_views(viewed_profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_date ON profile_views(viewed_at);
CREATE INDEX IF NOT EXISTS idx_profile_interactions_user ON profile_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_interactions_target ON profile_interactions(target_user_id);
