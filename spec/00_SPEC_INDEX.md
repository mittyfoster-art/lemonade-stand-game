# Lemonade Stand Game - Specification Index

**Version:** 1.0
**Last Updated:** February 11, 2026
**Status:** Implementation Ready

---

## Overview

This specification folder bridges the gap between the approved requirements documentation (2.1.3_Lemonade_Game_Scoring_Model.md) and the existing game implementation. The specifications define how to align the current game with the **Option B: Multi-Factor Scoring Model (100 points)**.

### Reference Documents

| Document | Location | Status |
|----------|----------|--------|
| Scoring Model Requirements | `03_Simulation_Platform/Requirements/2.1.3_Lemonade_Game_Scoring_Model.md` | Approved |
| Current Implementation | `10_Lemonade_Stand_Game/Lemonade Stand Business Simulation/` | Active |

---

## Specification Documents

| # | Document | Description | Status |
|---|----------|-------------|--------|
| 01 | [01_SCORING_SYSTEM.md](./01_SCORING_SYSTEM.md) | Multi-factor scoring implementation (100 pts) | Ready |
| 02 | [02_GAME_MECHANICS.md](./02_GAME_MECHANICS.md) | Core game logic and round structure | Ready |
| 03 | [03_UI_COMPONENTS.md](./03_UI_COMPONENTS.md) | User interface specifications | Ready |
| 04 | [04_DATA_MODEL.md](./04_DATA_MODEL.md) | State management and data structures | Ready |
| 05 | [05_SCENARIOS.md](./05_SCENARIOS.md) | Daily scenario specifications (10 scenarios) | Ready |
| 06 | [06_LEADERBOARD.md](./06_LEADERBOARD.md) | Leaderboard and ranking specifications | Ready |
| 07 | [07_TEST_CASES.md](./07_TEST_CASES.md) | Test scenarios for validation | Ready |

---

## Approved Scoring Model Summary

**Model:** Option B - Multi-Factor Scoring (100 points total)

| Component | Points | Calculation |
|-----------|--------|-------------|
| **Profit Ranking** | 50 | Ranked position among all teams |
| **Consistency** | 20 | 4 points per profitable round (5 rounds max) |
| **Efficiency** | 15 | Based on spoilage rate (unsold/made) |
| **Risk Management** | 15 | Facilitator observation assessment |
| **Total** | **100** | Sum of all components |

---

## Implementation Status Tracker

### Phase 1: Data Model Updates
- [ ] Add `MultiFactorScore` interface to game-store.ts
- [ ] Add round history tracking to Team interface
- [ ] Add spoilage calculation fields
- [ ] Add efficiency tracking per round

### Phase 2: Scoring Logic
- [ ] Implement `calculateProfitRankingPoints()` function
- [ ] Implement `calculateConsistencyPoints()` function
- [ ] Implement `calculateEfficiencyPoints()` function
- [ ] Add facilitator risk management input UI

### Phase 3: UI Components
- [ ] Create ScoreBreakdown component
- [ ] Update Leaderboard with multi-factor display
- [ ] Add EfficiencyIndicator component
- [ ] Add RoundHistoryTracker component
- [ ] Add CategoryAwards display

### Phase 4: Testing & Validation
- [ ] Unit tests for scoring calculations
- [ ] Integration tests for full game flow
- [ ] Edge case validation
- [ ] User acceptance testing

---

## Gap Analysis: Current vs. Required

### Currently Implemented
- Profit-based feedback system
- Decision quality scoring (optimal range matching)
- 10 daily scenarios with deception levels
- Basic leaderboard sorted by profit
- Budget carry-over between rounds

### Required Additions
- **Profit Ranking System:** Convert raw profit to ranked points (1st=50, 2nd=45, etc.)
- **Consistency Tracking:** Track profitable vs. loss rounds per team
- **Efficiency Metrics:** Calculate and display spoilage rates
- **Risk Management UI:** Facilitator input for behavioral assessment
- **Category Awards:** Best Profit, Most Consistent, Most Efficient

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Feb 11, 2026 | Specification Team | Initial specification suite |

---

## Quick Reference

### Key Formulas

```typescript
// Spoilage Rate Calculation
spoilageRate = (cupsMade - cupsSold) / cupsMade

// Consistency Score
consistencyPoints = profitableRounds * 4  // max 20 points

// Total Multi-Factor Score
totalScore = profitRankingPoints + consistencyPoints + efficiencyPoints + riskManagementPoints
```

### File Structure

```
/spec
├── 00_SPEC_INDEX.md          ← You are here
├── 01_SCORING_SYSTEM.md      ← Scoring formulas and algorithms
├── 02_GAME_MECHANICS.md      ← Game logic and rules
├── 03_UI_COMPONENTS.md       ← Interface specifications
├── 04_DATA_MODEL.md          ← Data structures and state
├── 05_SCENARIOS.md           ← 10 daily scenarios
├── 06_LEADERBOARD.md         ← Ranking and awards
└── 07_TEST_CASES.md          ← Validation tests
```
