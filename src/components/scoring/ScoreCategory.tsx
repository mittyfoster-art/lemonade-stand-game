import { cn } from '@/lib/utils'

interface ScoreCategoryProps {
  /** Display label for the scoring category (e.g. "Profit Ranking") */
  label: string
  /** Points earned in this category */
  points: number
  /** Maximum possible points for this category */
  maxPoints: number
  /** Descriptive detail text (e.g. "2nd Place of 12") */
  detail: string
}

/**
 * Displays a single score category with a label, points, progress bar, and detail text.
 * Used within ScoreBreakdown to render each scoring factor.
 */
export function ScoreCategory({ label, points, maxPoints, detail }: ScoreCategoryProps) {
  const percentage = maxPoints > 0 ? Math.round((points / maxPoints) * 100) : 0

  return (
    <div className="rounded-lg border bg-white/60 p-4 space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{label}</span>
        <span className="text-sm font-bold text-muted-foreground">
          {points} / {maxPoints}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            percentage >= 80 ? 'bg-green-500' :
            percentage >= 50 ? 'bg-yellow-500' :
            'bg-orange-500'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">{detail}</p>
    </div>
  )
}
