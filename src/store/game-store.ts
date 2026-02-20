import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { auth, table } from '@/lib/supabase'
import { LEVEL_SCENARIOS } from '@/data/scenarios'

// ============================================================================
// Constants
// ============================================================================

/** Starting budget for every new player */
const STARTING_BUDGET = 500

/** Fixed costs deducted from the budget at each level (stand setup, permits, supplies) */
const FIXED_COSTS_PER_LEVEL = 20

/** Minimum budget required to continue playing. Below this threshold the game ends. */
const MINIMUM_OPERATING_BUDGET = 20

/** Maximum number of levels in the game */
const MAX_LEVEL = 50

/** Number of levels unlocked per camp day */
const LEVELS_PER_DAY = 10

/** Hour of the day (24-hour format) when new levels unlock */
const UNLOCK_HOUR = 7

/** Maximum cups that can be sold in a single level (capacity cap) */
const MAX_CAPACITY = 150

/** Base demand used in the demand formula before multipliers */
const BASE_DEMAND = 50

/** Cost of the cheapest possible cup (quality level 1) */
const BASE_INGREDIENT_COST = 0.10

/** Quality multipliers: index 0 = quality 1 (Basic), index 4 = quality 5 (Gourmet) */
const QUALITY_MULTIPLIERS: readonly number[] = [1.0, 1.2, 1.5, 2.0, 2.8] as const

// ============================================================================
// Interfaces
// ============================================================================

/** Player decisions for a single level */
export interface GameDecision {
  /** Price per cup ($0.25 - $2.00) */
  price: number
  /** Quality level (1-5 stars) */
  quality: number
  /** Marketing spend ($0 - $30) */
  marketing: number
}

/**
 * Scenario data for a single level.
 * Each of the 50 levels has a unique scenario with market conditions,
 * optimal decision ranges, and optional loan offers.
 */
export interface LevelScenario {
  /** Level number (1-50) */
  level: number
  /** Camp day this level belongs to (1-5) */
  day: number
  /** Short title for the scenario */
  title: string
  /** Narrative context (2-3 sentences describing the market situation) */
  story: string
  /** Strategic hint displayed to the player (subtle guidance) */
  hint: string
  /** Description of the target customer segment */
  targetMarket: string
  /** How deceptive or counter-intuitive the scenario is */
  deceptionLevel: 'low' | 'medium' | 'high'
  /** Optimal decision ranges the player should aim for */
  optimalDecision: {
    priceRange: [number, number]
    qualityRange: [number, number]
    marketingRange: [number, number]
  }
  /** Weather/foot-traffic multiplier applied to demand (0.5 - 1.4) */
  weatherEffect: number
  /** Short description of the market condition */
  marketCondition: string
  /** Loan offer available at this level, or null if none */
  loanOffer: LoanOffer | null
}

/** A loan offer presented to the player at specific levels */
export interface LoanOffer {
  /** Amount of money the player receives upon acceptance */
  amount: number
  /** Fixed repayment deducted from budget at the end of each subsequent level */
  repaymentPerLevel: number
  /** Total amount the player must repay (principal + interest) */
  totalRepayment: number
  /** Number of levels over which the loan is repaid */
  durationLevels: number
}

/** Tracks an active loan that the player is currently repaying */
export interface ActiveLoan {
  /** Original loan amount received */
  amount: number
  /** Fixed per-level repayment amount */
  repaymentPerLevel: number
  /** Remaining balance still owed */
  remainingBalance: number
  /** Number of repayment levels remaining */
  levelsRemaining: number
  /** Level at which the loan was accepted */
  acceptedAtLevel: number
  /** Total repayment obligation (principal + interest) */
  totalRepayment: number
}

/** Historical record of a completed or defaulted loan */
export interface LoanRecord {
  /** Original loan amount received */
  amount: number
  /** Fixed per-level repayment amount */
  repaymentPerLevel: number
  /** Total repayment obligation (principal + interest) */
  totalRepayment: number
  /** Number of levels the loan was scheduled over */
  durationLevels: number
  /** Level at which the loan was accepted */
  acceptedAtLevel: number
  /** Level at which the loan was fully repaid, or the player's game ended */
  settledAtLevel: number
  /** Whether the loan was fully repaid or ended due to game over */
  status: 'repaid' | 'defaulted'
}

/** Complete result breakdown for a single completed level */
export interface LevelResult {
  /** Level number (1-50) */
  level: number
  /** Title of the scenario played */
  scenario: string
  /** The player's decisions for this level */
  decisions: GameDecision
  /** Number of cups sold */
  cupsSold: number
  /** Gross revenue earned (cups sold * price) */
  revenue: number
  /** Total costs incurred (fixed + marketing + variable ingredient costs) */
  costs: number
  /** Net profit before loan repayment (revenue - costs) */
  profit: number
  /** Player's budget after all calculations for this level */
  budgetAfter: number
  /** Loan repayment amount deducted this level (0 if no active loan) */
  loanRepaymentDeducted: number
  /** Whether a loan was accepted at the start of this level */
  loanAcceptedThisLevel: boolean
  /** Amount of loan received this level (0 if none) */
  loanAmountReceived: number
  /** Feedback messages explaining what happened */
  feedback: string[]
  /** ISO timestamp of when this level was completed */
  timestamp: string
}

/**
 * Represents a single player in the game.
 * Each player has their own budget, level progression, loan state, and statistics.
 */
export interface Player {
  /** Unique player identifier */
  id: string
  /** Display name chosen by the player */
  name: string
  /** ID of the game room this player belongs to */
  roomId: string

  // -- Progression --
  /** The next level the player should play (1-50) */
  currentLevel: number
  /** Array of level numbers the player has completed */
  completedLevels: number[]
  /** Current available budget (starts at $500) */
  budget: number

  // -- Cumulative Statistics --
  /** Sum of net profit across all completed levels */
  totalProfit: number
  /** Sum of gross revenue across all completed levels */
  totalRevenue: number
  /** Sum of cups sold across all completed levels */
  totalCupsSold: number
  /** Highest budget the player has ever reached */
  peakBudget: number
  /** Lowest budget the player has ever reached */
  lowestBudget: number

  // -- Loan State --
  /** Currently active loan being repaid, or null if no active loan */
  activeLoan: ActiveLoan | null
  /** Historical record of all loans accepted */
  loanHistory: LoanRecord[]

  // -- Level History --
  /** Detailed results for every completed level */
  levelResults: LevelResult[]

  // -- Status --
  /** Whether the player's business has closed (budget fell below minimum) */
  isGameOver: boolean
  /** The level at which the game ended, or null if still playing */
  gameOverAtLevel: number | null
}

