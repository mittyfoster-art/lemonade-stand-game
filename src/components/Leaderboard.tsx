import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Trophy, Medal, Award, Users, ChevronDown, ChevronUp, ClipboardCheck, Download } from 'lucide-react'
import { useGameStore } from '@/store/game-store'
import { ScoreBreakdown } from '@/components/scoring/ScoreBreakdown'
import { CategoryAwards } from '@/components/scoring/CategoryAwards'
import type { LeaderboardEntry, CategoryAward } from '@/types'
import { useState, useCallback } from 'react'

/** CSV column headers matching spec/06_LEADERBOARD.md Export Functionality */
const CSV_HEADERS = [
  'Rank',
  'Team',
  'Total Score',
  'Profit Rank Points',
  'Profit Rank',
  'Total Profit',
  'Consistency Points',
  'Profitable Rounds',
  'Efficiency Points',
  'Spoilage Rate',
  'Risk Management Points',
  'Awards',
] as const

/**
 * Escape a value for safe inclusion in a CSV cell.
 * Wraps the value in double quotes if it contains commas, quotes, or newlines.
 */
const escapeCsvValue = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

/**
 * Export leaderboard entries to a CSV file and trigger a browser download.
 * Includes all scoring columns as specified in spec/06_LEADERBOARD.md.
 *
 * @param entries - Ranked leaderboard entries to export
 */
