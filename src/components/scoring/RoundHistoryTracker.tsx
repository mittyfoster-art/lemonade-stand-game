import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { RoundResult } from '@/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RoundHistoryTrackerProps {
  /** Array of round results to display in the table */
  roundHistory: RoundResult[]
  /** The current round number (used to highlight the active round) */
  currentRound: number
}

interface SummaryStats {
  /** Number of rounds with positive profit */
  profitableRounds: number
  /** Total number of completed rounds */
  totalRounds: number
  /** Average spoilage rate across all rounds (0.0–1.0) */
  avgSpoilageRate: number
  /** Total profit across all rounds */
  totalProfit: number
  /** Total cups sold across all rounds */
  totalCupsSold: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Formats a number as a dollar amount with sign prefix.
 * Positive values get "+$", negative values get "-$".
 */
function formatProfit(profit: number): string {
  const abs = Math.abs(profit).toFixed(2)
  return profit >= 0 ? `+$${abs}` : `-$${abs}`
}

/**
 * Formats a decimal ratio (0.0–1.0) as a percentage string.
 */
function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(0)}%`
}

/**
 * Computes summary statistics from an array of round results.
 */
function computeSummary(rounds: RoundResult[]): SummaryStats {
  if (rounds.length === 0) {
    return {
      profitableRounds: 0,
      totalRounds: 0,
      avgSpoilageRate: 0,
      totalProfit: 0,
      totalCupsSold: 0,
    }
  }

  const profitableRounds = rounds.filter((r) => r.profit > 0).length
  const totalProfit = rounds.reduce((sum, r) => sum + r.profit, 0)
  const totalCupsSold = rounds.reduce((sum, r) => sum + r.cupsSold, 0)
  const totalCupsMade = rounds.reduce((sum, r) => sum + r.cupsMade, 0)
  const avgSpoilageRate =
    totalCupsMade > 0 ? (totalCupsMade - totalCupsSold) / totalCupsMade : 0

  return {
    profitableRounds,
    totalRounds: rounds.length,
    avgSpoilageRate,
    totalProfit,
    totalCupsSold,
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Displays round-by-round performance history in a table format.
 * Each row shows the round number, profit (color-coded green/red),
 * cups sold, spoilage rate, and profit/loss status. A summary row
 * shows aggregate stats below the table.
 */
export function RoundHistoryTracker({
  roundHistory,
  currentRound,
}: RoundHistoryTrackerProps) {
  const summary = computeSummary(roundHistory)

  if (roundHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">ROUND HISTORY</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No rounds played yet. Complete a round to see your history.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg sm:text-xl">ROUND HISTORY</span>
          <Badge variant="outline" className="text-xs">
            Round {currentRound}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Round table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">Round</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right hidden sm:table-cell">
                Cups
              </TableHead>
              <TableHead className="text-right hidden sm:table-cell">
                Spoilage
              </TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roundHistory.map((round) => {
              const isProfitable = round.profit > 0
              return (
                <TableRow
                  key={round.round}
                  className={cn(
                    round.round === currentRound && 'bg-muted/30',
                  )}
                >
                  <TableCell className="font-medium">{round.round}</TableCell>
                  <TableCell
                    className={cn(
                      'text-right font-semibold',
                      isProfitable ? 'text-green-600' : 'text-red-600',
                    )}
                  >
                    {formatProfit(round.profit)}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {round.cupsSold}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell">
                    {formatPercent(round.spoilageRate)}
                  </TableCell>
                  <TableCell className="text-right">
                    {isProfitable ? (
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700"
                      >
                        Profitable
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-700"
                      >
                        Loss
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {/* Summary stats */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-3 text-sm text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">
              {summary.profitableRounds}/{summary.totalRounds}
            </span>{' '}
            profitable
          </span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden sm:inline">
            Avg Spoilage:{' '}
            <span className="font-medium text-foreground">
              {formatPercent(summary.avgSpoilageRate)}
            </span>
          </span>
          <span className="hidden sm:inline">|</span>
          <span>
            Total:{' '}
            <span
              className={cn(
                'font-medium',
                summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600',
              )}
            >
              {formatProfit(summary.totalProfit)}
            </span>
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
