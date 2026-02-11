# 07 - Test Cases Specification

**Document:** Test Scenarios for Validation
**Version:** 1.0
**Reference:** Multi-Factor Scoring Model

---

## Overview

This document specifies test cases to validate the Multi-Factor Scoring Model implementation. Tests cover scoring calculations, edge cases, and integration scenarios.

---

## Test Categories

| Category | Description | Priority |
|----------|-------------|----------|
| Unit Tests | Individual function tests | High |
| Integration Tests | Full scoring flow tests | High |
| Edge Cases | Boundary conditions | Medium |
| UI Tests | Display validation | Medium |
| Performance Tests | Large dataset handling | Low |

---

## 1. Profit Ranking Tests

### TC-PR-001: Standard Profit Ranking

**Description:** Verify correct points for each rank position

```typescript
describe('getProfitRankingPoints', () => {
  test('should return 50 points for 1st place', () => {
    expect(getProfitRankingPoints(1)).toBe(50);
  });

  test('should return 45 points for 2nd place', () => {
    expect(getProfitRankingPoints(2)).toBe(45);
  });

  test('should return 40 points for 3rd place', () => {
    expect(getProfitRankingPoints(3)).toBe(40);
  });

  test('should return 35 points for 4th place', () => {
    expect(getProfitRankingPoints(4)).toBe(35);
  });

  test('should return 30 points for 5th place', () => {
    expect(getProfitRankingPoints(5)).toBe(30);
  });

  test('should return 25 points for 6th-10th place', () => {
    expect(getProfitRankingPoints(6)).toBe(25);
    expect(getProfitRankingPoints(10)).toBe(25);
  });

  test('should return 20 points for 11th-15th place', () => {
    expect(getProfitRankingPoints(11)).toBe(20);
    expect(getProfitRankingPoints(15)).toBe(20);
  });

  test('should return 15 points for 16th-20th place', () => {
    expect(getProfitRankingPoints(16)).toBe(15);
    expect(getProfitRankingPoints(20)).toBe(15);
  });

  test('should return 10 points for 21st+ place', () => {
    expect(getProfitRankingPoints(21)).toBe(10);
    expect(getProfitRankingPoints(100)).toBe(10);
  });
});
```

### TC-PR-002: Profit Rank Calculation

**Description:** Verify teams are ranked correctly by profit

```typescript
describe('calculateProfitRanks', () => {
  const teams = [
    { id: 'a', profit: 100 },
    { id: 'b', profit: 150 },
    { id: 'c', profit: 75 },
    { id: 'd', profit: 150 }, // Tie with 'b'
  ];

  test('should rank teams by descending profit', () => {
    const ranks = calculateProfitRanks(teams);
    expect(ranks[0].teamId).toBe('b'); // or 'd' - tied for 1st
    expect(ranks[0].rank).toBe(1);
  });

  test('should handle ties correctly', () => {
    const ranks = calculateProfitRanks(teams);
    const rankB = ranks.find(r => r.teamId === 'b')!;
    const rankD = ranks.find(r => r.teamId === 'd')!;
    // Both should be ranked, tiebreaker applied
    expect([1, 2]).toContain(rankB.rank);
    expect([1, 2]).toContain(rankD.rank);
  });
});
```

---

## 2. Consistency Tests

### TC-CON-001: Consistency Point Calculation

**Description:** Verify 4 points per profitable round

```typescript
describe('getConsistencyPoints', () => {
  test('should return 0 for no profitable rounds', () => {
    const history = [
      { profit: -10 },
      { profit: -5 },
      { profit: 0 },
      { profit: -15 },
      { profit: -8 }
    ];
    expect(getConsistencyPoints(history)).toBe(0);
  });

  test('should return 4 for one profitable round', () => {
    const history = [
      { profit: 10 },
      { profit: -5 },
      { profit: -3 },
      { profit: -2 },
      { profit: -1 }
    ];
    expect(getConsistencyPoints(history)).toBe(4);
  });

  test('should return 12 for three profitable rounds', () => {
    const history = [
      { profit: 10 },
      { profit: 15 },
      { profit: -5 },
      { profit: 20 },
      { profit: -8 }
    ];
    expect(getConsistencyPoints(history)).toBe(12);
  });

  test('should return 20 (max) for five profitable rounds', () => {
    const history = [
      { profit: 10 },
      { profit: 15 },
      { profit: 5 },
      { profit: 20 },
      { profit: 8 }
    ];
    expect(getConsistencyPoints(history)).toBe(20);
  });

  test('should cap at 20 points even with more rounds', () => {
    const history = [
      { profit: 10 },
      { profit: 15 },
      { profit: 5 },
      { profit: 20 },
      { profit: 8 },
      { profit: 12 },
      { profit: 7 }
    ];
    expect(getConsistencyPoints(history)).toBe(20);
  });

  test('should not count zero profit as profitable', () => {
    const history = [
      { profit: 0 },
      { profit: 0 },
      { profit: 0 },
      { profit: 0 },
      { profit: 0 }
    ];
    expect(getConsistencyPoints(history)).toBe(0);
  });
});
```

