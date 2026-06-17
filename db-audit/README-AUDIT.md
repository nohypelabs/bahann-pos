# Supabase DB Audit Bundle — Post-Migration

Generated at: 2026-06-17T12:00:00Z
psql version: 16.13 (PostgreSQL 17.6 server)
Project ref: skdgytedoilnlflyjvbc

## Schema Summary

- 36 tables in public schema
- 36 tables with RLS enabled (100%)
- 47 RLS policies defined
- 6 system roles (OWNER, ADMIN_TENANT, AREA_MANAGER, STORE_MANAGER, CASHIER, AUDITOR)
- 28 permissions
- 9 tenants
- 34 migrations (005-038)

## Migration Phases Applied

1. Phase 0 (033): Emergency Security — RLS + revoke grants on 8 sensitive tables
2. Phase 1 (034): Tenant Foundation — tenants table + tenant_id on 21 tables
3. Phase 2 (035): RBAC + Outlet Scope — roles, permissions, role_permissions, user_role_assignments, outlet_groups
4. Phase 3 (036): POS Hardening — pos_devices, shifts, transaction_approvals, device_id/shift_id
5. Phase 4 (037): Cash Shift Hardening — compute_expected_cash, submit_shift, approve_shift
6. Phase 5 (038): Audit + Inventory — immutable audit_logs trigger, tenant-scoped RLS

## Files

| File | Description |
|------|-------------|
| schema-public.sql | Table DDL |
| rls-status.txt | RLS enable/disable per table |
| policies.txt | All RLS policies |
| indexes.txt | All indexes |
| foreign-keys.txt | Foreign key constraints |
| constraints.txt | UNIQUE + CHECK constraints |
| triggers.txt | All triggers |
| functions.sql | Function DDL |
| functions-list.txt | Function metadata |
| views.txt | View definitions |
| materialized-views.txt | Materialized views |
| grants.txt | Grants to anon/authenticated |
| enums.txt | Custom enum types |
| extensions.txt | PostgreSQL extensions |
| table-sizes.txt | Table sizes |
| tenants.txt | Tenant data |
| roles.txt | System roles |
| permissions.txt | Permission definitions |
| role-permissions.txt | Role-permission matrix |
| user-role-assignments.txt | User role assignments |
| migrations.txt | Migration file listing |
| database.types.ts | Generated TypeScript types |

## Safety

- No database mutations were executed during audit generation.
- No credentials are included.
- All queries were read-only.

## Key Findings Post-Migration

- All 36 tables have RLS enabled
- Tenant-scoped RLS policies on all operational tables
- Immutable audit_logs trigger prevents UPDATE/DELETE
- 6 system roles with 28 permissions
- Helper functions: get_user_outlet_ids(), user_has_permission()
- cash_difference is a GENERATED ALWAYS AS column
- Anon grants reduced from 112 to minimal
