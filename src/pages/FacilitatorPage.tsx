import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FacilitatorScoreInput } from '@/components/facilitator'
import { useGameStore } from '@/store/game-store'

/**
 * Facilitator mode page for entering risk management scores.
 * Displays the {@link FacilitatorScoreInput} component with all teams
 * from the current game session. Accessible via the `/facilitator` route
 * or the toggle button on the Leaderboard.
 *
 * @returns The facilitator scoring page, or a message when no teams exist
 * @see spec/01_SCORING_SYSTEM.md — Section 4 (Risk Management)
 */
function FacilitatorPage() {
  const navigate = useNavigate()
  const { teams, gameMode } = useGameStore()

  const hasTeams = gameMode === 'multi' && teams.length > 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header with back navigation */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Game
          </Button>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800">
            Facilitator Mode
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Assess each team's risk management decisions.
          </p>
        </div>

        {/* Facilitator scoring interface */}
        {hasTeams ? (
          <FacilitatorScoreInput teams={teams} />
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
            <p className="font-semibold text-amber-800 mb-2">
              No teams available
            </p>
            <p className="text-sm text-amber-700 mb-4">
              Switch to multi-team mode and add teams before entering facilitator scores.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Go to Game
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default FacilitatorPage