---

## 3. Efficiency Tests

### TC-EFF-001: Spoilage Rate Calculation

**Description:** Verify spoilage rate formula

```typescript
describe('calculateSpoilageRate', () => {
  test('should return 0 for no spoilage', () => {
    const history = [
      { cupsMade: 50, cupsSold: 50 },
      { cupsMade: 40, cupsSold: 40 }
    ];
    expect(calculateSpoilageRate(history)).toBe(0);
  });

  test('should calculate correct spoilage rate', () => {
    const history = [
      { cupsMade: 100, cupsSold: 80 } // 20% spoilage
    ];
    expect(calculateSpoilageRate(history)).toBe(0.20);
  });

  test('should aggregate across all rounds', () => {
    const history = [
      { cupsMade: 50, cupsSold: 45 },  // 5 unsold
      { cupsMade: 50, cupsSold: 40 }   // 10 unsold
    ];
    // Total: 100 made, 85 sold, 15 unsold = 15%
    expect(calculateSpoilageRate(history)).toBe(0.15);
  });

  test('should return 0 for empty history', () => {
    expect(calculateSpoilageRate([])).toBe(0);
  });

  test('should return 0 if cupsMade is 0', () => {
    const history = [{ cupsMade: 0, cupsSold: 0 }];
    expect(calculateSpoilageRate(history)).toBe(0);
  });
});
```

### TC-EFF-002: Efficiency Point Calculation

**Description:** Verify efficiency points based on spoilage rate

```typescript
describe('getEfficiencyPoints', () => {
  test('should return 15 for 0-10% spoilage', () => {
    expect(getEfficiencyPoints(0)).toBe(15);
    expect(getEfficiencyPoints(0.05)).toBe(15);
    expect(getEfficiencyPoints(0.10)).toBe(15);
  });

  test('should return 12 for 11-20% spoilage', () => {
    expect(getEfficiencyPoints(0.11)).toBe(12);
    expect(getEfficiencyPoints(0.15)).toBe(12);
    expect(getEfficiencyPoints(0.20)).toBe(12);
  });

  test('should return 9 for 21-30% spoilage', () => {
    expect(getEfficiencyPoints(0.21)).toBe(9);
    expect(getEfficiencyPoints(0.25)).toBe(9);
    expect(getEfficiencyPoints(0.30)).toBe(9);
  });

  test('should return 6 for 31-40% spoilage', () => {
    expect(getEfficiencyPoints(0.31)).toBe(6);
    expect(getEfficiencyPoints(0.35)).toBe(6);
    expect(getEfficiencyPoints(0.40)).toBe(6);
  });

  test('should return 3 for 41-50% spoilage', () => {
    expect(getEfficiencyPoints(0.41)).toBe(3);
    expect(getEfficiencyPoints(0.45)).toBe(3);
    expect(getEfficiencyPoints(0.50)).toBe(3);
  });

  test('should return 0 for 51%+ spoilage', () => {
    expect(getEfficiencyPoints(0.51)).toBe(0);
    expect(getEfficiencyPoints(0.75)).toBe(0);
    expect(getEfficiencyPoints(1.0)).toBe(0);
  });
});
```

---

## 4. Risk Management Tests

### TC-RM-001: Risk Management Score Validation

**Description:** Verify risk management score bounds

