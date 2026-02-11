// ============================================================================
// TEST-004: End-to-End Game Flow Test
// Verifies the complete game lifecycle: room/team creation, 5 rounds per team,
// risk management scoring, final leaderboard, score correctness, and CSV export.
// Reference: spec/01_SCORING_SYSTEM.md, spec/04_DATA_MODEL.md, spec/07_TEST_CASES.md
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the backend module to avoid network dependencies.
vi.mock('@devvai/devv-code-backend', () => ({
  auth: {
    sendOTP: vi.fn(),
    verifyOTP: vi.fn(),
    logout: vi.fn(),
  },
  table: {
    getItems: vi.fn().mockResolvedValue({ items: [] }),
    addItem: vi.fn().mockResolvedValue({}),
    updateItem: vi.fn().mockResolvedValue({}),
  },
}))

// Mock Zustand persist middleware to a pass-through so that tests do not
// depend on a browser-compatible localStorage.
vi.mock('zustand/middleware', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zustand/middleware')>()
  return {
    ...actual,
    persist: (config: any) => config,
  }
})

import { useGameStore } from '@/store/game-store'

import {
  calculateProfitRanks,
  getConsistencyPoints,
  calculateSpoilageRate,
  getEfficiencyPoints,
  clampRiskManagementScore,
  calculateMultiFactorScore,
  generateFinalLeaderboard,
  validateMultiFactorScore,
} from '@/lib/scoring'

import type {
  RiskManagementInput,
  RoundResult,
  MultiFactorScore,
  LeaderboardEntry,
  Team,
} from '@/types'

import { SCORING_MAX } from '@/types'

// ---------------------------------------------------------------------------
// Test Helpers
// ---------------------------------------------------------------------------

/** Creates a minimal RoundResult with sensible defaults. */
const makeRound = (overrides: Partial<RoundResult> = {}): RoundResult => ({
  round: 1,
  scenarioId: 'test-scenario',
  decision: { price: 1.0, quality: 3, marketing: 5 },
  cupsMade: 100,
  cupsSold: 80,
  spoilageRate: 0.2,
  revenue: 80,
  costs: 50,
  profit: 30,
  decisionQuality: {
    priceOptimal: true,
    qualityOptimal: true,
    marketingOptimal: false,
    overallScore: 2,
  },
  timestamp: Date.now(),
  ...overrides,
})

/** Creates a valid RiskManagementInput for a given team. */
const makeRiskInput = (
  teamId: string,
  overrides: Partial<RiskManagementInput> = {},
): RiskManagementInput => ({
  teamId,
  productionAdjustment: 3,
  pricingStrategy: 4,
  budgetReserves: 3,
  total: 10,
  notes: '',
  assessedBy: 'facilitator-test',
  assessedAt: Date.now(),
  ...overrides,
})

/**
 * Seed the store with teams that have round history, bypassing the
 * addTeam action (which requires auth + game room). Directly sets
 * state for deterministic testing.
 */
const seedTeams = (
  teams: Array<{
    id: string
    name: string
    profit: number
    roundHistory: RoundResult[]
    totalCupsMade?: number
    cupsSold?: number
    revenue?: number
    profitableRounds?: number
  }>,
) => {
  useGameStore.setState({
    teams: teams.map((t, i) => ({
      id: t.id,
      name: t.name,
      color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'][i % 4],
      profit: t.profit,
      revenue: t.revenue ?? t.roundHistory.reduce((sum, r) => sum + r.revenue, 0),
      cupsSold: t.cupsSold ?? t.roundHistory.reduce((sum, r) => sum + r.cupsSold, 0),
      gamesPlayed: t.roundHistory.length,
      lastResult: null,
      timestamp: 1000 + i,
      currentBudget: 100 + t.profit,
      day: t.roundHistory.length + 1,
      roundHistory: t.roundHistory,
      totalCupsMade: t.totalCupsMade ?? t.roundHistory.reduce((sum, r) => sum + r.cupsMade, 0),
      profitableRounds: t.profitableRounds ?? t.roundHistory.filter(r => r.profit > 0).length,
      riskManagementScore: 0,
      multiFactorScore: null,
    })),
    riskManagementScores: new Map(),
    finalScores: new Map(),
  })
}

/**
 * Manually calculate the expected multi-factor score for a team using the
 * same algorithms as the scoring library, allowing us to compare against
 * the store's computed values.
 */
const manuallyCalculateScore = (
  team: { roundHistory: RoundResult[]; profit: number },
  profitRank: number,
  riskScore: number,
): { profitRanking: number; consistency: number; efficiency: number; riskManagement: number; total: number } => {
  // Profit ranking from lookup table
  const profitRankPoints = [
    { maxRank: 1, points: 50 },
    { maxRank: 2, points: 45 },
    { maxRank: 3, points: 40 },
    { maxRank: 4, points: 35 },
    { maxRank: 5, points: 30 },
  ]
  let profitRanking = 10 // floor
  for (const entry of profitRankPoints) {
    if (profitRank <= entry.maxRank) {
      profitRanking = entry.points
      break
    }
  }

  // Consistency: 4 points per profitable round, capped at 20
  const profitableCount = team.roundHistory.filter(r => r.profit > 0).length
  const consistency = Math.min(profitableCount * 4, 20)

  // Efficiency: based on spoilage rate
  const totalMade = team.roundHistory.reduce((s, r) => s + r.cupsMade, 0)
  const totalSold = team.roundHistory.reduce((s, r) => s + r.cupsSold, 0)
  const spoilageRate = totalMade > 0 ? (totalMade - totalSold) / totalMade : 0

  const efficiencyThresholds = [
    { maxRate: 0.10, points: 15 },
    { maxRate: 0.20, points: 12 },
    { maxRate: 0.30, points: 9 },
    { maxRate: 0.40, points: 6 },
    { maxRate: 0.50, points: 3 },
  ]
  let efficiency = 0
  for (const t of efficiencyThresholds) {
    if (spoilageRate <= t.maxRate) {
      efficiency = t.points
      break
    }
  }

  // Risk management: clamped to 0-15
  const riskManagement = Math.min(Math.max(riskScore, 0), 15)

  return {
    profitRanking,
    consistency,
    efficiency,
    riskManagement,
    total: profitRanking + consistency + efficiency + riskManagement,
  }
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  useGameStore.setState({
    teams: [],
    riskManagementScores: new Map(),
    finalScores: new Map(),
  })
})

