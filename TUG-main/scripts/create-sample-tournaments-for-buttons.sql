-- Create sample tournaments for each tournament type button
-- This provides users with tournaments to join and demonstrates the system

-- Snake Draft Tournament
INSERT INTO tournaments (
  id,
  name,
  description,
  league_mode,
  max_participants,
  start_date,
  status,
  settings,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Weekly Snake Draft Championship',
  'Join our weekly snake draft tournament! Highest ELO players become captains and draft teams. Perfect for competitive players looking for strategic team building.',
  'snake_draft',
  999999,
  NOW() + INTERVAL '2 hours',
  'registration',
  jsonb_build_object(
    'bracket_type', 'single_elimination',
    'players_per_team', 6,
    'draft_time_limit', 60,
    'scoring_system', 'standard',
    'auto_start', true
  ),
  NOW(),
  NOW()
);

-- Linear Draft Tournament  
INSERT INTO tournaments (
  id,
  name,
  description,
  league_mode,
  max_participants,
  start_date,
  status,
  settings,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Linear Draft Pro League',
  'Experience linear drafting where teams are built in order. Great for beginners and those who prefer straightforward team selection.',
  'linear_draft',
  999999,
  NOW() + INTERVAL '4 hours',
  'registration',
  jsonb_build_object(
    'bracket_type', 'round_robin',
    'players_per_team', 8,
    'draft_time_limit', 45,
    'scoring_system', 'points',
    'auto_start', true
  ),
  NOW(),
  NOW()
);

-- Auction Draft Tournament
INSERT INTO tournaments (
  id,
  name,
  description,
  league_mode,
  max_participants,
  start_date,
  status,
  settings,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Auction Draft Masters',
  'Bid on your favorite players in this exciting auction format! Manage your budget wisely to build the ultimate team.',
  'auction_draft',
  999999,
  NOW() + INTERVAL '6 hours',
  'registration',
  jsonb_build_object(
    'bracket_type', 'double_elimination',
    'players_per_team', 10,
    'starting_budget', 1000,
    'min_bid', 5,
    'bid_time_limit', 30,
    'scoring_system', 'fantasy',
    'auto_start', true
  ),
  NOW(),
  NOW()
);

-- Quick Join Tournament (Starting Soon)
INSERT INTO tournaments (
  id,
  name,
  description,
  league_mode,
  max_participants,
  start_date,
  status,
  settings,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'Quick Start Snake Draft',
  'Starting in 30 minutes! Perfect for players who want immediate action. Join now and get ready to draft!',
  'snake_draft',
  999999,
  NOW() + INTERVAL '30 minutes',
  'registration',
  jsonb_build_object(
    'bracket_type', 'single_elimination',
    'players_per_team', 4,
    'draft_time_limit', 45,
    'scoring_system', 'standard',
    'auto_start', true
  ),
  NOW(),
  NOW()
);
