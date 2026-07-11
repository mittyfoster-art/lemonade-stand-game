-- Reset ALL game_rooms policies to the intended five (2026-07-10).
--
-- The 20260710000000 hardening migration dropped policies by name, but
-- the live database's original permissive policies were created under
-- different names, so they survived and — because permissive policies
-- OR together — kept UPDATE/DELETE effectively public (verified by
-- behavior test: an inactive room accepted an anon UPDATE).
--
-- This migration drops every policy on the table dynamically, then
-- recreates exactly the intended set. See 20260710000000 for the
-- threat model and rationale.

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'game_rooms'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.game_rooms', pol.policyname);
  END LOOP;
END $$;

-- 1. Public read: join-by-code requires it
CREATE POLICY "Public read access" ON game_rooms
  FOR SELECT
  USING (true);

-- 2. Room creation: authenticated facilitators only
CREATE POLICY "Authenticated users can insert rooms" ON game_rooms
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- 3. Players (anon) may update active rooms only, and may not flip is_active
CREATE POLICY "Players can update active rooms" ON game_rooms
  FOR UPDATE TO anon
  USING (is_active = true)
  WITH CHECK (is_active = true);

-- 4. Facilitators may update anything (including deactivating rooms)
CREATE POLICY "Authenticated users can update rooms" ON game_rooms
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Deletion: authenticated only (the app never deletes rooms)
CREATE POLICY "Authenticated users can delete rooms" ON game_rooms
  FOR DELETE TO authenticated
  USING (true);
