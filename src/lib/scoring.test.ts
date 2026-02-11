// ============================================================================
// Scoring Library — Tests
// Verifies all scoring functions with known inputs, edge cases, and boundaries.
// Reference: spec/01_SCORING_SYSTEM.md, spec/04_DATA_MODEL.md
// ============================================================================

import { describe, it, expect } from 'vitest'

import {
  getProfitRankingPoints,
  resolveTie,
  calculateProfitRanks,
  getConsistencyPoints,
  calculateSpoilageRate,
  getEfficiencyPoints,
  clampRiskManagementScore,
  calculateMultiFactorScore,
  generateFinalLeaderboard,
  calculateCategoryAwards,
  validateTeam,
  validateMultiFactorScore,
} from '@/lib/scoring'

import type { Team, RoundResult, MultiFactorScore } from '@/types'

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

/** Creates a minimal Team with sensible defaults. */
const makeTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 'team-1',
  name: 'Test Team',
  color: '#ff0000',
  profit: 100,
  revenue: 300,
  cupsSold: 200,
  gamesPlayed: 3,
  lastResult: null,
  timestamp: 1000,
  currentBudget: 150,
  day: 3,
  roundHistory: [],
  totalCupsMade: 250,
  profitableRounds: 3,
  riskManagementScore: 10,
  multiFactorScore: null,
  ...overrides,
})

// ============================================================================
// getProfitRankingPoints
// ============================================================================

describe('getProfitRankingPoints', () => {
  it('returns 50 for rank 1 (champion)', () => {
    expect(getProfitRankingPoints(1)).toBe(50)
  })

  it('returns 45 for rank 2 (runner-up)', () => {
    expect(getProfitRankingPoints(2)).toBe(45)
  })

  it('returns 40 for rank 3 (bronze)', () => {
    expect(getProfitRankingPoints(3)).toBe(40)
  })

  it('returns 35 for rank 4', () => {
    expect(getProfitRankingPoints(4)).toBe(35)
  })

  it('returns 30 for rank 5', () => {
    expect(getProfitRankingPoints(5)).toBe(30)
  })

  it('returns 25 for ranks 6–10', () => {
    for (const rank of [6, 7, 8, 9, 10]) {
      expect(getProfitRankingPoints(rank)).toBe(25)
    }
  })

  it('returns 20 for ranks 11–15', () => {
    for (const rank of [11, 12, 13, 14, 15]) {
      expect(getProfitRankingPoints(rank)).toBe(20)
    }
  })

  it('returns 15 for ranks 16–20', () => {
    for (const rank of [16, 17, 18, 19, 20]) {
      expect(getProfitRankingPoints(rank)).toBe(15)
    }
  })

  it('returns 10 (participation floor) for ranks 21+', () => {
    expect(getProfitRankingPoints(21)).toBe(10)
    expect(getProfitRankingPoints(50)).toBe(10)
    expect(getProfitRankingPoints(100)).toBe(10)
  })

  // Edge cases
  it('handles boundary between ranked tiers (rank 5 vs 6)', () => {
    expect(getProfitRankingPoints(5)).toBe(30)
    expect(getProfitRankingPoints(6)).toBe(25)
  })

  it('handles boundary between ranked tiers (rank 10 vs 11)', () => {
    expect(getProfitRankingPoints(10)).toBe(25)
    expect(getProfitRankingPoints(11)).toBe(20)
  })

  it('handles boundary between ranked tiers (rank 15 vs 16)', () => {
    expect(getProfitRankingPoints(15)).toBe(20)
    expect(getProfitRankingPoints(16)).toBe(15)
  })

  it('handles boundary between ranked tiers (rank 20 vs 21)', () => {
    expect(getProfitRankingPoints(20)).toBe(15)
    expect(getProfitRankingPoints(21)).toBe(10)
  })
})

// ============================================================================
// getConsistencyPoints
// ============================================================================

