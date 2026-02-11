// ============================================================================
// Scoring Library
// All scoring calculation functions for the Multi-Factor Scoring Model.
// Reference: spec/01_SCORING_SYSTEM.md, spec/04_DATA_MODEL.md
// ============================================================================

import type {
  Team,
  RoundResult,
  MultiFactorScore,
  TeamRank,
  LeaderboardEntry,
  CategoryAward,
} from '@/types'

import {
  SCORING_MAX,
  CONSISTENCY_POINTS_PER_ROUND,
  PROFIT_RANK_POINTS,
  PROFIT_RANK_FLOOR,
  EFFICIENCY_THRESHOLDS,
  EFFICIENCY_FLOOR,
} from '@/types'

// ---------------------------------------------------------------------------
// Profit Ranking (0–50 points)
// ---------------------------------------------------------------------------

/**
 * Calculate profit ranking points based on a team's position.
 * Uses the lookup table from PROFIT_RANK_POINTS; any rank beyond the last
 * threshold receives the floor value (participation points).
 *
 * @param rank - Team's rank position (1-based)
 * @returns Points earned (PROFIT_RANK_FLOOR–SCORING_MAX.PROFIT_RANKING)
 */
export const getProfitRankingPoints = (rank: number): number => {
  for (const entry of PROFIT_RANK_POINTS) {
    if (rank <= entry.maxRank) return entry.points
  }
  return PROFIT_RANK_FLOOR
}

// ---------------------------------------------------------------------------
// Tiebreaker
// ---------------------------------------------------------------------------

/**
 * Compare two teams that share the same total profit.
 * Applies tiebreaker rules in order:
 *   1. Highest single-round profit — team with the best individual round wins
 *   2. Fewest loss rounds — team with fewer negative-profit rounds wins
 *   3. Higher total revenue — team that generated more revenue wins
 *   4. Earlier timestamp — team that was created first wins (deterministic)
 *
 * Returns a negative number if teamA should rank higher, positive if teamB
 * should rank higher, or zero if teams are identical on all criteria.
 * Consistent with Array.prototype.sort comparators.
 *
 * @param teamA - First team to compare
 * @param teamB - Second team to compare
 * @returns Negative if A ranks higher, positive if B ranks higher, zero if equal
 */
export const resolveTie = (teamA: Team, teamB: Team): number => {
  // Rule 1: Highest single-round profit
  const maxA = teamA.roundHistory.length > 0
    ? Math.max(...teamA.roundHistory.map(r => r.profit))
    : 0
  const maxB = teamB.roundHistory.length > 0
    ? Math.max(...teamB.roundHistory.map(r => r.profit))
    : 0
  if (maxA !== maxB) return maxB - maxA

  // Rule 2: Fewest loss rounds
  const lossesA = teamA.roundHistory.filter(r => r.profit < 0).length
  const lossesB = teamB.roundHistory.filter(r => r.profit < 0).length
  if (lossesA !== lossesB) return lossesA - lossesB

  // Rule 3: Higher total revenue
  if (teamA.revenue !== teamB.revenue) {
    return teamB.revenue - teamA.revenue
  }

  // Rule 4: Earlier timestamp (lower timestamp = created first = ranks higher)
  if (teamA.timestamp !== teamB.timestamp) {
    return teamA.timestamp - teamB.timestamp
  }

  return 0
}

// ---------------------------------------------------------------------------
// Profit Ranking — full ranking
// ---------------------------------------------------------------------------

/**
 * Sort teams by total profit (descending) with tiebreaker support and
 * return an array of TeamRank entries with rank positions and points.
 *
 * @param teams - All teams to rank
 * @returns Ranked list with positions and point values
 */
export const calculateProfitRanks = (teams: Team[]): TeamRank[] => {
  const sorted = [...teams].sort((a, b) => {
    if (b.profit !== a.profit) return b.profit - a.profit
    return resolveTie(a, b)
  })

  return sorted.map((team, index) => ({
    teamId: team.id,
    rank: index + 1,
    totalProfit: team.profit,
    points: getProfitRankingPoints(index + 1),
  }))
}

// ---------------------------------------------------------------------------
// Consistency (0–20 points)
// ---------------------------------------------------------------------------

/**
 * Calculate consistency points based on the number of profitable rounds.
 * Awards CONSISTENCY_POINTS_PER_ROUND for each round with profit > 0,
 * capped at SCORING_MAX.CONSISTENCY.
 *
 * @param roundHistory - Array of round results for a team
 * @returns Points earned (0–SCORING_MAX.CONSISTENCY)
 */
