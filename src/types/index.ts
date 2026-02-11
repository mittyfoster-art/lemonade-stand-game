// ============================================================================
// Types — Barrel Export
// Re-exports all public types, interfaces, and constants from the types module
// for clean imports: import { Team, RoundResult, ... } from '@/types'
// ============================================================================

export {
  // Constants
  SCORING_MAX,
  CONSISTENCY_POINTS_PER_ROUND,
  PROFIT_RANK_POINTS,
  PROFIT_RANK_FLOOR,
  EFFICIENCY_THRESHOLDS,
  EFFICIENCY_FLOOR,

  // Core scoring interfaces
  type DecisionQuality,
  type RoundResult,
  type MultiFactorScore,
  type RiskManagementInput,

  // Leaderboard interfaces
  type AwardCategory,
  type CategoryAward,
  type LeaderboardEntry,
  type TeamRank,

  // Game interfaces
  type GameDecision,
  type Team,
  type GameResult,
} from './scoring'
