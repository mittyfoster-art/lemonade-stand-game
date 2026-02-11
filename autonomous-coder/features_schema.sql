-- Feature Tracking Database Schema
-- Used by the autonomous coding agents to track implementation progress

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
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Index for finding next feature to implement
CREATE INDEX IF NOT EXISTS idx_features_status_priority
ON features(status, priority);

-- Index for category queries
CREATE INDEX IF NOT EXISTS idx_features_category
ON features(category);

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

-- Category stats view
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
        WHEN 'DATA_MODEL' THEN 1
        WHEN 'SCORING' THEN 2
        WHEN 'STORE' THEN 3
        WHEN 'UI_SCORING' THEN 4
        WHEN 'UI_FACILITATOR' THEN 5
        WHEN 'LEADERBOARD' THEN 6
        WHEN 'TESTING' THEN 7
        ELSE 8
    END;
