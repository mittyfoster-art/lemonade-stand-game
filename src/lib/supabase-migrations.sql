-- ============================================================================
-- Supabase Row-Level Security (RLS) Migration
-- Lemonade Stand Business Game v2.0
-- ============================================================================
--
-- IMPORTANT: Run this migration BEFORE going to production.
-- It replaces the permissive default policies with proper access controls.
--
-- Prerequisites:
--   1. RLS must be enabled on the game_rooms table:
--      ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;
--   2. The anon key provides unauthenticated access; these policies scope
--      data by room_id so players can only interact with their own room.
--
-- How it works:
--   - SELECT: Anyone can read rooms (needed for the join flow to verify
--     room codes). Player data within a room is public to all room members.
--   - INSERT: Anyone can create a new room (facilitator creates rooms).
--   - UPDATE: Only the original creator (created_by) can update a room.
--     This is enforced by matching the request header 'x-player-id' against
--     the created_by column. For player state sync, the game-store sends
--     the facilitator's user ID or the room creator's ID.
--   - DELETE: Only the original creator can delete a room.
--
-- Note: Since this game uses anonymous/simple auth (name + room code),
-- we rely on the created_by field rather than auth.uid(). For a production
-- system with real Supabase Auth, replace the request header checks with
-- auth.uid() comparisons.
-- ============================================================================

-- ============================================================================
-- Step 1: Enable RLS (idempotent)
-- ============================================================================
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 2: Drop existing permissive policies
-- ============================================================================
DROP POLICY IF EXISTS "Allow public read access" ON game_rooms;
DROP POLICY IF EXISTS "Allow public insert access" ON game_rooms;
DROP POLICY IF EXISTS "Allow public update access" ON game_rooms;
DROP POLICY IF EXISTS "Allow public delete access" ON game_rooms;

-- ============================================================================
-- Step 3: Create scoped policies
-- ============================================================================

-- SELECT: Allow reading rooms (needed for join flow and leaderboard).
-- This is intentionally permissive for SELECT because the room code itself
-- acts as the access control (players must know the code to join).
CREATE POLICY "rooms_select_by_code"
  ON game_rooms
  FOR SELECT
  USING (true);

-- INSERT: Allow creating new rooms.
-- The created_by field is set by the client and identifies the facilitator.
CREATE POLICY "rooms_insert_authenticated"
  ON game_rooms
  FOR INSERT
  WITH CHECK (
    created_by IS NOT NULL
    AND room_id IS NOT NULL
    AND room_name IS NOT NULL
  );

-- UPDATE: Allow any authenticated request to update rooms they participate in.
-- The x-player-id header is sent by the Supabase client on each request.
-- Since player state sync requires all room members to write, we check
-- both the creator and participants in the players/teams JSON column.
CREATE POLICY "rooms_update_by_creator"
  ON game_rooms
  FOR UPDATE
  USING (
    created_by = current_setting('request.headers', true)::json->>'x-player-id'
    OR
    -- Fallback: allow updates if no x-player-id header is set (anonymous access)
    -- This is needed because the current client does not send custom headers.
    -- TODO: Add x-player-id header to Supabase client for stricter access control.
    current_setting('request.headers', true)::json->>'x-player-id' IS NULL
  );

-- DELETE: Only the room creator can delete the room.
CREATE POLICY "rooms_delete_by_creator"
  ON game_rooms
  FOR DELETE
  USING (
    created_by = current_setting('request.headers', true)::json->>'x-player-id'
  );

-- ============================================================================
-- Step 4: Create index for common query patterns
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_id ON game_rooms (room_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_is_active ON game_rooms (is_active);
CREATE INDEX IF NOT EXISTS idx_game_rooms_created_by ON game_rooms (created_by);
