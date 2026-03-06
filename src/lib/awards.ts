/**
 * Awards computation engine for the Lemonade Stand game.
 *
 * Contains pure functions that derive award results from player data.
 * No side effects, no store dependencies -- accepts Player[] and returns AwardResult[].
 *
 * Two main exports:
 *   - computeFinalAwards(players)       -- 7 end-of-game awards
 *   - computeDailyRecognition(players, day) -- 4 per-day recognition awards
 */

import type { Player, LoanRecord, LevelResult } from '@/store/game-store'

// ============================================================================
// Public Types
// ============================================================================

/** Describes a single award with its winner (if any). */
export interface AwardResult {
  /** Unique slug identifier, e.g. "lemonade-tycoon" */
  id: string
  /** Human-readable award name, e.g. "Lemonade Tycoon" */
  name: string
  /** Display emoji for the award card */
  emoji: string
  /** One-sentence explanation of what the award recognises */
  description: string
  /** Player ID of the winner, or null if no eligible player */
  winnerId: string | null
  /** Display name of the winner, or null if no eligible player */
  winnerName: string | null
  /** The winning statistic value, or null if no eligible player */
  value: number | null
  /** Formatted label for the value, e.g. "$1,234 profit" */
  valueLabel: string
}

// ============================================================================
// Constants
// ============================================================================

/** Number of levels played per camp day */
const LEVELS_PER_DAY = 10

/** Starting budget all players begin with (used for Comeback Kid eligibility) */
const STARTING_BUDGET = 500

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Format a dollar value as a short currency string.
 * Negative values are shown with a minus sign, e.g. "-$42".
 */
function formatDollars(amount: number): string {
  const abs = Math.abs(amount)
  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs)
  return amount < 0 ? `-${formatted}` : formatted
}

/**
 * Return the inclusive level range for a given camp day.
 * Day 1 = levels 1-10, Day 2 = levels 11-20, etc.
 */
function getLevelRangeForDay(day: number): { start: number; end: number } {
  const start = (day - 1) * LEVELS_PER_DAY + 1
  const end = day * LEVELS_PER_DAY
  return { start, end }
}

/**
 * Filter a player's level results to only those within a specific day's range.
 */
function getLevelResultsForDay(player: Player, day: number): LevelResult[] {
  const { start, end } = getLevelRangeForDay(day)
  return player.levelResults.filter((lr) => lr.level >= start && lr.level <= end)
}

/**
 * Find the player with the highest value for a given numeric extractor.
 * Returns null if no players are eligible (empty array or all values null).
 *
 * @param players - The candidate players
 * @param extractor - Returns the metric value, or null if the player is ineligible
 */
function findMaxPlayer(
  players: Player[],
  extractor: (p: Player) => number | null
): { player: Player; value: number } | null {
  let best: { player: Player; value: number } | null = null

  for (const player of players) {
    const val = extractor(player)
    if (val === null) continue
    if (best === null || val > best.value) {
      best = { player, value: val }
    }
  }

  return best
}

/**
 * Build an AwardResult with a null winner (no eligible player found).
 */
function noWinner(id: string, name: string, emoji: string, description: string): AwardResult {
  return {
    id,
    name,
    emoji,
    description,
    winnerId: null,
    winnerName: null,
    value: null,
    valueLabel: 'N/A',
  }
}

// ============================================================================
// Loan ROI Calculation
// ============================================================================

/**
 * Determine which levels a loan was "active" -- that is, the levels between
 * (and including) the level it was accepted at and the level it was settled at.
 * For an active (not-yet-settled) loan we use all completed levels from the
 * acceptance level onward.
 */
function getLoanActiveLevels(
  loan: LoanRecord | { acceptedAtLevel: number; settledAtLevel: number | null },
  completedLevels: number[]
): number[] {
  const from = loan.acceptedAtLevel
  const to = 'settledAtLevel' in loan && loan.settledAtLevel !== null
    ? loan.settledAtLevel
    : Math.max(...completedLevels, from)

  return completedLevels.filter((lv) => lv >= from && lv <= to)
}

/**
 * Compute the net loan ROI for a single player across all their loans.
 *
 * For each loan:
 *   - Sum the level-result profit for every level the loan was active
 *   - Subtract the total interest paid (totalRepayment - amount)
 *
 * The overall value is the sum across all loans.
 * Returns null if the player has never taken a loan.
 */
