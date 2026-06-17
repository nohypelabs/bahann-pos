-- Phase 2: RBAC + Outlet Scope
-- Normalized RBAC: roles, permissions, role_permissions, user_role_assignments
-- Outlet groups for area manager support
-- Helper functions for permission checks

BEGIN;

-- ============================================================
-- 1. Roles table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id),
  key text NOT NULL,
  name text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, key)
);

-- System roles (tenant_id IS NULL) need partial unique index
CREATE UNIQUE INDEX idx_roles_system_key ON public.roles(key) WHERE tenant_id IS NULL;
-- Tenant-specific roles
CREATE UNIQUE INDEX idx_roles_tenant_key ON public.roles(tenant_id, key) WHERE tenant_id IS NOT NULL;

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Permissions table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  description text,
  module text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Role_permissions table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  role_id uuid NOT NULL REFERENCES public.roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES public.permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. User role assignments table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  user_id uuid NOT NULL REFERENCES public.users(id),
  role_id uuid NOT NULL REFERENCES public.roles(id),
  scope_type text NOT NULL CHECK (scope_type IN ('TENANT', 'OUTLET', 'OUTLET_GROUP')),
  outlet_id uuid REFERENCES public.outlets(id),
  outlet_group_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Partial unique indexes for NULL-safe uniqueness
CREATE UNIQUE INDEX idx_ura_unique_tenant_scope
  ON public.user_role_assignments(user_id, role_id, scope_type)
  WHERE scope_type = 'TENANT';

CREATE UNIQUE INDEX idx_ura_unique_outlet_scope
  ON public.user_role_assignments(user_id, role_id, scope_type, outlet_id)
  WHERE scope_type = 'OUTLET';

CREATE UNIQUE INDEX idx_ura_unique_group_scope
  ON public.user_role_assignments(user_id, role_id, scope_type, outlet_group_id)
  WHERE scope_type = 'OUTLET_GROUP';

CREATE INDEX idx_ura_user_id ON public.user_role_assignments(user_id);
CREATE INDEX idx_ura_tenant_id ON public.user_role_assignments(tenant_id);
CREATE INDEX idx_ura_outlet_id ON public.user_role_assignments(outlet_id);

ALTER TABLE public.user_role_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. Outlet groups table (for area manager)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outlet_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX idx_outlet_groups_tenant_id ON public.outlet_groups(tenant_id);
ALTER TABLE public.outlet_groups ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. Outlet group members table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.outlet_group_members (
  outlet_group_id uuid NOT NULL REFERENCES public.outlet_groups(id) ON DELETE CASCADE,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (outlet_group_id, outlet_id)
);

CREATE INDEX idx_ogm_outlet_id ON public.outlet_group_members(outlet_id);
ALTER TABLE public.outlet_group_members ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. Seed: System permissions
-- ============================================================
INSERT INTO public.permissions (key, description, module) VALUES
  -- POS
  ('pos.transaction.create', 'Create sales transaction', 'pos'),
  ('pos.transaction.void.request', 'Request void transaction', 'pos'),
  ('pos.transaction.void.approve', 'Approve void transaction', 'pos'),
  ('pos.refund.request', 'Request refund', 'pos'),
  ('pos.refund.approve', 'Approve refund', 'pos'),
  ('pos.discount.apply_small', 'Apply small discount', 'pos'),
  ('pos.discount.apply_large', 'Apply large discount (needs approval)', 'pos'),
  ('pos.receipt.reprint', 'Reprint receipt', 'pos'),
  -- Shift
  ('shift.open', 'Open cash shift', 'shift'),
  ('shift.close', 'Close cash shift', 'shift'),
  ('shift.approve', 'Approve closing shift', 'shift'),
  -- Reports
  ('report.outlet.view', 'View outlet reports', 'report'),
  ('report.tenant.view', 'View tenant-wide reports', 'report'),
  ('report.export', 'Export reports', 'report'),
  -- Inventory
  ('inventory.view', 'View inventory', 'inventory'),
  ('inventory.adjust', 'Adjust stock with reason', 'inventory'),
  ('inventory.transfer', 'Transfer stock between outlets', 'inventory'),
  ('inventory.opname', 'Stock opname', 'inventory'),
  -- Products
  ('product.view', 'View products', 'product'),
  ('product.manage', 'Create/update products', 'product'),
  ('price.manage', 'Manage product pricing', 'product'),
  -- Users
  ('user.view', 'View users', 'user'),
  ('user.manage', 'Create/update/suspend users', 'user'),
  ('role.manage', 'Manage roles and permissions', 'user'),
  -- Audit
  ('audit.view', 'View audit logs', 'audit'),
  -- Settings
  ('settings.manage', 'Manage tenant settings', 'settings'),
  -- Cash
  ('cash.drawer.open', 'Open cash drawer manually', 'cash'),
  ('cash.in_out', 'Record cash in/out', 'cash')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 8. Seed: System roles
