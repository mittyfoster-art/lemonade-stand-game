# 04 - Data Model Specification

**Document:** State Management and Data Structures
**Version:** 1.0
**Reference:** game-store.ts, Multi-Factor Scoring Model

---

## Overview

This document specifies the data structures required to support the Multi-Factor Scoring Model. It includes updates to existing interfaces and new interfaces needed for comprehensive scoring.

---

## Current Data Model

### Existing Interfaces (game-store.ts)

```typescript
// Current Team interface
interface Team {
  id: string;
  name: string;
  color: string;
  profit: number;
  revenue: number;
  cupsSold: number;
  gamesPlayed: number;
  lastResult: GameResult | null;
  timestamp: number;
  currentBudget: number;
  day: number;
}

// Current GameResult interface
interface GameResult {
  cupsSold: number;
  revenue: number;
  costs: number;
  profit: number;
  feedback: string[];
}
```

---

## Updated Data Model

### 1. Enhanced Team Interface

```typescript
interface Team {
  // Existing fields
  id: string;
  name: string;
  color: string;
  profit: number;
  revenue: number;
  cupsSold: number;
  gamesPlayed: number;
  lastResult: GameResult | null;
  timestamp: number;
  currentBudget: number;
  day: number;

  // NEW: Multi-factor scoring fields
  roundHistory: RoundResult[];           // Track each round's details
  totalCupsMade: number;                 // For efficiency calculation
  profitableRounds: number;              // For consistency calculation
  riskManagementScore: number;           // Facilitator-assigned (0-15)
  multiFactorScore: MultiFactorScore | null;  // Calculated final score
}
```

### 2. Round Result Interface (NEW)

```typescript
interface RoundResult {
  round: number;                // Round number (1-5)
  scenarioId: string;           // Which scenario was played

  // Decision tracking
  decision: GameDecision;       // Player's choices

  // Production metrics
  cupsMade: number;             // How many cups were produced
  cupsSold: number;             // How many were actually sold
  spoilageRate: number;         // (made - sold) / made

  // Financial metrics
  revenue: number;
  costs: number;
  profit: number;

  // Performance indicators
  decisionQuality: DecisionQuality;  // How well decisions matched optimal
  timestamp: number;
}
```

### 3. Decision Quality Interface (NEW)

```typescript
interface DecisionQuality {
  priceOptimal: boolean;        // Price within optimal range
  qualityOptimal: boolean;      // Quality within optimal range
  marketingOptimal: boolean;    // Marketing within optimal range
  overallScore: number;         // 0-3 based on optimal matches
}
```

### 4. Multi-Factor Score Interface

```typescript
interface MultiFactorScore {
  // Component scores
  profitRanking: number;        // 0-50 points
  consistency: number;          // 0-20 points
  efficiency: number;           // 0-15 points
  riskManagement: number;       // 0-15 points

  // Total
  total: number;                // 0-100 points

  // Metadata
  profitRank: number;           // Actual rank position
  spoilageRate: number;         // Overall spoilage rate
  profitableRounds: number;     // Count of profitable rounds
  calculatedAt: number;         // Timestamp of calculation
}
```

### 5. Enhanced Game Result Interface

```typescript
interface GameResult {
  // Existing fields
  cupsSold: number;
  revenue: number;
  costs: number;
  profit: number;
  feedback: string[];

  // NEW: Production tracking
  cupsMade: number;             // Production quantity
  spoilageRate: number;         // This round's spoilage

  // NEW: Decision analysis
  decisionQuality: DecisionQuality;
}
```

---

## State Management Updates

### Game Store State