function computePlayerLoanROI(player: Player): number | null {
  const allLoans: Array<{
    amount: number
    totalRepayment: number
    acceptedAtLevel: number
    settledAtLevel: number | null
  }> = []

  // Add historical loans
  for (const loan of player.loanHistory) {
    allLoans.push({
      amount: loan.amount,
      totalRepayment: loan.totalRepayment,
      acceptedAtLevel: loan.acceptedAtLevel,
      settledAtLevel: loan.settledAtLevel,
    })
  }

  // Add currently active loan (not yet in history)
  if (player.activeLoan) {
    allLoans.push({
      amount: player.activeLoan.amount,
      totalRepayment: player.activeLoan.totalRepayment,
      acceptedAtLevel: player.activeLoan.acceptedAtLevel,
      settledAtLevel: null,
    })
  }

  if (allLoans.length === 0) return null

  // Build a lookup of level -> profit for quick access
  const profitByLevel = new Map<number, number>()
  for (const lr of player.levelResults) {
    profitByLevel.set(lr.level, lr.profit)
  }

  let totalROI = 0

  for (const loan of allLoans) {
    const activeLevels = getLoanActiveLevels(loan, player.completedLevels)
    let profitDuringLoan = 0
    for (const lv of activeLevels) {
      profitDuringLoan += profitByLevel.get(lv) ?? 0
    }

    const interestPaid = loan.totalRepayment - loan.amount
    totalROI += profitDuringLoan - interestPaid
  }

  return totalROI
}

/**
 * Compute loan ROI for a specific day only.
 * Considers loans that were active at any point during the day's levels.
 * Returns null if no loans were active during the day.
 */
function computePlayerDailyLoanROI(player: Player, day: number): number | null {
  const { start, end } = getLevelRangeForDay(day)

  const allLoans: Array<{
    amount: number
    totalRepayment: number
    acceptedAtLevel: number
    settledAtLevel: number | null
    durationLevels: number
  }> = []

  for (const loan of player.loanHistory) {
    // Only include loans that overlap with this day's level range
    if (loan.acceptedAtLevel <= end && loan.settledAtLevel >= start) {
      allLoans.push({ ...loan, settledAtLevel: loan.settledAtLevel })
    }
  }

  if (player.activeLoan && player.activeLoan.acceptedAtLevel <= end) {
    allLoans.push({
      amount: player.activeLoan.amount,
      totalRepayment: player.activeLoan.totalRepayment,
      acceptedAtLevel: player.activeLoan.acceptedAtLevel,
      settledAtLevel: null,
      durationLevels: 0,
    })
  }

  if (allLoans.length === 0) return null

  const profitByLevel = new Map<number, number>()
  for (const lr of player.levelResults) {
    profitByLevel.set(lr.level, lr.profit)
  }

  let totalROI = 0

  for (const loan of allLoans) {
    // Only look at levels within this day that the loan was active for
    const loanEnd = loan.settledAtLevel ?? Math.max(...player.completedLevels, loan.acceptedAtLevel)
    const dayLevels = player.completedLevels.filter(
      (lv) => lv >= Math.max(start, loan.acceptedAtLevel) && lv <= Math.min(end, loanEnd)
    )

    let profitDuringLoan = 0
    for (const lv of dayLevels) {
      profitDuringLoan += profitByLevel.get(lv) ?? 0
    }

    // Prorate interest: only charge interest proportional to levels in this day
    const totalLoanLevels = loanEnd - loan.acceptedAtLevel + 1
    const totalInterest = loan.totalRepayment - loan.amount
    const dayLevelCount = dayLevels.length
    const proratedInterest = totalLoanLevels > 0
      ? (totalInterest * dayLevelCount) / totalLoanLevels
      : 0

    totalROI += profitDuringLoan - proratedInterest
  }

  return totalROI
}

// ============================================================================
// Final Awards (7 awards computed across the entire game)
// ============================================================================

/**
 * Compute the 7 final awards from the full list of players.
 *
 * Awards:
 *   1. Lemonade Tycoon   -- highest cumulative profit
 *   2. Revenue King/Queen -- highest total revenue
 *   3. Customer Favourite -- most cups sold
 *   4. Marathon Runner    -- most levels completed
 *   5. Loan Shark         -- best loan ROI
 *   6. Comeback Kid       -- biggest recovery from lowest budget
 *   7. Most Improved      -- largest improvement Day 1 vs Day 5
 */
export function computeFinalAwards(players: Player[]): AwardResult[] {
  return [
    computeLemonadeTycoon(players),
    computeRevenueRoyalty(players),
    computeCustomerFavourite(players),
    computeMarathonRunner(players),
    computeLoanShark(players),
    computeComebackKid(players),
    computeMostImproved(players),
  ]
}

