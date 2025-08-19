-- Adding proper unique constraints and indexes for CSV processing
-- Fix player_performances table for proper upserts
ALTER TABLE player_performances 
ADD CONSTRAINT player_performances_unique_game 
UNIQUE (player_id, game_date, opponent);

-- Fix player_analytics table for proper upserts  
ALTER TABLE player_analytics 
ADD CONSTRAINT player_analytics_unique_match 
UNIQUE (user_id, match_id);

-- Add indexes for better CSV processing performance
CREATE INDEX IF NOT EXISTS idx_player_performances_lookup 
ON player_performances (player_id, game_date);

CREATE INDEX IF NOT EXISTS idx_player_analytics_lookup 
ON player_analytics (user_id, match_id);

-- Create CSV processing log table for tracking and deduplication
CREATE TABLE IF NOT EXISTS csv_processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID REFERENCES matches(id),
    csv_data_hash TEXT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processing_status TEXT DEFAULT 'success',
    error_message TEXT,
    stats_count INTEGER DEFAULT 0,
    UNIQUE(match_id, csv_data_hash)
);

-- Create function for safe CSV data processing
CREATE OR REPLACE FUNCTION process_csv_stats_safely(
    p_match_id UUID,
    p_csv_hash TEXT,
    p_stats_data JSONB
) RETURNS JSONB AS $$
DECLARE
    result JSONB := '{"success": true, "processed": 0, "errors": []}';
    stat_record JSONB;
    processed_count INTEGER := 0;
BEGIN
    -- Check if this CSV data was already processed
    IF EXISTS (
        SELECT 1 FROM csv_processing_logs 
        WHERE match_id = p_match_id AND csv_data_hash = p_csv_hash
    ) THEN
        RETURN '{"success": false, "error": "CSV data already processed for this match"}';
    END IF;
    
    -- Process each stat record
    FOR stat_record IN SELECT * FROM jsonb_array_elements(p_stats_data)
    LOOP
        BEGIN
            -- Insert or update player performance
            INSERT INTO player_performances (
                player_id, game_date, opponent, stats, points_scored
            ) VALUES (
                (stat_record->>'userId')::UUID,
                NOW(),
                'Match ' || p_match_id::TEXT,
                stat_record->'stats',
                COALESCE((stat_record->'stats'->>'goals')::NUMERIC, 0) + 
                COALESCE((stat_record->'stats'->>'assists')::NUMERIC, 0)
            )
            ON CONFLICT (player_id, game_date, opponent) 
            DO UPDATE SET 
                stats = EXCLUDED.stats,
                points_scored = EXCLUDED.points_scored;
                
            processed_count := processed_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            result := jsonb_set(
                result, 
                '{errors}', 
                (result->'errors') || jsonb_build_array(SQLERRM)
            );
        END;
    END LOOP;
    
    -- Log the processing
    INSERT INTO csv_processing_logs (
        match_id, csv_data_hash, stats_count, processing_status
    ) VALUES (
        p_match_id, p_csv_hash, processed_count, 'success'
    );
    
    result := jsonb_set(result, '{processed}', processed_count::TEXT::JSONB);
    RETURN result;
END;
$$ LANGUAGE plpgsql;
