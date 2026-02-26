-- Migration: Add platform_asset_id to cleanup_actions for device MediaLibrary IDs
-- The app uses device asset IDs; assets table may not be populated. Store platform_asset_id
-- directly so session save works without requiring assets sync.

-- Drop FK so we can make asset_id nullable
ALTER TABLE screenshot_organizer.cleanup_actions
  DROP CONSTRAINT IF EXISTS cleanup_actions_asset_id_fkey;

-- Add platform_asset_id for device MediaLibrary IDs
ALTER TABLE screenshot_organizer.cleanup_actions
  ADD COLUMN IF NOT EXISTS platform_asset_id TEXT;

-- Make asset_id nullable (legacy; new rows use platform_asset_id)
ALTER TABLE screenshot_organizer.cleanup_actions
  ALTER COLUMN asset_id DROP NOT NULL;
