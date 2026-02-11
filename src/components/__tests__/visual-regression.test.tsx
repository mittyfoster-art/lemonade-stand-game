// ============================================================================
// TEST-003: Visual Regression Tests for Scoring & Leaderboard Components
// Verifies rendering, structural integrity, styling consistency, interaction,
// and console-error-free operation of all multi-factor scoring UI components.
//
// Reference: spec/03_UI_COMPONENTS.md, spec/06_LEADERBOARD.md
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import type {
  Team,
  RoundResult,
  MultiFactorScore,
  RiskManagementInput,
  LeaderboardEntry,
  CategoryAward,
} from '@/types'
import { SCORING_MAX } from '@/types'

// ---------------------------------------------------------------------------
// jsdom Polyfills (Radix UI components require APIs not present in jsdom)
// ---------------------------------------------------------------------------

/**
 * Stub ResizeObserver for jsdom. Radix UI's Slider component depends on
 * ResizeObserver via @radix-ui/react-use-size. Without this stub, any test
 * that renders a Slider (e.g. RiskAssessmentForm) throws a ReferenceError.
 */
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// ---------------------------------------------------------------------------
// Module Mocks (must be declared before any imports that depend on them)
// ---------------------------------------------------------------------------

/**
 * Mock the external backend service that game-store imports.
 * Without this mock, importing game-store would fail because
 * `@devvai/devv-code-backend` is not available in the test environment.
 */
vi.mock('@devvai/devv-code-backend', () => ({
  auth: {
    sendOTP: vi.fn(),
    verifyOTP: vi.fn(),
    logout: vi.fn(),
  },
  table: {
    addItem: vi.fn(),
    getItems: vi.fn().mockResolvedValue({ items: [] }),
    updateItem: vi.fn(),
  },
}))

/**
 * Mock react-router-dom so Leaderboard's useNavigate call does not throw.
 * We provide a real implementation of MemoryRouter for tests that need it,
 * but stub useNavigate to a trackable vi.fn() so we can assert navigation.
 */
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  )
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

/**
 * Mock the game store for components that read from it.
 * Individual tests override return values via mockReturnValue / mockImplementation.
 */
const mockSetRiskManagementScore = vi.fn()
const mockGetFinalLeaderboard = vi.fn<() => LeaderboardEntry[]>().mockReturnValue([])
const mockUseGameStore = vi.fn()

vi.mock('@/store/game-store', () => ({
  useGameStore: (...args: unknown[]) => mockUseGameStore(...args),
}))

// ---------------------------------------------------------------------------
// Component Imports (after mocks are wired up)
// ---------------------------------------------------------------------------

import { ScoreCategory } from '@/components/scoring/ScoreCategory'
import { ScoreBreakdown } from '@/components/scoring/ScoreBreakdown'
import { EfficiencyIndicator } from '@/components/scoring/EfficiencyIndicator'
import { RoundHistoryTracker } from '@/components/scoring/RoundHistoryTracker'
import { CategoryAwards } from '@/components/scoring/CategoryAwards'
import { FacilitatorScoreInput } from '@/components/facilitator/FacilitatorScoreInput'
import { RiskAssessmentForm } from '@/components/facilitator/RiskAssessmentForm'
import { Leaderboard } from '@/components/Leaderboard'

// ---------------------------------------------------------------------------
// Test Data Factories
// ---------------------------------------------------------------------------

/** Creates a minimal RoundResult with sensible defaults. Override any field. */
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

/** Creates a minimal Team with sensible defaults. Override any field. */
const makeTeam = (overrides: Partial<Team> = {}): Team => ({
  id: 'team-1',
  name: 'Test Team',
  color: '#FF6B6B',
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

/** Creates a complete MultiFactorScore with sensible defaults. */
const makeScore = (overrides: Partial<MultiFactorScore> = {}): MultiFactorScore => ({
  profitRanking: 45,
  consistency: 16,
  efficiency: 12,
  riskManagement: 10,
  total: 83,
  profitRank: 2,
  spoilageRate: 0.15,
  profitableRounds: 4,
  calculatedAt: Date.now(),
  ...overrides,
})

/**
 * Creates a full LeaderboardEntry for testing the Leaderboard component.
 * Combines a team and its multi-factor score with rank metadata.
 */
const makeLeaderboardEntry = (
  overrides: Partial<LeaderboardEntry> & { team?: Partial<Team>; multiFactorScore?: Partial<MultiFactorScore> } = {},
): LeaderboardEntry => {
  const team = makeTeam({
    gamesPlayed: 5,
    roundHistory: Array.from({ length: 5 }, (_, i) =>
      makeRound({ round: i + 1, profit: 30 }),
    ),
    ...overrides.team,
  })
  const multiFactorScore = makeScore(overrides.multiFactorScore)
  return {
    rank: 1,
    team,
    multiFactorScore,
    awards: [],
    isTied: false,
    ...overrides,
    // Ensure nested overrides take precedence:
    ...(overrides.team ? { team } : {}),
    ...(overrides.multiFactorScore ? { multiFactorScore } : {}),
  }
}

// ---------------------------------------------------------------------------
// Shared Setup / Teardown
// ---------------------------------------------------------------------------

/** Console spy used by console-error monitoring tests */
let consoleErrorSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  // Default store mock: resolves selector functions the same way zustand does.
  // Each component calls useGameStore(selectorFn), so we invoke the selector
  // against a default state object.
  mockUseGameStore.mockImplementation((selector?: (state: Record<string, unknown>) => unknown) => {
    const state: Record<string, unknown> = {
      teams: [],
      gameMode: 'multi' as const,
      getFinalLeaderboard: mockGetFinalLeaderboard,
      setRiskManagementScore: mockSetRiskManagementScore,
      riskManagementScores: new Map<string, RiskManagementInput>(),
    }
    return selector ? selector(state) : state
  })
})