describe('getConsistencyPoints', () => {
  it('returns 0 for empty round history', () => {
    expect(getConsistencyPoints([])).toBe(0)
  })

  it('returns 0 when all rounds have zero or negative profit', () => {
    const rounds = [
      makeRound({ profit: 0 }),
      makeRound({ profit: -10 }),
      makeRound({ profit: -5 }),
    ]
    expect(getConsistencyPoints(rounds)).toBe(0)
  })

  it('returns 4 for 1 profitable round', () => {
    const rounds = [makeRound({ profit: 10 })]
    expect(getConsistencyPoints(rounds)).toBe(4)
  })

  it('returns 8 for 2 profitable rounds', () => {
    const rounds = [
      makeRound({ profit: 10 }),
      makeRound({ profit: 5 }),
    ]
    expect(getConsistencyPoints(rounds)).toBe(8)
  })

  it('returns 12 for 3 profitable rounds', () => {
    const rounds = [
      makeRound({ profit: 10 }),
      makeRound({ profit: 5 }),
      makeRound({ profit: 1 }),
    ]
    expect(getConsistencyPoints(rounds)).toBe(12)
  })

  it('returns 16 for 4 profitable rounds', () => {
    const rounds = Array.from({ length: 4 }, () => makeRound({ profit: 10 }))
    expect(getConsistencyPoints(rounds)).toBe(16)
  })

  it('returns 20 (max) for 5 profitable rounds', () => {
    const rounds = Array.from({ length: 5 }, () => makeRound({ profit: 10 }))
    expect(getConsistencyPoints(rounds)).toBe(20)
  })

  it('caps at 20 even with more than 5 profitable rounds', () => {
    const rounds = Array.from({ length: 7 }, () => makeRound({ profit: 10 }))
    expect(getConsistencyPoints(rounds)).toBe(20)
  })

  it('only counts rounds with profit strictly greater than 0', () => {
    const rounds = [
      makeRound({ profit: 0 }),     // not counted
      makeRound({ profit: 0.01 }),   // counted
      makeRound({ profit: -1 }),     // not counted
      makeRound({ profit: 50 }),     // counted
    ]
    expect(getConsistencyPoints(rounds)).toBe(8)
  })

  it('handles mixed profitable and unprofitable rounds', () => {
    const rounds = [
      makeRound({ profit: 30 }),   // counted
      makeRound({ profit: -10 }),  // not counted
      makeRound({ profit: 15 }),   // counted
      makeRound({ profit: 0 }),    // not counted
      makeRound({ profit: 5 }),    // counted
    ]
    expect(getConsistencyPoints(rounds)).toBe(12) // 3 * 4 = 12
  })
})

// ============================================================================
// calculateSpoilageRate
// ============================================================================

describe('calculateSpoilageRate', () => {
  it('returns 0 for empty round history', () => {
    expect(calculateSpoilageRate([])).toBe(0)
  })

  it('returns 0 when total cups made is 0', () => {
    const rounds = [makeRound({ cupsMade: 0, cupsSold: 0 })]
    expect(calculateSpoilageRate(rounds)).toBe(0)
  })

  it('returns 0 when all cups are sold (no spoilage)', () => {
    const rounds = [makeRound({ cupsMade: 100, cupsSold: 100 })]
    expect(calculateSpoilageRate(rounds)).toBe(0)
  })

  it('calculates correct rate for partial spoilage', () => {
    const rounds = [makeRound({ cupsMade: 100, cupsSold: 80 })]
    expect(calculateSpoilageRate(rounds)).toBeCloseTo(0.2)
  })

  it('returns 1.0 when no cups are sold', () => {
    const rounds = [makeRound({ cupsMade: 100, cupsSold: 0 })]
    expect(calculateSpoilageRate(rounds)).toBe(1.0)
  })

  it('aggregates across multiple rounds correctly', () => {
    const rounds = [
      makeRound({ cupsMade: 100, cupsSold: 90 }),  // 10% spoilage
      makeRound({ cupsMade: 100, cupsSold: 70 }),  // 30% spoilage
    ]
    // Total: 200 made, 160 sold => 40/200 = 0.20
    expect(calculateSpoilageRate(rounds)).toBeCloseTo(0.2)
  })

  it('handles uneven production across rounds', () => {
    const rounds = [
      makeRound({ cupsMade: 50, cupsSold: 50 }),   // 0% spoilage
      makeRound({ cupsMade: 150, cupsSold: 100 }),  // 33% spoilage
    ]
    // Total: 200 made, 150 sold => 50/200 = 0.25
    expect(calculateSpoilageRate(rounds)).toBeCloseTo(0.25)
  })
})

// ============================================================================
// getEfficiencyPoints
// ============================================================================

