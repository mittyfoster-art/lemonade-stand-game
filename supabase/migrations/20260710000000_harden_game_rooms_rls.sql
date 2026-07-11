-- Harden RLS on game_rooms (2026-07-10, pre-camp lockdown)
--
-- Threat model: the anon key ships in the public JS bundle, so any
-- policy granted to `anon` is effectively public. Players are anonymous
-- by design (name + room code join), so UPDATE on *active* rooms must
-- stay open to anon — that residual risk is inherent to the current
-- architecture and is accepted for camp week. Everything else locks:
--
--   INSERT  -> authenticated (facilitators) only
--   DELETE  -> authenticated only (the app never deletes rooms)
--   UPDATE  -> anon may only touch rows where is_active = true, and may
--              not flip is_active; authenticated may update anything
--   SELECT  -> stays public (join-by-code requires it)
--
-- Net effect: deactivating a room freezes it — deactivated rooms
-- (e.g. past events with participant data) become read-only archives
-- that the public key cannot modify or delete.

DROP POLICY IF EXISTS "Allow public insert access" ON game_rooms;
DROP POLICY IF EXISTS "Allow public update access" ON game_rooms;
DROP POLICY IF EXISTS "Allow public delete access" ON game_rooms;
-- "Allow public read access" is intentionally kept.

CREATE POLICY "Authenticated users can insert rooms" ON game_rooms
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Players can update active rooms" ON game_rooms
  FOR UPDATE TO anon
  USING (is_active = true)
  WITH CHECK (is_active = true);

CREATE POLICY "Authenticated users can update rooms" ON game_rooms
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete rooms" ON game_rooms
  FOR DELETE TO authenticated
  USING (true);
