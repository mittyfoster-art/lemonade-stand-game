#!/usr/bin/env python3
"""
Features MCP Server v2.0
Provides tools for managing the feature tracking database.
Used by the autonomous coding agents to coordinate feature implementation
for the Lemonade Stand Business Simulation v2.0.
"""

import sqlite3
import json
import random
import time
from datetime import datetime
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / "features.db"

# Stale threshold: features stuck in_progress for more than 30 minutes
STALE_THRESHOLD_SECONDS = 30 * 60


def get_db():
    """Get database connection with row factory."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database with schema."""
    schema_path = Path(__file__).parent / "features_schema.sql"
    with open(schema_path) as f:
        schema = f.read()

    conn = get_db()
    conn.executescript(schema)
    conn.commit()
    conn.close()


# ============== MCP Tool Functions ==============

def get_stats():
    """
    Get current feature statistics.
    Returns counts of features by status and overall progress percentage.
    """
    conn = get_db()
    cursor = conn.execute("SELECT * FROM feature_stats")
    row = cursor.fetchone()
    conn.close()

    if row:
        total = row["total"] or 0
        completed = row["completed"] or 0
        return {
            "total": total,
            "pending": row["pending"] or 0,
            "in_progress": row["in_progress"] or 0,
            "completed": completed,
            "failed": row["failed"] or 0,
            "blocked": row["blocked"] or 0,
            "percent_complete": round(100 * completed / total, 1) if total > 0 else 0
        }
    return {"total": 0, "pending": 0, "in_progress": 0, "completed": 0, "failed": 0, "blocked": 0, "percent_complete": 0}


def get_category_stats():
    """
    Get feature statistics by category.
    Shows progress for each implementation category.
    """
    conn = get_db()
    cursor = conn.execute("SELECT * FROM category_stats")
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def _reset_stale_features(conn):
    """
    Reset features stuck in in_progress state for longer than STALE_THRESHOLD_SECONDS.
    Returns the number of features reset.
    """
    now = int(datetime.now().timestamp())
    threshold = now - STALE_THRESHOLD_SECONDS

    cursor = conn.execute("""
        SELECT id, title FROM features
        WHERE status = 'in_progress'
        AND updated_at < ?
    """, (threshold,))
    stale = cursor.fetchall()

    if stale:
        for row in stale:
            conn.execute("""
                UPDATE features
                SET status = 'pending',
                    updated_at = ?,
                    notes = notes || ?
                WHERE id = ?
            """, (
                now,
                f"\n[{datetime.now().isoformat()}] [STALE] Auto-reset from in_progress after {STALE_THRESHOLD_SECONDS // 60}min timeout",
                row["id"]
            ))
        conn.commit()

    return len(stale)


def get_next_feature():
    """
    Get the next feature to implement.
    Returns the highest priority pending feature whose dependencies are met.
    Skips features where retry_count >= max_retries.
    Also detects and resets stale in_progress features.
    """
    conn = get_db()

    # First, reset any stale features
    stale_count = _reset_stale_features(conn)
    if stale_count > 0:
        print(f"[INFO] Reset {stale_count} stale in_progress feature(s)")

    # Get all completed feature IDs
    cursor = conn.execute("SELECT id FROM features WHERE status = 'completed'")
    completed_ids = set(row["id"] for row in cursor.fetchall())

    # Get pending features ordered by priority, skipping exhausted retries
    cursor = conn.execute("""
        SELECT * FROM features
        WHERE status = 'pending'
        AND retry_count < max_retries
        ORDER BY priority ASC, created_at ASC
    """)

    for row in cursor.fetchall():
        dependencies = json.loads(row["dependencies"])
        # Check if all dependencies are completed
        if all(dep in completed_ids for dep in dependencies):
            conn.close()
            return {
                "id": row["id"],
                "title": row["title"],
                "description": row["description"],
                "priority": row["priority"],
                "category": row["category"],
                "dependencies": dependencies,
                "files": json.loads(row["files"]),
                "acceptance_criteria": json.loads(row["acceptance_criteria"]),
                "status": row["status"],
                "notes": row["notes"],
                "retry_count": row["retry_count"],
                "max_retries": row["max_retries"]
            }

    conn.close()
    return None  # No features available