describe('getEfficiencyPoints', () => {
  // Exact boundary values
  it('returns 15 for 0% spoilage', () => {
    expect(getEfficiencyPoints(0)).toBe(15)
  })

  it('returns 15 for exactly 10% spoilage (upper bound of excellent)', () => {
    expect(getEfficiencyPoints(0.10)).toBe(15)
  })

  it('returns 12 for 11% spoilage', () => {
    expect(getEfficiencyPoints(0.11)).toBe(12)
  })

  it('returns 12 for exactly 20% spoilage', () => {
    expect(getEfficiencyPoints(0.20)).toBe(12)
  })

  it('returns 9 for 21% spoilage', () => {
    expect(getEfficiencyPoints(0.21)).toBe(9)
  })

  it('returns 9 for exactly 30% spoilage', () => {
    expect(getEfficiencyPoints(0.30)).toBe(9)
  })

  it('returns 6 for 31% spoilage', () => {
    expect(getEfficiencyPoints(0.31)).toBe(6)
  })

  it('returns 6 for exactly 40% spoilage', () => {
    expect(getEfficiencyPoints(0.40)).toBe(6)
  })

  it('returns 3 for 41% spoilage', () => {
    expect(getEfficiencyPoints(0.41)).toBe(3)
  })

  it('returns 3 for exactly 50% spoilage', () => {
    expect(getEfficiencyPoints(0.50)).toBe(3)
  })

  it('returns 0 for 51% spoilage', () => {
    expect(getEfficiencyPoints(0.51)).toBe(0)
  })

  it('returns 0 for 100% spoilage (worst case)', () => {
    expect(getEfficiencyPoints(1.0)).toBe(0)
  })

  // Mid-range values
  it('returns 15 for 5% spoilage (mid-excellent)', () => {
    expect(getEfficiencyPoints(0.05)).toBe(15)
  })

  it('returns 12 for 15% spoilage (mid-good)', () => {
    expect(getEfficiencyPoints(0.15)).toBe(12)
  })

  it('returns 9 for 25% spoilage (mid-average)', () => {
    expect(getEfficiencyPoints(0.25)).toBe(9)
  })

  it('returns 6 for 35% spoilage (mid-below-average)', () => {
    expect(getEfficiencyPoints(0.35)).toBe(6)
  })

  it('returns 3 for 45% spoilage (mid-poor)', () => {
    expect(getEfficiencyPoints(0.45)).toBe(3)
  })

  it('returns 0 for 75% spoilage (very poor)', () => {
    expect(getEfficiencyPoints(0.75)).toBe(0)
  })
})

// ============================================================================
// clampRiskManagementScore
// ============================================================================

describe('clampRiskManagementScore', () => {
  it('returns 0 for 0', () => {
    expect(clampRiskManagementScore(0)).toBe(0)
  })

  it('returns the value when within range (0–15)', () => {
    expect(clampRiskManagementScore(7)).toBe(7)
    expect(clampRiskManagementScore(15)).toBe(15)
    expect(clampRiskManagementScore(1)).toBe(1)
  })

  it('clamps negative values to 0', () => {
    expect(clampRiskManagementScore(-5)).toBe(0)
    expect(clampRiskManagementScore(-100)).toBe(0)
  })

  it('clamps values above 15 to 15', () => {
    expect(clampRiskManagementScore(16)).toBe(15)
    expect(clampRiskManagementScore(100)).toBe(15)
  })
})

// ============================================================================
// calculateMultiFactorScore
// ============================================================================

