// ============================================================================
// Scoring System Types
// Multi-Factor Scoring Model — up to 100 points across four categories
// Reference: spec/01_SCORING_SYSTEM.md, spec/04_DATA_MODEL.md
// ============================================================================

// ---------------------------------------------------------------------------
// Scoring Constants
// ---------------------------------------------------------------------------

/** Maximum points per scoring component */
export const SCORING_MAX = {
  PROFIT_RANKING: 50,
  CONSISTENCY: 20,
  EFFICIENCY: 15,
  RISK_MANAGEMENT: 15,
  TOTAL: 100,
} as const

/** Points awarded per profitable round for consistency scoring */
export const CONSISTENCY_POINTS_PER_ROUND = 4

/** Profit ranking point thresholds by rank position */
export const PROFIT_RANK_POINTS: ReadonlyArray<{ maxRank: number; points: number }> = [
  { maxRank: 1, points: 50 },
  { maxRank: 2, points: 45 },
  { maxRank: 3, points: 40 },
  { maxRank: 4, points: 35 },
  { maxRank: 5, points: 30 },
  { maxRank: 10, points: 25 },
  { maxRank: 15, points: 20 },
  { maxRank: 20, points: 15 },
]

/** Minimum participation points for any ranked team */
export const PROFIT_RANK_FLOOR = 10

/** Spoilage rate thresholds mapped to efficiency points */
export const EFFICIENCY_THRESHOLDS: ReadonlyArray<{ maxRate: number; points: number }> = [
  { maxRate: 0.10, points: 15 },
  { maxRate: 0.20, points: 12 },
  { maxRate: 0.30, points: 9 },
  { maxRate: 0.40, points: 6 },
  { maxRate: 0.50, points: 3 },
]

/** Efficiency points when spoilage exceeds all thresholds */
export const EFFICIENCY_FLOOR = 0

// ---------------------------------------------------------------------------
// Core Scoring Interfaces
// ---------------------------------------------------------------------------

/** How well a team's decisions matched the optimal strategy for a scenario */
export interface DecisionQuality {
  /** Whether the price fell within the scenario's optimal range */
  priceOptimal: boolean
  /** Whether the quality level fell within the scenario's optimal range */
  qualityOptimal: boolean
  /** Whether the marketing spend fell within the scenario's optimal range */
  marketingOptimal: boolean
  /** Count of optimal matches (0–3) */
  overallScore: number
}

/** Detailed result for a single round of play */
export interface RoundResult {
  /** Round number (1-based) */
  round: number
  /** Identifier of the scenario played this round */
  scenarioId: string

  // Decision tracking
  /** The player's game decisions for this round */
  decision: GameDecision

  // Production metrics
  /** Number of cups produced */
  cupsMade: number
  /** Number of cups actually sold */
  cupsSold: number
  /** Ratio of unsold cups to cups made (0.0–1.0) */
  spoilageRate: number

  // Financial metrics
  /** Total revenue earned this round */
  revenue: number
  /** Total costs incurred this round */
  costs: number
  /** Net profit (revenue - costs) */
  profit: number

  // Performance indicators
  /** How well the decisions matched the scenario's optimal strategy */
  decisionQuality: DecisionQuality
  /** Unix timestamp when this round was completed */
  timestamp: number
}

/**
 * Breakdown of a team's multi-factor score.
 * Total is always the sum of the four component scores.
 */
export interface MultiFactorScore {
  // Component scores
  /** Points from profit ranking (0–50) */
  profitRanking: number
  /** Points from round-over-round consistency (0–20) */
  consistency: number
  /** Points from inventory efficiency / low spoilage (0–15) */
  efficiency: number
  /** Points from facilitator-assessed risk management (0–15) */
  riskManagement: number

  /** Sum of all component scores (0–100) */
  total: number

