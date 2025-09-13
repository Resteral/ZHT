-- Add captain team customization features to tournament teams

-- Add customization columns to tournament_teams table
ALTER TABLE tournament_teams 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS team_color VARCHAR(7) DEFAULT '#10b981',
ADD COLUMN IF NOT EXISTS team_theme JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS custom_settings JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS captain_notes TEXT,
ADD COLUMN IF NOT EXISTS team_motto TEXT,
ADD COLUMN IF NOT EXISTS auction_bid_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS snake_pick_preference JSONB DEFAULT '{}';

-- Create captain team customization table for extended settings
CREATE TABLE IF NOT EXISTS captain_team_customization (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    captain_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    logo_url TEXT,
    team_colors JSONB DEFAULT '{"primary": "#10b981", "secondary": "#059669", "accent": "#0ea5e9"}',
    team_branding JSONB DEFAULT '{}',
    strategy_notes TEXT,
    player_preferences JSONB DEFAULT '{}',
    auction_settings JSONB DEFAULT '{"max_bid": 100, "auto_bid": false, "bid_increment": 5}',
    snake_draft_settings JSONB DEFAULT '{"position_priority": [], "player_targets": []}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, captain_id)
);

-- Create captain auction bids table
CREATE TABLE IF NOT EXISTS captain_auction_bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    captain_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bid_amount DECIMAL(10,2) NOT NULL,
    bid_type VARCHAR(20) DEFAULT 'manual' CHECK (bid_type IN ('manual', 'auto', 'proxy')),
    bid_status VARCHAR(20) DEFAULT 'active' CHECK (bid_status IN ('active', 'outbid', 'won', 'withdrawn')),
    bid_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    UNIQUE(tournament_id, team_id, player_id)
);

