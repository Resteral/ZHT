-- Creating comprehensive database reset script to wipe everything to default
-- Reset all user statistics to default values
UPDATE users SET 
  elo_rating = 1200,
  mmr = 1200,
  total_games = 0,
  wins = 0,
  losses = 0,
  balance = 0.00,
  updated_at = NOW()
WHERE id IS NOT NULL;

-- Clear all match-related data
DELETE FROM match_results;
DELETE FROM match_scores;
DELETE FROM score_submissions;
DELETE FROM match_participants;
DELETE FROM match_analytics;
DELETE FROM player_analytics;
DELETE FROM team_analytics;
DELETE FROM csv_processing_logs;

-- Clear all ELO history
DELETE FROM elo_history;

-- Clear all betting data
DELETE FROM bets;
DELETE FROM betting_markets;
DELETE FROM auction_bets;

-- Clear all draft and league data
DELETE FROM draft_bids;
DELETE FROM captain_draft_participants;
DELETE FROM captain_drafts;
DELETE FROM auction_draft_bids;
DELETE FROM auction_drafts;
DELETE FROM auction_league_participants;
DELETE FROM auction_leagues;
DELETE FROM league_memberships;
DELETE FROM league_standings;
DELETE FROM leagues;

-- Clear all match data
DELETE FROM matches;

-- Clear all performance data
DELETE FROM player_performances;
DELETE FROM player_mvp_awards;
DELETE FROM mvp_votes;

-- Clear all financial data
DELETE FROM financial_transactions;
DELETE FROM user_wallets;
DELETE FROM wager_match_results;
DELETE FROM wager_match_transactions;
DELETE FROM wager_matches;
DELETE FROM team_battles;

-- Clear all team rosters
DELETE FROM team_rosters;

-- Clear all game data
DELETE FROM games;

-- Clear all schedules
DELETE FROM schedules;

-- Clear all stat imports
DELETE FROM stat_imports;

-- Clear all flags and reports
DELETE FROM player_flags;
DELETE FROM player_flag_summary;
DELETE FROM user_reports;

-- Clear all moderation queue
DELETE FROM moderation_queue;

-- Clear all profile interactions
DELETE FROM profile_interactions;
DELETE FROM profile_views;

-- Clear all announcements
DELETE FROM announcements;

-- Clear all system alerts
DELETE FROM system_alerts;

-- Clear all backup logs
DELETE FROM backup_logs;

-- Clear all platform statistics
DELETE FROM platform_statistics;

-- Reset premade teams to available
UPDATE premade_teams SET available = true WHERE id IS NOT NULL;

-- Clear all scheduled auctions
DELETE FROM scheduled_auctions;

-- Log the reset operation
INSERT INTO admin_activity_log (
  id,
  admin_user_id,
  action_type,
  target_type,
  description,
  created_at,
  ip_address
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
  'SYSTEM_RESET',
  'DATABASE',
  'Complete database reset to default state',
  NOW(),
  '127.0.0.1'::inet
);
