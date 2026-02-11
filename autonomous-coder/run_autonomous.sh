#!/bin/bash
# Run the Autonomous Coder in a loop
# Continuously spawns coding agents until all features are complete

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "  LEMONADE GAME - AUTONOMOUS CODER"
echo "=========================================="
echo ""
echo "This will run coding agents in a loop until all features are complete."
echo "Press Ctrl+C to stop at any time."
echo ""

# Check if features exist
TOTAL=$(python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR')
from features_mcp import get_stats
stats = get_stats()
print(stats.get('total', 0))
" 2>/dev/null || echo "0")

if [ "$TOTAL" = "0" ]; then
    echo "No features found. Running seed script first..."
    python3 "$SCRIPT_DIR/seed_features.py"
    echo ""
fi

# Main loop
AGENT_COUNT=0
MAX_AGENTS=100  # Safety limit

while true; do
    AGENT_COUNT=$((AGENT_COUNT + 1))

    if [ $AGENT_COUNT -gt $MAX_AGENTS ]; then
        echo "Reached maximum agent limit ($MAX_AGENTS). Stopping."
        break
    fi

    echo ""
    echo "=========================================="
    echo "  SPAWNING CODING AGENT #$AGENT_COUNT"
    echo "=========================================="

    # Check current progress
    STATS=$(python3 "$SCRIPT_DIR/features_mcp.py" stats)
    echo "$STATS"
    echo ""

    # Check if all features are complete
    PENDING=$(python3 -c "
import sys
sys.path.insert(0, '$SCRIPT_DIR')
from features_mcp import get_stats
stats = get_stats()
print(stats.get('pending', 0) + stats.get('in_progress', 0))
")

    if [ "$PENDING" = "0" ]; then
        echo ""
        echo "=========================================="
        echo "  ALL FEATURES COMPLETE!"
        echo "=========================================="
        echo ""
        echo "Total agents spawned: $AGENT_COUNT"
        echo ""
        python3 "$SCRIPT_DIR/features_mcp.py" category-stats
        break
    fi

    # Run coding agent
    bash "$SCRIPT_DIR/run_coding_agent.sh" || {
        echo "Agent encountered an issue. Waiting 5 seconds before retry..."
        sleep 5
    }

    # Small delay between agents
    sleep 2
done

echo ""
echo "Autonomous coding session complete."
