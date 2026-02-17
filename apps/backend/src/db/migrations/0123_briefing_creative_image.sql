-- Add creative image URL column to briefings
ALTER TABLE edro_briefings ADD COLUMN IF NOT EXISTS creative_image_url TEXT;