const exportLeaderboardToCsv = (entries: LeaderboardEntry[]): void => {
  const rows: string[] = [CSV_HEADERS.join(',')]

  for (const entry of entries) {
    const score = entry.multiFactorScore
    const totalRounds = entry.team.gamesPlayed || entry.team.roundHistory.length
    const awardsLabel = entry.awards
      .map((a) =>
        a.category === 'profit'
          ? 'Best Profit'
          : a.category === 'consistency'
            ? 'Most Consistent'
            : 'Most Efficient',
      )
      .join('; ')

    const cells: string[] = [
      String(entry.rank),
      escapeCsvValue(entry.team.name),
      String(score.total),
      String(score.profitRanking),
      String(score.profitRank),
      `$${entry.team.profit.toFixed(2)}`,
      String(score.consistency),
      `${score.profitableRounds}/${totalRounds}`,
      String(score.efficiency),
      `${Math.round(score.spoilageRate * 100)}%`,
      String(score.riskManagement),
      escapeCsvValue(awardsLabel),
    ]

    rows.push(cells.join(','))
  }

  const csvContent = rows.join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `leaderboard-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Ordinal suffix for a given rank (1 → "1st", 2 → "2nd", etc.) */
const getOrdinal = (rank: number): string => {
  const suffixes = ['th', 'st', 'nd', 'rd']
  const remainder = rank % 100
  const suffix = suffixes[(remainder - 20) % 10] || suffixes[remainder] || suffixes[0]
  return `${rank}${suffix}`
}

/** Format a spoilage rate (0.0–1.0) as a display percentage string */
const formatSpoilagePercent = (rate: number): string => {
  return `${Math.round(rate * 100)}%`
}

/** Icon component for a leaderboard position */
const RankIcon = ({ rank }: { rank: number }) => {
  switch (rank) {
    case 1:
      return <Trophy className="h-5 w-5 text-yellow-500" />
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />
    case 3:
      return <Award className="h-5 w-5 text-amber-600" />
    default:
      return (
        <div className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-500">
          #{rank}
        </div>
      )
  }
}

/** Rank-specific gradient classes for row backgrounds */
const getRankColor = (rank: number): string => {
  switch (rank) {
    case 1:
      return 'from-yellow-50 to-yellow-100 border-yellow-300'
    case 2:
      return 'from-gray-50 to-gray-100 border-gray-300'
    case 3:
      return 'from-amber-50 to-amber-100 border-amber-300'
    default:
      return 'from-blue-50 to-blue-100 border-blue-200'
  }
}

/** Render award badges for a team */
const AwardBadges = ({ awards }: { awards: CategoryAward[] }) => {
  if (awards.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {awards.map((award) => (
        <Badge
          key={award.category}
          variant="secondary"
          className="text-xs px-1.5 py-0"
        >
          {award.icon}{' '}
          {award.category === 'profit'
            ? 'Best Profit'
            : award.category === 'consistency'
              ? 'Most Consistent'
              : 'Most Efficient'}
        </Badge>
      ))}
    </div>
  )
}

/** A single score cell with main value and subtext detail */
const ScoreCell = ({
  value,
  subtext,
  bold,
}: {
  value: number
  subtext?: string
  bold?: boolean
}) => (
  <div className="text-center min-w-[48px]">
    <div className={`text-sm ${bold ? 'font-bold text-indigo-700' : 'font-semibold text-gray-700'}`}>
      {value}
    </div>
    {subtext && <div className="text-[10px] text-gray-500 leading-tight">{subtext}</div>}
  </div>
)

/**
 * Full leaderboard table view with all multi-factor score columns.
 * Displayed on larger screens (md+).
 */
const DesktopLeaderboard = ({
  entries,
  onTeamClick,
}: {
  entries: LeaderboardEntry[]
  onTeamClick?: (teamId: string) => void
}) => (
  <div className="hidden md:block overflow-x-auto">
    {/* Column headers */}
    <div className="grid grid-cols-[56px_1fr_64px_64px_56px_56px_56px] gap-2 px-3 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
      <div>Rank</div>
      <div>Team</div>
      <div className="text-center">Total</div>
      <div className="text-center">Profit</div>
      <div className="text-center">Cons</div>
      <div className="text-center">Effi</div>
      <div className="text-center">Risk</div>
    </div>

    {/* Rows */}
    <div className="space-y-2">
      {entries.map((entry) => {
        const score = entry.multiFactorScore
        const totalRounds = entry.team.gamesPlayed || entry.team.roundHistory.length

        return (
          <div
            key={entry.team.id}
            className={`grid grid-cols-[56px_1fr_64px_64px_56px_56px_56px] gap-2 items-center p-3 rounded-lg bg-gradient-to-r ${getRankColor(entry.rank)} border cursor-pointer hover:shadow-md transition-shadow`}
            onClick={() => onTeamClick?.(entry.team.id)}
          >
            {/* Rank */}
            <div className="flex items-center gap-1">
              <RankIcon rank={entry.rank} />
            </div>

            {/* Team name + color + awards */}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: entry.team.color }}
                />
                <span className="font-bold text-gray-800 text-sm truncate">
                  {entry.team.name}
                </span>
                {entry.isTied && (
                  <Badge variant="outline" className="text-[10px] px-1 py-0 border-gray-400 text-gray-500">
                    TIE
                  </Badge>
                )}
              </div>
              <AwardBadges awards={entry.awards} />
            </div>

            {/* Total */}
            <ScoreCell value={score.total} bold />

            {/* Profit Ranking */}
            <ScoreCell
              value={score.profitRanking}
              subtext={getOrdinal(score.profitRank)}
            />

            {/* Consistency */}
            <ScoreCell
              value={score.consistency}
              subtext={`${score.profitableRounds}/${totalRounds}`}
            />

            {/* Efficiency */}
            <ScoreCell
              value={score.efficiency}
              subtext={formatSpoilagePercent(score.spoilageRate)}
            />

            {/* Risk Management */}
            <ScoreCell value={score.riskManagement} />
          </div>
        )
      })}
    </div>

    {/* Legend */}
    <div className="mt-3 px-3 text-[10px] text-gray-400">
      PROFIT = Ranking Points &middot; CONS = Consistency &middot; EFFI = Efficiency &middot; RISK = Risk Management
    </div>
  </div>
)

/**
 * Compact mobile card view for the leaderboard.
 * Each entry shows total score prominently with expandable score details.
 */
const MobileLeaderboard = ({
  entries,
  onTeamClick,
}: {
  entries: LeaderboardEntry[]
  onTeamClick?: (teamId: string) => void
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <div className="md:hidden space-y-2">
      {entries.map((entry) => {
        const score = entry.multiFactorScore
        const totalRounds = entry.team.gamesPlayed || entry.team.roundHistory.length
        const isExpanded = expandedId === entry.team.id

        return (
          <div
            key={entry.team.id}
            className={`p-3 rounded-lg bg-gradient-to-r ${getRankColor(entry.rank)} border`}
          >
            {/* Main row */}
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setExpandedId(isExpanded ? null : entry.team.id)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <RankIcon rank={entry.rank} />
                <div
                  className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm flex-shrink-0"
                  style={{ backgroundColor: entry.team.color }}
                />
                <span className="font-bold text-gray-800 text-sm truncate">
                  {entry.team.name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="font-bold text-indigo-700 text-sm">
                    {score.total}
                  </span>
                  <span className="text-xs text-gray-500">/100 pts</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>

            {/* Awards */}
            <AwardBadges awards={entry.awards} />

            {/* Expanded score breakdown */}
            {isExpanded && (
              <div className="mt-2 pt-2 border-t border-gray-200/60">
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Profit</div>
                    <div className="text-sm font-semibold text-gray-700">{score.profitRanking}</div>
                    <div className="text-[10px] text-gray-400">{getOrdinal(score.profitRank)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Cons</div>
                    <div className="text-sm font-semibold text-gray-700">{score.consistency}</div>
                    <div className="text-[10px] text-gray-400">{score.profitableRounds}/{totalRounds}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Effi</div>
                    <div className="text-sm font-semibold text-gray-700">{score.efficiency}</div>
                    <div className="text-[10px] text-gray-400">{formatSpoilagePercent(score.spoilageRate)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-500">Risk</div>
                    <div className="text-sm font-semibold text-gray-700">{score.riskManagement}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-2 w-full text-center text-xs font-medium text-indigo-600 hover:text-indigo-800 py-1"
                  onClick={(e) => {
                    e.stopPropagation()
                    onTeamClick?.(entry.team.id)
                  }}
                >
                  View Full Breakdown
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Leaderboard component displaying team rankings based on the Multi-Factor
 * Scoring Model (100 points). Shows total score plus breakdowns for Profit
 * Ranking, Consistency, Efficiency, and Risk Management.
 *
 * Clicking a team row opens a modal with the full ScoreBreakdown for that team.
 * Renders a full table on desktop (md+) and expandable cards on mobile.
 * Only visible in multi-team mode when teams exist.
 *
 * @see spec/06_LEADERBOARD.md — Display Specifications, Score Breakdown Modal
 */
export function Leaderboard() {
  const navigate = useNavigate()
  const { teams, gameMode, getFinalLeaderboard } = useGameStore()
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  const handleTeamClick = useCallback((teamId: string) => {
    setSelectedTeamId(teamId)
  }, [])

  const handleModalClose = useCallback(() => {
    setSelectedTeamId(null)
  }, [])

  if (gameMode === 'single' || teams.length === 0) {
    return null
  }

  const entries: LeaderboardEntry[] = getFinalLeaderboard()
  const selectedEntry: LeaderboardEntry | undefined = selectedTeamId
    ? entries.find((e) => e.team.id === selectedTeamId)
    : undefined

  return (
    <>
      <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-indigo-800">
              <Trophy className="h-5 w-5" />
              Leaderboard
              <Badge variant="secondary" className="ml-2">
                <Users className="h-3 w-3 mr-1" />
                {teams.length} teams
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportLeaderboardToCsv(entries)}
                disabled={entries.length === 0}
                className="text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-100"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/facilitator')}
                className="text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-100"
              >
                <ClipboardCheck className="h-3.5 w-3.5 mr-1" />
                Facilitator
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length > 0 ? (
            <>
              <DesktopLeaderboard entries={entries} onTeamClick={handleTeamClick} />
              <MobileLeaderboard entries={entries} onTeamClick={handleTeamClick} />

              {/* Category Awards — shown below the team list */}
              <div className="mt-4">
                <CategoryAwards teams={teams} />
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No teams yet. Add some teams to start competing!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Score Breakdown Modal */}
      <Dialog open={selectedEntry != null} onOpenChange={(open) => { if (!open) handleModalClose() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Score Breakdown: {selectedEntry?.team.name}
            </DialogTitle>
            <DialogDescription>
              Detailed multi-factor score for this team
            </DialogDescription>
          </DialogHeader>

          {selectedEntry && (
            <ScoreBreakdown
              score={selectedEntry.multiFactorScore}
              teamName={selectedEntry.team.name}
              profitRank={selectedEntry.multiFactorScore.profitRank}
              totalTeams={teams.length}
              profitableRounds={selectedEntry.multiFactorScore.profitableRounds}
              totalRounds={
                selectedEntry.team.gamesPlayed || selectedEntry.team.roundHistory.length
              }
              spoilageRate={selectedEntry.multiFactorScore.spoilageRate}
            />
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
