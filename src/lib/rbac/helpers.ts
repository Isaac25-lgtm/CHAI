/**
 * CHAI PMTCT System - Server-side RBAC helpers
 *
 * Simplified two-role model: SUPERUSER (full access) vs ASSESSOR (own data).
 * All functions are safe for Server Components, Route Handlers, and Server Actions.
 */

import type { SessionUser } from '@/types';
import { isSuperuser, isAssessor } from '@/types';
import { ROLE_PERMISSIONS } from './permissions';

// ---------------------------------------------------------------------------
// Core permission checks
// ---------------------------------------------------------------------------

export function hasPermission(user: SessionUser, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[user.role];
  if (!perms) return false;
  return perms.has(permission);
}

export function hasAnyPermission(
  user: SessionUser,
  permissions: string[],
): boolean {
  const perms = ROLE_PERMISSIONS[user.role];
  if (!perms) return false;
  return permissions.some((p) => perms.has(p));
}

export function hasAllPermissions(
  user: SessionUser,
  permissions: string[],
): boolean {
  const perms = ROLE_PERMISSIONS[user.role];
  if (!perms) return false;
  return permissions.every((p) => perms.has(p));
}

// ---------------------------------------------------------------------------
// Imperative guard — throws on failure
// ---------------------------------------------------------------------------

export function requirePermission(
  user: SessionUser | null,
  permission: string,
): void {
  if (!user) {
    throw new Error('Authentication required');
  }
  if (!hasPermission(user, permission)) {
    throw new Error(
      `Forbidden: role "${user.role}" does not grant "${permission}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// Geographic scope checks (simplified for two-role model)
// ---------------------------------------------------------------------------

/**
 * Can the user access data belonging to `districtId`?
 * - SUPERUSER (SUPER_ADMIN, NATIONAL_ADMIN): always.
 * - ASSESSOR (FIELD_ASSESSOR): always (they travel to facilities across districts).
 * - All others: only when districtId matches.
 */
export function canAccessDistrict(
  user: SessionUser,
  districtId: string,
): boolean {
  if (isSuperuser(user)) return true;
  if (isAssessor(user)) return true;
  return user.districtId === districtId;
}

export function canAccessFacility(
  user: SessionUser,
  facilityDistrictId: string,
): boolean {
  return canAccessDistrict(user, facilityDistrictId);
}

/**
 * Check if a record was created by the current user.
 * Used for assessor-scoped access to own records.
 */
export function isOwnRecord(user: SessionUser, createdById: string): boolean {
  return user.id === createdById;
}

// ---------------------------------------------------------------------------
// Scope filters for database queries
// ---------------------------------------------------------------------------

export interface ScopeFilter {
  districtId?: string;
  regionId?: string;
  createdById?: string;
}

/**
 * Returns a filter to append to DB queries for data scoping.
 * - SUPERUSER: null (no filter).
 * - ASSESSOR: filter by createdById (own records only).
 */
export function getScopeFilter(user: SessionUser): ScopeFilter | null {
  if (isSuperuser(user)) return null;

  // Assessor sees only own records
  return { createdById: user.id };
}

/**
 * Returns a district-based scope filter (for facility/visit queries).
 * - SUPERUSER: null.
 * - ASSESSOR: filter by districtId if assigned, otherwise by createdById.
 */
export function getDistrictScopeFilter(user: SessionUser): ScopeFilter | null {
  if (isSuperuser(user)) return null;

  if (user.districtId) {
    return { districtId: user.districtId };
  }
  return { createdById: user.id };
}

// ---------------------------------------------------------------------------
// Role category helpers
// ---------------------------------------------------------------------------

export { isSuperuser } from '@/types';
export { isAssessor } from '@/types';

/**
 * @deprecated Use isSuperuser() instead
 */
export function isAdmin(user: SessionUser): boolean {
  return isSuperuser(user);
}

/**
 * @deprecated Finance is treated as superuser-level access in simplified model
 */
export function isFinance(user: SessionUser): boolean {
  return isSuperuser(user);
}