export const getConsistencyPoints = (roundHistory: RoundResult[]): number => {
  const profitableRounds = roundHistory.filter(r => r.profit > 0).length
  return Math.min(profitableRounds * CONSISTENCY_POINTS_PER_ROUND, SCORING_MAX.CONSISTENCY)
}

// ---------------------------------------------------------------------------
// Efficiency (0–15 points)
// ---------------------------------------------------------------------------

/**
 * Calculate overall spoilage rate across all rounds.
 * Spoilage Rate = (Total Cups Made - Total Cups Sold) / Total Cups Made
 *
 * @param roundHistory - Array of round results for a team
 * @returns Spoilage rate as a ratio (0.0–1.0), or 0 if no cups were made
 */
export const calculateSpoilageRate = (roundHistory: RoundResult[]): number => {
  const totalMade = roundHistory.reduce((sum, r) => sum + r.cupsMade, 0)
  const totalSold = roundHistory.reduce((sum, r) => sum + r.cupsSold, 0)

  if (totalMade === 0) return 0
  return (totalMade - totalSold) / totalMade
}

/**
 * Calculate efficiency points based on spoilage rate.
 * Uses the threshold table from EFFICIENCY_THRESHOLDS; spoilage rates
 * exceeding all thresholds receive EFFICIENCY_FLOOR.
 *
 * @param spoilageRate - Ratio of unsold cups to cups made (0.0–1.0)
 * @returns Points earned (EFFICIENCY_FLOOR–SCORING_MAX.EFFICIENCY)
 */
export const getEfficiencyPoints = (spoilageRate: number): number => {
  for (const entry of EFFICIENCY_THRESHOLDS) {
    if (spoilageRate <= entry.maxRate) return entry.points
  }
  return EFFICIENCY_FLOOR
}

// ---------------------------------------------------------------------------
// Risk Management (0–15 points)
// ---------------------------------------------------------------------------

/**
 * Clamp a facilitator-provided risk management score to the valid range.
 *
 * @param rawScore - Raw score from facilitator input
 * @returns Clamped score (0–SCORING_MAX.RISK_MANAGEMENT)
 */
export const clampRiskManagementScore = (rawScore: number): number => {
  return Math.min(Math.max(rawScore, 0), SCORING_MAX.RISK_MANAGEMENT)
}

// ---------------------------------------------------------------------------
// Complete Multi-Factor Score
// ---------------------------------------------------------------------------

/**
 * Calculate the complete multi-factor score for a single team.
 * Combines profit ranking, consistency, efficiency, and facilitator-assessed
 * risk management into a score out of 100.
 *
 * @param team - The team to score
 * @param profitRank - The team's profit-based rank position (1-based)
 * @param riskManagementScore - Facilitator-assigned risk management score (0–15)
 * @returns Full MultiFactorScore breakdown with metadata
 */
export const calculateMultiFactorScore = (
  team: Team,
  profitRank: number,
  riskManagementScore: number,
): MultiFactorScore => {
  const spoilageRate = calculateSpoilageRate(team.roundHistory)
  const profitableRounds = team.roundHistory.filter(r => r.profit > 0).length

  const profitRanking = getProfitRankingPoints(profitRank)
  const consistency = getConsistencyPoints(team.roundHistory)
  const efficiency = getEfficiencyPoints(spoilageRate)
  const riskManagement = clampRiskManagementScore(riskManagementScore)

  return {
    profitRanking,
    consistency,
    efficiency,
    riskManagement,
    total: profitRanking + consistency + efficiency + riskManagement,
    profitRank,
    spoilageRate,
    profitableRounds,
    calculatedAt: Date.now(),
  }
}

// ---------------------------------------------------------------------------
// Leaderboard Generation
// ---------------------------------------------------------------------------

/**
 * Generate the final leaderboard sorted by multi-factor score.
 * Calculates profit ranks, applies multi-factor scoring to every team,
 * determines category awards, and returns sorted LeaderboardEntry items.
 *
 * @param teams - All teams in the game
 * @param riskManagementScores - Map of teamId to facilitator-assigned risk score (0–15)
 * @returns Sorted leaderboard entries with awards
 */