  // Metadata
  /** The team's rank position used for profit ranking */
  profitRank: number
  /** Overall spoilage rate across all rounds */
  spoilageRate: number
  /** Number of rounds where profit > 0 */
  profitableRounds: number
  /** Unix timestamp when this score was calculated */
  calculatedAt: number
}

/** Facilitator input for the risk management scoring component */
export interface RiskManagementInput {
  /** Team being assessed */
  teamId: string
  /** Score for adjusting production based on forecasts (0–5) */
  productionAdjustment: number
  /** Score for adjusting pricing based on conditions (0–5) */
  pricingStrategy: number
  /** Score for maintaining budget reserves (0–5) */
  budgetReserves: number
  /** Sum of sub-scores (0–15) */
  total: number
  /** Optional facilitator notes */
  notes: string
  /** Name or ID of the facilitator who assessed */
  assessedBy: string
  /** Unix timestamp of the assessment */
  assessedAt: number
}

// ---------------------------------------------------------------------------
// Leaderboard Interfaces
// ---------------------------------------------------------------------------

/** Category award types that can be earned */
export type AwardCategory = 'profit' | 'consistency' | 'efficiency'

/** A special award given to the top team in a specific category */
export interface CategoryAward {
  /** Which scoring category this award is for */
  category: AwardCategory
  /** Identifier of the team that earned this award */
  teamId: string
  /** Display name of the team that earned this award */
  teamName: string
  /** The winning value for this category (e.g. profit amount, round count, spoilage rate) */
  value: number | string
  /** Display icon for the award */
  icon: string
}

/** A single entry on the final leaderboard */
export interface LeaderboardEntry {
  /** Position on the leaderboard (1-based) */
  rank: number
  /** The team this entry belongs to */
  team: Team
  /** Full multi-factor score breakdown */
  multiFactorScore: MultiFactorScore
  /** Category awards earned by this team */
  awards: CategoryAward[]
  /** Whether this entry is tied with another entry at the same rank */
  isTied: boolean
}

/** Result of ranking a team by profit */
export interface TeamRank {
  /** The team's identifier */
  teamId: string
  /** Rank position (1-based, 1 = highest profit) */
  rank: number
  /** The team's total profit used for ranking */
  totalProfit: number
  /** Points earned from this rank */
  points: number
}

// ---------------------------------------------------------------------------
// Re-exported types from game-store (referenced by scoring interfaces)
// ---------------------------------------------------------------------------

/**
 * Player decisions for a single round.
 * Mirrors the GameDecision interface in game-store.ts.
 */
export interface GameDecision {
  /** Price per cup ($0.25–$2.00) */
  price: number
  /** Quality level (1–5) */
  quality: number
  /** Marketing spend ($0–$30) */
  marketing: number
}

/**
 * Represents a team in the game.
 * Extends the base Team from game-store with multi-factor scoring fields.
 */
export interface Team {
  id: string
  name: string
  color: string
  profit: number
  revenue: number
  cupsSold: number
  gamesPlayed: number
  lastResult: GameResult | null
  timestamp: number
  currentBudget: number
  day: number

  // Multi-factor scoring fields
  /** History of all rounds played */
  roundHistory: RoundResult[]
  /** Total cups produced across all rounds */
  totalCupsMade: number
  /** Number of rounds with positive profit */
  profitableRounds: number
  /** Facilitator-assigned risk management score (0–15) */
  riskManagementScore: number
  /** Calculated multi-factor score, null if not yet calculated */
  multiFactorScore: MultiFactorScore | null
}

/**
 * Result of a single game simulation.
 * Extends the base GameResult from game-store with production tracking.
 */
export interface GameResult {
  cupsSold: number
  revenue: number
  costs: number
  profit: number
  feedback: string[]

  // Production tracking
  /** Number of cups produced this round */
  cupsMade: number
  /** Spoilage rate for this round (0.0–1.0) */
  spoilageRate: number

  // Decision analysis
  /** How well the decisions matched the optimal strategy */
  decisionQuality: DecisionQuality
}
