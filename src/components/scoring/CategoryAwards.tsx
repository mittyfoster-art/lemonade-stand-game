import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { calculateCategoryAwards } from '@/lib/scoring'
import type { Team, CategoryAward, AwardCategory } from '@/types'

interface CategoryAwardsProps {
  /** All teams in the current game — awards are computed from this list */
  teams: Team[]
}

/** Display metadata for each award category */
interface AwardDisplayConfig {
  title: string
  gradient: string
  iconBg: string
}

const AWARD_CONFIG: Record<AwardCategory, AwardDisplayConfig> = {
  profit: {
    title: 'BEST PROFIT',
    gradient: 'from-amber-50 to-yellow-50',
    iconBg: 'bg-amber-100',
  },
  consistency: {
    title: 'MOST CONSISTENT',
    gradient: 'from-blue-50 to-indigo-50',
    iconBg: 'bg-blue-100',
  },
  efficiency: {
    title: 'MOST EFFICIENT',
    gradient: 'from-emerald-50 to-green-50',
    iconBg: 'bg-emerald-100',
  },
}

/**
 * Formats the award value for display.
 * Profit values are formatted as dollar amounts, consistency as "X/Y rounds
 * profitable", and efficiency as the raw percentage string.
 */
function formatAwardValue(award: CategoryAward, teams: Team[]): string {
  switch (award.category) {
    case 'profit':
      return `$${(award.value as number).toFixed(2)} total profit`
    case 'consistency': {
      const team = teams.find(t => t.id === award.teamId)
      const totalRounds = team ? team.gamesPlayed : 0
      return `${award.value}/${totalRounds} profitable rounds`
    }
    case 'efficiency':
      return `${award.value} spoilage rate`
    default:
      return String(award.value)
  }
}

/**
 * Detects tied winners for a given award category.
 * Returns the names of all teams that share the same winning value.
 */
function getTiedWinners(
  category: AwardCategory,
  teams: Team[],
): string[] {
  if (teams.length === 0) return []

  switch (category) {
    case 'profit': {
      const maxProfit = Math.max(...teams.map(t => t.profit))
      return teams.filter(t => t.profit === maxProfit).map(t => t.name)
    }
    case 'consistency': {
      const maxRounds = Math.max(...teams.map(t => t.profitableRounds))
      return teams.filter(t => t.profitableRounds === maxRounds).map(t => t.name)
    }
    case 'efficiency': {
      const withCups = teams.filter(t => t.totalCupsMade > 0)
      if (withCups.length === 0) return []
      const rates = withCups.map(t => (t.totalCupsMade - t.cupsSold) / t.totalCupsMade)
      const minRate = Math.min(...rates)
      return withCups
        .filter(t => {
          const rate = (t.totalCupsMade - t.cupsSold) / t.totalCupsMade
          return Math.abs(rate - minRate) < 0.0001
        })
        .map(t => t.name)
    }
    default:
      return []
  }
}

/**
 * Displays special category awards for the top teams.
 * Shows up to 3 award cards: Best Profit, Most Consistent, and Most Efficient.
 * Each card includes the award icon, the winning team name, and the value that
 * earned them the award. Ties are indicated when multiple teams share a winning value.
 */
export function CategoryAwards({ teams }: CategoryAwardsProps) {
  const awards = calculateCategoryAwards(teams)

  if (awards.length === 0) {
    return null
  }

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-orange-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg sm:text-xl">CATEGORY AWARDS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {awards.map(award => {
          const config = AWARD_CONFIG[award.category]
          const tiedNames = getTiedWinners(award.category, teams)
          const isTied = tiedNames.length > 1

          return (
            <div
              key={award.category}
              className={cn(
                'rounded-lg border bg-gradient-to-r p-4',
                config.gradient,
              )}
            >
              <div className="flex items-start gap-3">
                {/* Award icon */}
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl',
                    config.iconBg,
                  )}
                >
                  {award.icon}
                </div>

                {/* Award details */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    {config.title}
                  </p>
                  <p className="truncate font-semibold">
                    {isTied ? tiedNames.join(' & ') : award.teamName}
                    {isTied && (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        (tied)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatAwardValue(award, teams)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
