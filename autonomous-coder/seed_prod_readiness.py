#!/usr/bin/env python3
"""
Seed production readiness fixes into the existing feature database.
Adds all critical, high, and medium issues found during deployment audit.

Usage:
    python3 seed_prod_readiness.py
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent / "features.db"


def add_feature(conn, **kwargs):
    """Add a feature to the database."""
    conn.execute("""
        INSERT OR REPLACE INTO features
        (id, title, description, priority, category, dependencies, files,
         acceptance_criteria, status, notes, max_retries, test_command)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)
    """, (
        kwargs["id"],
        kwargs["title"],
        kwargs["description"],
        kwargs.get("priority", 3),
        kwargs.get("category", "BUG_FIX"),
        json.dumps(kwargs.get("dependencies", [])),
        json.dumps(kwargs.get("files", [])),
        json.dumps(kwargs.get("acceptance_criteria", [])),
        kwargs.get("max_retries", 3),
        kwargs.get("test_command", ""),
    ))


def seed():
    if not DB_PATH.exists():
        print(f"ERROR: {DB_PATH} does not exist. Run seed_features_v2.py first.")
        return

    conn = sqlite3.connect(str(DB_PATH))

    # ===== CRITICAL (Priority 1) =====

    add_feature(conn,
        id="PROD-001",
        title="Move Supabase credentials to environment variables",
        description="""CRITICAL SECURITY: Supabase URL and anon key are hardcoded in src/lib/supabase.ts.
Move them to VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.
- Replace hardcoded values with import.meta.env.VITE_SUPABASE_URL and import.meta.env.VITE_SUPABASE_ANON_KEY
- Create a .env.example file with placeholder values
- Add .env to .gitignore if not already there
- Add a runtime check that throws if env vars are missing (except in test mode)
- Update any documentation referencing the setup""",
        priority=1,
        category="BUG_FIX",
        files=["src/lib/supabase.ts", ".gitignore", ".env.example"],
        acceptance_criteria=[
            "No hardcoded Supabase URL or key in any source file",
            "App reads VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from environment",
            ".env.example exists with placeholder values",
            ".env is in .gitignore",
            "App throws clear error if env vars missing in production mode",
            "npx tsc --noEmit passes",
            "npm run build passes"
        ],
    )

    add_feature(conn,
        id="PROD-002",
        title="Remove devv.ai third-party script from index.html",
        description="""CRITICAL: External devv.ai script is loaded in production HTML.
This is a development tool that should not be in production.
Remove the <script> tag for devv.ai from index.html.""",
        priority=1,
        category="BUG_FIX",
        files=["index.html"],
        acceptance_criteria=[
            "No devv.ai script tag in index.html",
            "No other non-essential third-party scripts in index.html",
            "npm run build passes"
        ],
    )

    add_feature(conn,
        id="PROD-003",
        title="Fix AUTH_MOCK default to false for production safety",
        description="""CRITICAL: VITE_AUTH_MOCK defaults to true, meaning production deployments
bypass authentication unless explicitly set.
- Change the default to false (require explicit opt-in for mock mode)
- Only enable mock auth when VITE_AUTH_MOCK is explicitly set to 'true'
- Add a visible dev-mode banner when mock auth is active
- Log a console warning when mock auth is active""",
        priority=1,
        category="BUG_FIX",
        dependencies=["PROD-001"],
        files=["src/lib/supabase.ts"],
        acceptance_criteria=[
            "AUTH_MOCK defaults to false when VITE_AUTH_MOCK is not set",
            "Mock auth only activates when VITE_AUTH_MOCK is explicitly 'true'",
            "Console warning logged when mock auth is active",
            "npx tsc --noEmit passes",
            "npm run build passes"
        ],
    )

    add_feature(conn,
        id="PROD-004",
        title="Add React Error Boundary to prevent white-screen crashes",
        description="""HIGH: No error boundary exists. Any component throw causes a full white screen.
- Create an ErrorBoundary component in src/components/ErrorBoundary.tsx
- Wrap the app's Outlet in AppLayout with the ErrorBoundary
- Show a user-friendly error page with a 'Try Again' button that reloads
- Log errors to console for debugging
- Include the error message in dev mode only""",
        priority=1,
        category="UI_UX",
        files=["src/components/ErrorBoundary.tsx", "src/App.tsx"],
        acceptance_criteria=[
            "ErrorBoundary component exists and wraps the main app content",
            "Caught errors display a friendly recovery page, not a white screen",
            "Recovery page has a button to reload the app",
            "Error details shown in development mode only",
            "npx tsc --noEmit passes",
            "npm run build passes"
        ],
    )

    add_feature(conn,
        id="PROD-005",
        title="Fix all ESLint errors (40 errors, 25 warnings)",
        description="""CRITICAL: 40 ESLint errors block CI/CD pipelines.
