// ============================================================================
// Store Actions Integration Tests
// Verifies that store actions (setRiskManagementScore, calculateMultiFactorScores,
// getFinalLeaderboard) integrate correctly with the Zustand state and scoring library.
// Reference: spec/01_SCORING_SYSTEM.md, spec/04_DATA_MODEL.md
// ============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock the backend module to avoid network dependencies.
// vi.mock is hoisted by vitest, so it runs before any import resolution.
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
// depend on a browser-compatible localStorage (Node 25+ has a built-in
// localStorage with a different API that breaks Zustand's persist).
vi.mock('zustand/middleware', async (importOriginal) => {
  const actual = await importOriginal<typeof import('zustand/middleware')>()
  return {
    ...actual,
    persist: (config: any) => config,
  }
})

import { useGameStore } from '@/store/game-store'

import type {
  RiskManagementInput,
  RoundResult,
  MultiFactorScore,
  LeaderboardEntry,
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
    profitableRounds?: number
  }>,
) => {
  useGameStore.setState({
    teams: teams.map((t, i) => ({
      id: t.id,
      name: t.name,
      color: ['#FF6B6B', '#4ECDC4', '#45B7D1'][i % 3],
      profit: t.profit,
      revenue: t.roundHistory.reduce((sum, r) => sum + r.revenue, 0),
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

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Reset store to initial state between tests
  useGameStore.setState({
    teams: [],
    riskManagementScores: new Map(),
    finalScores: new Map(),
  })
})

// ============================================================================
// setRiskManagementScore
// ============================================================================

describe('setRiskManagementScore (store action)', () => {
  it('stores a risk management score in state', () => {
    const input = makeRiskInput('team-a')

    useGameStore.getState().setRiskManagementScore('team-a', input)

    const scores = useGameStore.getState().riskManagementScores
    expect(scores.size).toBe(1)
    expect(scores.get('team-a')).toEqual(input)
  })

  it('overwrites a previous score for the same team', () => {
    const first = makeRiskInput('team-a', { total: 5 })
    const second = makeRiskInput('team-a', { total: 12 })

    const { setRiskManagementScore } = useGameStore.getState()
    setRiskManagementScore('team-a', first)
    setRiskManagementScore('team-a', second)

    const scores = useGameStore.getState().riskManagementScores
    expect(scores.size).toBe(1)
    expect(scores.get('team-a')!.total).toBe(12)
  })

  it('stores scores for multiple teams independently', () => {
    const { setRiskManagementScore } = useGameStore.getState()

    setRiskManagementScore('team-a', makeRiskInput('team-a', { total: 10 }))
    setRiskManagementScore('team-b', makeRiskInput('team-b', { total: 7 }))
    setRiskManagementScore('team-c', makeRiskInput('team-c', { total: 15 }))

    const scores = useGameStore.getState().riskManagementScores
    expect(scores.size).toBe(3)
    expect(scores.get('team-a')!.total).toBe(10)
    expect(scores.get('team-b')!.total).toBe(7)
    expect(scores.get('team-c')!.total).toBe(15)
  })

  it('preserves all fields in the RiskManagementInput', () => {
    const input = makeRiskInput('team-a', {
      productionAdjustment: 5,
      pricingStrategy: 5,
      budgetReserves: 5,
      total: 15,
      notes: 'Excellent risk awareness',
      assessedBy: 'facilitator-jane',
    })

    useGameStore.getState().setRiskManagementScore('team-a', input)

    const stored = useGameStore.getState().riskManagementScores.get('team-a')!
    expect(stored.productionAdjustment).toBe(5)
    expect(stored.pricingStrategy).toBe(5)
    expect(stored.budgetReserves).toBe(5)
    expect(stored.total).toBe(15)
    expect(stored.notes).toBe('Excellent risk awareness')
    expect(stored.assessedBy).toBe('facilitator-jane')
    expect(typeof stored.assessedAt).toBe('number')
  })

  it('does not affect other store state', () => {
    seedTeams([
      { id: 'team-a', name: 'Alpha', profit: 100, roundHistory: [makeRound()] },
    ])

    useGameStore.getState().setRiskManagementScore('team-a', makeRiskInput('team-a'))

    // Teams should be untouched
    const { teams } = useGameStore.getState()
    expect(teams).toHaveLength(1)
    expect(teams[0].profit).toBe(100)
  })
})

// ============================================================================
// calculateMultiFactorScores
// ============================================================================

describe('calculateMultiFactorScores (store action)', () => {
  it('does nothing when there are no teams', () => {
    useGameStore.getState().calculateMultiFactorScores()

    const { finalScores, teams } = useGameStore.getState()
    expect(finalScores.size).toBe(0)
    expect(teams).toHaveLength(0)
  })

  it('populates finalScores map for all teams', () => {
    seedTeams([
      { id: 'team-a', name: 'Alpha', profit: 200, roundHistory: [makeRound({ profit: 100 }), makeRound({ profit: 100 })] },
      { id: 'team-b', name: 'Beta', profit: 100, roundHistory: [makeRound({ profit: 50 }), makeRound({ profit: 50 })] },
    ])

    useGameStore.getState().calculateMultiFactorScores()

    const { finalScores } = useGameStore.getState()
    expect(finalScores.size).toBe(2)
    expect(finalScores.has('team-a')).toBe(true)
    expect(finalScores.has('team-b')).toBe(true)
  })

  it('sets multiFactorScore on each team object', () => {
    seedTeams([
      { id: 'team-a', name: 'Alpha', profit: 100, roundHistory: [makeRound({ profit: 100 })] },
    ])

    useGameStore.getState().calculateMultiFactorScores()

    const { teams } = useGameStore.getState()
    expect(teams[0].multiFactorScore).not.toBeNull()
    expect(teams[0].multiFactorScore!.total).toBeGreaterThan(0)
  })

  it('calculates correct profit ranking points based on relative position', () => {
    seedTeams([
      { id: 'first', name: 'First', profit: 300, roundHistory: [] },
      { id: 'second', name: 'Second', profit: 200, roundHistory: [] },
      { id: 'third', name: 'Third', profit: 100, roundHistory: [] },
    ])

    useGameStore.getState().calculateMultiFactorScores()

    const { finalScores } = useGameStore.getState()
    expect(finalScores.get('first')!.profitRanking).toBe(50)   // 1st place
    expect(finalScores.get('second')!.profitRanking).toBe(45)  // 2nd place
    expect(finalScores.get('third')!.profitRanking).toBe(40)   // 3rd place
  })

  it('calculates consistency points from round history', () => {
    // Team with 5 profitable rounds = 20 points (max)
    const fiveGoodRounds = Array.from({ length: 5 }, (_, i) =>
      makeRound({ round: i + 1, profit: 25 }),
    )

    // Team with 2 profitable rounds = 8 points
    const twoGoodRounds = [
      makeRound({ round: 1, profit: 30 }),
      makeRound({ round: 2, profit: -10 }),
      makeRound({ round: 3, profit: 20 }),
    ]

    seedTeams([
      { id: 'consistent', name: 'Consistent', profit: 200, roundHistory: fiveGoodRounds },
      { id: 'mixed', name: 'Mixed', profit: 100, roundHistory: twoGoodRounds },
    ])

    useGameStore.getState().calculateMultiFactorScores()

    const { finalScores } = useGameStore.getState()
    expect(finalScores.get('consistent')!.consistency).toBe(20)
    expect(finalScores.get('mixed')!.consistency).toBe(8)
  })

  it('calculates efficiency points from spoilage rate', () => {
    // Team with 5% spoilage = 15 points (excellent)
    seedTeams([
      {
        id: 'efficient',
        name: 'Efficient',
        profit: 100,
        roundHistory: [makeRound({ cupsMade: 100, cupsSold: 95 })],
      },
    ])

    useGameStore.getState().calculateMultiFactorScores()

    const { finalScores } = useGameStore.getState()
    expect(finalScores.get('efficient')!.efficiency).toBe(15)
    expect(finalScores.get('efficient')!.spoilageRate).toBeCloseTo(0.05)
  })

  it('incorporates facilitator risk management scores', () => {
    seedTeams([
      { id: 'team-a', name: 'Alpha', profit: 100, roundHistory: [] },
    ])

    // Set risk management score before calculating
    useGameStore.getState().setRiskManagementScore(
      'team-a',
      makeRiskInput('team-a', { total: 12 }),
    )

    useGameStore.getState().calculateMultiFactorScores()

    const { finalScores } = useGameStore.getState()
    expect(finalScores.get('team-a')!.riskManagement).toBe(12)
  })

  it('defaults risk management to 0 when not set by facilitator', () => {
    seedTeams([
      { id: 'team-a', name: 'Alpha', profit: 100, roundHistory: [] },
    ])

    useGameStore.getState().calculateMultiFactorScores()

    const { finalScores } = useGameStore.getState()
    expect(finalScores.get('team-a')!.riskManagement).toBe(0)
  })

  it('total always equals sum of four components', () => {
    seedTeams([
      {
        id: 'team-a',
        name: 'Alpha',
        profit: 150,
        roundHistory: [
          makeRound({ round: 1, profit: 50, cupsMade: 100, cupsSold: 80 }),
          makeRound({ round: 2, profit: 40, cupsMade: 100, cupsSold: 70 }),
          makeRound({ round: 3, profit: -10, cupsMade: 80, cupsSold: 50 }),
        ],
      },
    ])

    useGameStore.getState().setRiskManagementScore(
      'team-a',
      makeRiskInput('team-a', { total: 9 }),
    )

    useGameStore.getState().calculateMultiFactorScores()

    const score = useGameStore.getState().finalScores.get('team-a')!
    expect(score.total).toBe(
      score.profitRanking + score.consistency + score.efficiency + score.riskManagement,
    )
  })

  it('produces valid scores within spec maximums', () => {
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

    useGameStore.getState().setRiskManagementScore(
      'team-a',
      makeRiskInput('team-a', { total: 15 }),
    )

    useGameStore.getState().calculateMultiFactorScores()

    const score = useGameStore.getState().finalScores.get('team-a')!
    expect(score.profitRanking).toBeGreaterThanOrEqual(0)
    expect(score.profitRanking).toBeLessThanOrEqual(SCORING_MAX.PROFIT_RANKING)
    expect(score.consistency).toBeGreaterThanOrEqual(0)
    expect(score.consistency).toBeLessThanOrEqual(SCORING_MAX.CONSISTENCY)
    expect(score.efficiency).toBeGreaterThanOrEqual(0)
    expect(score.efficiency).toBeLessThanOrEqual(SCORING_MAX.EFFICIENCY)
    expect(score.riskManagement).toBeGreaterThanOrEqual(0)
    expect(score.riskManagement).toBeLessThanOrEqual(SCORING_MAX.RISK_MANAGEMENT)
    expect(score.total).toBeGreaterThanOrEqual(0)
    expect(score.total).toBeLessThanOrEqual(SCORING_MAX.TOTAL)
  })

  it('recalculates correctly when called multiple times', () => {
    seedTeams([
      { id: 'team-a', name: 'Alpha', profit: 100, roundHistory: [makeRound({ profit: 100 })] },
    ])

    // First calculation with no risk score
    useGameStore.getState().calculateMultiFactorScores()
    const firstTotal = useGameStore.getState().finalScores.get('team-a')!.total

    // Set risk management score and recalculate
    useGameStore.getState().setRiskManagementScore(
      'team-a',
      makeRiskInput('team-a', { total: 15 }),
    )
    useGameStore.getState().calculateMultiFactorScores()
    const secondTotal = useGameStore.getState().finalScores.get('team-a')!.total

    expect(secondTotal).toBe(firstTotal + 15)
  })
})

// ============================================================================
// getFinalLeaderboard
// ============================================================================

describe('getFinalLeaderboard (store action)', () => {
  it('returns empty array when there are no teams', () => {
    const leaderboard = useGameStore.getState().getFinalLeaderboard()
    expect(leaderboard).toEqual([])
  })

  it('returns a single-entry leaderboard for one team', () => {
    seedTeams([
      {
        id: 'solo',
        name: 'Solo Team',
        profit: 100,
        roundHistory: [makeRound({ profit: 100, cupsMade: 50, cupsSold: 48 })],
      },
    ])

    const leaderboard = useGameStore.getState().getFinalLeaderboard()

    expect(leaderboard).toHaveLength(1)
    expect(leaderboard[0].rank).toBe(1)
    expect(leaderboard[0].team.id).toBe('solo')
    expect(leaderboard[0].multiFactorScore).toBeDefined()
    expect(leaderboard[0].multiFactorScore.total).toBeGreaterThan(0)
  })

  it('sorts teams by multi-factor score, not just profit', () => {
    // Team A: High profit but terrible efficiency (80% spoilage) and low consistency
    // Team B: Lower profit but excellent efficiency and high consistency
    seedTeams([
      {
        id: 'profit-king',
        name: 'Profit King',
        profit: 200,
        roundHistory: [
          makeRound({ round: 1, profit: 100, cupsMade: 200, cupsSold: 40 }),
          makeRound({ round: 2, profit: 100, cupsMade: 200, cupsSold: 40 }),
        ],
      },
      {
        id: 'balanced',
        name: 'Balanced',
        profit: 120,
        roundHistory: Array.from({ length: 5 }, (_, i) =>
          makeRound({ round: i + 1, profit: 24, cupsMade: 50, cupsSold: 48 }),
        ),
      },
    ])

    // Give balanced team a high risk score to tip the balance
    useGameStore.getState().setRiskManagementScore(
      'balanced',
      makeRiskInput('balanced', { total: 15 }),
    )

    const leaderboard = useGameStore.getState().getFinalLeaderboard()

    // Balanced team should win overall despite lower profit because:
    // - Better consistency (5 profitable rounds = 20 pts vs 2 = 8 pts)
    // - Better efficiency (4% spoilage = 15 pts vs 80% spoilage = 0 pts)
    // - Risk management (15 vs 0)
    expect(leaderboard[0].team.id).toBe('balanced')
    expect(leaderboard[1].team.id).toBe('profit-king')
  })

  it('assigns correct rank positions', () => {
    seedTeams([
      { id: 'a', name: 'Alpha', profit: 300, roundHistory: Array.from({ length: 5 }, (_, i) => makeRound({ round: i + 1, profit: 60, cupsMade: 50, cupsSold: 48 })) },
      { id: 'b', name: 'Beta', profit: 200, roundHistory: Array.from({ length: 4 }, (_, i) => makeRound({ round: i + 1, profit: 50, cupsMade: 50, cupsSold: 48 })) },
      { id: 'c', name: 'Gamma', profit: 100, roundHistory: Array.from({ length: 3 }, (_, i) => makeRound({ round: i + 1, profit: 33, cupsMade: 50, cupsSold: 48 })) },
    ])

    const leaderboard = useGameStore.getState().getFinalLeaderboard()

    expect(leaderboard).toHaveLength(3)
    expect(leaderboard[0].rank).toBe(1)
    expect(leaderboard[1].rank).toBe(2)
    expect(leaderboard[2].rank).toBe(3)
  })

  it('includes category awards in entries', () => {
    seedTeams([
      {
        id: 'all-star',
        name: 'All Star',
        profit: 200,
        profitableRounds: 5,
        totalCupsMade: 250,
        cupsSold: 240,
        roundHistory: Array.from({ length: 5 }, (_, i) =>
          makeRound({ round: i + 1, profit: 40, cupsMade: 50, cupsSold: 48 }),
        ),
      },
    ])

    const leaderboard = useGameStore.getState().getFinalLeaderboard()

    // Single team should have awards
    expect(leaderboard[0].awards.length).toBeGreaterThan(0)
    const categories = leaderboard[0].awards.map(a => a.category)
    expect(categories).toContain('profit')
    expect(categories).toContain('consistency')
  })

  it('uses facilitator risk scores from store state', () => {
    seedTeams([
      { id: 'team-a', name: 'Alpha', profit: 100, roundHistory: [makeRound({ profit: 100 })] },
    ])

    // Set a risk score and verify it appears in leaderboard
    useGameStore.getState().setRiskManagementScore(
      'team-a',
      makeRiskInput('team-a', { total: 13 }),
    )

    const leaderboard = useGameStore.getState().getFinalLeaderboard()
    expect(leaderboard[0].multiFactorScore.riskManagement).toBe(13)
  })

  it('leaderboard entries have valid multiFactorScore structure', () => {
    seedTeams([
      {
        id: 'team-a',
        name: 'Alpha',
        profit: 100,
        roundHistory: [
          makeRound({ round: 1, profit: 30, cupsMade: 100, cupsSold: 85 }),
          makeRound({ round: 2, profit: 40, cupsMade: 100, cupsSold: 90 }),
          makeRound({ round: 3, profit: 30, cupsMade: 80, cupsSold: 60 }),
        ],
      },
    ])

    const leaderboard = useGameStore.getState().getFinalLeaderboard()
    const score: MultiFactorScore = leaderboard[0].multiFactorScore

    // Structure checks
    expect(typeof score.profitRanking).toBe('number')
    expect(typeof score.consistency).toBe('number')
    expect(typeof score.efficiency).toBe('number')
    expect(typeof score.riskManagement).toBe('number')
    expect(typeof score.total).toBe('number')
    expect(typeof score.profitRank).toBe('number')
    expect(typeof score.spoilageRate).toBe('number')
    expect(typeof score.profitableRounds).toBe('number')
    expect(typeof score.calculatedAt).toBe('number')

    // Total equals sum of components
    expect(score.total).toBe(
      score.profitRanking + score.consistency + score.efficiency + score.riskManagement,
    )
  })

  it('detects ties when teams have equal multi-factor totals', () => {
    // Two identical teams -> should get consecutive profit ranks but could tie on total
    seedTeams([
      {
        id: 'a',
        name: 'Alpha',
        profit: 100,
        roundHistory: Array.from({ length: 3 }, () =>
          makeRound({ profit: 33, cupsMade: 33, cupsSold: 30 }),
        ),
      },
      {
        id: 'b',
        name: 'Beta',
        profit: 100,
        roundHistory: Array.from({ length: 3 }, () =>
          makeRound({ profit: 33, cupsMade: 33, cupsSold: 30 }),
        ),
      },
    ])

    // Give team B 5 more risk points to compensate for lower profit rank
    // A gets rank 1 (50pts), B gets rank 2 (45pts). With +5 risk for B, totals match.
    useGameStore.getState().setRiskManagementScore('a', makeRiskInput('a', { total: 5 }))
    useGameStore.getState().setRiskManagementScore('b', makeRiskInput('b', { total: 10 }))

    const leaderboard = useGameStore.getState().getFinalLeaderboard()

    // Verify totals are equal
    expect(leaderboard[0].multiFactorScore.total).toBe(
      leaderboard[1].multiFactorScore.total,
    )

    // Both should be marked as tied
    expect(leaderboard[0].isTied).toBe(true)
    expect(leaderboard[1].isTied).toBe(true)
  })
})

// ============================================================================
// End-to-End Integration: Full Scoring Workflow
// ============================================================================

describe('full scoring workflow integration', () => {
  it('complete flow: seed teams → set risk scores → calculate → leaderboard', () => {
    // Step 1: Seed teams with different performance profiles
    seedTeams([
      {
        id: 'champion',
        name: 'Champions',
        profit: 250,
        roundHistory: Array.from({ length: 5 }, (_, i) =>
          makeRound({ round: i + 1, profit: 50, cupsMade: 50, cupsSold: 48 }),
        ),
      },
      {
        id: 'middle',
        name: 'Middle Pack',
        profit: 100,
        roundHistory: [
          makeRound({ round: 1, profit: 40, cupsMade: 80, cupsSold: 60 }),
          makeRound({ round: 2, profit: 30, cupsMade: 80, cupsSold: 55 }),
          makeRound({ round: 3, profit: -10, cupsMade: 80, cupsSold: 30 }),
          makeRound({ round: 4, profit: 20, cupsMade: 80, cupsSold: 65 }),
          makeRound({ round: 5, profit: 20, cupsMade: 80, cupsSold: 50 }),
        ],
      },
      {
        id: 'underdog',
        name: 'Underdogs',
        profit: 50,
        roundHistory: [
          makeRound({ round: 1, profit: 10, cupsMade: 100, cupsSold: 40 }),
          makeRound({ round: 2, profit: -20, cupsMade: 100, cupsSold: 20 }),
          makeRound({ round: 3, profit: 30, cupsMade: 100, cupsSold: 45 }),
          makeRound({ round: 4, profit: 15, cupsMade: 100, cupsSold: 50 }),
          makeRound({ round: 5, profit: 15, cupsMade: 100, cupsSold: 60 }),
        ],
      },
    ])

    // Step 2: Facilitator assigns risk management scores
    const { setRiskManagementScore } = useGameStore.getState()
    setRiskManagementScore('champion', makeRiskInput('champion', { total: 12 }))
    setRiskManagementScore('middle', makeRiskInput('middle', { total: 8 }))
    setRiskManagementScore('underdog', makeRiskInput('underdog', { total: 5 }))

    // Verify risk scores are stored
    expect(useGameStore.getState().riskManagementScores.size).toBe(3)

    // Step 3: Calculate multi-factor scores
    useGameStore.getState().calculateMultiFactorScores()

    // Verify finalScores populated
    const { finalScores, teams } = useGameStore.getState()
    expect(finalScores.size).toBe(3)

    // Verify each team has multiFactorScore set
    for (const team of teams) {
      expect(team.multiFactorScore).not.toBeNull()
      expect(team.multiFactorScore!.total).toBeGreaterThan(0)
    }

    // Step 4: Generate final leaderboard
    const leaderboard = useGameStore.getState().getFinalLeaderboard()

    // Verify structure and ordering
    expect(leaderboard).toHaveLength(3)
    expect(leaderboard[0].rank).toBe(1)
    expect(leaderboard[1].rank).toBe(2)
    expect(leaderboard[2].rank).toBe(3)

    // Verify descending order by total score
    for (let i = 0; i < leaderboard.length - 1; i++) {
      expect(leaderboard[i].multiFactorScore.total).toBeGreaterThanOrEqual(
        leaderboard[i + 1].multiFactorScore.total,
      )
    }

    // Verify champion (best profit + consistency + efficiency + risk) is first
    expect(leaderboard[0].team.id).toBe('champion')

    // Verify all scores are within valid bounds
    for (const entry of leaderboard) {
      const s = entry.multiFactorScore
      expect(s.total).toBeLessThanOrEqual(SCORING_MAX.TOTAL)
      expect(s.profitRanking).toBeLessThanOrEqual(SCORING_MAX.PROFIT_RANKING)
      expect(s.consistency).toBeLessThanOrEqual(SCORING_MAX.CONSISTENCY)
      expect(s.efficiency).toBeLessThanOrEqual(SCORING_MAX.EFFICIENCY)
      expect(s.riskManagement).toBeLessThanOrEqual(SCORING_MAX.RISK_MANAGEMENT)
    }
  })
})
