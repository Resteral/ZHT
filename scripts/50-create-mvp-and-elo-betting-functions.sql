-- Create functions for MVP and ELO draft betting settlement

-- Function to settle MVP bets when match completes
CREATE OR REPLACE FUNCTION settle_mvp_bets(match_id_param UUID, mvp_player_id UUID)
RETURNS void AS $$
BEGIN
  -- Update MVP bets as won/lost based on MVP selection
  UPDATE bets 
  SET 
    status = CASE 
      WHEN bet_type = 'mvp' AND 
           market_id IN (
             SELECT id FROM betting_markets 
             WHERE game_id = match_id_param AND market_type = 'mvp'
           ) AND 
           selection = (SELECT username FROM users WHERE id = mvp_player_id)
      THEN 'won'
      ELSE 'lost'
    END,
    settled_at = NOW()
  WHERE bet_type = 'mvp' 
    AND market_id IN (
      SELECT id FROM betting_markets 
      WHERE game_id = match_id_param AND market_type = 'mvp'
    )
    AND status = 'pending';

  -- Pay out winning MVP bets
  UPDATE user_wallets 
  SET 
    balance = balance + b.potential_payout,
    total_winnings = total_winnings + (b.potential_payout - b.stake_amount)
  FROM bets b
  WHERE user_wallets.user_id = b.user_id
    AND b.bet_type = 'mvp'
    AND b.status = 'won'
    AND b.market_id IN (
      SELECT id FROM betting_markets 
      WHERE game_id = match_id_param AND market_type = 'mvp'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to settle ELO draft winner bets
CREATE OR REPLACE FUNCTION settle_elo_draft_winner_bets(match_id_param UUID, winner_user_id UUID)
RETURNS void AS $$
BEGIN
  -- Update winner bets as won/lost
  UPDATE bets 
  SET 
    status = CASE 
      WHEN bet_type = 'winner' AND 
           market_id IN (
             SELECT id FROM betting_markets 
             WHERE game_id = match_id_param AND market_type = 'winner'
           ) AND 
           selection = (SELECT username FROM users WHERE id = winner_user_id)
      THEN 'won'
      ELSE 'lost'
    END,
    settled_at = NOW()
  WHERE bet_type = 'winner' 
    AND market_id IN (
      SELECT id FROM betting_markets 
      WHERE game_id = match_id_param AND market_type = 'winner'
    )
    AND status = 'pending';

  -- Pay out winning bets
  UPDATE user_wallets 
  SET 
    balance = balance + b.potential_payout,
    total_winnings = total_winnings + (b.potential_payout - b.stake_amount)
  FROM bets b
  WHERE user_wallets.user_id = b.user_id
    AND b.bet_type = 'winner'
    AND b.status = 'won'
    AND b.market_id IN (
      SELECT id FROM betting_markets 
      WHERE game_id = match_id_param AND market_type = 'winner'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to settle highest ELO wins bets
CREATE OR REPLACE FUNCTION settle_highest_elo_bets(match_id_param UUID, winner_user_id UUID)
RETURNS void AS $$
DECLARE
  highest_elo_user_id UUID;
  highest_elo_won BOOLEAN;
BEGIN
  -- Find the user with highest ELO in the match
  SELECT user_id INTO highest_elo_user_id
  FROM match_participants mp
  JOIN users u ON mp.user_id = u.id
  WHERE mp.match_id = match_id_param
  ORDER BY u.elo_rating DESC
  LIMIT 1;

  -- Check if highest ELO player won
  highest_elo_won := (highest_elo_user_id = winner_user_id);

  -- Fixed bet settlement logic to use selection field instead of bet_type
  UPDATE bets 
  SET 
    status = CASE 
      WHEN bet_type = 'highest_elo_wins' AND 
           market_id IN (
             SELECT id FROM betting_markets 
             WHERE game_id = match_id_param AND market_type = 'highest_elo_wins'
           ) AND 
           ((highest_elo_won AND selection = 'Yes') OR 
            (NOT highest_elo_won AND selection = 'No'))
      THEN 'won'
      ELSE 'lost'
    END,
    settled_at = NOW()
  WHERE bet_type = 'highest_elo_wins' 
    AND market_id IN (
      SELECT id FROM betting_markets 
      WHERE game_id = match_id_param AND market_type = 'highest_elo_wins'
    )
    AND status = 'pending';

  -- Pay out winning bets
  UPDATE user_wallets 
  SET 
    balance = balance + b.potential_payout,
    total_winnings = total_winnings + (b.potential_payout - b.stake_amount)
  FROM bets b
  WHERE user_wallets.user_id = b.user_id
    AND b.bet_type = 'highest_elo_wins'
    AND b.status = 'won'
    AND b.market_id IN (
      SELECT id FROM betting_markets 
      WHERE game_id = match_id_param AND market_type = 'highest_elo_wins'
    );
END;
$$ LANGUAGE plpgsql;

-- Added comprehensive match settlement function that handles all bet types
CREATE OR REPLACE FUNCTION settle_all_match_bets(
  match_id_param UUID, 
  winner_user_id UUID, 
  mvp_player_id UUID,
  total_score INTEGER DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  -- Settle MVP bets
  PERFORM settle_mvp_bets(match_id_param, mvp_player_id);
  
  -- Settle winner bets
  PERFORM settle_elo_draft_winner_bets(match_id_param, winner_user_id);
  
  -- Settle highest ELO bets
  PERFORM settle_highest_elo_bets(match_id_param, winner_user_id);
  
  -- Settle total score bets if provided
  IF total_score IS NOT NULL THEN
    UPDATE bets 
    SET 
      status = CASE 
        WHEN bet_type = 'total_score' AND 
             market_id IN (
               SELECT id FROM betting_markets 
               WHERE game_id = match_id_param AND market_type = 'total_score'
             ) AND 
             ((selection LIKE 'Over%' AND total_score > 50.5) OR 
              (selection LIKE 'Under%' AND total_score <= 50.5))
        THEN 'won'
        ELSE 'lost'
      END,
      settled_at = NOW()
    WHERE bet_type = 'total_score' 
      AND market_id IN (
        SELECT id FROM betting_markets 
        WHERE game_id = match_id_param AND market_type = 'total_score'
      )
      AND status = 'pending';

    -- Pay out winning total score bets
    UPDATE user_wallets 
    SET 
      balance = balance + b.potential_payout,
      total_winnings = total_winnings + (b.potential_payout - b.stake_amount)
    FROM bets b
    WHERE user_wallets.user_id = b.user_id
      AND b.bet_type = 'total_score'
      AND b.status = 'won'
      AND b.market_id IN (
        SELECT id FROM betting_markets 
        WHERE game_id = match_id_param AND market_type = 'total_score'
      );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bets_bet_type ON bets(bet_type);
CREATE INDEX IF NOT EXISTS idx_bets_selection ON bets(selection);
CREATE INDEX IF NOT EXISTS idx_betting_markets_market_type ON betting_markets(market_type);
CREATE INDEX IF NOT EXISTS idx_betting_markets_game_id ON betting_markets(game_id);
CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
