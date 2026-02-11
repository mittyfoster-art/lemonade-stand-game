import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { auth, table } from '@devvai/devv-code-backend'
import type { RoundResult, RiskManagementInput, MultiFactorScore, DecisionQuality, LeaderboardEntry, CategoryAward } from '@/types'
import { calculateProfitRanks, calculateMultiFactorScore, generateFinalLeaderboard, calculateCategoryAwards } from '@/lib/scoring'

interface GameDecision {
  price: number      // Price per cup ($0.25 - $2.00)
  quality: number    // Quality level (1-5)
  marketing: number  // Marketing spend ($0 - $30)
}

interface DailyScenario {
  id: string
  title: string
  story: string
  hint: string
  targetMarket: string
  deceptionLevel: 'low' | 'medium' | 'high'
  optimalDecision: {
    priceRange: [number, number]
    qualityRange: [number, number]
    marketingRange: [number, number]
  }
  weatherEffect: number  // 0.6 - 1.4 multiplier
  marketCondition: string
}

interface GameResult {
  /** Number of cups produced before knowing actual demand */
  cupsMade: number
  cupsSold: number
  revenue: number
  costs: number
  profit: number
  feedback: string[]
  /** Ratio of unsold cups to cups produced (0.0–1.0) */
  spoilageRate: number
  /** How well the player's decisions matched the scenario's optimal strategy */
  decisionQuality: DecisionQuality
}

interface Team {
  id: string
  name: string
  color: string
  profit: number
  revenue: number
  cupsSold: number
  gamesPlayed: number
  lastResult: GameResult | null
  timestamp: number
  currentBudget: number
  day: number
  /** History of all rounds played by this team */
  roundHistory: RoundResult[]
  /** Total cups produced across all rounds, used for efficiency/spoilage calculation */
  totalCupsMade: number
  /** Number of rounds where the team achieved positive profit, used for consistency scoring */
  profitableRounds: number
  /** Facilitator-assigned risk management score (0–15) */
  riskManagementScore: number
  /** Calculated multi-factor score, null until end-of-game calculation */
  multiFactorScore: MultiFactorScore | null
}

interface User {
  uid: string
  email: string
  name: string
}

interface GameRoom {
  id: string
  name: string
  teams: Team[]
  createdAt: number
  isActive: boolean
}

interface GameState {
  budget: number
  currentDecision: GameDecision
  result: GameResult | null
  isSimulating: boolean
  day: number
  currentScenario: DailyScenario | null
  
  // Authentication state
  user: User | null
  isAuthenticated: boolean
  isAuthenticating: boolean
  
  // Game room state
  currentGameRoom: GameRoom | null
  availableGameRooms: GameRoom[]
  isLoadingRooms: boolean
  
  // Multi-team state (within current room)
  teams: Team[]
  currentTeam: Team | null
  gameMode: 'single' | 'multi'

  // Multi-factor scoring state
  /** Facilitator-assigned risk management scores keyed by team ID */
  riskManagementScores: Map<string, RiskManagementInput>
  /** Final multi-factor scores keyed by team ID, populated at end of game */
  finalScores: Map<string, MultiFactorScore>

  // Actions
  updateDecision: (decision: Partial<GameDecision>) => void
  runSimulation: () => void
  resetGame: () => void
  startNewDay: () => void
  getDailyScenario: (day: number) => DailyScenario
  
  // Authentication actions
  sendOTP: (email: string) => Promise<void>
  verifyOTP: (email: string, code: string) => Promise<void>
  logout: () => Promise<void>
  
  // Game room management (backend-persistent)
  createGameRoom: (name: string) => Promise<string>
  joinGameRoom: (roomId: string) => Promise<boolean>
  leaveGameRoom: () => void
  loadGameRooms: () => Promise<void>
  refreshCurrentRoom: () => Promise<void>
  getGameRoomById: (roomId: string) => GameRoom | null
  
  // Team management (within current room)
  addTeam: (name: string) => Promise<void>
  selectTeam: (teamId: string) => void
  setGameMode: (mode: 'single' | 'multi') => void
  clearLeaderboard: () => void
  getLeaderboard: () => Team[]
  
