# 01 - Scoring System Specification

**Document:** Multi-Factor Scoring Implementation
**Version:** 1.0
**Reference:** 2.1.3_Lemonade_Game_Scoring_Model.md (Option B)

---

## Overview

The Multi-Factor Scoring Model awards up to **100 points** across four categories, encouraging well-rounded business acumen rather than pure profit maximization.

---

## Scoring Components

| Component | Max Points | Weight |
|-----------|------------|--------|
| Profit Ranking | 50 | 50% |
| Consistency | 20 | 20% |
| Efficiency | 15 | 15% |
| Risk Management | 15 | 15% |
| **Total** | **100** | **100%** |

---

## 1. Profit Ranking (50 Points)

Points are awarded based on relative position among all teams, not absolute profit value.

### Point Distribution Table

| Rank | Points | Notes |
|------|--------|-------|
| 1st | 50 | Champion |
| 2nd | 45 | Runner-up |
| 3rd | 40 | Bronze |
| 4th | 35 | |
| 5th | 30 | |
| 6th-10th | 25 | |
| 11th-15th | 20 | |
| 16th-20th | 15 | |
| 21st+ | 10 | Participation points |

### Implementation

```typescript
/**
 * Calculate profit ranking points based on team's position
 * @param rank - Team's rank position (1-based)
 * @returns Points earned (10-50)
 */
const getProfitRankingPoints = (rank: number): number => {
  if (rank === 1) return 50;
  if (rank === 2) return 45;
  if (rank === 3) return 40;
  if (rank === 4) return 35;
  if (rank === 5) return 30;
  if (rank <= 10) return 25;
  if (rank <= 15) return 20;
  if (rank <= 20) return 15;
  return 10;
};
```

### Ranking Algorithm

```typescript
/**
 * Sort teams by total profit to determine ranks
 * Handles ties using tiebreaker rules
 */
const calculateProfitRanks = (teams: Team[]): TeamRank[] => {
  // Sort by total profit (descending)
  const sorted = [...teams].sort((a, b) => b.totalProfit - a.totalProfit);

  return sorted.map((team, index) => ({
    teamId: team.id,
    rank: index + 1,
    totalProfit: team.totalProfit,
    points: getProfitRankingPoints(index + 1)
  }));
};
```

### Tiebreaker Rules

When teams have identical total profit, apply these rules in order:

1. **Highest single-round profit** - Team with the best individual round wins
2. **Fewest loss rounds** - Team with fewer negative profit rounds wins
3. **Higher total revenue** - Team that generated more revenue wins
4. **Coin flip** - Random selection if still tied

```typescript
const resolveTie = (teamA: Team, teamB: Team): number => {
  // Rule 1: Highest single-round profit
  const maxA = Math.max(...teamA.roundHistory.map(r => r.profit));
  const maxB = Math.max(...teamB.roundHistory.map(r => r.profit));
  if (maxA !== maxB) return maxB - maxA;

  // Rule 2: Fewest loss rounds
  const lossesA = teamA.roundHistory.filter(r => r.profit < 0).length;
  const lossesB = teamB.roundHistory.filter(r => r.profit < 0).length;
  if (lossesA !== lossesB) return lossesA - lossesB;

  // Rule 3: Higher total revenue
  if (teamA.totalRevenue !== teamB.totalRevenue) {
    return teamB.totalRevenue - teamA.totalRevenue;
  }

  // Rule 4: Random (coin flip)
  return Math.random() > 0.5 ? 1 : -1;
};
```

---

## 2. Consistency (20 Points)

Rewards teams for maintaining profitability across multiple rounds.

### Calculation

- **4 points** per round with positive profit (profit > 0)
- **0 points** for rounds with zero or negative profit
- **Maximum:** 20 points (5 profitable rounds)

```typescript
/**
 * Calculate consistency points based on profitable rounds
 * @param roundHistory - Array of round results
 * @returns Points earned (0-20)
 */
const getConsistencyPoints = (roundHistory: RoundResult[]): number => {
  const profitableRounds = roundHistory.filter(round => round.profit > 0).length;
  return Math.min(profitableRounds * 4, 20);
};
```

### Examples

| Rounds Played | Profitable | Points | Notes |
|---------------|------------|--------|-------|
| 5 | 5 | 20 | Perfect consistency |
| 5 | 4 | 16 | Good performance |
| 5 | 3 | 12 | Average |
| 5 | 2 | 8 | Struggling |
| 5 | 1 | 4 | Needs improvement |
| 5 | 0 | 0 | No profitable rounds |

---

## 3. Efficiency (15 Points)

Measures how well teams manage inventory by minimizing spoilage (unsold cups).

### Spoilage Rate Calculation

```typescript
/**
 * Calculate spoilage rate across all rounds
 * Spoilage Rate = (Total Cups Made - Total Cups Sold) / Total Cups Made
 */
const calculateSpoilageRate = (roundHistory: RoundResult[]): number => {
  const totalMade = roundHistory.reduce((sum, r) => sum + r.cupsMade, 0);
  const totalSold = roundHistory.reduce((sum, r) => sum + r.cupsSold, 0);

  if (totalMade === 0) return 0;
  return (totalMade - totalSold) / totalMade;
};
```

### Point Distribution Table

| Spoilage Rate | Points | Performance Level |
|---------------|--------|-------------------|
| 0% - 10% | 15 | Excellent |
| 11% - 20% | 12 | Good |
| 21% - 30% | 9 | Average |
| 31% - 40% | 6 | Below Average |
| 41% - 50% | 3 | Poor |
| 51%+ | 0 | Very Poor |

### Implementation