def get_regression_features(count: int = 3):
    """
    Get random completed features for regression testing.
    Returns up to `count` random completed features.
    """
    conn = get_db()
    cursor = conn.execute("""
        SELECT * FROM features
        WHERE status = 'completed'
        ORDER BY RANDOM()
        LIMIT ?
    """, (count,))

    rows = cursor.fetchall()
    conn.close()

    return [{
        "id": row["id"],
        "title": row["title"],
        "description": row["description"],
        "files": json.loads(row["files"]),
        "acceptance_criteria": json.loads(row["acceptance_criteria"]),
        "regression_count": row["regression_count"],
        "last_regression_result": row["last_regression_result"]
    } for row in rows]


def add_feature(
    id: str,
    title: str,
    description: str,
    priority: int = 3,
    category: str = "GENERAL",
    dependencies: list = None,
    files: list = None,
    acceptance_criteria: list = None,
    test_command: str = ""
):
    """
    Add a new feature to the database.
    """
    conn = get_db()
    conn.execute("""
        INSERT INTO features (id, title, description, priority, category, dependencies, files, acceptance_criteria, test_command)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        id,
        title,
        description,
        priority,
        category,
        json.dumps(dependencies or []),
        json.dumps(files or []),
        json.dumps(acceptance_criteria or []),
        test_command
    ))
    conn.commit()
    conn.close()
    return {"success": True, "id": id}


def update_feature_status(
    id: str,
    status: str,
    notes: str = "",
    implemented_by: str = "",
    error_log: str = ""
):
    """
    Update a feature's status.
    Status can be: pending, in_progress, completed, failed, blocked

    On failure:
    - Increments retry_count
    - Appends to error_log
    - If retry_count reaches max_retries, adds a note about exhausted retries
    """
    valid_statuses = ["pending", "in_progress", "completed", "failed", "blocked"]
    if status not in valid_statuses:
        return {"success": False, "error": f"Invalid status. Must be one of: {valid_statuses}"}

    conn = get_db()
    now = int(datetime.now().timestamp())
    timestamp_str = datetime.now().isoformat()

    updates = ["status = ?", "updated_at = ?"]
    params = [status, now]

    # Build combined notes string (avoid duplicate SET clauses for same column)
    combined_notes = ""
    if notes:
        combined_notes += f"\n[{timestamp_str}] {notes}"

    # Handle failure: increment retry_count and append error_log
    if status == "failed":
        updates.append("retry_count = retry_count + 1")
        if error_log:
            updates.append("error_log = error_log || ?")
            params.append(f"\n[{timestamp_str}] {error_log}")

        # Check if this failure exhausts retries
        cursor = conn.execute("SELECT retry_count, max_retries FROM features WHERE id = ?", (id,))
        row = cursor.fetchone()
        if row and (row["retry_count"] + 1) >= row["max_retries"]:
            combined_notes += f"\n[{timestamp_str}] [MAX_RETRIES] Feature has reached maximum retry limit ({row['max_retries']}). Skipping in future runs."

    # Append all accumulated notes in a single SET clause
    if combined_notes:
        updates.append("notes = notes || ?")
        params.append(combined_notes)

    # Handle completion: record implementer and timestamp
    if status == "completed" and implemented_by:
        updates.append("implemented_by = ?")
        params.append(implemented_by)
        updates.append("implemented_at = ?")
        params.append(now)

    params.append(id)

    conn.execute(f"""
        UPDATE features
        SET {", ".join(updates)}
        WHERE id = ?
    """, params)
    conn.commit()
    conn.close()

    return {"success": True, "id": id, "status": status}


def mark_regression_tested(id: str, result: str = "pass"):
    """
    Mark a feature as regression tested with a pass/fail result.
    Increments the regression count and updates timestamp.

    If result is 'fail', the feature is set back to in_progress so it can be fixed.
    """
    valid_results = ["pass", "fail"]
    if result not in valid_results:
        return {"success": False, "error": f"Invalid result. Must be one of: {valid_results}"}

    conn = get_db()
    now = int(datetime.now().timestamp())
    timestamp_str = datetime.now().isoformat()

    if result == "pass":
        conn.execute("""
            UPDATE features
            SET regression_count = regression_count + 1,
                last_regression_at = ?,
                last_regression_result = 'pass',
                updated_at = ?
            WHERE id = ?
        """, (now, now, id))
    else:
        # Regression failure: set back to in_progress for fixing
        conn.execute("""
            UPDATE features
            SET regression_count = regression_count + 1,
                last_regression_at = ?,
                last_regression_result = 'fail',
                status = 'in_progress',
                updated_at = ?,
                notes = notes || ?
            WHERE id = ?
        """, (
            now, now,
            f"\n[{timestamp_str}] [REGRESSION] Failed regression test - set back to in_progress for fixing",
            id
        ))

    conn.commit()
    conn.close()
    return {"success": True, "id": id, "result": result}


def get_feature(id: str):
    """
    Get a specific feature by ID.
    """
    conn = get_db()
    cursor = conn.execute("SELECT * FROM features WHERE id = ?", (id,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "id": row["id"],
            "title": row["title"],
            "description": row["description"],
            "priority": row["priority"],
            "category": row["category"],
            "dependencies": json.loads(row["dependencies"]),
            "files": json.loads(row["files"]),
            "acceptance_criteria": json.loads(row["acceptance_criteria"]),
            "status": row["status"],
            "notes": row["notes"],
            "implemented_by": row["implemented_by"],
            "implemented_at": row["implemented_at"],
            "regression_count": row["regression_count"],
            "last_regression_result": row["last_regression_result"],
            "retry_count": row["retry_count"],
            "max_retries": row["max_retries"],
            "error_log": row["error_log"],
            "test_command": row["test_command"]
        }
    return None


def list_features(status: str = None, category: str = None):
    """
    List features with optional filtering.
    """
    conn = get_db()

    query = "SELECT id, title, status, priority, category, retry_count FROM features WHERE 1=1"
    params = []

    if status:
        query += " AND status = ?"
        params.append(status)
    if category:
        query += " AND category = ?"
        params.append(category)

    query += " ORDER BY priority ASC, created_at ASC"

    cursor = conn.execute(query, params)
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def get_blocked_features():
    """
    Get features that are blocked and why.
    Shows which dependencies are missing.
    """
    conn = get_db()

    # Get completed IDs
    cursor = conn.execute("SELECT id FROM features WHERE status = 'completed'")
    completed_ids = set(row["id"] for row in cursor.fetchall())

    # Get pending features with unmet dependencies
    cursor = conn.execute("SELECT * FROM features WHERE status = 'pending'")
    blocked = []

    for row in cursor.fetchall():
        dependencies = json.loads(row["dependencies"])
        missing = [dep for dep in dependencies if dep not in completed_ids]
        if missing:
            blocked.append({
                "id": row["id"],
                "title": row["title"],
                "missing_dependencies": missing
            })

    conn.close()
    return blocked


def reset_db():
    """
    Reset the database by deleting the existing DB file and re-initializing from schema.
    WARNING: This destroys all existing data.
    """
    import os
    if DB_PATH.exists():
        os.remove(str(DB_PATH))
    init_db()
    return {"success": True, "message": "Database reset and re-initialized from schema"}


def log_agent_activity(agent_id: str, action: str, feature_id: str = None, details: str = ""):
    """
    Log an agent activity to the agent_log table.
    Useful for tracking what agents do over time.
    """
    conn = get_db()
    conn.execute("""
        INSERT INTO agent_log (agent_id, action, feature_id, details)
        VALUES (?, ?, ?, ?)
    """, (agent_id, action, feature_id, details))
    conn.commit()
    conn.close()
    return {"success": True, "agent_id": agent_id, "action": action}


def get_agent_log(limit: int = 20):
    """
    Get recent agent activity log entries.
    """
    conn = get_db()
    cursor = conn.execute("""
        SELECT * FROM agent_log
        ORDER BY timestamp DESC
        LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    conn.close()

    return [{
        "id": row["id"],
        "agent_id": row["agent_id"],
        "action": row["action"],
        "feature_id": row["feature_id"],
        "details": row["details"],
        "timestamp": row["timestamp"]
    } for row in rows]


# ============== CLI for Testing ==============

if __name__ == "__main__":
    import sys

    # Initialize database
    init_db()

    if len(sys.argv) < 2:
        print("Usage: python features_mcp.py <command> [args]")
        print("")
        print("Commands:")
        print("  stats                           Show feature statistics")
        print("  category-stats                  Show stats by category")
        print("  next                            Get next feature to implement")
        print("  regression [count]              Get random completed features for regression testing")
        print("  list [status] [category]        List features with optional filters")
        print("  get <id>                        Get a specific feature by ID")
        print("  blocked                         Show blocked features")
        print("  update <id> <status> [notes]    Update feature status")
        print("  mark-regression <id> <result>   Mark regression test result (pass/fail)")
        print("  reset                           Reset database (WARNING: destroys data)")
        print("  log [agent_id] [action] [feature_id] [details]  Log agent activity")
        print("  log-show [limit]                Show recent agent log entries")
        sys.exit(1)

    command = sys.argv[1]

    if command == "stats":
        print(json.dumps(get_stats(), indent=2))

    elif command == "category-stats":
        print(json.dumps(get_category_stats(), indent=2))

    elif command == "next":
        feature = get_next_feature()
        print(json.dumps(feature, indent=2) if feature else "No features available")

    elif command == "regression":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 3
        features = get_regression_features(count)
        print(json.dumps(features, indent=2))

    elif command == "list":
        status = sys.argv[2] if len(sys.argv) > 2 else None
        category = sys.argv[3] if len(sys.argv) > 3 else None
        print(json.dumps(list_features(status=status, category=category), indent=2))

    elif command == "get":
        if len(sys.argv) < 3:
            print("Usage: python features_mcp.py get <id>")
            sys.exit(1)
        feature = get_feature(sys.argv[2])
        print(json.dumps(feature, indent=2) if feature else f"Feature '{sys.argv[2]}' not found")

    elif command == "blocked":
        print(json.dumps(get_blocked_features(), indent=2))

    elif command == "update":
        if len(sys.argv) < 4:
            print("Usage: python features_mcp.py update <id> <status> [notes]")
            sys.exit(1)
        feature_id = sys.argv[2]
        status = sys.argv[3]
        notes = sys.argv[4] if len(sys.argv) > 4 else ""
        result = update_feature_status(feature_id, status, notes=notes)
        print(json.dumps(result, indent=2))

    elif command == "mark-regression":
        if len(sys.argv) < 4:
            print("Usage: python features_mcp.py mark-regression <id> <pass|fail>")
            sys.exit(1)
        feature_id = sys.argv[2]
        result = sys.argv[3]
        outcome = mark_regression_tested(feature_id, result)
        print(json.dumps(outcome, indent=2))

    elif command == "reset":
        confirm = input("WARNING: This will delete all feature data. Type 'yes' to confirm: ") if sys.stdin.isatty() else "yes"
        if confirm.strip().lower() == "yes":
            result = reset_db()
            print(json.dumps(result, indent=2))
        else:
            print("Reset cancelled.")

    elif command == "log":
        if len(sys.argv) < 4:
            print("Usage: python features_mcp.py log <agent_id> <action> [feature_id] [details]")
            sys.exit(1)
        agent_id = sys.argv[2]
        action = sys.argv[3]
        feature_id = sys.argv[4] if len(sys.argv) > 4 else None
        details = sys.argv[5] if len(sys.argv) > 5 else ""
        result = log_agent_activity(agent_id, action, feature_id, details)
        print(json.dumps(result, indent=2))

    elif command == "log-show":
        limit = int(sys.argv[2]) if len(sys.argv) > 2 else 20
        entries = get_agent_log(limit)
        print(json.dumps(entries, indent=2))

    else:
        print(f"Unknown command: {command}")
        print("Run without arguments to see usage.")
