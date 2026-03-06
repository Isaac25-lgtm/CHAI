// Re-export Prisma types where needed, plus UI-specific types

// Legacy roles kept for schema/DB compatibility — DO NOT use in active app logic
export type LegacyUserRole = 'SUPER_ADMIN' | 'NATIONAL_ADMIN' | 'DISTRICT_SUPERVISOR' | 'FIELD_ASSESSOR' | 'FINANCE_OFFICER' | 'VIEWER';

// Active roles used throughout the application
export type ActiveRole = 'SUPER_ADMIN' | 'FIELD_ASSESSOR';

// UserRole is the full union (needed for DB/Prisma compat), but active UI logic
// should branch on isSuperuser() / isAssessor() helpers.
export type UserRole = LegacyUserRole;

export type ColorStatus = 'RED' | 'YELLOW' | 'LIGHT_GREEN' | 'DARK_GREEN' | 'NOT_SCORED';

export type VisitStatus = 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'ARCHIVED';

export type AssessmentStatus = 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'REVIEWED' | 'ARCHIVED';

export type TeamType = 'CENTRAL' | 'DISTRICT' | 'FACILITY' | 'PARTNER' | 'OTHER';

export type AttendanceStatus = 'PRESENT' | 'PARTIAL' | 'ABSENT';

export type FacilityLevel = 'HC_II' | 'HC_III' | 'HC_IV' | 'GENERAL_HOSPITAL' | 'REGIONAL_REFERRAL' | 'NATIONAL_REFERRAL';

export type OwnershipType = 'GOVERNMENT' | 'PNFP' | 'PRIVATE';

export type ActionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'CANCELLED';

export type PaymentStatus = 'DRAFT' | 'SUBMITTED' | 'VERIFIED' | 'APPROVED' | 'PAID' | 'RECONCILED';

export type PaymentCategory = 'TRANSPORT' | 'PER_DIEM' | 'FACILITATION' | 'OTHER';

export type MobileNetwork = 'MTN' | 'AIRTEL' | 'OTHER';

export type EligibilityStatus = 'ELIGIBLE' | 'INELIGIBLE' | 'PENDING_REVIEW';

export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'FLAGGED' | 'REJECTED';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ON_HOLD';

export type ResponseType = 'YES_NO' | 'YES_NO_NA' | 'NUMERIC' | 'TEXT' | 'DROPDOWN' | 'MULTI_SELECT' | 'SAMPLED_ROWS' | 'DATE';

export type ScoringParadigm = 'MATURITY_LADDER' | 'PERCENTAGE_BASED' | 'COUNT_BASED' | 'DESCRIPTIVE' | 'COMPOSITE';

export type DataQualitySeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type DataQualityType = 'MISSING_VALUE' | 'IMPOSSIBLE_VALUE' | 'DUPLICATE_ENTRY' | 'INCOMPLETE_SECTION' | 'MISSING_EVIDENCE' | 'INVALID_FORMAT' | 'ORPHAN_RECORD' | 'ANOMALY';

export type ExportFormat = 'EXCEL' | 'CSV' | 'PDF' | 'PNG';

export type ExportType = 'RAW_ASSESSMENT' | 'ANALYZED_ASSESSMENT' | 'FACILITY_SUMMARY' | 'DISTRICT_SUMMARY' | 'NATIONAL_SUMMARY' | 'ACTION_PLAN' | 'NAMES_REGISTRY' | 'PAYMENT' | 'DATA_QUALITY' | 'AUDIT_LOG';

// Session user type for auth
export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  regionId: string | null;
  districtId: string | null;
}

// Active role helpers
export function isSuperuser(user: SessionUser): boolean {
  return user.role === 'SUPER_ADMIN' || user.role === 'NATIONAL_ADMIN';
}

export function isAssessor(user: SessionUser): boolean {
  return user.role === 'FIELD_ASSESSOR';
}

// Navigation item type
export interface NavItem {
  title: string;
  href: string;
  icon: string;
  roles: UserRole[];
  children?: NavItem[];
}

// Dashboard KPI card
export interface KPICard {
  title: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon: string;
  href?: string;
}

// Filter state
export interface DashboardFilters {
  dateFrom?: string;
  dateTo?: string;
  regionId?: string;
  districtId?: string;
  facilityId?: string;
  facilityLevel?: FacilityLevel;
  ownership?: OwnershipType;
  visitStatus?: VisitStatus;
  colorStatus?: ColorStatus;
  sectionNumber?: number;
  paymentStatus?: PaymentStatus;
}

// Pagination
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
