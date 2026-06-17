// Role-Based Access Control (RBAC) Permission System
// Indonesian POS System — 6 roles with granular permissions

// All available permission keys
export const PERMISSIONS = {
  // POS Transaction
  POS_TRANSACTION_CREATE: 'pos.transaction.create',
  POS_TRANSACTION_VOID_REQUEST: 'pos.transaction.void.request',
  POS_TRANSACTION_VOID_APPROVE: 'pos.transaction.void.approve',
  
  // Refunds
  POS_REFUND_REQUEST: 'pos.refund.request',
  POS_REFUND_APPROVE: 'pos.refund.approve',
  
  // Discounts
  POS_DISCOUNT_SMALL: 'pos.discount.apply_small',
  POS_DISCOUNT_LARGE: 'pos.discount.apply_large',
  
  // Receipt
  POS_RECEIPT_REPRINT: 'pos.receipt.reprint',
  
  // Shift
  SHIFT_OPEN: 'shift.open',
  SHIFT_CLOSE: 'shift.close',
  SHIFT_APPROVE: 'shift.approve',
  
  // Reports
  REPORT_OUTLET_VIEW: 'report.outlet.view',
  REPORT_TENANT_VIEW: 'report.tenant.view',
  REPORT_EXPORT: 'report.export',
  
  // Inventory
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',
  INVENTORY_OPNAME: 'inventory.opname',
  
  // Products
  PRODUCT_VIEW: 'product.view',
  PRODUCT_MANAGE: 'product.manage',
  PRICE_MANAGE: 'price.manage',
  
  // Users & Roles
  USER_VIEW: 'user.view',
  USER_MANAGE: 'user.manage',
  ROLE_MANAGE: 'role.manage',
  
  // System
  AUDIT_VIEW: 'audit.view',
  SETTINGS_MANAGE: 'settings.manage',
  CASH_DRAWER_OPEN: 'cash.drawer.open',
  CASH_IN_OUT: 'cash.in_out',
} as const

// Role permissions map: each role has a Set of permission keys
export const ROLE_PERMISSIONS: Record<string, Set<string>> = {
  // OWNER (Platform level) — 28 permissions (all)
  OWNER: new Set([
    PERMISSIONS.POS_TRANSACTION_CREATE,
    PERMISSIONS.POS_TRANSACTION_VOID_REQUEST,
    PERMISSIONS.POS_TRANSACTION_VOID_APPROVE,
    PERMISSIONS.POS_REFUND_REQUEST,
    PERMISSIONS.POS_REFUND_APPROVE,
    PERMISSIONS.POS_DISCOUNT_SMALL,
    PERMISSIONS.POS_DISCOUNT_LARGE,
    PERMISSIONS.POS_RECEIPT_REPRINT,
    PERMISSIONS.SHIFT_OPEN,
    PERMISSIONS.SHIFT_CLOSE,
    PERMISSIONS.SHIFT_APPROVE,
    PERMISSIONS.REPORT_OUTLET_VIEW,
    PERMISSIONS.REPORT_TENANT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.INVENTORY_OPNAME,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PRODUCT_MANAGE,
    PERMISSIONS.PRICE_MANAGE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ROLE_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.CASH_DRAWER_OPEN,
    PERMISSIONS.CASH_IN_OUT,
  ]),

  // ADMIN_TENANT — 28 permissions (all)
  ADMIN_TENANT: new Set([
    PERMISSIONS.POS_TRANSACTION_CREATE,
    PERMISSIONS.POS_TRANSACTION_VOID_REQUEST,
    PERMISSIONS.POS_TRANSACTION_VOID_APPROVE,
    PERMISSIONS.POS_REFUND_REQUEST,
    PERMISSIONS.POS_REFUND_APPROVE,
    PERMISSIONS.POS_DISCOUNT_SMALL,
    PERMISSIONS.POS_DISCOUNT_LARGE,
    PERMISSIONS.POS_RECEIPT_REPRINT,
    PERMISSIONS.SHIFT_OPEN,
    PERMISSIONS.SHIFT_CLOSE,
    PERMISSIONS.SHIFT_APPROVE,
    PERMISSIONS.REPORT_OUTLET_VIEW,
    PERMISSIONS.REPORT_TENANT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.INVENTORY_OPNAME,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PRODUCT_MANAGE,
    PERMISSIONS.PRICE_MANAGE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.USER_MANAGE,
    PERMISSIONS.ROLE_MANAGE,
    PERMISSIONS.AUDIT_VIEW,
    PERMISSIONS.SETTINGS_MANAGE,
    PERMISSIONS.CASH_DRAWER_OPEN,
    PERMISSIONS.CASH_IN_OUT,
  ]),

  // AREA_MANAGER — 21 permissions
  AREA_MANAGER: new Set([
    PERMISSIONS.POS_TRANSACTION_CREATE,
    PERMISSIONS.POS_TRANSACTION_VOID_REQUEST,
    PERMISSIONS.POS_TRANSACTION_VOID_APPROVE,
    PERMISSIONS.POS_REFUND_REQUEST,
    PERMISSIONS.POS_REFUND_APPROVE,
    PERMISSIONS.POS_DISCOUNT_SMALL,
    PERMISSIONS.POS_DISCOUNT_LARGE,
    PERMISSIONS.POS_RECEIPT_REPRINT,
    PERMISSIONS.SHIFT_OPEN,
    PERMISSIONS.SHIFT_CLOSE,
    PERMISSIONS.SHIFT_APPROVE,
    PERMISSIONS.REPORT_OUTLET_VIEW,
    PERMISSIONS.REPORT_TENANT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PRODUCT_MANAGE,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.CASH_IN_OUT,
  ]),

  // STORE_MANAGER — 19 permissions
  STORE_MANAGER: new Set([
    PERMISSIONS.POS_TRANSACTION_CREATE,
    PERMISSIONS.POS_TRANSACTION_VOID_REQUEST,
    PERMISSIONS.POS_TRANSACTION_VOID_APPROVE,
    PERMISSIONS.POS_REFUND_REQUEST,
    PERMISSIONS.POS_DISCOUNT_SMALL,
    PERMISSIONS.POS_DISCOUNT_LARGE,
    PERMISSIONS.POS_RECEIPT_REPRINT,
    PERMISSIONS.SHIFT_OPEN,
    PERMISSIONS.SHIFT_CLOSE,
    PERMISSIONS.REPORT_OUTLET_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.INVENTORY_ADJUST,
    PERMISSIONS.INVENTORY_TRANSFER,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.PRODUCT_MANAGE,
    PERMISSIONS.PRICE_MANAGE,
    PERMISSIONS.CASH_DRAWER_OPEN,
    PERMISSIONS.CASH_IN_OUT,
  ]),

  // CASHIER — 10 permissions
  CASHIER: new Set([
    PERMISSIONS.POS_TRANSACTION_CREATE,
    PERMISSIONS.POS_DISCOUNT_SMALL,
    PERMISSIONS.POS_RECEIPT_REPRINT,
    PERMISSIONS.SHIFT_OPEN,
    PERMISSIONS.SHIFT_CLOSE,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.CASH_DRAWER_OPEN,
    PERMISSIONS.CASH_IN_OUT,
    PERMISSIONS.REPORT_OUTLET_VIEW,
  ]),

  // AUDITOR — 7 permissions (read-only)
  AUDITOR: new Set([
    PERMISSIONS.REPORT_OUTLET_VIEW,
    PERMISSIONS.REPORT_TENANT_VIEW,
    PERMISSIONS.REPORT_EXPORT,
    PERMISSIONS.INVENTORY_VIEW,
    PERMISSIONS.PRODUCT_VIEW,
    PERMISSIONS.USER_VIEW,
    PERMISSIONS.AUDIT_VIEW,
  ]),
}

