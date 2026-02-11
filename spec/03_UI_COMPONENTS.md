# 03 - UI Components Specification

**Document:** User Interface Specifications
**Version:** 1.0
**Reference:** Multi-Factor Scoring Model Implementation

---

## Overview

This document specifies the UI components needed to support the Multi-Factor Scoring Model. These components extend the existing interface to display comprehensive scoring information.

---

## Component Architecture

### New Components Required

| Component | Priority | Description |
|-----------|----------|-------------|
| `ScoreBreakdown` | High | Displays multi-factor score breakdown |
| `EfficiencyIndicator` | High | Shows spoilage rate and efficiency |
| `RoundHistoryTracker` | Medium | Tracks round-by-round performance |
| `CategoryAwards` | Medium | Displays category-specific awards |
| `FacilitatorScoreInput` | High | Risk management score entry |
| `RealTimeScorePanel` | Low | Live score updates during play |

---

## 1. ScoreBreakdown Component

Displays the complete multi-factor score breakdown for a team.

### Visual Design

```
┌────────────────────────────────────────────────────────────┐
│  YOUR SCORE                                          83/100│
│  ══════════════════════════════════════════════════════════│
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Profit Ranking                         45 / 50       │ │
│  │ [██████████████████████████████████████████████░░░░] │ │
│  │ 2nd Place                                            │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Consistency                            16 / 20       │ │
│  │ [████████████████████████████████████████░░░░░░░░░░] │ │
│  │ 4 of 5 rounds profitable                             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Efficiency                             12 / 15       │ │
│  │ [████████████████████████████████████████░░░░░░░░░░] │ │
│  │ 15% spoilage rate                                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Risk Management                        10 / 15       │ │
│  │ [██████████████████████████████░░░░░░░░░░░░░░░░░░░░] │ │
│  │ Facilitator assessment                               │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Props Interface

```typescript
interface ScoreBreakdownProps {
  score: MultiFactorScore;
  teamName: string;
  profitRank: number;
  totalTeams: number;
  profitableRounds: number;
  totalRounds: number;
  spoilageRate: number;
  showDetails?: boolean;
}
```

### Implementation Notes

```tsx
export function ScoreBreakdown({
  score,
  teamName,
  profitRank,
  totalTeams,
  profitableRounds,
  totalRounds,
  spoilageRate,
  showDetails = true
}: ScoreBreakdownProps) {
  return (
    <Card className="bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>YOUR SCORE</span>
          <Badge variant="secondary" className="text-xl">
            {score.total}/100
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Profit Ranking Section */}
        <ScoreCategory
          label="Profit Ranking"
          points={score.profitRanking}
          maxPoints={50}
          detail={`${ordinal(profitRank)} Place of ${totalTeams}`}
        />

        {/* Consistency Section */}
        <ScoreCategory
          label="Consistency"
          points={score.consistency}
          maxPoints={20}
          detail={`${profitableRounds} of ${totalRounds} rounds profitable`}
        />

        {/* Efficiency Section */}
        <ScoreCategory
          label="Efficiency"
          points={score.efficiency}
          maxPoints={15}
          detail={`${(spoilageRate * 100).toFixed(1)}% spoilage rate`}
        />

        {/* Risk Management Section */}
        <ScoreCategory
          label="Risk Management"
          points={score.riskManagement}
          maxPoints={15}
          detail="Facilitator assessment"
        />
      </CardContent>
    </Card>
  );
}
```

---

## 2. EfficiencyIndicator Component

Real-time display of efficiency metrics during gameplay.

### Visual Design

```
┌─────────────────────────────────────┐
│  EFFICIENCY METER                   │
│  ═══════════════════════════════════│
│                                     │
│  Spoilage Rate: 15%                 │
│  [████████░░░░░░░░░░░░░░░░░░░░░░░░] │
│                                     │
│  Cups Made:  45                     │
│  Cups Sold:  38                     │
│  Unsold:      7                     │
│                                     │
│  Efficiency Points: 12/15           │
│  ⭐ Good efficiency!                │
└─────────────────────────────────────┘
```

### Props Interface

```typescript
interface EfficiencyIndicatorProps {
  cupsMade: number;
  cupsSold: number;
  showPoints?: boolean;
}
```

### Color Coding

| Spoilage Rate | Color | Status |
|---------------|-------|--------|
| 0-10% | Green | Excellent |
| 11-20% | Light Green | Good |
| 21-30% | Yellow | Average |
| 31-40% | Orange | Below Average |
| 41-50% | Red-Orange | Poor |
| 51%+ | Red | Very Poor |

---

## 3. RoundHistoryTracker Component

Displays round-by-round performance history.

### Visual Design

```
┌──────────────────────────────────────────────────────────┐
│  ROUND HISTORY                                           │
│  ════════════════════════════════════════════════════════│
│                                                          │
│  Round │ Profit │ Cups │ Spoilage │ Status              │
│  ──────┼────────┼──────┼──────────┼─────────────────────│
│    1   │ +$12.50│  22  │   10%    │ ✅ Profitable       │
│    2   │ +$8.75 │  18  │   15%    │ ✅ Profitable       │
│    3   │ -$5.20 │   8  │   35%    │ ❌ Loss             │
│    4   │ +$15.00│  25  │    8%    │ ✅ Profitable       │
│    5   │ +$22.30│  30  │    5%    │ ✅ Profitable       │
│  ──────┴────────┴──────┴──────────┴─────────────────────│
│                                                          │
│  Summary: 4/5 profitable | Avg Spoilage: 14.6%          │
└──────────────────────────────────────────────────────────┘
```

### Props Interface

```typescript
interface RoundHistoryTrackerProps {
  roundHistory: RoundResult[];
  currentRound: number;
}

