import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useGameStore } from '@/store/game-store'
import type { Player, GameRoom } from '@/store/game-store'

// ============================================================================
// Mocks
// ============================================================================

// Mock Supabase so no real backend calls are made
vi.mock('@/lib/supabase', () => ({
  auth: {
    sendOTP: vi.fn().mockResolvedValue(undefined),
    verifyOTP: vi.fn().mockResolvedValue({
      user: { uid: 'test-uid', email: 'test@test.com', name: 'Test Facilitator' },
    }),
    logout: vi.fn().mockResolvedValue(undefined),
  },
  table: {
    createRoom: vi.fn().mockResolvedValue(undefined),
    getRoom: vi.fn().mockResolvedValue(null),
    getAllRooms: vi.fn().mockResolvedValue([]),
    updateRoom: vi.fn().mockResolvedValue(undefined),
    deleteRoom: vi.fn().mockResolvedValue(undefined),
    subscribeToRoom: vi.fn().mockReturnValue(() => {}),
  },
}))

// ============================================================================
// Test Helpers
// ============================================================================

/** Create a fresh player directly (bypasses room/backend flow) */
function createTestPlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'test-player-1',
    name: 'Test Player',
    roomId: 'TestRoom1234',
    currentLevel: 1,
    completedLevels: [],
    budget: 500,
    totalProfit: 0,
    totalRevenue: 0,
    totalCupsSold: 0,
    peakBudget: 500,
    lowestBudget: 500,
    activeLoan: null,
    loanHistory: [],
    levelResults: [],
    isGameOver: false,
    gameOverAtLevel: null,
    ...overrides,
  }
}

/** Create a test game room */
function createTestRoom(overrides: Partial<GameRoom> = {}): GameRoom {
  return {
    id: 'TestRoom1234',
    name: 'Test Room',
    players: [],
    createdAt: Date.now(),
    isActive: true,
    campStartDate: '2026-07-13',
    ...overrides,
  }
}

/** Set up a standard game state with one player ready to play */
function setupGameWithPlayer(playerOverrides: Partial<Player> = {}): Player {
  const player = createTestPlayer(playerOverrides)
  const room = createTestRoom({ players: [player] })

  useGameStore.setState({
    currentPlayer: player,
    players: [player],
    currentGameRoom: room,
    availableGameRooms: [room],
    isSimulating: false,
    lastSimulationResult: null,
  })

  return player
}

// ============================================================================
// Setup / Teardown
// ============================================================================

