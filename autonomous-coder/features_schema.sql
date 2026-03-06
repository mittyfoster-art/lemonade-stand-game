-- Feature Tracking Database Schema v2.0
-- Used by the autonomous coding agents to track implementation progress
-- for the Lemonade Stand Business Simulation v2.0

CREATE TABLE IF NOT EXISTS features (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 3,
    category TEXT NOT NULL,
    dependencies TEXT DEFAULT '[]',  -- JSON array of feature IDs
    files TEXT DEFAULT '[]',         -- JSON array of file paths
    acceptance_criteria TEXT DEFAULT '[]',  -- JSON array of criteria
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT DEFAULT '',
    implemented_by TEXT DEFAULT '',  -- Agent ID that implemented
    implemented_at INTEGER DEFAULT 0,
    regression_count INTEGER DEFAULT 0,
    last_regression_at INTEGER DEFAULT 0,
    error_log TEXT DEFAULT '',              -- Accumulated error messages from failed attempts
    retry_count INTEGER DEFAULT 0,         -- Number of times implementation was attempted
    max_retries INTEGER DEFAULT 3,         -- Maximum retry attempts before skipping
    last_regression_result TEXT DEFAULT '', -- 'pass' or 'fail' from last regression test
    test_command TEXT DEFAULT '',           -- Optional command to run for automated testing
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Index for finding next feature to implement
CREATE INDEX IF NOT EXISTS idx_features_status_priority
ON features(status, priority);

-- Index for category queries
CREATE INDEX IF NOT EXISTS idx_features_category
ON features(category);

-- Agent activity log for tracking what agents do over time
CREATE TABLE IF NOT EXISTS agent_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT NOT NULL,
    action TEXT NOT NULL,
    feature_id TEXT,
    details TEXT DEFAULT '',
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Index for querying agent log by timestamp (used by log-show command)
CREATE INDEX IF NOT EXISTS idx_agent_log_timestamp
ON agent_log(timestamp);

-- Stats view for quick overview
CREATE VIEW IF NOT EXISTS feature_stats AS
SELECT
    COUNT(*) as total,
    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
FROM features;

-- Category stats view with v2 ordering
CREATE VIEW IF NOT EXISTS category_stats AS
SELECT
    category,
    COUNT(*) as total,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
    ROUND(100.0 * SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) / COUNT(*), 1) as percent_complete
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
        ELSE 7
    END;
