// ============================================================================
// Supabase Client Configuration
// Real-time backend for the Lemonade Stand Game
//
// SECURITY: Row-Level Security (RLS) policies must be applied before
// production deployment. See src/lib/supabase-migrations.sql for the
// migration script that replaces the default permissive policies.
// ============================================================================

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file. See .env.example for reference.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Whether to use mock authentication (no real Supabase Auth calls).
 * Defaults to false (real auth). Set VITE_AUTH_MOCK=true in .env
 * to enable mock mode for local development only.
 */
const AUTH_MOCK = import.meta.env.VITE_AUTH_MOCK === 'true'

if (AUTH_MOCK) {
  console.warn('[Lemonade Stand] Auth mock mode is ACTIVE. Set VITE_AUTH_MOCK=false for production.')
}

/** Whether the app is running in mock mode (exported for skip-network checks). */
export const isAuthMock = AUTH_MOCK

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DbGameRoom {
  id: string
  room_id: string
  room_name: string
  players: string          // JSON string of Player[] (v2 uses individual players, not teams)
  camp_start_date: string  // ISO date string, e.g. "2026-07-13"
  created_at: number
  last_updated: number
  created_by: string
  is_active: boolean
}

export interface DbUser {
  id: string
  email: string
  name: string
  created_at: string
}

// ---------------------------------------------------------------------------
// Auth Functions (Simplified for Demo - No Email Required)
// ---------------------------------------------------------------------------

// Store user in localStorage for simple session management
const STORAGE_KEY = 'lemonade_user'

const getStoredUser = (): { uid: string; email: string; name: string } | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

const setStoredUser = (user: { uid: string; email: string; name: string } | null) => {
  if (user) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}

export const auth = {
  /**
   * Send a one-time password to the given email.
   * In mock mode (default): stores the email locally and returns immediately.
   * In real mode: calls Supabase Auth signInWithOtp to send an email OTP.
   */
  sendOTP: async (email: string): Promise<void> => {
    if (AUTH_MOCK) {
      // Mock mode: store the email/name for the next step
      localStorage.setItem('pending_auth_email', email)
      await new Promise(resolve => setTimeout(resolve, 300))
      return
    }

    // Real Supabase Auth: send OTP email
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) throw new Error(error.message)
  },

  /**
   * Verify the OTP code.
   * In mock mode (default): accepts "123456" or any 6-digit code.
   * In real mode: calls Supabase Auth verifyOtp to validate the code.
   */
  verifyOTP: async (email: string, token: string): Promise<{ user: { uid: string; email: string; name: string } }> => {
    if (AUTH_MOCK) {
      await new Promise(resolve => setTimeout(resolve, 300))

      // Accept demo code or any 6-digit code
      if (token === '123456' || /^\d{6}$/.test(token)) {
        const user = {
          uid: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: email,
          name: email.includes('@') ? (email.split('@')[0] ?? email) : email
        }
        setStoredUser(user)
        localStorage.removeItem('pending_auth_email')
        return { user }
      }

      throw new Error('Invalid code. Please try again.')
    }

    // Real Supabase Auth: verify OTP
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    })
    if (error) throw new Error(error.message)
    if (!data.user) throw new Error('Verification failed. Please try again.')

    const userEmail = data.user.email ?? email
    const user = {
      uid: data.user.id,
      email: userEmail,
      name: userEmail.includes('@')
        ? (userEmail.split('@')[0] ?? userEmail)
        : userEmail
    }
    setStoredUser(user)
    return { user }
  },

  /**
   * Sign out
   */
  logout: async (): Promise<void> => {
    setStoredUser(null)
  },

  /**
   * Get current user
   */
  getCurrentUser: async () => {
    return getStoredUser()
  },

  /**
   * Listen to auth state changes (simplified)
   */
  onAuthStateChange: (callback: (user: { uid: string; email: string; name: string } | null) => void) => {
    // Check initial state
    const user = getStoredUser()
    callback(user)

    // Return a subscription object with unsubscribe
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Database Functions (Table operations)
// ---------------------------------------------------------------------------

export const table = {
  /**
   * Add a new game room
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase returns untyped rows
  addItem: async (tableName: string, data: Record<string, unknown>): Promise<Record<string, any>> => {
    const { data: result, error } = await supabase
      .from('game_rooms')
      .insert({
        room_id: data.room_id,
        room_name: data.room_name,
        players: data.players || '[]',
        camp_start_date: data.camp_start_date || '',
        created_at: data.created_at || Date.now(),
        last_updated: Date.now(),
        created_by: data.created_by || 'anonymous',
        is_active: true
      })
      .select()
      .single()

    if (error) throw error
    return result
  },

  /**
   * Get items with optional query
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase returns untyped rows
  getItems: async (tableName: string, options?: { query?: Record<string, unknown>; limit?: number; sort?: string; order?: string }): Promise<{ items: Record<string, any>[] }> => {
    let query = supabase.from('game_rooms').select('*')

    // Apply filters
    if (options?.query) {
      for (const [key, value] of Object.entries(options.query)) {
        query = query.eq(key, value)
      }
    }

    // Apply sorting
    if (options?.sort) {
      query = query.order(options.sort, { ascending: options.order !== 'desc' })
    }

    // Apply limit
    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query

    if (error) throw error
    return { items: data || [] }
  },

  /**
   * Update a game room
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase returns untyped rows
  updateItem: async (tableName: string, data: Record<string, unknown>): Promise<Record<string, any> | null> => {
    // Remove _id and _uid before sending to Supabase
    const updateData = Object.fromEntries(
      Object.entries(data).filter(([key]) => key !== '_id' && key !== '_uid')
    )

    // Find the room by room_id or id
    const roomId = data.room_id || data.id

    const { data: result, error } = await supabase
      .from('game_rooms')
      .update({
        ...updateData,
        last_updated: Date.now()
      })
      .eq('room_id', roomId)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      throw error
    }
    return result
  },

  /**
   * Delete a game room
   */
  deleteItem: async (tableName: string, id: string): Promise<boolean> => {
    const { error } = await supabase
      .from('game_rooms')
      .delete()
      .eq('room_id', id)

    return !error
  },

  /**
   * Subscribe to real-time changes for a specific room.
   * Uses a unique channel name per room (with timestamp) to avoid
   * subscription collisions when switching rooms, and a server-side
   * filter so only changes for the target room are delivered.
   *
   * @param onStatus - Optional callback invoked with the channel status
   *   ('SUBSCRIBED', 'TIMED_OUT', 'CHANNEL_ERROR', 'CLOSED')
   */
  subscribe: (
    tableName: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase realtime payload type
    callback: (payload: any) => void,
    roomId?: string,
    onStatus?: (status: string) => void,
  ) => {
    const channelName = roomId
      ? `game_rooms_changes_${roomId}`
      : `game_rooms_changes_global`

    const filterConfig = roomId
      ? { event: '*' as const, schema: 'public', table: 'game_rooms', filter: `room_id=eq.${roomId}` }
      : { event: '*' as const, schema: 'public', table: 'game_rooms' }

    return supabase
      .channel(channelName)
      .on('postgres_changes', filterConfig, callback)
      .subscribe((status) => {
        if (onStatus) onStatus(status)
      })
  }
}