/** Simulation result returned by the business simulation engine */
export interface SimulationResult {
  /** Number of cups sold this level */
  cupsSold: number
  /** Gross revenue (cups sold * price) */
  revenue: number
  /** Total costs (fixed + marketing + variable) */
  costs: number
  /** Net profit (revenue - costs), before loan repayment */
  profit: number
  /** Feedback messages for the player */
  feedback: string[]
}

/** A game room that contains players and configuration */
export interface GameRoom {
  /** Unique room identifier / join code */
  id: string
  /** Display name for the room */
  name: string
  /** All players in this room */
  players: Player[]
  /** When the room was created (Unix timestamp) */
  createdAt: number
  /** Whether the room is currently accepting play */
  isActive: boolean
  /** The date the camp starts, used for level unlock calculations (ISO date string, e.g. "2026-07-13") */
  campStartDate: string
}

/** Facilitator / room creator credentials */
interface User {
  uid: string
  email: string
  name: string
}

/**
 * Leaderboard entry returned by getLeaderboard().
 * Contains the player and their rank.
 */
export interface LeaderboardEntry {
  /** Position on the leaderboard (1-based) */
  rank: number
  /** The player this entry represents */
  player: Player
}

// ============================================================================
// Game State Interface
// ============================================================================

export interface GameState {
  // -- Current player session state --
  /** The decision the current player is configuring for the active level */
  currentDecision: GameDecision
  /** Result of the most recent simulation, or null if none yet */
  lastSimulationResult: SimulationResult | null
  /** Whether a simulation is currently running */
  isSimulating: boolean
  /** The scenario for the level the player is currently viewing */
  currentScenario: LevelScenario | null

  // -- Authentication state --
  /** Logged-in facilitator / room creator */
  user: User | null
  /** Whether a facilitator is authenticated */
  isAuthenticated: boolean
  /** Whether authentication is in progress */
  isAuthenticating: boolean

  // -- Game room state --
  /** The room the current user has joined or created */
  currentGameRoom: GameRoom | null
  /** All rooms visible to the current user */
  availableGameRooms: GameRoom[]
  /** Whether rooms are being loaded from the backend */
  isLoadingRooms: boolean

  // -- Player state (within current room) --
  /** All players in the current game room */
  players: Player[]
  /** The currently selected / active player */
  currentPlayer: Player | null

  // -- Real-time subscription state --
  /** Unsubscribe function for the active room subscription, or null if not subscribed */
  _roomUnsubscribe: (() => void) | null

  // -- Room join error state --
  /** Error message displayed when joining a room fails */
  roomJoinError: string | null

  // ========================================================================
  // Actions
  // ========================================================================

  // -- Decision actions --
  /** Update one or more fields of the current decision */
  updateDecision: (decision: Partial<GameDecision>) => void

  // -- Level / scenario actions --
  /** Get the scenario for a specific level (1-50) */
  getLevelScenario: (level: number) => LevelScenario
  /**
   * Determine whether a given level is currently unlocked.
   * Levels 1-10 unlock on camp day 1 at 7AM, 11-20 on day 2, etc.
   * Previous days' levels remain accessible.
   */
  isLevelUnlocked: (level: number, campStartDate?: string) => boolean

  // -- Simulation actions --
  /** Run the business simulation for the current player's active level */
  runSimulation: () => void

  // -- Loan actions --
  /** Accept the loan offer for the current level (adds funds to budget) */
  acceptLoan: () => void
  /** Decline the loan offer for the current level (no-op on budget) */
  declineLoan: () => void

  // -- Game lifecycle --
  /** Reset the current player's game to initial state */
  resetGame: () => void
  /** Advance the current player to the next level */
  advanceToNextLevel: () => void

  // -- Authentication actions --
  /** Send a one-time password to the given email */
  sendOTP: (email: string) => Promise<void>
  /** Verify the OTP and sign in */
  verifyOTP: (email: string, code: string) => Promise<void>
  /** Sign out the current facilitator */
  logout: () => Promise<void>

  // -- Game room management --
  /** Create a new game room with the given name and camp start date */
  createGameRoom: (name: string, campStartDate: string) => Promise<string>
  /** Join an existing room by its ID / join code */
  joinGameRoom: (roomId: string) => Promise<boolean>
  /** Leave the current game room */
  leaveGameRoom: () => void
  /** Load all available game rooms from the backend */
  loadGameRooms: () => Promise<void>
  /** Refresh the current room's data from the backend */
  refreshCurrentRoom: () => Promise<void>
  /** Find a room in the local cache by its ID */
  getGameRoomById: (roomId: string) => GameRoom | null

  // -- Player management --
  /** Register a new player in the current room with the given display name */
  addPlayer: (name: string) => Promise<void>
  /** Select an existing player as the active player */
  selectPlayer: (playerId: string) => void

  // -- Leaderboard --
  /**
   * Get the leaderboard for the current room.
   * Players are sorted by: totalProfit (desc), totalRevenue (desc),
   * totalCupsSold (desc), then levels completed (desc).
   */
  getLeaderboard: () => LeaderboardEntry[]
  /** Clear all players from the current room (facilitator action) */
  clearLeaderboard: () => void

  // -- Real-time subscription --
  /** Subscribe to real-time updates for the current game room */
  subscribeToRoom: () => void
  /** Unsubscribe from real-time room updates */
  unsubscribeFromRoom: () => void

  // -- Backend sync --
  /** Persist the current player list to the backend */
  updateRoomInBackend: (updatedPlayers: Player[]) => Promise<void>
  /** Debounced version of updateRoomInBackend with retry on failure */
  debouncedSync: (updatedPlayers: Player[]) => void
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a numeric value falls within an inclusive range.
 * Used to determine whether a player's decision matches the scenario's optimal range.
 */
const isInRange = (value: number, range: [number, number]): boolean => {
  return value >= range[0] && value <= range[1]
}

/**
 * Round a number to two decimal places to avoid floating-point drift.
 * Uses the "multiply, round, divide" pattern for reliable cent-precision.
 */
const roundCurrency = (value: number): number => {
  return Math.round(value * 100) / 100
}

/**
 * Generate a human-readable room ID that is easy to share verbally.
 * Format: AdjectiveNoun + 4 random digits (e.g. "CoolLemons4821").
 */
const generateGameRoomId = (): string => {
  const adjectives = ['Cool', 'Fast', 'Smart', 'Bright', 'Sweet', 'Fresh', 'Happy', 'Lucky', 'Super', 'Epic']
  const nouns = ['Lemons', 'Stand', 'Market', 'Juice', 'Booth', 'Corner', 'Shop', 'Spot', 'Zone', 'Hub']
  const numbers = Math.floor(Math.random() * 9000) + 1000

  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]