function computeLemonadeTycoon(players: Player[]): AwardResult {
  const id = 'lemonade-tycoon'
  const name = 'Lemonade Tycoon'
  const emoji = '\u{1F3C6}' // trophy
  const description = 'Highest cumulative profit across all levels'

  const result = findMaxPlayer(players, (p) => p.totalProfit)
  if (!result) return noWinner(id, name, emoji, description)

  return {
    id, name, emoji, description,
    winnerId: result.player.id,
    winnerName: result.player.name,
    value: result.value,
    valueLabel: `${formatDollars(result.value)} profit`,
  }
}

function computeRevenueRoyalty(players: Player[]): AwardResult {
  const id = 'revenue-royalty'
  const name = 'Revenue King/Queen'
  const emoji = '\u{1F451}' // crown
  const description = 'Highest total revenue earned'

  const result = findMaxPlayer(players, (p) => p.totalRevenue)
  if (!result) return noWinner(id, name, emoji, description)

  return {
    id, name, emoji, description,
    winnerId: result.player.id,
    winnerName: result.player.name,
    value: result.value,
    valueLabel: `${formatDollars(result.value)} revenue`,
  }
}

function computeCustomerFavourite(players: Player[]): AwardResult {
  const id = 'customer-favourite'
  const name = 'Customer Favourite'
  const emoji = '\u{2764}\u{FE0F}' // red heart
  const description = 'Most cups of lemonade sold overall'

  const result = findMaxPlayer(players, (p) => p.totalCupsSold)
  if (!result) return noWinner(id, name, emoji, description)

  return {
    id, name, emoji, description,
    winnerId: result.player.id,
    winnerName: result.player.name,
    value: result.value,
    valueLabel: `${result.value.toLocaleString()} cups sold`,
  }
}

function computeMarathonRunner(players: Player[]): AwardResult {
  const id = 'marathon-runner'
  const name = 'Marathon Runner'
  const emoji = '\u{1F3C3}' // runner
  const description = 'Most levels completed in the game'

  const result = findMaxPlayer(players, (p) => p.completedLevels.length)
  if (!result) return noWinner(id, name, emoji, description)

  return {
    id, name, emoji, description,
    winnerId: result.player.id,
    winnerName: result.player.name,
    value: result.value,
    valueLabel: `${result.value} levels`,
  }
}

function computeLoanShark(players: Player[]): AwardResult {
  const id = 'loan-shark'
  const name = 'Loan Shark'
  const emoji = '\u{1F988}' // shark (T-Rex as fallback if not available)
  const description = 'Best return on investment from loans'

  const result = findMaxPlayer(players, computePlayerLoanROI)
  if (!result) return noWinner(id, name, emoji, description)

  return {
    id, name, emoji, description,
    winnerId: result.player.id,
    winnerName: result.player.name,
    value: result.value,
    valueLabel: `${formatDollars(result.value)} loan ROI`,
  }
}

function computeComebackKid(players: Player[]): AwardResult {
  const id = 'comeback-kid'
  const name = 'Comeback Kid'
  const emoji = '\u{1F4AA}' // flexed bicep
  const description = 'Biggest recovery from lowest budget point'

  // Eligible only if the player actually dipped below the starting budget
  const result = findMaxPlayer(players, (p) => {
    if (p.lowestBudget >= STARTING_BUDGET) return null
    return p.budget - p.lowestBudget
  })
  if (!result) return noWinner(id, name, emoji, description)

  return {
    id, name, emoji, description,
    winnerId: result.player.id,
    winnerName: result.player.name,
    value: result.value,
    valueLabel: `${formatDollars(result.value)} recovery`,
  }
}

function computeMostImproved(players: Player[]): AwardResult {
  const id = 'most-improved'
  const name = 'Most Improved'
  const emoji = '\u{1F4C8}' // chart increasing
  const description = 'Largest improvement from Day 1 to Day 5 average profit per level'

  const result = findMaxPlayer(players, (p) => {
    const day1Results = getLevelResultsForDay(p, 1)
    const day5Results = getLevelResultsForDay(p, 5)

    // Must have played at least 1 level in both Day 1 and Day 5
    if (day1Results.length === 0 || day5Results.length === 0) return null

    const day1Avg = day1Results.reduce((sum, lr) => sum + lr.profit, 0) / day1Results.length
    const day5Avg = day5Results.reduce((sum, lr) => sum + lr.profit, 0) / day5Results.length

    const delta = day5Avg - day1Avg
    // Only consider positive improvement
    return delta > 0 ? delta : null
  })

  if (!result) return noWinner(id, name, emoji, description)

  return {
    id, name, emoji, description,
    winnerId: result.player.id,
    winnerName: result.player.name,
    value: result.value,
    valueLabel: `+${formatDollars(result.value)}/level improvement`,
  }
}

// ============================================================================
// Daily Recognition (4 awards per camp day)
// ============================================================================