```typescript
interface GameState {
  // Existing state
  budget: number;
  currentDecision: GameDecision;
  result: GameResult | null;
  isSimulating: boolean;
  day: number;
  currentScenario: DailyScenario | null;

  user: User | null;
  isAuthenticated: boolean;
  isAuthenticating: boolean;

  currentGameRoom: GameRoom | null;
  availableGameRooms: GameRoom[];
  isLoadingRooms: boolean;

  teams: Team[];
  currentTeam: Team | null;
  gameMode: 'single' | 'multi';

  // NEW: Multi-factor scoring state
  riskManagementScores: Map<string, RiskManagementInput>;  // teamId -> scores
  finalScores: Map<string, MultiFactorScore>;             // teamId -> final score
  isCalculatingScores: boolean;
}
```

### Risk Management Input Interface

```typescript
interface RiskManagementInput {
  teamId: string;
  productionAdjustment: number;  // 0-5
  pricingStrategy: number;       // 0-5
  budgetReserves: number;        // 0-5
  total: number;                 // 0-15
  notes: string;
  assessedBy: string;            // Facilitator name/ID
  assessedAt: number;            // Timestamp
}
```

---

## New Store Actions

### Scoring Actions

```typescript
interface GameState {
  // ... existing actions

  // NEW: Multi-factor scoring actions
  calculateMultiFactorScores: () => void;
  setRiskManagementScore: (teamId: string, score: RiskManagementInput) => void;
  getFinalLeaderboard: () => LeaderboardEntry[];

  // NEW: Round tracking actions
  addRoundToHistory: (teamId: string, result: RoundResult) => void;
  getRoundHistory: (teamId: string) => RoundResult[];

  // NEW: Efficiency tracking
  updateTeamEfficiency: (teamId: string) => void;
  calculateSpoilageRate: (teamId: string) => number;
}
```

### Implementation: calculateMultiFactorScores

```typescript
calculateMultiFactorScores: () => {
  const { teams, riskManagementScores } = get();

  // Step 1: Calculate profit ranks
  const sortedByProfit = [...teams].sort((a, b) => b.profit - a.profit);
  const profitRanks = new Map<string, number>();
  sortedByProfit.forEach((team, index) => {
    profitRanks.set(team.id, index + 1);
  });

  // Step 2: Calculate multi-factor score for each team
  const finalScores = new Map<string, MultiFactorScore>();

  teams.forEach(team => {
    const profitRank = profitRanks.get(team.id)!;
    const riskScore = riskManagementScores.get(team.id)?.total || 0;

    // Calculate spoilage rate
    const spoilageRate = team.totalCupsMade > 0
      ? (team.totalCupsMade - team.cupsSold) / team.totalCupsMade
      : 0;

    // Calculate each component
    const profitRanking = getProfitRankingPoints(profitRank);
    const consistency = Math.min(team.profitableRounds * 4, 20);
    const efficiency = getEfficiencyPoints(spoilageRate);
    const riskManagement = Math.min(riskScore, 15);

    finalScores.set(team.id, {
      profitRanking,
      consistency,
      efficiency,
      riskManagement,
      total: profitRanking + consistency + efficiency + riskManagement,
      profitRank,
      spoilageRate,
      profitableRounds: team.profitableRounds,
      calculatedAt: Date.now()
    });
  });

  set({ finalScores, isCalculatingScores: false });
}
```

---

## Updated Simulation Logic

### Production Calculation

The simulation needs to track how many cups were made vs. sold:

```typescript
const simulateBusiness = (
  decision: GameDecision,
  budget: number,
  scenario: DailyScenario
): GameResult => {
  // ... existing calculation logic ...

  // Calculate cups made (production capacity based on budget)
  const cupsMade = calculateProduction(budget, decision.quality, decision.marketing);

  // Cups sold is capped by both demand AND production
  const cupsSold = Math.min(Math.floor(demand), maxCapacity, cupsMade);

  // Calculate spoilage
  const spoilageRate = cupsMade > 0 ? (cupsMade - cupsSold) / cupsMade : 0;

  // Determine decision quality
  const decisionQuality = {
    priceOptimal: isInRange(price, scenario.optimalDecision.priceRange),
    qualityOptimal: isInRange(quality, scenario.optimalDecision.qualityRange),
    marketingOptimal: isInRange(marketing, scenario.optimalDecision.marketingRange),
    overallScore: 0  // Calculated below
  };
  decisionQuality.overallScore =
    (decisionQuality.priceOptimal ? 1 : 0) +
    (decisionQuality.qualityOptimal ? 1 : 0) +
    (decisionQuality.marketingOptimal ? 1 : 0);

  return {
    cupsMade,       // NEW
    cupsSold,
    revenue: Math.round(revenue * 100) / 100,
    costs: Math.round(totalBusinessCosts * 100) / 100,
    profit: Math.round(profit * 100) / 100,
    feedback,
    spoilageRate,   // NEW
    decisionQuality // NEW
  };
};
```

### Production Capacity Calculation

```typescript
/**
 * Calculate how many cups a team can produce based on available budget
 * This represents the commitment made before knowing actual demand
 */
const calculateProduction = (
  budget: number,
  quality: number,
  marketing: number
): number => {
  const fixedCosts = 20;
  const qualityCost = [0.10, 0.12, 0.15, 0.20, 0.28][quality - 1];

  // Available budget for production after fixed costs and marketing
  const productionBudget = Math.max(0, budget - fixedCosts - marketing);

  // Calculate max cups we can afford to make
  const maxAffordable = Math.floor(productionBudget / qualityCost);

  // Cap at reasonable production capacity
  const maxCapacity = 150;

  // Default production strategy: make enough for expected demand
  // Teams could override this with explicit production decisions
  const targetProduction = Math.min(maxAffordable, maxCapacity);

  return targetProduction;
};
```

---

## Team Update After Round

```typescript
// After simulation, update team with round result
const updateTeamAfterRound = (
  team: Team,
  result: GameResult,
  scenario: DailyScenario,
  day: number
): Team => {
  const roundResult: RoundResult = {
    round: day,
    scenarioId: scenario.id,
    decision: get().currentDecision,
    cupsMade: result.cupsMade,
    cupsSold: result.cupsSold,
    spoilageRate: result.spoilageRate,
    revenue: result.revenue,
    costs: result.costs,
    profit: result.profit,
    decisionQuality: result.decisionQuality,
    timestamp: Date.now()
  };

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
    currentBudget: team.currentBudget + result.profit,
    day: day
  };
};
```

---

## Leaderboard Entry Structure

```typescript
interface LeaderboardEntry {
  rank: number;
  team: Team;
  multiFactorScore: MultiFactorScore;
  awards: CategoryAward[];
}

interface CategoryAward {
  category: 'profit' | 'consistency' | 'efficiency';
  icon: string;
  label: string;
}
```

### Generate Final Leaderboard

```typescript
const getFinalLeaderboard = (): LeaderboardEntry[] => {
  const { teams, finalScores } = get();

  // Sort by multi-factor total score
  const sorted = [...teams].sort((a, b) => {
    const scoreA = finalScores.get(a.id)?.total || 0;
    const scoreB = finalScores.get(b.id)?.total || 0;
    return scoreB - scoreA;
  });

  // Determine category awards
  const bestProfit = [...teams].sort((a, b) => b.profit - a.profit)[0];
  const mostConsistent = [...teams].sort((a, b) =>
    b.profitableRounds - a.profitableRounds
  )[0];
  const mostEfficient = [...teams].sort((a, b) => {
    const rateA = a.totalCupsMade > 0 ? (a.totalCupsMade - a.cupsSold) / a.totalCupsMade : 1;
    const rateB = b.totalCupsMade > 0 ? (b.totalCupsMade - b.cupsSold) / b.totalCupsMade : 1;
    return rateA - rateB;
  })[0];

  return sorted.map((team, index) => ({
    rank: index + 1,
    team,
    multiFactorScore: finalScores.get(team.id)!,
    awards: [
      team.id === bestProfit?.id && { category: 'profit', icon: '💰', label: 'Best Profit' },
      team.id === mostConsistent?.id && { category: 'consistency', icon: '🎯', label: 'Most Consistent' },
      team.id === mostEfficient?.id && { category: 'efficiency', icon: '♻️', label: 'Most Efficient' }
    ].filter(Boolean) as CategoryAward[]
  }));
};
```

