CREATE TABLE comments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  week          INTEGER NOT NULL,
  display_name  TEXT NOT NULL DEFAULT 'Anonymous',
  private_name  TEXT,                               -- optional; only returned by admin API
  body          TEXT NOT NULL,
  ip_hash       TEXT NOT NULL,                      -- salted SHA-256 of client IP
  status        TEXT NOT NULL DEFAULT 'visible'
                CHECK (status IN ('visible', 'hidden')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_comments_week   ON comments (week, status, created_at);
CREATE INDEX idx_comments_ratelimit ON comments (ip_hash, created_at);
