#!/bin/bash
# Run the Initializer Agent
# This agent reads the APP_SPEC.md and creates the feature list

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  LEMONADE GAME - INITIALIZER AGENT"
echo "=========================================="
echo ""
echo "Project: $PROJECT_DIR"
echo ""

# Initialize the database
cd "$SCRIPT_DIR"
python3 features_mcp.py stats 2>/dev/null || python3 -c "
import sqlite3
from pathlib import Path

schema_path = Path('features_schema.sql')
db_path = Path('features.db')

with open(schema_path) as f:
    schema = f.read()

conn = sqlite3.connect(str(db_path))
conn.executescript(schema)
conn.commit()
conn.close()
print('Database initialized.')
"

echo ""
echo "Starting Initializer Agent..."
echo "This will analyze the spec and create the feature list."
echo ""

# Run Claude Code with the initializer prompt
cd "$PROJECT_DIR"
claude --prompt "$(cat "$SCRIPT_DIR/INITIALIZER_PROMPT.md")

Read the APP_SPEC.md file at: $SCRIPT_DIR/APP_SPEC.md
Read all specification documents in: $PROJECT_DIR/spec/

After reading and analyzing, create features in the database by outputting Python code that I'll execute.
For each feature, output a call like:
add_feature(id='DATA-001', title='...', description='...', priority=1, category='DATA_MODEL', dependencies=[], files=['...'], acceptance_criteria=['...'])

Start with DATA_MODEL features, then SCORING, then STORE, then UI_SCORING, then UI_FACILITATOR, then LEADERBOARD, then TESTING.

IMPORTANT: Be thorough. Create 40-60 features total. Each feature should be atomic and testable."

echo ""
echo "Initializer complete. Check feature stats:"
python3 "$SCRIPT_DIR/features_mcp.py" stats
python3 "$SCRIPT_DIR/features_mcp.py" category-stats
