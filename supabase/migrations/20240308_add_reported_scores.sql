-- Add reported scores to tournament_participants table
ALTER TABLE public.tournament_participants
ADD COLUMN IF NOT EXISTS reported_team1_score integer,
ADD COLUMN IF NOT EXISTS reported_team2_score integer;
