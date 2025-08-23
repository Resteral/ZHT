-- Add visibility and hosting support to tournament player pool system

-- Add visibility column to tournament_player_pool table
ALTER TABLE tournament_player_pool 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public'));

-- Add hosted timestamp to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS hosted_at TIMESTAMP WITH TIME ZONE;

-- Create index for public pool queries
CREATE INDEX IF NOT EXISTS idx_tournament_player_pool_visibility ON tournament_player_pool(visibility);
CREATE INDEX IF NOT EXISTS idx_tournaments_hosted ON tournaments(hosted_at);

-- Create function to automatically make pools public when tournament is hosted
CREATE OR REPLACE FUNCTION make_pool_public_on_host()
RETURNS TRIGGER AS $$
BEGIN
    -- If tournament status changed to active and hosted_at is set
    IF NEW.status = 'active' AND NEW.hosted_at IS NOT NULL AND OLD.hosted_at IS NULL THEN
        -- Make player pool public if settings allow
        IF NEW.player_pool_settings ? 'allow_public_visibility' AND 
           (NEW.player_pool_settings->>'allow_public_visibility')::boolean = true THEN
            UPDATE tournament_player_pool 
            SET visibility = 'public', updated_at = NOW()
            WHERE tournament_id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic public visibility
DROP TRIGGER IF EXISTS trigger_make_pool_public_on_host ON tournaments;
CREATE TRIGGER trigger_make_pool_public_on_host
    AFTER UPDATE OF status, hosted_at ON tournaments
    FOR EACH ROW
    EXECUTE FUNCTION make_pool_public_on_host();

-- Create view for public tournament pools
CREATE OR REPLACE VIEW public_tournament_pools AS
SELECT 
    t.id as tournament_id,
    t.name as tournament_name,
    t.status,
    t.hosted_at,
    tpp.user_id,
    tpp.status as player_status,
    tpp.created_at as joined_at,
    u.username,
    u.elo_rating,
    pa.goals,
    pa.assists,
    pa.saves,
    pa.games_played
FROM tournaments t
JOIN tournament_player_pool tpp ON t.id = tpp.tournament_id
JOIN users u ON tpp.user_id = u.id
LEFT JOIN player_analytics pa ON u.id = pa.user_id
WHERE tpp.visibility = 'public' 
  AND t.status IN ('active', 'registration')
ORDER BY t.hosted_at DESC, tpp.created_at ASC;

-- Grant permissions
GRANT SELECT ON public_tournament_pools TO authenticated;
GRANT ALL ON tournament_player_pool TO authenticated;
