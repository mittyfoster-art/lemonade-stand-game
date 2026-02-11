# 06 - Leaderboard Specification

**Document:** Leaderboard and Ranking Specifications
**Version:** 1.0
**Reference:** Multi-Factor Scoring Model (Option B)

---

## Overview

The leaderboard displays team rankings based on the Multi-Factor Scoring Model (100 points). It provides transparency into how scores are calculated and recognizes excellence in specific categories.

---

## Ranking Algorithm

### Primary Sort: Total Multi-Factor Score

Teams are ranked by their total multi-factor score (0-100 points) in descending order.

```typescript
const sortByMultiFactorScore = (teams: TeamWithScore[]): TeamWithScore[] => {
  return [...teams].sort((a, b) => {
    return b.multiFactorScore.total - a.multiFactorScore.total;
  });
};
```

### Tiebreaker Rules

When teams have identical total scores, apply these rules in order:

| Priority | Tiebreaker | Logic |
|----------|------------|-------|
| 1 | Profit Ranking Points | Higher profit rank wins |
| 2 | Consistency Points | More profitable rounds wins |
| 3 | Efficiency Points | Lower spoilage rate wins |
| 4 | Total Profit | Higher absolute profit wins |
| 5 | Timestamp | Earlier completion wins |

```typescript
const resolveTie = (a: TeamWithScore, b: TeamWithScore): number => {
  // Tiebreaker 1: Profit ranking points
  if (a.multiFactorScore.profitRanking !== b.multiFactorScore.profitRanking) {
    return b.multiFactorScore.profitRanking - a.multiFactorScore.profitRanking;
  }

  // Tiebreaker 2: Consistency points
  if (a.multiFactorScore.consistency !== b.multiFactorScore.consistency) {
    return b.multiFactorScore.consistency - a.multiFactorScore.consistency;
  }

  // Tiebreaker 3: Efficiency points
  if (a.multiFactorScore.efficiency !== b.multiFactorScore.efficiency) {
    return b.multiFactorScore.efficiency - a.multiFactorScore.efficiency;
  }

  // Tiebreaker 4: Total profit
  if (a.team.profit !== b.team.profit) {
    return b.team.profit - a.team.profit;
  }

  // Tiebreaker 5: Earlier timestamp
  return a.team.timestamp - b.team.timestamp;
};
```

---

## Leaderboard Data Structure

### LeaderboardEntry Interface

```typescript
interface LeaderboardEntry {
  rank: number;                        // Final position (1-based)
  team: Team;                          // Team data
  multiFactorScore: MultiFactorScore;  // Score breakdown
  awards: CategoryAward[];             // Special recognitions
  isTied: boolean;                     // Indicates tie situation
}
```

### LeaderboardState Interface

```typescript
interface LeaderboardState {
  entries: LeaderboardEntry[];
  categoryAwards: {
    bestProfit: string | null;       // Team ID
    mostConsistent: string | null;   // Team ID
    mostEfficient: string | null;    // Team ID
  };
  lastUpdated: number;
  gameStatus: 'active' | 'completed';
}
```

---

## Category Awards

### Award Definitions

| Award | Icon | Criteria | Display Text |
|-------|------|----------|--------------|
| Best Profit | 💰 | Highest total profit | "${amount} total profit" |
| Most Consistent | 🎯 | Most profitable rounds | "{X}/{Y} profitable rounds" |
| Most Efficient | ♻️ | Lowest spoilage rate | "{X}% spoilage rate" |

### Award Calculation

```typescript
const calculateCategoryAwards = (teams: Team[]): CategoryAwards => {
  // Best Profit: Highest total profit
  const bestProfit = teams.reduce((best, team) =>
    team.profit > best.profit ? team : best
  , teams[0]);

  // Most Consistent: Most profitable rounds
  const mostConsistent = teams.reduce((best, team) =>
    team.profitableRounds > best.profitableRounds ? team : best
  , teams[0]);

  // Most Efficient: Lowest spoilage rate
  const mostEfficient = teams.reduce((best, team) => {
    const teamRate = team.totalCupsMade > 0
      ? (team.totalCupsMade - team.cupsSold) / team.totalCupsMade
      : 1;
    const bestRate = best.totalCupsMade > 0
      ? (best.totalCupsMade - best.cupsSold) / best.totalCupsMade
      : 1;
    return teamRate < bestRate ? team : best;
  }, teams[0]);

  return {
    bestProfit: bestProfit.id,
    mostConsistent: mostConsistent.id,
    mostEfficient: mostEfficient.id
  };
};
```

### Award Display Rules

- A team can win multiple category awards
- Awards are shown with team entry on leaderboard
- Separate "Category Awards" section highlights winners
- Ties in category awards: Both teams receive the award

---

## Display Specifications

### Full Leaderboard View

