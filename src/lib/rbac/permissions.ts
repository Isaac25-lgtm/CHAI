/**
 * CHAI PMTCT System - Role-Based Access Control Permission Matrix
 *
 * Defines all granular permissions and maps them to each user role.
 * Permissions follow a resource.action naming convention.
 */

import type { UserRole } from '@/types';

// ---------------------------------------------------------------------------
// Permission constants
// ---------------------------------------------------------------------------

export const Permission = {
  // Users
  USERS_LIST: 'users.list',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',
  USERS_MANAGE_ROLES: 'users.manage_roles',

  // Facilities
  FACILITIES_LIST: 'facilities.list',
  FACILITIES_CREATE: 'facilities.create',
  FACILITIES_UPDATE: 'facilities.update',

  // Visits
  VISITS_LIST: 'visits.list',
  VISITS_CREATE: 'visits.create',
  VISITS_UPDATE: 'visits.update',
  VISITS_SUBMIT: 'visits.submit',
  VISITS_VIEW_ALL: 'visits.view_all',
  VISITS_VIEW_DISTRICT: 'visits.view_district',
  VISITS_VIEW_OWN: 'visits.view_own',

  // Assessments
  ASSESSMENTS_LIST: 'assessments.list',
  ASSESSMENTS_CREATE: 'assessments.create',
  ASSESSMENTS_UPDATE: 'assessments.update',
  ASSESSMENTS_SUBMIT: 'assessments.submit',
  ASSESSMENTS_VIEW_ALL: 'assessments.view_all',
  ASSESSMENTS_VIEW_DISTRICT: 'assessments.view_district',
  ASSESSMENTS_VIEW_OWN: 'assessments.view_own',

  // Action plans
  ACTIONS_LIST: 'actions.list',
  ACTIONS_CREATE: 'actions.create',
  ACTIONS_UPDATE: 'actions.update',
  ACTIONS_VIEW_ALL: 'actions.view_all',
  ACTIONS_VIEW_DISTRICT: 'actions.view_district',

  // Names registry
  NAMES_LIST: 'names.list',
  NAMES_CREATE: 'names.create',
  NAMES_VERIFY: 'names.verify',
  NAMES_APPROVE: 'names.approve',
  NAMES_VIEW_ALL: 'names.view_all',
  NAMES_VIEW_DISTRICT: 'names.view_district',

  // Payments
  PAYMENTS_LIST: 'payments.list',
  PAYMENTS_VERIFY: 'payments.verify',
  PAYMENTS_APPROVE: 'payments.approve',
  PAYMENTS_MARK_PAID: 'payments.mark_paid',
  PAYMENTS_EXPORT: 'payments.export',
  PAYMENTS_VIEW_ALL: 'payments.view_all',

  // Dashboard
  DASHBOARD_OVERVIEW: 'dashboard.overview',
  DASHBOARD_ANALYTICS: 'dashboard.analytics',
  DASHBOARD_LIVE_SUBMISSIONS: 'dashboard.live_submissions',

  // Exports
  EXPORTS_RAW: 'exports.raw',
  EXPORTS_ANALYZED: 'exports.analyzed',
  EXPORTS_FACILITY: 'exports.facility',
  EXPORTS_DISTRICT: 'exports.district',
  EXPORTS_NATIONAL: 'exports.national',
  EXPORTS_ACTION_PLAN: 'exports.action_plan',
  EXPORTS_NAMES: 'exports.names',
  EXPORTS_PAYMENT: 'exports.payment',
  EXPORTS_DATA_QUALITY: 'exports.data_quality',
  EXPORTS_AUDIT_LOG: 'exports.audit_log',

  // Audit
  AUDIT_VIEW: 'audit.view',

  // Settings
  SETTINGS_MANAGE: 'settings.manage',

  // Data quality
  DATA_QUALITY_VIEW: 'data_quality.view',
  DATA_QUALITY_RESOLVE: 'data_quality.resolve',
} as const;

/** Union type of every permission string */
export type PermissionString = (typeof Permission)[keyof typeof Permission];

// ---------------------------------------------------------------------------
// Convenience sets
// ---------------------------------------------------------------------------

const ALL_PERMISSIONS: ReadonlySet<string> = new Set(
  Object.values(Permission),
);

// ---------------------------------------------------------------------------
// Role → Permission mapping
// ---------------------------------------------------------------------------

/**
 * Immutable map from each UserRole to the set of permissions it grants.
 *
 * Design rationale:
 *  - SUPER_ADMIN  : unrestricted access to every feature.
 *  - NATIONAL_ADMIN: full operational access minus destructive settings and user deletion.
 *  - DISTRICT_SUPERVISOR: district-scoped operational access with verification rights.
 *  - FIELD_ASSESSOR: create/submit visits and assessments, view own data only.
 *  - FINANCE_OFFICER: full payment lifecycle, names listing for cross-referencing.
 *  - VIEWER: read-only dashboards and limited list views.
 */
