/**
 * CHAI PMTCT System - RBAC barrel export
 *
 * Usage:
 *   import { Permission, hasPermission, requirePermission } from '@/lib/rbac';
 */

// Permission constants, types, and role mapping
export {
  Permission,
  ROLE_PERMISSIONS,
  isValidPermission,
  getAllPermissions,
  getPermissionsForRole,
} from './permissions';
export type { PermissionString } from './permissions';

// Server-side helpers
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessDistrict,
  canAccessFacility,
  requirePermission,
  getScopeFilter,
  isAdmin,
  isFinance,
} from './helpers';
export type { ScopeFilter } from './helpers';