  // Scoring actions
  /** Store a facilitator-assigned risk management score for a team */
  setRiskManagementScore: (teamId: string, score: RiskManagementInput) => void
  /**
   * Calculate final multi-factor scores for all teams.
   * Uses profit ranking, consistency, efficiency, and risk management
   * scoring from the scoring library. Updates the finalScores map with
   * a MultiFactorScore for each team.
   */
  calculateMultiFactorScores: () => void
  /**
   * Generate the final leaderboard sorted by multi-factor score (descending).
   * Calculates profit ranks, applies multi-factor scoring, determines category
   * awards, and returns a ranked array of LeaderboardEntry objects.
   *
   * Must be called after `calculateMultiFactorScores()` has populated finalScores,
   * or it will compute scores on the fly using current risk management inputs.
   *
   * @returns Sorted LeaderboardEntry[] with ranks, scores, and category awards
   */
  getFinalLeaderboard: () => LeaderboardEntry[]

  // Helper functions
  updateRoomInBackend: (updatedTeams: Team[]) => Promise<void>
}

// Business simulation algorithm with scenario-based logic
const simulateBusiness = (decision: GameDecision, budget: number, scenario: DailyScenario): GameResult => {
  const { price, quality, marketing } = decision
  
  // Calculate costs with quality directly tied to production cost
  const baseIngredientCost = 0.10
  const qualityMultiplier = [1.0, 1.2, 1.5, 2.0, 2.8] // Cost increases exponentially with quality
  const ingredientCost = baseIngredientCost * qualityMultiplier[quality - 1] // Quality 1-5 maps to index 0-4
  
  const marketingCost = marketing
  const totalFixedCosts = 20 // Stand setup, permits, etc.
  
  // Check if we can afford the marketing
  const actualMarketing = Math.min(marketing, budget - totalFixedCosts)
  const totalCosts = totalFixedCosts + actualMarketing
  
  // Check if decision aligns with optimal ranges (decision quality scoring)
  const priceScore = isInRange(price, scenario.optimalDecision.priceRange) ? 1.2 : 0.8
  const qualityScore = isInRange(quality, scenario.optimalDecision.qualityRange) ? 1.2 : 0.8
  const marketingScore = isInRange(marketing, scenario.optimalDecision.marketingRange) ? 1.2 : 0.8
  
  // Calculate scenario-based demand factors
  const priceAttractiveness = Math.max(0, (2.0 - price) / 1.75) * priceScore
  const qualityFactor = (quality / 5) * qualityScore
  const marketingFactor = (1 + (actualMarketing / 50)) * marketingScore
  
  // Apply scenario-specific weather effect instead of random
  const weatherFactor = scenario.weatherEffect
  
  // Base demand adjusted by scenario complexity
  const baseDemand = 50
  const scenarioMultiplier = scenario.deceptionLevel === 'high' ? 1.3 : 
                           scenario.deceptionLevel === 'medium' ? 1.1 : 1.0
  
  const demand = baseDemand * priceAttractiveness * qualityFactor * marketingFactor * weatherFactor * scenarioMultiplier
  
  // Calculate production capacity (cups made before knowing demand)
  const maxCapacity = 150
  const productionBudget = Math.max(0, budget - totalFixedCosts - actualMarketing)
  const cupsMade = Math.min(Math.floor(productionBudget / ingredientCost), maxCapacity)

  // Cups sold is capped by both demand and production
  const cupsSold = Math.min(Math.floor(demand), cupsMade)

  // Calculate financial results
  const revenue = cupsSold * price
  const variableCosts = cupsMade * ingredientCost // Cost is based on cups made, not sold
  const totalBusinessCosts = totalCosts + variableCosts
  const profit = revenue - totalBusinessCosts

  // Generate scenario-aware feedback
  const feedback = generateScenarioFeedback(decision, scenario, profit, cupsSold)

  const spoilageRate = cupsMade > 0 ? (cupsMade - cupsSold) / cupsMade : 0

  // Determine how well each decision matched the scenario's optimal ranges
  const priceOptimal = isInRange(price, scenario.optimalDecision.priceRange)
  const qualityOptimal = isInRange(quality, scenario.optimalDecision.qualityRange)
  const marketingOptimal = isInRange(marketing, scenario.optimalDecision.marketingRange)

  const decisionQuality: DecisionQuality = {
    priceOptimal,
    qualityOptimal,
    marketingOptimal,
    overallScore:
      (priceOptimal ? 1 : 0) +
      (qualityOptimal ? 1 : 0) +
      (marketingOptimal ? 1 : 0),
  }

  return {
    cupsMade,
    cupsSold,
    revenue: Math.round(revenue * 100) / 100,
    costs: Math.round(totalBusinessCosts * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    feedback,
    spoilageRate,
    decisionQuality
  }
}

// Helper function to check if value is in optimal range
const isInRange = (value: number, range: [number, number]): boolean => {
  return value >= range[0] && value <= range[1]
}

// Generate scenario-specific feedback
const generateScenarioFeedback = (decision: GameDecision, scenario: DailyScenario, profit: number, cupsSold: number): string[] => {
  const { price, quality, marketing } = decision
  const feedback: string[] = []
  
  // Scenario context feedback
  feedback.push(`📍 **${scenario.title}**: ${scenario.marketCondition}`)
  
  // Cost analysis feedback
  const baseIngredientCost = 0.10
  const qualityMultiplier = [1.0, 1.2, 1.5, 2.0, 2.8]
  const ingredientCost = baseIngredientCost * qualityMultiplier[quality - 1]
  const qualityCosts = ['$0.10', '$0.12', '$0.15', '$0.20', '$0.28']
  feedback.push(`💡 **Cost Analysis**: Quality ${quality}/5 costs ${qualityCosts[quality - 1]} per cup to make`)
  
  // Decision analysis based on optimal ranges
  const priceOptimal = isInRange(price, scenario.optimalDecision.priceRange)
  const qualityOptimal = isInRange(quality, scenario.optimalDecision.qualityRange)
  const marketingOptimal = isInRange(marketing, scenario.optimalDecision.marketingRange)
  
  if (priceOptimal && qualityOptimal && marketingOptimal) {
    feedback.push("🎯 **Perfect Strategy!** You read the market exactly right!")
  } else if (priceOptimal || qualityOptimal || marketingOptimal) {
    feedback.push("📈 **Good Instincts!** Some of your decisions hit the target.")
  } else {
    feedback.push("🤔 **Learning Opportunity!** The market wanted something different.")
  }
  
  // Specific decision feedback
  if (!priceOptimal) {
    if (price < scenario.optimalDecision.priceRange[0]) {
      feedback.push(`💸 Your price ($${price.toFixed(2)}) was too low for this market.`)
    } else {
      feedback.push(`💰 Your price ($${price.toFixed(2)}) was too high for this market.`)
    }
  }
  
  if (!qualityOptimal) {
    if (quality < scenario.optimalDecision.qualityRange[0]) {
      feedback.push(`⭐ This market needed higher quality (${quality}/5 wasn't enough).`)
    } else {
      feedback.push(`🔧 You may have over-engineered for this market (${quality}/5 cost too much: ${qualityCosts[quality - 1]}/cup).`)
    }
  }
  
  if (!marketingOptimal) {
    if (marketing < scenario.optimalDecision.marketingRange[0]) {
      feedback.push(`📢 This market needed more marketing buzz ($${marketing} wasn't enough).`)
    } else {
      feedback.push(`📊 You may have over-spent on marketing ($${marketing} was more than needed).`)
    }
  }
  
  // Profit feedback with scenario context
  if (profit > 50) {
    feedback.push("🎉 **Outstanding profit!** You mastered this market challenge!")
  } else if (profit > 25) {
    feedback.push("✅ **Solid profit!** Good job navigating this scenario.")
  } else if (profit > 0) {
    feedback.push("📈 **Small profit.** You survived this tricky market!")
  } else if (profit > -20) {
    feedback.push("📚 **Small loss.** Deceptive markets teach valuable lessons!")
  } else {
    feedback.push("⚠️ **Big loss!** This market was trickier than it seemed.")
  }
  
  return feedback
}

// Daily scenarios with deceptive elements
const DAILY_SCENARIOS: DailyScenario[] = [
  {
    id: 'sports-day',
    title: 'Big Sports Tournament',
    story: 'A huge sports tournament is happening at the nearby park! Hundreds of athletes and families are expected. The organizers mentioned they want "premium refreshments" for the event.',
    hint: 'Athletes need hydration, but families might be budget-conscious...',
    targetMarket: 'Sports families (mixed budget sensitivity)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [3, 4],
      marketingRange: [15, 25]
    },
    weatherEffect: 1.3,
    marketCondition: 'High demand, mixed price sensitivity'
  },
  {
    id: 'fancy-neighborhood',
    title: 'Upscale Neighborhood Event',
    story: 'You got invited to set up in the wealthy Maple Heights neighborhood during their garden party weekend. Everyone drives luxury cars and the houses are huge!',
    hint: 'Rich people can afford anything... or can they?',
    targetMarket: 'Wealthy residents (surprisingly price-sensitive for small purchases)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [0.50, 1.00],
      qualityRange: [4, 5],
      marketingRange: [5, 15]
    },
    weatherEffect: 1.1,
    marketCondition: 'Deceptive: Wealthy but frugal on small items'
  },
  {
    id: 'school-fundraiser',
    title: 'School Fundraiser Event',
    story: 'The local elementary school is having a fundraiser and asked you to participate. Parents are coming to support their kids, and everyone seems excited about helping raise money.',
    hint: 'Parents at fundraisers usually want to support causes...',
    targetMarket: 'Parents supporting school (willing to pay premium for good cause)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [1.25, 1.75],
      qualityRange: [3, 5],
      marketingRange: [10, 20]
    },
    weatherEffect: 1.2,
    marketCondition: 'Premium pricing accepted for good cause'
  },
  {
    id: 'hot-weather',
    title: 'Record Heat Wave',
    story: `It's the hottest day of the year! The weather forecast shows 95°F with high humidity. People are desperately looking for ways to cool down, and the ice cream truck already sold out.`,
    hint: 'Everyone needs something cold, but heat makes people grumpy...',
    targetMarket: 'Everyone (desperate for refreshment but heat-stressed)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [2, 4],
      marketingRange: [5, 15]
    },
    weatherEffect: 1.4,
    marketCondition: 'High demand but quality less important than availability'
  },
  {
    id: 'tourist-trap',
    title: 'Tourist Area Setup',
    story: 'You managed to get a spot near the famous downtown tourist district! Buses full of visitors are arriving, cameras flashing everywhere. Tour guides are pointing out "authentic local experiences."',
    hint: 'Tourists love authentic experiences and unique local flavors...',
    targetMarket: 'Tourists (expecting authentic premium experience)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [1.50, 2.00],
      qualityRange: [4, 5],
      marketingRange: [20, 30]
    },
    weatherEffect: 1.0,
    marketCondition: 'Premium pricing works with high quality and marketing'
  },
  {
    id: 'rainy-day',
    title: 'Unexpected Rain Shower',
    story: 'Dark clouds rolled in and light rain started falling. Most outdoor events got cancelled, but you notice people with umbrellas still walking by, looking a bit sad about their ruined plans.',
    hint: 'Bad weather usually hurts business, but maybe people need cheering up?',
    targetMarket: 'Disappointed people seeking comfort (low volume, comfort pricing)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [0.75, 1.25],
      qualityRange: [4, 5],
      marketingRange: [0, 10]
    },
    weatherEffect: 0.6,
    marketCondition: 'Low volume but high quality needed for comfort'
  },
  {
    id: 'budget-conscious',
    title: 'End-of-Month Community',
    story: 'You set up in a working-class neighborhood near the end of the month. You overhear conversations about "waiting for payday" and "stretching the budget." But kids are still asking their parents for treats.',
    hint: 'People are tight on money, but kids really want lemonade...',
    targetMarket: 'Budget-conscious families (price very sensitive)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [0.25, 0.75],
      qualityRange: [2, 3],
      marketingRange: [5, 15]
    },
    weatherEffect: 1.0,
    marketCondition: 'Volume pricing strategy needed'
  },
  {
    id: 'health-conscious',
    title: 'Yoga Studio Grand Opening',
    story: 'A new organic yoga studio is opening next door, and they invited you to provide refreshments! Everyone is talking about "clean eating," "natural ingredients," and "wellness journeys."',
    hint: 'Health-conscious people care about quality and natural ingredients...',
    targetMarket: 'Health enthusiasts (quality over price)',
    deceptionLevel: 'low',
    optimalDecision: {
      priceRange: [1.25, 1.75],
      qualityRange: [4, 5],
      marketingRange: [10, 25]
    },
    weatherEffect: 1.1,
    marketCondition: 'Premium quality commands premium pricing'
  },
  {
    id: 'competition-day',
    title: 'Rival Lemonade Stand Nearby',
    story: 'Oh no! Another lemonade stand opened just across the street. They have fancy signs and seem to be charging $0.50 per cup. Customers are looking back and forth between both stands.',
    hint: 'Competition means you need to stand out somehow...',
    targetMarket: 'Price-comparing customers (need clear value proposition)',
    deceptionLevel: 'high',
    optimalDecision: {
      priceRange: [0.50, 1.00],
      qualityRange: [4, 5],
      marketingRange: [15, 30]
    },
    weatherEffect: 1.0,
    marketCondition: 'Differentiation through quality and marketing crucial'
  },
  {
    id: 'lunch-rush',
    title: 'Business District Lunch Rush',
    story: 'You set up near the business district during lunch hour. Office workers in suits are rushing by, checking their phones, grabbing quick lunches. They seem to have money but very little time.',
    hint: 'Business people have money but are always in a hurry...',
    targetMarket: 'Busy professionals (time-sensitive, less price-sensitive)',
    deceptionLevel: 'medium',
    optimalDecision: {
      priceRange: [1.00, 1.50],
      qualityRange: [3, 4],
      marketingRange: [5, 15]
    },
    weatherEffect: 1.1,
    marketCondition: 'Convenience and speed more important than lowest price'
  }
]

