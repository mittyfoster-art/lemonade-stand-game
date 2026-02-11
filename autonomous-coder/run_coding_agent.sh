#!/bin/bash
# Run a Coding Agent
# This agent implements features from the feature list

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Generate unique agent ID
AGENT_ID="agent-$(date +%s)"

echo "=========================================="
echo "  LEMONADE GAME - CODING AGENT"
echo "=========================================="
echo ""
echo "Agent ID: $AGENT_ID"
echo "Project: $PROJECT_DIR"
echo ""

# Check current stats
echo "Current Progress:"
python3 "$SCRIPT_DIR/features_mcp.py" stats
echo ""

# Check if there are pending features
PENDING=$(python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR')
from features_mcp import get_next_feature
f = get_next_feature()
print('yes' if f else 'no')
")

if [ "$PENDING" = "no" ]; then
    echo "No pending features! All done."
    exit 0
fi

# Get the next feature details
FEATURE_JSON=$(python3 -c "
import sys
import json
sys.path.insert(0, '$SCRIPT_DIR')
from features_mcp import get_next_feature
f = get_next_feature()
if f:
    print(json.dumps(f, indent=2))
")

FEATURE_ID=$(echo "$FEATURE_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
FEATURE_TITLE=$(echo "$FEATURE_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)['title'])")
FEATURE_DESC=$(echo "$FEATURE_JSON" | python3 -c "import sys, json; print(json.load(sys.stdin)['description'])")
FEATURE_FILES=$(echo "$FEATURE_JSON" | python3 -c "import sys, json; print(', '.join(json.load(sys.stdin).get('files', [])))")
FEATURE_CRITERIA=$(echo "$FEATURE_JSON" | python3 -c "import sys, json; print('\\n'.join('- ' + c for c in json.load(sys.stdin).get('acceptance_criteria', [])))")

echo "Next Feature: $FEATURE_ID - $FEATURE_TITLE"
echo "Files: $FEATURE_FILES"
echo ""

# Mark feature as in_progress
python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR')
from features_mcp import update_feature_status
update_feature_status('$FEATURE_ID', 'in_progress', 'Started by $AGENT_ID')
"

echo "Starting Coding Agent $AGENT_ID..."
echo ""

# Build the prompt - keep it concise for the positional argument
PROMPT="Implement feature $FEATURE_ID: $FEATURE_TITLE

Description: $FEATURE_DESC

Files to create/modify: $FEATURE_FILES

Acceptance Criteria:
$FEATURE_CRITERIA

Instructions:
1. Read spec/01_SCORING_SYSTEM.md and spec/04_DATA_MODEL.md for reference
2. Create the file(s) listed above
3. Use TypeScript with explicit types
4. Add JSDoc comments to exported functions
5. Follow existing code patterns in the project

Implement this feature now."

# Run Claude Code with the prompt (allows tool execution)
# --dangerously-skip-permissions allows autonomous file writing
cd "$PROJECT_DIR"
echo "$PROMPT" | claude --dangerously-skip-permissions

# Mark feature as completed
python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR')
from features_mcp import update_feature_status
update_feature_status('$FEATURE_ID', 'completed', 'Completed by $AGENT_ID')
"

echo ""
echo "=========================================="
echo "  Feature $FEATURE_ID completed!"
echo "=========================================="
echo ""
echo "Updated Progress:"
python3 "$SCRIPT_DIR/features_mcp.py" stats
