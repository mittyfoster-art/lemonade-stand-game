# Lemonade Stand Game - Multi-Factor Scoring Implementation

## Project Overview

**Project Name:** Lemonade Stand Business Simulation - Multi-Factor Scoring Update
**Project Type:** Feature Enhancement
**Base Project:** Existing React/TypeScript Vite application

### Objective

Implement the approved Multi-Factor Scoring Model (Option B - 100 points) to replace the current profit-only scoring system. This involves updating the data model, adding new UI components, implementing scoring algorithms, and creating facilitator tools.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | Zustand (with persist middleware) |
| Backend | Devv Backend (existing) |
| Database | SQLite for features (local), Devv tables (production) |

---

## Prerequisites

- Node.js 18+
- Existing Lemonade Stand Game codebase
- Claude Code CLI installed and authenticated
- Specification documents in `/spec` folder

---

## Project Structure

```
/Lemonade Stand Business Simulation
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn components (existing)
│   │   ├── scoring/         # NEW: Multi-factor scoring components
│   │   │   ├── ScoreBreakdown.tsx
│   │   │   ├── ScoreCategory.tsx
│   │   │   ├── EfficiencyIndicator.tsx
│   │   │   ├── RoundHistoryTracker.tsx
│   │   │   └── CategoryAwards.tsx
│   │   ├── facilitator/     # NEW: Facilitator tools
│   │   │   ├── FacilitatorScoreInput.tsx
│   │   │   └── RiskAssessmentForm.tsx
│   │   ├── Leaderboard.tsx  # UPDATE: Multi-factor display
│   │   └── ResultsDisplay.tsx # UPDATE: Add score breakdown
│   ├── store/
│   │   └── game-store.ts    # UPDATE: Add scoring state/actions
│   ├── lib/
│   │   ├── utils.ts         # Existing
│   │   └── scoring.ts       # NEW: Scoring calculation functions
│   └── types/
│       └── scoring.ts       # NEW: TypeScript interfaces
├── spec/                    # Specification documents (existing)
└── autonomous-coder/        # This autonomous coder system
```

---

## Core Features to Implement

### Total Features: ~45

### Category 1: Data Model Updates (8 features)
1. Create MultiFactorScore interface
2. Create RoundResult interface
3. Create DecisionQuality interface
4. Update Team interface with scoring fields
5. Add roundHistory array to Team
6. Add totalCupsMade tracking
7. Add profitableRounds counter
8. Create RiskManagementInput interface

### Category 2: Scoring Calculations (10 features)
9. Implement getProfitRankingPoints function
10. Implement calculateProfitRanks function
11. Implement getConsistencyPoints function
12. Implement calculateSpoilageRate function
13. Implement getEfficiencyPoints function
14. Implement calculateMultiFactorScore function
15. Implement tiebreaker resolution logic
16. Add cupsMade calculation to simulation
17. Update simulation to track spoilage
18. Add decisionQuality tracking to results

### Category 3: Store Actions (8 features)
19. Add calculateMultiFactorScores action
20. Add setRiskManagementScore action
21. Add getFinalLeaderboard action
22. Add addRoundToHistory action
23. Update runSimulation to populate new fields
24. Update team state after round completion
25. Add riskManagementScores state (Map)
26. Add finalScores state (Map)

### Category 4: UI Components - Scoring (8 features)
27. Create ScoreCategory component
28. Create ScoreBreakdown component
29. Create EfficiencyIndicator component
30. Create RoundHistoryTracker component
31. Create CategoryAwards component
32. Update ResultsDisplay with score breakdown
33. Add real-time score panel (optional)
34. Create score progress bars

### Category 5: UI Components - Facilitator (4 features)
35. Create FacilitatorScoreInput component
36. Create RiskAssessmentForm component
37. Add facilitator mode toggle
38. Create facilitator dashboard view

### Category 6: Leaderboard Updates (5 features)
39. Update Leaderboard with multi-factor columns
40. Add score breakdown modal
41. Implement category awards display
42. Add export functionality (CSV)
43. Add print certificates feature

### Category 7: Testing & Polish (2+ features)
44. Add scoring calculation tests
45. Edge case handling and validation

---

## Scoring Model Specification

### Multi-Factor Score (100 points total)

| Component | Max Points | Calculation |
|-----------|------------|-------------|
| Profit Ranking | 50 | Position-based (1st=50, 2nd=45, etc.) |
| Consistency | 20 | 4 points per profitable round |
| Efficiency | 15 | Based on spoilage rate |
| Risk Management | 15 | Facilitator assessment |

### Profit Ranking Points
```
1st place  → 50 points
2nd place  → 45 points
3rd place  → 40 points
4th place  → 35 points
5th place  → 30 points
6th-10th   → 25 points
11th-15th  → 20 points
16th-20th  → 15 points
21st+      → 10 points
```

### Efficiency Points (Spoilage Rate)
```
0-10%   → 15 points
11-20%  → 12 points
21-30%  → 9 points
31-40%  → 6 points
41-50%  → 3 points
51%+    → 0 points
```

---

## Key TypeScript Interfaces

```typescript
interface MultiFactorScore {
  profitRanking: number;    // 0-50
  consistency: number;      // 0-20
  efficiency: number;       // 0-15
  riskManagement: number;   // 0-15
  total: number;            // 0-100
  profitRank: number;
  spoilageRate: number;
  profitableRounds: number;
  calculatedAt: number;
}

interface RoundResult {
  round: number;
  scenarioId: string;
  decision: GameDecision;
  cupsMade: number;
  cupsSold: number;
  spoilageRate: number;
  revenue: number;
  costs: number;
  profit: number;
  decisionQuality: DecisionQuality;
  timestamp: number;
}

interface RiskManagementInput {
  teamId: string;
  productionAdjustment: number;  // 0-5
  pricingStrategy: number;       // 0-5
  budgetReserves: number;        // 0-5
  total: number;                 // 0-15
  notes: string;
  assessedBy: string;
  assessedAt: number;
}
```

---

## Implementation Guidelines

### Code Style
- Use TypeScript strict mode
- Follow existing component patterns (shadcn/ui)
- Use Tailwind CSS for styling
- Maintain existing color scheme (orange/yellow theme)

### State Management
- All scoring state in Zustand store
- Use persist middleware for local storage
- Sync with Devv backend for multi-player

### Testing
- Each feature should be tested visually in browser
- Verify calculations match specification
- Test edge cases (zero values, ties, negative profits)

### Performance
- Lazy load facilitator components
- Memoize expensive calculations
- Avoid re-rendering entire leaderboard

---

## Reference Documents

- `/spec/00_SPEC_INDEX.md` - Master specification index
- `/spec/01_SCORING_SYSTEM.md` - Detailed scoring formulas
- `/spec/02_GAME_MECHANICS.md` - Game logic reference
- `/spec/03_UI_COMPONENTS.md` - Component specifications
- `/spec/04_DATA_MODEL.md` - Data structure definitions
- `/spec/05_SCENARIOS.md` - Scenario reference
- `/spec/06_LEADERBOARD.md` - Leaderboard specifications
- `/spec/07_TEST_CASES.md` - Test case specifications

---

## Success Criteria

1. All 45+ features implemented and tested
2. Scoring calculations match spec exactly
3. UI displays all score components clearly
4. Facilitator can input risk management scores
5. Leaderboard shows multi-factor rankings
6. Category awards displayed correctly
7. No regression in existing functionality
8. Backend sync works for multi-player mode