describe('calculateMultiFactorScore', () => {
  it('calculates a perfect score (100) for ideal inputs', () => {
    const team = makeTeam({
      roundHistory: Array.from({ length: 5 }, (_, i) =>
        makeRound({
          round: i + 1,
          profit: 50,
          cupsMade: 100,
          cupsSold: 100, // 0% spoilage
        }),
      ),
    })

    const score = calculateMultiFactorScore(team, 1, 15)

    expect(score.profitRanking).toBe(50)
    expect(score.consistency).toBe(20)
    expect(score.efficiency).toBe(15)
    expect(score.riskManagement).toBe(15)
    expect(score.total).toBe(100)
    expect(score.profitRank).toBe(1)
    expect(score.spoilageRate).toBe(0)
    expect(score.profitableRounds).toBe(5)
  })

  it('calculates minimum score for worst-case inputs', () => {
    const team = makeTeam({
      roundHistory: [
        makeRound({
          profit: -50,
          cupsMade: 100,
          cupsSold: 10, // 90% spoilage
        }),
      ],
    })

    const score = calculateMultiFactorScore(team, 25, 0)

    expect(score.profitRanking).toBe(10) // rank 25 -> floor
    expect(score.consistency).toBe(0)     // no profitable rounds
    expect(score.efficiency).toBe(0)      // 90% spoilage -> floor
    expect(score.riskManagement).toBe(0)
    expect(score.total).toBe(10)
    expect(score.profitableRounds).toBe(0)
  })

  it('handles a team with no round history', () => {
    const team = makeTeam({ roundHistory: [] })

    const score = calculateMultiFactorScore(team, 5, 10)

    expect(score.profitRanking).toBe(30)
    expect(score.consistency).toBe(0)
    expect(score.efficiency).toBe(15)  // 0 cups made -> 0% spoilage -> 15
    expect(score.riskManagement).toBe(10)
    expect(score.total).toBe(55)
    expect(score.spoilageRate).toBe(0)
    expect(score.profitableRounds).toBe(0)
  })

  it('total always equals sum of components', () => {
    const team = makeTeam({
      roundHistory: [
        makeRound({ profit: 20, cupsMade: 100, cupsSold: 75 }),
        makeRound({ profit: -5, cupsMade: 100, cupsSold: 60 }),
        makeRound({ profit: 15, cupsMade: 80, cupsSold: 70 }),
      ],
    })

    const score = calculateMultiFactorScore(team, 3, 8)

    expect(score.total).toBe(
      score.profitRanking + score.consistency + score.efficiency + score.riskManagement,
    )
  })

  it('clamps excessive risk management input', () => {
    const team = makeTeam({ roundHistory: [] })
    const score = calculateMultiFactorScore(team, 1, 99)

    expect(score.riskManagement).toBe(15)
  })

  it('clamps negative risk management input', () => {
    const team = makeTeam({ roundHistory: [] })
    const score = calculateMultiFactorScore(team, 1, -10)

    expect(score.riskManagement).toBe(0)
  })

  it('uses round history for spoilage, not team-level totalCupsMade', () => {
    // The function should compute spoilage from roundHistory, not from
    // team.totalCupsMade / team.cupsSold directly.
    const team = makeTeam({
      totalCupsMade: 999,
      cupsSold: 1,
      roundHistory: [
        makeRound({ cupsMade: 100, cupsSold: 95 }), // 5% spoilage from history
      ],
    })

    const score = calculateMultiFactorScore(team, 1, 0)
    expect(score.spoilageRate).toBeCloseTo(0.05)
    expect(score.efficiency).toBe(15) // 5% -> excellent
  })

  it('includes metadata fields in returned score', () => {
    const team = makeTeam({
      roundHistory: [
        makeRound({ profit: 10, cupsMade: 50, cupsSold: 40 }),
        makeRound({ profit: -5, cupsMade: 50, cupsSold: 30 }),
      ],
    })

    const score = calculateMultiFactorScore(team, 7, 12)

    expect(score.profitRank).toBe(7)
    expect(score.profitableRounds).toBe(1)
    // spoilageRate: (100 - 70) / 100 = 0.30
    expect(score.spoilageRate).toBeCloseTo(0.3)
    expect(typeof score.calculatedAt).toBe('number')
  })
})

// ============================================================================
// resolveTie
// ============================================================================

