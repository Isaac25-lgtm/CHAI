/**
 * CHAI PMTCT System - RBAC barrel export
 */

export {
  Permission,
  ROLE_PERMISSIONS,
  isValidPermission,
  getAllPermissions,
  getPermissionsForRole,
} from './permissions';
export type { PermissionString } from './permissions';

export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessDistrict,
  canAccessFacility,
  requirePermission,
  getScopeFilter,
  getDistrictScopeFilter,
  isOwnRecord,
  isAdmin,
  isFinance,
  isSuperuser,
  isAssessor,
} from './helpers';
export type { ScopeFilter } from './helpers';
