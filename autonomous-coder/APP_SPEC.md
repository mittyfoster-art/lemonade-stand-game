# Lemonade Stand Business Simulation v2.0 - Application Specification

## Project Overview

**Project Name:** Lemonade Stand Business Simulation v2.0
**Project Type:** Full-Stack Web Application (Business Simulation Game)
**Context:** TeenPreneurship Camp 2026 (CICBD, Cayman Islands) | July 13-17, 2026
**Audience:** Youth aged 14-17 (25-30 participants)

### Objective

Build an individual-player, competitive business simulation game that runs across a 5-day summer camp. Players manage a virtual lemonade stand through 50 levels (10 per camp day), making pricing, quality, and marketing decisions while managing a persistent budget and optional loan offers. The game teaches financial literacy, strategic thinking, and business fundamentals through experiential learning.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | Zustand (with persist middleware) |
| Backend | Supabase (PostgreSQL + Realtime) |
| Authentication | Simple name + room code (no email/password for players) |
| Testing | Vitest (unit), Playwright (e2e) |
| Dev Server | Port 4000 |

---

## Game Model

### Individual Player Competition

- **NOT team-based** — every player competes independently
- Players join a shared game room via a room code
- Each player manages their own lemonade stand with their own budget
- Live leaderboard ranks all players by cumulative profit

### Progression

- **50 levels total** across 5 camp days (10 levels per day)
- Levels unlock at 7:00 AM each camp day
- Previous days' unfinished levels remain accessible
- Sequential within a day (must complete level N before N+1)
- Starting budget: **$500**
- Game over when budget drops below $20

### Three Decisions Per Level

| Decision | Range | Default | Impact |
|----------|-------|---------|--------|
| **Cup Price** | $0.25 - $2.00 (in $0.05 steps) | $1.00 | Lower prices attract more customers but reduce per-cup revenue |
| **Quality** | 1-5 stars | 3 | Higher quality increases cost per cup (1.0x to 2.8x multiplier) |
| **Marketing** | $0 - $30 (in $1 steps) | $10 | Increases awareness; diminishing returns above $20 |

### Demand Formula

```
baseDemand = 50 cups

priceScore = price within scenario optimal range ? 1.2 : 0.8
qualityScore = quality within scenario optimal range ? 1.2 : 0.8
marketingScore = marketing within scenario optimal range ? 1.2 : 0.8

priceAttractiveness = ((2.0 - price) / 1.75) * priceScore
qualityFactor = (quality / 5) * qualityScore
marketingFactor = (1 + (marketing / 50)) * marketingScore
weatherEffect = scenario.weatherEffect  // range: 0.6 - 1.4
scenarioMultiplier = 1.0 (low) | 1.1 (medium) | 1.3 (high deception)

finalDemand = baseDemand * priceAttractiveness * qualityFactor * marketingFactor * weatherEffect * scenarioMultiplier
cupsSold = min(floor(finalDemand), 150)  // capacity cap
```

### Financial Calculation

```
revenue = cupsSold * price
ingredientCost = cupsSold * (baseIngredientCost * qualityMultiplier)
totalCosts = fixedCosts($20) + marketingSpend + ingredientCost
profit = revenue - totalCosts
newBudget = currentBudget + profit - loanRepayment (if applicable)
```

### Loan System

6 loan offers at designated levels with auto-repayment over 10 levels:

| Level | Amount | Per-Level Repayment | Total Repayment | Interest |
|-------|--------|---------------------|-----------------|----------|
| 15 | $100 | $12 | $120 | 20% |
| 20 | $150 | $17 | $170 | ~13% |
| 25 | $200 | $22 | $220 | 10% |
| 30 | $250 | $27 | $270 | 8% |
| 35 | $150 | $18 | $180 | 20% |
| 40 | $300 | $32 | $320 | ~7% |

**Rules:** One loan at a time, automatic repayment, no early repayment, no penalty for declining.

---

## Project Structure

