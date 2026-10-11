-- 051_payment_methods_per_tenant.sql
--
-- payment_methods had UNIQUE (code), so only one row per method existed for the
-- whole platform, and Settings → Pembayaran updated it by code alone: one store
-- saving its QRIS, bank account or e-wallet overwrote it for every store, and
-- POS checkout then showed that store's QRIS/account to everyone's customers.
--
-- Rows with tenant_id NULL become templates (name, type, icon, order) and never
-- hold account details. Each tenant gets its own row per method when it saves
-- settings. Uniqueness is now per tenant, plus one template per code.

ALTER TABLE payment_methods DROP CONSTRAINT IF EXISTS payment_methods_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_tenant_code_key
  ON payment_methods (tenant_id, code) WHERE tenant_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS payment_methods_template_code_key
  ON payment_methods (code) WHERE tenant_id IS NULL;

-- Templates must not carry anyone's account details.
UPDATE payment_methods SET account_details = NULL WHERE tenant_id IS NULL AND account_details IS NOT NULL;

ALTER TABLE payment_methods
  ADD CONSTRAINT payment_methods_template_has_no_details
  CHECK (tenant_id IS NOT NULL OR account_details IS NULL);