describe('resolveTie', () => {
  it('favors team with higher single-round max profit (rule 1)', () => {
    const teamA = makeTeam({
      id: 'a',
      roundHistory: [makeRound({ profit: 50 }), makeRound({ profit: 10 })],
    })
    const teamB = makeTeam({
      id: 'b',
      roundHistory: [makeRound({ profit: 40 }), makeRound({ profit: 20 })],
    })

    // teamA has max 50, teamB has max 40 -> A should rank higher (negative result)
    expect(resolveTie(teamA, teamB)).toBeLessThan(0)
  })

  it('falls through to fewest loss rounds when max profit is tied (rule 2)', () => {
    const teamA = makeTeam({
      id: 'a',
      roundHistory: [
        makeRound({ profit: 50 }),
        makeRound({ profit: -10 }),
        makeRound({ profit: -5 }),
      ],
    })
    const teamB = makeTeam({
      id: 'b',
      roundHistory: [
        makeRound({ profit: 50 }),
        makeRound({ profit: -10 }),
        makeRound({ profit: 5 }),
      ],
    })

    // Same max profit (50). A has 2 losses, B has 1 loss -> B should rank higher
    expect(resolveTie(teamA, teamB)).toBeGreaterThan(0)
  })

  it('falls through to higher revenue when losses are tied (rule 3)', () => {
    const teamA = makeTeam({
      id: 'a',
      revenue: 200,
      roundHistory: [makeRound({ profit: 50 })],
    })
    const teamB = makeTeam({
      id: 'b',
      revenue: 300,
      roundHistory: [makeRound({ profit: 50 })],
    })

    // Same max profit, same losses. B has more revenue -> B ranks higher
    expect(resolveTie(teamA, teamB)).toBeGreaterThan(0)
  })

  it('falls through to earlier timestamp when all else is equal (rule 4)', () => {
    const teamA = makeTeam({
      id: 'a',
      revenue: 200,
      timestamp: 1000,
      roundHistory: [makeRound({ profit: 50 })],
    })
    const teamB = makeTeam({
      id: 'b',
      revenue: 200,
      timestamp: 2000,
      roundHistory: [makeRound({ profit: 50 })],
    })

    // Same everything except timestamp. A created earlier -> A ranks higher (negative)
    expect(resolveTie(teamA, teamB)).toBeLessThan(0)
  })

  it('returns 0 when teams are identical on all criteria', () => {
    const teamA = makeTeam({
      id: 'a',
      revenue: 200,
      timestamp: 1000,
      roundHistory: [makeRound({ profit: 50 })],
    })
    const teamB = makeTeam({
      id: 'b',
      revenue: 200,
      timestamp: 1000,
      roundHistory: [makeRound({ profit: 50 })],
    })

    expect(resolveTie(teamA, teamB)).toBe(0)
  })

  it('handles teams with empty round history', () => {
    const teamA = makeTeam({ id: 'a', roundHistory: [], revenue: 100, timestamp: 1000 })
    const teamB = makeTeam({ id: 'b', roundHistory: [], revenue: 100, timestamp: 1000 })

    expect(resolveTie(teamA, teamB)).toBe(0)
  })
})

// ============================================================================
// calculateProfitRanks
// ============================================================================

describe('calculateProfitRanks', () => {
  it('returns empty array for no teams', () => {
    expect(calculateProfitRanks([])).toEqual([])
  })

  it('ranks a single team as 1st', () => {
    const teams = [makeTeam({ id: 'solo', profit: 100 })]
    const ranks = calculateProfitRanks(teams)

    expect(ranks).toHaveLength(1)
    expect(ranks[0].rank).toBe(1)
    expect(ranks[0].points).toBe(50)
    expect(ranks[0].teamId).toBe('solo')
  })

  it('ranks teams by profit descending', () => {
    const teams = [
      makeTeam({ id: 'low', profit: 50 }),
      makeTeam({ id: 'high', profit: 200 }),
      makeTeam({ id: 'mid', profit: 100 }),
    ]

    const ranks = calculateProfitRanks(teams)

    expect(ranks[0].teamId).toBe('high')
    expect(ranks[0].rank).toBe(1)
    expect(ranks[1].teamId).toBe('mid')
    expect(ranks[1].rank).toBe(2)
    expect(ranks[2].teamId).toBe('low')
    expect(ranks[2].rank).toBe(3)
  })

  it('assigns correct points for each rank position', () => {
    const teams = Array.from({ length: 5 }, (_, i) =>
      makeTeam({ id: `team-${i}`, profit: 500 - i * 100 }),
    )

    const ranks = calculateProfitRanks(teams)

    expect(ranks[0].points).toBe(50) // 1st
    expect(ranks[1].points).toBe(45) // 2nd
    expect(ranks[2].points).toBe(40) // 3rd
    expect(ranks[3].points).toBe(35) // 4th
    expect(ranks[4].points).toBe(30) // 5th
  })

  it('uses tiebreaker when profits are equal', () => {
    const teamA = makeTeam({
      id: 'a',
      profit: 100,
      roundHistory: [makeRound({ profit: 80 })],
    })
    const teamB = makeTeam({
      id: 'b',
      profit: 100,
      roundHistory: [makeRound({ profit: 60 })],
    })

    const ranks = calculateProfitRanks([teamA, teamB])

    // teamA has higher max round profit -> ranks 1st
    expect(ranks[0].teamId).toBe('a')
    expect(ranks[1].teamId).toBe('b')
  })
})

