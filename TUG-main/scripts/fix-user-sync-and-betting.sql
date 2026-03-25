-- Fix user synchronization and add tournament betting functionality

-- First, ensure the authenticated user exists in the database
INSERT INTO users (
  id,
  username,
  email,
  elo_rating,
  total_games,
  wins,
  losses,
  balance,
  created_at,
  updated_at
) VALUES (
  '944b281e-89d5-46f7-b10b-2439f275e179',
  'Resteral',
  'resteral@example.com',
  1200,
  0,
  0,
  0,
  1000.00,
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  username = EXCLUDED.username,
  updated_at = NOW();

-- Ensure user has a wallet for betting
INSERT INTO user_wallets (
  user_id,
  balance,
  total_deposited,
  total_wagered,
  total_winnings,
  total_withdrawn,
  created_at,
  updated_at
) VALUES (
  '944b281e-89d5-46f7-b10b-2439f275e179',
  1000.00,
  1000.00,
  0.00,
  0.00,
  0.00,
  NOW(),
  NOW()
) ON CONFLICT (user_id) DO UPDATE SET
  updated_at = NOW();

-- Create betting markets for existing tournaments
INSERT INTO betting_markets (
  id,
  game_id,
  league_id,
  market_type,
  description,
  status,
  odds_home,
  odds_away,
  created_at,
  updated_at
) 
SELECT 
  gen_random_uuid(),
  NULL,
  t.id,
  'tournament_winner',
  'Tournament Winner: ' || t.name,
  'active',
  2.0,
  2.0,
  NOW(),
  NOW()
FROM tournaments t
WHERE t.status = 'active'
ON CONFLICT DO NOTHING;

-- Function to automatically create user wallet when user joins tournament
CREATE OR REPLACE FUNCTION ensure_user_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_wallets (
    user_id,
    balance,
    total_deposited,
    total_wagered,
    total_winnings,
    total_withdrawn,
    created_at,
    updated_at
  ) VALUES (
    NEW.user_id,
    1000.00,
    1000.00,
    0.00,
    0.00,
    0.00,
    NOW(),
    NOW()
  ) ON CONFLICT (user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure wallet exists when user joins tournament
DROP TRIGGER IF EXISTS ensure_wallet_on_tournament_join ON tournament_participants;
CREATE TRIGGER ensure_wallet_on_tournament_join
  AFTER INSERT ON tournament_participants
  FOR EACH ROW
  EXECUTE FUNCTION ensure_user_wallet();