interface RoundResult {
  round: number;
  profit: number;
  cupsMade: number;
  cupsSold: number;
  spoilageRate: number;
  revenue: number;
  costs: number;
}
```

---

## 4. CategoryAwards Component

Displays special awards for category leaders.

### Visual Design

```
┌────────────────────────────────────────────────────────┐
│  🏆 CATEGORY AWARDS                                    │
│  ══════════════════════════════════════════════════════│
│                                                        │
│  💰 BEST PROFIT                                        │
│     Team Alpha - $156.50 total profit                  │
│                                                        │
│  🎯 MOST CONSISTENT                                    │
│     Team Beta - 5/5 profitable rounds                  │
│                                                        │
│  ♻️ MOST EFFICIENT                                     │
│     Team Gamma - 8% spoilage rate                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Props Interface

```typescript
interface CategoryAwardsProps {
  teams: TeamWithScore[];
}

interface CategoryAward {
  category: 'profit' | 'consistency' | 'efficiency';
  teamId: string;
  teamName: string;
  value: number | string;
  icon: string;
}
```

### Award Criteria

| Award | Criteria | Displayed Value |
|-------|----------|-----------------|
| Best Profit | Highest total profit | Total profit amount |
| Most Consistent | Most profitable rounds | X/Y rounds profitable |
| Most Efficient | Lowest spoilage rate | Spoilage percentage |

---

## 5. FacilitatorScoreInput Component

Allows facilitators to enter risk management scores.

### Visual Design

```
┌────────────────────────────────────────────────────────┐
│  📋 FACILITATOR SCORING                                │
│  ══════════════════════════════════════════════════════│
│                                                        │
│  Team: [Dropdown - Select Team ▼]                      │
│                                                        │
│  RISK MANAGEMENT ASSESSMENT                            │
│                                                        │
│  Production Adjustment (0-5):                          │
│  [▼ 3 ▲]                                               │
│  □ Adjusted for weather  □ Scaled for demand           │
│                                                        │
│  Pricing Strategy (0-5):                               │
│  [▼ 4 ▲]                                               │
│  □ Market responsive  □ Competitive awareness          │
│                                                        │
│  Budget Reserves (0-5):                                │
│  [▼ 3 ▲]                                               │
│  □ Maintained buffer  □ Conservative spending          │
│                                                        │
│  Total Risk Score: 10/15                               │
│                                                        │
│  [  SAVE SCORE  ]                                      │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Props Interface

```typescript
interface FacilitatorScoreInputProps {
  teams: Team[];
  onScoreSaved: (teamId: string, score: RiskManagementScore) => void;
}

