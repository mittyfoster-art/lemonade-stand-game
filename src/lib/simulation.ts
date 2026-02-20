/**
 * Business Simulation Engine
 *
 * Pure functions for the lemonade stand demand and financial calculations.
 * Extracted from game-store.ts so that both the store and unit tests can import them.
 */

import type { GameDecision, LevelScenario, SimulationResult } from '@/store/game-store'

// ============================================================================
// Constants
// ============================================================================

/** Fixed costs deducted from the budget at each level (stand setup, permits, supplies) */
export const FIXED_COSTS_PER_LEVEL = 20

/** Maximum cups that can be sold in a single level (capacity cap) */
export const MAX_CAPACITY = 150

/** Base demand used in the demand formula before multipliers */
export const BASE_DEMAND = 50

/** Cost of the cheapest possible cup (quality level 1) */
export const BASE_INGREDIENT_COST = 0.10

/** Quality multipliers: index 0 = quality 1 (Basic), index 4 = quality 5 (Gourmet) */
export const QUALITY_MULTIPLIERS: readonly number[] = [1.0, 1.2, 1.5, 2.0, 2.8] as const

// ============================================================================
// Utility Functions
// ============================================================================

/** Check if a numeric value falls within an inclusive range. */
export const isInRange = (value: number, range: [number, number]): boolean => {
  return value >= range[0] && value <= range[1]
}

/** Round a number to two decimal places to avoid floating-point drift. */
export const roundCurrency = (value: number): number => {
  return Math.round(value * 100) / 100
}

// ============================================================================
// Demand Calculation
// ============================================================================

/**
 * Calculate the number of cups sold given player decisions and a scenario.
 *
 * Formula:
 *   priceAttractiveness = max(0, (2.0 - price) / 1.75) * priceScore
 *   qualityFactor = (quality / 5) * qualityScore
 *   marketingFactor = (1 + (actualMarketing / 50)) * marketingScore
 *   demand = BASE_DEMAND * priceAttractiveness * qualityFactor * marketingFactor * weatherEffect * scenarioMultiplier
 *   cupsSold = min(floor(demand), MAX_CAPACITY)
 */
export function calculateDemand(
  decision: GameDecision,
  budget: number,
  scenario: LevelScenario
): { cupsSold: number; actualMarketing: number } {
  const { price, quality, marketing } = decision

  // Cap marketing spend to what the player can actually afford after fixed costs
  const actualMarketing = Math.min(marketing, Math.max(0, budget - FIXED_COSTS_PER_LEVEL))

  // Check how well each decision matches the scenario's optimal ranges
  const priceScore = isInRange(price, scenario.optimalDecision.priceRange) ? 1.2 : 0.8
  const qualityScore = isInRange(quality, scenario.optimalDecision.qualityRange) ? 1.2 : 0.8
  const marketingScore = isInRange(marketing, scenario.optimalDecision.marketingRange) ? 1.2 : 0.8

  // Calculate demand factors
  const priceAttractiveness = Math.max(0, (2.0 - price) / 1.75) * priceScore
  const qualityFactor = (quality / 5) * qualityScore
  const marketingFactor = (1 + (actualMarketing / 50)) * marketingScore

  // Scenario-specific modifiers
  const weatherFactor = scenario.weatherEffect
  const scenarioMultiplier =
    scenario.deceptionLevel === 'high' ? 1.3 :
    scenario.deceptionLevel === 'medium' ? 1.1 : 1.0

  // Calculate final demand
  const demand = BASE_DEMAND * priceAttractiveness * qualityFactor * marketingFactor * weatherFactor * scenarioMultiplier

  // Cups sold capped by demand and max capacity
  const cupsSold = Math.min(Math.floor(demand), MAX_CAPACITY)

  return { cupsSold, actualMarketing }
}

// ============================================================================
// Financial Calculation
// ============================================================================

/**
 * Calculate the financial result given cups sold and player decisions.
 */
export function calculateFinancials(
  cupsSold: number,
  price: number,
  quality: number,
  actualMarketing: number
): { revenue: number; costs: number; profit: number } {
  const ingredientCost = BASE_INGREDIENT_COST * (QUALITY_MULTIPLIERS[quality - 1] ?? 1)

  const revenue = cupsSold * price
  const variableCosts = cupsSold * ingredientCost
  const totalCosts = FIXED_COSTS_PER_LEVEL + actualMarketing + variableCosts
  const profit = revenue - totalCosts

  return {
    revenue: roundCurrency(revenue),
    costs: roundCurrency(totalCosts),
    profit: roundCurrency(profit),
  }
}

// ============================================================================
// Full Simulation (combines demand + financials)
// ============================================================================

/**
 * Run the business simulation for a single level.
 * This is the same logic as simulateBusiness in game-store.ts.
 */
export function simulateBusiness(
  decision: GameDecision,
  budget: number,
  scenario: LevelScenario
): SimulationResult {
  const { cupsSold, actualMarketing } = calculateDemand(decision, budget, scenario)
  const { revenue, costs, profit } = calculateFinancials(
    cupsSold, decision.price, decision.quality, actualMarketing
  )

  return {
    cupsSold,
    revenue,
    costs,
    profit,
    feedback: [], // Feedback is generated separately in the store
  }
}