-- ============================================================
INSERT INTO public.roles (key, name, description, is_system, tenant_id) VALUES
  ('OWNER', 'Owner', 'Full tenant control including billing', true, NULL),
  ('ADMIN_TENANT', 'Admin Tenant', 'Full operational control, all outlets', true, NULL),
  ('AREA_MANAGER', 'Area Manager', 'Multi-outlet group access', true, NULL),
  ('STORE_MANAGER', 'Store Manager', 'Single outlet management', true, NULL),
  ('CASHIER', 'Cashier', 'POS operations, own shift only', true, NULL),
  ('AUDITOR', 'Auditor', 'Read-only reports and audit logs', true, NULL)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 9. Seed: Role-permission mappings
-- ============================================================

-- OWNER: all permissions
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.key = 'OWNER' AND r.is_system = true AND r.tenant_id IS NULL
ON CONFLICT DO NOTHING;

-- ADMIN_TENANT: all except billing-related (same as owner for now)
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.key = 'ADMIN_TENANT' AND r.is_system = true AND r.tenant_id IS NULL
ON CONFLICT DO NOTHING;

-- AREA_MANAGER: reports, approve, inventory, no product/price management
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.key = 'AREA_MANAGER' AND r.is_system = true AND r.tenant_id IS NULL
  AND p.key IN (
    'pos.transaction.create', 'pos.transaction.void.approve', 'pos.refund.approve',
    'pos.discount.apply_small', 'pos.discount.apply_large', 'pos.receipt.reprint',
    'shift.open', 'shift.close', 'shift.approve',
    'report.outlet.view', 'report.tenant.view', 'report.export',
    'inventory.view', 'inventory.adjust', 'inventory.transfer', 'inventory.opname',
    'product.view', 'user.view',
    'audit.view', 'cash.drawer.open', 'cash.in_out'
  )
ON CONFLICT DO NOTHING;

-- STORE_MANAGER: outlet management, approve, reports
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.key = 'STORE_MANAGER' AND r.is_system = true AND r.tenant_id IS NULL
  AND p.key IN (
    'pos.transaction.create', 'pos.transaction.void.approve', 'pos.refund.approve',
    'pos.discount.apply_small', 'pos.discount.apply_large', 'pos.receipt.reprint',
    'shift.open', 'shift.close', 'shift.approve',
    'report.outlet.view', 'report.export',
    'inventory.view', 'inventory.adjust', 'inventory.opname',
    'product.view', 'user.view',
    'audit.view', 'cash.drawer.open', 'cash.in_out'
  )
ON CONFLICT DO NOTHING;

-- CASHIER: POS only, limited
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.key = 'CASHIER' AND r.is_system = true AND r.tenant_id IS NULL
  AND p.key IN (
    'pos.transaction.create', 'pos.transaction.void.request', 'pos.refund.request',
    'pos.discount.apply_small', 'pos.receipt.reprint',
    'shift.open', 'shift.close',
    'inventory.view', 'product.view',
    'cash.drawer.open'
  )
ON CONFLICT DO NOTHING;

-- AUDITOR: read-only
INSERT INTO public.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM public.roles r, public.permissions p
WHERE r.key = 'AUDITOR' AND r.is_system = true AND r.tenant_id IS NULL
  AND p.key IN (
    'report.outlet.view', 'report.tenant.view', 'report.export',
    'inventory.view', 'product.view', 'user.view',
    'audit.view'
  )