```
┌─────────────────────────────────────────────────────────────────────┐
│  🏆 FINAL LEADERBOARD                                    12 teams   │
│  ═══════════════════════════════════════════════════════════════════│
│                                                                     │
│  RANK │ TEAM           │ TOTAL │ PROFIT │ CONS │ EFFI │ RISK      │
│  ─────┼────────────────┼───────┼────────┼──────┼──────┼───────────│
│  🥇 1 │ Team Alpha     │  92   │   50   │  20  │  12  │   10      │
│       │ 💰 Best Profit │       │  1st   │ 5/5  │ 12%  │           │
│  ─────┼────────────────┼───────┼────────┼──────┼──────┼───────────│
│  🥈 2 │ Team Beta      │  87   │   45   │  20  │  12  │   10      │
│       │ 🎯 Most Consistent      │  2nd   │ 5/5  │ 15%  │           │
│  ─────┼────────────────┼───────┼────────┼──────┼──────┼───────────│
│  🥉 3 │ Team Gamma     │  79   │   40   │  16  │  15  │    8      │
│       │ ♻️ Most Efficient       │  3rd   │ 4/5  │  8%  │           │
│  ─────┼────────────────┼───────┼────────┼──────┼──────┼───────────│
│     4 │ Team Delta     │  72   │   35   │  16  │  12  │    9      │
│       │                │       │  4th   │ 4/5  │ 18%  │           │
│  ─────┼────────────────┼───────┼────────┼──────┼──────┼───────────│
│     5 │ Team Epsilon   │  68   │   30   │  12  │  12  │   14      │
│       │                │       │  5th   │ 3/5  │ 14%  │           │
│  ─────┴────────────────┴───────┴────────┴──────┴──────┴───────────│
│                                                                     │
│  Legend: PROFIT = Ranking Points | CONS = Consistency              │
│          EFFI = Efficiency | RISK = Risk Management                │
│                                                                     │
│  [EXPORT RESULTS]  [SHOW BREAKDOWN]  [PRINT CERTIFICATES]          │
└─────────────────────────────────────────────────────────────────────┘
```

### Compact Leaderboard View (During Game)

```
┌────────────────────────────────────────┐
│  🏆 STANDINGS              12 teams    │
│  ══════════════════════════════════════│
│                                        │
│  1. Team Alpha      92 pts  ($156.50)  │
│  2. Team Beta       87 pts  ($142.30)  │
│  3. Team Gamma      79 pts  ($128.90)  │
│  4. Team Delta      72 pts  ($115.20)  │
│  5. Team Epsilon    68 pts  ($98.75)   │
│                                        │
│  [View Full Leaderboard]               │
└────────────────────────────────────────┘
```

### Mobile View

```
┌──────────────────────────┐
│  🏆 LEADERBOARD          │
│  ════════════════════════│
│                          │
│  #1 Team Alpha           │
│  92/100 pts | $156.50    │
│  💰 Best Profit          │
│                          │
│  #2 Team Beta            │
│  87/100 pts | $142.30    │
│  🎯 Most Consistent      │
│                          │
│  #3 Team Gamma           │
│  79/100 pts | $128.90    │
│  ♻️ Most Efficient       │
│                          │
│  [Show More Teams]       │
└──────────────────────────┘
```

---

## Column Specifications

### Main Columns

| Column | Width | Content | Format |
|--------|-------|---------|--------|
| Rank | 60px | Position number + medal | "🥇 1", "🥈 2", "#4" |
| Team | 150px | Name + color + awards | Text with color indicator |
| Total | 70px | Multi-factor total | "92" (bold) |
| Profit | 70px | Profit ranking points | "50" + rank in subtext |
| Cons | 60px | Consistency points | "20" + ratio in subtext |
| Effi | 60px | Efficiency points | "12" + % in subtext |
| Risk | 60px | Risk management points | "10" |

### Subtext Details

| Column | Subtext Format | Example |
|--------|---------------|---------|
| Profit | Ordinal rank | "1st", "2nd", "3rd" |
| Consistency | Ratio | "5/5", "4/5" |
| Efficiency | Percentage | "12%", "8%" |

---

## Score Breakdown Modal

When clicking "Show Breakdown" or a team row:

```
┌──────────────────────────────────────────────────────────────┐
│  SCORE BREAKDOWN: Team Alpha                                 │
│  ════════════════════════════════════════════════════════════│
│                                                              │
│  TOTAL SCORE: 92 / 100                                       │
│  ════════════════════════════════════════════════════════════│
│                                                              │
│  PROFIT RANKING                                    50 / 50   │
│  [████████████████████████████████████████████████████████] │
│  🥇 1st Place out of 12 teams                                │
│  Total Profit: $156.50                                       │
│                                                              │
│  CONSISTENCY                                       20 / 20   │
│  [████████████████████████████████████████████████████████] │
│  ✅ 5 of 5 rounds profitable                                 │
│  Round profits: +$28, +$35, +$42, +$31, +$20                │
│                                                              │
│  EFFICIENCY                                        12 / 15   │
│  [████████████████████████████████████████░░░░░░░░░░░░░░░░] │
│  📊 12% overall spoilage rate                                │
│  Made: 145 cups | Sold: 128 cups | Unsold: 17 cups          │
│                                                              │
│  RISK MANAGEMENT                                   10 / 15   │
│  [██████████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░] │
│  Facilitator Assessment:                                     │
│  • Production adjustment: 4/5                                │
│  • Pricing strategy: 3/5                                     │
│  • Budget reserves: 3/5                                      │
│                                                              │
│  ────────────────────────────────────────────────────────────│
│  AWARDS EARNED:                                              │
│  💰 Best Profit - Highest total profit among all teams      │
│                                                              │
│  [CLOSE]                                     [PRINT]         │
└──────────────────────────────────────────────────────────────┘
```

