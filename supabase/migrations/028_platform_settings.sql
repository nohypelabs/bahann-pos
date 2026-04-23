-- Platform-level settings (key-value store for super admin config)
CREATE TABLE IF NOT EXISTS platform_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Seed defaults
INSERT INTO platform_settings (key, value) VALUES
  ('solana_wallet_address', ''),
  ('solana_rpc_url', ''),
  ('bank_name', ''),
  ('bank_account', ''),
  ('bank_holder', ''),
  ('support_wa', ''),
  ('qris_image_url', '')
ON CONFLICT (key) DO NOTHING;
