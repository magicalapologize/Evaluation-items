ALTER TABLE members ADD COLUMN username TEXT;
ALTER TABLE members ADD COLUMN username_normalized TEXT;
ALTER TABLE members ADD COLUMN password_hash TEXT;
ALTER TABLE members ADD COLUMN password_salt TEXT;
ALTER TABLE members ADD COLUMN password_iterations INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_members_username
  ON members(username_normalized);
