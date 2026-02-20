import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useGameStore } from '@/store/game-store'
import { Loader2, AlertCircle, Citrus, User, Hash } from 'lucide-react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum number of characters allowed in a player's display name */
const MAX_NAME_LENGTH = 20

/** Minimum number of characters required for a player's display name */
const MIN_NAME_LENGTH = 1

/**
 * Room code format: AdjectiveNoun + 4 digits (e.g. "CoolLemons4821").
 * Must start with a letter and end with digits, 8-20 characters total.
 */
const ROOM_CODE_PATTERN = /^[A-Za-z]{6,}[0-9]{4}$/

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PlayerJoinFormProps {
  /**
   * Callback invoked when the user clicks the facilitator link.
   * The parent component should open the AuthModal in response.
   */
  onFacilitatorClick: () => void
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PlayerJoinForm allows teens (14-17) to join an existing game room by
 * entering their name and the shared room code distributed by the facilitator.
 *
 * No email, password, or OTP is required. The form calls joinGameRoom()
 * to locate the room on the backend, then addPlayer() to register the
 * player in that room. Both operations happen in sequence; if either fails,
 * the user sees an inline error message.
 */
export function PlayerJoinForm({ onFacilitatorClick }: PlayerJoinFormProps) {
  // -- Form state --
  const [playerName, setPlayerName] = useState('')
  const [roomCode, setRoomCode] = useState('')

  // -- UI state --
  const [isJoining, setIsJoining] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // -- Store actions --
  const joinGameRoom = useGameStore((s) => s.joinGameRoom)
  const addPlayer = useGameStore((s) => s.addPlayer)

  // -- Derived values --
  const trimmedName = playerName.trim()
  const trimmedCode = roomCode.trim()
  const isFormValid = trimmedName.length >= MIN_NAME_LENGTH && trimmedCode.length > 0

  /**
   * Clear the error message whenever the user starts typing again.
   * This avoids stale error messages persisting while the user corrects input.
   */
  const clearError = useCallback(() => {
    if (errorMessage) setErrorMessage(null)
  }, [errorMessage])

  /**
   * Handle name input changes with character-limit enforcement.
   */
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (value.length <= MAX_NAME_LENGTH) {
      setPlayerName(value)
      clearError()
    }
  }

  /**
   * Handle room code input changes.
   */
  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRoomCode(e.target.value)
    clearError()
  }

  /**
   * Validate inputs, join the room, and register the player.
   *
   * Sequence:
   * 1. Validate name and room code locally.
   * 2. Call joinGameRoom(roomCode) to find the room in the backend.
   * 3. Call addPlayer(name) to register the player within the room.
   * 4. On failure at any step, show an inline error and stop.
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // -- Client-side validation --
    if (trimmedName.length < MIN_NAME_LENGTH) {
      setErrorMessage('Please enter your name to join the game.')
      return
    }

    if (trimmedCode.length === 0) {
      setErrorMessage('Please enter the room code your facilitator shared.')
      return
    }

    // Validate room code format before hitting the backend
    if (!ROOM_CODE_PATTERN.test(trimmedCode)) {
      setErrorMessage(
        'Invalid room code format. It should look like "CoolLemons4821" (letters followed by 4 digits).'
      )
      return
    }

    setIsJoining(true)
    setErrorMessage(null)

    try {
      // Step 1: Join the game room by code
      const roomFound = await joinGameRoom(trimmedCode)

      if (!roomFound) {
        setErrorMessage(
          'Room not found. Double-check the room code and try again, or ask your facilitator for help.'
        )
        setIsJoining(false)
        return
      }

      // Step 2: Register the player within the room
      await addPlayer(trimmedName)

      // Success -- the store now has currentGameRoom and currentPlayer set.
      // The parent component (GameRoomManager) will react to the state change
      // and render the appropriate game view. No navigation needed here.
    } catch (error) {
      // Surface a user-friendly message. The store logs the technical details.
      const message =
        error instanceof Error ? error.message : 'Something went wrong.'
      setErrorMessage(`Failed to join: ${message}`)
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto border-amber-200 shadow-lg shadow-amber-100/50">
      {/* ---------------------------------------------------------------- */}
      {/* Header with lemon branding                                       */}
      {/* ---------------------------------------------------------------- */}
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-yellow-300 to-amber-400 shadow-md">
          <Citrus className="h-8 w-8 text-yellow-800" />
        </div>

        <CardTitle className="text-2xl font-bold text-yellow-900">
          Lemonade Stand Game
        </CardTitle>

        <CardDescription className="text-amber-700 text-base">
          Enter your name and the room code to start playing!
        </CardDescription>
      </CardHeader>

      {/* ---------------------------------------------------------------- */}
      {/* Form body                                                         */}
      {/* ---------------------------------------------------------------- */}
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ---- Player name ---- */}
          <div className="space-y-2">
            <Label
              htmlFor="player-name"
              className="flex items-center gap-1.5 text-sm font-medium text-yellow-900"
            >
              <User className="h-4 w-4 text-amber-600" />
              Your Name
            </Label>
            <Input
              id="player-name"
              type="text"
              value={playerName}
              onChange={handleNameChange}
              placeholder="e.g. Thabo, Lihle, Zanele..."
              maxLength={MAX_NAME_LENGTH}
              disabled={isJoining}
              autoComplete="off"
              autoFocus
              className="border-amber-300 focus-visible:ring-amber-400 placeholder:text-amber-400"
            />
            <p className="text-xs text-amber-600">
              {trimmedName.length}/{MAX_NAME_LENGTH} characters
              {trimmedName.length === 0 && ' -- this is how others will see you on the leaderboard'}
            </p>
          </div>

          {/* ---- Room code ---- */}
          <div className="space-y-2">
            <Label
              htmlFor="room-code"
              className="flex items-center gap-1.5 text-sm font-medium text-yellow-900"
            >
              <Hash className="h-4 w-4 text-amber-600" />
              Room Code
            </Label>
            <Input
              id="room-code"
              type="text"
              value={roomCode}
              onChange={handleRoomCodeChange}
              placeholder="e.g. CoolLemons4821"
              disabled={isJoining}
              autoComplete="off"
              className="border-amber-300 focus-visible:ring-amber-400 placeholder:text-amber-400 font-mono"
            />
            <p className="text-xs text-amber-600">
              Ask your facilitator for the room code
            </p>
          </div>

          {/* ---- Error message ---- */}
          {errorMessage && (
            <Alert
              variant="destructive"
              className="border-red-300 bg-red-50 text-red-800"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* ---- Submit button ---- */}
          <Button
            type="submit"
            disabled={!isFormValid || isJoining}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-yellow-950 shadow-md transition-all duration-200"
          >
            {isJoining ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Joining game...
              </>
            ) : (
              'Join Game'
            )}
          </Button>
        </form>

        {/* ---------------------------------------------------------------- */}
        {/* Facilitator link                                                 */}
        {/* ---------------------------------------------------------------- */}
        <div className="mt-6 pt-4 border-t border-amber-200 text-center">
          <p className="text-sm text-amber-700">
            Are you a facilitator?{' '}
            <button
              type="button"
              onClick={onFacilitatorClick}
              disabled={isJoining}
              className="font-semibold text-amber-900 underline underline-offset-2 hover:text-yellow-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 rounded-sm transition-colors disabled:opacity-50"
            >
              Sign in to create a room
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
