ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email_verified_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_verify_token VARCHAR(128);

CREATE INDEX IF NOT EXISTS idx_users_email_verify_token
  ON users (email_verify_token)
  WHERE email_verify_token IS NOT NULL;
