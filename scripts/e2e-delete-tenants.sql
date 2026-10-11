-- Permanently deletes E2E test tenants (created by scripts/e2e-cashier-flow.mjs)
-- with all their data, including their audit log rows. Only tenants named
-- "E2E Toko *" whose owner has a "+e2e-" plus-address are touched. Back up first
-- if the rows matter.
--
--   supabase db query --linked --project-ref <ref> -f scripts/e2e-delete-tenants.sql
BEGIN;
CREATE TEMP TABLE e2e ON COMMIT DROP AS
  SELECT t.id FROM tenants t JOIN users u ON u.id = t.owner_user_id
  WHERE t.name LIKE 'E2E Toko %' AND u.email LIKE '%+e2e-%';

DELETE FROM transaction_approvals WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM payment_confirmations WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM payments WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM transaction_items WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM transactions WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM shifts WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM cash_sessions WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM operational_expenses WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM stock_movements WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM stock_alerts WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM daily_stock WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM daily_sales WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM promotions WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM products WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM pos_devices WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM user_role_assignments WHERE tenant_id IN (SELECT id FROM e2e);
-- Audit logs are immutable by design; this unlocks the trigger only inside the
-- transaction and only to remove the test tenants' rows.
ALTER TABLE audit_logs DISABLE TRIGGER trg_audit_logs_immutable;
DELETE FROM audit_logs WHERE tenant_id IN (SELECT id FROM e2e);
ALTER TABLE audit_logs ENABLE TRIGGER trg_audit_logs_immutable;
DELETE FROM outlet_groups WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM outlets WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM business_profiles WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM billing_history WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM payment_requests WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM impersonation_sessions WHERE tenant_id IN (SELECT id FROM e2e);
UPDATE tenants SET owner_user_id = NULL WHERE id IN (SELECT id FROM e2e);
DELETE FROM users WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM tenants WHERE id IN (SELECT id FROM e2e);
SELECT count(*) AS tenants_deleted FROM e2e;
COMMIT;