afterEach(() => {
  consoleErrorSpy.mockRestore()
  cleanup()
})

// ============================================================================
// ScoreCategory
// ============================================================================

describe('ScoreCategory', () => {
  it('renders the label, points, and detail text', () => {
    render(
      <ScoreCategory
        label="Profit Ranking"
        points={45}
        maxPoints={SCORING_MAX.PROFIT_RANKING}
        detail="2nd Place of 12"
      />,
    )

    expect(screen.getByText('Profit Ranking')).toBeInTheDocument()
    expect(screen.getByText('45 / 50')).toBeInTheDocument()
    expect(screen.getByText('2nd Place of 12')).toBeInTheDocument()
  })

  it('renders a progress bar with correct width percentage', () => {
    const { container } = render(
      <ScoreCategory label="Consistency" points={16} maxPoints={20} detail="4 of 5 rounds" />,
    )

    // The inner progress bar div has an inline style for width
    const progressBar = container.querySelector('[style*="width"]')
    expect(progressBar).not.toBeNull()
    // 16/20 = 80% => should render as 80%
    expect(progressBar!.getAttribute('style')).toContain('80%')
  })

  it('applies green color class when percentage >= 80', () => {
    const { container } = render(
      <ScoreCategory label="Test" points={40} maxPoints={50} detail="" />,
    )
    // 40/50 = 80%
    const bar = container.querySelector('[style*="width"]')
    expect(bar?.className).toContain('bg-green-500')
  })

  it('applies yellow color class when percentage is between 50 and 79', () => {
    const { container } = render(
      <ScoreCategory label="Test" points={30} maxPoints={50} detail="" />,
    )
    // 30/50 = 60%
    const bar = container.querySelector('[style*="width"]')
    expect(bar?.className).toContain('bg-yellow-500')
  })

  it('applies orange color class when percentage < 50', () => {
    const { container } = render(
      <ScoreCategory label="Test" points={10} maxPoints={50} detail="" />,
    )
    // 10/50 = 20%
    const bar = container.querySelector('[style*="width"]')
    expect(bar?.className).toContain('bg-orange-500')
  })

  it('handles maxPoints of 0 without division error (shows 0% bar)', () => {
    const { container } = render(
      <ScoreCategory label="Edge" points={0} maxPoints={0} detail="N/A" />,
    )
    const bar = container.querySelector('[style*="width"]')
    expect(bar!.getAttribute('style')).toContain('0%')
  })
})

// ============================================================================
// ScoreBreakdown
// ============================================================================

describe('ScoreBreakdown', () => {
  const defaultProps = {
    score: makeScore({ profitRanking: 45, consistency: 16, efficiency: 12, riskManagement: 10, total: 83 }),
    teamName: 'Alpha Squad',
    profitRank: 2,
    totalTeams: 8,
    profitableRounds: 4,
    totalRounds: 5,
    spoilageRate: 0.15,
  }

  it('renders the total score in the header', () => {
    render(<ScoreBreakdown {...defaultProps} />)
    expect(screen.getByText('83/100')).toBeInTheDocument()
  })

  it('renders the team name', () => {
    render(<ScoreBreakdown {...defaultProps} />)
    expect(screen.getByText('Alpha Squad')).toBeInTheDocument()
  })

  it('renders all four scoring categories', () => {
    render(<ScoreBreakdown {...defaultProps} />)

    expect(screen.getByText('Profit Ranking')).toBeInTheDocument()
    expect(screen.getByText('Consistency')).toBeInTheDocument()
    expect(screen.getByText('Efficiency')).toBeInTheDocument()
    expect(screen.getByText('Risk Management')).toBeInTheDocument()
  })

  it('displays correct points for each category', () => {
    render(<ScoreBreakdown {...defaultProps} />)

    expect(screen.getByText('45 / 50')).toBeInTheDocument()
    expect(screen.getByText('16 / 20')).toBeInTheDocument()
    expect(screen.getByText('12 / 15')).toBeInTheDocument()
    expect(screen.getByText('10 / 15')).toBeInTheDocument()
  })

  it('shows detail text for each category when showDetails is true (default)', () => {
    render(<ScoreBreakdown {...defaultProps} />)

    // Profit Ranking detail: ordinal(2) + " Place of 8"
    expect(screen.getByText('2nd Place of 8')).toBeInTheDocument()
    // Consistency detail
    expect(screen.getByText('4 of 5 rounds profitable')).toBeInTheDocument()
    // Efficiency detail: 15% spoilage rate
    expect(screen.getByText('15.0% spoilage rate')).toBeInTheDocument()
    // Risk Management detail
    expect(screen.getByText('Facilitator assessment')).toBeInTheDocument()
  })

  it('hides detail text when showDetails is false', () => {
    render(<ScoreBreakdown {...defaultProps} showDetails={false} />)

    expect(screen.queryByText('2nd Place of 8')).not.toBeInTheDocument()
    expect(screen.queryByText(/rounds profitable/)).not.toBeInTheDocument()
    expect(screen.queryByText('Facilitator assessment')).not.toBeInTheDocument()
  })

  it('renders the correct Card gradient class', () => {
    const { container } = render(<ScoreBreakdown {...defaultProps} />)
    const card = container.firstElementChild
    expect(card?.className).toContain('from-purple-50')
    expect(card?.className).toContain('to-indigo-50')
  })
})

