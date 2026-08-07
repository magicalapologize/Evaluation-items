CREATE TABLE IF NOT EXISTS test_results (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  attempt_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(member_id, attempt_id),
  FOREIGN KEY(member_id) REFERENCES members(id)
);

CREATE INDEX IF NOT EXISTS idx_test_results_member_created
ON test_results(member_id, created_at DESC);