// ============================================================================
// generateFinalLeaderboard
// ============================================================================

describe('generateFinalLeaderboard', () => {
  it('returns empty array for no teams', () => {
    expect(generateFinalLeaderboard([], new Map())).toEqual([])
  })

  it('generates a single-team leaderboard', () => {
    const team = makeTeam({
      id: 't1',
      name: 'Solo',
      profit: 100,
      totalCupsMade: 100,
      cupsSold: 90,
      profitableRounds: 3,
      roundHistory: Array.from({ length: 3 }, (_, i) =>
        makeRound({ round: i + 1, profit: 30, cupsMade: 33, cupsSold: 30 }),
      ),
    })

    const riskScores = new Map([['t1', 10]])
    const leaderboard = generateFinalLeaderboard([team], riskScores)

    expect(leaderboard).toHaveLength(1)
    expect(leaderboard[0].rank).toBe(1)
    expect(leaderboard[0].team.id).toBe('t1')
    expect(leaderboard[0].multiFactorScore.total).toBeGreaterThan(0)
  })

  it('sorts by total multi-factor score, not just profit', () => {
    // Team A: Higher profit but terrible efficiency
    const teamA = makeTeam({
      id: 'a',
      name: 'Profit King',
      profit: 200,
      totalCupsMade: 500,
      cupsSold: 100,
      profitableRounds: 2,
      roundHistory: [
        makeRound({ profit: 100, cupsMade: 250, cupsSold: 50 }),
        makeRound({ profit: 100, cupsMade: 250, cupsSold: 50 }),
      ],
    })

    // Team B: Lower profit but great efficiency and consistency
    const teamB = makeTeam({
      id: 'b',
      name: 'Balanced',
      profit: 150,
      totalCupsMade: 200,
      cupsSold: 195,
      profitableRounds: 5,
      roundHistory: Array.from({ length: 5 }, (_, i) =>
        makeRound({ round: i + 1, profit: 30, cupsMade: 40, cupsSold: 39 }),
      ),
    })

    // Give team B a high risk management score to tip the balance
    const riskScores = new Map([
      ['a', 0],
      ['b', 15],
    ])

    const leaderboard = generateFinalLeaderboard([teamA, teamB], riskScores)

    // Team B should win on total score despite lower profit, because:
    // - B gets more consistency points (5 * 4 = 20 vs 2 * 4 = 8)
    // - B gets more efficiency points (low spoilage vs 80% spoilage)
    // - B gets 15 risk management vs 0
    expect(leaderboard[0].team.id).toBe('b')
  })

  it('includes awards in leaderboard entries', () => {
    const teamA = makeTeam({
      id: 'a',
      name: 'Alpha',
      profit: 300,
      totalCupsMade: 200,
      cupsSold: 190,
      profitableRounds: 5,
      roundHistory: Array.from({ length: 5 }, () =>
        makeRound({ profit: 60, cupsMade: 40, cupsSold: 38 }),
      ),
    })

    const leaderboard = generateFinalLeaderboard(
      [teamA],
      new Map([['a', 10]]),
    )

    // Single team should win all awards
    expect(leaderboard[0].awards.length).toBeGreaterThan(0)
  })

  it('defaults to 0 risk score when not provided', () => {
    const team = makeTeam({
      id: 't1',
      roundHistory: [makeRound({ profit: 10, cupsMade: 100, cupsSold: 95 })],
    })

    const leaderboard = generateFinalLeaderboard([team], new Map())

    expect(leaderboard[0].multiFactorScore.riskManagement).toBe(0)
  })

  it('detects ties correctly', () => {
    // Two teams with identical profit so they get consecutive ranks (1, 2)
    // but the same round history and risk scores.
    // Profit ranks differ (1st=50pts, 2nd=45pts), so to get the same total
    // we give team B 5 more risk management points to compensate.
    const teamA = makeTeam({
      id: 'a',
      name: 'Alpha',
      profit: 100,
      totalCupsMade: 100,
      cupsSold: 90,
      profitableRounds: 3,
      roundHistory: Array.from({ length: 3 }, () =>
        makeRound({ profit: 33, cupsMade: 33, cupsSold: 30 }),
      ),
    })

    const teamB = makeTeam({
      id: 'b',
      name: 'Beta',
      profit: 100,
      totalCupsMade: 100,
      cupsSold: 90,
      profitableRounds: 3,
      roundHistory: Array.from({ length: 3 }, () =>
        makeRound({ profit: 33, cupsMade: 33, cupsSold: 30 }),
      ),
    })

    // A gets rank 1 (50pts profit), B gets rank 2 (45pts profit).
    // Give A risk=5, B risk=10 so totals match: both 50+12+9+5 = 45+12+9+10 = 76
    const riskScores = new Map([
      ['a', 5],
      ['b', 10],
    ])

    const leaderboard = generateFinalLeaderboard([teamA, teamB], riskScores)

    // Verify totals are actually equal
    expect(leaderboard[0].multiFactorScore.total).toBe(
      leaderboard[1].multiFactorScore.total,
    )

    // Both should be marked as tied
    expect(leaderboard[0].isTied).toBe(true)
    expect(leaderboard[1].isTied).toBe(true)
  })
})

