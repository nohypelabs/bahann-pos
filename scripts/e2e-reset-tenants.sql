-- Clears the operational data of E2E test tenants (created by
-- scripts/e2e-cashier-flow.mjs) so the same accounts can run again with
-- E2E_REUSE_RUN. Accounts and outlets stay; products, sales, stock, shifts,
-- expenses, approvals and payment settings go. Only tenants named "E2E Toko *" whose owner has a
-- "+e2e-" plus-address are touched.
--
--   supabase db query --linked --project-ref <ref> -f scripts/e2e-reset-tenants.sql
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
DELETE FROM operational_expenses WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM stock_movements WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM daily_stock WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM daily_sales WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM products WHERE tenant_id IN (SELECT id FROM e2e);
DELETE FROM payment_methods WHERE tenant_id IN (SELECT id FROM e2e);
UPDATE users SET pin_code_hash = NULL WHERE tenant_id IN (SELECT id FROM e2e);
SELECT count(*) AS tenants_reset FROM e2e;
COMMIT;
