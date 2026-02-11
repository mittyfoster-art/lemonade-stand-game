// ============================================================================
// Scoring Components — Barrel Export
// Re-exports all scoring-related UI components for clean imports:
// import { ScoreBreakdown, EfficiencyIndicator, ... } from '@/components/scoring'
// ============================================================================

/** Displays a single scoring category with label, points bar, and detail text */
export { ScoreCategory } from './ScoreCategory'

/** Full multi-factor score breakdown card showing all four scoring components */
export { ScoreBreakdown } from './ScoreBreakdown'

/** Real-time efficiency meter with spoilage rate, cups breakdown, and tier colors */
export { EfficiencyIndicator } from './EfficiencyIndicator'

/** Round-by-round performance history table with aggregate summary stats */
export { RoundHistoryTracker } from './RoundHistoryTracker'

/** Special category award cards (Best Profit, Most Consistent, Most Efficient) */
export { CategoryAwards } from './CategoryAwards'