interface RiskManagementScore {
  productionAdjustment: number;  // 0-5
  pricingStrategy: number;       // 0-5
  budgetReserves: number;        // 0-5
  total: number;                 // 0-15
  notes?: string;
}
```

---

## 6. Updated Leaderboard Component

Extends existing Leaderboard to show multi-factor scores.

### Visual Design

```
┌────────────────────────────────────────────────────────────────┐
│  🏆 LEADERBOARD                                     12 teams   │
│  ══════════════════════════════════════════════════════════════│
│                                                                │
│  # │ Team          │ Total │ Profit │ Cons │ Effi │ Risk     │
│  ──┼───────────────┼───────┼────────┼──────┼──────┼──────────│
│  🥇│ Team Alpha    │  92   │   50   │  20  │  12  │   10     │
│    │ $156.50 profit│       │  1st   │ 5/5  │ 12%  │          │
│  ──┼───────────────┼───────┼────────┼──────┼──────┼──────────│
│  🥈│ Team Beta     │  87   │   45   │  20  │  12  │   10     │
│    │ $142.30 profit│       │  2nd   │ 5/5  │ 15%  │          │
│  ──┼───────────────┼───────┼────────┼──────┼──────┼──────────│
│  🥉│ Team Gamma    │  79   │   40   │  16  │  15  │    8     │
│    │ $128.90 profit│       │  3rd   │ 4/5  │  8%  │          │
│  ──┴───────────────┴───────┴────────┴──────┴──────┴──────────│
│                                                                │
│  [SHOW FULL BREAKDOWN] [EXPORT RESULTS]                        │
└────────────────────────────────────────────────────────────────┘
```

### Column Definitions

| Column | Width | Content |
|--------|-------|---------|
| Rank | 30px | Medal emoji or number |
| Team | 120px | Team name + color indicator |
| Total | 60px | Multi-factor total score |
| Profit | 60px | Profit ranking points + rank |
| Cons | 50px | Consistency points + ratio |
| Effi | 50px | Efficiency points + spoilage % |
| Risk | 60px | Risk management points |

---

## 7. Real-Time Score Panel (Optional)

Shows live score updates during gameplay.

### Visual Design

```
┌─────────────────────────────────┐
│  LIVE SCORE              Day 3  │
│  ═══════════════════════════════│
│                                 │
│  Current Rank: 2nd              │
│  Total Points: ~67              │
│                                 │
│  [████████████████░░░░░] 67%    │
│                                 │
│  Profit Rank:    ~45            │
│  Consistency:     12 (3/5)      │
│  Efficiency:      ~10           │
│  Risk: (pending)   --           │
└─────────────────────────────────┘
```

---

## Integration with Existing Components

### ResultsDisplay.tsx Updates

Add ScoreBreakdown below existing results:

```tsx
// After profit/loss display
{gameMode === 'multi' && (
  <ScoreBreakdown
    score={calculateMultiFactorScore(currentTeam)}
    teamName={currentTeam.name}
    // ... other props
  />
)}
```

### Leaderboard.tsx Updates

Replace simple profit display with multi-factor columns:

```tsx
// Replace current leaderboard rendering
<MultiFactorLeaderboard
  teams={teams}
  riskManagementScores={riskManagementScores}
/>
```

---

## Responsive Design Considerations

### Mobile View

| Screen Width | Layout Adjustment |
|--------------|-------------------|
| < 480px | Stack all elements vertically |
| 480-768px | 2-column layout for scores |
| > 768px | Full horizontal layout |

### Score Breakdown Mobile

```
┌──────────────────────┐
│  YOUR SCORE    83    │
│  ════════════════════│
│                      │
│  Profit Rank   45/50 │
│  [█████████████░░░░] │
│  2nd Place           │
│                      │
│  Consistency   16/20 │
│  [████████████░░░░░] │
│  4/5 rounds          │
│                      │
│  ... etc             │
└──────────────────────┘
```

---

## Component File Structure

```
src/components/
├── scoring/
│   ├── ScoreBreakdown.tsx
│   ├── ScoreCategory.tsx
│   ├── EfficiencyIndicator.tsx
│   ├── RoundHistoryTracker.tsx
│   ├── CategoryAwards.tsx
│   └── index.ts
├── facilitator/
│   ├── FacilitatorScoreInput.tsx
│   ├── RiskAssessmentForm.tsx
│   └── index.ts
├── Leaderboard.tsx (updated)
└── ResultsDisplay.tsx (updated)
```

---

## Summary

These UI components provide:

1. **Transparency:** Clear breakdown of how scores are calculated
2. **Motivation:** Visual progress bars and achievement tracking
3. **Education:** Explanations of what each metric means
4. **Facilitation:** Tools for instructors to input assessments
5. **Competition:** Detailed leaderboard with multiple dimensions