  return `${randomAdjective}${randomNoun}${numbers}`
}

/**
 * Create a new Player object with default starting values.
 * Every player begins with the same budget and at level 1.
 */
const createNewPlayer = (id: string, name: string, roomId: string): Player => ({
  id,
  name: name.trim(),
  roomId,
  currentLevel: 1,
  completedLevels: [],
  budget: STARTING_BUDGET,
  totalProfit: 0,
  totalRevenue: 0,
  totalCupsSold: 0,
  peakBudget: STARTING_BUDGET,
  lowestBudget: STARTING_BUDGET,
  activeLoan: null,
  loanHistory: [],
  levelResults: [],
  isGameOver: false,
  gameOverAtLevel: null,
})

/**
 * Calculate the camp day number (1-5) from the current date and camp start date.
 * Returns the number of calendar days elapsed since the start date, plus 1.
 * Minimum return value is 1. If the current date is before the start, returns 0.
 */
const getCampDay = (campStartDate: string): number => {
  const now = new Date()
  const start = new Date(campStartDate)

  // Normalize both to UTC midnight to avoid timezone inconsistencies
  // (new Date(string) parses as UTC, new Date(y,m,d) parses as local)
  const nowMidnight = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const startMidnight = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())

  const diffMs = nowMidnight - startMidnight
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Camp hasn't started yet
  if (diffDays < 0) return 0

  // Day 1 = first day, Day 5 = last day
  return diffDays + 1
}

/**
 * Determine whether a given level is unlocked based on the camp schedule.
 *
 * Levels 1-10 unlock on camp day 1 at 7:00 AM.
 * Levels 11-20 unlock on camp day 2 at 7:00 AM.
 * ...and so on up to levels 41-50 on day 5.
 *
 * Previous days' levels remain accessible (catch-up is allowed).
 *
 * @param level - The level to check (1-50)
 * @param campStartDate - ISO date string for the camp start (e.g. "2026-07-13")
 * @returns True if the level is currently playable
 */
const checkLevelUnlocked = (level: number, campStartDate: string): boolean => {
  if (level < 1 || level > MAX_LEVEL) return false

  const now = new Date()
  const campDay = getCampDay(campStartDate)
  const levelDay = Math.ceil(level / LEVELS_PER_DAY) // Level 1-10 = Day 1, 11-20 = Day 2, etc.

  // The camp day for this level hasn't arrived yet
  if (levelDay > campDay) return false

  // If this is today's batch, check the 7AM gate
  if (levelDay === campDay && now.getHours() < UNLOCK_HOUR) return false

  // Level's day has passed, or it's today and past 7AM
  return true
}

// ============================================================================
// Business Simulation Engine
// ============================================================================

/**
 * Run the business simulation for a single level.
 *
 * The demand calculation formula is preserved exactly from v1:
 *   baseDemand = 50
 *   priceScore = price in optimal range ? 1.2 : 0.8
 *   qualityScore = quality in optimal range ? 1.2 : 0.8
 *   marketingScore = marketing in optimal range ? 1.2 : 0.8
 *   priceAttractiveness = ((2.0 - price) / 1.75) * priceScore
 *   qualityFactor = (quality / 5) * qualityScore
 *   marketingFactor = (1 + (marketing / 50)) * marketingScore
 *   weatherEffect = scenario.weatherEffect
 *   scenarioMultiplier = 1.0 | 1.1 | 1.3 based on deceptionLevel
 *   finalDemand = baseDemand * priceAttractiveness * qualityFactor * marketingFactor * weatherEffect * scenarioMultiplier
 *   cupsSold = min(floor(finalDemand), 150)
 *
 * Financial calculation:
 *   revenue = cupsSold * price
 *   ingredientCost = cupsSold * (baseIngredientCost * qualityMultiplier)
 *   totalCosts = fixedCosts + marketing + ingredientCost
 *   profit = revenue - totalCosts
 *
 * @param decision - The player's price, quality, and marketing choices
 * @param budget - The player's current budget before this level
 * @param scenario - The scenario for the current level
 * @returns The simulation result with cups sold, revenue, costs, profit, and feedback
 */
const simulateBusiness = (
  decision: GameDecision,
  budget: number,
  scenario: LevelScenario
): SimulationResult => {
  const { price, quality, marketing } = decision

  // Variable cost per cup based on quality selection
  const ingredientCost = BASE_INGREDIENT_COST * (QUALITY_MULTIPLIERS[quality - 1] ?? 1)

  // Cap marketing spend to what the player can actually afford after fixed costs
  const actualMarketing = Math.min(marketing, Math.max(0, budget - FIXED_COSTS_PER_LEVEL))

  // Check how well each decision matches the scenario's optimal ranges
  const priceScore = isInRange(price, scenario.optimalDecision.priceRange) ? 1.2 : 0.8
  const qualityScore = isInRange(quality, scenario.optimalDecision.qualityRange) ? 1.2 : 0.8
  const marketingScore = isInRange(marketing, scenario.optimalDecision.marketingRange) ? 1.2 : 0.8

  // Calculate demand factors (formula preserved exactly from v1)
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

  // Financial calculations
  const revenue = cupsSold * price
  const variableCosts = cupsSold * ingredientCost
  const totalCosts = FIXED_COSTS_PER_LEVEL + actualMarketing + variableCosts
  const profit = revenue - totalCosts

  // Generate contextual feedback
  const feedback = generateScenarioFeedback(decision, scenario, profit, cupsSold)

  return {
    cupsSold,
    revenue: roundCurrency(revenue),
    costs: roundCurrency(totalCosts),
    profit: roundCurrency(profit),
    feedback,
  }
}

/**
 * Process loan repayment for a player at the end of a level.
 * Deducts the per-level repayment from the player's budget and updates
 * the loan's remaining balance and levels remaining.
 *
 * If the loan is fully repaid, it is moved to loanHistory and activeLoan is cleared.
 *
 * @param player - The player whose loan to process (mutated in place by the caller via spread)
 * @param currentLevel - The level number where this repayment occurs
 * @returns The amount deducted as repayment (0 if no active loan)
 */
