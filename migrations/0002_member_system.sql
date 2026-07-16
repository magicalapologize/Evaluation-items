CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  login_code_hash TEXT NOT NULL UNIQUE,
  code_hint TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'annual', 'lifetime')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  activated_at TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS member_activation_codes (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  code_hint TEXT NOT NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'quarterly', 'annual', 'lifetime')),
  duration_days INTEGER,
  status TEXT NOT NULL DEFAULT 'unused' CHECK (status IN ('unused', 'redeemed', 'disabled')),
  redeemed_by TEXT,
  redeemed_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (redeemed_by) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS member_sessions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (member_id) REFERENCES members(id)
);

CREATE TABLE IF NOT EXISTS member_auth_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_key TEXT NOT NULL,
  success INTEGER NOT NULL DEFAULT 0,
  attempted_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_member_sessions_member
  ON member_sessions(member_id, revoked_at, created_at);

CREATE INDEX IF NOT EXISTS idx_member_sessions_expiry
  ON member_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_member_auth_attempts_client
  ON member_auth_attempts(client_key, success, attempted_at);
