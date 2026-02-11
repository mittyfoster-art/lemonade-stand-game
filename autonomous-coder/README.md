# Autonomous Coder for Lemonade Stand Game

An autonomous long-running agent harness for implementing the Multi-Factor Scoring Model.

Based on [Anthropic's Long-Running Agent Harness](https://www.anthropic.com/research/swe-bench-sonnet) methodology.

## How It Works

```
┌─────────────────────────────────────────────────────────────────────┐
│                    AUTONOMOUS CODER WORKFLOW                        │
│                                                                     │
│  ┌──────────────┐                                                   │
│  │  APP_SPEC.md │ ──────┐                                          │
│  └──────────────┘       │                                          │
│                         ▼                                          │
│                 ┌───────────────────┐                              │
│                 │ INITIALIZER AGENT │                              │
│                 │   - Reads spec    │                              │
│                 │   - Creates 45+   │                              │
│                 │     features      │                              │
│                 └─────────┬─────────┘                              │
│                           │                                         │
│                           ▼                                         │
│                 ┌───────────────────┐                              │
│                 │  FEATURE DATABASE │                              │
│                 │    (SQLite)       │                              │
│                 └─────────┬─────────┘                              │
│                           │                                         │
│           ┌───────────────┼───────────────┐                        │
│           ▼               ▼               ▼                        │
│   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐              │
│   │ CODING AGENT │ │ CODING AGENT │ │ CODING AGENT │  ...         │
│   │     #1       │ │     #2       │ │     #3       │              │
│   └──────────────┘ └──────────────┘ └──────────────┘              │
│                                                                     │
│   Each agent:                                                       │
│   1. Gets next pending feature                                      │
│   2. Gets 3 completed features for regression testing               │
│   3. Tests regression features                                      │
│   4. Implements new feature                                         │
│   5. Tests implementation                                           │
│   6. Updates feature status                                         │
│   7. Exits when context fills → Next agent spawns                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

1. Claude Code CLI installed and authenticated
2. Python 3.8+
3. The Lemonade Stand Game project

### Run the Autonomous Coder

```bash
cd "10_Lemonade_Stand_Game/Lemonade Stand Business Simulation/autonomous-coder"

# Option 1: Run everything automatically
./run_autonomous.sh

# Option 2: Run step by step
./run_initializer.sh    # First, create the feature list
./run_coding_agent.sh   # Then, run coding agents one at a time
```

## File Structure

```
autonomous-coder/
├── README.md                  # This file
├── APP_SPEC.md               # Project specification
├── INITIALIZER_PROMPT.md     # Prompt for initializer agent
├── CODING_AGENT_PROMPT.md    # Prompt for coding agents
├── features_schema.sql       # SQLite database schema
├── features_mcp.py           # Feature management tools
├── features.db               # SQLite database (created on first run)
├── run_initializer.sh        # Run initializer agent
├── run_coding_agent.sh       # Run single coding agent
└── run_autonomous.sh         # Run full autonomous loop
```

## Feature Database

Features are tracked in a SQLite database with these fields:

| Field | Description |
|-------|-------------|
| id | Unique identifier (e.g., DATA-001) |
| title | Short feature title |
| description | Detailed implementation instructions |
| priority | 1 (highest) to 5 (lowest) |
| category | DATA_MODEL, SCORING, STORE, UI_*, etc. |
| dependencies | Features that must be done first |
| files | Files to create/modify |
| acceptance_criteria | Conditions for completion |
| status | pending, in_progress, completed, failed, blocked |

### Check Progress

```bash
# View overall stats
python3 features_mcp.py stats

# View stats by category
python3 features_mcp.py category-stats

# List all features
python3 features_mcp.py list

# List features by status
python3 features_mcp.py list pending
python3 features_mcp.py list completed

# View blocked features
python3 features_mcp.py blocked
```

## Categories

Features are organized into categories implemented in order:

1. **DATA_MODEL** - TypeScript interfaces and types
2. **SCORING** - Calculation functions
3. **STORE** - Zustand store actions
4. **UI_SCORING** - Score display components
5. **UI_FACILITATOR** - Facilitator tools
6. **LEADERBOARD** - Leaderboard updates
7. **TESTING** - Test cases and validation

## Customization

### Add a New Feature

```python
from features_mcp import add_feature

add_feature(
    id='CUSTOM-001',
    title='My Custom Feature',
    description='Detailed description of what to implement...',
    priority=3,
    category='UI_SCORING',
    dependencies=['DATA-001', 'SCORE-001'],
    files=['src/components/MyComponent.tsx'],
    acceptance_criteria=[
        'Component renders without errors',
        'Props are typed correctly',
        'Styling matches existing components'
    ]
)
```

### Modify Agent Behavior

Edit the prompt files:
- `INITIALIZER_PROMPT.md` - How features are created
- `CODING_AGENT_PROMPT.md` - How features are implemented

## Tips

1. **Let it run overnight** - Complex projects take time
2. **Check progress periodically** - Use `python3 features_mcp.py stats`
3. **Review completed features** - Agents may miss edge cases
4. **Add features manually** - If something's missing, add it
5. **Reset if needed** - Delete `features.db` to start over

## Troubleshooting

### "No features available"
All dependencies aren't met. Check blocked features:
```bash
python3 features_mcp.py blocked
```

### Agent keeps failing
Check the feature it's stuck on:
```bash
python3 features_mcp.py list in_progress
```

### Want to start over
```bash
rm features.db
./run_initializer.sh
```

## Reference

- [Anthropic Long-Running Agent Harness](https://www.anthropic.com/research/swe-bench-sonnet)
- `/spec/` folder for detailed specifications
- `APP_SPEC.md` for project overview