export const generateFinalLeaderboard = (
  teams: Team[],
  riskManagementScores: Map<string, number>,
): LeaderboardEntry[] => {
  if (teams.length === 0) return []

  // Step 1: Calculate profit ranks
  const profitRanks = calculateProfitRanks(teams)

  // Step 2: Calculate multi-factor scores
  const scoredTeams = teams.map(team => {
    const rankEntry = profitRanks.find(r => r.teamId === team.id)!
    const riskScore = riskManagementScores.get(team.id) ?? 0
    const score = calculateMultiFactorScore(team, rankEntry.rank, riskScore)

    return { team, score }
  })

  // Step 3: Sort by total multi-factor score (descending)
  scoredTeams.sort((a, b) => b.score.total - a.score.total)

  // Step 4: Determine category awards
  const awards = calculateCategoryAwards(teams)

  // Step 5: Detect ties and build entries
  return scoredTeams.map((entry, index) => {
    const isTied =
      (index > 0 && scoredTeams[index - 1].score.total === entry.score.total) ||
      (index < scoredTeams.length - 1 && scoredTeams[index + 1].score.total === entry.score.total)

    return {
      rank: index + 1,
      team: entry.team,
      multiFactorScore: entry.score,
      awards: awards.filter(a => a.teamId === entry.team.id),
      isTied,
    }
  })
}

// ---------------------------------------------------------------------------
// Category Awards
// ---------------------------------------------------------------------------

/**
 * Calculate which teams earn special category awards.
 * Returns exactly 3 awards (when teams exist):
 * - **Best Profit:** team with the highest total profit
 * - **Most Consistent:** team with the most profitable rounds
 * - **Most Efficient:** team with the lowest spoilage rate
 *
 * A single team may win multiple awards. If no teams have produced
 * cups (totalCupsMade === 0 for all), the efficiency award is omitted.
 *
 * @param teams - All teams in the game
 * @returns Array of CategoryAward entries (up to 3)
 */
export const calculateCategoryAwards = (teams: Team[]): CategoryAward[] => {
  if (teams.length === 0) return []

  const awards: CategoryAward[] = []

  // Best Profit
  const bestProfit = [...teams].sort((a, b) => b.profit - a.profit)[0]
  if (bestProfit) {
    awards.push({
      category: 'profit',
      teamId: bestProfit.id,
      teamName: bestProfit.name,
      value: bestProfit.profit,
      icon: '💰',
    })
  }

  // Most Consistent (most profitable rounds)
  const mostConsistent = [...teams].sort(
    (a, b) => b.profitableRounds - a.profitableRounds,
  )[0]
  if (mostConsistent) {
    awards.push({
      category: 'consistency',
      teamId: mostConsistent.id,
      teamName: mostConsistent.name,
      value: mostConsistent.profitableRounds,
      icon: '🎯',
    })
  }

  // Most Efficient (lowest spoilage rate)
  const withSpoilage = teams
    .filter(t => t.totalCupsMade > 0)
    .map(t => ({
      team: t,
      spoilageRate: (t.totalCupsMade - t.cupsSold) / t.totalCupsMade,
    }))
    .sort((a, b) => a.spoilageRate - b.spoilageRate)

  if (withSpoilage.length > 0) {
    const best = withSpoilage[0]
    awards.push({
      category: 'efficiency',
      teamId: best.team.id,
      teamName: best.team.name,
      value: `${(best.spoilageRate * 100).toFixed(1)}%`,
      icon: '♻️',
    })
  }

  return awards
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate that a Team object has all required fields with correct types
 * and that scoring-related values fall within valid ranges.
 *
 * @param team - The team object to validate
 * @returns True if the team passes all validation checks
 */
export const validateTeam = (team: Team): boolean => {
  return (
    typeof team.id === 'string' &&
    typeof team.name === 'string' &&
    typeof team.profit === 'number' &&
    typeof team.cupsSold === 'number' &&
    Array.isArray(team.roundHistory) &&
    team.riskManagementScore >= 0 &&
    team.riskManagementScore <= SCORING_MAX.RISK_MANAGEMENT
  )
}

/**
 * Validate that a MultiFactorScore has component values within their
 * allowed ranges and that the total equals the sum of its components.
 *
 * @param score - The multi-factor score to validate
 * @returns True if the score passes all validation checks
 */
export const validateMultiFactorScore = (score: MultiFactorScore): boolean => {
  return (
    score.profitRanking >= 0 && score.profitRanking <= SCORING_MAX.PROFIT_RANKING &&
    score.consistency >= 0 && score.consistency <= SCORING_MAX.CONSISTENCY &&
    score.efficiency >= 0 && score.efficiency <= SCORING_MAX.EFFICIENCY &&
    score.riskManagement >= 0 && score.riskManagement <= SCORING_MAX.RISK_MANAGEMENT &&
    score.total === score.profitRanking + score.consistency +
                    score.efficiency + score.riskManagement
  )
}