export const ROLE_PERMISSIONS: Readonly<Record<UserRole, ReadonlySet<string>>> = {
  // -----------------------------------------------------------------------
  // SUPER_ADMIN — everything
  // -----------------------------------------------------------------------
  SUPER_ADMIN: ALL_PERMISSIONS,

  // -----------------------------------------------------------------------
  // NATIONAL_ADMIN — all except settings.manage and users.delete
  // -----------------------------------------------------------------------
  NATIONAL_ADMIN: new Set(
    [...ALL_PERMISSIONS].filter(
      (p) => p !== Permission.SETTINGS_MANAGE && p !== Permission.USERS_DELETE,
    ),
  ),

  // -----------------------------------------------------------------------
  // DISTRICT_SUPERVISOR
  // -----------------------------------------------------------------------
  DISTRICT_SUPERVISOR: new Set([
    // Users — can list, not manage
    Permission.USERS_LIST,

    // Facilities
    Permission.FACILITIES_LIST,
    Permission.FACILITIES_UPDATE,

    // Visits — district scope
    Permission.VISITS_LIST,
    Permission.VISITS_CREATE,
    Permission.VISITS_UPDATE,
    Permission.VISITS_SUBMIT,
    Permission.VISITS_VIEW_DISTRICT,

    // Assessments — district scope
    Permission.ASSESSMENTS_LIST,
    Permission.ASSESSMENTS_CREATE,
    Permission.ASSESSMENTS_UPDATE,
    Permission.ASSESSMENTS_SUBMIT,
    Permission.ASSESSMENTS_VIEW_DISTRICT,

    // Actions — district scope
    Permission.ACTIONS_LIST,
    Permission.ACTIONS_CREATE,
    Permission.ACTIONS_UPDATE,
    Permission.ACTIONS_VIEW_DISTRICT,

    // Names — can verify within district
    Permission.NAMES_LIST,
    Permission.NAMES_CREATE,
    Permission.NAMES_VERIFY,
    Permission.NAMES_VIEW_DISTRICT,

    // Payments — list only (no approve/pay)
    Permission.PAYMENTS_LIST,

    // Dashboard
    Permission.DASHBOARD_OVERVIEW,
    Permission.DASHBOARD_ANALYTICS,
    Permission.DASHBOARD_LIVE_SUBMISSIONS,

    // Exports — district-level and action plans
    Permission.EXPORTS_FACILITY,
    Permission.EXPORTS_DISTRICT,
    Permission.EXPORTS_ACTION_PLAN,
    Permission.EXPORTS_NAMES,

    // Data quality
    Permission.DATA_QUALITY_VIEW,
    Permission.DATA_QUALITY_RESOLVE,
  ]),

  // -----------------------------------------------------------------------
  // FIELD_ASSESSOR
  // -----------------------------------------------------------------------
  FIELD_ASSESSOR: new Set([
    // Facilities — list and create (assessors can add new facilities in the field)
    Permission.FACILITIES_LIST,
    Permission.FACILITIES_CREATE,

    // Visits — create, submit, view own
    Permission.VISITS_LIST,
    Permission.VISITS_CREATE,
    Permission.VISITS_UPDATE,
    Permission.VISITS_SUBMIT,
    Permission.VISITS_VIEW_OWN,

    // Assessments — create, submit, view own
    Permission.ASSESSMENTS_LIST,
    Permission.ASSESSMENTS_CREATE,
    Permission.ASSESSMENTS_UPDATE,
    Permission.ASSESSMENTS_SUBMIT,
    Permission.ASSESSMENTS_VIEW_OWN,

    // Actions — list and create (from assessment findings)
    Permission.ACTIONS_LIST,
    Permission.ACTIONS_CREATE,

    // Names — create entries
    Permission.NAMES_LIST,
    Permission.NAMES_CREATE,

    // Dashboard — overview only
    Permission.DASHBOARD_OVERVIEW,

    // Exports — facility-level only
    Permission.EXPORTS_FACILITY,
  ]),

  // -----------------------------------------------------------------------
  // FINANCE_OFFICER
  // -----------------------------------------------------------------------
  FINANCE_OFFICER: new Set([
    // Names — list for cross-referencing with payments
    Permission.NAMES_LIST,
    Permission.NAMES_VIEW_ALL,

    // Payments — full lifecycle
    Permission.PAYMENTS_LIST,
    Permission.PAYMENTS_VERIFY,
    Permission.PAYMENTS_APPROVE,
    Permission.PAYMENTS_MARK_PAID,
    Permission.PAYMENTS_EXPORT,
    Permission.PAYMENTS_VIEW_ALL,

    // Dashboard — overview and analytics for financial dashboards
    Permission.DASHBOARD_OVERVIEW,
    Permission.DASHBOARD_ANALYTICS,

    // Exports — payment-related
    Permission.EXPORTS_PAYMENT,
    Permission.EXPORTS_NAMES,
  ]),

  // -----------------------------------------------------------------------
  // VIEWER
  // -----------------------------------------------------------------------
  VIEWER: new Set([
    // Dashboard — read-only
    Permission.DASHBOARD_OVERVIEW,
    Permission.DASHBOARD_ANALYTICS,

    // List views only — no modifications
    Permission.FACILITIES_LIST,
    Permission.VISITS_LIST,
    Permission.ASSESSMENTS_LIST,
    Permission.ACTIONS_LIST,
    Permission.NAMES_LIST,
  ]),
};

// ---------------------------------------------------------------------------
// Utility: check if a permission string is valid
// ---------------------------------------------------------------------------

export function isValidPermission(value: string): value is PermissionString {
  return ALL_PERMISSIONS.has(value);
}

// ---------------------------------------------------------------------------
// Utility: get all permission strings as an array (useful for admin UIs)
// ---------------------------------------------------------------------------

export function getAllPermissions(): PermissionString[] {
  return Object.values(Permission);
}

// ---------------------------------------------------------------------------
// Utility: get permissions for a role
// ---------------------------------------------------------------------------

export function getPermissionsForRole(role: UserRole): ReadonlySet<string> {
  return ROLE_PERMISSIONS[role] ?? new Set();
}
