-- Teammate Performance Analytics (Synergy & Friction)
-- This script provides views to analyze player performance correlations.

-- 1. Flattened view of all teammate pairings in matches
CREATE OR REPLACE VIEW v_teammate_pairings AS
SELECT 
    tm1.user_id as player_id,
    tm2.user_id as teammate_id,
    tm1.team_id,
    t.id as tournament_id,
    t.name as tournament_name,
    CASE 
        WHEN t.status = 'completed' AND (
            (p1.reported_team1_score > p1.reported_team2_score AND tt.draft_order = 1) OR
            (p1.reported_team2_score > p1.reported_team1_score AND tt.draft_order = 2)
        ) THEN 'win'
        WHEN t.status = 'completed' AND p1.reported_team1_score = p1.reported_team2_score THEN 'draw'
        ELSE 'loss'
    END as match_result,
    t.end_date as match_date
FROM tournament_team_members tm1
JOIN tournament_team_members tm2 ON tm1.team_id = tm2.team_id AND tm1.user_id != tm2.user_id
JOIN tournament_teams tt ON tm1.team_id = tt.id
JOIN tournaments t ON tt.tournament_id = t.id
JOIN tournament_participants p1 ON tm1.user_id = p1.user_id AND p1.tournament_id = t.id
WHERE t.status = 'completed';

-- 2. Aggregated Synergy & Friction Stats
CREATE OR REPLACE VIEW v_player_synergy_stats AS
SELECT 
    player_id,
    teammate_id,
    COUNT(*) as games_played,
    COUNT(*) FILTER (WHERE match_result = 'win') as wins,
    COUNT(*) FILTER (WHERE match_result = 'loss') as losses,
    ROUND((COUNT(*) FILTER (WHERE match_result = 'win'))::DECIMAL / NULLIF(COUNT(*), 0) * 100, 2) as win_rate,
    AVG(mh.elo_change) as avg_elo_gain
FROM v_teammate_pairings tp
LEFT JOIN match_history mh ON tp.player_id = mh.player_id AND tp.tournament_id = mh.tournament_id
GROUP BY player_id, teammate_id;

-- 3. Top Synergy Partners
CREATE OR REPLACE VIEW v_top_synergy_partners AS
SELECT 
    u1.username as player,
    u2.username as teammate,
    ss.games_played,
    ss.win_rate,
    ss.avg_elo_gain
FROM v_player_synergy_stats ss
JOIN users u1 ON ss.player_id = u1.id
JOIN users u2 ON ss.teammate_id = u2.id
WHERE ss.games_played >= 2
ORDER BY ss.win_rate DESC, ss.avg_elo_gain DESC;

-- 4. Highest Friction Partners
CREATE OR REPLACE VIEW v_highest_friction_partners AS
SELECT 
    u1.username as player,
    u2.username as teammate,
    ss.games_played,
    ss.win_rate,
    ss.avg_elo_gain
FROM v_player_synergy_stats ss
JOIN users u1 ON ss.player_id = u1.id
JOIN users u2 ON ss.teammate_id = u2.id
WHERE ss.games_played >= 2
ORDER BY ss.win_rate ASC, ss.avg_elo_gain ASC;
