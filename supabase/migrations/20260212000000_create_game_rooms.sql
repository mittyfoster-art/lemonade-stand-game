-- ============================================================================
-- Supabase Database Setup for Lemonade Stand Game
-- Run this SQL in your Supabase SQL Editor
-- ============================================================================

-- Create game_rooms table
CREATE TABLE IF NOT EXISTS game_rooms (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id TEXT UNIQUE NOT NULL,
    room_name TEXT NOT NULL,
    teams JSONB DEFAULT '[]'::jsonb,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    last_updated BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    created_by TEXT,
    is_active BOOLEAN DEFAULT true
);

-- Create index for faster room lookups
CREATE INDEX IF NOT EXISTS idx_game_rooms_room_id ON game_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_game_rooms_is_active ON game_rooms(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE game_rooms ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (for demo purposes)
-- Allow anyone to read game rooms
CREATE POLICY "Allow public read access" ON game_rooms
    FOR SELECT USING (true);

-- Allow anyone to insert game rooms
CREATE POLICY "Allow public insert access" ON game_rooms
    FOR INSERT WITH CHECK (true);

-- Allow anyone to update game rooms
CREATE POLICY "Allow public update access" ON game_rooms
    FOR UPDATE USING (true);

-- Allow anyone to delete game rooms
CREATE POLICY "Allow public delete access" ON game_rooms
    FOR DELETE USING (true);

-- Enable realtime for game_rooms
ALTER PUBLICATION supabase_realtime ADD TABLE game_rooms;

-- ============================================================================
-- Verification Query (run after setup)
-- ============================================================================
-- SELECT * FROM game_rooms LIMIT 10;
