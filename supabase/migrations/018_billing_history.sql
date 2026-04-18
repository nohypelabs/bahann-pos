CREATE TABLE IF NOT EXISTS billing_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan          VARCHAR     NOT NULL,
  previous_plan VARCHAR,
  amount        INTEGER     NOT NULL DEFAULT 0, -- IDR, 0 for free/trial
  note          TEXT,                           -- admin note e.g. "Transfer BNI dikonfirmasi"
  is_trial      BOOLEAN     NOT NULL DEFAULT false,
  changed_by    UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_history_user_id
  ON billing_history (user_id, created_at DESC);

-- RLS: users can only read their own records; writes via service role only
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