const processLoanRepayment = (
  player: Player,
  currentLevel: number
): { repaymentAmount: number; updatedLoan: ActiveLoan | null; newLoanRecord: LoanRecord | null } => {
  if (!player.activeLoan) {
    return { repaymentAmount: 0, updatedLoan: null, newLoanRecord: null }
  }

  const repaymentAmount = player.activeLoan.repaymentPerLevel

  const updatedLoan: ActiveLoan = {
    ...player.activeLoan,
    remainingBalance: roundCurrency(player.activeLoan.remainingBalance - repaymentAmount),
    levelsRemaining: player.activeLoan.levelsRemaining - 1,
  }

  // Check if the loan is fully repaid
  if (updatedLoan.remainingBalance <= 0 || updatedLoan.levelsRemaining <= 0) {
    const loanRecord: LoanRecord = {
      amount: player.activeLoan.amount,
      repaymentPerLevel: player.activeLoan.repaymentPerLevel,
      totalRepayment: player.activeLoan.totalRepayment,
      durationLevels: Math.round(player.activeLoan.totalRepayment / player.activeLoan.repaymentPerLevel),
      acceptedAtLevel: player.activeLoan.acceptedAtLevel,
      settledAtLevel: currentLevel,
      status: 'repaid',
    }
    return { repaymentAmount, updatedLoan: null, newLoanRecord: loanRecord }
  }

  return { repaymentAmount, updatedLoan, newLoanRecord: null }
}

// ============================================================================
// Feedback Generation
// ============================================================================

/**
 * Generate scenario-specific feedback messages that explain what happened
 * and teach the player about their decision quality.
 */
const generateScenarioFeedback = (
  decision: GameDecision,
  scenario: LevelScenario,
  profit: number,
  cupsSold: number
): string[] => {
  const { price, quality, marketing } = decision
  const feedback: string[] = []

  // Scenario context
  feedback.push(`**${scenario.title}**: ${scenario.marketCondition}`)

  // Cost analysis
  const qualityCosts = ['$0.10', '$0.12', '$0.15', '$0.20', '$0.28']
  feedback.push(`**Cost Analysis**: Quality ${quality}/5 costs ${qualityCosts[quality - 1]} per cup to make`)

  // Decision analysis based on optimal ranges
  const priceOptimal = isInRange(price, scenario.optimalDecision.priceRange)
  const qualityOptimal = isInRange(quality, scenario.optimalDecision.qualityRange)
  const marketingOptimal = isInRange(marketing, scenario.optimalDecision.marketingRange)

  if (priceOptimal && qualityOptimal && marketingOptimal) {
    feedback.push('**Perfect Strategy!** You read the market exactly right!')
  } else if (priceOptimal || qualityOptimal || marketingOptimal) {
    feedback.push('**Good Instincts!** Some of your decisions hit the target.')
  } else {
    feedback.push('**Learning Opportunity!** The market wanted something different.')
  }

  // Specific decision feedback
  if (!priceOptimal) {
    if (price < scenario.optimalDecision.priceRange[0]) {
      feedback.push(`Your price ($${price.toFixed(2)}) was too low for this market.`)
    } else {
      feedback.push(`Your price ($${price.toFixed(2)}) was too high for this market.`)
    }
  }

  if (!qualityOptimal) {
    if (quality < scenario.optimalDecision.qualityRange[0]) {
      feedback.push(`This market needed higher quality (${quality}/5 wasn't enough).`)
    } else {
      feedback.push(`You over-invested in quality for this market (${quality}/5 cost too much: ${qualityCosts[quality - 1]}/cup).`)
    }
  }

  if (!marketingOptimal) {
    if (marketing < scenario.optimalDecision.marketingRange[0]) {
      feedback.push(`This market needed more marketing buzz ($${marketing} wasn't enough).`)
    } else {
      feedback.push(`You over-spent on marketing ($${marketing} was more than needed).`)
    }
  }

  // Profit feedback
  if (profit > 50) {
    feedback.push('**Outstanding profit!** You mastered this market challenge!')
  } else if (profit > 25) {
    feedback.push('**Solid profit!** Good job navigating this scenario.')
  } else if (profit > 0) {
    feedback.push('**Small profit.** You survived this tricky market!')
  } else if (profit > -20) {
    feedback.push('**Small loss.** Deceptive markets teach valuable lessons!')
  } else {
    feedback.push('**Big loss!** This market was trickier than it seemed.')
  }

  return feedback
}

// ============================================================================
// Debounced Backend Sync (module-level timers, shared across store)
// ============================================================================

/**
 * Timeout handle for the debounced sync. Cleared and reset on every new
 * sync request so that rapid state changes coalesce into a single backend write.
 */
let syncTimeout: ReturnType<typeof setTimeout> | null = null

/**
 * Timeout handle for the current retry after a failed sync attempt.
 * Only one retry chain runs at a time; starting a new debounced sync
 * does NOT cancel an in-flight retry so it can finish independently.
 */
let retryTimeout: ReturnType<typeof setTimeout> | null = null

/** Exponential backoff delays for sync retries (in milliseconds). */
const SYNC_RETRY_DELAYS = [1000, 2000, 4000] as const

