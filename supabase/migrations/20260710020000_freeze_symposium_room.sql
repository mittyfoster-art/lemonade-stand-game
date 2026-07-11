-- Freeze the Cayman Brac Youth Symposium room (2026-07-10).
--
-- This room holds real participant data from a live event (2026-06-08).
-- Under the hardened RLS (20260710010000), deactivated rooms cannot be
-- modified or deleted with the public anon key — deactivating turns the
-- room into a read-only archive. A local CSV/JSON export was taken on
-- 2026-07-10 before this change (Data_Archives/, outside the repo).

UPDATE game_rooms
SET is_active = false
WHERE room_id = 'SuperBooth9890';