// Role display names in Indonesian
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  OWNER: 'Pemilik Platform',
  ADMIN_TENANT: 'Admin Tenant',
  AREA_MANAGER: 'Manajer Area',
  STORE_MANAGER: 'Kepala Toko',
  CASHIER: 'Kasir',
  AUDITOR: 'Auditor',
}

// Legacy role to new role key mapping
export const LEGACY_ROLE_MAP: Record<string, string> = {
  super_admin: 'OWNER',
  admin: 'ADMIN_TENANT',
  manager: 'STORE_MANAGER',
  user: 'CASHIER',
  // Direct mappings for new roles
  OWNER: 'OWNER',
  ADMIN_TENANT: 'ADMIN_TENANT',
  AREA_MANAGER: 'AREA_MANAGER',
  STORE_MANAGER: 'STORE_MANAGER',
  CASHIER: 'CASHIER',
  AUDITOR: 'AUDITOR',
}

/**
 * Check if a role has a specific permission
 * @param role - The role key (legacy or new)
 * @param permission - The permission key to check
 * @returns true if the role has the permission
 */
export function hasPermission(role: string, permission: string): boolean {
  const roleKey = LEGACY_ROLE_MAP[role] || role
  const permissions = ROLE_PERMISSIONS[roleKey]
  return permissions ? permissions.has(permission) : false
}

/**
 * Check if a role has ANY of the given permissions
 * @param role - The role key (legacy or new)
 * @param permissions - Array of permission keys to check
 * @returns true if the role has at least one of the permissions
 */
export function hasAnyPermission(role: string, permissions: string[]): boolean {
  return permissions.some(p => hasPermission(role, p))
}

/**
 * Check if a role has ALL of the given permissions
 * @param role - The role key (legacy or new)
 * @param permissions - Array of permission keys to check
 * @returns true if the role has all of the permissions
 */
export function hasAllPermissions(role: string, permissions: string[]): boolean {
  return permissions.every(p => hasPermission(role, p))
}

/**
 * Get the display name for a role
 * @param role - The role key (legacy or new)
 * @returns Indonesian display name
 */
export function getRoleDisplayName(role: string): string {
  const roleKey = LEGACY_ROLE_MAP[role] || role
  return ROLE_DISPLAY_NAMES[roleKey] || role
}
