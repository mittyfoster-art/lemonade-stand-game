#!/usr/bin/env python3
"""
Seed the feature database v2.0 for the Lemonade Stand Business Simulation.
This script creates ~35 features across 6 phases for the individual-player v2.0 game.

Usage:
    python3 seed_features_v2.py          # fails if features.db already exists
    python3 seed_features_v2.py --force  # wipes and recreates

This will:
1. Delete any existing features.db (only with --force)
2. Re-create the database from schema
3. Insert all features with proper dependencies
4. Print a summary of the seeded database
"""

import sqlite3
import json
import os
import sys
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent / "features.db"
SCHEMA_PATH = Path(__file__).parent / "features_schema.sql"


def init_db(force=False):
    """Delete existing DB and re-create from schema. Requires --force if DB exists."""
    if DB_PATH.exists():
        if not force:
            print(f"\n  ERROR: {DB_PATH} already exists.")
            print(f"  Use --force to wipe and recreate the database.")
            print(f"  WARNING: --force will destroy all existing feature progress!\n")
            sys.exit(1)
        os.remove(str(DB_PATH))

    with open(SCHEMA_PATH) as f:
        schema = f.read()

    conn = sqlite3.connect(str(DB_PATH))
    conn.executescript(schema)
    conn.commit()
    return conn


def add_feature(conn, **kwargs):
    """Add a feature to the database."""
    conn.execute("""
        INSERT OR REPLACE INTO features
        (id, title, description, priority, category, dependencies, files,
         acceptance_criteria, test_command, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    """, (
        kwargs['id'],
        kwargs['title'],
        kwargs['description'],
        kwargs.get('priority', 3),
        kwargs['category'],
        json.dumps(kwargs.get('dependencies', [])),
        json.dumps(kwargs.get('files', [])),
        json.dumps(kwargs.get('acceptance_criteria', [])),
        kwargs.get('test_command', ''),
        int(datetime.now().timestamp()),
        int(datetime.now().timestamp())
    ))