---

## Category Awards Display

Separate section highlighting category winners:

```
┌────────────────────────────────────────────────────────────┐
│  🏆 CATEGORY AWARDS                                        │
│  ══════════════════════════════════════════════════════════│
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  💰 BEST PROFIT                                       │ │
│  │                                                       │ │
│  │  Team Alpha                                           │ │
│  │  $156.50 total profit                                │ │
│  │                                                       │ │
│  │  Generated the highest overall profit across all     │ │
│  │  rounds of play.                                      │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  🎯 MOST CONSISTENT                                   │ │
│  │                                                       │ │
│  │  Team Beta                                            │ │
│  │  5/5 profitable rounds                               │ │
│  │                                                       │ │
│  │  Maintained profitability in every single round      │ │
│  │  of play.                                             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  ♻️ MOST EFFICIENT                                    │ │
│  │                                                       │ │
│  │  Team Gamma                                           │ │
│  │  8% spoilage rate                                    │ │
│  │                                                       │ │
│  │  Demonstrated excellent inventory management with    │ │
│  │  minimal waste.                                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Real-Time Updates

### During Active Game

- Leaderboard updates after each team completes a round
- Profit ranking points shown as estimated (actual rank unknown until game end)
- Consistency and efficiency update in real-time
- Risk management shows "Pending" until facilitator input

### After Game Completion

- Final profit rankings calculated
- All multi-factor scores finalized
- Category awards determined
- Export and print options enabled

---

## Export Functionality

### CSV Export Format

```csv
Rank,Team,Total Score,Profit Rank Points,Profit Rank,Total Profit,Consistency Points,Profitable Rounds,Efficiency Points,Spoilage Rate,Risk Management Points,Awards
1,Team Alpha,92,50,1,$156.50,20,5/5,12,12%,10,"Best Profit"
2,Team Beta,87,45,2,$142.30,20,5/5,12,15%,10,"Most Consistent"
3,Team Gamma,79,40,3,$128.90,16,4/5,15,8%,8,"Most Efficient"
```

### Print Format

Certificate-style output for top 3 and category award winners.

---

## Leaderboard State Transitions

```
┌─────────────────┐
│  GAME ACTIVE    │
│  - Live updates │
│  - Estimated    │
│    rankings     │
└────────┬────────┘
         │
         ▼ (All teams complete 5 rounds)
┌─────────────────┐
│  SCORING PHASE  │
│  - Profit ranks │
│    calculated   │
│  - Facilitator  │
│    inputs risk  │
│    scores       │
└────────┬────────┘
         │
         ▼ (All scores entered)
┌─────────────────┐
│  GAME COMPLETE  │
│  - Final scores │
│  - Awards shown │
│  - Export ready │
└─────────────────┘
```

---

## Component Implementation

### LeaderboardComponent Props

```typescript
interface LeaderboardProps {
  teams: Team[];
  riskManagementScores: Map<string, RiskManagementInput>;
  gameStatus: 'active' | 'scoring' | 'completed';
  onTeamClick?: (teamId: string) => void;
  showAwards?: boolean;
  compact?: boolean;
}
```

### Key Functions

```typescript
// Generate complete leaderboard
const generateLeaderboard = (
  teams: Team[],
  riskScores: Map<string, RiskManagementInput>
): LeaderboardEntry[] => {
  // Calculate multi-factor scores
  const scoredTeams = teams.map(team => ({
    team,
    multiFactorScore: calculateMultiFactorScore(team, teams, riskScores)
  }));

  // Sort by total score with tiebreakers
  const sorted = scoredTeams.sort((a, b) => {
    const scoreDiff = b.multiFactorScore.total - a.multiFactorScore.total;
    if (scoreDiff !== 0) return scoreDiff;
    return resolveTie(a, b);
  });

  // Calculate awards
  const awards = calculateCategoryAwards(teams);

  // Build entries
  return sorted.map((entry, index) => ({
    rank: index + 1,
    team: entry.team,
    multiFactorScore: entry.multiFactorScore,
    awards: getTeamAwards(entry.team.id, awards),
    isTied: index > 0 &&
      sorted[index - 1].multiFactorScore.total === entry.multiFactorScore.total
  }));
};
```

---

## Summary

The leaderboard system provides:

1. **Transparency:** Clear breakdown of all scoring components
2. **Fairness:** Consistent tiebreaker rules
3. **Recognition:** Category awards for specialized excellence
4. **Engagement:** Real-time updates during gameplay
5. **Documentation:** Export capabilities for records