```typescript
describe('validateRiskManagementScore', () => {
  test('should accept valid score (0-15)', () => {
    expect(validateRiskManagementScore(0)).toBe(true);
    expect(validateRiskManagementScore(10)).toBe(true);
    expect(validateRiskManagementScore(15)).toBe(true);
  });

  test('should reject negative scores', () => {
    expect(validateRiskManagementScore(-1)).toBe(false);
  });

  test('should reject scores above 15', () => {
    expect(validateRiskManagementScore(16)).toBe(false);
  });

  test('should validate component scores', () => {
    const input = {
      productionAdjustment: 5,
      pricingStrategy: 5,
      budgetReserves: 5
    };
    expect(validateRiskManagementInput(input)).toBe(true);
  });

  test('should reject invalid component scores', () => {
    const input = {
      productionAdjustment: 6, // Invalid
      pricingStrategy: 5,
      budgetReserves: 5
    };
    expect(validateRiskManagementInput(input)).toBe(false);
  });
});
```

---

## 5. Multi-Factor Score Tests

### TC-MF-001: Total Score Calculation

**Description:** Verify complete multi-factor score calculation

```typescript
describe('calculateMultiFactorScore', () => {
  const team = {
    id: 'test-team',
    profit: 150,
    roundHistory: [
      { profit: 30, cupsMade: 50, cupsSold: 45 },
      { profit: 35, cupsMade: 55, cupsSold: 50 },
      { profit: 40, cupsMade: 60, cupsSold: 52 },
      { profit: 25, cupsMade: 45, cupsSold: 40 },
      { profit: 20, cupsMade: 40, cupsSold: 38 }
    ]
  };

  test('should calculate correct total score', () => {
    const profitRank = 2; // 45 points
    const riskScore = 10;

    const score = calculateMultiFactorScore(team, profitRank, riskScore);

    // Profit: 45 (2nd place)
    expect(score.profitRanking).toBe(45);

    // Consistency: 20 (5/5 profitable)
    expect(score.consistency).toBe(20);

    // Efficiency: spoilage = (250-225)/250 = 10% = 15 points
    expect(score.efficiency).toBe(15);

    // Risk: 10 (as provided)
    expect(score.riskManagement).toBe(10);

    // Total: 45 + 20 + 15 + 10 = 90
    expect(score.total).toBe(90);
  });
});
```

### TC-MF-002: Score with Losses

**Description:** Verify scoring when team has losing rounds

```typescript
describe('calculateMultiFactorScore with losses', () => {
  const team = {
    id: 'losing-team',
    profit: 20,
    roundHistory: [
      { profit: 30, cupsMade: 50, cupsSold: 45 },
      { profit: -10, cupsMade: 40, cupsSold: 20 },
      { profit: -15, cupsMade: 45, cupsSold: 18 },
      { profit: 25, cupsMade: 50, cupsSold: 48 },
      { profit: -10, cupsMade: 30, cupsSold: 15 }
    ]
  };

  test('should calculate reduced consistency', () => {
    const score = calculateMultiFactorScore(team, 10, 5);

    // Only 2 profitable rounds = 8 points
    expect(score.consistency).toBe(8);
  });

  test('should calculate poor efficiency', () => {
    const score = calculateMultiFactorScore(team, 10, 5);

    // Total: 215 made, 146 sold = 32% spoilage = 6 points
    expect(score.efficiency).toBe(6);
  });
});
```

---

## 6. Edge Cases

### TC-EDGE-001: Single Team

**Description:** Verify scoring with only one team

```typescript
describe('single team scenario', () => {
  test('should rank single team as 1st', () => {
    const teams = [{ id: 'solo', profit: 50 }];
    const ranks = calculateProfitRanks(teams);

    expect(ranks[0].rank).toBe(1);
    expect(ranks[0].points).toBe(50);
  });
});
```

### TC-EDGE-002: All Teams Tied

**Description:** Verify tiebreaker when all teams have same profit

```typescript
describe('all teams tied scenario', () => {
  const teams = [
    { id: 'a', profit: 100, roundHistory: [{ profit: 50 }, { profit: 50 }] },
    { id: 'b', profit: 100, roundHistory: [{ profit: 60 }, { profit: 40 }] },
    { id: 'c', profit: 100, roundHistory: [{ profit: 70 }, { profit: 30 }] }
  ];

  test('should apply tiebreaker: highest single round', () => {
    const ranks = calculateProfitRanks(teams);

    // Team C has highest single round (70)
    expect(ranks[0].teamId).toBe('c');
  });
});
```