```
/Lemonade Stand Business Simulation
├── src/
│   ├── App.tsx                    # Router and layout
│   ├── main.tsx                   # Entry point
│   ├── index.css                  # Global styles and Tailwind
│   ├── pages/
│   │   ├── HomePage.tsx           # Welcome + status overview
│   │   ├── PlayPage.tsx           # Core gameplay (decisions + simulation)
│   │   ├── ResultsPage.tsx        # Post-level results and feedback
│   │   ├── LevelsPage.tsx         # Visual level map (50 levels)
│   │   ├── LeaderboardPage.tsx    # Competition rankings
│   │   ├── ProfilePage.tsx        # Player stats dashboard
│   │   ├── LoansPage.tsx          # Loan management centre
│   │   ├── HowToPlayPage.tsx      # Rules and tutorial
│   │   ├── AwardsPage.tsx         # Final awards ceremony
│   │   ├── FacilitatorPage.tsx    # Admin dashboard
│   │   └── NotFoundPage.tsx       # 404 page
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── DesktopSidebar.tsx # Side nav for desktop
│   │   │   └── MobileHeader.tsx   # Top bar + bottom tabs for mobile
│   │   ├── PlayerJoinForm.tsx     # Name + room code entry
│   │   ├── Leaderboard.tsx        # Leaderboard display component
│   │   ├── ResultsDisplay.tsx     # Results breakdown component
│   │   ├── DecisionCard.tsx       # Decision input component
│   │   ├── DailyScenario.tsx      # Scenario briefing display
│   │   └── LoadingSimulation.tsx  # Simulation animation
│   ├── store/
│   │   └── game-store.ts          # Zustand store (all game state)
│   ├── lib/
│   │   ├── utils.ts               # Utility functions (cn, formatCurrency)
│   │   └── supabase.ts            # Supabase client + sync functions
│   ├── types/                     # TypeScript type definitions
│   ├── data/
│   │   └── scenarios.ts           # 50 scenario definitions
│   └── hooks/                     # Custom React hooks
├── spec/                          # Game specification documents
├── autonomous-coder/              # Autonomous coding system
├── e2e/                           # Playwright e2e tests
├── supabase/                      # Supabase migrations
├── public/                        # Static assets
├── playwright.config.ts
├── vite.config.ts
├── tsconfig.app.json
├── tailwind.config.js
└── package.json
```

---

## Known Issues (Current State)

These issues exist in the current codebase and need to be addressed:

1. **Playwright config port mismatch** — `playwright.config.ts` references port 5174 instead of 4000
2. **DB schema drift** — Supabase migration still references `teams` table instead of `players`; missing `camp_start_date` column
3. **Player reconnection bug** — Duplicate player entries created when a player refreshes or rejoins the room
4. **Dead v1 scoring code** — `src/lib/scoring.ts`, `src/types/scoring.ts`, and `src/components/scoring/` contain obsolete multi-factor scoring code from v1 that should be removed
5. **Dead mock backend** — `src/lib/mock-backend.ts` contains unused Devv backend mock code
6. **No loading states** — Pages lack loading skeletons and error states
7. **Incomplete mobile responsiveness** — Some pages not optimized for mobile viewports

---

## Scoring System

### Primary Ranking Metric: Cumulative Profit

```
Total Score = Sum of profit from all completed levels
```

### Tiebreaker Order

1. Total cumulative profit (highest wins)
2. Total revenue generated (highest wins)
3. Total cups sold (highest wins)
4. Levels completed (most wins)

### Leaderboard Display

| Rank | Player | Levels | Budget | Total Profit | Revenue | Cups Sold | Loan Status |
|------|--------|--------|--------|-------------|---------|-----------|-------------|
| 1 | Player A | 28/50 | $742 | $342 | $1,890 | 1,245 | Repaid |

### Final Awards (Day 5 Ceremony)

| Award | Criteria |
|-------|----------|
| Lemonade Tycoon | Highest cumulative profit |
| Revenue King/Queen | Highest total revenue |
| Customer Favourite | Most cups sold |
| Marathon Runner | Most levels completed |
| Loan Shark | Best loan ROI |
| Comeback Kid | Biggest recovery from lowest budget point |
| Most Improved | Largest per-level profit improvement Day 1 to Day 5 |

---

## Reference Documents

- `../Lemonade_Game_Learning_Objectives_and_Mechanics.md` — Master v2 specification
- `spec/00_SPEC_INDEX.md` — Specification index
- `spec/01_SCORING_SYSTEM.md` — Scoring formulas (note: some content is from v1 multi-factor model)
- `spec/02_GAME_MECHANICS.md` — Game mechanics reference
- `spec/03_UI_COMPONENTS.md` — Component specifications
- `spec/04_DATA_MODEL.md` — Data structure definitions
- `spec/05_SCENARIOS.md` — Scenario reference
- `spec/06_LEADERBOARD.md` — Leaderboard specifications
- `spec/07_TEST_CASES.md` — Test case specifications

---

## Success Criteria

1. All ~35 implementation features completed and passing checks
2. Game playable from level 1 through 50 with persistent budget
3. Loan system fully functional with auto-repayment
4. Real-time leaderboard showing all players ranked by profit
5. Multi-page navigation working on both desktop and mobile
6. Supabase backend syncing player state across devices
7. No TypeScript errors, clean ESLint, successful production build
8. Playwright e2e tests passing for core game flow
9. Mobile-first responsive design on all pages
10. Facilitator can view all player progress and export data