```typescript
/**
 * Calculate efficiency points based on spoilage rate
 * @param spoilageRate - Ratio of unsold to made cups (0.0 - 1.0)
 * @returns Points earned (0-15)
 */
const getEfficiencyPoints = (spoilageRate: number): number => {
  if (spoilageRate <= 0.10) return 15;
  if (spoilageRate <= 0.20) return 12;
  if (spoilageRate <= 0.30) return 9;
  if (spoilageRate <= 0.40) return 6;
  if (spoilageRate <= 0.50) return 3;
  return 0;
};
```

### Current Implementation Gap

The current `GameResult` interface tracks `cupsSold` but **does not track `cupsMade`**. This field needs to be added to calculate spoilage.

**Required Changes:**
```typescript
// Add to GameResult interface
interface GameResult {
  cupsMade: number;    // NEW: Track production quantity
  cupsSold: number;    // Existing
  revenue: number;
  costs: number;
  profit: number;
  feedback: string[];
  spoilageRate: number; // NEW: Calculated spoilage
}
```

---

## 4. Risk Management (15 Points)

Assessed by facilitator observation during gameplay. This is a **manual scoring component**.

### Assessment Criteria

| Behavior | Points | Description |
|----------|--------|-------------|
| Adjusted production for forecast | +5 | Modified cup production based on weather/scenario |
| Adjusted pricing for conditions | +5 | Changed price strategy based on market conditions |
| Maintained reserves for uncertainty | +5 | Kept budget buffer for unexpected events |

### Facilitator Observation Checklist

```
RISK MANAGEMENT ASSESSMENT

Team Name: _________________________

□ Production Adjustment (0-5 points): _____
  - Did the team adjust cup production based on weather forecasts?
  - Did they scale production for high/low demand scenarios?

□ Pricing Strategy (0-5 points): _____
  - Did the team adjust prices for market conditions?
  - Did they respond to competitive pressure appropriately?

□ Budget Reserves (0-5 points): _____
  - Did the team maintain reserves for unexpected events?
  - Did they avoid over-investing all budget in one round?

TOTAL RISK MANAGEMENT POINTS: _____ / 15
```

### Implementation Considerations

Risk management scoring requires:
1. **Facilitator UI:** Input form for entering scores per team
2. **Storage:** Field in Team interface for risk management score
3. **Timing:** Should be scored at game end or per-round

---

## 5. Complete Score Calculation

### TypeScript Interface

```typescript
interface MultiFactorScore {
  profitRanking: number;    // 0-50 points
  consistency: number;      // 0-20 points
  efficiency: number;       // 0-15 points
  riskManagement: number;   // 0-15 points (facilitator input)
  total: number;            // Sum: 0-100 points
}
```

### Full Calculation Function

```typescript
/**
 * Calculate complete multi-factor score for a team
 */
const calculateMultiFactorScore = (
  team: Team,
  profitRank: number,
  riskManagementScore: number
): MultiFactorScore => {
  // Calculate spoilage rate from round history
  const spoilageRate = calculateSpoilageRate(team.roundHistory);

  // Calculate each component
  const profitRanking = getProfitRankingPoints(profitRank);
  const consistency = getConsistencyPoints(team.roundHistory);
  const efficiency = getEfficiencyPoints(spoilageRate);
  const riskManagement = Math.min(Math.max(riskManagementScore, 0), 15);

  return {
    profitRanking,
    consistency,
    efficiency,
    riskManagement,
    total: profitRanking + consistency + efficiency + riskManagement
  };
};
```

---

## 6. Leaderboard Sorting Logic

The final leaderboard should sort by **total multi-factor score**, not just profit.

```typescript
/**
 * Generate final leaderboard with multi-factor scores
 */
const generateFinalLeaderboard = (
  teams: Team[],
  riskManagementScores: Map<string, number>
): LeaderboardEntry[] => {
  // First, calculate profit ranks
  const profitRanks = calculateProfitRanks(teams);

  // Calculate multi-factor score for each team
  const scoredTeams = teams.map(team => {
    const profitRank = profitRanks.find(r => r.teamId === team.id)!.rank;
    const riskScore = riskManagementScores.get(team.id) || 0;
    const score = calculateMultiFactorScore(team, profitRank, riskScore);

    return {
      team,
      profitRank,
      score
    };
  });

  // Sort by total multi-factor score (descending)
  return scoredTeams.sort((a, b) => b.score.total - a.score.total);
};
```

---

## 7. Score Display Format

### Recommended Display

```
┌─────────────────────────────────────────────────────────────┐
│  FINAL SCORE BREAKDOWN                                      │
│                                                             │
│  Team: Lemon Legends                                        │
│                                                             │
│  ┌─────────────────┬────────┬────────┐                     │
│  │ Category        │ Earned │ Max    │                     │
│  ├─────────────────┼────────┼────────┤                     │
│  │ Profit Ranking  │   45   │   50   │  (2nd place)        │
│  │ Consistency     │   16   │   20   │  (4/5 profitable)   │
│  │ Efficiency      │   12   │   15   │  (15% spoilage)     │
│  │ Risk Management │   10   │   15   │  (Facilitator)      │
│  ├─────────────────┼────────┼────────┤                     │
│  │ TOTAL SCORE     │   83   │  100   │                     │
│  └─────────────────┴────────┴────────┘                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

The Multi-Factor Scoring Model creates a more comprehensive assessment that rewards:
- **Business Performance** (50%) - Overall profit generation
- **Reliability** (20%) - Consistent profitability
- **Operational Excellence** (15%) - Inventory management
- **Strategic Thinking** (15%) - Adaptive decision-making

This aligns with the educational goals of teaching well-rounded business skills rather than just profit-seeking behavior.
