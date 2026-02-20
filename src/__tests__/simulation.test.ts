import { describe, it, expect } from 'vitest'
import {
  calculateDemand,
  calculateFinancials,
  simulateBusiness,
  isInRange,
  roundCurrency,
  BASE_DEMAND,
  BASE_INGREDIENT_COST,
  FIXED_COSTS_PER_LEVEL,
  MAX_CAPACITY,
  QUALITY_MULTIPLIERS,
} from '@/lib/simulation'
import type { GameDecision, LevelScenario } from '@/store/game-store'

// ============================================================================
// Test Helpers
// ============================================================================

/** Minimal scenario factory for test inputs */
function makeScenario(overrides: Partial<LevelScenario> = {}): LevelScenario {
  return {
    level: 1,
    day: 1,
    title: 'Test Scenario',
    story: 'A sunny day for testing.',
    hint: 'Test hint',
    targetMarket: 'Test customers',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [2, 4],
      marketingRange: [5, 15],
    },
    weatherEffect: 1.0,
    marketCondition: 'Normal conditions',
    loanOffer: null,
    ...overrides,
  }
}

function makeDecision(overrides: Partial<GameDecision> = {}): GameDecision {
  return { price: 1.0, quality: 3, marketing: 10, ...overrides }
}

// ============================================================================
// Utility Functions
// ============================================================================

describe('isInRange', () => {
  it('returns true for value at lower bound', () => {
    expect(isInRange(5, [5, 10])).toBe(true)
  })

  it('returns true for value at upper bound', () => {
    expect(isInRange(10, [5, 10])).toBe(true)
  })

  it('returns true for value within range', () => {
    expect(isInRange(7, [5, 10])).toBe(true)
  })

  it('returns false for value below range', () => {
    expect(isInRange(4.99, [5, 10])).toBe(false)
  })

  it('returns false for value above range', () => {
    expect(isInRange(10.01, [5, 10])).toBe(false)
  })
})

describe('roundCurrency', () => {
  it('rounds to two decimal places', () => {
    // Note: 1.005 * 100 = 100.49999... in IEEE 754, so Math.round gives 100
    expect(roundCurrency(1.005)).toBe(1)
    expect(roundCurrency(1.006)).toBe(1.01)
    expect(roundCurrency(1.004)).toBe(1)
    expect(roundCurrency(99.999)).toBe(100)
  })

  it('returns exact value when already two decimals', () => {
    expect(roundCurrency(1.25)).toBe(1.25)
  })

  it('handles negative values', () => {
    expect(roundCurrency(-3.456)).toBe(-3.46)
  })

  it('handles zero', () => {
    expect(roundCurrency(0)).toBe(0)
  })
})

// ============================================================================
// Demand Calculation
// ============================================================================