def seed_features(force=False):
    """Seed all features for Lemonade Stand v2.0."""
    conn = init_db(force=force)

    # ================================================================
    # PHASE 1: BUG_FIX (Priority 1)
    # Fix existing bugs, remove dead code, resolve config issues
    # ================================================================

    add_feature(conn,
        id='BUG-001',
        title='Fix Playwright config port mismatch',
        description='''Update playwright.config.ts to use port 4000 instead of 5174.

The dev server runs on port 4000 but the Playwright configuration still references the
old Vite default port 5174. This prevents e2e tests from connecting to the running app.

Changes needed:
- Update baseURL to use port 4000
- Update webServer command to include --port 4000
- Ensure webServer.url matches baseURL''',
        priority=1,
        category='BUG_FIX',
        dependencies=[],
        files=['playwright.config.ts'],
        test_command='npx playwright test --list',
        acceptance_criteria=[
            'playwright.config.ts baseURL uses port 4000',
            'playwright.config.ts webServer command uses --port 4000',
            'playwright.config.ts webServer.url uses port 4000',
            'npx playwright test --list discovers tests without connection errors',
            'No TypeScript errors in config file'
        ]
    )

    add_feature(conn,
        id='BUG-002',
        title='Fix DB schema drift (teams to players)',
        description='''Update the Supabase migration to use players table instead of teams.

The existing migration at supabase/migrations/20260213000000_add_players_column.sql
still references the old teams-based schema. The v2 game is individual-player, so
all database references need to use "players" instead of "teams".

Also ensure camp_start_date column exists for level unlock calculations.

Changes needed:
- Update migration SQL to create/reference players table instead of teams
- Add camp_start_date column to the game_rooms table if missing
- Update src/lib/supabase.ts to reference correct table names''',
        priority=1,
        category='BUG_FIX',
        dependencies=[],
        files=[
            'supabase/migrations/20260213000000_add_players_column.sql',
            'src/lib/supabase.ts'
        ],
        acceptance_criteria=[
            'Migration SQL references players table (not teams)',
            'camp_start_date column defined in game_rooms table',
            'src/lib/supabase.ts uses players table name in all queries',
            'No references to teams table remain in migration or supabase.ts',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='BUG-003',
        title='Fix player reconnection (duplicate entries)',
        description='''Fix the bug where refreshing or rejoining creates duplicate player entries.

When a player refreshes the page or rejoins the game room, a new player entry is created
instead of reconnecting to the existing one. This causes duplicate entries on the leaderboard
and inconsistent game state.

Changes needed:
- In game-store.ts, check for existing player by name + roomId before creating new entry
- In PlayerJoinForm.tsx, handle the reconnection flow (check localStorage for previous session)
- If an existing player is found, restore their game state instead of creating a new one
- Use upsert logic when syncing with Supabase''',
        priority=1,
        category='BUG_FIX',
        dependencies=[],
        files=[
            'src/store/game-store.ts',
            'src/components/PlayerJoinForm.tsx'
        ],
        acceptance_criteria=[
            'Refreshing the page reconnects to existing player (no duplicate)',
            'Rejoining with same name + room code restores previous game state',
            'Leaderboard shows only one entry per player',
            'localStorage stores player session info for reconnection',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='BUG-004',
        title='Remove dead v1 scoring code',
        description='''Remove all obsolete multi-factor scoring code from v1.

The v2 game uses cumulative profit as the scoring metric, not the multi-factor scoring
system from v1. The following files/directories contain dead code that should be removed:

- src/lib/scoring.ts — Remove MultiFactorScore calculation functions
- src/lib/scoring.test.ts — Remove associated tests
- src/types/scoring.ts — Remove MultiFactorScore, RoundResult, DecisionQuality interfaces
- src/components/scoring/ — Remove entire directory of scoring UI components

If any of these files contain code that IS still used by the v2 game, preserve only
that code. Remove everything related to MultiFactorScore, RoundResult, DecisionQuality,
CategoryAward, RiskManagementInput, and facilitator scoring.''',
        priority=1,
        category='BUG_FIX',
        dependencies=[],
        files=[
            'src/lib/scoring.ts',
            'src/lib/scoring.test.ts',
            'src/types/scoring.ts',
            'src/components/scoring/'
        ],
        acceptance_criteria=[
            'No references to MultiFactorScore anywhere in src/',
            'No references to DecisionQuality interface in src/',
            'No references to RiskManagementInput in src/',
            'src/components/scoring/ directory removed or emptied of v1 code',
            'No import errors caused by removed files',
            'npx tsc --noEmit passes',
            'npm run build succeeds'
        ]
    )

    add_feature(conn,
        id='BUG-005',
        title='Remove dead mock backend code',
        description='''Remove the unused Devv backend mock at src/lib/mock-backend.ts.

The v2 game uses Supabase instead of Devv. The mock-backend.ts file is not imported
anywhere and should be deleted. Verify no imports reference it before removing.

Changes needed:
- Delete src/lib/mock-backend.ts
- Remove any imports of mock-backend.ts from other files (if any exist)
- Verify no runtime references to the mock backend remain''',
        priority=1,
        category='BUG_FIX',
        dependencies=[],
        files=['src/lib/mock-backend.ts'],
        acceptance_criteria=[
            'src/lib/mock-backend.ts is deleted',
            'No imports of mock-backend.ts remain in the codebase',
            'npx tsc --noEmit passes',
            'npm run build succeeds'
        ]
    )

    # ================================================================
    # PHASE 2: GAMEPLAY (Priority 2-3)
    # Game mechanics enhancements, budget warnings, results, level map
    # ================================================================

    add_feature(conn,
        id='GAME-001',
        title='Budget warning system',
        description='''Implement budget warning banners as specified in the master spec Section 4.6.

When budget drops below $50, show a warning banner. When below $30, show an urgent warning
with strategic advice. The warning should be visible on PlayPage and HomePage.

Create a BudgetWarningBanner component that:
- Shows yellow warning when budget < $50
- Shows red urgent warning when budget < $30
- Displays strategic advice (e.g., "Lower your marketing spend" or "Focus on high-demand scenarios")
- Is dismissible but reappears on next page load
- Integrates with the game store to read current budget''',
        priority=2,
        category='GAMEPLAY',
        dependencies=[],
        files=[
            'src/components/BudgetWarningBanner.tsx',
            'src/pages/PlayPage.tsx',
            'src/pages/HomePage.tsx'
        ],
        acceptance_criteria=[
            'BudgetWarningBanner component exists and renders correctly',
            'Yellow warning appears when budget < $50',
            'Red urgent warning appears when budget < $30',
            'Warning includes actionable advice text',
            'Warning is visible on PlayPage and HomePage',
            'No warning when budget >= $50',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='GAME-002',
        title='Enhanced game over screen',
        description='''Enhance the game over screen when budget drops below $20 (master spec Section 4.6).

When the player's budget falls below $20 (cannot cover fixed costs), show a "Business Closed"
screen with:
- Total levels completed
- Peak budget achieved
- Total profit earned across all levels
- Total cups sold
- A summary of lessons learned (based on their decision patterns)
- Their final leaderboard position (score remains on leaderboard)
- Clear messaging that they cannot continue but can review history

The screen should be visually distinct (not just an error message) and feel like a
meaningful end to their journey.''',
        priority=2,
        category='GAMEPLAY',
        dependencies=[],
        files=['src/pages/PlayPage.tsx'],
        acceptance_criteria=[
            'Game over screen displays when budget < $20',
            'Shows total levels completed',
            'Shows peak budget achieved',
            'Shows total profit and cups sold',
            'Includes summary/lessons learned section',
            'Player cannot start new levels after game over',
            'Visually distinct design (not just an error alert)',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='GAME-003',
        title='Enhanced results page with decision quality feedback',
        description='''Enhance ResultsPage to show detailed decision quality feedback after each level.

After simulation, the results page should show:
- Whether each decision (price, quality, marketing) was in the optimal range for the scenario
- Green checkmark or red X next to each decision
- The optimal range for each decision (revealed after play)
- A brief explanation of why the optimal range makes sense for this scenario
- Financial breakdown: revenue, fixed costs, variable costs, marketing spend, profit/loss
- Loan repayment deduction (if applicable)
- Budget change (before vs after)

Reference the scenario's optimalDecision data to determine quality.''',
        priority=2,
        category='GAMEPLAY',
        dependencies=[],
        files=['src/pages/ResultsPage.tsx'],
        acceptance_criteria=[
            'Results page shows green/red indicator for each decision',
            'Optimal ranges revealed after play',
            'Brief explanation for why optimal ranges apply',
            'Full financial breakdown displayed',
            'Loan repayment shown if applicable',
            'Budget before/after clearly displayed',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='GAME-004',
        title='Enhanced level map',
        description='''Enhance the LevelsPage to show a visual progress map of all 50 levels.

The level map should show:
- All 50 levels organized by camp day (10 per row/section)
- Color coding: completed (green), current (yellow/amber), locked (grey), available today (blue)
- Day headers (Monday through Friday) with level ranges
- Tap/click on completed levels to review their results
- Level number prominently displayed
- Small profit/loss indicator on completed levels
- Lock icon on locked levels with "Unlocks Day X" text

See master spec Section 7.1 for page descriptions.''',
        priority=3,
        category='GAMEPLAY',
        dependencies=[],
        files=['src/pages/LevelsPage.tsx'],
        acceptance_criteria=[
            'All 50 levels displayed organized by camp day',
            'Correct color coding for completed/current/locked/available states',
            'Day headers with level ranges shown',
            'Completed levels show profit/loss indicator',
            'Locked levels show lock icon and unlock day',
            'Clicking completed level navigates to review results',
            'Responsive layout works on mobile and desktop',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='GAME-005',
        title='Loan dashboard enhancement',
        description='''Enhance the LoansPage to be a comprehensive loan management centre.

The loans page should show:
- Active loan details: remaining balance, per-level repayment, levels remaining, progress bar
- Loan history: all past loans with status (repaid/active), amounts, interest paid
- Upcoming loan offers: show which levels have loan offers (15, 20, 25, 30, 35, 40)
- Visual indicator of which offers have been seen/accepted/declined
- Total interest paid across all loans
- Net loan impact (total borrowed vs total repaid)

See master spec Section 4.5 for loan mechanics and Section 7.1 for page description.''',
        priority=3,
        category='GAMEPLAY',
        dependencies=[],
        files=['src/pages/LoansPage.tsx'],
        acceptance_criteria=[
            'Active loan section shows balance, per-level payment, levels remaining',
            'Loan history section shows all past loans with status',
            'Upcoming offers section shows levels 15/20/25/30/35/40',
            'Visual progress bar for active loan repayment',
            'Total interest paid calculated and displayed',
            'Responsive layout works on mobile',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='GAME-006',
        title='Profile page with performance charts',
        description='''Enhance ProfilePage to show comprehensive player statistics and history charts.

The profile page should include:
- Cumulative stats: total profit, revenue, cups sold, levels completed
- Peak budget and lowest budget points
- Average profit per level
- Profit trend chart (line chart showing profit per level over time)
- Best and worst levels with details
- Decision pattern analysis (average price, quality, marketing across all levels)
- Loan usage summary

See master spec Section 7.1 for page description.
Use simple SVG or CSS-based charts (no heavy charting library needed).''',
        priority=3,
        category='GAMEPLAY',
        dependencies=[],
        files=['src/pages/ProfilePage.tsx'],
        acceptance_criteria=[
            'Cumulative stats section shows all key metrics',
            'Peak/lowest budget displayed',
            'Average profit per level calculated and shown',
            'Profit trend visualization (line chart or similar)',
            'Best and worst levels highlighted',
            'Decision pattern averages displayed',
            'Responsive layout for mobile',
            'npx tsc --noEmit passes'
        ]
    )

    # ================================================================
    # PHASE 3: BACKEND (Priority 2-3)
    # Supabase integration, real-time sync, auth, data persistence
    # ================================================================

    add_feature(conn,
        id='BACK-001',
        title='Wire up real-time leaderboard via Supabase',
        description='''Implement real-time leaderboard updates using Supabase Realtime.

The leaderboard should update automatically when any player completes a level.
This requires:
- Subscribing to the players table for changes via Supabase Realtime
- Updating the local game store when remote player data changes
- Sorting players by cumulative profit (descending) with tiebreakers
- Showing real-time rank changes

Implementation approach:
1. In game-store.ts, add a subscribeToLeaderboard action
2. In supabase.ts, create functions for Realtime subscription
3. Use Supabase channel subscription on the players table
4. Update local state when INSERT/UPDATE events arrive
5. Unsubscribe on component unmount or player leave''',
        priority=2,
        category='BACKEND',
        dependencies=['BUG-002'],
        files=[
            'src/store/game-store.ts',
            'src/lib/supabase.ts'
        ],
        acceptance_criteria=[
            'Leaderboard updates in real-time when other players complete levels',
            'Supabase Realtime subscription established on room join',
            'Subscription cleaned up on unmount/leave',
            'Players sorted by cumulative profit with tiebreakers',
            'No memory leaks from dangling subscriptions',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='BACK-003',
        title='Room code validation and error handling',
        description='''Add proper validation for room code entry in the PlayerJoinForm.

Currently the room code is accepted without validation. Add:
- Check that room code exists in Supabase before joining
- Show clear error message if room code is invalid
- Show error if room is full (if capacity limit exists)
- Validate player name (non-empty, reasonable length, no special characters)
- Show loading state while validating
- Prevent double-submission

Also handle the case where Supabase is unavailable (VITE_AUTH_MOCK mode).''',
        priority=3,
        category='BACKEND',
        dependencies=[],
        files=[
            'src/store/game-store.ts',
            'src/components/PlayerJoinForm.tsx'
        ],
        acceptance_criteria=[
            'Invalid room code shows clear error message',
            'Empty or invalid player name shows validation error',
            'Loading state shown during validation',
            'Double-submission prevented',
            'Works in offline/mock mode when Supabase is unavailable',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='BACK-004',
        title='Auth mock toggle (VITE_AUTH_MOCK)',
        description='''Add a VITE_AUTH_MOCK environment variable that bypasses Supabase authentication.

When VITE_AUTH_MOCK=true:
- Skip Supabase connection entirely
- Use local Zustand persist storage for all game state
- Allow any room code to "work" (creates local room)
- Allow any player name without server validation
- Leaderboard shows only local player data

This is essential for development and testing without a live Supabase instance.

Changes needed:
- Add VITE_AUTH_MOCK to .env.example with documentation
- In supabase.ts, check the env var and return mock implementations
- Ensure all store actions work in both real and mock modes''',
        priority=2,
        category='BACKEND',
        dependencies=[],
        files=[
            'src/lib/supabase.ts',
            '.env.example'
        ],
        acceptance_criteria=[
            'VITE_AUTH_MOCK=true allows app to run without Supabase',
            '.env.example documents the VITE_AUTH_MOCK variable',
            'All game functionality works in mock mode (play, results, levels)',
            'Switching back to real mode (VITE_AUTH_MOCK=false) connects to Supabase',
            'No runtime errors in either mode',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='BACK-005',
        title='Backend sync error recovery (debounce, retry)',
        description='''Add resilient error handling for Supabase sync operations in game-store.ts.

Currently if a Supabase sync fails, the error is silently swallowed or crashes the app.
Add proper error recovery:
- Debounce sync calls (max 1 sync per 2 seconds for game state updates)
- Retry failed syncs with exponential backoff (3 attempts, 1s/2s/4s delays)
- Queue failed updates and retry when connection is restored
- Show a subtle "sync pending" indicator to the user (not a blocking error)
- If all retries fail, log the error and continue with local state
- On reconnection, push local state to Supabase

Keep the implementation simple and avoid over-engineering.''',
        priority=3,
        category='BACKEND',
        dependencies=[],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'Sync calls debounced to max 1 per 2 seconds',
            'Failed syncs retried with exponential backoff (3 attempts)',
            'App continues working if all sync attempts fail',
            'Local state preserved even during sync failures',
            'No uncaught promise rejections',
            'npx tsc --noEmit passes'
        ]
    )

    # ================================================================
    # PHASE 4: UI_UX (Priority 3-4)
    # Visual design, responsiveness, animations, dark mode, loading
    # ================================================================

    add_feature(conn,
        id='UI-001',
        title='Dark mode support',
        description='''Add dark mode toggle to the application.

Create a ThemeToggle component and integrate it into the navigation:
- DesktopSidebar: add toggle button near the bottom
- MobileHeader: add toggle in the hamburger menu
- Use Tailwind dark mode classes (class-based strategy)
- Persist preference in localStorage
- Default to system preference if no stored preference
- Ensure all pages look correct in both modes

Use shadcn/ui's theming approach (add "dark" class to html element).''',
        priority=3,
        category='UI_UX',
        dependencies=[],
        files=[
            'src/components/ThemeToggle.tsx',
            'src/components/layout/DesktopSidebar.tsx',
            'src/components/layout/MobileHeader.tsx'
        ],
        acceptance_criteria=[
            'ThemeToggle component renders sun/moon icon',
            'Clicking toggle switches between light and dark mode',
            'Theme preference persisted in localStorage',
            'Defaults to system preference on first visit',
            'Toggle visible in DesktopSidebar and MobileHeader',
            'All page backgrounds and text readable in both modes',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='UI-002',
        title='Loading states and skeleton screens',
        description='''Add loading states and skeleton screens to pages that fetch data.

Create a LoadingSpinner component (or skeleton loader) and integrate it into:
- PlayPage: show skeleton while loading scenario data
- LeaderboardPage: show skeleton while loading player rankings
- ProfilePage: show skeleton while loading stats
- Any page that reads from Supabase should show a loading state

Use shadcn/ui Skeleton component or simple Tailwind pulse animations.
Ensure loading states are visually consistent across all pages.''',
        priority=4,
        category='UI_UX',
        dependencies=[],
        files=[
            'src/components/LoadingSpinner.tsx',
            'src/pages/PlayPage.tsx'
        ],
        acceptance_criteria=[
            'LoadingSpinner component exists with consistent styling',
            'PlayPage shows loading state before scenario is ready',
            'Loading states use skeleton or spinner pattern',
            'No flash of empty content before data loads',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='UI-003',
        title='Mobile responsiveness audit and fixes',
        description='''Audit and fix mobile responsiveness across all pages.

Test each page at 375px width (iPhone SE) and fix layout issues:
- PlayPage: decision sliders should be full-width, scenario text readable
- ResultsPage: financial breakdown should stack vertically
- LevelsPage: level grid should be 2-3 columns on mobile, 5 on desktop
- LeaderboardPage: table should scroll horizontally or use card layout on mobile
- ProfilePage: stats cards should stack vertically
- LoansPage: loan details should be full-width cards

Fix any overflow, text truncation, or touch target issues.''',
        priority=4,
        category='UI_UX',
        dependencies=[],
        files=[
            'src/pages/PlayPage.tsx',
            'src/index.css'
        ],
        acceptance_criteria=[
            'All pages render correctly at 375px width',
            'No horizontal overflow on any page',
            'Touch targets are at least 44px',
            'Text is readable without zooming',
            'Decision sliders are usable on mobile',
            'Tables use horizontal scroll or card layout on small screens',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='UI-004',
        title='Camp day countdown component',
        description='''Create a CampCountdown component showing time until next level unlock.

The component should:
- Show which camp day it currently is (Day 1-5 or "Before Camp" / "Camp Over")
- Show countdown timer to next level batch unlock (7:00 AM)
- Show how many levels are available today vs completed today
- Integrate into HomePage as a prominent status card

Use the camp_start_date from game configuration (stored in game store).
If camp_start_date is not set, show a message to the facilitator to configure it.''',
        priority=4,
        category='UI_UX',
        dependencies=[],
        files=[
            'src/components/CampCountdown.tsx',
            'src/pages/HomePage.tsx'
        ],
        acceptance_criteria=[
            'CampCountdown component shows current camp day',
            'Countdown timer counts down to next 7:00 AM unlock',
            'Shows levels available today vs completed today',
            'Handles pre-camp and post-camp states',
            'Handles missing camp_start_date gracefully',
            'Integrated into HomePage',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='UI-005',
        title='Awards ceremony page',
        description='''Create an AwardsPage that displays the final awards ceremony results.

The awards page should show the 7 awards from the master spec Section 6.5:
1. Lemonade Tycoon (highest cumulative profit)
2. Revenue King/Queen (highest total revenue)
3. Customer Favourite (most cups sold)
4. Marathon Runner (most levels completed)
5. Loan Shark (best loan ROI)
6. Comeback Kid (biggest recovery from lowest budget)
7. Most Improved (largest per-level profit improvement Day 1 to Day 5)

Each award should be displayed as a card with:
- Trophy/medal icon
- Award name and description
- Winner name
- Winning metric value

The page should have a celebratory visual style. Only accessible after camp Day 5
or when the facilitator triggers it.''',
        priority=4,
        category='UI_UX',
        dependencies=[],
        files=['src/pages/AwardsPage.tsx'],
        acceptance_criteria=[
            'All 7 awards displayed with correct criteria',
            'Each award card shows icon, name, winner, and value',
            'Winners calculated from player data (not hardcoded)',
            'Celebratory visual design (gold/yellow theme)',
            'Handles ties gracefully',
            'Responsive layout for mobile',
            'npx tsc --noEmit passes'
        ]
    )

    # ================================================================
    # PHASE 5: TESTING (Priority 2-4)
    # Unit tests, e2e tests, integration tests, accessibility
    # ================================================================

    add_feature(conn,
        id='TEST-001',
        title='Fix and expand e2e tests',
        description='''Fix existing e2e tests and expand coverage for core game flow.

After BUG-001 fixes the Playwright port, update e2e tests to cover:
1. Player can join a game room with name and room code
2. Player can view the play page with scenario and decision sliders
3. Player can submit decisions and see results
4. Player can navigate between pages using the nav
5. Leaderboard shows the player after completing a level

Update e2e/game-flow.spec.ts and create e2e/helpers.ts with shared utilities.
Ensure tests use VITE_AUTH_MOCK=true for reliable testing.''',
        priority=2,
        category='TESTING',
        dependencies=['BUG-001'],
        files=[
            'e2e/game-flow.spec.ts',
            'e2e/helpers.ts'
        ],
        test_command='npx playwright test',
        acceptance_criteria=[
            'e2e tests run successfully with npx playwright test',
            'Join room flow tested',
            'Play level flow tested (decisions + results)',
            'Navigation between pages tested',
            'Leaderboard visibility tested',
            'Tests use VITE_AUTH_MOCK=true',
            'No flaky tests (run 3x to verify stability)'
        ]
    )

    add_feature(conn,
        id='TEST-002',
        title='Unit tests for simulation engine',
        description='''Create unit tests for the core simulation/demand calculation logic.

Test the demand formula from master spec Section 4.3:
- Base demand calculation with various price/quality/marketing inputs
- Optimal range scoring (priceScore, qualityScore, marketingScore)
- Weather effect impact
- Scenario multiplier (deception level)
- Capacity cap at 150 cups
- Edge cases: minimum price, maximum marketing, zero quality

Test the financial calculation from Section 4.4:
- Revenue calculation
- Ingredient cost with quality multiplier
- Total costs calculation
- Profit calculation
- Budget update including loan repayment

Use Vitest for the test framework.''',
        priority=2,
        category='TESTING',
        dependencies=[],
        files=['src/__tests__/simulation.test.ts'],
        test_command='npx vitest run src/__tests__/simulation.test.ts',
        acceptance_criteria=[
            'Test file exists at src/__tests__/simulation.test.ts',
            'Demand calculation tested with at least 5 different input combinations',
            'Financial calculation tested with known inputs',
            'Edge cases tested (zero values, max values, boundary conditions)',
            'All tests pass with npx vitest run',
            'Tests cover capacity cap at 150'
        ]
    )

    add_feature(conn,
        id='TEST-003',
        title='Integration tests for game flow',
        description='''Create integration tests that verify the full game flow works end-to-end
at the store level (not browser e2e, but store action integration).

Test scenarios:
1. Start new game: player joins room, initial state is correct
2. Play a level: submit decisions, verify results calculated correctly
3. Budget carries forward between levels
4. Loan acceptance: budget increases, repayment deducted each level
5. Loan decline: no change to budget
6. Game over: budget drops below $20, game over state triggered
7. Level unlock: only correct levels available based on camp day

Use Vitest and import the game store directly.''',
        priority=3,
        category='TESTING',
        dependencies=['TEST-002'],
        files=['src/__tests__/game-flow.integration.test.ts'],
        test_command='npx vitest run src/__tests__/game-flow.integration.test.ts',
        acceptance_criteria=[
            'Test file exists at src/__tests__/game-flow.integration.test.ts',
            'New game state tested (correct initial budget, level, etc.)',
            'Level play flow tested with budget carry-forward',
            'Loan acceptance and repayment tested',
            'Game over condition tested',
            'All tests pass with npx vitest run'
        ]
    )

    add_feature(conn,
        id='TEST-004',
        title='TypeScript strict mode',
        description='''Enable stricter TypeScript checks in tsconfig.app.json and fix resulting errors.

Add or enable these compiler options:
- noUncheckedIndexedAccess: true (or at least consider it)
- strictNullChecks: true (should already be enabled via strict)
- noImplicitReturns: true
- noFallthroughCasesInSwitch: true
- forceConsistentCasingInImports: true

Fix any new TypeScript errors that arise from enabling these options.
This must be done AFTER dead code removal (BUG-004) to avoid fixing errors in
code that will be deleted.''',
        priority=3,
        category='TESTING',
        dependencies=['BUG-004'],
        files=['tsconfig.app.json'],
        test_command='npx tsc --noEmit',
        acceptance_criteria=[
            'Stricter compiler options enabled in tsconfig.app.json',
            'npx tsc --noEmit passes with zero errors',
            'npm run build succeeds',
            'No regressions in existing functionality'
        ]
    )

    add_feature(conn,
        id='TEST-005',
        title='Accessibility audit and fixes',
        description='''Run an accessibility audit on key pages and fix issues.

Check for:
- All interactive elements have proper ARIA labels
- Color contrast meets WCAG AA standards
- Focus management works correctly with keyboard navigation
- Screen reader can navigate the decision sliders
- Images/icons have alt text
- Form inputs have associated labels
- Skip navigation link exists

Focus on: PlayPage, ResultsPage, HomePage, and navigation components.
Use aXe or similar tool if available, otherwise manual audit.''',
        priority=4,
        category='TESTING',
        dependencies=['TEST-001'],
        files=['src/components/layout/'],
        acceptance_criteria=[
            'All buttons and links have descriptive ARIA labels',
            'Decision sliders are keyboard accessible',
            'Form inputs have associated labels',
            'Color contrast meets WCAG AA (4.5:1 for text)',
            'Focus order is logical on all audited pages',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='TEST-006',
        title='Multi-player stress test',
        description='''Create a Playwright test that simulates multiple players joining and playing simultaneously.

The test should:
1. Open multiple browser contexts (5-10 simulated players)
2. Each player joins the same room
3. Each player plays 2-3 levels
4. Verify leaderboard shows all players with correct rankings
5. Verify no duplicate entries or data corruption
6. Measure response times (warn if > 2s for any operation)

This tests the Supabase Realtime integration under load.''',
        priority=4,
        category='TESTING',
        dependencies=['TEST-001', 'BACK-001'],
        files=['e2e/stress-test.spec.ts'],
        test_command='npx playwright test e2e/stress-test.spec.ts',
        acceptance_criteria=[
            'Test creates 5+ simultaneous player sessions',
            'All players can join the same room',
            'All players can complete levels without errors',
            'Leaderboard shows correct rankings for all players',
            'No duplicate player entries',
            'No test timeouts or crashes'
        ]
    )

    # ================================================================
    # PHASE 6: ADVANCED (Priority 3-5)
    # Facilitator tools, PWA, data export, settings, polish
    # ================================================================

    add_feature(conn,
        id='ADV-001',
        title='Facilitator dashboard enhancement',
        description='''Enhance the FacilitatorPage to show comprehensive admin tools.

The facilitator dashboard should include:
- Real-time view of all player progress (levels completed, current budget)
- Aggregate statistics: average profit, common mistakes, completion rates
- List of players who haven't started today's levels
- Ability to see individual player details (click to expand)
- Room management: room code display, player count
- Camp day configuration (set camp_start_date)

See master spec Section 10.2 for facilitator requirements.
Only accessible via facilitator authentication (separate from player auth).''',
        priority=3,
        category='ADVANCED',
        dependencies=['BACK-001'],
        files=['src/pages/FacilitatorPage.tsx'],
        acceptance_criteria=[
            'Dashboard shows all players with progress indicators',
            'Aggregate statistics calculated and displayed',
            'Inactive players highlighted',
            'Individual player details expandable',
            'Room code and player count shown',
            'Camp start date configurable',
            'Responsive layout',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='ADV-002',
        title='Full data export for facilitator',
        description='''Add data export functionality to the FacilitatorPage.

The facilitator should be able to export:
1. Leaderboard as CSV (all columns: rank, name, levels, budget, profit, revenue, cups, loan status)
2. Individual player histories as CSV (all level results for each player)
3. Aggregate camp statistics as a summary report

Add export buttons to the FacilitatorPage that trigger browser downloads.
Use standard CSV format with proper escaping for special characters.''',
        priority=4,
        category='ADVANCED',
        dependencies=['ADV-001'],
        files=['src/pages/FacilitatorPage.tsx'],
        acceptance_criteria=[
            'Leaderboard export button generates valid CSV download',
            'Player history export includes all level results',
            'CSV files have proper headers',
            'Special characters (commas, quotes) properly escaped',
            'Export works in both Chrome and Safari',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='ADV-003',
        title='PWA support',
        description='''Add Progressive Web App support so the game can be installed on mobile devices.

Add:
- public/manifest.json with app name, icons, theme color, display mode
- Configure vite-plugin-pwa in vite.config.ts (or add manually)
- Add appropriate meta tags to index.html
- Service worker for basic offline caching (cache app shell and static assets)
- Ensure app works when network is briefly unavailable

Keep the PWA implementation simple - the main goal is "Add to Home Screen" functionality
and basic offline resilience, not full offline play.''',
        priority=4,
        category='ADVANCED',
        dependencies=[],
        files=[
            'public/manifest.json',
            'vite.config.ts'
        ],
        acceptance_criteria=[
            'manifest.json exists with correct app name and icons',
            'App can be installed via "Add to Home Screen" on mobile',
            'Installed app opens in standalone mode (no browser chrome)',
            'Basic static assets cached for offline use',
            'App shell loads even when briefly offline',
            'npm run build succeeds with PWA config',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='ADV-004',
        title='Simulation result animations',
        description='''Add engaging animations to the ResultsPage for a more dynamic experience.

Implement:
- Count-up animation for revenue, costs, and profit numbers
- Progress bar animation for cups sold (fills from 0 to final count)
- Budget change animation (old budget -> new budget with color flash)
- Subtle confetti or sparkle effect for profitable levels
- Smooth transitions between sections of the results

Create a reusable CountUpAnimation component that animates a number from 0 to target.
Use CSS transitions and requestAnimationFrame - no heavy animation libraries.''',
        priority=5,
        category='ADVANCED',
        dependencies=[],
        files=[
            'src/pages/ResultsPage.tsx',
            'src/components/CountUpAnimation.tsx'
        ],
        acceptance_criteria=[
            'CountUpAnimation component animates numbers from 0 to target',
            'Revenue, costs, and profit animate on ResultsPage',
            'Cups sold shows filling progress bar',
            'Budget change highlighted with color transition',
            'Animations are smooth (60fps)',
            'Animations complete within 1-2 seconds',
            'npx tsc --noEmit passes'
        ]
    )

    add_feature(conn,
        id='ADV-005',
        title='Settings page',
        description='''Create a SettingsPage for player preferences and app configuration.

The settings page should include:
- Theme toggle (light/dark mode) - integrates with UI-001
- Sound effects toggle (for future sound implementation)
- Notification preferences
- Player name edit (with Supabase sync)
- About section (game version, credits)
- Reset local data option (with confirmation dialog)
- Link to How to Play page

Add route to App.tsx and navigation link.''',
        priority=5,
        category='ADVANCED',
        dependencies=['UI-001'],
        files=[
            'src/pages/SettingsPage.tsx',
            'src/App.tsx'
        ],
        acceptance_criteria=[
            'SettingsPage renders with all sections',
            'Theme toggle works (syncs with ThemeToggle component)',
            'Reset local data shows confirmation dialog before clearing',
            'Route /settings works in App.tsx',
            'Navigation link added to sidebar/menu',
            'Responsive layout for mobile',
            'npx tsc --noEmit passes'
        ]
    )

    # ================================================================
    # Commit and print summary
    # ================================================================

    conn.commit()

    # Print summary statistics
    cursor = conn.execute("SELECT COUNT(*) as count FROM features")
    total = cursor.fetchone()[0]

    cursor = conn.execute("""
        SELECT category, COUNT(*) as count
        FROM features
        GROUP BY category
        ORDER BY
            CASE category
                WHEN 'BUG_FIX' THEN 1
                WHEN 'BACKEND' THEN 2
                WHEN 'GAMEPLAY' THEN 3
                WHEN 'UI_UX' THEN 4
                WHEN 'TESTING' THEN 5
                WHEN 'ADVANCED' THEN 6
            END
    """)
    categories = cursor.fetchall()

    # Count by priority
    cursor = conn.execute("""
        SELECT priority, COUNT(*) as count
        FROM features
        GROUP BY priority
        ORDER BY priority
    """)
    priorities = cursor.fetchall()

    # Count features with dependencies
    cursor = conn.execute("""
        SELECT COUNT(*) as count FROM features
        WHERE dependencies != '[]'
    """)
    with_deps = cursor.fetchone()[0]

    conn.close()

    print(f"\n{'='*55}")
    print(f"  LEMONADE STAND v2.0 - FEATURE DATABASE SEEDED")
    print(f"{'='*55}")
    print(f"\n  Total Features: {total}")
    print(f"  Features with Dependencies: {with_deps}")
    print(f"\n  By Category:")
    for cat, count in categories:
        bar = '#' * count
        print(f"    {cat:<12} {count:>2}  {bar}")
    print(f"\n  By Priority:")
    for pri, count in priorities:
        print(f"    Priority {pri}: {count}")
    print(f"\n{'='*55}")
    print(f"\n  Next steps:")
    print(f"    1. Run: python3 autonomous-coder/features_mcp.py stats")
    print(f"    2. Run: /lemon-dev continue")
    print(f"\n{'='*55}\n")


if __name__ == "__main__":
    force = "--force" in sys.argv
    seed_features(force=force)