### TC-EDGE-003: Zero Production

**Description:** Verify handling of zero cups made

```typescript
describe('zero production scenario', () => {
  test('should handle zero cups made gracefully', () => {
    const history = [{ cupsMade: 0, cupsSold: 0 }];
    const rate = calculateSpoilageRate(history);

    expect(rate).toBe(0); // Not NaN or Infinity
  });

  test('should return 15 efficiency points for zero production', () => {
    const rate = 0;
    expect(getEfficiencyPoints(rate)).toBe(15);
  });
});
```

### TC-EDGE-004: Negative Profit

**Description:** Verify handling of negative total profit

```typescript
describe('negative profit scenario', () => {
  const team = {
    id: 'struggling',
    profit: -50,
    roundHistory: [
      { profit: -10 },
      { profit: -15 },
      { profit: -5 },
      { profit: -12 },
      { profit: -8 }
    ]
  };

  test('should still calculate rank', () => {
    const teams = [team, { id: 'other', profit: 100 }];
    const ranks = calculateProfitRanks(teams);

    expect(ranks.find(r => r.teamId === 'struggling')!.rank).toBe(2);
  });

  test('should return 0 consistency points', () => {
    const score = calculateMultiFactorScore(team, 2, 0);
    expect(score.consistency).toBe(0);
  });
});
```

### TC-EDGE-005: Maximum Scores

**Description:** Verify perfect score scenario

```typescript
describe('perfect score scenario', () => {
  const perfectTeam = {
    id: 'perfect',
    profit: 200,
    roundHistory: [
      { profit: 40, cupsMade: 50, cupsSold: 50 },
      { profit: 40, cupsMade: 50, cupsSold: 50 },
      { profit: 40, cupsMade: 50, cupsSold: 50 },
      { profit: 40, cupsMade: 50, cupsSold: 50 },
      { profit: 40, cupsMade: 50, cupsSold: 50 }
    ]
  };

  test('should achieve maximum score of 100', () => {
    const score = calculateMultiFactorScore(perfectTeam, 1, 15);

    expect(score.profitRanking).toBe(50);  // 1st place
    expect(score.consistency).toBe(20);     // 5/5 profitable
    expect(score.efficiency).toBe(15);      // 0% spoilage
    expect(score.riskManagement).toBe(15);  // Perfect facilitator score
    expect(score.total).toBe(100);
  });
});
```

---

## 7. Integration Tests

### TC-INT-001: Full Game Flow

**Description:** Test complete game from start to final scores

```typescript
describe('full game integration', () => {
  test('should process complete game correctly', async () => {
    // Setup
    const store = createGameStore();

    // Create room and teams
    await store.createGameRoom('Test Room');
    await store.addTeam('Team A');
    await store.addTeam('Team B');

    // Play 5 rounds for each team
    for (let round = 1; round <= 5; round++) {
      for (const team of store.teams) {
        store.selectTeam(team.id);
        store.updateDecision({ price: 1.00, quality: 3, marketing: 15 });
        await waitFor(() => store.runSimulation());
        store.startNewDay();
      }
    }

    // Set risk management scores
    store.setRiskManagementScore('team-a', { total: 10 });
    store.setRiskManagementScore('team-b', { total: 12 });

    // Calculate final scores
    store.calculateMultiFactorScores();

    // Verify leaderboard
    const leaderboard = store.getFinalLeaderboard();
    expect(leaderboard).toHaveLength(2);
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].multiFactorScore.total).toBeGreaterThan(0);
    expect(leaderboard[0].multiFactorScore.total).toBeLessThanOrEqual(100);
  });
});
```

### TC-INT-002: Real-Time Updates

**Description:** Verify leaderboard updates during gameplay

```typescript
describe('real-time leaderboard updates', () => {
  test('should update rankings after each round', () => {
    const store = createGameStore();

    // Initial state
    expect(store.getLeaderboard()).toHaveLength(0);

    // Add teams and play
    store.addTeam('Team A');
    store.addTeam('Team B');

    store.selectTeam('team-a');
    store.runSimulation();

    // Verify update
    const leaderboard = store.getLeaderboard();
    expect(leaderboard[0].team.gamesPlayed).toBe(1);
  });
});
```

---

## 8. UI Component Tests

