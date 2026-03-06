import { Navigate } from 'react-router-dom'
import { useGameStore } from '@/store/game-store'
import { useEffect, useRef } from 'react'
import { toast } from '@/hooks/use-toast'

/**
 * Route guard that redirects to the home page if no player is currently
 * active in the Zustand store. Used to protect all player-only pages
 * (play, levels, results, leaderboard, awards, profile, loans, settings).
 */
export function PlayerRoute({ children }: { children: React.ReactNode }) {
  const currentPlayer = useGameStore((s) => s.currentPlayer)
  const hasToasted = useRef(false)

  useEffect(() => {
    if (!currentPlayer && !hasToasted.current) {
      hasToasted.current = true
      toast({
        title: 'Join a room first',
        description: 'Enter your name and room code to start playing.',
        variant: 'destructive',
      })
    }
  }, [currentPlayer])

  if (!currentPlayer) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/**
 * Route guard that allows access for either a player OR an authenticated
 * facilitator. Used for pages like Awards and Leaderboard that both
 * players and facilitators need to view.
 */
export function PlayerOrFacilitatorRoute({ children }: { children: React.ReactNode }) {
  const currentPlayer = useGameStore((s) => s.currentPlayer)
  const isAuthenticated = useGameStore((s) => s.isAuthenticated)
  const hasToasted = useRef(false)

  const hasAccess = currentPlayer || isAuthenticated

  useEffect(() => {
    if (!hasAccess && !hasToasted.current) {
      hasToasted.current = true
      toast({
        title: 'Join a room first',
        description: 'Enter your name and room code to start playing.',
        variant: 'destructive',
      })
    }
  }, [hasAccess])

  if (!hasAccess) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

/**
 * Route guard for the facilitator page. Requires a signed-in facilitator
 * (authenticated user) rather than a player.
 */
export function FacilitatorRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useGameStore((s) => s.isAuthenticated)
  const hasToasted = useRef(false)

  useEffect(() => {
    if (!isAuthenticated && !hasToasted.current) {
      hasToasted.current = true
      toast({
        title: 'Facilitator access required',
        description: 'Please sign in as a facilitator to access this page.',
        variant: 'destructive',
      })
    }
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