// ============================================================================
// calculateCategoryAwards
// ============================================================================

describe('calculateCategoryAwards', () => {
  it('returns empty array for no teams', () => {
    expect(calculateCategoryAwards([])).toEqual([])
  })

  it('awards all three categories to a single team', () => {
    const team = makeTeam({
      id: 'solo',
      name: 'Solo',
      profit: 100,
      totalCupsMade: 100,
      cupsSold: 95,
      profitableRounds: 5,
    })

    const awards = calculateCategoryAwards([team])

    expect(awards).toHaveLength(3)
    expect(awards.map(a => a.category)).toContain('profit')
    expect(awards.map(a => a.category)).toContain('consistency')
    expect(awards.map(a => a.category)).toContain('efficiency')
  })

  it('awards efficiency to team with lowest spoilage', () => {
    const teamA = makeTeam({
      id: 'a',
      name: 'Efficient',
      totalCupsMade: 100,
      cupsSold: 99,
    })
    const teamB = makeTeam({
      id: 'b',
      name: 'Wasteful',
      totalCupsMade: 100,
      cupsSold: 50,
    })

    const awards = calculateCategoryAwards([teamA, teamB])
    const efficiencyAward = awards.find(a => a.category === 'efficiency')

    expect(efficiencyAward?.teamId).toBe('a')
  })

  it('awards profit to team with highest profit', () => {
    const teamA = makeTeam({ id: 'a', name: 'Rich', profit: 500 })
    const teamB = makeTeam({ id: 'b', name: 'Poor', profit: 100 })

    const awards = calculateCategoryAwards([teamA, teamB])
    const profitAward = awards.find(a => a.category === 'profit')

    expect(profitAward?.teamId).toBe('a')
  })

  it('awards consistency to team with most profitable rounds', () => {
    const teamA = makeTeam({ id: 'a', name: 'Consistent', profitableRounds: 5 })
    const teamB = makeTeam({ id: 'b', name: 'Inconsistent', profitableRounds: 2 })

    const awards = calculateCategoryAwards([teamA, teamB])
    const consistencyAward = awards.find(a => a.category === 'consistency')

    expect(consistencyAward?.teamId).toBe('a')
  })

  it('omits efficiency award when no teams have produced cups', () => {
    const team = makeTeam({ id: 'a', name: 'Empty', totalCupsMade: 0 })

    const awards = calculateCategoryAwards([team])
    const efficiencyAward = awards.find(a => a.category === 'efficiency')

    expect(efficiencyAward).toBeUndefined()
  })
})

// ============================================================================
// validateTeam
// ============================================================================