Run npm run lint, fix all errors. Warnings can be addressed but errors are mandatory.
Common issues: unused variables, missing dependencies in hooks, any types.
Do NOT disable rules - fix the underlying issues.""",
        priority=1,
        category="BUG_FIX",
        files=["src/"],
        acceptance_criteria=[
            "npm run lint exits with 0 errors",
            "No eslint-disable comments added to suppress real issues",
            "npx tsc --noEmit passes",
            "npm run build passes"
        ],
    )

    add_feature(conn,
        id="PROD-006",
        title="Fix runSimulation race condition (double-click guard)",
        description="""CRITICAL: runSimulation() in game-store uses setTimeout chains.
Rapid double-clicks can trigger parallel simulations, corrupting game state.
- Add an isSimulating flag to the store
- Set it true at start, false at end of simulation
- Guard runSimulation() to return early if already simulating
- Disable the Submit/Play button in PlayPage while isSimulating is true
- Ensure the flag is reset even if simulation errors out""",
        priority=1,
        category="BUG_FIX",
        files=["src/store/game-store.ts", "src/pages/PlayPage.tsx"],
        acceptance_criteria=[
            "isSimulating flag exists in the store",
            "runSimulation returns early if already simulating",
            "Submit button is disabled during simulation",
            "isSimulating resets to false after simulation completes or errors",
            "npx tsc --noEmit passes",
            "npm run build passes"
        ],
    )

    add_feature(conn,
        id="PROD-007",
        title="Fix budget going negative after loan repayment",
        description="""CRITICAL: Loan auto-repayment deducts without checking if budget covers it.
This allows negative balances which break the game logic.
- In the loan repayment logic, check if budget >= repayment amount
- If insufficient funds, either: defer repayment to next level, or clamp to 0 with a partial payment
- Add a notification/warning when repayment reduces budget significantly
- Use Math.round(value * 100) / 100 for all currency operations""",
        priority=1,
        category="BUG_FIX",
        files=["src/store/game-store.ts"],
        acceptance_criteria=[
            "Budget never goes below $0 after loan repayment",
            "Partial payment or deferred repayment when funds insufficient",
            "Currency calculations use proper rounding",
            "npx tsc --noEmit passes",
            "npm run build passes"
        ],
    )

    add_feature(conn,
        id="PROD-008",
        title="Fix PWA caching pattern for production domain",
        description="""CRITICAL: navigateFallbackAllowlist in vite.config.ts only matches localhost.
The PWA service worker won't cache navigation requests on the deployed domain.
- Update the navigateFallbackAllowlist regex to match all origins (or remove it if not needed)
- Verify the runtimeCaching patterns work for production URLs
- Test that the service worker registers correctly in a production build""",
        priority=1,
        category="BUG_FIX",
        files=["vite.config.ts"],
        acceptance_criteria=[
            "navigateFallbackAllowlist matches production domain (not just localhost)",
            "Service worker caching works for production URLs",
            "npm run build produces a valid sw.js",
            "npx tsc --noEmit passes",
            "npm run build passes"
        ],
    )

    add_feature(conn,
        id="PROD-009",
        title="Fix timezone handling to use America/Cayman for level unlocking",
        description="""CRITICAL: Level unlock uses device local time, but camp is in Cayman Islands.
Students with mis-set device clocks could unlock levels early or be locked out.
- Pin level unlock time comparisons to America/Cayman timezone (UTC-5, no DST)
- Use Intl.DateTimeFormat or a timezone-aware comparison
- The 7AM unlock should always be 7AM Cayman time regardless of device timezone
- Verify the existing BUG-007 implementation handles this correctly, fix if not""",
        priority=1,
        category="BUG_FIX",
        dependencies=["BUG-007"],
        files=["src/store/game-store.ts", "src/lib/level-utils.ts"],
        acceptance_criteria=[
            "Level unlock time is computed in America/Cayman timezone",
            "Device timezone does not affect unlock calculations",
            "7AM unlock means 7AM EST/Cayman time",
            "npx tsc --noEmit passes",
            "npm run build passes"
        ],
    )

    # ===== HIGH PRIORITY (Priority 2) =====

    add_feature(conn,
        id="PROD-010",
        title="Add code splitting with React.lazy for route-level chunks",
        description="""HIGH: 1.2MB single bundle is too large for camp Wi-Fi.
