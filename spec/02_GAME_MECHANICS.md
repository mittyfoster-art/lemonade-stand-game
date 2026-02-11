# 02 - Game Mechanics Specification

**Document:** Core Game Logic and Rules
**Version:** 1.0
**Reference:** Existing game-store.ts implementation

---

## Overview

The Lemonade Stand Business Simulation is an educational game where teams make daily business decisions to run a virtual lemonade stand. The game teaches financial literacy, market analysis, and strategic decision-making.

---

## Game Structure

### Game Duration

| Parameter | Value | Notes |
|-----------|-------|-------|
| Total Rounds | 5 | Per complete game session |
| Scenarios Available | 10 | Cycle through if more rounds needed |
| Starting Budget | $100 | Reset at game start |

### Round Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      ROUND FLOW                             │
│                                                             │
│  1. SCENARIO PRESENTATION                                   │
│     └── Display day's market conditions and story           │
│                                                             │
│  2. DECISION PHASE                                          │
│     ├── Set Price ($0.25 - $2.00)                          │
│     ├── Choose Quality (1-5)                                │
│     └── Allocate Marketing ($0 - $30)                       │
│                                                             │
│  3. SIMULATION                                              │
│     └── Calculate results based on decisions + scenario     │
│                                                             │
│  4. RESULTS DISPLAY                                         │
│     ├── Revenue, Costs, Profit                              │
│     ├── Cups Sold                                           │
│     └── Feedback & Analysis                                 │
│                                                             │
│  5. BUDGET UPDATE                                           │
│     └── New Budget = Current Budget + Profit                │
│                                                             │
│  6. NEXT DAY (or END GAME if Round 5)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Decision Inputs

### 1. Price Per Cup

| Parameter | Value |
|-----------|-------|
| Minimum | $0.25 |
| Maximum | $2.00 |
| Default | $1.00 |
| Step | $0.05 |

**Impact:**
- Lower prices attract more customers (higher demand)
- Higher prices increase revenue per cup but reduce demand
- Must exceed cost per cup for profitability

### 2. Quality Level

| Level | Cost/Cup | Description |
|-------|----------|-------------|
| 1 | $0.10 | Basic - Minimal ingredients |
| 2 | $0.12 | Economy - Standard recipe |
| 3 | $0.15 | Standard - Good balance |
| 4 | $0.20 | Premium - High quality ingredients |
| 5 | $0.28 | Artisan - Top-tier ingredients |

**Cost Multipliers:**
```typescript
const qualityCostMultiplier = [1.0, 1.2, 1.5, 2.0, 2.8];
const baseCost = 0.10;
const costPerCup = baseCost * qualityCostMultiplier[quality - 1];
```

**Impact:**
- Higher quality increases customer satisfaction
- Higher quality increases production costs
- Quality expectations vary by scenario/market

### 3. Marketing Spend

| Parameter | Value |
|-----------|-------|
| Minimum | $0 |
| Maximum | $30 |
| Default | $10 |
| Step | $1 |

**Impact:**
- Increases customer awareness and foot traffic
- Directly deducted from budget as cost
- Effectiveness varies by scenario

---

## Cost Structure

### Fixed Costs

| Cost Type | Amount | Notes |
|-----------|--------|-------|
| Stand Setup | $20 | Permits, equipment, location |

### Variable Costs

| Cost Type | Calculation | Notes |
|-----------|-------------|-------|
| Ingredients | `cupsSold × costPerCup` | Based on quality level |
| Marketing | `marketingSpend` | Direct budget deduction |

### Total Cost Formula

```typescript
const totalCosts = fixedCosts + variableCosts + marketingCosts;
// Where:
// fixedCosts = 20
// variableCosts = cupsSold × qualityCost[quality]
// marketingCosts = min(marketing, budget - fixedCosts)
```

---

## Demand Calculation

### Demand Factors

```typescript
// Price attractiveness (lower price = higher demand)
const priceAttractiveness = Math.max(0, (2.0 - price) / 1.75) * priceScore;

// Quality factor (higher quality = higher demand)
const qualityFactor = (quality / 5) * qualityScore;

// Marketing factor (more marketing = higher demand)
const marketingFactor = (1 + (marketing / 50)) * marketingScore;

// Weather/scenario effect (0.6 - 1.4 multiplier)
const weatherFactor = scenario.weatherEffect;
```

### Decision Alignment Scoring

When decisions match the scenario's optimal ranges, a 1.2x bonus is applied:

```typescript
const priceScore = isInRange(price, scenario.optimalDecision.priceRange) ? 1.2 : 0.8;
const qualityScore = isInRange(quality, scenario.optimalDecision.qualityRange) ? 1.2 : 0.8;
const marketingScore = isInRange(marketing, scenario.optimalDecision.marketingRange) ? 1.2 : 0.8;
```

