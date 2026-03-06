-- ============================================================================
-- Migration: Add players column and camp_start_date to game_rooms
-- The v2 game uses individual players instead of teams.
-- Depends on: 20260212000000_create_game_rooms.sql (must run first)
-- ============================================================================

ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS players TEXT DEFAULT '[]';
ALTER TABLE game_rooms ADD COLUMN IF NOT EXISTS camp_start_date TEXT DEFAULT '';

-- Migrate existing data from teams to players if any exists
-- (teams column is JSONB from the base migration, cast to TEXT for the new column)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'game_rooms' AND column_name = 'teams'
  ) THEN
    UPDATE game_rooms
    SET players = teams::TEXT
    WHERE players = '[]' AND teams IS NOT NULL AND teams::TEXT != '[]';

    -- Drop the legacy teams column to prevent schema drift
    ALTER TABLE game_rooms DROP COLUMN teams;
  END IF;
END $$;