Add route-level code splitting using React.lazy and Suspense.
- Lazy-load all page components in App.tsx
- Add a loading fallback (spinner or skeleton)
- Keep small/shared components in the main bundle
- Verify chunks are created in the build output""",
        priority=2,
        category="ADVANCED",
        files=["src/App.tsx"],
        acceptance_criteria=[
            "All page components are lazy-loaded with React.lazy",
            "Suspense wrapper with loading fallback exists",
            "npm run build produces multiple chunk files",
            "Main bundle is significantly smaller than 1.2MB",
            "npx tsc --noEmit passes",
            "npm run build passes"
        ],
    )

    add_feature(conn,
        id="PROD-011",
        title="Fix advanceToNextLevel off-by-one at level 50",
        description="""HIGH: advanceToNextLevel() may crash or behave incorrectly at the final level (50).
- Review the level advancement logic for boundary conditions
- Ensure level 50 completion shows the final results/awards without trying to advance to level 51
- Add a guard: if currentLevel >= 50, do not advance, show game completion
- Test the boundary: what happens when a player completes level 50?""",
        priority=2,
        category="BUG_FIX",
        files=["src/store/game-store.ts"],
        acceptance_criteria=[
            "Completing level 50 does not crash or try to load level 51",
            "Level 50 completion triggers game completion flow",
            "advanceToNextLevel has proper bounds checking",
            "npx tsc --noEmit passes",
            "npm run build passes"
        ],
    )

    add_feature(conn,
        id="PROD-012",
        title="Add Content Security Policy headers",
        description="""HIGH: No CSP headers means broader XSS attack surface.
- Add CSP meta tag to index.html OR configure CSP headers in vercel.json
- Allow self, inline styles (for Tailwind), and the Supabase domain
- Block unsafe-eval and other risky sources
- Verify the app still loads correctly with CSP active""",
        priority=2,
        category="BACKEND",
        files=["vercel.json", "index.html"],
        acceptance_criteria=[
            "CSP header or meta tag is configured",
            "CSP allows the app's own resources and Supabase domain",
            "CSP blocks unsafe-eval",
            "App loads and functions correctly with CSP active",
            "npm run build passes"
        ],
    )

    add_feature(conn,
        id="PROD-013",
        title="Fix npm audit vulnerabilities",
        description="""HIGH: 7 npm vulnerabilities (6 high, 1 moderate).
- Run npm audit and review the vulnerabilities
- Run npm audit fix for auto-fixable issues
- For non-auto-fixable issues, evaluate if they affect production (dev-only deps are lower risk)
- Update package.json and package-lock.json
- Ensure app still builds and runs after updates""",
        priority=2,
        category="BUG_FIX",
        files=["package.json", "package-lock.json"],
        acceptance_criteria=[
            "npm audit shows 0 high vulnerabilities (moderate acceptable if dev-only)",
            "npm run build still passes after updates",
            "npx tsc --noEmit passes",
            "App functionality not broken by dependency updates"
        ],
    )

    # ===== MEDIUM PRIORITY (Priority 3) =====

    add_feature(conn,
        id="PROD-014",
        title="Add localStorage rehydration validation",
        description="""MEDIUM: Zustand persist middleware loads stale/corrupted localStorage without validation.
If the store shape changes between versions, old cached data can crash the app.
- Add a version number to the persisted state
- Add an onRehydrateStorage callback that validates the loaded state
- If validation fails, clear the stored state and start fresh
- Log a warning when stale data is cleared""",
        priority=3,
        category="BACKEND",
        files=["src/store/game-store.ts"],
        acceptance_criteria=[
            "Persisted state includes a version number",
            "onRehydrateStorage validates state shape on load",
            "Corrupted or version-mismatched state is cleared gracefully",
            "Fresh state is initialized when old data is cleared",
            "npx tsc --noEmit passes",
            "npm run build passes"
        ],
    )

    add_feature(conn,
        id="PROD-015",
        title="Fix resetGame to cancel pending sync timers",
        description="""MEDIUM: resetGame() doesn't cancel pending debouncedSync timers.
After reset, old timers may fire and push stale state to Supabase.
- Track any pending sync timer IDs in the store
- Cancel all pending timers in resetGame()
- Ensure no Supabase sync happens after a reset until new game actions occur""",
        priority=3,
        category="BUG_FIX",
        files=["src/store/game-store.ts"],
        acceptance_criteria=[
            "resetGame cancels all pending sync timers",
            "No stale state synced to Supabase after reset",
            "npx tsc --noEmit passes",
            "npm run build passes"
        ],
    )

    conn.commit()
    conn.close()

    print(f"Successfully seeded 15 production readiness features into {DB_PATH}")


if __name__ == "__main__":
    seed()
