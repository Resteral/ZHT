-- Platform Settings Configuration

-- Create platform_settings table
CREATE TABLE IF NOT EXISTS platform_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
DROP POLICY IF EXISTS "Allow public read access to platform settings" ON platform_settings;
CREATE POLICY "Allow public read access to platform settings"
ON platform_settings FOR SELECT
USING (true);

-- Restrict write access to service roles or specific admin roles
-- For now, updates will be manual via database or a future admin panel
DROP POLICY IF EXISTS "Restrict write access to platform settings" ON platform_settings;
CREATE POLICY "Restrict write access to platform settings"
ON platform_settings FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role');

-- Insert default rake configuration
INSERT INTO platform_settings (key, value, description)
VALUES ('rake_percentage', '0.10', 'The default percentage rake taken from tournament and match prize pools (e.g. 0.10 for 10%)')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value, description = EXCLUDED.description;

-- Function to easily get a setting text value
CREATE OR REPLACE FUNCTION get_platform_setting(setting_key TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
  SELECT value FROM platform_settings WHERE key = setting_key;
$$;
