-- 1111.fm / Cloudwave — initial D1 schema

CREATE TABLE IF NOT EXISTS listeners (
  id         TEXT PRIMARY KEY,
  name       TEXT,
  location   TEXT,
  topics     TEXT,          -- JSON array of topic ids
  taste      TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS segments_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  listener_id TEXT,
  type        TEXT,          -- intro | commute | interview
  title       TEXT,
  script      TEXT,          -- the DJ line that aired
  created_at  TEXT
);

CREATE INDEX IF NOT EXISTS idx_segments_listener ON segments_log (listener_id);