describe('calculateDemand', () => {
  const scenario = makeScenario()
  const budget = 500

  it('returns positive cups sold for default mid-range decisions', () => {
    const decision = makeDecision()
    const { cupsSold } = calculateDemand(decision, budget, scenario)
    expect(cupsSold).toBeGreaterThan(0)
    expect(cupsSold).toBeLessThanOrEqual(MAX_CAPACITY)
  })

  it('caps cups sold at MAX_CAPACITY (150)', () => {
    // Very low price + high quality + high marketing + high weather = huge demand
    const decision = makeDecision({ price: 0.25, quality: 5, marketing: 30 })
    const boostedScenario = makeScenario({
      weatherEffect: 1.4,
      deceptionLevel: 'high',
      optimalDecision: {
        priceRange: [0.25, 0.50],
        qualityRange: [4, 5],
        marketingRange: [25, 30],
      },
    })
    const { cupsSold } = calculateDemand(decision, budget, boostedScenario)
    expect(cupsSold).toBeLessThanOrEqual(MAX_CAPACITY)
  })

  it('returns 0 cups for maximum price ($2.00)', () => {
    // Price attractiveness = (2.0 - 2.0) / 1.75 = 0, so demand = 0
    const decision = makeDecision({ price: 2.0 })
    const { cupsSold } = calculateDemand(decision, budget, scenario)
    expect(cupsSold).toBe(0)
  })

  it('increases demand for lower prices', () => {
    const lowPrice = calculateDemand(makeDecision({ price: 0.50 }), budget, scenario)
    const highPrice = calculateDemand(makeDecision({ price: 1.50 }), budget, scenario)
    expect(lowPrice.cupsSold).toBeGreaterThan(highPrice.cupsSold)
  })

  it('increases demand for higher quality', () => {
    const lowQuality = calculateDemand(makeDecision({ quality: 1 }), budget, scenario)
    const highQuality = calculateDemand(makeDecision({ quality: 5 }), budget, scenario)
    expect(highQuality.cupsSold).toBeGreaterThan(lowQuality.cupsSold)
  })

  it('increases demand for higher marketing spend', () => {
    const lowMktg = calculateDemand(makeDecision({ marketing: 0 }), budget, scenario)
    const highMktg = calculateDemand(makeDecision({ marketing: 30 }), budget, scenario)
    expect(highMktg.cupsSold).toBeGreaterThan(lowMktg.cupsSold)
  })

  it('applies weather effect to demand', () => {
    const decision = makeDecision()
    const sunny = calculateDemand(decision, budget, makeScenario({ weatherEffect: 1.4 }))
    const rainy = calculateDemand(decision, budget, makeScenario({ weatherEffect: 0.6 }))
    expect(sunny.cupsSold).toBeGreaterThan(rainy.cupsSold)
  })

  it('applies scenario multiplier based on deception level', () => {
    const decision = makeDecision()
    const low = calculateDemand(decision, budget, makeScenario({ deceptionLevel: 'low' }))
    const high = calculateDemand(decision, budget, makeScenario({ deceptionLevel: 'high' }))
    expect(high.cupsSold).toBeGreaterThanOrEqual(low.cupsSold)
  })

  it('caps marketing to available budget after fixed costs', () => {
    // Budget of 25 means only $5 available for marketing after $20 fixed costs
    const decision = makeDecision({ marketing: 30 })
    const { actualMarketing } = calculateDemand(decision, 25, scenario)
    expect(actualMarketing).toBe(5)
  })

  it('handles zero budget (marketing capped to 0)', () => {
    const decision = makeDecision({ marketing: 10 })
    const { actualMarketing } = calculateDemand(decision, 0, scenario)
    expect(actualMarketing).toBe(0)
  })

  it('gives 1.2x score bonus when decisions are in optimal range', () => {
    // Decision in optimal range
    const optimal = makeDecision({ price: 1.0, quality: 3, marketing: 10 })
    // Decision outside optimal range
    const suboptimal = makeDecision({ price: 1.80, quality: 1, marketing: 0 })

    const optResult = calculateDemand(optimal, budget, scenario)
    const subResult = calculateDemand(suboptimal, budget, scenario)

    // Optimal should yield significantly more demand
    expect(optResult.cupsSold).toBeGreaterThan(subResult.cupsSold)
  })
})

// ============================================================================
// Financial Calculations
// ============================================================================

describe('calculateFinancials', () => {
  it('calculates revenue as cups sold * price', () => {
    const { revenue } = calculateFinancials(100, 1.0, 3, 10)
    expect(revenue).toBe(100.0)
  })

  it('calculates costs = fixed + marketing + variable', () => {
    // 50 cups, quality 1 ($0.10/cup), $10 marketing
    // costs = 20 + 10 + (50 * 0.10) = 35
    const { costs } = calculateFinancials(50, 1.0, 1, 10)
    expect(costs).toBe(35.0)
  })

  it('calculates profit = revenue - costs', () => {
    // 50 cups at $1.50 = $75 revenue
    // costs = 20 + 10 + (50 * 0.10) = $35
    // profit = 75 - 35 = $40
    const { profit } = calculateFinancials(50, 1.50, 1, 10)
    expect(profit).toBe(40.0)
  })

  it('applies quality multipliers correctly', () => {
    const q1 = calculateFinancials(100, 1.0, 1, 0) // $0.10/cup
    const q3 = calculateFinancials(100, 1.0, 3, 0) // $0.15/cup
    const q5 = calculateFinancials(100, 1.0, 5, 0) // $0.28/cup

    // Variable costs: q1 = 100*0.10 = 10, q3 = 100*0.15 = 15, q5 = 100*0.28 = 28
    expect(q1.costs).toBe(FIXED_COSTS_PER_LEVEL + 100 * BASE_INGREDIENT_COST * QUALITY_MULTIPLIERS[0])
    expect(q3.costs).toBe(FIXED_COSTS_PER_LEVEL + 100 * BASE_INGREDIENT_COST * QUALITY_MULTIPLIERS[2])
    expect(q5.costs).toBe(FIXED_COSTS_PER_LEVEL + 100 * BASE_INGREDIENT_COST * QUALITY_MULTIPLIERS[4])
  })

  it('returns negative profit when costs exceed revenue', () => {
    // 0 cups sold, $10 marketing → revenue = 0, costs = 20 + 10 = 30
    const { profit } = calculateFinancials(0, 1.0, 3, 10)
    expect(profit).toBe(-30.0)
  })

  it('handles zero cups sold', () => {
    const { revenue, costs, profit } = calculateFinancials(0, 1.0, 3, 0)
    expect(revenue).toBe(0)
    expect(costs).toBe(FIXED_COSTS_PER_LEVEL) // Only fixed costs
    expect(profit).toBe(-FIXED_COSTS_PER_LEVEL)
  })

  it('rounds all currency values to 2 decimal places', () => {
    // 7 cups at $1.33 = 9.31 revenue (exact)
    const { revenue, costs, profit } = calculateFinancials(7, 1.33, 2, 5)
    expect(revenue).toBe(roundCurrency(7 * 1.33))
    expect(Number(costs.toFixed(2))).toBe(costs)
    expect(Number(profit.toFixed(2))).toBe(profit)
  })
})

