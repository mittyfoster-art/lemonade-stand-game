import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RiskAssessmentForm } from './RiskAssessmentForm'
import { useGameStore } from '@/store/game-store'
import type { Team, RiskManagementInput } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FacilitatorScoreInputProps {
  /** List of teams available for scoring */
  teams: Team[]
  /** Called after a score has been saved for a team */
  onScoreSaved?: (teamId: string, score: RiskManagementInput) => void
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

/**
 * Main facilitator scoring interface. Provides a team selector dropdown and
 * renders a {@link RiskAssessmentForm} for the selected team. On save, the
 * score is persisted to the game store via `setRiskManagementScore` and an
 * optional callback is invoked.
 *
 * @see spec/03_UI_COMPONENTS.md Section 5
 * @see spec/01_SCORING_SYSTEM.md Section 4
 */
export function FacilitatorScoreInput({
  teams,
  onScoreSaved,
}: FacilitatorScoreInputProps) {
  const [selectedTeamId, setSelectedTeamId] = useState<string>('')
  const [savedTeamId, setSavedTeamId] = useState<string | null>(null)

  const setRiskManagementScore = useGameStore(
    (state) => state.setRiskManagementScore,
  )
  const riskManagementScores = useGameStore(
    (state) => state.riskManagementScores,
  )

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) ?? null
  const existingScore = selectedTeamId
    ? riskManagementScores.get(selectedTeamId)
    : undefined

  const handleSave = useCallback(
    (score: RiskManagementInput) => {
      setRiskManagementScore(score.teamId, score)
      setSavedTeamId(score.teamId)
      onScoreSaved?.(score.teamId, score)

      // Clear confirmation after 3 seconds
      setTimeout(() => setSavedTeamId(null), 3000)
    },
    [setRiskManagementScore, onScoreSaved],
  )

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-blue-50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg sm:text-xl">
          FACILITATOR SCORING
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Team selector */}
        <div className="space-y-2">
          <Label htmlFor="team-selector" className="text-sm font-semibold">
            Team
          </Label>
          <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
            <SelectTrigger id="team-selector">
              <SelectValue placeholder="Select a team..." />
            </SelectTrigger>
            <SelectContent>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: team.color }}
                    />
                    {team.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Risk assessment form for the selected team */}
        {selectedTeam && (
          <RiskAssessmentForm
            key={selectedTeam.id}
            teamId={selectedTeam.id}
            teamName={selectedTeam.name}
            initialValues={
              existingScore
                ? {
                    productionAdjustment: existingScore.productionAdjustment,
                    pricingStrategy: existingScore.pricingStrategy,
                    budgetReserves: existingScore.budgetReserves,
                    notes: existingScore.notes,
                  }
                : undefined
            }
            onSave={handleSave}
          />
        )}

        {/* Confirmation message */}
        {savedTeamId && (
          <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            Score saved for{' '}
            {teams.find((t) => t.id === savedTeamId)?.name ?? 'team'}!
          </div>
        )}
      </CardContent>
    </Card>
  )
}