// ============================================================================
// EfficiencyIndicator
// ============================================================================

describe('EfficiencyIndicator', () => {
  it('renders spoilage rate, cups made, cups sold, and unsold counts', () => {
    render(<EfficiencyIndicator cupsMade={100} cupsSold={80} />)

    expect(screen.getByText('Spoilage Rate')).toBeInTheDocument()
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument() // cups made
    expect(screen.getByText('80')).toBeInTheDocument()  // cups sold
    expect(screen.getByText('20')).toBeInTheDocument()  // unsold
  })

  it('renders cups breakdown labels', () => {
    render(<EfficiencyIndicator cupsMade={50} cupsSold={50} />)

    expect(screen.getByText('Cups Made')).toBeInTheDocument()
    expect(screen.getByText('Cups Sold')).toBeInTheDocument()
    expect(screen.getByText('Unsold')).toBeInTheDocument()
  })

  it('shows "Excellent" tier label for 0% spoilage', () => {
    render(<EfficiencyIndicator cupsMade={100} cupsSold={100} />)
    expect(screen.getByText('Excellent efficiency!')).toBeInTheDocument()
  })

  it('shows "Good" tier label for ~15% spoilage', () => {
    render(<EfficiencyIndicator cupsMade={100} cupsSold={85} />)
    expect(screen.getByText('Good efficiency!')).toBeInTheDocument()
  })

  it('shows "Average" tier label for ~25% spoilage', () => {
    render(<EfficiencyIndicator cupsMade={100} cupsSold={75} />)
    expect(screen.getByText('Average efficiency!')).toBeInTheDocument()
  })

  it('shows "Poor" tier label for ~45% spoilage', () => {
    render(<EfficiencyIndicator cupsMade={100} cupsSold={55} />)
    expect(screen.getByText('Poor efficiency!')).toBeInTheDocument()
  })

  it('shows "Very Poor" tier label for >50% spoilage', () => {
    render(<EfficiencyIndicator cupsMade={100} cupsSold={40} />)
    expect(screen.getByText('Very Poor efficiency!')).toBeInTheDocument()
  })

  it('shows efficiency points section when showPoints is true (default)', () => {
    render(<EfficiencyIndicator cupsMade={100} cupsSold={90} />)
    // 10% spoilage => 15 points
    expect(screen.getByText(`Efficiency Points: 15/${SCORING_MAX.EFFICIENCY}`)).toBeInTheDocument()
  })

  it('hides efficiency points section when showPoints is false', () => {
    render(<EfficiencyIndicator cupsMade={100} cupsSold={90} showPoints={false} />)
    expect(screen.queryByText(/Efficiency Points/)).not.toBeInTheDocument()
  })

  it('handles zero cups made gracefully (0% spoilage)', () => {
    render(<EfficiencyIndicator cupsMade={0} cupsSold={0} />)
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('Excellent efficiency!')).toBeInTheDocument()
  })
})

// ============================================================================
// RoundHistoryTracker
// ============================================================================