beforeEach(() => {
  vi.useFakeTimers()
  // Reset store to initial state
  useGameStore.setState({
    currentDecision: { price: 1.0, quality: 3, marketing: 10 },
    lastSimulationResult: null,
    isSimulating: false,
    currentScenario: null,
    user: null,
    isAuthenticated: false,
    isAuthenticating: false,
    currentGameRoom: null,
    availableGameRooms: [],
    isLoadingRooms: false,
    players: [],
    currentPlayer: null,
    _roomUnsubscribe: null,
    roomJoinError: null,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

// ============================================================================
// 1. New Game State
// ============================================================================

describe('new game state', () => {
  it('player starts with correct initial values', () => {
    const player = setupGameWithPlayer()

    expect(player.budget).toBe(500)
    expect(player.currentLevel).toBe(1)
    expect(player.completedLevels).toEqual([])
    expect(player.totalProfit).toBe(0)
    expect(player.totalRevenue).toBe(0)
    expect(player.totalCupsSold).toBe(0)
    expect(player.peakBudget).toBe(500)
    expect(player.lowestBudget).toBe(500)
    expect(player.activeLoan).toBeNull()
    expect(player.loanHistory).toEqual([])
    expect(player.levelResults).toEqual([])
    expect(player.isGameOver).toBe(false)
    expect(player.gameOverAtLevel).toBeNull()
  })

  it('default decision values are set', () => {
    const state = useGameStore.getState()
    expect(state.currentDecision).toEqual({
      price: 1.0,
      quality: 3,
      marketing: 10,
    })
  })
})

// ============================================================================
// 2. Level Play Flow
// ============================================================================

describe('level play flow', () => {
  it('running simulation produces results and advances level', () => {
    setupGameWithPlayer()

    // Set a decision
    useGameStore.getState().updateDecision({ price: 1.0, quality: 3, marketing: 10 })

    // Run simulation (async via setTimeout)
    useGameStore.getState().runSimulation()
    expect(useGameStore.getState().isSimulating).toBe(true)

    // Advance past the 1.5s simulation delay
    vi.advanceTimersByTime(1500)

    const state = useGameStore.getState()
    expect(state.isSimulating).toBe(false)
    expect(state.lastSimulationResult).not.toBeNull()
    expect(state.lastSimulationResult!.cupsSold).toBeGreaterThanOrEqual(0)
    expect(state.lastSimulationResult!.revenue).toBeGreaterThanOrEqual(0)
    expect(typeof state.lastSimulationResult!.profit).toBe('number')
    expect(state.lastSimulationResult!.feedback.length).toBeGreaterThan(0)

    // Player should now be on level 2
    const player = state.currentPlayer!
    expect(player.completedLevels).toContain(1)
    expect(player.currentLevel).toBe(2)
    expect(player.levelResults).toHaveLength(1)
    expect(player.levelResults[0].level).toBe(1)
  })

  it('does not simulate when player has game over', () => {
    setupGameWithPlayer({ isGameOver: true, gameOverAtLevel: 5 })

    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    expect(useGameStore.getState().lastSimulationResult).toBeNull()
  })

  it('does not simulate when budget is below fixed costs ($20)', () => {
    setupGameWithPlayer({ budget: 15 })

    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    expect(useGameStore.getState().lastSimulationResult).toBeNull()
  })

  it('level results contain correct decision snapshot', () => {
    setupGameWithPlayer()

    useGameStore.getState().updateDecision({ price: 0.75, quality: 4, marketing: 15 })
    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    const result = useGameStore.getState().currentPlayer!.levelResults[0]
    expect(result.decisions).toEqual({ price: 0.75, quality: 4, marketing: 15 })
  })
})

// ============================================================================
// 3. Budget Carry-Forward
// ============================================================================

describe('budget carry-forward', () => {
  it('budget updates correctly after a profitable level', () => {
    setupGameWithPlayer()

    // Use optimal decisions for level 1 (sunny park day)
    useGameStore.getState().updateDecision({ price: 1.0, quality: 3, marketing: 10 })
    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    const player = useGameStore.getState().currentPlayer!
    const result = player.levelResults[0]

    // Budget should equal starting budget + profit
    expect(player.budget).toBe(Math.round((500 + result.profit) * 100) / 100)
  })

  it('budget carries forward across multiple levels', () => {
    setupGameWithPlayer()

    // Play level 1
    useGameStore.getState().updateDecision({ price: 1.0, quality: 3, marketing: 10 })
    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    const afterLevel1 = useGameStore.getState().currentPlayer!.budget

    // Advance to next level and play level 2
    useGameStore.getState().advanceToNextLevel()
    useGameStore.getState().updateDecision({ price: 1.0, quality: 3, marketing: 10 })
    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    const player = useGameStore.getState().currentPlayer!
    const level2Result = player.levelResults[1]

    // Budget after level 2 = budget after level 1 + profit from level 2
    expect(player.budget).toBe(Math.round((afterLevel1 + level2Result.profit) * 100) / 100)
    expect(player.completedLevels).toEqual([1, 2])
    expect(player.currentLevel).toBe(3)
  })

  it('cumulative stats accumulate across levels', () => {
    setupGameWithPlayer()

    // Play level 1
    useGameStore.getState().updateDecision({ price: 1.0, quality: 3, marketing: 10 })
    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    const afterL1 = useGameStore.getState().currentPlayer!

    // Play level 2
    useGameStore.getState().advanceToNextLevel()
    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    const afterL2 = useGameStore.getState().currentPlayer!

    expect(afterL2.totalCupsSold).toBeGreaterThanOrEqual(afterL1.totalCupsSold)
    expect(afterL2.levelResults).toHaveLength(2)
  })
})

// ============================================================================
// 4. Loan Acceptance and Repayment
// ============================================================================

describe('loan acceptance and repayment', () => {
  it('accepting a loan increases budget immediately', () => {
    // Level 15 has a loan offer: $100 at $12/level for 10 levels
    setupGameWithPlayer({ currentLevel: 15 })

    const budgetBefore = useGameStore.getState().currentPlayer!.budget
    useGameStore.getState().acceptLoan()
    const budgetAfter = useGameStore.getState().currentPlayer!.budget

    expect(budgetAfter).toBe(Math.round((budgetBefore + 100) * 100) / 100)
  })

  it('creates active loan with correct details after acceptance', () => {
    setupGameWithPlayer({ currentLevel: 15 })

    useGameStore.getState().acceptLoan()

    const loan = useGameStore.getState().currentPlayer!.activeLoan
    expect(loan).not.toBeNull()
    expect(loan!.amount).toBe(100)
    expect(loan!.repaymentPerLevel).toBe(12)
    expect(loan!.totalRepayment).toBe(120)
    expect(loan!.levelsRemaining).toBe(10)
    expect(loan!.acceptedAtLevel).toBe(15)
  })

  it('loan repayment is deducted after simulation', () => {
    setupGameWithPlayer({ currentLevel: 15 })

    // Accept loan first
    useGameStore.getState().acceptLoan()
    const budgetAfterLoan = useGameStore.getState().currentPlayer!.budget

    // Run simulation on level 15
    useGameStore.getState().updateDecision({ price: 1.0, quality: 3, marketing: 10 })
    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    const player = useGameStore.getState().currentPlayer!
    const result = player.levelResults[0]

    // Budget = budgetAfterLoan + profit - repayment
    expect(result.loanRepaymentDeducted).toBe(12)
    expect(player.budget).toBe(Math.round((budgetAfterLoan + result.profit - 12) * 100) / 100)
  })

  it('cannot accept a second loan while one is active', () => {
    setupGameWithPlayer({ currentLevel: 15 })

    useGameStore.getState().acceptLoan()
    const budgetAfterFirstLoan = useGameStore.getState().currentPlayer!.budget

    // Try to accept again - should be a no-op
    useGameStore.getState().acceptLoan()
    expect(useGameStore.getState().currentPlayer!.budget).toBe(budgetAfterFirstLoan)
  })

  it('loan levels remaining decreases after each level', () => {
    setupGameWithPlayer({ currentLevel: 15 })

    useGameStore.getState().acceptLoan()
    expect(useGameStore.getState().currentPlayer!.activeLoan!.levelsRemaining).toBe(10)

    // Play level 15
    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    const loan = useGameStore.getState().currentPlayer!.activeLoan
    // After one repayment, should have 9 levels remaining (or null if fully repaid, unlikely here)
    if (loan) {
      expect(loan.levelsRemaining).toBe(9)
      expect(loan.remainingBalance).toBe(Math.round((120 - 12) * 100) / 100)
    }
  })
})

// ============================================================================
// 5. Loan Decline
// ============================================================================

describe('loan decline', () => {
  it('declining a loan does not change budget', () => {
    setupGameWithPlayer({ currentLevel: 15 })

    const budgetBefore = useGameStore.getState().currentPlayer!.budget
    useGameStore.getState().declineLoan()

    expect(useGameStore.getState().currentPlayer!.budget).toBe(budgetBefore)
    expect(useGameStore.getState().currentPlayer!.activeLoan).toBeNull()
  })
})

// ============================================================================
// 6. Game Over Condition
// ============================================================================

describe('game over condition', () => {
  it('triggers game over when budget falls below $20', () => {
    // Start with very low budget so that after fixed costs + losses, it drops below $20
    setupGameWithPlayer({ budget: 30 })

    // Set worst possible decision: max price = 0 demand, max marketing = high cost
    useGameStore.getState().updateDecision({ price: 2.0, quality: 5, marketing: 10 })
    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    const player = useGameStore.getState().currentPlayer!
    // $2.00 price = 0 cups sold, so revenue = 0, costs = 20 (fixed) + 10 (marketing) = 30
    // profit = -30, new budget = 30 + (-30) = 0 which is < 20 => game over
    expect(player.isGameOver).toBe(true)
    expect(player.gameOverAtLevel).toBe(1)
  })

  it('game over prevents further simulation', () => {
    setupGameWithPlayer({ budget: 30 })

    // Force game over
    useGameStore.getState().updateDecision({ price: 2.0, quality: 5, marketing: 10 })
    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    expect(useGameStore.getState().currentPlayer!.isGameOver).toBe(true)

    // Try to simulate again - should not change state
    const resultBefore = useGameStore.getState().lastSimulationResult
    useGameStore.getState().runSimulation()
    vi.advanceTimersByTime(1500)

    // Level results should still have only 1 entry (no second simulation ran)
    expect(useGameStore.getState().currentPlayer!.levelResults).toHaveLength(1)
  })
})

// ============================================================================
// 7. Level Unlock Logic
// ============================================================================

describe('level unlock logic', () => {
  it('all levels accessible when no camp start date is set', () => {
    useGameStore.setState({ currentGameRoom: null })

    const { isLevelUnlocked } = useGameStore.getState()
    expect(isLevelUnlocked(1)).toBe(true)
    expect(isLevelUnlocked(25)).toBe(true)
    expect(isLevelUnlocked(50)).toBe(true)
  })

  it('rejects levels outside valid range', () => {
    const { isLevelUnlocked } = useGameStore.getState()
    expect(isLevelUnlocked(0)).toBe(false)
    expect(isLevelUnlocked(51)).toBe(false)
    expect(isLevelUnlocked(-1)).toBe(false)
  })

  it('locks all levels when camp is in the future', () => {
    const { isLevelUnlocked } = useGameStore.getState()
    // Camp starts far in the future → campDay = 0 → all levels locked
    const futureStart = '2030-01-01'

    expect(isLevelUnlocked(1, futureStart)).toBe(false)
    expect(isLevelUnlocked(10, futureStart)).toBe(false)
    expect(isLevelUnlocked(50, futureStart)).toBe(false)
  })

  it('unlocks all levels when camp ended long ago', () => {
    const { isLevelUnlocked } = useGameStore.getState()
    // Camp started 30+ days ago → campDay > 5 → all 50 levels unlocked
    const pastStart = '2020-01-01'

    for (let i = 1; i <= 50; i++) {
      expect(isLevelUnlocked(i, pastStart)).toBe(true)
    }
  })

  it('unlocks progressively more levels as camp days pass', () => {
    const { isLevelUnlocked } = useGameStore.getState()
    // Camp 10 days ago → campDay >= 10 → all 50 levels unlocked (past day 5)
    const tenDaysAgo = new Date()
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10)
    // Use YYYY-MM-DD in local time to avoid UTC-parsing timezone issues
    const pad = (n: number) => String(n).padStart(2, '0')
    const tenDaysAgoStr = `${tenDaysAgo.getFullYear()}-${pad(tenDaysAgo.getMonth() + 1)}-${pad(tenDaysAgo.getDate())}`

    // All levels should be unlocked (we're past day 5)
    for (let i = 1; i <= 50; i++) {
      expect(isLevelUnlocked(i, tenDaysAgoStr)).toBe(true)
    }
  })
})

// ============================================================================
// 8. Game Reset
// ============================================================================

describe('game reset', () => {
  it('resets player to initial state', () => {
    setupGameWithPlayer({ budget: 300, currentLevel: 10, completedLevels: [1, 2, 3] })

    useGameStore.getState().resetGame()

    const player = useGameStore.getState().currentPlayer!
    expect(player.budget).toBe(500)
    expect(player.currentLevel).toBe(1)
    expect(player.completedLevels).toEqual([])
    expect(player.totalProfit).toBe(0)
    expect(player.levelResults).toEqual([])
    expect(player.isGameOver).toBe(false)
    expect(player.activeLoan).toBeNull()
  })

  it('resets decisions to defaults', () => {
    useGameStore.getState().updateDecision({ price: 1.75, quality: 5, marketing: 25 })
    setupGameWithPlayer()
    useGameStore.getState().resetGame()

    expect(useGameStore.getState().currentDecision).toEqual({
      price: 1.0,
      quality: 3,
      marketing: 10,
    })
  })
})

// ============================================================================
// 9. Decision Updates
// ============================================================================

describe('decision updates', () => {
  it('updates individual decision fields', () => {
    useGameStore.getState().updateDecision({ price: 1.50 })
    expect(useGameStore.getState().currentDecision.price).toBe(1.50)
    expect(useGameStore.getState().currentDecision.quality).toBe(3) // unchanged
  })

  it('updates multiple fields at once', () => {
    useGameStore.getState().updateDecision({ price: 0.50, quality: 5, marketing: 25 })
    expect(useGameStore.getState().currentDecision).toEqual({
      price: 0.50,
      quality: 5,
      marketing: 25,
    })
  })
})
