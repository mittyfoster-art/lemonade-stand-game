#!/usr/bin/env python3
"""
Features MCP Server
Provides tools for managing the feature tracking database.
Used by the autonomous coding agents to coordinate feature implementation.
"""

import sqlite3
import json
import random
from datetime import datetime
from pathlib import Path

# Database path
DB_PATH = Path(__file__).parent / "features.db"

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
    Returns counts of features by status.
    """
    conn = get_db()
    cursor = conn.execute("SELECT * FROM feature_stats")
    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "total": row["total"],
            "pending": row["pending"],
            "in_progress": row["in_progress"],
            "completed": row["completed"],
            "failed": row["failed"],
            "blocked": row["blocked"],
            "percent_complete": round(100 * row["completed"] / row["total"], 1) if row["total"] > 0 else 0
        }
    return {"total": 0, "pending": 0, "in_progress": 0, "completed": 0, "failed": 0, "blocked": 0}

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

def get_next_feature():
    """
    Get the next feature to implement.
    Returns the highest priority pending feature whose dependencies are met.
    """
    conn = get_db()

    # Get all completed feature IDs
    cursor = conn.execute("SELECT id FROM features WHERE status = 'completed'")
    completed_ids = set(row["id"] for row in cursor.fetchall())

    # Get pending features ordered by priority
    cursor = conn.execute("""
        SELECT * FROM features
        WHERE status = 'pending'
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
                "notes": row["notes"]
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
        "regression_count": row["regression_count"]
    } for row in rows]

def add_feature(
    id: str,
    title: str,
    description: str,
    priority: int = 3,
    category: str = "GENERAL",
    dependencies: list = None,
    files: list = None,
    acceptance_criteria: list = None
):
    """
    Add a new feature to the database.
    """
    conn = get_db()
    conn.execute("""
        INSERT INTO features (id, title, description, priority, category, dependencies, files, acceptance_criteria)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        id,
        title,
        description,
        priority,
        category,
        json.dumps(dependencies or []),
        json.dumps(files or []),
        json.dumps(acceptance_criteria or [])
    ))
    conn.commit()
    conn.close()
    return {"success": True, "id": id}

def update_feature_status(
    id: str,
    status: str,
    notes: str = "",
    implemented_by: str = ""
):
    """
    Update a feature's status.
    Status can be: pending, in_progress, completed, failed, blocked
    """
    valid_statuses = ["pending", "in_progress", "completed", "failed", "blocked"]
    if status not in valid_statuses:
        return {"success": False, "error": f"Invalid status. Must be one of: {valid_statuses}"}

    conn = get_db()

    updates = ["status = ?", "updated_at = ?", "notes = notes || ?"]
    params = [status, int(datetime.now().timestamp()), f"\n[{datetime.now().isoformat()}] {notes}" if notes else ""]

    if status == "completed" and implemented_by:
        updates.extend(["implemented_by = ?", "implemented_at = ?"])
        params.extend([implemented_by, int(datetime.now().timestamp())])

    params.append(id)

    conn.execute(f"""
        UPDATE features
        SET {", ".join(updates)}
        WHERE id = ?
    """, params)
    conn.commit()
    conn.close()

    return {"success": True, "id": id, "status": status}

def mark_regression_tested(id: str):
    """
    Mark a feature as regression tested.
    Increments the regression count and updates timestamp.
    """
    conn = get_db()
    conn.execute("""
        UPDATE features
        SET regression_count = regression_count + 1,
            last_regression_at = ?,
            updated_at = ?
        WHERE id = ?
    """, (int(datetime.now().timestamp()), int(datetime.now().timestamp()), id))
    conn.commit()
    conn.close()
    return {"success": True, "id": id}

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
            "regression_count": row["regression_count"]
        }
    return None

def list_features(status: str = None, category: str = None):
    """
    List features with optional filtering.
    """
    conn = get_db()

    query = "SELECT id, title, status, priority, category FROM features WHERE 1=1"
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

# ============== CLI for Testing ==============

if __name__ == "__main__":
    import sys

    # Initialize database
    init_db()

    if len(sys.argv) < 2:
        print("Usage: python features_mcp.py <command> [args]")
        print("Commands: stats, next, regression, list, add, update")
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
        features = get_regression_features()
        print(json.dumps(features, indent=2))
    elif command == "list":
        status = sys.argv[2] if len(sys.argv) > 2 else None
        print(json.dumps(list_features(status=status), indent=2))
    elif command == "blocked":
        print(json.dumps(get_blocked_features(), indent=2))
    else:
        print(f"Unknown command: {command}")