// Team colors for visual distinction
const TEAM_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
  '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3', '#FF9F43',
  '#FF6348', '#2ED573', '#3742FA', '#F368E0', '#FFA502'
]

// Helper function to generate unique room IDs
const generateGameRoomId = (): string => {
  const adjectives = ['Cool', 'Fast', 'Smart', 'Bright', 'Sweet', 'Fresh', 'Happy', 'Lucky', 'Super', 'Epic']
  const nouns = ['Lemons', 'Stand', 'Market', 'Juice', 'Booth', 'Corner', 'Shop', 'Spot', 'Zone', 'Hub']
  const numbers = Math.floor(Math.random() * 9000) + 1000 // 4-digit number
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)]
  
  return `${randomAdjective}${randomNoun}${numbers}`
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      budget: 100,
      currentDecision: {
        price: 1.00,
        quality: 3,
        marketing: 10
      },
      result: null,
      isSimulating: false,
      day: 1,
      currentScenario: DAILY_SCENARIOS[0], // Start with first scenario
      
      // Authentication state
      user: null,
      isAuthenticated: false,
      isAuthenticating: false,
      
      // Game room state
      currentGameRoom: null,
      availableGameRooms: [],
      isLoadingRooms: false,
      
      // Multi-team state (within current room)
      teams: [],
      currentTeam: null,
      gameMode: 'single',

      // Multi-factor scoring state
      riskManagementScores: new Map<string, RiskManagementInput>(),
      finalScores: new Map<string, MultiFactorScore>(),

      updateDecision: (decision) => set((state) => ({
        currentDecision: { ...state.currentDecision, ...decision }
      })),
      
      runSimulation: () => {
        set({ isSimulating: true })
        
        // Simulate processing time for dramatic effect
        setTimeout(() => {
          const { currentDecision, budget, currentTeam, teams, day } = get()
          
          // Get scenario based on team's current day (team-specific scenarios)
          const teamDay = currentTeam ? currentTeam.day : day
          const scenario = get().getDailyScenario(teamDay)
          
          const result = simulateBusiness(currentDecision, budget, scenario)
          
          // Calculate new budget after profit/loss
          const newBudget = budget + result.profit
          
          // Update team stats if in multi-team mode
          if (currentTeam) {
            const { currentGameRoom, availableGameRooms } = get()

            // Build a RoundResult for round history
            const roundResult: RoundResult = {
              round: teamDay,
              scenarioId: scenario.id,
              decision: { ...currentDecision },
              cupsMade: result.cupsMade,
              cupsSold: result.cupsSold,
              spoilageRate: result.spoilageRate,
              revenue: result.revenue,
              costs: result.costs,
              profit: result.profit,
              decisionQuality: result.decisionQuality,
              timestamp: Date.now(),
            }

            const updatedTeams = teams.map(team => {
              if (team.id === currentTeam.id) {
                return {
                  ...team,
                  profit: team.profit + result.profit,
                  revenue: team.revenue + result.revenue,
                  cupsSold: team.cupsSold + result.cupsSold,
                  totalCupsMade: team.totalCupsMade + result.cupsMade,
                  profitableRounds: team.profitableRounds + (result.profit > 0 ? 1 : 0),
                  gamesPlayed: team.gamesPlayed + 1,
                  lastResult: result,
                  roundHistory: [...team.roundHistory, roundResult],
                  timestamp: Date.now(),
                  currentBudget: newBudget,
                  day: day
                }
              }
              return team
            })
            
            // Update the room in availableGameRooms if we're in a room
            let updatedRooms = availableGameRooms
            let updatedCurrentRoom = currentGameRoom
            
            if (currentGameRoom) {
              updatedRooms = availableGameRooms.map(room => 
                room.id === currentGameRoom.id 
                  ? { ...room, teams: updatedTeams }
                  : room
              )
              updatedCurrentRoom = { ...currentGameRoom, teams: updatedTeams }
            }
            
            set({ 
              result,
              isSimulating: false,
              teams: updatedTeams,
              budget: newBudget,
              availableGameRooms: updatedRooms,
              currentGameRoom: updatedCurrentRoom
            })
            
            // Update backend asynchronously (don't block UI)
            get().updateRoomInBackend(updatedTeams).catch(console.error)
          } else {
            // Single player mode - update budget directly
            set({ 
              result,
              isSimulating: false,
              budget: newBudget
            })
          }
        }, 1500)
      },
      
      resetGame: () => {
        const scenario = DAILY_SCENARIOS[0] // First scenario for day 1
        set({
          budget: 100,
          currentDecision: {
            price: 1.00,
            quality: 3,
            marketing: 10
          },
          result: null,
          isSimulating: false,
          day: 1,
          currentScenario: scenario
        })
      },
      
      startNewDay: () => {
        const { day, currentTeam, teams } = get()
        
        // Update day for current team if in multi-team mode
        if (currentTeam) {
          const { currentGameRoom, availableGameRooms } = get()
          const newDay = currentTeam.day + 1
          const newScenario = get().getDailyScenario(newDay)
          
          const updatedTeams = teams.map(team => {
            if (team.id === currentTeam.id) {
              return {
                ...team,
                day: newDay
              }
            }
            return team
          })
          
          // Update the current team reference
          const updatedCurrentTeam = updatedTeams.find(t => t.id === currentTeam.id)!
          
          // Update the room in availableGameRooms if we're in a room
          let updatedRooms = availableGameRooms
          let updatedCurrentRoom = currentGameRoom
          
          if (currentGameRoom) {
            updatedRooms = availableGameRooms.map(room => 
              room.id === currentGameRoom.id 
                ? { ...room, teams: updatedTeams }
                : room
            )
            updatedCurrentRoom = { ...currentGameRoom, teams: updatedTeams }
          }
          
          set({
            day: newDay,
            teams: updatedTeams,
            currentTeam: updatedCurrentTeam,
            result: null,
            currentScenario: newScenario,
            currentDecision: {
              price: 1.00,
              quality: 3,
              marketing: 10
            },
            availableGameRooms: updatedRooms,
            currentGameRoom: updatedCurrentRoom
          })
          
          // Update backend asynchronously
          get().updateRoomInBackend(updatedTeams).catch(console.error)
        } else {
          // Single player mode
          const newDay = day + 1
          const newScenario = get().getDailyScenario(newDay)
          
          set({
            day: newDay,
            result: null,
            currentScenario: newScenario,
            currentDecision: {
              price: 1.00,
              quality: 3,
              marketing: 10
            }
          })
        }
      },
      
      // Backend-persistent game room management
      createGameRoom: async (name: string) => {
        const { isAuthenticated } = get()
        if (!isAuthenticated) {
          throw new Error('Authentication required to create game rooms')
        }

        const roomId = generateGameRoomId()
        const newRoom: GameRoom = {
          id: roomId,
          name: name.trim() || `Game Room ${roomId}`,
          teams: [],
          createdAt: Date.now(),
          isActive: true
        }
        
        try {
          // Save to backend
          await table.addItem('ex4h3iac854w', {
            room_id: roomId,
            room_name: newRoom.name,
            teams: JSON.stringify(newRoom.teams),
            created_at: newRoom.createdAt,
            last_updated: Date.now()
          })
          
          set((state) => ({
            availableGameRooms: [...state.availableGameRooms, newRoom],
            currentGameRoom: newRoom,
            teams: [],
            currentTeam: null,
            gameMode: 'single',
            // Reset game state for new room
            budget: 100,
            day: 1,
            result: null,
            currentScenario: DAILY_SCENARIOS[0]
          }))
          
          return roomId
        } catch (error) {
          console.error('Failed to create game room:', error)
          throw error
        }
      },
      
      joinGameRoom: async (roomId: string) => {
        try {
          // Search for room in backend
          const response = await table.getItems('ex4h3iac854w', {
            query: { room_id: roomId }
          })
          
          if (response.items.length > 0) {
            const roomData = response.items[0]
            const room: GameRoom = {
              id: roomData.room_id,
              name: roomData.room_name,
              teams: JSON.parse(roomData.teams || '[]'),
              createdAt: roomData.created_at,
              isActive: true
            }
            
            set((state) => ({
              currentGameRoom: room,
              teams: room.teams,
              currentTeam: null,
              gameMode: room.teams.length > 0 ? 'multi' : 'single',
              // Reset personal game state when joining room
              budget: 100,
              day: 1,
              result: null,
              currentScenario: DAILY_SCENARIOS[0],
              // Add to local available rooms if not already there
              availableGameRooms: state.availableGameRooms.some(r => r.id === room.id) 
                ? state.availableGameRooms 
                : [...state.availableGameRooms, room]
            }))
            return true
          }
          return false
        } catch (error) {
          console.error('Failed to join game room:', error)
          return false
        }
      },
      
      leaveGameRoom: () => {
        set({
          currentGameRoom: null,
          teams: [],
          currentTeam: null,
          gameMode: 'single',
          // Reset to default game state
          budget: 100,
          day: 1,
          result: null,
          currentScenario: DAILY_SCENARIOS[0]
        })
      },
      
      loadGameRooms: async () => {
        set({ isLoadingRooms: true })
        try {
          const response = await table.getItems('ex4h3iac854w', {
            limit: 50,
            sort: 'last_updated', 
            order: 'desc'
          })
          
          const rooms: GameRoom[] = response.items.map(item => ({
            id: item.room_id,
            name: item.room_name,
            teams: JSON.parse(item.teams || '[]'),
            createdAt: item.created_at,
            isActive: true
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
          const response = await table.getItems('ex4h3iac854w', {
            query: { room_id: currentGameRoom.id }
          })
          
          if (response.items.length > 0) {
            const roomData = response.items[0]
            const updatedRoom: GameRoom = {
              id: roomData.room_id,
              name: roomData.room_name,
              teams: JSON.parse(roomData.teams || '[]'),
              createdAt: roomData.created_at,
              isActive: true
            }
            
            set((state) => ({
              currentGameRoom: updatedRoom,
              teams: updatedRoom.teams,
              availableGameRooms: state.availableGameRooms.map(room => 
                room.id === updatedRoom.id ? updatedRoom : room
              )
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
      
      // Team management functions (within current room)
      addTeam: async (name: string) => {
        const { teams, currentGameRoom, availableGameRooms, isAuthenticated } = get()
        
        if (!currentGameRoom) {
          throw new Error('Cannot add team without a game room')
        }
        
        if (!isAuthenticated) {
          throw new Error('Authentication required to add teams')
        }
        
        const newTeam: Team = {
          id: `team-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: name.trim(),
          color: TEAM_COLORS[teams.length % TEAM_COLORS.length],
          profit: 0,
          revenue: 0,
          cupsSold: 0,
          gamesPlayed: 0,
          lastResult: null,
          timestamp: Date.now(),
          currentBudget: 100,
          day: 1,
          roundHistory: [],
          totalCupsMade: 0,
          profitableRounds: 0,
          riskManagementScore: 0,
          multiFactorScore: null
        }
        
        const updatedTeams = [...teams, newTeam]
        
        try {
          // Update in backend
          const roomQuery = await table.getItems('ex4h3iac854w', {
            query: { room_id: currentGameRoom.id }
          })
          
          if (roomQuery.items.length > 0) {
            const roomItem = roomQuery.items[0]
            await table.updateItem('ex4h3iac854w', {
              _uid: roomItem._uid,
              _id: roomItem._id,
              teams: JSON.stringify(updatedTeams),
              last_updated: Date.now()
            })
          }
          
          // Update local state
          const updatedRooms = availableGameRooms.map(room => 
            room.id === currentGameRoom.id 
              ? { ...room, teams: updatedTeams }
              : room
          )
          
          set({
            teams: updatedTeams,
            currentTeam: newTeam,
            gameMode: 'multi',
            availableGameRooms: updatedRooms,
            currentGameRoom: { ...currentGameRoom, teams: updatedTeams }
          })
        } catch (error) {
          console.error('Failed to add team:', error)
          throw error
        }
      },
      
      selectTeam: (teamId: string) => {
        const { teams } = get()
        const team = teams.find(t => t.id === teamId)
        if (team) {
          const teamScenario = get().getDailyScenario(team.day)
          set({ 
            currentTeam: team,
            budget: team.currentBudget,
            day: team.day,
            currentScenario: teamScenario
          })
        }
      },
      
      setGameMode: (mode: 'single' | 'multi') => {
        set({ 
          gameMode: mode,
          currentTeam: mode === 'single' ? null : get().currentTeam
        })
      },
      
      clearLeaderboard: () => {
        const { currentGameRoom, availableGameRooms } = get()
        
        if (currentGameRoom) {
          // Update the room in availableGameRooms to have empty teams
          const updatedRooms = availableGameRooms.map(room => 
            room.id === currentGameRoom.id 
              ? { ...room, teams: [] }
              : room
          )
          
          set({
            teams: [],
            currentTeam: null,
            gameMode: 'single',
            availableGameRooms: updatedRooms,
            currentGameRoom: { ...currentGameRoom, teams: [] }
          })
        } else {
          set({
            teams: [],
            currentTeam: null,
            gameMode: 'single'
          })
        }
      },
      
      getLeaderboard: () => {
        const { teams } = get()
        return [...teams].sort((a, b) => {
          // Primary sort by profit
          if (b.profit !== a.profit) {
            return b.profit - a.profit
          }
          // Secondary sort by revenue if profit is tied
          if (b.revenue !== a.revenue) {
            return b.revenue - a.revenue
          }
          // Tertiary sort by cups sold
          return b.cupsSold - a.cupsSold
        })
      },
      
      /**
       * Store a facilitator-assigned risk management score for a team.
       * Updates the riskManagementScores map keyed by team ID.
       */
      setRiskManagementScore: (teamId: string, score: RiskManagementInput) => {
        set((state) => {
          const updated = new Map(state.riskManagementScores)
          updated.set(teamId, score)
          return { riskManagementScores: updated }
        })
      },

      /**
       * Calculate final multi-factor scores for every team in the current game.
       * Determines profit ranks via the scoring library, retrieves each team's
       * facilitator-assigned risk management score, computes a MultiFactorScore
       * per team, and stores the results in the finalScores map.
       */
      calculateMultiFactorScores: () => {
        const { teams, riskManagementScores } = get()
        if (teams.length === 0) return

        // Step 1: Determine profit-based rank positions with tiebreakers
        const profitRanks = calculateProfitRanks(teams)

        // Step 2: Build a new finalScores map
        const finalScores = new Map<string, MultiFactorScore>()

        for (const team of teams) {
          const rankEntry = profitRanks.find(r => r.teamId === team.id)!
          const riskScore = riskManagementScores.get(team.id)?.total ?? 0
          const score = calculateMultiFactorScore(team, rankEntry.rank, riskScore)
          finalScores.set(team.id, score)
        }

        // Step 3: Persist scores onto each team object and update store
        const updatedTeams = teams.map(team => ({
          ...team,
          multiFactorScore: finalScores.get(team.id) ?? null,
        }))

        set({ finalScores, teams: updatedTeams })
      },

      /**
       * Generate the final leaderboard sorted by multi-factor score.
       * Delegates to the scoring library's generateFinalLeaderboard, which
       * calculates profit ranks, multi-factor scores, category awards, and
       * tie detection. Returns an empty array when no teams exist.
       */
      getFinalLeaderboard: (): LeaderboardEntry[] => {
        const { teams, riskManagementScores } = get()
        if (teams.length === 0) return []

        // Extract the total risk score per team (the library expects Map<string, number>)
        const riskTotals = new Map<string, number>()
        for (const [teamId, input] of riskManagementScores) {
          riskTotals.set(teamId, input.total)
        }

        return generateFinalLeaderboard(teams, riskTotals)
      },

      getDailyScenario: (day: number) => {
        // Cycle through scenarios, with some randomization
        const scenarioIndex = (day - 1) % DAILY_SCENARIOS.length
        return DAILY_SCENARIOS[scenarioIndex]
      },

      // Helper function to update room in backend
      updateRoomInBackend: async (updatedTeams: Team[]) => {
        const { currentGameRoom, isAuthenticated } = get()
        if (!currentGameRoom || !isAuthenticated) return
        
        try {
          const roomQuery = await table.getItems('ex4h3iac854w', {
            query: { room_id: currentGameRoom.id }
          })
          
          if (roomQuery.items.length > 0) {
            const roomItem = roomQuery.items[0]
            await table.updateItem('ex4h3iac854w', {
              _uid: roomItem._uid,
              _id: roomItem._id,
              teams: JSON.stringify(updatedTeams),
              last_updated: Date.now()
            })
          }
        } catch (error) {
          console.error('Failed to update room in backend:', error)
        }
      },

      // Authentication methods
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
              name: response.user.name
            },
            isAuthenticated: true 
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
          await auth.logout()
          set({ 
            user: null, 
            isAuthenticated: false,
            currentGameRoom: null,
            availableGameRooms: [],
            teams: [],
            currentTeam: null,
            gameMode: 'single'
          })
        } catch (error) {
          console.error('Failed to logout:', error)
          throw error
        }
      }
    }),
    {
      name: 'lemonade-game-storage',
      // Persist authentication and limited game state (rooms are loaded from backend)
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentGameRoom: state.currentGameRoom,
        teams: state.teams,
        gameMode: state.gameMode,
        // Persist budget and day for single player mode
        budget: state.gameMode === 'single' ? state.budget : 100,
        day: state.gameMode === 'single' ? state.day : 1
      })
    }
  )
)