// ============================================================================
// TEST-004: End-to-End Game Flow
// ============================================================================

describe('TEST-004: End-to-End Game Flow', () => {
  // -------------------------------------------------------------------------
  // 4.1 — Create room and teams, play 5 rounds per team
  // -------------------------------------------------------------------------

  describe('Step 1 & 2: Create teams and play 5 rounds per team', () => {
    it('seeds 4 teams with 5 rounds each and accumulates correct stats', () => {
      // Simulate 4 teams, each playing 5 rounds with distinct performance profiles
      const teamAlpha = {
        id: 'alpha',
        name: 'Alpha Lemonade',
        profit: 0,
        roundHistory: [] as RoundResult[],
      }
      const teamBeta = {
        id: 'beta',
        name: 'Beta Brewers',
        profit: 0,
        roundHistory: [] as RoundResult[],
      }
      const teamGamma = {
        id: 'gamma',
        name: 'Gamma Squeeze',
        profit: 0,
        roundHistory: [] as RoundResult[],
      }
      const teamDelta = {
        id: 'delta',
        name: 'Delta Force',
        profit: 0,
        roundHistory: [] as RoundResult[],
      }

      // Alpha: Consistently profitable, efficient (low spoilage)
      const alphaRounds: RoundResult[] = [
        makeRound({ round: 1, profit: 45, cupsMade: 60, cupsSold: 58, revenue: 58, costs: 13 }),
        makeRound({ round: 2, profit: 40, cupsMade: 55, cupsSold: 52, revenue: 52, costs: 12 }),
        makeRound({ round: 3, profit: 35, cupsMade: 50, cupsSold: 48, revenue: 48, costs: 13 }),
        makeRound({ round: 4, profit: 50, cupsMade: 65, cupsSold: 63, revenue: 63, costs: 13 }),
        makeRound({ round: 5, profit: 30, cupsMade: 45, cupsSold: 43, revenue: 43, costs: 13 }),
      ]
      teamAlpha.roundHistory = alphaRounds
      teamAlpha.profit = alphaRounds.reduce((s, r) => s + r.profit, 0) // 200

      // Beta: Mixed results, moderate efficiency
      const betaRounds: RoundResult[] = [
        makeRound({ round: 1, profit: 25, cupsMade: 80, cupsSold: 60, revenue: 60, costs: 35 }),
        makeRound({ round: 2, profit: -10, cupsMade: 70, cupsSold: 40, revenue: 40, costs: 50 }),
        makeRound({ round: 3, profit: 35, cupsMade: 80, cupsSold: 65, revenue: 65, costs: 30 }),
        makeRound({ round: 4, profit: 20, cupsMade: 75, cupsSold: 55, revenue: 55, costs: 35 }),
        makeRound({ round: 5, profit: 30, cupsMade: 70, cupsSold: 60, revenue: 60, costs: 30 }),
      ]
      teamBeta.roundHistory = betaRounds
      teamBeta.profit = betaRounds.reduce((s, r) => s + r.profit, 0) // 100

      // Gamma: High profit but terrible efficiency (high spoilage)
      const gammaRounds: RoundResult[] = [
        makeRound({ round: 1, profit: 60, cupsMade: 150, cupsSold: 50, revenue: 100, costs: 40 }),
        makeRound({ round: 2, profit: 55, cupsMade: 140, cupsSold: 45, revenue: 90, costs: 35 }),
        makeRound({ round: 3, profit: 50, cupsMade: 130, cupsSold: 40, revenue: 80, costs: 30 }),
        makeRound({ round: 4, profit: -20, cupsMade: 120, cupsSold: 20, revenue: 40, costs: 60 }),
        makeRound({ round: 5, profit: 55, cupsMade: 150, cupsSold: 55, revenue: 110, costs: 55 }),
      ]
      teamGamma.roundHistory = gammaRounds
      teamGamma.profit = gammaRounds.reduce((s, r) => s + r.profit, 0) // 200

      // Delta: Low profit, inconsistent
      const deltaRounds: RoundResult[] = [
        makeRound({ round: 1, profit: 10, cupsMade: 40, cupsSold: 35, revenue: 35, costs: 25 }),
        makeRound({ round: 2, profit: -15, cupsMade: 50, cupsSold: 20, revenue: 20, costs: 35 }),
        makeRound({ round: 3, profit: -5, cupsMade: 45, cupsSold: 25, revenue: 25, costs: 30 }),
        makeRound({ round: 4, profit: 20, cupsMade: 40, cupsSold: 38, revenue: 38, costs: 18 }),
        makeRound({ round: 5, profit: 5, cupsMade: 35, cupsSold: 30, revenue: 30, costs: 25 }),
      ]
      teamDelta.roundHistory = deltaRounds
      teamDelta.profit = deltaRounds.reduce((s, r) => s + r.profit, 0) // 15

      seedTeams([teamAlpha, teamBeta, teamGamma, teamDelta])

      const { teams } = useGameStore.getState()

      // Verify all 4 teams exist
      expect(teams).toHaveLength(4)

      // Verify each team has 5 rounds
      for (const team of teams) {
        expect(team.roundHistory).toHaveLength(5)
        expect(team.gamesPlayed).toBe(5)
      }

      // Verify accumulated profits
      expect(teams.find(t => t.id === 'alpha')!.profit).toBe(200)
      expect(teams.find(t => t.id === 'beta')!.profit).toBe(100)
      expect(teams.find(t => t.id === 'gamma')!.profit).toBe(200)
      expect(teams.find(t => t.id === 'delta')!.profit).toBe(15)

      // Verify totalCupsMade computed from rounds
      const alpha = teams.find(t => t.id === 'alpha')!
      expect(alpha.totalCupsMade).toBe(60 + 55 + 50 + 65 + 45) // 275
      expect(alpha.cupsSold).toBe(58 + 52 + 48 + 63 + 43) // 264

      // Verify profitableRounds count
      expect(alpha.profitableRounds).toBe(5) // all profitable
      expect(teams.find(t => t.id === 'beta')!.profitableRounds).toBe(4) // 1 loss
      expect(teams.find(t => t.id === 'gamma')!.profitableRounds).toBe(4) // 1 loss
      expect(teams.find(t => t.id === 'delta')!.profitableRounds).toBe(3) // 2 losses
    })
  })

  // -------------------------------------------------------------------------
  // 4.2 — Enter risk management scores
  // -------------------------------------------------------------------------

  describe('Step 3: Enter risk management scores', () => {
    it('stores facilitator risk management scores for all teams', () => {
      seedTeams([
        { id: 'alpha', name: 'Alpha', profit: 200, roundHistory: Array.from({ length: 5 }, (_, i) => makeRound({ round: i + 1, profit: 40 })) },
        { id: 'beta', name: 'Beta', profit: 100, roundHistory: Array.from({ length: 5 }, (_, i) => makeRound({ round: i + 1, profit: 20 })) },
        { id: 'gamma', name: 'Gamma', profit: 200, roundHistory: Array.from({ length: 5 }, (_, i) => makeRound({ round: i + 1, profit: 40 })) },
        { id: 'delta', name: 'Delta', profit: 15, roundHistory: Array.from({ length: 5 }, (_, i) => makeRound({ round: i + 1, profit: 3 })) },
      ])

      const { setRiskManagementScore } = useGameStore.getState()

      setRiskManagementScore('alpha', makeRiskInput('alpha', {
        productionAdjustment: 4, pricingStrategy: 5, budgetReserves: 4, total: 13,
      }))
      setRiskManagementScore('beta', makeRiskInput('beta', {
        productionAdjustment: 3, pricingStrategy: 3, budgetReserves: 2, total: 8,
      }))
      setRiskManagementScore('gamma', makeRiskInput('gamma', {
        productionAdjustment: 2, pricingStrategy: 2, budgetReserves: 1, total: 5,
      }))
      setRiskManagementScore('delta', makeRiskInput('delta', {
        productionAdjustment: 4, pricingStrategy: 4, budgetReserves: 3, total: 11,
      }))

      const scores = useGameStore.getState().riskManagementScores
      expect(scores.size).toBe(4)
      expect(scores.get('alpha')!.total).toBe(13)
      expect(scores.get('beta')!.total).toBe(8)
      expect(scores.get('gamma')!.total).toBe(5)
      expect(scores.get('delta')!.total).toBe(11)

      // Verify sub-scores are preserved
      const alphaRisk = scores.get('alpha')!
      expect(alphaRisk.productionAdjustment).toBe(4)
      expect(alphaRisk.pricingStrategy).toBe(5)
      expect(alphaRisk.budgetReserves).toBe(4)
    })
  })

  // -------------------------------------------------------------------------
  // 4.3 — Full game flow: scores match manual calculations
  // -------------------------------------------------------------------------

  describe('Step 4 & 5: View final leaderboard and verify scores', () => {
    it('complete flow produces correct scores matching manual calculations', () => {
      // --- Step 1: Seed teams with detailed round-by-round data ---

      // Alpha: Consistently profitable, excellent efficiency
      const alphaRounds: RoundResult[] = [
        makeRound({ round: 1, profit: 45, cupsMade: 60, cupsSold: 58 }),
        makeRound({ round: 2, profit: 40, cupsMade: 55, cupsSold: 52 }),
        makeRound({ round: 3, profit: 35, cupsMade: 50, cupsSold: 48 }),
        makeRound({ round: 4, profit: 50, cupsMade: 65, cupsSold: 63 }),
        makeRound({ round: 5, profit: 30, cupsMade: 45, cupsSold: 43 }),
      ]

      // Beta: 4 profitable rounds, moderate efficiency
      const betaRounds: RoundResult[] = [
        makeRound({ round: 1, profit: 25, cupsMade: 80, cupsSold: 60 }),
        makeRound({ round: 2, profit: -10, cupsMade: 70, cupsSold: 40 }),
        makeRound({ round: 3, profit: 35, cupsMade: 80, cupsSold: 65 }),
        makeRound({ round: 4, profit: 20, cupsMade: 75, cupsSold: 55 }),
        makeRound({ round: 5, profit: 30, cupsMade: 70, cupsSold: 60 }),
      ]

      // Gamma: High profit but terrible spoilage
      const gammaRounds: RoundResult[] = [
        makeRound({ round: 1, profit: 60, cupsMade: 150, cupsSold: 50 }),
        makeRound({ round: 2, profit: 55, cupsMade: 140, cupsSold: 45 }),
        makeRound({ round: 3, profit: 50, cupsMade: 130, cupsSold: 40 }),
        makeRound({ round: 4, profit: -20, cupsMade: 120, cupsSold: 20 }),
        makeRound({ round: 5, profit: 55, cupsMade: 150, cupsSold: 55 }),
      ]

      // Delta: Low profit, inconsistent, decent efficiency
      const deltaRounds: RoundResult[] = [
        makeRound({ round: 1, profit: 10, cupsMade: 40, cupsSold: 35 }),
        makeRound({ round: 2, profit: -15, cupsMade: 50, cupsSold: 20 }),
        makeRound({ round: 3, profit: -5, cupsMade: 45, cupsSold: 25 }),
        makeRound({ round: 4, profit: 20, cupsMade: 40, cupsSold: 38 }),
        makeRound({ round: 5, profit: 5, cupsMade: 35, cupsSold: 30 }),
      ]

      seedTeams([
        { id: 'alpha', name: 'Alpha Lemonade', profit: 200, roundHistory: alphaRounds },
        { id: 'beta', name: 'Beta Brewers', profit: 100, roundHistory: betaRounds },
        { id: 'gamma', name: 'Gamma Squeeze', profit: 200, roundHistory: gammaRounds },
        { id: 'delta', name: 'Delta Force', profit: 15, roundHistory: deltaRounds },
      ])

      // --- Step 2: Facilitator enters risk management scores ---
      const { setRiskManagementScore } = useGameStore.getState()
      setRiskManagementScore('alpha', makeRiskInput('alpha', { total: 13 }))
      setRiskManagementScore('beta', makeRiskInput('beta', { total: 8 }))
      setRiskManagementScore('gamma', makeRiskInput('gamma', { total: 5 }))
      setRiskManagementScore('delta', makeRiskInput('delta', { total: 11 }))

      // --- Step 3: Calculate multi-factor scores ---
      useGameStore.getState().calculateMultiFactorScores()

      // --- Step 4: Generate final leaderboard ---
      const leaderboard = useGameStore.getState().getFinalLeaderboard()

      // Verify basic structure
      expect(leaderboard).toHaveLength(4)
      expect(leaderboard[0].rank).toBe(1)
      expect(leaderboard[1].rank).toBe(2)
      expect(leaderboard[2].rank).toBe(3)
      expect(leaderboard[3].rank).toBe(4)

      // --- Step 5: Verify scores match manual calculations ---

      // Manual profit ranking: Alpha and Gamma tied at 200
      // Tiebreaker rule 1: highest single-round profit
      //   Alpha max = 50, Gamma max = 60 -> Gamma ranks higher
      // So: Gamma=1st(50pts), Alpha=2nd(45pts), Beta=3rd(40pts), Delta=4th(35pts)

      // Alpha: 5 profitable rounds -> consistency = min(5*4, 20) = 20
      // Alpha spoilage: (275-264)/275 = 11/275 ≈ 0.04 -> 15 efficiency
      // Alpha risk: 13
      // Alpha total: 45 + 20 + 15 + 13 = 93

      // Beta: 4 profitable rounds -> consistency = min(4*4, 20) = 16
      // Beta spoilage: (375-280)/375 = 95/375 ≈ 0.2533 -> 9 efficiency (21-30%)
      // Beta risk: 8
      // Beta total: 40 + 16 + 9 + 8 = 73

      // Gamma: 4 profitable rounds -> consistency = min(4*4, 20) = 16
      // Gamma spoilage: (690-210)/690 = 480/690 ≈ 0.6957 -> 0 efficiency (>50%)
      // Gamma risk: 5
      // Gamma total: 50 + 16 + 0 + 5 = 71

      // Delta: 3 profitable rounds -> consistency = min(3*4, 20) = 12
      // Delta spoilage: (210-148)/210 = 62/210 ≈ 0.2952 -> 9 efficiency (21-30%)
      // Delta risk: 11
      // Delta total: 35 + 12 + 9 + 11 = 67

      // Expected leaderboard order by total score: Alpha(93) > Beta(73) > Gamma(71) > Delta(67)

      // Find each team's entry
      const alphaEntry = leaderboard.find(e => e.team.id === 'alpha')!
      const betaEntry = leaderboard.find(e => e.team.id === 'beta')!
      const gammaEntry = leaderboard.find(e => e.team.id === 'gamma')!
      const deltaEntry = leaderboard.find(e => e.team.id === 'delta')!

      // Verify descending order
      for (let i = 0; i < leaderboard.length - 1; i++) {
        expect(leaderboard[i].multiFactorScore.total).toBeGreaterThanOrEqual(
          leaderboard[i + 1].multiFactorScore.total,
        )
      }

      // Alpha should be first (best total score despite 2nd in profit)
      expect(leaderboard[0].team.id).toBe('alpha')
      expect(alphaEntry.rank).toBe(1)

      // Verify Alpha's individual component scores
      expect(alphaEntry.multiFactorScore.profitRanking).toBe(45) // 2nd in profit
      expect(alphaEntry.multiFactorScore.consistency).toBe(20)   // 5/5 profitable
      expect(alphaEntry.multiFactorScore.efficiency).toBe(15)    // ~4% spoilage
      expect(alphaEntry.multiFactorScore.riskManagement).toBe(13)
      expect(alphaEntry.multiFactorScore.total).toBe(93)

      // Verify Beta's individual component scores
      expect(betaEntry.multiFactorScore.profitRanking).toBe(40) // 3rd in profit
      expect(betaEntry.multiFactorScore.consistency).toBe(16)   // 4/5 profitable
      expect(betaEntry.multiFactorScore.efficiency).toBe(9)     // ~25% spoilage
      expect(betaEntry.multiFactorScore.riskManagement).toBe(8)
      expect(betaEntry.multiFactorScore.total).toBe(73)

      // Verify Gamma: high profit but terrible efficiency pulls total down
      expect(gammaEntry.multiFactorScore.profitRanking).toBe(50) // 1st in profit
      expect(gammaEntry.multiFactorScore.consistency).toBe(16)   // 4/5 profitable
      expect(gammaEntry.multiFactorScore.efficiency).toBe(0)     // ~70% spoilage
      expect(gammaEntry.multiFactorScore.riskManagement).toBe(5)
      expect(gammaEntry.multiFactorScore.total).toBe(71)

      // Verify Delta's individual component scores
      expect(deltaEntry.multiFactorScore.profitRanking).toBe(35) // 4th in profit
      expect(deltaEntry.multiFactorScore.consistency).toBe(12)   // 3/5 profitable
      expect(deltaEntry.multiFactorScore.efficiency).toBe(9)     // ~30% spoilage
      expect(deltaEntry.multiFactorScore.riskManagement).toBe(11)
      expect(deltaEntry.multiFactorScore.total).toBe(67)

      // Verify total always equals sum of components for every entry
      for (const entry of leaderboard) {
        const s = entry.multiFactorScore
        expect(s.total).toBe(
          s.profitRanking + s.consistency + s.efficiency + s.riskManagement,
        )
      }

      // Verify all scores are within valid bounds
      for (const entry of leaderboard) {
        const s = entry.multiFactorScore
        expect(s.profitRanking).toBeGreaterThanOrEqual(0)
        expect(s.profitRanking).toBeLessThanOrEqual(SCORING_MAX.PROFIT_RANKING)
        expect(s.consistency).toBeGreaterThanOrEqual(0)
        expect(s.consistency).toBeLessThanOrEqual(SCORING_MAX.CONSISTENCY)
        expect(s.efficiency).toBeGreaterThanOrEqual(0)
        expect(s.efficiency).toBeLessThanOrEqual(SCORING_MAX.EFFICIENCY)
        expect(s.riskManagement).toBeGreaterThanOrEqual(0)
        expect(s.riskManagement).toBeLessThanOrEqual(SCORING_MAX.RISK_MANAGEMENT)
        expect(s.total).toBeGreaterThanOrEqual(0)
        expect(s.total).toBeLessThanOrEqual(SCORING_MAX.TOTAL)
      }

      // Verify each score passes the library's own validation
      for (const entry of leaderboard) {
        expect(validateMultiFactorScore(entry.multiFactorScore)).toBe(true)
      }
    })

    it('scores match independent manual calculations using raw formulas', () => {
      // Use a simpler 3-team scenario to verify with completely manual math
      const teamA = {
        id: 'team-a',
        name: 'Aces',
        profit: 150,
        roundHistory: [
          makeRound({ round: 1, profit: 30, cupsMade: 50, cupsSold: 45 }),
          makeRound({ round: 2, profit: 35, cupsMade: 55, cupsSold: 50 }),
          makeRound({ round: 3, profit: 40, cupsMade: 60, cupsSold: 52 }),
          makeRound({ round: 4, profit: 25, cupsMade: 45, cupsSold: 40 }),
          makeRound({ round: 5, profit: 20, cupsMade: 40, cupsSold: 38 }),
        ],
      }

      const teamB = {
        id: 'team-b',
        name: 'Bees',
        profit: 80,
        roundHistory: [
          makeRound({ round: 1, profit: 20, cupsMade: 60, cupsSold: 50 }),
          makeRound({ round: 2, profit: -5, cupsMade: 50, cupsSold: 30 }),
          makeRound({ round: 3, profit: 25, cupsMade: 55, cupsSold: 45 }),
          makeRound({ round: 4, profit: 30, cupsMade: 60, cupsSold: 55 }),
          makeRound({ round: 5, profit: 10, cupsMade: 45, cupsSold: 40 }),
        ],
      }

      const teamC = {
        id: 'team-c',
        name: 'Cats',
        profit: 50,
        roundHistory: [
          makeRound({ round: 1, profit: 15, cupsMade: 70, cupsSold: 30 }),
          makeRound({ round: 2, profit: -20, cupsMade: 80, cupsSold: 25 }),
          makeRound({ round: 3, profit: 10, cupsMade: 65, cupsSold: 35 }),
          makeRound({ round: 4, profit: 25, cupsMade: 60, cupsSold: 40 }),
          makeRound({ round: 5, profit: 20, cupsMade: 55, cupsSold: 45 }),
        ],
      }

      seedTeams([teamA, teamB, teamC])

      const riskScores = { 'team-a': 12, 'team-b': 9, 'team-c': 6 }

      const { setRiskManagementScore } = useGameStore.getState()
      setRiskManagementScore('team-a', makeRiskInput('team-a', { total: riskScores['team-a'] }))
      setRiskManagementScore('team-b', makeRiskInput('team-b', { total: riskScores['team-b'] }))
      setRiskManagementScore('team-c', makeRiskInput('team-c', { total: riskScores['team-c'] }))

      // Profit ranking: A=150 (1st=50), B=80 (2nd=45), C=50 (3rd=40)
      const expectedA = manuallyCalculateScore(teamA, 1, riskScores['team-a'])
      const expectedB = manuallyCalculateScore(teamB, 2, riskScores['team-b'])
      const expectedC = manuallyCalculateScore(teamC, 3, riskScores['team-c'])

      // Generate leaderboard
      const leaderboard = useGameStore.getState().getFinalLeaderboard()

      const entryA = leaderboard.find(e => e.team.id === 'team-a')!
      const entryB = leaderboard.find(e => e.team.id === 'team-b')!
      const entryC = leaderboard.find(e => e.team.id === 'team-c')!

      // Verify each team's scores match manual calculation
      expect(entryA.multiFactorScore.profitRanking).toBe(expectedA.profitRanking)
      expect(entryA.multiFactorScore.consistency).toBe(expectedA.consistency)
      expect(entryA.multiFactorScore.efficiency).toBe(expectedA.efficiency)
      expect(entryA.multiFactorScore.riskManagement).toBe(expectedA.riskManagement)
      expect(entryA.multiFactorScore.total).toBe(expectedA.total)

      expect(entryB.multiFactorScore.profitRanking).toBe(expectedB.profitRanking)
      expect(entryB.multiFactorScore.consistency).toBe(expectedB.consistency)
      expect(entryB.multiFactorScore.efficiency).toBe(expectedB.efficiency)
      expect(entryB.multiFactorScore.riskManagement).toBe(expectedB.riskManagement)
      expect(entryB.multiFactorScore.total).toBe(expectedB.total)

      expect(entryC.multiFactorScore.profitRanking).toBe(expectedC.profitRanking)
      expect(entryC.multiFactorScore.consistency).toBe(expectedC.consistency)
      expect(entryC.multiFactorScore.efficiency).toBe(expectedC.efficiency)
      expect(entryC.multiFactorScore.riskManagement).toBe(expectedC.riskManagement)
      expect(entryC.multiFactorScore.total).toBe(expectedC.total)
    })
  })

  // -------------------------------------------------------------------------
  // 4.4 — Category awards in the leaderboard
  // -------------------------------------------------------------------------

  describe('Step 4b: Category awards are assigned correctly', () => {
    it('assigns profit, consistency, and efficiency awards to correct teams', () => {
      seedTeams([
        {
          id: 'profit-king',
          name: 'Profit King',
          profit: 300,
          roundHistory: [
            makeRound({ round: 1, profit: 150, cupsMade: 200, cupsSold: 60 }),
            makeRound({ round: 2, profit: 150, cupsMade: 200, cupsSold: 60 }),
          ],
          profitableRounds: 2,
          totalCupsMade: 400,
          cupsSold: 120,
        },
        {
          id: 'consistent',
          name: 'Consistent Crew',
          profit: 100,
          roundHistory: Array.from({ length: 5 }, (_, i) =>
            makeRound({ round: i + 1, profit: 20, cupsMade: 50, cupsSold: 40 }),
          ),
          profitableRounds: 5,
          totalCupsMade: 250,
          cupsSold: 200,
        },
        {
          id: 'efficient',
          name: 'Efficient Engine',
          profit: 80,
          roundHistory: Array.from({ length: 5 }, (_, i) =>
            makeRound({ round: i + 1, profit: 16, cupsMade: 40, cupsSold: 39 }),
          ),
          profitableRounds: 5,
          totalCupsMade: 200,
          cupsSold: 195,
        },
      ])

      const leaderboard = useGameStore.getState().getFinalLeaderboard()

      // Collect all awards across all entries
      const allAwards = leaderboard.flatMap(e => e.awards)

      // Profit award should go to Profit King (highest profit = 300)
      const profitAward = allAwards.find(a => a.category === 'profit')!
      expect(profitAward.teamId).toBe('profit-king')

      // Consistency award should go to a team with 5 profitable rounds
      const consistencyAward = allAwards.find(a => a.category === 'consistency')!
      expect(['consistent', 'efficient']).toContain(consistencyAward.teamId)

      // Efficiency award: Efficient Engine has 2.5% spoilage vs Consistent Crew 20%
      const efficiencyAward = allAwards.find(a => a.category === 'efficiency')!
      expect(efficiencyAward.teamId).toBe('efficient')
    })
  })

  // -------------------------------------------------------------------------
  // 4.5 — Export results (CSV data generation)
  // -------------------------------------------------------------------------

  describe('Step 6: Export results', () => {
    it('leaderboard entries contain all data needed for CSV export', () => {
      seedTeams([
        {
          id: 'team-a',
          name: 'Alpha',
          profit: 200,
          roundHistory: Array.from({ length: 5 }, (_, i) =>
            makeRound({ round: i + 1, profit: 40, cupsMade: 50, cupsSold: 48 }),
          ),
          profitableRounds: 5,
          totalCupsMade: 250,
          cupsSold: 240,
        },
        {
          id: 'team-b',
          name: 'Beta',
          profit: 100,
          roundHistory: Array.from({ length: 5 }, (_, i) =>
            makeRound({ round: i + 1, profit: 20, cupsMade: 60, cupsSold: 45 }),
          ),
          profitableRounds: 5,
          totalCupsMade: 300,
          cupsSold: 225,
        },
      ])

      useGameStore.getState().setRiskManagementScore(
        'team-a', makeRiskInput('team-a', { total: 14 }),
      )
      useGameStore.getState().setRiskManagementScore(
        'team-b', makeRiskInput('team-b', { total: 7 }),
      )

      const leaderboard = useGameStore.getState().getFinalLeaderboard()

      // Verify every entry has the fields required for CSV export
      for (const entry of leaderboard) {
        // Rank
        expect(typeof entry.rank).toBe('number')
        expect(entry.rank).toBeGreaterThan(0)

        // Team name
        expect(typeof entry.team.name).toBe('string')
        expect(entry.team.name.length).toBeGreaterThan(0)

        // Total score
        expect(typeof entry.multiFactorScore.total).toBe('number')

        // Profit rank points and rank position
        expect(typeof entry.multiFactorScore.profitRanking).toBe('number')
        expect(typeof entry.multiFactorScore.profitRank).toBe('number')

        // Total profit
        expect(typeof entry.team.profit).toBe('number')

        // Consistency points and profitable rounds
        expect(typeof entry.multiFactorScore.consistency).toBe('number')
        expect(typeof entry.multiFactorScore.profitableRounds).toBe('number')

        // Efficiency points and spoilage rate
        expect(typeof entry.multiFactorScore.efficiency).toBe('number')
        expect(typeof entry.multiFactorScore.spoilageRate).toBe('number')

        // Risk management points
        expect(typeof entry.multiFactorScore.riskManagement).toBe('number')

        // Awards array
        expect(Array.isArray(entry.awards)).toBe(true)

        // isTied flag
        expect(typeof entry.isTied).toBe('boolean')
      }
    })

    it('export data includes all teams and scoring details', () => {
      seedTeams([
        {
          id: 'team-a',
          name: 'Alpha Team',
          profit: 180,
          roundHistory: Array.from({ length: 5 }, (_, i) =>
            makeRound({ round: i + 1, profit: 36, cupsMade: 50, cupsSold: 47 }),
          ),
          profitableRounds: 5,
          totalCupsMade: 250,
          cupsSold: 235,
        },
        {
          id: 'team-b',
          name: 'Beta Squad',
          profit: 90,
          roundHistory: [
            makeRound({ round: 1, profit: 30, cupsMade: 60, cupsSold: 50 }),
            makeRound({ round: 2, profit: -10, cupsMade: 55, cupsSold: 30 }),
            makeRound({ round: 3, profit: 25, cupsMade: 50, cupsSold: 40 }),
            makeRound({ round: 4, profit: 20, cupsMade: 55, cupsSold: 45 }),
            makeRound({ round: 5, profit: 25, cupsMade: 50, cupsSold: 42 }),
          ],
          profitableRounds: 4,
          totalCupsMade: 270,
          cupsSold: 207,
        },
      ])

      useGameStore.getState().setRiskManagementScore(
        'team-a', makeRiskInput('team-a', { total: 12 }),
      )
      useGameStore.getState().setRiskManagementScore(
        'team-b', makeRiskInput('team-b', { total: 9 }),
      )

      const leaderboard = useGameStore.getState().getFinalLeaderboard()

      // Simulate CSV row generation (same logic as exportLeaderboardToCsv)
      const csvRows: string[][] = []
      for (const entry of leaderboard) {
        const score = entry.multiFactorScore
        const totalRounds = entry.team.gamesPlayed || entry.team.roundHistory.length
        const awardsLabel = entry.awards
          .map(a =>
            a.category === 'profit' ? 'Best Profit'
              : a.category === 'consistency' ? 'Most Consistent'
              : 'Most Efficient',
          )
          .join('; ')

        csvRows.push([
          String(entry.rank),
          entry.team.name,
          String(score.total),
          String(score.profitRanking),
          String(score.profitRank),
          `$${entry.team.profit.toFixed(2)}`,
          String(score.consistency),
          `${score.profitableRounds}/${totalRounds}`,
          String(score.efficiency),
          `${Math.round(score.spoilageRate * 100)}%`,
          String(score.riskManagement),
          awardsLabel,
        ])
      }

      // Verify we have rows for all teams
      expect(csvRows).toHaveLength(2)

      // Verify the first-ranked team's row has valid data in all columns
      const firstRow = csvRows[0]
      expect(firstRow[0]).toBe('1')                    // Rank
      expect(firstRow[1].length).toBeGreaterThan(0)    // Team name
      expect(Number(firstRow[2])).toBeGreaterThan(0)   // Total score
      expect(Number(firstRow[3])).toBeGreaterThan(0)   // Profit rank points
      expect(Number(firstRow[4])).toBeGreaterThan(0)   // Profit rank position
      expect(firstRow[5]).toMatch(/^\$\d+\.\d{2}$/)    // Total profit format
      expect(Number(firstRow[6])).toBeGreaterThanOrEqual(0)  // Consistency
      expect(firstRow[7]).toMatch(/^\d+\/\d+$/)        // Profitable rounds format
      expect(Number(firstRow[8])).toBeGreaterThanOrEqual(0)  // Efficiency
      expect(firstRow[9]).toMatch(/^\d+%$/)            // Spoilage rate format
      expect(Number(firstRow[10])).toBeGreaterThanOrEqual(0) // Risk management

      // Verify all teams are included
      const teamNames = csvRows.map(r => r[1])
      expect(teamNames).toContain('Alpha Team')
      expect(teamNames).toContain('Beta Squad')
    })
  })

  // -------------------------------------------------------------------------
  // 4.6 — No errors during flow
  // -------------------------------------------------------------------------

  describe('No errors during complete flow', () => {
    it('runs the entire game flow without throwing', () => {
      expect(() => {
        // Step 1: Create teams with 5 rounds
        seedTeams([
          {
            id: 'a',
            name: 'Team A',
            profit: 150,
            roundHistory: Array.from({ length: 5 }, (_, i) =>
              makeRound({ round: i + 1, profit: 30, cupsMade: 50, cupsSold: 45 }),
            ),
          },
          {
            id: 'b',
            name: 'Team B',
            profit: 75,
            roundHistory: Array.from({ length: 5 }, (_, i) =>
              makeRound({ round: i + 1, profit: 15, cupsMade: 60, cupsSold: 40 }),
            ),
          },
          {
            id: 'c',
            name: 'Team C',
            profit: -20,
            roundHistory: Array.from({ length: 5 }, (_, i) =>
              makeRound({ round: i + 1, profit: -4, cupsMade: 70, cupsSold: 30 }),
            ),
          },
        ])

        // Step 2: Set risk scores
        const { setRiskManagementScore } = useGameStore.getState()
        setRiskManagementScore('a', makeRiskInput('a', { total: 10 }))
        setRiskManagementScore('b', makeRiskInput('b', { total: 7 }))
        setRiskManagementScore('c', makeRiskInput('c', { total: 3 }))

        // Step 3: Calculate scores
        useGameStore.getState().calculateMultiFactorScores()

        // Step 4: Get leaderboard
        const leaderboard = useGameStore.getState().getFinalLeaderboard()

        // Step 5: Validate all entries
        for (const entry of leaderboard) {
          validateMultiFactorScore(entry.multiFactorScore)
        }

        // Step 6: Simulate export data generation
        for (const entry of leaderboard) {
          const score = entry.multiFactorScore
          const _row = [
            String(entry.rank),
            entry.team.name,
            String(score.total),
            String(score.profitRanking),
            String(score.profitRank),
            `$${entry.team.profit.toFixed(2)}`,
            String(score.consistency),
            `${score.profitableRounds}/${entry.team.roundHistory.length}`,
            String(score.efficiency),
            `${Math.round(score.spoilageRate * 100)}%`,
            String(score.riskManagement),
          ]
        }
      }).not.toThrow()
    })

    it('handles a team with all losses gracefully', () => {
      seedTeams([
        {
          id: 'winner',
          name: 'Winners',
          profit: 200,
          roundHistory: Array.from({ length: 5 }, (_, i) =>
            makeRound({ round: i + 1, profit: 40, cupsMade: 50, cupsSold: 48 }),
          ),
        },
        {
          id: 'loser',
          name: 'Strugglers',
          profit: -50,
          roundHistory: Array.from({ length: 5 }, (_, i) =>
            makeRound({ round: i + 1, profit: -10, cupsMade: 100, cupsSold: 10 }),
          ),
        },
      ])

      useGameStore.getState().setRiskManagementScore('winner', makeRiskInput('winner', { total: 12 }))
      useGameStore.getState().setRiskManagementScore('loser', makeRiskInput('loser', { total: 2 }))

      useGameStore.getState().calculateMultiFactorScores()
      const leaderboard = useGameStore.getState().getFinalLeaderboard()

      expect(leaderboard).toHaveLength(2)

      // Loser should have 0 consistency (no profitable rounds)
      const loserEntry = leaderboard.find(e => e.team.id === 'loser')!
      expect(loserEntry.multiFactorScore.consistency).toBe(0)

      // Loser should have 0 efficiency (90% spoilage)
      expect(loserEntry.multiFactorScore.efficiency).toBe(0)

      // Score should still be valid
      expect(validateMultiFactorScore(loserEntry.multiFactorScore)).toBe(true)
      expect(loserEntry.multiFactorScore.total).toBeGreaterThan(0) // At least profit rank floor
    })

    it('handles recalculation after updating risk scores', () => {
      seedTeams([
        {
          id: 'team-a',
          name: 'Alpha',
          profit: 100,
          roundHistory: Array.from({ length: 5 }, (_, i) =>
            makeRound({ round: i + 1, profit: 20, cupsMade: 50, cupsSold: 48 }),
          ),
        },
      ])

      // First calculation with low risk score
      useGameStore.getState().setRiskManagementScore('team-a', makeRiskInput('team-a', { total: 3 }))
      useGameStore.getState().calculateMultiFactorScores()
      const firstTotal = useGameStore.getState().finalScores.get('team-a')!.total

      // Update risk score and recalculate
      useGameStore.getState().setRiskManagementScore('team-a', makeRiskInput('team-a', { total: 15 }))
      useGameStore.getState().calculateMultiFactorScores()
      const secondTotal = useGameStore.getState().finalScores.get('team-a')!.total

      // Second total should be higher by the risk score difference (15 - 3 = 12)
      expect(secondTotal).toBe(firstTotal + 12)
    })
  })

  // -------------------------------------------------------------------------
  // 4.7 — Tie detection in leaderboard
  // -------------------------------------------------------------------------

  describe('Tie detection during game flow', () => {
    it('marks tied teams correctly when multi-factor totals match', () => {
      // Two teams with same profit get consecutive profit ranks (1st=50, 2nd=45)
      // Give team-b 5 more risk points to compensate, creating a tie in total
      seedTeams([
        {
          id: 'team-a',
          name: 'Alpha',
          profit: 100,
          roundHistory: Array.from({ length: 3 }, () =>
            makeRound({ profit: 33, cupsMade: 50, cupsSold: 45 }),
          ),
        },
        {
          id: 'team-b',
          name: 'Beta',
          profit: 100,
          roundHistory: Array.from({ length: 3 }, () =>
            makeRound({ profit: 33, cupsMade: 50, cupsSold: 45 }),
          ),
        },
      ])

      // A gets rank 1 (50pts), B gets rank 2 (45pts). Compensate with risk:
      useGameStore.getState().setRiskManagementScore('team-a', makeRiskInput('team-a', { total: 5 }))
      useGameStore.getState().setRiskManagementScore('team-b', makeRiskInput('team-b', { total: 10 }))

      const leaderboard = useGameStore.getState().getFinalLeaderboard()

      // Both totals should be equal
      expect(leaderboard[0].multiFactorScore.total).toBe(
        leaderboard[1].multiFactorScore.total,
      )

      // Both should be marked as tied
      expect(leaderboard[0].isTied).toBe(true)
      expect(leaderboard[1].isTied).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // 4.8 — Scoring library consistency with store
  // -------------------------------------------------------------------------

  describe('Scoring library consistency with store', () => {
    it('store getFinalLeaderboard matches direct library call', () => {
      const rounds = Array.from({ length: 5 }, (_, i) =>
        makeRound({ round: i + 1, profit: 25, cupsMade: 50, cupsSold: 46 }),
      )

      seedTeams([
        { id: 'x', name: 'Team X', profit: 125, roundHistory: rounds },
        { id: 'y', name: 'Team Y', profit: 80, roundHistory: rounds.map(r => ({ ...r, profit: 16 })) },
      ])

      useGameStore.getState().setRiskManagementScore('x', makeRiskInput('x', { total: 10 }))
      useGameStore.getState().setRiskManagementScore('y', makeRiskInput('y', { total: 7 }))

      // Get leaderboard from the store
      const storeLeaderboard = useGameStore.getState().getFinalLeaderboard()

      // Get leaderboard directly from the library
      const { teams, riskManagementScores } = useGameStore.getState()
      const riskTotals = new Map<string, number>()
      for (const [teamId, input] of riskManagementScores) {
        riskTotals.set(teamId, input.total)
      }
      const libraryLeaderboard = generateFinalLeaderboard(teams, riskTotals)

      // They should produce identical results
      expect(storeLeaderboard).toHaveLength(libraryLeaderboard.length)
      for (let i = 0; i < storeLeaderboard.length; i++) {
        expect(storeLeaderboard[i].rank).toBe(libraryLeaderboard[i].rank)
        expect(storeLeaderboard[i].team.id).toBe(libraryLeaderboard[i].team.id)
        expect(storeLeaderboard[i].multiFactorScore.total).toBe(
          libraryLeaderboard[i].multiFactorScore.total,
        )
        expect(storeLeaderboard[i].multiFactorScore.profitRanking).toBe(
          libraryLeaderboard[i].multiFactorScore.profitRanking,
        )
        expect(storeLeaderboard[i].multiFactorScore.consistency).toBe(
          libraryLeaderboard[i].multiFactorScore.consistency,
        )
        expect(storeLeaderboard[i].multiFactorScore.efficiency).toBe(
          libraryLeaderboard[i].multiFactorScore.efficiency,
        )
        expect(storeLeaderboard[i].multiFactorScore.riskManagement).toBe(
          libraryLeaderboard[i].multiFactorScore.riskManagement,
        )
      }
    })
  })
})
