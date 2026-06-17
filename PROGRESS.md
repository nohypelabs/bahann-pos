# LakuPOS Progress Documentation

**Last Updated:** 2026-06-17
**Session:** Multi-tenant RBAC + UIUX-SPEC Implementation

---

## 1. Database Migrations (COMPLETE ✅)

### Phase 0: Emergency Security (033)
- Enabled RLS on 8 sensitive tables
- Revoked all grants from anon/authenticated
- Token tables locked to backend-only

### Phase 1: Tenant Foundation (034)
- Created `tenants` table
- Added `tenant_id` to 21 operational tables
- Backfilled all existing data to tenants
- 9 tenants created (8 real + 1 default)

### Phase 2: RBAC + Outlet Scope (035)
- Created `roles`, `permissions`, `role_permissions`, `user_role_assignments`
- Created `outlet_groups`, `outlet_group_members`
- 6 system roles: OWNER, ADMIN_TENANT, AREA_MANAGER, STORE_MANAGER, CASHIER, AUDITOR
- 28 permissions defined
- Helper functions: `get_user_outlet_ids()`, `user_has_permission()`
- 12 user role assignments migrated

### Phase 3: POS Hardening (036)
- Created `pos_devices` table
- Created `shifts` table (replaces cash_sessions)
- Created `transaction_approvals` table
- Added `device_id`, `shift_id` to transactions
- Added void/refund tracking columns

### Phase 4: Cash Shift Hardening (037)
- `compute_expected_cash()` function
- `submit_shift()` function (auto-close if difference = 0)
- `approve_shift()` function
- `cash_difference` as GENERATED ALWAYS AS column

### Phase 5: Audit Hardening (038)
- Immutable audit_logs trigger (UPDATE/DELETE blocked)
- Added `actor_user_id`, `outlet_id`, `device_id`, `shift_id` to audit_logs
- Tenant-scoped RLS policies on all operational tables

### Phase 6: Post-Audit Hotfix (039)
- Outlet-scoped RLS using `get_user_outlet_ids()`
- Stale functions dropped
- Active shift partial unique index
- Tenant-scoped unique constraints
- payment_methods safe view

---

## 2. Backend Code Changes (COMPLETE ✅)

### Auth Flow
- `jwt.ts`: Added `tenantId` to JWTPayload
- `redis-upstash.ts`: Added `tenantId` to SessionData
- `refreshToken.ts`: Added `tenantId` to JWT creation
- `LoginUserUseCase`: tenantId in JWT + session
- `GetProfileUseCase`: tenantId in output
- `User.ts` entity: Added `tenantId` field
- `SupabaseUserRepository`: tenant_id in all queries

### tRPC Middleware
- `trpc.ts`: RBAC middleware, `requirePermission()`, `outletScopedProcedure`
- `tenant.ts` (FULL REWRITE):
  - `getTenantId()` - resolve tenant from session/DB
  - `getUserOutletIds()` - RBAC-aware outlet scoping
  - `userHasPermission()` - permission check via DB function
  - `requirePermission()` - throw FORBIDDEN if no permission
  - `assertOutletAccessible()` - verify outlet access

### Routers Updated (tenantId + RBAC)
| Router | Change |
|--------|--------|
| transactions.ts | Outlet-scoped via getUserOutletIds |
| dashboard.ts | Outlet-scoped via resolveOutletIds |
| sales.ts | tenantId direct |
| stockAlerts.ts | getUserOutletIds |
| expenses.ts | tenantId direct |
| outlets.ts | tenantId direct |
| promotions.ts | tenantId direct |
| admin.ts | tenantId direct |
| cashSessions.ts | getUserOutletIds |
| products.ts | tenantId direct |
| stock.ts | getUserOutletIds |
| users.ts | RBAC-aware create/list/updateRole |
| auth.ts | tenantId in getProfile |

### New Routers Created
| Router | Endpoints | Purpose |
|--------|-----------|---------|
| shifts.ts | open, getActive, submit, approve, list, getById | Shift management |
| transactionApprovals.ts | list, create, approve, reject | Void/refund approval |
| posDevices.ts | list, register, updateStatus, heartbeat, delete | Device binding |
| outletGroups.ts | list, getById, create, update, delete, addOutlet, removeOutlet | Area manager groups |

---

## 3. Frontend Changes (COMPLETE ✅)

### Design Tokens (globals.css)
```
--axi-blue: #0B4F6C
--axi-gold: #FBBF24
--surface: #FFFFFF
--border: #E5E3DD
--text-muted: #6B6A64
--success: #15803D / --success-bg: #EFFAF1
--warning: #B45309 / --warning-bg: #FFF8EC
--danger: #B91C1C / --danger-bg: #FEF1F1
--info: #1D4ED8 / --info-bg: #EFF5FF
```

### RBAC Permission System
- Created `src/lib/rbac/permissions.ts`
- 6 roles with permission Sets
- `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`
- `getRoleDisplayName()` - Indonesian names
- `LEGACY_ROLE_MAP` - maps old roles to new

### Sidebar Filtering
- Permission-based menu filtering (not hardcoded role checks)
- 6 role badges with Indonesian names
- Granular permission checks per sidebar item

### Component Library
| Component | File | Props |
|-----------|------|-------|
| MetricCard | components/ui/MetricCard.tsx | label, value, trend?, trendDirection?, icon?, variant? |
| ApprovalCard | components/ui/ApprovalCard.tsx | actionType, actorName, referenceId, amount?, reason, onApprove, onReject |
| StatusBadge | components/ui/StatusBadge.tsx | status ('active'\|'pending'\|'rejected'\|'neutral'), label? |
| EmptyState | components/ui/EmptyState.tsx | icon, title, description, action |
| ErrorState | components/ui/ErrorState.tsx | title, description, onRetry? |

