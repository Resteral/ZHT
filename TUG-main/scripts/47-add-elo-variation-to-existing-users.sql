-- Add ELO variation to existing users who have default 1200 rating
-- This will make player data more realistic with varied skill levels

UPDATE users 
SET elo_rating = CASE 
  WHEN elo_rating = 1200 THEN 
    -- Generate random ELO between 800-2000 with normal distribution around 1200
    GREATEST(800, LEAST(2000, 1200 + (RANDOM() * 600 - 300)::INTEGER))
  ELSE elo_rating 
END
WHERE elo_rating = 1200;

-- Add some sample high-skill players for testing
INSERT INTO users (id, username, email, elo_rating, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'ProPlayer1', 'pro1@example.com', 1850, NOW(), NOW()),
  (gen_random_uuid(), 'EliteGamer', 'elite@example.com', 1750, NOW(), NOW()),
  (gen_random_uuid(), 'SkillMaster', 'skill@example.com', 1650, NOW(), NOW()),
  (gen_random_uuid(), 'Rookie123', 'rookie@example.com', 950, NOW(), NOW()),
  (gen_random_uuid(), 'Beginner', 'begin@example.com', 850, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Create index on elo_rating for better performance when sorting by skill
CREATE INDEX IF NOT EXISTS idx_users_elo_rating ON users(elo_rating DESC);
