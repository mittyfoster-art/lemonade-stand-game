import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreCategory } from './ScoreCategory'
import type { MultiFactorScore } from '@/types'
import { SCORING_MAX } from '@/types'

interface ScoreBreakdownProps {
  /** Full multi-factor score breakdown to display */
  score: MultiFactorScore
  /** Name of the team this score belongs to */
  teamName: string
  /** Team's profit rank position (1-based) */
  profitRank: number
  /** Total number of teams in the game */
  totalTeams: number
  /** Number of rounds where the team was profitable */
  profitableRounds: number
  /** Total number of rounds played */
  totalRounds: number
  /** Overall spoilage rate across all rounds (0.0–1.0) */
  spoilageRate: number
  /** Whether to show detail text under each category (default: true) */
  showDetails?: boolean
}

/**
 * Converts a rank number to its ordinal string (e.g. 1 → "1st", 2 → "2nd").
 */
function ordinal(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const remainder = n % 100
  const suffix = suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]
  return `${n}${suffix}`
}

/**
 * Displays the complete multi-factor score breakdown for a team.
 * Renders the total score prominently in the header and uses ScoreCategory
 * for each of the four scoring components: Profit Ranking, Consistency,
 * Efficiency, and Risk Management.
 */
export function ScoreBreakdown({
  score,
  teamName,
  profitRank,
  totalTeams,
  profitableRounds,
  totalRounds,
  spoilageRate,
  showDetails = true,
}: ScoreBreakdownProps) {
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span className="text-lg sm:text-xl">YOUR SCORE</span>
          <Badge variant="secondary" className="text-lg sm:text-xl px-3 py-1">
            {score.total}/{SCORING_MAX.TOTAL}
          </Badge>
        </CardTitle>
        {teamName && (
          <p className="text-sm text-muted-foreground">{teamName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <ScoreCategory
          label="Profit Ranking"
          points={score.profitRanking}
          maxPoints={SCORING_MAX.PROFIT_RANKING}
          detail={
            showDetails
              ? `${ordinal(profitRank)} Place of ${totalTeams}`
              : ''
          }
        />

        <ScoreCategory
          label="Consistency"
          points={score.consistency}
          maxPoints={SCORING_MAX.CONSISTENCY}
          detail={
            showDetails
              ? `${profitableRounds} of ${totalRounds} rounds profitable`
              : ''
          }
        />

        <ScoreCategory
          label="Efficiency"
          points={score.efficiency}
          maxPoints={SCORING_MAX.EFFICIENCY}
          detail={
            showDetails
              ? `${(spoilageRate * 100).toFixed(1)}% spoilage rate`
              : ''
          }
        />

        <ScoreCategory
          label="Risk Management"
          points={score.riskManagement}
          maxPoints={SCORING_MAX.RISK_MANAGEMENT}
          detail={showDetails ? 'Facilitator assessment' : ''}
        />
      </CardContent>
    </Card>
  )
}
