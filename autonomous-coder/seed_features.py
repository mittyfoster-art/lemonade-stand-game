#!/usr/bin/env python3
"""
Seed the feature database with all features for the Multi-Factor Scoring implementation.
Run this to initialize the database with all ~50 features.
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent / "features.db"
SCHEMA_PATH = Path(__file__).parent / "features_schema.sql"

def init_db():
    """Initialize database with schema."""
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
        (id, title, description, priority, category, dependencies, files, acceptance_criteria, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    """, (
        kwargs['id'],
        kwargs['title'],
        kwargs['description'],
        kwargs.get('priority', 3),
        kwargs['category'],
        json.dumps(kwargs.get('dependencies', [])),
        json.dumps(kwargs.get('files', [])),
        json.dumps(kwargs.get('acceptance_criteria', [])),
        int(datetime.now().timestamp()),
        int(datetime.now().timestamp())
    ))

def seed_features():
    """Seed all features for Multi-Factor Scoring implementation."""
    conn = init_db()

    # ============== DATA MODEL FEATURES ==============

    add_feature(conn,
        id='DATA-001',
        title='Create scoring types file',
        description='Create src/types/scoring.ts file with basic exports structure.',
        priority=1,
        category='DATA_MODEL',
        dependencies=[],
        files=['src/types/scoring.ts'],
        acceptance_criteria=[
            'File exists at src/types/scoring.ts',
            'File has proper TypeScript structure',
            'File can be imported without errors'
        ]
    )

    add_feature(conn,
        id='DATA-002',
        title='Create MultiFactorScore interface',
        description='''Create the MultiFactorScore interface in src/types/scoring.ts.
Fields:
- profitRanking: number (0-50)
- consistency: number (0-20)
- efficiency: number (0-15)
- riskManagement: number (0-15)
- total: number (0-100)
- profitRank: number
- spoilageRate: number
- profitableRounds: number
- calculatedAt: number

See spec/01_SCORING_SYSTEM.md for details.''',
        priority=1,
        category='DATA_MODEL',
        dependencies=['DATA-001'],
        files=['src/types/scoring.ts'],
        acceptance_criteria=[
            'Interface exported from src/types/scoring.ts',
            'All fields have correct types',
            'JSDoc comments explain each field',
            'No TypeScript errors'
        ]
    )

    add_feature(conn,
        id='DATA-003',
        title='Create DecisionQuality interface',
        description='''Create the DecisionQuality interface in src/types/scoring.ts.
Fields:
- priceOptimal: boolean
- qualityOptimal: boolean
- marketingOptimal: boolean
- overallScore: number (0-3)''',
        priority=1,
        category='DATA_MODEL',
        dependencies=['DATA-001'],
        files=['src/types/scoring.ts'],
        acceptance_criteria=[
            'Interface exported',
            'All boolean and number types correct',
            'JSDoc comments present'
        ]
    )

    add_feature(conn,
        id='DATA-004',
        title='Create RoundResult interface',
        description='''Create the RoundResult interface in src/types/scoring.ts.
Fields: round, scenarioId, decision (GameDecision), cupsMade, cupsSold, spoilageRate, revenue, costs, profit, decisionQuality (DecisionQuality), timestamp.
See spec/04_DATA_MODEL.md for full specification.''',
        priority=1,
        category='DATA_MODEL',
        dependencies=['DATA-003'],
        files=['src/types/scoring.ts'],
        acceptance_criteria=[
            'Interface exported',
            'References DecisionQuality correctly',
            'All numeric types specified',
            'JSDoc comments present'
        ]
    )

    add_feature(conn,
        id='DATA-005',
        title='Create RiskManagementInput interface',
        description='''Create the RiskManagementInput interface in src/types/scoring.ts.
Fields:
- teamId: string
- productionAdjustment: number (0-5)
- pricingStrategy: number (0-5)
- budgetReserves: number (0-5)
- total: number (0-15)
- notes: string
- assessedBy: string
- assessedAt: number''',
        priority=1,
        category='DATA_MODEL',
        dependencies=['DATA-001'],
        files=['src/types/scoring.ts'],
        acceptance_criteria=[
            'Interface exported',
            'All fields typed correctly',
            'JSDoc comments explain facilitator assessment criteria'
        ]
    )

    add_feature(conn,
        id='DATA-006',
        title='Create CategoryAward interface',
        description='''Create the CategoryAward interface in src/types/scoring.ts.
Fields:
- category: "profit" | "consistency" | "efficiency"
- teamId: string
- teamName: string
- value: number | string
- icon: string''',
        priority=1,
        category='DATA_MODEL',
        dependencies=['DATA-001'],
        files=['src/types/scoring.ts'],
        acceptance_criteria=[
            'Interface exported',
            'Category uses union type',
            'All fields typed correctly'
        ]
    )

    add_feature(conn,
        id='DATA-007',
        title='Create LeaderboardEntry interface',
        description='''Create the LeaderboardEntry interface in src/types/scoring.ts.
Fields:
- rank: number
- team: Team (import from store)
- multiFactorScore: MultiFactorScore
- awards: CategoryAward[]
- isTied: boolean''',
        priority=1,
        category='DATA_MODEL',
        dependencies=['DATA-002', 'DATA-006'],
        files=['src/types/scoring.ts'],
        acceptance_criteria=[
            'Interface exported',
            'References MultiFactorScore and CategoryAward',
            'Team type imported correctly'
        ]
    )

    add_feature(conn,
        id='DATA-008',
        title='Export all types from index',
        description='Create src/types/index.ts that re-exports all types from scoring.ts for clean imports.',
        priority=1,
        category='DATA_MODEL',
        dependencies=['DATA-002', 'DATA-003', 'DATA-004', 'DATA-005', 'DATA-006', 'DATA-007'],
        files=['src/types/index.ts'],
        acceptance_criteria=[
            'All interfaces can be imported from src/types',
            'Clean barrel export pattern used'
        ]
    )

    # ============== SCORING CALCULATION FEATURES ==============

    add_feature(conn,
        id='SCORE-001',
        title='Create scoring library file',
        description='Create src/lib/scoring.ts file for all scoring calculation functions.',
        priority=2,
        category='SCORING',
        dependencies=['DATA-008'],
        files=['src/lib/scoring.ts'],
        acceptance_criteria=[
            'File exists at src/lib/scoring.ts',
            'Imports types from src/types',
            'Can be imported without errors'
        ]
    )

    add_feature(conn,
        id='SCORE-002',
        title='Implement getProfitRankingPoints function',
        description='''Implement getProfitRankingPoints(rank: number): number
Returns points based on rank:
- 1st: 50, 2nd: 45, 3rd: 40, 4th: 35, 5th: 30
- 6th-10th: 25, 11th-15th: 20, 16th-20th: 15, 21st+: 10
See spec/01_SCORING_SYSTEM.md Section 1.''',
        priority=2,
        category='SCORING',
        dependencies=['SCORE-001'],
        files=['src/lib/scoring.ts'],
        acceptance_criteria=[
            'Function exported',
            'Returns 50 for rank 1',
            'Returns 10 for rank 21+',
            'All intermediate values correct',
            'Has JSDoc comments'
        ]
    )

    add_feature(conn,
        id='SCORE-003',
        title='Implement getConsistencyPoints function',
        description='''Implement getConsistencyPoints(roundHistory: RoundResult[]): number
Returns 4 points per profitable round (profit > 0), max 20 points.
See spec/01_SCORING_SYSTEM.md Section 2.''',
        priority=2,
        category='SCORING',
        dependencies=['SCORE-001', 'DATA-004'],
        files=['src/lib/scoring.ts'],
        acceptance_criteria=[
            'Function exported',
            'Returns 0 for no profitable rounds',
            'Returns 20 for 5 profitable rounds',
            'Caps at 20 points',
            'Has JSDoc comments'
        ]
    )

    add_feature(conn,
        id='SCORE-004',
        title='Implement calculateSpoilageRate function',
        description='''Implement calculateSpoilageRate(roundHistory: RoundResult[]): number
Returns (totalCupsMade - totalCupsSold) / totalCupsMade
Returns 0 if totalCupsMade is 0.
See spec/01_SCORING_SYSTEM.md Section 3.''',
        priority=2,
        category='SCORING',
        dependencies=['SCORE-001', 'DATA-004'],
        files=['src/lib/scoring.ts'],
        acceptance_criteria=[
            'Function exported',
            'Returns 0 for no production',
            'Returns correct rate for mixed rounds',
            'Handles edge case of 0 cups made',
            'Has JSDoc comments'
        ]
    )

    add_feature(conn,
        id='SCORE-005',
        title='Implement getEfficiencyPoints function',
        description='''Implement getEfficiencyPoints(spoilageRate: number): number
Returns points based on spoilage:
- 0-10%: 15, 11-20%: 12, 21-30%: 9, 31-40%: 6, 41-50%: 3, 51%+: 0
See spec/01_SCORING_SYSTEM.md Section 3.''',
        priority=2,
        category='SCORING',
        dependencies=['SCORE-001'],
        files=['src/lib/scoring.ts'],
        acceptance_criteria=[
            'Function exported',
            'Returns 15 for 0-10% spoilage',
            'Returns 0 for 51%+ spoilage',
            'Boundary conditions correct',
            'Has JSDoc comments'
        ]
    )

    add_feature(conn,
        id='SCORE-006',
        title='Implement resolveTie function',
        description='''Implement resolveTie(teamA: Team, teamB: Team): number
Tiebreaker rules in order:
1. Highest single-round profit
2. Fewest loss rounds
3. Higher total revenue
4. Earlier timestamp
See spec/01_SCORING_SYSTEM.md Tiebreaker Rules.''',
        priority=2,
        category='SCORING',
        dependencies=['SCORE-001', 'DATA-004'],
        files=['src/lib/scoring.ts'],
        acceptance_criteria=[
            'Function exported',
            'Applies tiebreakers in correct order',
            'Returns positive/negative/zero correctly',
            'Has JSDoc comments'
        ]
    )

    add_feature(conn,
        id='SCORE-007',
        title='Implement calculateProfitRanks function',
        description='''Implement calculateProfitRanks(teams: Team[]): Map<string, number>
Sorts teams by profit descending, returns map of teamId to rank (1-based).
Uses resolveTie for ties.''',
        priority=2,
        category='SCORING',
        dependencies=['SCORE-006'],
        files=['src/lib/scoring.ts'],
        acceptance_criteria=[
            'Function exported',
            'Returns correct ranks for simple case',
            'Handles ties correctly',
            'Has JSDoc comments'
        ]
    )

    add_feature(conn,
        id='SCORE-008',
        title='Implement calculateMultiFactorScore function',
        description='''Implement calculateMultiFactorScore(team: Team, profitRank: number, riskScore: number): MultiFactorScore
Calculates complete multi-factor score using all component functions.
See spec/01_SCORING_SYSTEM.md Section 5.''',
        priority=2,
        category='SCORING',
        dependencies=['SCORE-002', 'SCORE-003', 'SCORE-004', 'SCORE-005', 'DATA-002'],
        files=['src/lib/scoring.ts'],
        acceptance_criteria=[
            'Function exported',
            'Calls all component functions',
            'Total equals sum of components',
            'Returns valid MultiFactorScore object',
            'Has JSDoc comments'
        ]
    )

    add_feature(conn,
        id='SCORE-009',
        title='Implement calculateCategoryAwards function',
        description='''Implement calculateCategoryAwards(teams: Team[]): CategoryAward[]
Returns awards for:
- Best Profit: highest total profit
- Most Consistent: most profitable rounds
- Most Efficient: lowest spoilage rate
See spec/06_LEADERBOARD.md.''',
        priority=2,
        category='SCORING',
        dependencies=['SCORE-001', 'DATA-006'],
        files=['src/lib/scoring.ts'],
        acceptance_criteria=[
            'Function exported',
            'Returns 3 awards',
            'Each award has correct category and winner',
            'Has JSDoc comments'
        ]
    )

    add_feature(conn,
        id='SCORE-010',
        title='Export all scoring functions',
        description='Ensure all scoring functions are properly exported from src/lib/scoring.ts.',
        priority=2,
        category='SCORING',
        dependencies=['SCORE-002', 'SCORE-003', 'SCORE-004', 'SCORE-005', 'SCORE-006', 'SCORE-007', 'SCORE-008', 'SCORE-009'],
        files=['src/lib/scoring.ts'],
        acceptance_criteria=[
            'All functions importable',
            'No TypeScript errors',
            'Clean exports'
        ]
    )

    # ============== STORE FEATURES ==============

    add_feature(conn,
        id='STORE-001',
        title='Add roundHistory field to Team interface',
        description='Update the Team interface in game-store.ts to include roundHistory: RoundResult[] field. Initialize as empty array.',
        priority=3,
        category='STORE',
        dependencies=['DATA-004'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'Team interface has roundHistory field',
            'Field is typed as RoundResult[]',
            'Default value is empty array',
            'No TypeScript errors'
        ]
    )

    add_feature(conn,
        id='STORE-002',
        title='Add totalCupsMade field to Team interface',
        description='Add totalCupsMade: number field to Team interface. Initialize as 0.',
        priority=3,
        category='STORE',
        dependencies=['STORE-001'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'Team interface has totalCupsMade field',
            'Default value is 0',
            'No TypeScript errors'
        ]
    )

    add_feature(conn,
        id='STORE-003',
        title='Add profitableRounds field to Team interface',
        description='Add profitableRounds: number field to Team interface. Initialize as 0.',
        priority=3,
        category='STORE',
        dependencies=['STORE-002'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'Team interface has profitableRounds field',
            'Default value is 0',
            'No TypeScript errors'
        ]
    )

    add_feature(conn,
        id='STORE-004',
        title='Add cupsMade to GameResult interface',
        description='Update GameResult interface to include cupsMade: number field.',
        priority=3,
        category='STORE',
        dependencies=['DATA-003'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'GameResult interface has cupsMade field',
            'No TypeScript errors'
        ]
    )

    add_feature(conn,
        id='STORE-005',
        title='Add spoilageRate to GameResult interface',
        description='Update GameResult interface to include spoilageRate: number field.',
        priority=3,
        category='STORE',
        dependencies=['STORE-004'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'GameResult interface has spoilageRate field',
            'No TypeScript errors'
        ]
    )

    add_feature(conn,
        id='STORE-006',
        title='Add decisionQuality to GameResult interface',
        description='Update GameResult interface to include decisionQuality: DecisionQuality field.',
        priority=3,
        category='STORE',
        dependencies=['STORE-005', 'DATA-003'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'GameResult interface has decisionQuality field',
            'DecisionQuality type imported correctly',
            'No TypeScript errors'
        ]
    )

    add_feature(conn,
        id='STORE-007',
        title='Update simulateBusiness to calculate cupsMade',
        description='''Update simulateBusiness function to calculate and return cupsMade.
cupsMade = production capacity based on budget and quality.
See spec/02_GAME_MECHANICS.md Production Calculation section.''',
        priority=3,
        category='STORE',
        dependencies=['STORE-006'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'cupsMade calculated before cupsSold',
            'cupsSold capped by cupsMade',
            'cupsMade returned in GameResult',
            'No regression in existing simulation'
        ]
    )

    add_feature(conn,
        id='STORE-008',
        title='Update simulateBusiness to calculate spoilageRate',
        description='Update simulateBusiness to calculate spoilageRate = (cupsMade - cupsSold) / cupsMade. Handle division by zero.',
        priority=3,
        category='STORE',
        dependencies=['STORE-007'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'spoilageRate calculated correctly',
            'Returns 0 if cupsMade is 0',
            'spoilageRate returned in GameResult'
        ]
    )

    add_feature(conn,
        id='STORE-009',
        title='Update simulateBusiness to calculate decisionQuality',
        description='''Update simulateBusiness to calculate DecisionQuality object.
Check if price, quality, marketing are in optimal ranges from scenario.
Calculate overallScore as count of optimal decisions (0-3).''',
        priority=3,
        category='STORE',
        dependencies=['STORE-008'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'decisionQuality calculated',
            'All boolean fields set correctly',
            'overallScore is 0-3',
            'decisionQuality returned in GameResult'
        ]
    )

    add_feature(conn,
        id='STORE-010',
        title='Add riskManagementScores state',
        description='Add riskManagementScores: Map<string, RiskManagementInput> to GameState. Initialize as new Map().',
        priority=3,
        category='STORE',
        dependencies=['DATA-005'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'State field added',
            'Typed as Map<string, RiskManagementInput>',
            'Initialized correctly'
        ]
    )

    add_feature(conn,
        id='STORE-011',
        title='Add finalScores state',
        description='Add finalScores: Map<string, MultiFactorScore> to GameState. Initialize as new Map().',
        priority=3,
        category='STORE',
        dependencies=['DATA-002'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'State field added',
            'Typed as Map<string, MultiFactorScore>',
            'Initialized correctly'
        ]
    )

    add_feature(conn,
        id='STORE-012',
        title='Add setRiskManagementScore action',
        description='Add action to set risk management score for a team: setRiskManagementScore(teamId: string, score: RiskManagementInput) => void',
        priority=3,
        category='STORE',
        dependencies=['STORE-010'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'Action added to store',
            'Updates riskManagementScores map',
            'Can be called from components'
        ]
    )

    add_feature(conn,
        id='STORE-013',
        title='Add calculateMultiFactorScores action',
        description='''Add action to calculate final scores for all teams.
Uses scoring functions from src/lib/scoring.ts.
Updates finalScores map with MultiFactorScore for each team.''',
        priority=3,
        category='STORE',
        dependencies=['STORE-011', 'SCORE-008'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'Action added to store',
            'Calculates scores for all teams',
            'Updates finalScores map',
            'Uses scoring library functions'
        ]
    )

    add_feature(conn,
        id='STORE-014',
        title='Add getFinalLeaderboard action',
        description='''Add action to generate final leaderboard sorted by multi-factor score.
Returns LeaderboardEntry[] with ranks, scores, and awards.
See spec/06_LEADERBOARD.md.''',
        priority=3,
        category='STORE',
        dependencies=['STORE-013', 'DATA-007'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'Action added to store',
            'Returns LeaderboardEntry array',
            'Sorted by total score descending',
            'Includes category awards'
        ]
    )

    add_feature(conn,
        id='STORE-015',
        title='Update team state after round with new fields',
        description='''Update runSimulation to populate team fields after each round:
- Add to roundHistory
- Update totalCupsMade
- Update profitableRounds if profit > 0
See spec/04_DATA_MODEL.md.''',
        priority=3,
        category='STORE',
        dependencies=['STORE-001', 'STORE-002', 'STORE-003', 'STORE-009'],
        files=['src/store/game-store.ts'],
        acceptance_criteria=[
            'roundHistory populated with RoundResult',
            'totalCupsMade incremented',
            'profitableRounds incremented when profit > 0',
            'No regression in existing functionality'
        ]
    )

    # ============== UI SCORING FEATURES ==============

    add_feature(conn,
        id='UI-001',
        title='Create scoring components directory',
        description='Create src/components/scoring/ directory for multi-factor scoring UI components.',
        priority=4,
        category='UI_SCORING',
        dependencies=['STORE-015'],
        files=['src/components/scoring/.gitkeep'],
        acceptance_criteria=[
            'Directory exists',
            'Can create files in directory'
        ]
    )

    add_feature(conn,
        id='UI-002',
        title='Create ScoreCategory component',
        description='''Create ScoreCategory component for displaying a single score category with progress bar.
Props: label, points, maxPoints, detail
See spec/03_UI_COMPONENTS.md.''',
        priority=4,
        category='UI_SCORING',
        dependencies=['UI-001'],
        files=['src/components/scoring/ScoreCategory.tsx'],
        acceptance_criteria=[
            'Component renders label and points',
            'Progress bar shows percentage',
            'Detail text displayed',
            'Uses Tailwind CSS',
            'Follows existing component patterns'
        ]
    )

    add_feature(conn,
        id='UI-003',
        title='Create ScoreBreakdown component',
        description='''Create ScoreBreakdown component showing full multi-factor score breakdown.
Uses ScoreCategory for each scoring component.
See spec/03_UI_COMPONENTS.md Section 1.''',
        priority=4,
        category='UI_SCORING',
        dependencies=['UI-002', 'DATA-002'],
        files=['src/components/scoring/ScoreBreakdown.tsx'],
        acceptance_criteria=[
            'Shows total score prominently',
            'Shows all 4 categories',
            'Uses ScoreCategory component',
            'Responsive design',
            'Matches existing card styling'
        ]
    )

    add_feature(conn,
        id='UI-004',
        title='Create EfficiencyIndicator component',
        description='''Create EfficiencyIndicator component showing spoilage rate.
Shows cups made, cups sold, unsold, and efficiency points.
See spec/03_UI_COMPONENTS.md Section 2.''',
        priority=4,
        category='UI_SCORING',
        dependencies=['UI-001'],
        files=['src/components/scoring/EfficiencyIndicator.tsx'],
        acceptance_criteria=[
            'Shows spoilage rate percentage',
            'Shows cups made/sold/unsold',
            'Color-coded by efficiency level',
            'Uses existing UI patterns'
        ]
    )

    add_feature(conn,
        id='UI-005',
        title='Create RoundHistoryTracker component',
        description='''Create RoundHistoryTracker component showing round-by-round performance.
Table with round, profit, cups, spoilage, status columns.
See spec/03_UI_COMPONENTS.md Section 3.''',
        priority=4,
        category='UI_SCORING',
        dependencies=['UI-001', 'DATA-004'],
        files=['src/components/scoring/RoundHistoryTracker.tsx'],
        acceptance_criteria=[
            'Shows history in table format',
            'Profit colored green/red',
            'Status shows profitable/loss',
            'Shows summary stats',
            'Responsive design'
        ]
    )

    add_feature(conn,
        id='UI-006',
        title='Create CategoryAwards component',
        description='''Create CategoryAwards component displaying category winners.
Shows Best Profit, Most Consistent, Most Efficient.
See spec/03_UI_COMPONENTS.md Section 4.''',
        priority=4,
        category='UI_SCORING',
        dependencies=['UI-001', 'DATA-006'],
        files=['src/components/scoring/CategoryAwards.tsx'],
        acceptance_criteria=[
            'Shows 3 award cards',
            'Each card has icon, winner, value',
            'Styled consistently with app',
            'Handles ties gracefully'
        ]
    )

    add_feature(conn,
        id='UI-007',
        title='Create scoring components index',
        description='Create src/components/scoring/index.ts to export all scoring components.',
        priority=4,
        category='UI_SCORING',
        dependencies=['UI-003', 'UI-004', 'UI-005', 'UI-006'],
        files=['src/components/scoring/index.ts'],
        acceptance_criteria=[
            'All components exported',
            'Clean barrel export pattern'
        ]
    )

    add_feature(conn,
        id='UI-008',
        title='Update ResultsDisplay with ScoreBreakdown',
        description='''Update ResultsDisplay.tsx to show ScoreBreakdown after simulation results.
Only show in multi-team mode.
See spec/03_UI_COMPONENTS.md Integration section.''',
        priority=4,
        category='UI_SCORING',
        dependencies=['UI-007', 'STORE-015'],
        files=['src/components/ResultsDisplay.tsx'],
        acceptance_criteria=[
            'ScoreBreakdown shows in multi-team mode',
            'Positioned below existing results',
            'Only shows after simulation completes',
            'No regression in existing display'
        ]
    )

    # ============== UI FACILITATOR FEATURES ==============

    add_feature(conn,
        id='FAC-001',
        title='Create facilitator components directory',
        description='Create src/components/facilitator/ directory for facilitator UI components.',
        priority=5,
        category='UI_FACILITATOR',
        dependencies=['UI-008'],
        files=['src/components/facilitator/.gitkeep'],
        acceptance_criteria=[
            'Directory exists',
            'Can create files in directory'
        ]
    )

    add_feature(conn,
        id='FAC-002',
        title='Create RiskAssessmentForm component',
        description='''Create form for entering risk management scores.
Fields for productionAdjustment, pricingStrategy, budgetReserves (0-5 each).
See spec/03_UI_COMPONENTS.md Section 5.''',
        priority=5,
        category='UI_FACILITATOR',
        dependencies=['FAC-001', 'DATA-005'],
        files=['src/components/facilitator/RiskAssessmentForm.tsx'],
        acceptance_criteria=[
            '3 slider/number inputs',
            'Shows total (0-15)',
            'Validation for bounds',
            'Notes field optional',
            'Save button'
        ]
    )

    add_feature(conn,
        id='FAC-003',
        title='Create FacilitatorScoreInput component',
        description='''Create main facilitator scoring interface.
Team selector dropdown, uses RiskAssessmentForm.
See spec/03_UI_COMPONENTS.md Section 5.''',
        priority=5,
        category='UI_FACILITATOR',
        dependencies=['FAC-002', 'STORE-012'],
        files=['src/components/facilitator/FacilitatorScoreInput.tsx'],
        acceptance_criteria=[
            'Team dropdown selector',
            'Shows RiskAssessmentForm',
            'Save calls setRiskManagementScore',
            'Shows confirmation on save'
        ]
    )

    add_feature(conn,
        id='FAC-004',
        title='Create facilitator components index',
        description='Create src/components/facilitator/index.ts to export all facilitator components.',
        priority=5,
        category='UI_FACILITATOR',
        dependencies=['FAC-003'],
        files=['src/components/facilitator/index.ts'],
        acceptance_criteria=[
            'All components exported',
            'Clean barrel export pattern'
        ]
    )

    add_feature(conn,
        id='FAC-005',
        title='Add facilitator mode to app',
        description='''Add a facilitator mode toggle or route.
When in facilitator mode, show FacilitatorScoreInput.
Could be a button on the leaderboard or separate route.''',
        priority=5,
        category='UI_FACILITATOR',
        dependencies=['FAC-004'],
        files=['src/components/Leaderboard.tsx', 'src/App.tsx'],
        acceptance_criteria=[
            'Facilitator mode accessible',
            'Toggle or route works',
            'Shows FacilitatorScoreInput',
            'Only visible to facilitators (or all users for simplicity)'
        ]
    )

    # ============== LEADERBOARD FEATURES ==============

    add_feature(conn,
        id='LEAD-001',
        title='Update Leaderboard to show multi-factor columns',
        description='''Update Leaderboard.tsx to show multi-factor score columns:
Total, Profit Rank, Consistency, Efficiency, Risk.
See spec/06_LEADERBOARD.md Display Specifications.''',
        priority=5,
        category='LEADERBOARD',
        dependencies=['STORE-014', 'UI-007'],
        files=['src/components/Leaderboard.tsx'],
        acceptance_criteria=[
            'Shows total score column',
            'Shows all 4 component columns',
            'Sorted by total score',
            'Subtext shows details (rank, ratio, %)',
            'Responsive design'
        ]
    )

    add_feature(conn,
        id='LEAD-002',
        title='Add score breakdown modal to Leaderboard',
        description='''Add modal that shows when clicking a team row.
Uses ScoreBreakdown component.
See spec/06_LEADERBOARD.md Score Breakdown Modal.''',
        priority=5,
        category='LEADERBOARD',
        dependencies=['LEAD-001', 'UI-003'],
        files=['src/components/Leaderboard.tsx'],
        acceptance_criteria=[
            'Click team row opens modal',
            'Modal shows ScoreBreakdown',
            'Modal can be closed',
            'Responsive design'
        ]
    )

    add_feature(conn,
        id='LEAD-003',
        title='Add CategoryAwards to Leaderboard',
        description='''Add CategoryAwards component to Leaderboard display.
Shows after the team list.
See spec/06_LEADERBOARD.md Category Awards Display.''',
        priority=5,
        category='LEADERBOARD',
        dependencies=['LEAD-001', 'UI-006'],
        files=['src/components/Leaderboard.tsx'],
        acceptance_criteria=[
            'CategoryAwards shown below team list',
            'Shows 3 awards',
            'Styled consistently'
        ]
    )

    add_feature(conn,
        id='LEAD-004',
        title='Add export functionality to Leaderboard',
        description='''Add button to export leaderboard to CSV.
Includes all scoring columns.
See spec/06_LEADERBOARD.md Export Functionality.''',
        priority=5,
        category='LEADERBOARD',
        dependencies=['LEAD-001'],
        files=['src/components/Leaderboard.tsx'],
        acceptance_criteria=[
            'Export button visible',
            'Generates valid CSV',
            'Includes all columns',
            'Downloads correctly'
        ]
    )

    # ============== TESTING FEATURES ==============

    add_feature(conn,
        id='TEST-001',
        title='Test scoring calculations manually',
        description='''Manually test all scoring functions with known inputs.
Verify:
- getProfitRankingPoints returns correct values
- getConsistencyPoints calculates correctly
- getEfficiencyPoints boundaries are correct
- calculateMultiFactorScore totals correctly
Create test cases in console or simple test file.''',
        priority=6,
        category='TESTING',
        dependencies=['SCORE-010'],
        files=['src/lib/scoring.test.ts'],
        acceptance_criteria=[
            'All scoring functions return expected values',
            'Edge cases handled (0 values, max values)',
            'Test cases documented'
        ]
    )

    add_feature(conn,
        id='TEST-002',
        title='Test store actions integration',
        description='''Test that store actions work correctly:
- setRiskManagementScore updates state
- calculateMultiFactorScores produces valid scores
- getFinalLeaderboard returns sorted entries
Test in browser dev tools or simple integration test.''',
        priority=6,
        category='TESTING',
        dependencies=['STORE-014'],
        files=[],
        acceptance_criteria=[
            'Actions callable from components',
            'State updates correctly',
            'No errors in console'
        ]
    )

    add_feature(conn,
        id='TEST-003',
        title='Visual regression testing',
        description='''Verify all UI components display correctly:
- ScoreBreakdown shows all categories
- Leaderboard shows multi-factor columns
- CategoryAwards displays properly
- Facilitator input works
Test by playing through the game.''',
        priority=6,
        category='TESTING',
        dependencies=['LEAD-003', 'FAC-005'],
        files=[],
        acceptance_criteria=[
            'All components render without errors',
            'Styling consistent with app',
            'Responsive on mobile',
            'No console errors'
        ]
    )

    add_feature(conn,
        id='TEST-004',
        title='End-to-end game flow test',
        description='''Test complete game flow:
1. Create room and teams
2. Play 5 rounds per team
3. Enter risk management scores
4. View final leaderboard
5. Verify scores calculated correctly
6. Export results''',
        priority=6,
        category='TESTING',
        dependencies=['TEST-003'],
        files=[],
        acceptance_criteria=[
            'Full game flow works',
            'Scores match manual calculations',
            'Export includes all data',
            'No errors during flow'
        ]
    )

    # Commit all features
    conn.commit()

    # Print summary
    cursor = conn.execute("SELECT COUNT(*) as count FROM features")
    total = cursor.fetchone()[0]

    cursor = conn.execute("""
        SELECT category, COUNT(*) as count
        FROM features
        GROUP BY category
        ORDER BY
            CASE category
                WHEN 'DATA_MODEL' THEN 1
                WHEN 'SCORING' THEN 2
                WHEN 'STORE' THEN 3
                WHEN 'UI_SCORING' THEN 4
                WHEN 'UI_FACILITATOR' THEN 5
                WHEN 'LEADERBOARD' THEN 6
                WHEN 'TESTING' THEN 7
            END
    """)
    categories = cursor.fetchall()

    conn.close()

    print(f"\n{'='*50}")
    print(f"  FEATURE DATABASE SEEDED")
    print(f"{'='*50}")
    print(f"\n  Total Features: {total}\n")
    print(f"  By Category:")
    for cat, count in categories:
        print(f"    {cat}: {count}")
    print(f"\n{'='*50}")
    print(f"\n  Run './run_autonomous.sh' to start coding!\n")

if __name__ == "__main__":
    seed_features()