### Approval Queue UI
- Created `/approvals` page for Kepala Toko
- Pending queue pinned at top
- Filter tabs: Semua | Pending | Disetujui | Ditolak
- Approve: 1 tap, Reject: modal for manager note
- Sidebar: Persetujuan link with pending badge

### Role-Based Landing Page
- super_admin → /admin
- admin → /dashboard
- manager (Kepala Toko) → /eod
- user (Kasir) → /pos/sales

### POS Sales Page
- Kasir locked to assigned outlet (🔒 pill, no picker)
- Auto-select outlet from userProfile.outletId
- Admin/manager: full outlet picker

### Settings/Users Page
- Universal create user with 5 role cards
- Scope selector (TENANT/OUTLET/OUTLET_GROUP)
- Edit user with role change
- RBAC role assignment

### Empty/Error States
- All pages have: explanation + ONE clear action
- No dead ends
- Error format: [What happened]. [What can be done].

### Microcopy Audit
- 24 fixes across 8 files
- Active voice, specific errors
- Button-toast consistency
- Indonesian conversational-profesional

---

## 4. Current Role System

| Role | Scope | Permissions | Landing |
|------|-------|-------------|---------|
| SUPERADMIN | Platform | All + tenant mgmt | /admin |
| OWNER | TENANT | 28 (all) | /dashboard |
| ADMIN_TENANT | TENANT | 28 (all) | /dashboard |
| AREA_MANAGER | OUTLET_GROUP | 21 | /dashboard |
| STORE_MANAGER (Kepala Toko) | OUTLET | 19 | /eod |
| CASHIER (Kasir) | OUTLET | 10 | /pos/sales |
| AUDITOR | TENANT | 7 (read-only) | /dashboard |

---

## 5. What's NOT Done Yet (Future Work)

### Nice-to-Have (from UIUX-SPEC)
- [ ] Owner WhatsApp channel (daily summary via WA)
- [ ] Android Expo kasir app (spec says mobile, currently web)
- [ ] Data table sticky header + anomaly-first sort
- [ ] Confirmation modal for sensitive actions (bulk price change, suspend, role change)
- [ ] Outlet picker only shows when user has >1 outlet access
- [ ] Keyboard shortcuts for common actions

### Backend Improvements
- [ ] Regenerate database.types.ts (need Supabase CLI login)
- [ ] Shifts migration (cash_sessions → shifts fully)
- [ ] POS device registration flow in UI
- [ ] Outlet groups management in Settings UI
- [ ] RLS policies using `user_has_permission()` (currently outlet-scoped only)

### Testing
- [ ] E2E tests for RBAC flows
- [ ] Integration tests for approval workflow
- [ ] Permission matrix validation tests

---

## 6. Database State

```
Tables: 36 (all RLS enabled)
Tenants: 1 (agdscid@gmail.com)
Users: 1 (super_admin)
Roles: 6 system roles
Permissions: 28
Policies: 38 (28 outlet-scoped, 8 deny_all, 2 tenant-scoped)
Functions: 45
Migrations: 033-039
```

---

## 7. Git Commits (this session)

```
3716f31 feat: UIUX-SPEC microcopy audit (24 fixes)
b596884 feat: UIUX-SPEC empty/error states audit
09b79ed feat: approval queue UI for Kepala Toko
e5bed53 feat: UIUX-SPEC component library (MetricCard, ApprovalCard, StatusBadge)
6f8fe14 feat: role-based landing page after login
06b2306 fix: Kepala Toko naming consistency
0e2e505 feat: RBAC sidebar filtering + design tokens
5a6d51a feat: outlet groups CRUD for area manager support
fc330ca feat: POS device binding to outlets
35a3782 feat: transaction approval workflow for void/refund
a22f028 feat: shifts migration + database.types.ts regeneration
ddd7c9c chore: regenerate database.types.ts with new RBAC/tenant tables
```

---

## 8. Key Files Reference

| Purpose | Path |
|---------|------|
| RBAC permissions | src/lib/rbac/permissions.ts |
| Tenant helpers | src/server/lib/tenant.ts |
| tRPC context | src/server/trpc.ts |
| Design tokens | src/app/globals.css |
| Sidebar | src/components/layout/Sidebar.tsx |
| MetricCard | src/components/ui/MetricCard.tsx |
| ApprovalCard | src/components/ui/ApprovalCard.tsx |
| StatusBadge | src/components/ui/StatusBadge.tsx |
| EmptyState | src/components/ui/EmptyState.tsx |
| ErrorState | src/components/ui/ErrorState.tsx |
| Approvals page | src/app/(app)/approvals/page.tsx |
| Login redirect | src/app/login/page.tsx |
| Users management | src/app/(app)/settings/users/page.tsx |
| POS sales | src/app/(app)/pos/sales/page.tsx |

---

## 9. Testing Checklist

### Before Next Session
- [ ] Login as superadmin → verify /admin landing
- [ ] Create owner account → verify /dashboard landing
- [ ] Create outlet + products
- [ ] Create Kepala Toko → verify /eod landing, outlet locked
- [ ] Create Kasir → verify /pos/sales landing, outlet locked (🔒)
- [ ] Kasir creates transaction → verify outlet scoping
- [ ] Kasir requests void → verify approval queue
- [ ] Kepala Toko approves void → verify transaction updated
- [ ] Check sidebar filtering per role
- [ ] Check empty states on all pages

---

*Document generated: 2026-06-17*
*Next session: Continue with remaining UIUX-SPEC items or new features*