### Final Demand Formula

```typescript
const baseDemand = 50;
const scenarioMultiplier = {
  low: 1.0,
  medium: 1.1,
  high: 1.3
}[scenario.deceptionLevel];

const demand = baseDemand
  × priceAttractiveness
  × qualityFactor
  × marketingFactor
  × weatherFactor
  × scenarioMultiplier;
```

### Cups Sold Calculation

```typescript
const maxCapacity = 150;
const cupsSold = Math.min(Math.floor(demand), maxCapacity);
```

---

## Financial Calculations

### Revenue

```typescript
const revenue = cupsSold × price;
```

### Profit

```typescript
const profit = revenue - totalCosts;
// Rounded to 2 decimal places
const profitRounded = Math.round(profit * 100) / 100;
```

### Budget Update

```typescript
const newBudget = currentBudget + profit;
```

---

## Budget Carry-Over Rules

| Condition | Action |
|-----------|--------|
| Profit > 0 | Budget increases for next round |
| Profit < 0 | Budget decreases (can go negative temporarily) |
| Budget < $20 | Cannot afford fixed costs - limited options |
| Budget ≤ 0 | Game over condition (bankruptcy) |

### Budget Constraints

```typescript
// Marketing is capped by available budget after fixed costs
const actualMarketing = Math.min(marketing, budget - totalFixedCosts);
```

---

## Game Over Conditions

| Condition | Trigger | Outcome |
|-----------|---------|---------|
| Bankruptcy | Budget ≤ $0 after round | Game ends early |
| Completion | 5 rounds played | Normal game end |

---

## Production Quantity (For Efficiency Tracking)

### Current Gap

The current implementation does not track `cupsMade` separately from `cupsSold`. For the multi-factor scoring model, we need to track production quantity.

### Proposed Production Model

```typescript
/**
 * Calculate cups made based on budget and decisions
 * Production is committed before knowing actual sales
 */
const calculateCupsMade = (budget: number, quality: number): number => {
  const costPerCup = 0.10 * [1.0, 1.2, 1.5, 2.0, 2.8][quality - 1];
  const availableBudget = Math.max(0, budget - 20 - marketing); // After fixed costs and marketing
  const maxProduction = Math.floor(availableBudget / costPerCup);

  // Cap at maximum capacity
  return Math.min(maxProduction, 150);
};
```

### Alternative: Decision-Based Production

Teams could explicitly choose how many cups to make:

```typescript
interface GameDecision {
  price: number;
  quality: number;
  marketing: number;
  production: number; // NEW: How many cups to make
}
```

This adds strategic depth by requiring inventory management decisions.

---

## Scenario Selection

### Scenario Cycling

```typescript
const getDailyScenario = (day: number): DailyScenario => {
  const scenarioIndex = (day - 1) % DAILY_SCENARIOS.length;
  return DAILY_SCENARIOS[scenarioIndex];
};
```

### Scenario Assignment

| Day | Scenario Index | Notes |
|-----|---------------|-------|
| 1 | 0 | First scenario |
| 2 | 1 | Second scenario |
| ... | ... | ... |
| 10 | 9 | Last unique scenario |
| 11 | 0 | Cycles back to first |

---

## Team State Management

### Per-Round Updates

After each simulation:

```typescript
const updatedTeam = {
  ...team,
  profit: team.profit + result.profit,
  revenue: team.revenue + result.revenue,
  cupsSold: team.cupsSold + result.cupsSold,
  gamesPlayed: team.gamesPlayed + 1,
  lastResult: result,
  timestamp: Date.now(),
  currentBudget: newBudget,
  day: day
};
```

### State Persistence

- **Local Storage:** Used for single-player mode and session persistence
- **Backend (Devv):** Used for multi-team game rooms

---

## Reset Behavior

### New Day Reset

```typescript
// Reset decisions to defaults, keep budget
set({
  day: newDay,
  result: null,
  currentScenario: getDailyScenario(newDay),
  currentDecision: {
    price: 1.00,
    quality: 3,
    marketing: 10
  }
});
```

### Full Game Reset

```typescript
// Complete reset to initial state
set({
  budget: 100,
  currentDecision: { price: 1.00, quality: 3, marketing: 10 },
  result: null,
  isSimulating: false,
  day: 1,
  currentScenario: DAILY_SCENARIOS[0]
});
```

---

## Summary

The game mechanics create a realistic business simulation where:

1. **Decisions matter:** Price, quality, and marketing all affect outcomes
2. **Context is key:** Scenarios create varying market conditions
3. **Risk exists:** Budget constraints and potential losses create tension
4. **Learning occurs:** Feedback helps understand business concepts

The multi-factor scoring model builds on these mechanics to reward consistent, efficient, and strategic play rather than lucky single rounds.