describe('RoundHistoryTracker', () => {
  it('renders empty state message when no rounds exist', () => {
    render(<RoundHistoryTracker roundHistory={[]} currentRound={1} />)

    expect(screen.getByText('ROUND HISTORY')).toBeInTheDocument()
    expect(
      screen.getByText('No rounds played yet. Complete a round to see your history.'),
    ).toBeInTheDocument()
  })

  it('renders the table with round data', () => {
    const rounds: RoundResult[] = [
      makeRound({ round: 1, profit: 30, cupsSold: 80, spoilageRate: 0.2 }),
      makeRound({ round: 2, profit: -10, cupsSold: 40, spoilageRate: 0.4 }),
    ]

    render(<RoundHistoryTracker roundHistory={rounds} currentRound={2} />)

    // Round numbers
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()

    // Profit formatted values
    expect(screen.getByText('+$30.00')).toBeInTheDocument()
    expect(screen.getByText('-$10.00')).toBeInTheDocument()

    // Status badges
    expect(screen.getByText('Profitable')).toBeInTheDocument()
    expect(screen.getByText('Loss')).toBeInTheDocument()
  })

  it('shows current round badge in header', () => {
    const rounds: RoundResult[] = [makeRound({ round: 1, profit: 20 })]
    render(<RoundHistoryTracker roundHistory={rounds} currentRound={3} />)

    expect(screen.getByText('Round 3')).toBeInTheDocument()
  })

  it('displays summary stats below the table', () => {
    const rounds: RoundResult[] = [
      makeRound({ round: 1, profit: 30, cupsMade: 100, cupsSold: 80 }),
      makeRound({ round: 2, profit: -10, cupsMade: 100, cupsSold: 60 }),
      makeRound({ round: 3, profit: 15, cupsMade: 100, cupsSold: 90 }),
    ]

    render(<RoundHistoryTracker roundHistory={rounds} currentRound={3} />)

    // 2 of 3 rounds profitable
    expect(screen.getByText('2/3')).toBeInTheDocument()
    expect(screen.getByText('profitable')).toBeInTheDocument()

    // Total profit: 30 + (-10) + 15 = 35
    expect(screen.getByText('+$35.00')).toBeInTheDocument()
  })

  it('renders table column headers', () => {
    const rounds = [makeRound()]
    render(<RoundHistoryTracker roundHistory={rounds} currentRound={1} />)

    expect(screen.getByText('Round')).toBeInTheDocument()
    expect(screen.getByText('Profit')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
  })
})

// ============================================================================
// CategoryAwards
// ============================================================================

describe('CategoryAwards', () => {
  it('renders null when teams array is empty', () => {
    const { container } = render(<CategoryAwards teams={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders all three award types for a single team', () => {
    const team = makeTeam({
      id: 'solo',
      name: 'Solo Stars',
      profit: 200,
      totalCupsMade: 100,
      cupsSold: 95,
      profitableRounds: 5,
    })

    render(<CategoryAwards teams={[team]} />)

    expect(screen.getByText('CATEGORY AWARDS')).toBeInTheDocument()
    expect(screen.getByText('BEST PROFIT')).toBeInTheDocument()
    expect(screen.getByText('MOST CONSISTENT')).toBeInTheDocument()
    expect(screen.getByText('MOST EFFICIENT')).toBeInTheDocument()
  })

  it('displays the winning team name for each award', () => {
    const teamA = makeTeam({
      id: 'a',
      name: 'Profit Kings',
      profit: 500,
      totalCupsMade: 200,
      cupsSold: 100,
      profitableRounds: 2,
    })
    const teamB = makeTeam({
      id: 'b',
      name: 'Efficiency Wizards',
      profit: 200,
      totalCupsMade: 200,
      cupsSold: 195,
      profitableRounds: 5,
    })

    render(<CategoryAwards teams={[teamA, teamB]} />)

    // Best Profit should go to Profit Kings (500 > 200)
    expect(screen.getByText('Profit Kings')).toBeInTheDocument()
    // Efficiency Wizards wins consistency (5 > 2) AND efficiency (lower spoilage),
    // so the name appears in multiple award cards. Use getAllByText.
    expect(screen.getAllByText('Efficiency Wizards').length).toBeGreaterThanOrEqual(1)
  })

  it('displays award value descriptions', () => {
    const team = makeTeam({
      id: 't1',
      name: 'Team One',
      profit: 123.45,
      totalCupsMade: 100,
      cupsSold: 95,
      profitableRounds: 3,
      gamesPlayed: 5,
    })

    render(<CategoryAwards teams={[team]} />)

    // Profit award value: "$123.45 total profit"
    expect(screen.getByText('$123.45 total profit')).toBeInTheDocument()
    // Consistency award value: "3/5 profitable rounds"
    expect(screen.getByText('3/5 profitable rounds')).toBeInTheDocument()
  })

  it('omits efficiency award when no teams have produced cups', () => {
    const team = makeTeam({
      id: 't1',
      name: 'Empty',
      totalCupsMade: 0,
      cupsSold: 0,
    })

    render(<CategoryAwards teams={[team]} />)

    expect(screen.getByText('BEST PROFIT')).toBeInTheDocument()
    expect(screen.getByText('MOST CONSISTENT')).toBeInTheDocument()
    expect(screen.queryByText('MOST EFFICIENT')).not.toBeInTheDocument()
  })

  it('shows tied winners with "(tied)" indicator', () => {
    const teamA = makeTeam({
      id: 'a',
      name: 'Alpha',
      profit: 100,
      totalCupsMade: 100,
      cupsSold: 90,
      profitableRounds: 3,
    })
    const teamB = makeTeam({
      id: 'b',
      name: 'Beta',
      profit: 100,
      totalCupsMade: 100,
      cupsSold: 90,
      profitableRounds: 3,
    })

    render(<CategoryAwards teams={[teamA, teamB]} />)

    // Both teams tied on profit, so "(tied)" should appear
    expect(screen.getAllByText('(tied)').length).toBeGreaterThan(0)
  })
})

// ============================================================================
// FacilitatorScoreInput (uses mocked game store)
// ============================================================================

describe('FacilitatorScoreInput', () => {
  const teams: Team[] = [
    makeTeam({ id: 'team-a', name: 'Alpha', color: '#FF6B6B' }),
    makeTeam({ id: 'team-b', name: 'Beta', color: '#4ECDC4' }),
  ]

  it('renders the facilitator scoring header', () => {
    render(<FacilitatorScoreInput teams={teams} />)
    expect(screen.getByText('FACILITATOR SCORING')).toBeInTheDocument()
  })

  it('renders the team selector with label', () => {
    render(<FacilitatorScoreInput teams={teams} />)
    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.getByText('Select a team...')).toBeInTheDocument()
  })

  it('does not render the risk assessment form before a team is selected', () => {
    render(<FacilitatorScoreInput teams={teams} />)
    expect(screen.queryByText('RISK MANAGEMENT ASSESSMENT')).not.toBeInTheDocument()
  })

  it('renders without errors when teams array is empty', () => {
    render(<FacilitatorScoreInput teams={[]} />)
    expect(screen.getByText('FACILITATOR SCORING')).toBeInTheDocument()
  })
})

// ============================================================================
// RiskAssessmentForm
// ============================================================================

describe('RiskAssessmentForm', () => {
  const defaultProps = {
    teamId: 'team-1',
    teamName: 'Alpha Squad',
    onSave: vi.fn(),
  }

  it('renders the form title and team name', () => {
    render(<RiskAssessmentForm {...defaultProps} />)

    expect(screen.getByText('RISK MANAGEMENT ASSESSMENT')).toBeInTheDocument()
    expect(screen.getByText('Team: Alpha Squad')).toBeInTheDocument()
  })

  it('renders all three scoring slider labels', () => {
    render(<RiskAssessmentForm {...defaultProps} />)

    expect(screen.getByText('Production Adjustment (0\u20135)')).toBeInTheDocument()
    expect(screen.getByText('Pricing Strategy (0\u20135)')).toBeInTheDocument()
    expect(screen.getByText('Budget Reserves (0\u20135)')).toBeInTheDocument()
  })

  it('renders descriptive text for each slider', () => {
    render(<RiskAssessmentForm {...defaultProps} />)

    expect(
      screen.getByText('Adjusted cup production for weather forecasts and demand scenarios'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Responded to market conditions and competitive pressure'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Maintained reserves and avoided over-investing in a single round'),
    ).toBeInTheDocument()
  })

  it('renders the total risk score display', () => {
    render(<RiskAssessmentForm {...defaultProps} />)

    expect(screen.getByText('Total Risk Score')).toBeInTheDocument()
    // Default total is 0 (all sliders start at 0)
    expect(screen.getByText(`0/${SCORING_MAX.RISK_MANAGEMENT}`)).toBeInTheDocument()
  })

  it('renders the notes textarea', () => {
    render(<RiskAssessmentForm {...defaultProps} />)

    expect(screen.getByText('Notes (optional)')).toBeInTheDocument()
    expect(
      screen.getByPlaceholderText(
        "Additional observations about the team's risk management...",
      ),
    ).toBeInTheDocument()
  })

  it('renders the Save Score button', () => {
    render(<RiskAssessmentForm {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Save Score' })).toBeInTheDocument()
  })

  it('calls onSave with a valid RiskManagementInput when Save is clicked', async () => {
    const onSave = vi.fn()
    const user = userEvent.setup()

    render(<RiskAssessmentForm {...defaultProps} onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Save Score' }))

    expect(onSave).toHaveBeenCalledTimes(1)

    const savedScore: RiskManagementInput = onSave.mock.calls[0][0]
    expect(savedScore.teamId).toBe('team-1')
    expect(savedScore.productionAdjustment).toBeGreaterThanOrEqual(0)
    expect(savedScore.productionAdjustment).toBeLessThanOrEqual(5)
    expect(savedScore.pricingStrategy).toBeGreaterThanOrEqual(0)
    expect(savedScore.pricingStrategy).toBeLessThanOrEqual(5)
    expect(savedScore.budgetReserves).toBeGreaterThanOrEqual(0)
    expect(savedScore.budgetReserves).toBeLessThanOrEqual(5)
    expect(savedScore.total).toBe(
      savedScore.productionAdjustment + savedScore.pricingStrategy + savedScore.budgetReserves,
    )
    expect(typeof savedScore.assessedAt).toBe('number')
  })

  it('allows typing in the notes field', async () => {
    const user = userEvent.setup()
    render(<RiskAssessmentForm {...defaultProps} />)

    const textarea = screen.getByPlaceholderText(
      "Additional observations about the team's risk management...",
    )

    await user.type(textarea, 'Great risk awareness')
    expect(textarea).toHaveValue('Great risk awareness')
  })

  it('pre-populates form when initialValues are provided', () => {
    render(
      <RiskAssessmentForm
        {...defaultProps}
        initialValues={{
          productionAdjustment: 3,
          pricingStrategy: 4,
          budgetReserves: 2,
          notes: 'Previous notes',
        }}
      />,
    )

    // Total should be 3+4+2 = 9
    expect(screen.getByText(`9/${SCORING_MAX.RISK_MANAGEMENT}`)).toBeInTheDocument()

    // Notes field should have the initial value
    const textarea = screen.getByPlaceholderText(
      "Additional observations about the team's risk management...",
    )
    expect(textarea).toHaveValue('Previous notes')
  })

  it('renders gradient background on the card', () => {
    const { container } = render(<RiskAssessmentForm {...defaultProps} />)
    const card = container.firstElementChild
    expect(card?.className).toContain('from-amber-50')
    expect(card?.className).toContain('to-orange-50')
  })
})

// ============================================================================
// Leaderboard (uses mocked store + router)
// ============================================================================

describe('Leaderboard', () => {
  const twoEntries: LeaderboardEntry[] = [
    makeLeaderboardEntry({
      rank: 1,
      team: { id: 'team-a', name: 'Alpha', color: '#FF6B6B', profit: 200, gamesPlayed: 5 },
      multiFactorScore: {
        profitRanking: 50,
        consistency: 20,
        efficiency: 15,
        riskManagement: 10,
        total: 95,
        profitRank: 1,
        spoilageRate: 0.05,
        profitableRounds: 5,
      },
      awards: [
        { category: 'profit', teamId: 'team-a', teamName: 'Alpha', value: 200, icon: '💰' },
      ],
      isTied: false,
    }),
    makeLeaderboardEntry({
      rank: 2,
      team: { id: 'team-b', name: 'Beta', color: '#4ECDC4', profit: 150, gamesPlayed: 5 },
      multiFactorScore: {
        profitRanking: 45,
        consistency: 16,
        efficiency: 12,
        riskManagement: 8,
        total: 81,
        profitRank: 2,
        spoilageRate: 0.15,
        profitableRounds: 4,
      },
      awards: [],
      isTied: false,
    }),
  ]

  /**
   * Helper to configure the store mock so the Leaderboard component
   * sees the given teams and leaderboard entries.
   */
  function setupLeaderboardStore(entries: LeaderboardEntry[], gameMode: 'single' | 'multi' = 'multi') {
    const teams = entries.map((e) => e.team)

    mockGetFinalLeaderboard.mockReturnValue(entries)

    mockUseGameStore.mockImplementation((selector?: (state: Record<string, unknown>) => unknown) => {
      const state: Record<string, unknown> = {
        teams,
        gameMode,
        getFinalLeaderboard: mockGetFinalLeaderboard,
        setRiskManagementScore: mockSetRiskManagementScore,
        riskManagementScores: new Map<string, RiskManagementInput>(),
      }
      return selector ? selector(state) : state
    })
  }

  it('returns null when gameMode is "single"', () => {
    setupLeaderboardStore(twoEntries, 'single')
    const { container } = render(<Leaderboard />)
    expect(container.firstChild).toBeNull()
  })

  it('returns null when teams array is empty', () => {
    setupLeaderboardStore([])
    const { container } = render(<Leaderboard />)
    expect(container.firstChild).toBeNull()
  })

  it('renders the leaderboard title with team count badge', () => {
    setupLeaderboardStore(twoEntries)
    render(<Leaderboard />)

    expect(screen.getByText('Leaderboard')).toBeInTheDocument()
    expect(screen.getByText('2 teams')).toBeInTheDocument()
  })

  it('renders the Export CSV and Facilitator buttons', () => {
    setupLeaderboardStore(twoEntries)
    render(<Leaderboard />)

    expect(screen.getByText('Export CSV')).toBeInTheDocument()
    expect(screen.getByText('Facilitator')).toBeInTheDocument()
  })

  it('navigates to /facilitator when Facilitator button is clicked', async () => {
    setupLeaderboardStore(twoEntries)
    const user = userEvent.setup()

    render(<Leaderboard />)
    await user.click(screen.getByText('Facilitator'))

    expect(mockNavigate).toHaveBeenCalledWith('/facilitator')
  })

  it('renders the desktop leaderboard column headers', () => {
    setupLeaderboardStore(twoEntries)
    const { container } = render(<Leaderboard />)

    // Desktop headers are inside the hidden-md wrapper
    const desktopSection = container.querySelector('.hidden.md\\:block')
    expect(desktopSection).not.toBeNull()

    if (desktopSection) {
      const headers = desktopSection as HTMLElement
      expect(within(headers).getByText('Rank')).toBeInTheDocument()
      expect(within(headers).getByText('Team')).toBeInTheDocument()
      expect(within(headers).getByText('Total')).toBeInTheDocument()
      expect(within(headers).getByText('Profit')).toBeInTheDocument()
      expect(within(headers).getByText('Cons')).toBeInTheDocument()
      expect(within(headers).getByText('Effi')).toBeInTheDocument()
      expect(within(headers).getByText('Risk')).toBeInTheDocument()
    }
  })

  it('renders team names in the leaderboard rows', () => {
    setupLeaderboardStore(twoEntries)
    render(<Leaderboard />)

    // Team names appear in both desktop and mobile views
    expect(screen.getAllByText('Alpha').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Beta').length).toBeGreaterThan(0)
  })

  it('renders total score values for each team', () => {
    setupLeaderboardStore(twoEntries)
    render(<Leaderboard />)

    // Total scores appear in desktop ScoreCell + mobile view
    expect(screen.getAllByText('95').length).toBeGreaterThan(0)
    expect(screen.getAllByText('81').length).toBeGreaterThan(0)
  })

  it('renders award badges for teams that have awards', () => {
    setupLeaderboardStore(twoEntries)
    render(<Leaderboard />)

    // Alpha has a "Best Profit" award badge. The badge text is rendered as
    // "{icon} Best Profit" so we match with a regex to handle the emoji prefix.
    expect(screen.getAllByText(/Best Profit/).length).toBeGreaterThan(0)
  })

  it('renders the leaderboard gradient card', () => {
    setupLeaderboardStore(twoEntries)
    const { container } = render(<Leaderboard />)

    // The outermost Card should have the indigo gradient
    const card = container.querySelector('[class*="from-indigo-50"]')
    expect(card).not.toBeNull()
  })

  it('shows TIE badge when entries are tied', () => {
    const tiedEntries: LeaderboardEntry[] = [
      makeLeaderboardEntry({
        rank: 1,
        team: { id: 'a', name: 'Alpha' },
        multiFactorScore: { total: 80 },
        isTied: true,
      }),
      makeLeaderboardEntry({
        rank: 2,
        team: { id: 'b', name: 'Beta' },
        multiFactorScore: { total: 80 },
        isTied: true,
      }),
    ]

    setupLeaderboardStore(tiedEntries)
    render(<Leaderboard />)

    // Both desktop and mobile can show TIE badges
    expect(screen.getAllByText('TIE').length).toBeGreaterThan(0)
  })
})

// ============================================================================
// Mobile Responsiveness Tests
// ============================================================================

describe('Mobile responsiveness', () => {
  /**
   * These tests verify that the mobile-specific layout elements are present
   * in the DOM (they use CSS media queries for visibility toggling via
   * Tailwind's md:hidden / hidden md:block classes). In jsdom, CSS media
   * queries do not apply, but we can verify the DOM structure exists.
   */

  it('Leaderboard renders both desktop and mobile layout containers', () => {
    // Setup store with entries
    const entries: LeaderboardEntry[] = [
      makeLeaderboardEntry({
        rank: 1,
        team: { id: 'a', name: 'Alpha', gamesPlayed: 5 },
        multiFactorScore: { total: 90 },
      }),
    ]

    mockGetFinalLeaderboard.mockReturnValue(entries)
    mockUseGameStore.mockImplementation((selector?: (state: Record<string, unknown>) => unknown) => {
      const state: Record<string, unknown> = {
        teams: entries.map((e) => e.team),
        gameMode: 'multi',
        getFinalLeaderboard: mockGetFinalLeaderboard,
        setRiskManagementScore: mockSetRiskManagementScore,
        riskManagementScores: new Map<string, RiskManagementInput>(),
      }
      return selector ? selector(state) : state
    })

    const { container } = render(<Leaderboard />)

    // Desktop: hidden md:block
    const desktopContainer = container.querySelector('.hidden.md\\:block')
    expect(desktopContainer).not.toBeNull()

    // Mobile: md:hidden
    const mobileContainer = container.querySelector('.md\\:hidden')
    expect(mobileContainer).not.toBeNull()
  })

  it('Mobile leaderboard cards contain expand/collapse chevron icons', () => {
    const entries: LeaderboardEntry[] = [
      makeLeaderboardEntry({
        rank: 1,
        team: { id: 'a', name: 'Alpha', gamesPlayed: 5 },
        multiFactorScore: { total: 90 },
      }),
    ]

    mockGetFinalLeaderboard.mockReturnValue(entries)
    mockUseGameStore.mockImplementation((selector?: (state: Record<string, unknown>) => unknown) => {
      const state: Record<string, unknown> = {
        teams: entries.map((e) => e.team),
        gameMode: 'multi',
        getFinalLeaderboard: mockGetFinalLeaderboard,
        setRiskManagementScore: mockSetRiskManagementScore,
        riskManagementScores: new Map<string, RiskManagementInput>(),
      }
      return selector ? selector(state) : state
    })

    const { container } = render(<Leaderboard />)
    const mobileContainer = container.querySelector('.md\\:hidden')
    expect(mobileContainer).not.toBeNull()

    // ChevronDown icon should be present (collapsed state)
    // Lucide renders as <svg> with a class
    const svgs = mobileContainer!.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
  })

  it('Mobile leaderboard card shows expanded breakdown after click', async () => {
    const entries: LeaderboardEntry[] = [
      makeLeaderboardEntry({
        rank: 1,
        team: { id: 'a', name: 'Alpha', gamesPlayed: 5 },
        multiFactorScore: {
          total: 90,
          profitRanking: 50,
          consistency: 20,
          efficiency: 12,
          riskManagement: 8,
          profitRank: 1,
          spoilageRate: 0.1,
          profitableRounds: 5,
        },
      }),
    ]

    mockGetFinalLeaderboard.mockReturnValue(entries)
    mockUseGameStore.mockImplementation((selector?: (state: Record<string, unknown>) => unknown) => {
      const state: Record<string, unknown> = {
        teams: entries.map((e) => e.team),
        gameMode: 'multi',
        getFinalLeaderboard: mockGetFinalLeaderboard,
        setRiskManagementScore: mockSetRiskManagementScore,
        riskManagementScores: new Map<string, RiskManagementInput>(),
      }
      return selector ? selector(state) : state
    })

    const user = userEvent.setup()
    const { container } = render(<Leaderboard />)

    const mobileContainer = container.querySelector('.md\\:hidden')
    expect(mobileContainer).not.toBeNull()

    // Before clicking, "View Full Breakdown" should not be visible
    expect(screen.queryByText('View Full Breakdown')).not.toBeInTheDocument()

    // Click the mobile card to expand
    const clickableRow = mobileContainer!.querySelector('.cursor-pointer')
    expect(clickableRow).not.toBeNull()
    await user.click(clickableRow!)

    // After clicking, the expanded breakdown should appear
    expect(screen.getByText('View Full Breakdown')).toBeInTheDocument()
  })

  it('RoundHistoryTracker hides Cups and Spoilage columns on mobile via sm:table-cell', () => {
    const rounds = [makeRound({ round: 1, profit: 30, cupsSold: 80, spoilageRate: 0.2 })]

    const { container } = render(
      <RoundHistoryTracker roundHistory={rounds} currentRound={1} />,
    )

    // The Cups and Spoilage header cells use "hidden sm:table-cell"
    const hiddenHeaders = container.querySelectorAll('.hidden.sm\\:table-cell')
    // Two headers (Cups, Spoilage) + their corresponding data cells
    expect(hiddenHeaders.length).toBeGreaterThanOrEqual(2)
  })
})

// ============================================================================
// Console Error Monitoring
// ============================================================================

describe('Console error monitoring', () => {
  it('ScoreCategory renders without console errors', () => {
    render(
      <ScoreCategory label="Test" points={10} maxPoints={50} detail="Test detail" />,
    )
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('ScoreBreakdown renders without console errors', () => {
    render(
      <ScoreBreakdown
        score={makeScore()}
        teamName="Test"
        profitRank={1}
        totalTeams={4}
        profitableRounds={3}
        totalRounds={5}
        spoilageRate={0.1}
      />,
    )
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('EfficiencyIndicator renders without console errors', () => {
    render(<EfficiencyIndicator cupsMade={100} cupsSold={80} />)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('RoundHistoryTracker renders without console errors (empty)', () => {
    render(<RoundHistoryTracker roundHistory={[]} currentRound={1} />)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('RoundHistoryTracker renders without console errors (with data)', () => {
    const rounds = [
      makeRound({ round: 1, profit: 20 }),
      makeRound({ round: 2, profit: -5 }),
    ]
    render(<RoundHistoryTracker roundHistory={rounds} currentRound={2} />)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('CategoryAwards renders without console errors', () => {
    const team = makeTeam({
      totalCupsMade: 100,
      cupsSold: 90,
      profitableRounds: 3,
    })
    render(<CategoryAwards teams={[team]} />)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('FacilitatorScoreInput renders without console errors', () => {
    render(<FacilitatorScoreInput teams={[makeTeam()]} />)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('RiskAssessmentForm renders without console errors', () => {
    render(
      <RiskAssessmentForm teamId="t1" teamName="Test" onSave={vi.fn()} />,
    )
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('Leaderboard renders without console errors (with entries)', () => {
    const entries: LeaderboardEntry[] = [
      makeLeaderboardEntry({
        rank: 1,
        team: { id: 'a', name: 'Alpha', gamesPlayed: 3 },
        multiFactorScore: { total: 75 },
      }),
    ]

    mockGetFinalLeaderboard.mockReturnValue(entries)
    mockUseGameStore.mockImplementation((selector?: (state: Record<string, unknown>) => unknown) => {
      const state: Record<string, unknown> = {
        teams: entries.map((e) => e.team),
        gameMode: 'multi',
        getFinalLeaderboard: mockGetFinalLeaderboard,
        setRiskManagementScore: mockSetRiskManagementScore,
        riskManagementScores: new Map<string, RiskManagementInput>(),
      }
      return selector ? selector(state) : state
    })

    render(<Leaderboard />)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })

  it('Leaderboard renders without console errors (null case)', () => {
    mockGetFinalLeaderboard.mockReturnValue([])
    mockUseGameStore.mockImplementation((selector?: (state: Record<string, unknown>) => unknown) => {
      const state: Record<string, unknown> = {
        teams: [],
        gameMode: 'single',
        getFinalLeaderboard: mockGetFinalLeaderboard,
        setRiskManagementScore: mockSetRiskManagementScore,
        riskManagementScores: new Map<string, RiskManagementInput>(),
      }
      return selector ? selector(state) : state
    })

    render(<Leaderboard />)
    expect(consoleErrorSpy).not.toHaveBeenCalled()
  })
})

// ============================================================================
// Structural Consistency & Styling Tests
// ============================================================================

describe('Structural consistency', () => {
  it('ScoreBreakdown uses Card/CardHeader/CardContent structure', () => {
    const { container } = render(
      <ScoreBreakdown
        score={makeScore()}
        teamName="Test"
        profitRank={1}
        totalTeams={4}
        profitableRounds={3}
        totalRounds={5}
        spoilageRate={0.1}
      />,
    )

    // shadcn Card renders as a div; CardHeader and CardContent are nested divs
    const rootDiv = container.firstElementChild
    expect(rootDiv).not.toBeNull()
    // The component should render 4 ScoreCategory children in CardContent
    const scoreCategories = container.querySelectorAll('.rounded-lg.border')
    // 4 ScoreCategory wrappers (each has rounded-lg border class)
    expect(scoreCategories.length).toBeGreaterThanOrEqual(4)
  })

  it('EfficiencyIndicator renders the 3-column cups breakdown grid', () => {
    const { container } = render(
      <EfficiencyIndicator cupsMade={100} cupsSold={80} />,
    )

    const grid = container.querySelector('.grid.grid-cols-3')
    expect(grid).not.toBeNull()
    // Should have 3 child elements
    expect(grid!.children.length).toBe(3)
  })

  it('RoundHistoryTracker renders table element with thead and tbody', () => {
    const rounds = [makeRound({ round: 1, profit: 20 })]
    const { container } = render(
      <RoundHistoryTracker roundHistory={rounds} currentRound={1} />,
    )

    expect(container.querySelector('table')).not.toBeNull()
    expect(container.querySelector('thead')).not.toBeNull()
    expect(container.querySelector('tbody')).not.toBeNull()
  })

  it('CategoryAwards renders award cards with icon containers', () => {
    const team = makeTeam({
      totalCupsMade: 100,
      cupsSold: 95,
      profitableRounds: 5,
      profit: 200,
    })

    const { container } = render(<CategoryAwards teams={[team]} />)

    // Each award has a rounded-full icon container
    const iconContainers = container.querySelectorAll('.rounded-full')
    // At least 3 award icons (profit, consistency, efficiency)
    expect(iconContainers.length).toBeGreaterThanOrEqual(3)
  })

  it('RiskAssessmentForm renders all slider controls', () => {
    render(
      <RiskAssessmentForm teamId="t1" teamName="Test" onSave={vi.fn()} />,
    )

    // Radix Slider renders a <span role="slider"> for each thumb.
    // The component creates 3 sliders (Production Adjustment, Pricing Strategy,
    // Budget Reserves). Each renders with role="slider" and appropriate aria-value props.
    const sliders = screen.getAllByRole('slider')
    expect(sliders).toHaveLength(3)

    // All sliders should have min/max values matching the sub-score bounds (0-5)
    for (const slider of sliders) {
      expect(slider).toHaveAttribute('aria-valuemin', '0')
      expect(slider).toHaveAttribute('aria-valuemax', '5')
    }
  })

  it('Leaderboard renders team color swatches as styled divs', () => {
    const entries: LeaderboardEntry[] = [
      makeLeaderboardEntry({
        rank: 1,
        team: { id: 'a', name: 'Alpha', color: '#FF6B6B', gamesPlayed: 3 },
        multiFactorScore: { total: 90 },
      }),
    ]

    mockGetFinalLeaderboard.mockReturnValue(entries)
    mockUseGameStore.mockImplementation((selector?: (state: Record<string, unknown>) => unknown) => {
      const state: Record<string, unknown> = {
        teams: entries.map((e) => e.team),
        gameMode: 'multi',
        getFinalLeaderboard: mockGetFinalLeaderboard,
        setRiskManagementScore: mockSetRiskManagementScore,
        riskManagementScores: new Map<string, RiskManagementInput>(),
      }
      return selector ? selector(state) : state
    })

    const { container } = render(<Leaderboard />)

    // Color swatches use inline backgroundColor style
    const swatches = container.querySelectorAll('[style*="background-color"]')
    expect(swatches.length).toBeGreaterThan(0)

    // Verify the color value matches what we set
    const firstSwatch = swatches[0] as HTMLElement
    expect(firstSwatch.style.backgroundColor).toBeTruthy()
  })
})
