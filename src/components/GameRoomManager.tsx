import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useGameStore } from '@/store/game-store'
import { Users, Plus, Copy, Check, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AuthModal } from './AuthModal'
import { PlayerJoinForm } from './PlayerJoinForm'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * GameRoomManager orchestrates the room-entry flow for the Lemonade Stand
 * Game v2.0.
 *
 * The flow is split by role:
 *
 * **Players (teens 14-17):**
 *   1. See the PlayerJoinForm (name + room code -- no auth required).
 *   2. Once joined, see the active room card with room ID and player count.
 *
 * **Facilitators (room creators):**
 *   1. Click "Sign in to create a room" from the PlayerJoinForm.
 *   2. Authenticate via email OTP in the AuthModal.
 *   3. See the facilitator panel with room creation and management.
 *
 * This design matches spec Section 8.2:
 * - "Simple player identification -- Name-based entry within a room
 *    (no email/password required for players)"
 * - "Facilitator admin -- Room creator (facilitator) manages the room
 *    via authenticated access"
 */
export const GameRoomManager: React.FC = () => {
  const {
    currentGameRoom,
    availableGameRooms,
    isLoadingRooms,
    createGameRoom,
    joinGameRoom,
    leaveGameRoom,
    loadGameRooms,
    isAuthenticated,
    user,
    logout,
  } = useGameStore()

  // -- Local UI state --
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [roomName, setRoomName] = useState('')
  // Default to 5 days ago so all 50 levels are unlocked for testing
  const [campStartDate, setCampStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 4)
    return d.toISOString().split('T')[0]
  })
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const { toast } = useToast()

  // Load rooms once the facilitator authenticates
  useEffect(() => {
    if (isAuthenticated) {
      loadGameRooms()
    }
  }, [isAuthenticated, loadGameRooms])

  // ========================================================================
  // Handlers
  // ========================================================================

  /**
   * Create a new game room (facilitator only).
   * Requires authentication, a room name (>= 3 chars), and a camp start date.
   */
  const handleCreateRoom = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    if (roomName.trim().length < 3) {
      toast({
        title: 'Room name too short',
        description: 'Room name must be at least 3 characters long.',
        variant: 'destructive',
      })
      return
    }

    if (!campStartDate) {
      toast({
        title: 'Camp start date required',
        description: 'Please select the first day of camp so levels unlock on schedule.',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    try {
      const newRoomId = await createGameRoom(roomName.trim(), campStartDate)
      setShowCreateForm(false)
      setRoomName('')
      setCampStartDate('')

      toast({
        title: 'Game room created!',
        description: `Room code: ${newRoomId} -- share this with your players.`,
      })
    } catch {
      toast({
        title: 'Failed to create room',
        description: 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsCreating(false)
    }
  }

  /**
   * Leave the current game room and return to the join screen.
   */
  const handleLeaveRoom = () => {
    leaveGameRoom()
    toast({
      title: 'Left game room',
      description: 'You can rejoin anytime with the same room code.',
    })
  }

  /**
   * Copy a room ID to the clipboard for easy sharing.
   */
  const copyRoomId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedRoomId(id)
      setTimeout(() => setCopiedRoomId(null), 2000)

      toast({
        title: 'Room code copied!',
        description: 'Share this code with players so they can join.',
      })
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please manually copy the room code.',
        variant: 'destructive',
      })
    }
  }

  /**
   * Open the AuthModal when a player clicks the facilitator link.
   */
  const handleFacilitatorClick = () => {
    setShowAuthModal(true)
  }

  // ========================================================================
  // Render: Active room view
  // ========================================================================

  if (currentGameRoom) {
    return (
      <Card className="w-full max-w-2xl mx-auto mb-6 border-amber-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-amber-600" />
                {currentGameRoom.name}
              </CardTitle>
              <CardDescription>
                Active game room with{' '}
                {currentGameRoom.players.length} player(s)
                {isAuthenticated && user && (
                  <span className="block text-xs mt-1">
                    Facilitator: {user.email}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Sign Out
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleLeaveRoom}>
                Leave Room
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">Room Code:</p>
              <p className="text-lg font-mono font-bold text-amber-700">
                {currentGameRoom.id}
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Share this code with players so they can join
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyRoomId(currentGameRoom.id)}
              className="flex items-center gap-1"
            >
              {copiedRoomId === currentGameRoom.id ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copiedRoomId === currentGameRoom.id ? 'Copied!' : 'Copy'}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ========================================================================
  // Render: Facilitator panel (authenticated, no room selected)
  // ========================================================================

  if (isAuthenticated) {
    return (
      <div className="w-full max-w-2xl mx-auto mb-6 space-y-6">
        {/* Facilitator room management card */}
        <Card className="border-amber-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-600" />
                  Facilitator Dashboard
                </CardTitle>
                <CardDescription>
                  Create a game room or rejoin an existing one.
                  <span className="block mt-1 text-green-700 font-medium">
                    Signed in as {user?.email}
                  </span>
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-muted-foreground hover:text-foreground"
              >
                Sign Out
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Create room toggle */}
            {!showCreateForm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 h-14 w-full bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-yellow-950 font-semibold"
              >
                <Plus className="h-5 w-5" />
                Create New Game Room
              </Button>
            )}

            {/* Create room form */}
            {showCreateForm && (
              <div className="space-y-4 p-4 border border-amber-200 bg-amber-50/50 rounded-lg">
                <h3 className="font-medium text-amber-900">
                  Create New Game Room
                </h3>

                <div className="space-y-2">
                  <label
                    htmlFor="room-name"
                    className="text-sm font-medium text-amber-800"
                  >
                    Room Name
                  </label>
                  <Input
                    id="room-name"
                    placeholder="e.g. TeenPreneurship Camp 2026"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    maxLength={50}
                    disabled={isCreating}
                    className="border-amber-300 focus-visible:ring-amber-400"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="camp-start-date"
                    className="text-sm font-medium text-amber-800"
                  >
                    Camp Start Date
                  </label>
                  <Input
                    id="camp-start-date"
                    type="date"
                    value={campStartDate}
                    onChange={(e) => setCampStartDate(e.target.value)}
                    disabled={isCreating}
                    className="border-amber-300 focus-visible:ring-amber-400"
                  />
                  <p className="text-xs text-amber-600">
                    Levels 1-10 unlock on this date at 7:00 AM, then 10 more
                    each following day. Default is set 5 days back so all 50
                    levels are open for testing.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateRoom}
                    disabled={
                      roomName.trim().length < 3 || !campStartDate || isCreating
                    }
                    className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-yellow-950 font-semibold"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Room'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateForm(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Existing rooms list */}
            {availableGameRooms.length > 0 && !showCreateForm && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-amber-900">Your Rooms</h3>
                  {isLoadingRooms && (
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                  )}
                </div>
                <div className="space-y-2">
                  {availableGameRooms
                    .slice(-5)
                    .reverse()
                    .map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between p-3 border border-amber-200 rounded-lg hover:bg-amber-50/50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-amber-900">
                            {room.name}
                          </p>
                          <p className="text-sm text-amber-600">
                            Code: {room.id} &middot;{' '}
                            {room.players.length} player(s)
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-amber-100 text-amber-800"
                          >
                            {room.players.length} players
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => joinGameRoom(room.id)}
                            className="border-amber-300 text-amber-800 hover:bg-amber-50"
                          >
                            Open
                          </Button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ========================================================================
  // Render: Default view -- PlayerJoinForm (no auth required)
  // ========================================================================

  return (
    <div className="w-full max-w-md mx-auto mb-6">
      <PlayerJoinForm onFacilitatorClick={handleFacilitatorClick} />

      {/* AuthModal is rendered but only opens when showAuthModal is true */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  )
}