ON CONFLICT DO NOTHING;

-- ============================================================
-- 10. Helper function: get_user_outlet_ids
-- Returns all outlet IDs a user can access
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_outlet_ids(
  p_user_id uuid,
  p_tenant_id uuid
)
RETURNS uuid[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    -- If user has TENANT scope, return ALL outlets in tenant
    (SELECT array_agg(DISTINCT o.id)
     FROM public.user_role_assignments ura
     JOIN public.roles r ON r.id = ura.role_id
     CROSS JOIN public.outlets o
     WHERE ura.user_id = p_user_id
       AND ura.tenant_id = p_tenant_id
       AND ura.scope_type = 'TENANT'
       AND o.tenant_id = p_tenant_id
    ),
    -- Otherwise return only assigned outlets
    (SELECT array_agg(DISTINCT
      CASE
        WHEN ura.scope_type = 'OUTLET' THEN ura.outlet_id
        WHEN ura.scope_type = 'OUTLET_GROUP' THEN ogm.outlet_id
      END
     )
     FROM public.user_role_assignments ura
     LEFT JOIN public.outlet_group_members ogm ON ogm.outlet_group_id = ura.outlet_group_id
     WHERE ura.user_id = p_user_id
       AND ura.tenant_id = p_tenant_id
       AND ura.scope_type IN ('OUTLET', 'OUTLET_GROUP')
    ),
    ARRAY[]::uuid[]
  );
$$;

-- ============================================================
-- 11. Helper function: user_has_permission
-- Checks if user has a specific permission, optionally scoped to outlet
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id uuid,
  p_tenant_id uuid,
  p_permission_key text,
  p_outlet_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_role_assignments ura
    JOIN public.role_permissions rp ON rp.role_id = ura.role_id
    JOIN public.permissions p ON p.id = rp.permission_id
    WHERE ura.user_id = p_user_id
      AND ura.tenant_id = p_tenant_id
      AND p.key = p_permission_key
      AND (
        -- TENANT scope: always allowed
        ura.scope_type = 'TENANT'
        -- OUTLET scope: must match outlet
        OR (ura.scope_type = 'OUTLET' AND (p_outlet_id IS NULL OR ura.outlet_id = p_outlet_id))
        -- OUTLET_GROUP scope: outlet must be in group
        OR (ura.scope_type = 'OUTLET_GROUP' AND EXISTS (
          SELECT 1 FROM public.outlet_group_members ogm
          WHERE ogm.outlet_group_id = ura.outlet_group_id
            AND (p_outlet_id IS NULL OR ogm.outlet_id = p_outlet_id)
        ))
      )
  );
$$;

-- ============================================================
-- 12. Migrate existing users.role → user_role_assignments
-- ============================================================

-- Map existing roles to system role IDs
INSERT INTO public.user_role_assignments (tenant_id, user_id, role_id, scope_type)
SELECT DISTINCT
  u.tenant_id,
  u.id,
  r.id,
  CASE
    WHEN u.role = 'admin' THEN 'TENANT'
    WHEN u.role = 'super_admin' THEN 'TENANT'
    ELSE 'OUTLET'
  END
FROM public.users u
JOIN public.roles r ON r.key = CASE
  WHEN u.role = 'admin' THEN 'ADMIN_TENANT'
  WHEN u.role = 'super_admin' THEN 'OWNER'
  WHEN u.role = 'manager' THEN 'STORE_MANAGER'
  WHEN u.role = 'cashier' THEN 'CASHIER'
  WHEN u.role = 'user' THEN 'CASHIER'
  ELSE 'CASHIER'
END
WHERE r.is_system = true AND r.tenant_id IS NULL
ON CONFLICT DO NOTHING;

-- For OUTLET-scoped users, set outlet_id from users.outlet_id
UPDATE public.user_role_assignments ura
SET outlet_id = u.outlet_id
FROM public.users u
WHERE u.id = ura.user_id
  AND ura.scope_type = 'OUTLET'
  AND u.outlet_id IS NOT NULL
  AND ura.outlet_id IS NULL;

COMMIT;
