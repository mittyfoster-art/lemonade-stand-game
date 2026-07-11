-- Freeze the CPHS pilot rooms (2026-07-10).
--
-- Both rooms hold real student data from the June 2026 CPHS pilot.
-- Under hardened RLS (20260710010000), deactivating makes them
-- read-only archives immune to the public anon key. Local CSV/JSON
-- exports were taken on 2026-07-10 before this change
-- (Data_Archives/, outside the repo).

UPDATE game_rooms
SET is_active = false
WHERE room_id IN ('SweetCorner1514', 'CoolZone4458');