describe('validateTeam', () => {
  it('returns true for a valid team', () => {
    const team = makeTeam()
    expect(validateTeam(team)).toBe(true)
  })

  it('returns true when riskManagementScore is 0 (minimum)', () => {
    const team = makeTeam({ riskManagementScore: 0 })
    expect(validateTeam(team)).toBe(true)
  })

  it('returns true when riskManagementScore is 15 (maximum)', () => {
    const team = makeTeam({ riskManagementScore: 15 })
    expect(validateTeam(team)).toBe(true)
  })

  it('returns false when riskManagementScore exceeds 15', () => {
    const team = makeTeam({ riskManagementScore: 16 })
    expect(validateTeam(team)).toBe(false)
  })

  it('returns false when riskManagementScore is negative', () => {
    const team = makeTeam({ riskManagementScore: -1 })
    expect(validateTeam(team)).toBe(false)
  })
})

// ============================================================================
// validateMultiFactorScore
// ============================================================================

describe('validateMultiFactorScore', () => {
  it('returns true for a valid score', () => {
    const score: MultiFactorScore = {
      profitRanking: 45,
      consistency: 16,
      efficiency: 12,
      riskManagement: 10,
      total: 83,
      profitRank: 2,
      spoilageRate: 0.15,
      profitableRounds: 4,
      calculatedAt: Date.now(),
    }
    expect(validateMultiFactorScore(score)).toBe(true)
  })

  it('returns true for a perfect score', () => {
    const score: MultiFactorScore = {
      profitRanking: 50,
      consistency: 20,
      efficiency: 15,
      riskManagement: 15,
      total: 100,
      profitRank: 1,
      spoilageRate: 0,
      profitableRounds: 5,
      calculatedAt: Date.now(),
    }
    expect(validateMultiFactorScore(score)).toBe(true)
  })

  it('returns true for minimum possible score', () => {
    const score: MultiFactorScore = {
      profitRanking: 0,
      consistency: 0,
      efficiency: 0,
      riskManagement: 0,
      total: 0,
      profitRank: 99,
      spoilageRate: 1.0,
      profitableRounds: 0,
      calculatedAt: Date.now(),
    }
    expect(validateMultiFactorScore(score)).toBe(true)
  })

  it('returns false when total does not equal sum of components', () => {
    const score: MultiFactorScore = {
      profitRanking: 50,
      consistency: 20,
      efficiency: 15,
      riskManagement: 15,
      total: 99, // should be 100
      profitRank: 1,
      spoilageRate: 0,
      profitableRounds: 5,
      calculatedAt: Date.now(),
    }
    expect(validateMultiFactorScore(score)).toBe(false)
  })

  it('returns false when profitRanking exceeds max (50)', () => {
    const score: MultiFactorScore = {
      profitRanking: 51,
      consistency: 0,
      efficiency: 0,
      riskManagement: 0,
      total: 51,
      profitRank: 1,
      spoilageRate: 0,
      profitableRounds: 0,
      calculatedAt: Date.now(),
    }
    expect(validateMultiFactorScore(score)).toBe(false)
  })

  it('returns false when consistency exceeds max (20)', () => {
    const score: MultiFactorScore = {
      profitRanking: 0,
      consistency: 21,
      efficiency: 0,
      riskManagement: 0,
      total: 21,
      profitRank: 1,
      spoilageRate: 0,
      profitableRounds: 0,
      calculatedAt: Date.now(),
    }
    expect(validateMultiFactorScore(score)).toBe(false)
  })

  it('returns false when efficiency exceeds max (15)', () => {
    const score: MultiFactorScore = {
      profitRanking: 0,
      consistency: 0,
      efficiency: 16,
      riskManagement: 0,
      total: 16,
      profitRank: 1,
      spoilageRate: 0,
      profitableRounds: 0,
      calculatedAt: Date.now(),
    }
    expect(validateMultiFactorScore(score)).toBe(false)
  })

  it('returns false when riskManagement exceeds max (15)', () => {
    const score: MultiFactorScore = {
      profitRanking: 0,
      consistency: 0,
      efficiency: 0,
      riskManagement: 16,
      total: 16,
      profitRank: 1,
      spoilageRate: 0,
      profitableRounds: 0,
      calculatedAt: Date.now(),
    }
    expect(validateMultiFactorScore(score)).toBe(false)
  })

  it('returns false when any component is negative', () => {
    const score: MultiFactorScore = {
      profitRanking: -1,
      consistency: 0,
      efficiency: 0,
      riskManagement: 0,
      total: -1,
      profitRank: 1,
      spoilageRate: 0,
      profitableRounds: 0,
      calculatedAt: Date.now(),
    }
    expect(validateMultiFactorScore(score)).toBe(false)
  })
})