-- Create captain snake draft picks table
CREATE TABLE IF NOT EXISTS captain_snake_picks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES tournament_teams(id) ON DELETE CASCADE,
    captain_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    player_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pick_round INTEGER NOT NULL,
    pick_position INTEGER NOT NULL,
    pick_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    pick_strategy TEXT,
    UNIQUE(tournament_id, pick_round, pick_position),
    UNIQUE(tournament_id, team_id, player_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_captain_customization_team_id ON captain_team_customization(team_id);
CREATE INDEX IF NOT EXISTS idx_captain_customization_captain_id ON captain_team_customization(captain_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_tournament_id ON captain_auction_bids(tournament_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_team_id ON captain_auction_bids(team_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_captain_id ON captain_auction_bids(captain_id);
CREATE INDEX IF NOT EXISTS idx_auction_bids_status ON captain_auction_bids(bid_status);
CREATE INDEX IF NOT EXISTS idx_snake_picks_tournament_id ON captain_snake_picks(tournament_id);
CREATE INDEX IF NOT EXISTS idx_snake_picks_team_id ON captain_snake_picks(team_id);
CREATE INDEX IF NOT EXISTS idx_snake_picks_captain_id ON captain_snake_picks(captain_id);
CREATE INDEX IF NOT EXISTS idx_snake_picks_round_position ON captain_snake_picks(pick_round, pick_position);

-- Function to initialize captain customization when captain is assigned
CREATE OR REPLACE FUNCTION initialize_captain_customization()
RETURNS TRIGGER AS $$
BEGIN
    -- Only initialize if team_captain is being set (not null)
    IF NEW.team_captain IS NOT NULL AND (OLD.team_captain IS NULL OR OLD.team_captain != NEW.team_captain) THEN
        INSERT INTO captain_team_customization (team_id, captain_id)
        VALUES (NEW.id, NEW.team_captain)
        ON CONFLICT (team_id, captain_id) DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for captain customization initialization
DROP TRIGGER IF EXISTS trigger_initialize_captain_customization ON tournament_teams;
CREATE TRIGGER trigger_initialize_captain_customization
    AFTER INSERT OR UPDATE OF team_captain ON tournament_teams
    FOR EACH ROW
    EXECUTE FUNCTION initialize_captain_customization();

-- Function to update team customization timestamp
CREATE OR REPLACE FUNCTION update_customization_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for customization timestamp updates
DROP TRIGGER IF EXISTS trigger_update_customization_timestamp ON captain_team_customization;
CREATE TRIGGER trigger_update_customization_timestamp
    BEFORE UPDATE ON captain_team_customization
    FOR EACH ROW
    EXECUTE FUNCTION update_customization_timestamp();

-- Function to get captain team customization
CREATE OR REPLACE FUNCTION get_captain_team_customization(
    p_tournament_id UUID,
    p_captain_id UUID
)
RETURNS TABLE (
    team_id UUID,
    team_name TEXT,
    logo_url TEXT,
    team_colors JSONB,
    team_branding JSONB,
    strategy_notes TEXT,
    auction_settings JSONB,
    snake_draft_settings JSONB,
    budget_remaining DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        tt.id as team_id,
        tt.team_name,
        COALESCE(ctc.logo_url, tt.logo_url) as logo_url,
        ctc.team_colors,
        ctc.team_branding,
        ctc.strategy_notes,
        ctc.auction_settings,
        ctc.snake_draft_settings,
        tt.budget_remaining
    FROM tournament_teams tt
    LEFT JOIN captain_team_customization ctc ON tt.id = ctc.team_id AND ctc.captain_id = p_captain_id
    WHERE tt.tournament_id = p_tournament_id 
    AND tt.team_captain = p_captain_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update captain team customization
CREATE OR REPLACE FUNCTION update_captain_team_customization(
    p_team_id UUID,
    p_captain_id UUID,
    p_logo_url TEXT DEFAULT NULL,
    p_team_colors JSONB DEFAULT NULL,
    p_team_branding JSONB DEFAULT NULL,
    p_strategy_notes TEXT DEFAULT NULL,
    p_auction_settings JSONB DEFAULT NULL,
    p_snake_draft_settings JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO captain_team_customization (
        team_id, 
        captain_id, 
        logo_url, 
        team_colors, 
        team_branding, 
        strategy_notes, 
        auction_settings, 
        snake_draft_settings
    )
    VALUES (
        p_team_id, 
        p_captain_id, 
        p_logo_url, 
        p_team_colors, 
        p_team_branding, 
        p_strategy_notes, 
        p_auction_settings, 
        p_snake_draft_settings
    )
    ON CONFLICT (team_id, captain_id) 
    DO UPDATE SET
        logo_url = COALESCE(EXCLUDED.logo_url, captain_team_customization.logo_url),
        team_colors = COALESCE(EXCLUDED.team_colors, captain_team_customization.team_colors),
        team_branding = COALESCE(EXCLUDED.team_branding, captain_team_customization.team_branding),
        strategy_notes = COALESCE(EXCLUDED.strategy_notes, captain_team_customization.strategy_notes),
        auction_settings = COALESCE(EXCLUDED.auction_settings, captain_team_customization.auction_settings),
        snake_draft_settings = COALESCE(EXCLUDED.snake_draft_settings, captain_team_customization.snake_draft_settings),
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON captain_team_customization TO authenticated;
GRANT ALL ON captain_auction_bids TO authenticated;
GRANT ALL ON captain_snake_picks TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE captain_team_customization IS 'Captain-specific team customization settings including logos, colors, and strategy notes';
COMMENT ON TABLE captain_auction_bids IS 'Captain auction bids for players in auction-style drafts';
COMMENT ON TABLE captain_snake_picks IS 'Captain picks in snake draft tournaments with strategy notes';

COMMENT ON FUNCTION get_captain_team_customization(UUID, UUID) IS 'Retrieves captain team customization settings';
COMMENT ON FUNCTION update_captain_team_customization(UUID, UUID, TEXT, JSONB, JSONB, TEXT, JSONB, JSONB) IS 'Updates captain team customization settings';
