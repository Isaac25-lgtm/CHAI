/**
 * CHAI PMTCT System - Server-side RBAC helpers
 *
 * All functions in this module are safe to call from Server Components,
 * Route Handlers, and Server Actions. They never reference browser APIs.
 */

import type { SessionUser, UserRole } from '@/types';
import { ROLE_PERMISSIONS } from './permissions';

// ---------------------------------------------------------------------------
// Core permission checks
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the user's role grants the given permission.
 */
export function hasPermission(user: SessionUser, permission: string): boolean {
  const perms = ROLE_PERMISSIONS[user.role];
  if (!perms) return false;
  return perms.has(permission);
}

/**
 * Returns `true` if the user holds **at least one** of the listed permissions.
 */
export function hasAnyPermission(
  user: SessionUser,
  permissions: string[],
): boolean {
  const perms = ROLE_PERMISSIONS[user.role];
  if (!perms) return false;
  return permissions.some((p) => perms.has(p));
}

/**
 * Returns `true` if the user holds **every** listed permission.
 */
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

/**
 * Throws an error if `user` is null/undefined or lacks the specified permission.
 * Use this at the top of route handlers / server actions for a concise guard.
 *
 * @throws {Error} with a descriptive message suitable for logging (never leaks
 *   internal details to the client — callers should map to a 403 response).
 */
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
// Geographic scope checks
// ---------------------------------------------------------------------------

/** Roles that are never restricted to a specific district. */
const UNRESTRICTED_DISTRICT_ROLES: ReadonlySet<UserRole> = new Set([
  'SUPER_ADMIN',
  'NATIONAL_ADMIN',
]);

/**
 * Can the user access data belonging to `districtId`?
 *
 * - SUPER_ADMIN / NATIONAL_ADMIN: always.
 * - FINANCE_OFFICER: always (needs cross-district payment visibility).
 * - DISTRICT_SUPERVISOR / FIELD_ASSESSOR: only when their own districtId matches.
 * - VIEWER: only when their assigned districtId matches (null districtId means
 *   no district access — viewers must be explicitly assigned).
 */
export function canAccessDistrict(
  user: SessionUser,
  districtId: string,
): boolean {
  if (UNRESTRICTED_DISTRICT_ROLES.has(user.role)) {
    return true;
  }

  if (user.role === 'FINANCE_OFFICER') {
    return true;
  }

  // District-scoped roles
  return user.districtId === districtId;
}

/**
 * Can the user access data belonging to a facility in `facilityDistrictId`?
 * Facility access is derived from district access.
 */
export function canAccessFacility(
  user: SessionUser,
  facilityDistrictId: string,
): boolean {
  return canAccessDistrict(user, facilityDistrictId);
}

// ---------------------------------------------------------------------------
// Scope filters for database queries
// ---------------------------------------------------------------------------

export interface ScopeFilter {
  districtId?: string;
  regionId?: string;
}

/**
 * Returns a filter object to append to database queries so that users only
 * see data they are authorised to access.
 *
 * - SUPER_ADMIN / NATIONAL_ADMIN: `null` (no filter — see everything).
 * - FINANCE_OFFICER: `null` (cross-district payment access).
 * - District-scoped roles: `{ districtId }` when assigned, otherwise an
 *   impossible filter (empty string) to prevent data leakage.
 * - VIEWER: `{ districtId }` when assigned, `{ regionId }` as fallback,
 *   otherwise impossible filter.
 */
export function getScopeFilter(user: SessionUser): ScopeFilter | null {
  if (UNRESTRICTED_DISTRICT_ROLES.has(user.role)) {
    return null;
  }

  if (user.role === 'FINANCE_OFFICER') {
    return null;
  }

  // DISTRICT_SUPERVISOR, FIELD_ASSESSOR
  if (user.role === 'DISTRICT_SUPERVISOR' || user.role === 'FIELD_ASSESSOR') {
    return { districtId: user.districtId ?? '' };
  }

  // VIEWER — prefer district, fall back to region
  if (user.role === 'VIEWER') {
    if (user.districtId) {
      return { districtId: user.districtId };
    }
    if (user.regionId) {
      return { regionId: user.regionId };
    }
    // No geographic assignment — return impossible filter to prevent leakage
    return { districtId: '' };
  }

  // Unknown role — deny by default
  return { districtId: '' };
}

// ---------------------------------------------------------------------------
// Role category helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the user is a SUPER_ADMIN or NATIONAL_ADMIN.
 */
export function isAdmin(user: SessionUser): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'NATIONAL_ADMIN';
}

/**
 * Returns `true` if the user is a FINANCE_OFFICER.
 */
export function isFinance(user: SessionUser): boolean {
  return user.role === 'FINANCE_OFFICER';
}
