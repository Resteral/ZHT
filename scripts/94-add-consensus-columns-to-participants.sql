-- Add missing columns for consensus-based score reporting to tournament_participants
-- This is required for report_tournament_score and teammate synergy analytics.

ALTER TABLE public.tournament_participants 
ADD COLUMN IF NOT EXISTS reported_team1_score INTEGER,
ADD COLUMN IF NOT EXISTS reported_team2_score INTEGER,
ADD COLUMN IF NOT EXISTS reported_csv_code TEXT;

-- Index for consensus performance
CREATE INDEX IF NOT EXISTS idx_tournament_participants_scores 
ON public.tournament_participants(tournament_id, reported_team1_score, reported_team2_score);
