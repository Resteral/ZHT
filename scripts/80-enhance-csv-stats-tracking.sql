-- Enhanced CSV stats tracking with additional save metrics
-- Add columns to track save amount and save percentage in CSV submissions

-- Add save amount tracking to existing tables if not present
DO $$ 
BEGIN
    -- Check if save_amount column exists in csv_player_stats table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'csv_player_stats' AND column_name = 'save_amount'
    ) THEN
        ALTER TABLE csv_player_stats ADD COLUMN save_amount INTEGER DEFAULT 0;
    END IF;

    -- Check if save_percentage column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'csv_player_stats' AND column_name = 'save_percentage'
    ) THEN
        ALTER TABLE csv_player_stats ADD COLUMN save_percentage DECIMAL(5,2) DEFAULT 0.0;
    END IF;
END $$;

-- Create function to calculate save percentage
CREATE OR REPLACE FUNCTION calculate_save_percentage(saves INTEGER, saves_allowed INTEGER)
RETURNS DECIMAL(5,2) AS $$
BEGIN
    IF (saves + saves_allowed) = 0 THEN
        RETURN 0.0;
    END IF;
    RETURN ROUND((saves::DECIMAL / (saves + saves_allowed)::DECIMAL) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically calculate save metrics when CSV data is inserted
CREATE OR REPLACE FUNCTION update_save_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate save amount (total save attempts)
    NEW.save_amount := COALESCE(NEW.saves, 0) + COALESCE(NEW.saves_allowed, 0);
    
    -- Calculate save percentage
    NEW.save_percentage := calculate_save_percentage(
        COALESCE(NEW.saves, 0), 
        COALESCE(NEW.saves_allowed, 0)
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_save_metrics ON csv_player_stats;

-- Create trigger for save metrics calculation
CREATE TRIGGER trigger_update_save_metrics
    BEFORE INSERT OR UPDATE ON csv_player_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_save_metrics();

-- Update existing records to calculate save metrics
UPDATE csv_player_stats 
SET 
    save_amount = COALESCE(saves, 0) + COALESCE(saves_allowed, 0),
    save_percentage = calculate_save_percentage(COALESCE(saves, 0), COALESCE(saves_allowed, 0))
WHERE save_amount IS NULL OR save_percentage IS NULL;

-- Create index for better performance on save-related queries
CREATE INDEX IF NOT EXISTS idx_csv_player_stats_save_metrics 
ON csv_player_stats(save_amount, save_percentage);

-- Create view for enhanced save statistics
CREATE OR REPLACE VIEW enhanced_save_stats AS
SELECT 
    account_id,
    username,
    team,
    games_played,
    SUM(saves) as total_saves,
    SUM(saves_allowed) as total_saves_allowed,
    SUM(save_amount) as total_save_amount,
    AVG(save_percentage) as avg_save_percentage,
    MAX(save_percentage) as best_save_percentage,
    SUM(possession) as total_possession,
    AVG(possession) as avg_possession_per_game
FROM csv_player_stats
GROUP BY account_id, username, team, games_played
ORDER BY avg_save_percentage DESC;

-- Grant permissions
GRANT SELECT ON enhanced_save_stats TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_save_percentage(INTEGER, INTEGER) TO authenticated;

COMMENT ON FUNCTION calculate_save_percentage IS 'Calculates save percentage from saves made and saves allowed';
COMMENT ON VIEW enhanced_save_stats IS 'Enhanced view of player save statistics with calculated metrics';
