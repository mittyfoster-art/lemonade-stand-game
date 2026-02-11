#!/bin/bash
# Start the Autonomous Coder UI

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$SCRIPT_DIR/ui"

echo "=========================================="
echo "  AUTONOMOUS CODER UI"
echo "=========================================="
echo ""

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

# Create virtual environment if needed
if [ ! -d "$UI_DIR/venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$UI_DIR/venv"
fi

# Activate virtual environment
source "$UI_DIR/venv/bin/activate"

# Install dependencies
echo "Installing dependencies..."
pip install -q -r "$UI_DIR/requirements.txt"

# Initialize database if needed
cd "$SCRIPT_DIR"
if [ ! -f "features.db" ]; then
    echo "Initializing feature database..."
    python3 seed_features.py
fi

echo ""
echo "Starting UI server..."
echo ""
echo "  Open in browser: http://localhost:5050"
echo ""
echo "  Press Ctrl+C to stop"
echo ""

# Start the server
python3 "$UI_DIR/server.py"