### TC-UI-001: Score Breakdown Display

**Description:** Verify ScoreBreakdown component renders correctly

```typescript
describe('ScoreBreakdown component', () => {
  const mockScore = {
    profitRanking: 45,
    consistency: 16,
    efficiency: 12,
    riskManagement: 10,
    total: 83
  };

  test('should display total score', () => {
    render(<ScoreBreakdown score={mockScore} teamName="Test Team" />);
    expect(screen.getByText('83/100')).toBeInTheDocument();
  });

  test('should display all categories', () => {
    render(<ScoreBreakdown score={mockScore} teamName="Test Team" />);
    expect(screen.getByText('Profit Ranking')).toBeInTheDocument();
    expect(screen.getByText('Consistency')).toBeInTheDocument();
    expect(screen.getByText('Efficiency')).toBeInTheDocument();
    expect(screen.getByText('Risk Management')).toBeInTheDocument();
  });

  test('should show progress bars with correct widths', () => {
    render(<ScoreBreakdown score={mockScore} teamName="Test Team" />);
    // Profit: 45/50 = 90%
    // Consistency: 16/20 = 80%
    // Efficiency: 12/15 = 80%
    // Risk: 10/15 = 67%
  });
});
```

### TC-UI-002: Leaderboard Display

**Description:** Verify Leaderboard component renders correctly

```typescript
describe('Leaderboard component', () => {
  const mockTeams = [
    { id: 'a', name: 'Alpha', profit: 150, multiFactorScore: { total: 92 } },
    { id: 'b', name: 'Beta', profit: 120, multiFactorScore: { total: 87 } }
  ];

  test('should display teams in order', () => {
    render(<Leaderboard teams={mockTeams} />);
    const teamNames = screen.getAllByTestId('team-name');
    expect(teamNames[0]).toHaveTextContent('Alpha');
    expect(teamNames[1]).toHaveTextContent('Beta');
  });

  test('should display medals for top 3', () => {
    render(<Leaderboard teams={mockTeams} />);
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
  });
});
```

---

## 9. Data Validation Tests

### TC-VAL-001: Team Data Validation

**Description:** Verify team data integrity

```typescript
describe('team data validation', () => {
  test('should validate required fields', () => {
    const validTeam = {
      id: 'test',
      name: 'Test Team',
      profit: 100,
      cupsSold: 50,
      roundHistory: []
    };
    expect(validateTeam(validTeam)).toBe(true);
  });

  test('should reject missing fields', () => {
    const invalidTeam = { id: 'test' };
    expect(validateTeam(invalidTeam)).toBe(false);
  });

  test('should reject invalid profit type', () => {
    const invalidTeam = { id: 'test', name: 'Test', profit: 'not a number' };
    expect(validateTeam(invalidTeam)).toBe(false);
  });
});
```

### TC-VAL-002: Score Validation

**Description:** Verify score data integrity

```typescript
describe('score validation', () => {
  test('should validate score bounds', () => {
    const validScore = {
      profitRanking: 50,
      consistency: 20,
      efficiency: 15,
      riskManagement: 15,
      total: 100
    };
    expect(validateMultiFactorScore(validScore)).toBe(true);
  });

  test('should reject out-of-bounds scores', () => {
    const invalidScore = {
      profitRanking: 55, // Over max
      consistency: 20,
      efficiency: 15,
      riskManagement: 15,
      total: 105
    };
    expect(validateMultiFactorScore(invalidScore)).toBe(false);
  });

  test('should verify total equals sum of components', () => {
    const inconsistentScore = {
      profitRanking: 50,
      consistency: 20,
      efficiency: 15,
      riskManagement: 15,
      total: 90 // Should be 100
    };
    expect(validateMultiFactorScore(inconsistentScore)).toBe(false);
  });
});
```

---

## Test Coverage Requirements

| Category | Minimum Coverage |
|----------|-----------------|
| Unit Tests | 90% |
| Integration Tests | 80% |
| Edge Cases | 100% |
| UI Components | 70% |

---

## Summary

These test cases ensure:

1. **Accuracy:** Scoring calculations match specification
2. **Robustness:** Edge cases handled gracefully
3. **Consistency:** Same inputs produce same outputs
4. **Integration:** All components work together correctly
5. **User Experience:** UI displays information correctly
