import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { EFFICIENCY_THRESHOLDS, EFFICIENCY_FLOOR, SCORING_MAX } from '@/types'

interface EfficiencyIndicatorProps {
  /** Total cups produced across all rounds */
  cupsMade: number
  /** Total cups sold across all rounds */
  cupsSold: number
  /** Whether to display the efficiency points section (default: true) */
  showPoints?: boolean
}

/** Efficiency level label and Tailwind color classes keyed by spoilage rate tier */
interface EfficiencyTier {
  label: string
  barColor: string
  textColor: string
}

/**
 * Returns the efficiency tier (label + colors) for a given spoilage rate.
 * Tiers are based on the color-coding table in spec/03_UI_COMPONENTS.md Section 2.
 */
function getEfficiencyTier(spoilageRate: number): EfficiencyTier {
  if (spoilageRate <= 0.10) return { label: 'Excellent', barColor: 'bg-green-500', textColor: 'text-green-700' }
  if (spoilageRate <= 0.20) return { label: 'Good', barColor: 'bg-lime-500', textColor: 'text-lime-700' }
  if (spoilageRate <= 0.30) return { label: 'Average', barColor: 'bg-yellow-500', textColor: 'text-yellow-700' }
  if (spoilageRate <= 0.40) return { label: 'Below Average', barColor: 'bg-orange-500', textColor: 'text-orange-700' }
  if (spoilageRate <= 0.50) return { label: 'Poor', barColor: 'bg-red-400', textColor: 'text-red-600' }
  return { label: 'Very Poor', barColor: 'bg-red-600', textColor: 'text-red-700' }
}

/**
 * Returns the efficiency points earned for a given spoilage rate.
 * Uses the thresholds defined in the scoring types module.
 */
function getEfficiencyPoints(spoilageRate: number): number {
  for (const threshold of EFFICIENCY_THRESHOLDS) {
    if (spoilageRate <= threshold.maxRate) return threshold.points
  }
  return EFFICIENCY_FLOOR
}

/**
 * Displays real-time efficiency metrics during gameplay.
 * Shows spoilage rate percentage, cups made/sold/unsold breakdown,
 * and optionally the efficiency points earned toward the multi-factor score.
 * Color-coded by efficiency level per the spec.
 */
export function EfficiencyIndicator({
  cupsMade,
  cupsSold,
  showPoints = true,
}: EfficiencyIndicatorProps) {
  const unsold = cupsMade - cupsSold
  const spoilageRate = cupsMade > 0 ? unsold / cupsMade : 0
  const spoilagePercent = Math.round(spoilageRate * 100)
  const tier = getEfficiencyTier(spoilageRate)
  const points = getEfficiencyPoints(spoilageRate)

  return (
    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg sm:text-xl">EFFICIENCY METER</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Spoilage rate bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Spoilage Rate</span>
            <span className={cn('text-sm font-bold', tier.textColor)}>
              {spoilagePercent}%
            </span>
          </div>
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                tier.barColor,
              )}
              style={{ width: `${Math.min(spoilagePercent, 100)}%` }}
            />
          </div>
        </div>

        {/* Cups breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border bg-white/60 p-2">
            <p className="text-xs text-muted-foreground">Cups Made</p>
            <p className="text-lg font-bold">{cupsMade}</p>
          </div>
          <div className="rounded-lg border bg-white/60 p-2">
            <p className="text-xs text-muted-foreground">Cups Sold</p>
            <p className="text-lg font-bold">{cupsSold}</p>
          </div>
          <div className="rounded-lg border bg-white/60 p-2">
            <p className="text-xs text-muted-foreground">Unsold</p>
            <p className={cn('text-lg font-bold', unsold > 0 ? tier.textColor : 'text-green-700')}>
              {unsold}
            </p>
          </div>
        </div>

        {/* Efficiency points */}
        {showPoints && (
          <div className="flex items-center justify-between rounded-lg border bg-white/60 p-3">
            <span className="text-sm font-semibold">
              Efficiency Points: {points}/{SCORING_MAX.EFFICIENCY}
            </span>
            <span className={cn('text-sm font-medium', tier.textColor)}>
              {tier.label} efficiency!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