/**
 * Compute the 4 daily recognition awards for a specific camp day (1-5).
 *
 * Awards:
 *   1. Top 3 on Leaderboard           -- top 3 by cumulative totalProfit
 *   2. Biggest Daily Mover            -- most profit in the day's 10 levels
 *   3. Most Levels Completed Today    -- most completions in the day's range
 *   4. Best Loan Decision             -- best loan ROI during the day
 *
 * Note: "Top 3 on Leaderboard" returns 3 separate AwardResult entries
 * (1st, 2nd, 3rd), so the total is 6 AwardResult items.
 */
export function computeDailyRecognition(players: Player[], day: number): AwardResult[] {
  if (day < 1 || day > 5) return []

  const { start, end } = getLevelRangeForDay(day)

  return [
    ...computeTop3Leaderboard(players, day),
    computeBiggestDailyMover(players, day),
    computeMostLevelsToday(players, day, start, end),
    computeBestLoanDecision(players, day),
  ]
}

/**
 * Top 3 on the overall leaderboard (by totalProfit, cumulative).
 * Returns up to 3 AwardResult entries.
 */
function computeTop3Leaderboard(players: Player[], day: number): AwardResult[] {
  const sorted = [...players].sort((a, b) => {
    if (b.totalProfit !== a.totalProfit) return b.totalProfit - a.totalProfit
    if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue
    return b.totalCupsSold - a.totalCupsSold
  })

  const medals: Array<{ rank: number; label: string; emoji: string }> = [
    { rank: 1, label: '1st Place', emoji: '\u{1F947}' },
    { rank: 2, label: '2nd Place', emoji: '\u{1F948}' },
    { rank: 3, label: '3rd Place', emoji: '\u{1F949}' },
  ]

  return medals.map(({ rank, label, emoji }) => {
    const id = `day-${day}-leaderboard-${rank}`
    const name = label
    const description = `#${rank} on the leaderboard after Day ${day}`

    const player = sorted[rank - 1]
    if (!player) return noWinner(id, name, emoji, description)

    return {
      id, name, emoji, description,
      winnerId: player.id,
      winnerName: player.name,
      value: player.totalProfit,
      valueLabel: `${formatDollars(player.totalProfit)} total profit`,
    }
  })
}

/**
 * Biggest Daily Mover -- the player who earned the most profit
 * specifically during the given day's 10 levels.
 */
function computeBiggestDailyMover(
  players: Player[],
  day: number,
): AwardResult {
  const id = `day-${day}-biggest-mover`
  const name = 'Biggest Daily Mover'
  const emoji = '\u{1F680}' // rocket
  const description = `Most profit earned during Day ${day} levels`

  const result = findMaxPlayer(players, (p) => {
    const dayResults = getLevelResultsForDay(p, day)
    if (dayResults.length === 0) return null
    return dayResults.reduce((sum, lr) => sum + lr.profit, 0)
  })

  if (!result) return noWinner(id, name, emoji, description)

  return {
    id, name, emoji, description,
    winnerId: result.player.id,
    winnerName: result.player.name,
    value: result.value,
    valueLabel: `${formatDollars(result.value)} today`,
  }
}

/**
 * Most Levels Completed Today -- the player who completed the most levels
 * within the day's range (start..end).
 */
function computeMostLevelsToday(
  players: Player[],
  day: number,
  start: number,
  end: number
): AwardResult {
  const id = `day-${day}-most-levels`
  const name = 'Most Levels Completed Today'
  const emoji = '\u{26A1}' // lightning bolt
  const description = `Most levels completed during Day ${day}`

  const result = findMaxPlayer(players, (p) => {
    const count = p.completedLevels.filter((lv) => lv >= start && lv <= end).length
    return count > 0 ? count : null
  })

  if (!result) return noWinner(id, name, emoji, description)

  return {
    id, name, emoji, description,
    winnerId: result.player.id,
    winnerName: result.player.name,
    value: result.value,
    valueLabel: `${result.value} level${result.value !== 1 ? 's' : ''} completed`,
  }
}

/**
 * Best Loan Decision -- best loan ROI specifically during this day's levels.
 */
function computeBestLoanDecision(players: Player[], day: number): AwardResult {
  const id = `day-${day}-best-loan`
  const name = 'Best Loan Decision'
  const emoji = '\u{1F4B0}' // money bag
  const description = `Best loan ROI during Day ${day}`

  const result = findMaxPlayer(players, (p) => computePlayerDailyLoanROI(p, day))
  if (!result) return noWinner(id, name, emoji, description)

  return {
    id, name, emoji, description,
    winnerId: result.player.id,
    winnerName: result.player.name,
    value: result.value,
    valueLabel: `${formatDollars(result.value)} loan ROI`,
  }
}