---

## Backend Sync Requirements

### Updated Room Data Structure

```typescript
// Backend table schema for game rooms
interface GameRoomBackendRecord {
  room_id: string;
  room_name: string;
  teams: string;  // JSON serialized Team[]
  created_at: number;
  last_updated: number;

  // NEW: Multi-factor scoring data
  risk_management_scores: string;  // JSON serialized Map
  final_scores: string;            // JSON serialized Map
  game_status: 'active' | 'completed';
}
```

### Sync Functions

```typescript
// Update room with scoring data
const updateRoomScoring = async (
  roomId: string,
  riskScores: Map<string, RiskManagementInput>,
  finalScores: Map<string, MultiFactorScore>
) => {
  const roomQuery = await table.getItems('ex4h3iac854w', {
    query: { room_id: roomId }
  });

  if (roomQuery.items.length > 0) {
    const roomItem = roomQuery.items[0];
    await table.updateItem('ex4h3iac854w', {
      _uid: roomItem._uid,
      _id: roomItem._id,
      risk_management_scores: JSON.stringify(Object.fromEntries(riskScores)),
      final_scores: JSON.stringify(Object.fromEntries(finalScores)),
      game_status: 'completed',
      last_updated: Date.now()
    });
  }
};
```

---

## Migration Strategy

### Step 1: Add New Fields with Defaults

```typescript
// When loading existing teams, initialize new fields
const migrateTeam = (oldTeam: any): Team => ({
  ...oldTeam,
  roundHistory: oldTeam.roundHistory || [],
  totalCupsMade: oldTeam.totalCupsMade || oldTeam.cupsSold || 0,
  profitableRounds: oldTeam.profitableRounds ||
    (oldTeam.profit > 0 ? oldTeam.gamesPlayed : 0),
  riskManagementScore: oldTeam.riskManagementScore || 0,
  multiFactorScore: oldTeam.multiFactorScore || null
});
```

### Step 2: Update Simulation to Populate New Fields

Modify `simulateBusiness` and team update logic to track:
- `cupsMade` per round
- `spoilageRate` per round
- `decisionQuality` per round

### Step 3: Add Scoring Calculation

Implement `calculateMultiFactorScores` action for end-of-game calculations.

---

## Data Validation

### Team Validation

```typescript
const validateTeam = (team: Team): boolean => {
  return (
    typeof team.id === 'string' &&
    typeof team.name === 'string' &&
    typeof team.profit === 'number' &&
    typeof team.cupsSold === 'number' &&
    Array.isArray(team.roundHistory) &&
    team.riskManagementScore >= 0 &&
    team.riskManagementScore <= 15
  );
};
```

### Score Validation

```typescript
const validateMultiFactorScore = (score: MultiFactorScore): boolean => {
  return (
    score.profitRanking >= 0 && score.profitRanking <= 50 &&
    score.consistency >= 0 && score.consistency <= 20 &&
    score.efficiency >= 0 && score.efficiency <= 15 &&
    score.riskManagement >= 0 && score.riskManagement <= 15 &&
    score.total === score.profitRanking + score.consistency +
                    score.efficiency + score.riskManagement
  );
};
```

---

## Summary

The data model updates provide:

1. **Comprehensive Tracking:** Round-by-round history for detailed analysis
2. **Efficiency Metrics:** Production vs. sales tracking for spoilage calculation
3. **Scoring Support:** All fields needed for multi-factor score calculation
4. **Facilitator Integration:** Risk management input structure
5. **Backward Compatibility:** Migration strategy for existing data
