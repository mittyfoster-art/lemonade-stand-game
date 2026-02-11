import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useGameStore } from '@/store/game-store'
import { Users, Plus, LogIn, Copy, Check, Loader2, Lock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AuthModal } from './AuthModal'

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
    logout
  } = useGameStore()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showJoinForm, setShowJoinForm] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [copiedRoomId, setCopiedRoomId] = useState<string | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const { toast } = useToast()

  // Load rooms when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadGameRooms()
    }
  }, [isAuthenticated, loadGameRooms])

  const handleCreateRoom = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true)
      return
    }

    if (roomName.trim().length < 3) {
      toast({
        title: "Room name too short",
        description: "Room name must be at least 3 characters long.",
        variant: "destructive"
      })
      return
    }

    setIsCreating(true)
    try {
      const newRoomId = await createGameRoom(roomName)
      setShowCreateForm(false)
      setRoomName('')
      
      toast({
        title: "Game room created!",
        description: `Room ID: ${newRoomId} - Share this ID with other players.`
      })
    } catch (error) {
      toast({
        title: "Failed to create room",
        description: "Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      toast({
        title: "Please enter a room ID",
        description: "You need to provide a valid room ID to join.",
        variant: "destructive"
      })
      return
    }

    setIsJoining(true)
    try {
      const success = await joinGameRoom(roomId.trim())
      if (success) {
        setShowJoinForm(false)
        setRoomId('')
        toast({
          title: "Joined game room!",
          description: `Successfully joined room: ${roomId}`
        })
      } else {
        toast({
          title: "Room not found",
          description: "The room ID you entered doesn't exist. Check the ID and try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Failed to join room",
        description: "Please check the room ID and try again.",
        variant: "destructive"
      })
    } finally {
      setIsJoining(false)
    }
  }

  const handleLeaveRoom = () => {
    leaveGameRoom()
    toast({
      title: "Left game room",
      description: "You've been moved to single player mode."
    })
  }

  const copyRoomId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id)
      setCopiedRoomId(id)
      setTimeout(() => setCopiedRoomId(null), 2000)
      
      toast({
        title: "Room ID copied!",
        description: "Share this ID with other players to invite them."
      })
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please manually copy the room ID.",
        variant: "destructive"
      })
    }
  }

  if (currentGameRoom) {
    return (
      <Card className="w-full max-w-2xl mx-auto mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                {currentGameRoom.name}
              </CardTitle>
              <CardDescription>
                Active game room with {currentGameRoom.teams.length} team(s)
                {isAuthenticated && user && (
                  <span className="block text-xs mt-1">
                    Signed in as {user.email}
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
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLeaveRoom}
              >
                Leave Room
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium">Room ID:</p>
              <p className="text-lg font-mono font-bold text-blue-600">
                {currentGameRoom.id}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Share this ID with other players to invite them
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyRoomId(currentGameRoom.id)}
              className="flex items-center gap-1"
            >
              {copiedRoomId === currentGameRoom.id ? (
                <Check className="h-4 w-4 text-green-500" />
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

  return (
    <Card className="w-full max-w-2xl mx-auto mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Game Room Setup
            </CardTitle>
            <CardDescription>
              Create a new game room or join an existing one to play with multiple teams
              {isAuthenticated && user && (
                <span className="block mt-1 text-green-600">
                  ✓ Signed in as {user.email}
                </span>
              )}
            </CardDescription>
          </div>
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
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAuthenticated && (
          <div className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800 mb-2">
              <Lock className="h-4 w-4" />
              <span className="font-medium">Sign in required</span>
            </div>
            <p className="text-sm text-amber-700 mb-3">
              To create or join game rooms that work across devices, you need to sign in with your email.
            </p>
            <Button onClick={() => setShowAuthModal(true)} size="sm">
              Sign in to continue
            </Button>
          </div>
        )}

        {isAuthenticated && !showCreateForm && !showJoinForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 h-16"
              variant="outline"
            >
              <Plus className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Create New Room</div>
                <div className="text-sm text-muted-foreground">Start a new game</div>
              </div>
            </Button>
            
            <Button
              onClick={() => setShowJoinForm(true)}
              className="flex items-center gap-2 h-16"
              variant="outline"
            >
              <LogIn className="h-5 w-5" />
              <div className="text-left">
                <div className="font-medium">Join Existing Room</div>
                <div className="text-sm text-muted-foreground">Enter room ID</div>
              </div>
            </Button>
          </div>
        )}

        {showCreateForm && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium">Create New Game Room</h3>
            <Input
              placeholder="Enter room name (e.g., 'Mrs. Smith's Class')"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={50}
              disabled={isCreating}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleCreateRoom} 
                disabled={roomName.trim().length < 3 || isCreating}
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
              <Button variant="outline" onClick={() => setShowCreateForm(false)} disabled={isCreating}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {showJoinForm && (
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-medium">Join Game Room</h3>
            <Input
              placeholder="Enter room ID (e.g., CoolLemons1234)"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              maxLength={20}
              disabled={isJoining}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleJoinRoom} 
                disabled={!roomId.trim() || isJoining}
              >
                {isJoining ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Room'
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowJoinForm(false)} disabled={isJoining}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {isAuthenticated && availableGameRooms.length > 0 && !showCreateForm && !showJoinForm && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Available Game Rooms</h3>
              {isLoadingRooms && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
            <div className="space-y-2">
              {availableGameRooms.slice(-5).reverse().map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{room.name}</p>
                    <p className="text-sm text-muted-foreground">
                      ID: {room.id} • {room.teams.length} team(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {room.teams.length} teams
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => joinGameRoom(room.id)}
                    >
                      Join
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setShowAuthModal(false)}
        />
      </CardContent>
    </Card>
  )
}