// ============================================================================
// Zustand Store
// ============================================================================

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      // ====================================================================
      // Initial State
      // ====================================================================

      currentDecision: {
        price: 1.00,
        quality: 3,
        marketing: 10,
      },
      lastSimulationResult: null,
      isSimulating: false,
      currentScenario: LEVEL_SCENARIOS.length > 0 ? (LEVEL_SCENARIOS[0] ?? null) : null,

      // Authentication
      user: null,
      isAuthenticated: false,
      isAuthenticating: false,

      // Game room
      currentGameRoom: null,
      availableGameRooms: [],
      isLoadingRooms: false,

      // Players
      players: [],
      currentPlayer: null,

      // Real-time subscription
      _roomUnsubscribe: null,

      // Room join error
      roomJoinError: null,

      // ====================================================================
      // Decision Actions
      // ====================================================================

      updateDecision: (decision) => set((state) => ({
        currentDecision: { ...state.currentDecision, ...decision },
      })),

      // ====================================================================
      // Level / Scenario Actions
      // ====================================================================

      getLevelScenario: (level: number): LevelScenario => {
        // Levels are 1-indexed; LEVEL_SCENARIOS array is 0-indexed
        const index = level - 1
        if (index >= 0 && index < LEVEL_SCENARIOS.length) {
          return LEVEL_SCENARIOS[index]!
        }

        // Fallback: return the last available scenario if level exceeds data
        // This should not happen with a properly populated scenarios file
        if (LEVEL_SCENARIOS.length > 0) {
          return LEVEL_SCENARIOS[LEVEL_SCENARIOS.length - 1]!
        }

        // Emergency fallback if scenarios haven't been loaded yet
        return {
          level,
          day: Math.ceil(level / LEVELS_PER_DAY),
          title: `Level ${level}`,
          story: 'A new business day awaits!',
          hint: 'Read the market carefully.',
          targetMarket: 'General public',
          deceptionLevel: 'low',
          optimalDecision: {
            priceRange: [0.75, 1.25],
            qualityRange: [2, 4],
            marketingRange: [5, 20],
          },
          weatherEffect: 1.0,
          marketCondition: 'Normal conditions',
          loanOffer: null,
        }
      },

      isLevelUnlocked: (level: number, campStartDate?: string): boolean => {
        const { currentGameRoom } = get()
        const startDate = campStartDate || currentGameRoom?.campStartDate

        // If no camp start date is configured, all levels are accessible
        // (useful for testing / single-player mode without a room)
        if (!startDate) return level >= 1 && level <= MAX_LEVEL

        return checkLevelUnlocked(level, startDate)
      },

      // ====================================================================
      // Simulation
      // ====================================================================

      runSimulation: () => {
        const { currentPlayer, currentDecision, players, currentGameRoom, availableGameRooms } = get()

        if (!currentPlayer || currentPlayer.isGameOver) return
        if (currentPlayer.budget < FIXED_COSTS_PER_LEVEL) return

        set({ isSimulating: true })

        // Simulate processing time for dramatic effect (1.5 seconds)
        setTimeout(() => {
          // Re-read state inside timeout to get the latest values
          // (the player may have accepted a loan between clicking "run" and this executing)
          const freshState = get()
          const freshPlayer = freshState.currentPlayer
          if (!freshPlayer) {
            set({ isSimulating: false })
            return
          }

          const level = freshPlayer.currentLevel
          const scenario = freshState.getLevelScenario(level)
          const budgetBeforeSimulation = freshPlayer.budget

          // Run the core business simulation
          const result = simulateBusiness(freshState.currentDecision, budgetBeforeSimulation, scenario)

          // Calculate budget after profit/loss
          let newBudget = roundCurrency(budgetBeforeSimulation + result.profit)

          // Process loan repayment (deducted after profit calculation)
          const loanResult = processLoanRepayment(freshPlayer, level)
          newBudget = roundCurrency(newBudget - loanResult.repaymentAmount)

          // Build the level result record
          const levelResult: LevelResult = {
            level,
            scenario: scenario.title,
            decisions: { ...freshState.currentDecision },
            cupsSold: result.cupsSold,
            revenue: result.revenue,
            costs: result.costs,
            profit: result.profit,
            budgetAfter: newBudget,
            loanRepaymentDeducted: loanResult.repaymentAmount,
            loanAcceptedThisLevel: false, // Will be true if acceptLoan was called before simulation
            loanAmountReceived: 0,
            feedback: result.feedback,
            timestamp: new Date().toISOString(),
          }

          // Check for any loan that was accepted this level (reflected in the player's loan state)
          if (freshPlayer.activeLoan && freshPlayer.activeLoan.acceptedAtLevel === level) {
            levelResult.loanAcceptedThisLevel = true
            levelResult.loanAmountReceived = freshPlayer.activeLoan.amount
          }

          // Determine if the game is over
          const isGameOver = newBudget < MINIMUM_OPERATING_BUDGET

          // Build the updated player
          const updatedPlayer: Player = {
            ...freshPlayer,
            budget: newBudget,
            completedLevels: [...freshPlayer.completedLevels, level],
            currentLevel: isGameOver ? level : Math.min(level + 1, MAX_LEVEL + 1),
            totalProfit: roundCurrency(freshPlayer.totalProfit + result.profit - loanResult.repaymentAmount),
            totalRevenue: roundCurrency(freshPlayer.totalRevenue + result.revenue),
            totalCupsSold: freshPlayer.totalCupsSold + result.cupsSold,
            peakBudget: Math.max(freshPlayer.peakBudget, newBudget),
            lowestBudget: Math.min(freshPlayer.lowestBudget, newBudget),
            activeLoan: loanResult.updatedLoan,
            loanHistory: loanResult.newLoanRecord
              ? [...freshPlayer.loanHistory, loanResult.newLoanRecord]
              : freshPlayer.loanHistory,
            levelResults: [...freshPlayer.levelResults, levelResult],
            isGameOver,
            gameOverAtLevel: isGameOver ? level : null,
          }

          // Update the player in the players array
          const updatedPlayers = freshState.players.map(p =>
            p.id === updatedPlayer.id ? updatedPlayer : p
          )

          // Update the room's player list
          let updatedRooms = freshState.availableGameRooms
          let updatedCurrentRoom = freshState.currentGameRoom

          if (updatedCurrentRoom) {
            updatedCurrentRoom = { ...updatedCurrentRoom, players: updatedPlayers }
            updatedRooms = freshState.availableGameRooms.map(room =>
              room.id === updatedCurrentRoom!.id
                ? { ...room, players: updatedPlayers }
                : room
            )
          }

          set({
            lastSimulationResult: result,
            isSimulating: false,
            players: updatedPlayers,
            currentPlayer: updatedPlayer,
            currentGameRoom: updatedCurrentRoom,
            availableGameRooms: updatedRooms,
          })

          // Persist to backend asynchronously via debounced sync (don't block UI)
          get().debouncedSync(updatedPlayers)
        }, 1500)
      },

      // ====================================================================
      // Loan Actions
      // ====================================================================

      acceptLoan: () => {
        const { currentPlayer, players, currentGameRoom, availableGameRooms } = get()

        if (!currentPlayer || currentPlayer.isGameOver) return

        // Cannot accept if already has an active loan
        if (currentPlayer.activeLoan) return

        const scenario = get().getLevelScenario(currentPlayer.currentLevel)
        if (!scenario.loanOffer) return

        const offer = scenario.loanOffer

        // Create the active loan
        const activeLoan: ActiveLoan = {
          amount: offer.amount,
          repaymentPerLevel: offer.repaymentPerLevel,
          remainingBalance: offer.totalRepayment,
          levelsRemaining: offer.durationLevels,
          acceptedAtLevel: currentPlayer.currentLevel,
          totalRepayment: offer.totalRepayment,
        }

        // Add loan amount to budget immediately
        const newBudget = roundCurrency(currentPlayer.budget + offer.amount)

        const updatedPlayer: Player = {
          ...currentPlayer,
          budget: newBudget,
          activeLoan,
          peakBudget: Math.max(currentPlayer.peakBudget, newBudget),
        }

        const updatedPlayers = players.map(p =>
          p.id === updatedPlayer.id ? updatedPlayer : p
        )

        let updatedCurrentRoom = currentGameRoom
        let updatedRooms = availableGameRooms
        if (updatedCurrentRoom) {
          updatedCurrentRoom = { ...updatedCurrentRoom, players: updatedPlayers }
          updatedRooms = availableGameRooms.map(room =>
            room.id === updatedCurrentRoom!.id
              ? { ...room, players: updatedPlayers }
              : room
          )
        }

        set({
          currentPlayer: updatedPlayer,
          players: updatedPlayers,
          currentGameRoom: updatedCurrentRoom,
          availableGameRooms: updatedRooms,
        })
      },

      declineLoan: () => {
        // No-op on state; the player simply does not receive the loan.
        // This action exists for UI clarity and potential analytics tracking.
      },

      // ====================================================================
      // Game Lifecycle
      // ====================================================================

      resetGame: () => {
        const { currentPlayer, players, currentGameRoom, availableGameRooms } = get()

        if (!currentPlayer) return

        const resetPlayer = createNewPlayer(currentPlayer.id, currentPlayer.name, currentPlayer.roomId)

        const updatedPlayers = players.map(p =>
          p.id === resetPlayer.id ? resetPlayer : p
        )

        let updatedCurrentRoom = currentGameRoom
        let updatedRooms = availableGameRooms
        if (updatedCurrentRoom) {
          updatedCurrentRoom = { ...updatedCurrentRoom, players: updatedPlayers }
          updatedRooms = availableGameRooms.map(room =>
            room.id === updatedCurrentRoom!.id
              ? { ...room, players: updatedPlayers }
              : room
          )
        }

        const firstScenario = get().getLevelScenario(1)

        set({
          currentPlayer: resetPlayer,
          players: updatedPlayers,
          currentDecision: { price: 1.00, quality: 3, marketing: 10 },
          lastSimulationResult: null,
          currentScenario: firstScenario,
          currentGameRoom: updatedCurrentRoom,
          availableGameRooms: updatedRooms,
        })

        get().debouncedSync(updatedPlayers)
      },

      advanceToNextLevel: () => {
        const { currentPlayer } = get()

        if (!currentPlayer || currentPlayer.isGameOver) return

        const nextLevel = currentPlayer.currentLevel
        if (nextLevel > MAX_LEVEL) return

        const nextScenario = get().getLevelScenario(nextLevel)

        set({
          lastSimulationResult: null,
          currentScenario: nextScenario,
          currentDecision: { price: 1.00, quality: 3, marketing: 10 },
        })
      },

      // ====================================================================
      // Authentication
      // ====================================================================

      sendOTP: async (email: string) => {
        set({ isAuthenticating: true })
        try {
          await auth.sendOTP(email)
        } catch (error) {
          console.error('Failed to send OTP:', error)
          throw error
        } finally {
          set({ isAuthenticating: false })
        }
      },

      verifyOTP: async (email: string, code: string) => {
        set({ isAuthenticating: true })
        try {
          const response = await auth.verifyOTP(email, code)
          set({
            user: {
              uid: response.user.uid,
              email: response.user.email,
              name: response.user.name,
            },
            isAuthenticated: true,
          })
        } catch (error) {
          console.error('Failed to verify OTP:', error)
          throw error
        } finally {
          set({ isAuthenticating: false })
        }
      },

      logout: async () => {
        try {
          // Unsubscribe from real-time updates before signing out
          get().unsubscribeFromRoom()

          // Cancel any pending sync timers so they don't fire after logout
          if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null }
          if (retryTimeout) { clearTimeout(retryTimeout); retryTimeout = null }

          await auth.logout()
          set({
            user: null,
            isAuthenticated: false,
            currentGameRoom: null,
            availableGameRooms: [],
            players: [],
            currentPlayer: null,
            roomJoinError: null,
          })
        } catch (error) {
          console.error('Failed to logout:', error)
          throw error
        }
      },

      // ====================================================================
      // Game Room Management
      // ====================================================================

      createGameRoom: async (name: string, campStartDate: string) => {
        const { isAuthenticated } = get()
        if (!isAuthenticated) {
          throw new Error('Authentication required to create game rooms')
        }

        const roomId = generateGameRoomId()
        const newRoom: GameRoom = {
          id: roomId,
          name: name.trim() || `Game Room ${roomId}`,
          players: [],
          createdAt: Date.now(),
          isActive: true,
          campStartDate,
        }

        // Set local state first so the app works even without backend
        set((state) => ({
          availableGameRooms: [...state.availableGameRooms, newRoom],
          currentGameRoom: newRoom,
          players: [],
          currentPlayer: null,
          lastSimulationResult: null,
          currentScenario: get().getLevelScenario(1),
        }))

        // Sync to backend (non-blocking)
        try {
          await table.addItem('game_rooms', {
            room_id: roomId,
            room_name: newRoom.name,
            players: JSON.stringify(newRoom.players),
            camp_start_date: campStartDate,
            created_at: newRoom.createdAt,
            last_updated: Date.now(),
          })
        } catch (error) {
          console.warn('Backend sync failed for createGameRoom (local-only mode):', error)
        }

        // Subscribe to real-time updates for the newly created room
        // so the facilitator can see players joining in real-time
        get().subscribeToRoom()

        return roomId
      },

      joinGameRoom: async (roomId: string) => {
        // Clear any previous join error
        set({ roomJoinError: null })

        // First check locally cached rooms
        const { availableGameRooms } = get()
        const localRoom = availableGameRooms.find(r => r.id === roomId)

        // Try backend first
        try {
          const response = await table.getItems('game_rooms', {
            query: { room_id: roomId },
          })

          if (response.items.length > 0) {
            const roomData = response.items[0]!
            const room: GameRoom = {
              id: roomData.room_id,
              name: roomData.room_name,
              players: JSON.parse(roomData.players || '[]'),
              createdAt: roomData.created_at,
              isActive: true,
              campStartDate: roomData.camp_start_date || '',
            }

            set((state) => ({
              currentGameRoom: room,
              players: room.players,
              currentPlayer: null,
              lastSimulationResult: null,
              currentScenario: get().getLevelScenario(1),
              availableGameRooms: state.availableGameRooms.some(r => r.id === room.id)
                ? state.availableGameRooms
                : [...state.availableGameRooms, room],
              roomJoinError: null,
            }))

            // Subscribe to real-time updates for this room
            get().subscribeToRoom()

            return true
          }
        } catch (error) {
          console.warn('Backend lookup failed, checking local rooms:', error)
        }

        // Fallback to locally cached room
        if (localRoom) {
          set({
            currentGameRoom: localRoom,
            players: localRoom.players,
            currentPlayer: null,
            lastSimulationResult: null,
            currentScenario: get().getLevelScenario(1),
            roomJoinError: null,
          })

          // Subscribe to real-time updates for the locally cached room
          get().subscribeToRoom()

          return true
        }

        // Room not found in backend or local cache
        set({ roomJoinError: 'Room not found. Double-check the room code and try again.' })
        return false
      },

      leaveGameRoom: () => {
        // Unsubscribe from real-time updates before leaving
        get().unsubscribeFromRoom()

        // Cancel any pending sync timers so they don't fire after leaving
        if (syncTimeout) { clearTimeout(syncTimeout); syncTimeout = null }
        if (retryTimeout) { clearTimeout(retryTimeout); retryTimeout = null }

        set({
          currentGameRoom: null,
          players: [],
          currentPlayer: null,
          lastSimulationResult: null,
          currentScenario: get().getLevelScenario(1),
          currentDecision: { price: 1.00, quality: 3, marketing: 10 },
          roomJoinError: null,
        })
      },

      loadGameRooms: async () => {
        set({ isLoadingRooms: true })
        try {
          const response = await table.getItems('game_rooms', {
            limit: 50,
            sort: 'last_updated',
            order: 'desc',
          })

          const rooms: GameRoom[] = response.items.map(item => ({
            id: item.room_id,
            name: item.room_name,
            players: JSON.parse(item.players || '[]'),
            createdAt: item.created_at,
            isActive: true,
            campStartDate: item.camp_start_date || '',
          }))

          set({ availableGameRooms: rooms })
        } catch (error) {
          console.error('Failed to load game rooms:', error)
        } finally {
          set({ isLoadingRooms: false })
        }
      },

      refreshCurrentRoom: async () => {
        const { currentGameRoom } = get()
        if (!currentGameRoom) return

        try {
          const response = await table.getItems('game_rooms', {
            query: { room_id: currentGameRoom.id },
          })

          if (response.items.length > 0) {
            const roomData = response.items[0]!
            const updatedRoom: GameRoom = {
              id: roomData.room_id,
              name: roomData.room_name,
              players: JSON.parse(roomData.players || '[]'),
              createdAt: roomData.created_at,
              isActive: true,
              campStartDate: roomData.camp_start_date || '',
            }

            set((state) => ({
              currentGameRoom: updatedRoom,
              players: updatedRoom.players,
              availableGameRooms: state.availableGameRooms.map(room =>
                room.id === updatedRoom.id ? updatedRoom : room
              ),
            }))
          }
        } catch (error) {
          console.error('Failed to refresh current room:', error)
        }
      },

      getGameRoomById: (roomId: string) => {
        const { availableGameRooms } = get()
        return availableGameRooms.find(r => r.id === roomId) || null
      },

      // ====================================================================
      // Player Management
      // ====================================================================

      addPlayer: async (name: string) => {
        const { players, currentGameRoom, availableGameRooms } = get()

        if (!currentGameRoom) {
          throw new Error('Cannot add player without a game room')
        }

        // ------------------------------------------------------------------
        // Reconnection: check if this player already exists in the room
        // ------------------------------------------------------------------

        // 1. Check for a stored player ID in localStorage (same browser tab/device)
        const storageKey = `lemon-player-${currentGameRoom.id}`
        const storedPlayerId = localStorage.getItem(storageKey)

        if (storedPlayerId) {
          const existingById = players.find(
            p => p.id === storedPlayerId && p.roomId === currentGameRoom.id
          )
          if (existingById) {
            // Resume the existing session — restore their scenario state
            const playerScenario = get().getLevelScenario(existingById.currentLevel)
            set({
              currentPlayer: existingById,
              currentScenario: playerScenario,
              currentDecision: { price: 1.00, quality: 3, marketing: 10 },
              lastSimulationResult: null,
            })
            return
          }
        }

        // 2. Fallback: check for an existing player by name (case-insensitive)
        //    in the same room. This handles the case where a player switches
        //    devices or clears their browser storage.
        const existingByName = players.find(
          p => p.name.toLowerCase() === name.trim().toLowerCase()
            && p.roomId === currentGameRoom.id
        )

        if (existingByName) {
          // Persist the association so subsequent visits reconnect by ID
          localStorage.setItem(storageKey, existingByName.id)
          const playerScenario = get().getLevelScenario(existingByName.currentLevel)
          set({
            currentPlayer: existingByName,
            currentScenario: playerScenario,
            currentDecision: { price: 1.00, quality: 3, marketing: 10 },
            lastSimulationResult: null,
          })
          return
        }

        // ------------------------------------------------------------------
        // No existing player found — create a new one
        // ------------------------------------------------------------------

        const playerId = `player-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newPlayer = createNewPlayer(playerId, name, currentGameRoom.id)

        // Store the new player ID so future visits reconnect automatically
        localStorage.setItem(storageKey, newPlayer.id)

        const updatedPlayers = [...players, newPlayer]

        // Update local state first so the app works immediately
        const updatedRooms = availableGameRooms.map(room =>
          room.id === currentGameRoom.id
            ? { ...room, players: updatedPlayers }
            : room
        )

        const firstScenario = get().getLevelScenario(1)

        set({
          players: updatedPlayers,
          currentPlayer: newPlayer,
          currentScenario: firstScenario,
          currentDecision: { price: 1.00, quality: 3, marketing: 10 },
          lastSimulationResult: null,
          availableGameRooms: updatedRooms,
          currentGameRoom: { ...currentGameRoom, players: updatedPlayers },
        })

        // Sync to backend (non-blocking)
        try {
          const roomQuery = await table.getItems('game_rooms', {
            query: { room_id: currentGameRoom.id },
          })

          if (roomQuery.items.length > 0) {
            const roomItem = roomQuery.items[0]!
            await table.updateItem('game_rooms', {
              _uid: roomItem._uid,
              _id: roomItem._id,
              room_id: currentGameRoom.id,
              players: JSON.stringify(updatedPlayers),
              last_updated: Date.now(),
            })
          }
        } catch (error) {
          console.warn('Backend sync failed for addPlayer (local-only mode):', error)
        }
      },

      selectPlayer: (playerId: string) => {
        const { players } = get()
        const player = players.find(p => p.id === playerId)

        if (player) {
          const playerScenario = get().getLevelScenario(player.currentLevel)
          set({
            currentPlayer: player,
            currentScenario: playerScenario,
            currentDecision: { price: 1.00, quality: 3, marketing: 10 },
            lastSimulationResult: null,
          })
        }
      },

      // ====================================================================
      // Leaderboard
      // ====================================================================

      getLeaderboard: (): LeaderboardEntry[] => {
        const { players } = get()

        const sorted = [...players].sort((a, b) => {
          // Primary: total profit (descending)
          if (b.totalProfit !== a.totalProfit) {
            return b.totalProfit - a.totalProfit
          }
          // Secondary: total revenue (descending)
          if (b.totalRevenue !== a.totalRevenue) {
            return b.totalRevenue - a.totalRevenue
          }
          // Tertiary: total cups sold (descending)
          if (b.totalCupsSold !== a.totalCupsSold) {
            return b.totalCupsSold - a.totalCupsSold
          }
          // Quaternary: levels completed (descending)
          return b.completedLevels.length - a.completedLevels.length
        })

        return sorted.map((player, index) => ({
          rank: index + 1,
          player,
        }))
      },

      clearLeaderboard: () => {
        const { currentGameRoom, availableGameRooms } = get()

        if (currentGameRoom) {
          const updatedRooms = availableGameRooms.map(room =>
            room.id === currentGameRoom.id
              ? { ...room, players: [] }
              : room
          )

          set({
            players: [],
            currentPlayer: null,
            availableGameRooms: updatedRooms,
            currentGameRoom: { ...currentGameRoom, players: [] },
          })
        } else {
          set({
            players: [],
            currentPlayer: null,
          })
        }
      },

      // ====================================================================
      // Real-Time Subscription (BACK-001)
      // ====================================================================

      subscribeToRoom: () => {
        const { currentGameRoom, _roomUnsubscribe } = get()
        if (!currentGameRoom) return

        // Tear down any existing subscription before creating a new one
        if (_roomUnsubscribe) {
          _roomUnsubscribe()
        }

        const roomId = currentGameRoom.id

        const channel = table.subscribe('game_rooms', (payload: any) => {
          const updatedRow = payload.new ?? payload
          // Safety check: skip if the payload is for a different room
          // (should not happen with server-side filter, but defense-in-depth)
          if (updatedRow.room_id !== roomId) return

          try {
            const remotePlayers: Player[] = JSON.parse(updatedRow.players || '[]')
            const { currentPlayer, players } = get()

            // Merge remote players with local state. If we have a current
            // player active, preserve their local state to avoid overwriting
            // in-flight decisions.
            const mergedPlayers = remotePlayers.map((remotePlayer) => {
              if (currentPlayer && remotePlayer.id === currentPlayer.id) {
                // Keep the local player's state (they are the authoritative source)
                return currentPlayer
              }
              // For all other players, accept the remote state
              const localPlayer = players.find(p => p.id === remotePlayer.id)
              return localPlayer
                ? { ...localPlayer, ...remotePlayer }
                : remotePlayer
            })

            // Also check if the current player was removed remotely
            // (e.g., facilitator cleared the room).
            const currentPlayerStillExists = currentPlayer
              ? mergedPlayers.some(p => p.id === currentPlayer.id)
              : false

            set((state) => ({
              players: mergedPlayers,
              currentGameRoom: state.currentGameRoom
                ? { ...state.currentGameRoom, players: mergedPlayers }
                : null,
              currentPlayer: currentPlayerStillExists ? state.currentPlayer : null,
            }))
          } catch (error) {
            console.error('Failed to process real-time room update:', error)
          }
        }, roomId)

        // Store the unsubscribe function
        const unsubscribe = () => {
          channel.unsubscribe()
        }

        set({ _roomUnsubscribe: unsubscribe })
      },

      unsubscribeFromRoom: () => {
        const { _roomUnsubscribe } = get()
        if (_roomUnsubscribe) {
          _roomUnsubscribe()
          set({ _roomUnsubscribe: null })
        }
      },

      // ====================================================================
      // Backend Sync (BACK-005: debounced with retry)
      // ====================================================================

      updateRoomInBackend: async (updatedPlayers: Player[]) => {
        const { currentGameRoom } = get()
        if (!currentGameRoom) return

        try {
          const roomQuery = await table.getItems('game_rooms', {
            query: { room_id: currentGameRoom.id },
          })

          if (roomQuery.items.length > 0) {
            const roomItem = roomQuery.items[0]!
            await table.updateItem('game_rooms', {
              _uid: roomItem._uid,
              _id: roomItem._id,
              room_id: currentGameRoom.id,
              players: JSON.stringify(updatedPlayers),
              last_updated: Date.now(),
            })
          }
        } catch (error) {
          console.error('Failed to update room in backend:', error)
          throw error
        }
      },

      /**
       * Debounced backend sync: coalesces rapid state changes into a single
       * write after a 2-second quiet period. On failure, retries up to 3
       * times with exponential backoff (1s, 2s, 4s).
       */
      debouncedSync: (_updatedPlayers: Player[]) => {
        // Only cancel the pending primary sync; let any in-flight retry
        // complete independently so a failed sync still gets its retry.
        if (syncTimeout) clearTimeout(syncTimeout)

        syncTimeout = setTimeout(() => {
          // Read fresh state at execution time to avoid stale closure data
          const latestPlayers = get().players
          get().updateRoomInBackend(latestPlayers).catch((error) => {
            console.warn('Backend sync failed, starting retry chain:', error)
            // Launch retry chain with exponential backoff
            const scheduleRetry = (attempt: number): void => {
              if (attempt >= SYNC_RETRY_DELAYS.length) {
                console.error(`Backend sync failed after ${SYNC_RETRY_DELAYS.length} retries. Continuing with local state.`)
                return
              }
              retryTimeout = setTimeout(() => {
                const { players: retryPlayers } = get()
                get().updateRoomInBackend(retryPlayers).catch((retryError) => {
                  console.warn(`Backend sync retry ${attempt + 1} failed:`, retryError)
                  scheduleRetry(attempt + 1)
                })
              }, SYNC_RETRY_DELAYS[attempt])
            }
            scheduleRetry(0)
          })
        }, 2000)
      },
    }),
    {
      name: 'lemonade-game-storage-v2',
      partialize: (state) => ({
        // Persist authentication
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        // Persist current room and player selection
        currentGameRoom: state.currentGameRoom,
        players: state.players,
        currentPlayer: state.currentPlayer,
      }),
      onRehydrateStorage: () => {
        // Called after Zustand restores persisted state from localStorage.
        // If a game room was active before the page refresh, re-establish
        // the real-time subscription so the player continues receiving updates.
        return (state) => {
          if (state?.currentGameRoom) {
            state.subscribeToRoom()
          }
        }
      },
    }
  )
)