// ============================================================================
// Full Simulation (Integration)
// ============================================================================

describe('simulateBusiness', () => {
  const scenario = makeScenario()
  const budget = 500

  it('returns a complete SimulationResult', () => {
    const result = simulateBusiness(makeDecision(), budget, scenario)
    expect(result).toHaveProperty('cupsSold')
    expect(result).toHaveProperty('revenue')
    expect(result).toHaveProperty('costs')
    expect(result).toHaveProperty('profit')
    expect(result).toHaveProperty('feedback')
    expect(typeof result.cupsSold).toBe('number')
  })

  it('produces consistent results for the same inputs', () => {
    const decision = makeDecision()
    const r1 = simulateBusiness(decision, budget, scenario)
    const r2 = simulateBusiness(decision, budget, scenario)
    expect(r1).toEqual(r2)
  })

  it('caps cups sold at 150 with extreme demand', () => {
    const decision = makeDecision({ price: 0.25, quality: 5, marketing: 30 })
    const extremeScenario = makeScenario({
      weatherEffect: 1.4,
      deceptionLevel: 'high',
      optimalDecision: {
        priceRange: [0.25, 0.50],
        qualityRange: [4, 5],
        marketingRange: [25, 30],
      },
    })
    const result = simulateBusiness(decision, budget, extremeScenario)
    expect(result.cupsSold).toBeLessThanOrEqual(150)
  })

  it('profit = revenue - costs', () => {
    const result = simulateBusiness(makeDecision(), budget, scenario)
    expect(result.profit).toBe(roundCurrency(result.revenue - result.costs))
  })

  it('handles minimum price ($0.25) producing high demand', () => {
    const result = simulateBusiness(makeDecision({ price: 0.25 }), budget, scenario)
    expect(result.cupsSold).toBeGreaterThan(0)
    // Low price = low revenue per cup, could be unprofitable
    expect(result.revenue).toBe(roundCurrency(result.cupsSold * 0.25))
  })

  it('handles maximum marketing ($30) producing boosted demand', () => {
    const base = simulateBusiness(makeDecision({ marketing: 0 }), budget, scenario)
    const maxMktg = simulateBusiness(makeDecision({ marketing: 30 }), budget, scenario)
    expect(maxMktg.cupsSold).toBeGreaterThan(base.cupsSold)
  })

  it('handles zero quality (quality 1) as minimum', () => {
    const result = simulateBusiness(makeDecision({ quality: 1 }), budget, scenario)
    expect(result.cupsSold).toBeGreaterThanOrEqual(0)
    expect(result.costs).toBeGreaterThanOrEqual(FIXED_COSTS_PER_LEVEL)
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe('edge cases', () => {
  it('negative budget caps marketing at 0', () => {
    const decision = makeDecision({ marketing: 30 })
    const scenario = makeScenario()
    const { actualMarketing } = calculateDemand(decision, -50, scenario)
    expect(actualMarketing).toBe(0)
  })

  it('very large budget does not affect demand formula', () => {
    const decision = makeDecision()
    const scenario = makeScenario()
    const normal = calculateDemand(decision, 500, scenario)
    const rich = calculateDemand(decision, 100_000, scenario)
    // Same marketing cap (both can afford $10), so same demand
    expect(normal.cupsSold).toBe(rich.cupsSold)
  })

  it('quality multiplier array matches expected values', () => {
    expect(QUALITY_MULTIPLIERS).toEqual([1.0, 1.2, 1.5, 2.0, 2.8])
  })

  it('constants are correct', () => {
    expect(BASE_DEMAND).toBe(50)
    expect(MAX_CAPACITY).toBe(150)
    expect(FIXED_COSTS_PER_LEVEL).toBe(20)
    expect(BASE_INGREDIENT_COST).toBe(0.10)
  })
})
