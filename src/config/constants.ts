export const APP_NAME = 'CHAI Uganda PMTCT Platform';
export const APP_DESCRIPTION = 'National Facility Assessment & Mentorship Operations System';
export const APP_ORG = 'Clinton Health Access Initiative (CHAI)';

export const FACILITY_LEVELS: Record<string, string> = {
  HC_II: 'Health Centre II',
  HC_III: 'Health Centre III',
  HC_IV: 'Health Centre IV',
  GENERAL_HOSPITAL: 'General Hospital',
  REGIONAL_REFERRAL: 'Regional Referral Hospital',
  NATIONAL_REFERRAL: 'National Referral Hospital',
};

export const OWNERSHIP_TYPES: Record<string, string> = {
  GOVERNMENT: 'Government (GoU)',
  PNFP: 'Private Not-for-Profit (PNFP)',
  PRIVATE: 'Private',
};

export const TEAM_TYPES: Record<string, string> = {
  CENTRAL: 'Central Team',
  DISTRICT: 'District Team',
  FACILITY: 'Facility Team',
  PARTNER: 'Partner',
  OTHER: 'Other',
};

export const ATTENDANCE_LABELS: Record<string, string> = {
  PRESENT: 'Present',
  PARTIAL: 'Partial',
  ABSENT: 'Absent',
};

export const COLOR_STATUS_CONFIG: Record<string, { label: string; description: string; bgClass: string; textClass: string; dotClass: string; borderClass: string }> = {
  RED: {
    label: 'Red',
    description: 'Critical gap / capability absent / severe service risk',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    dotClass: 'bg-red-500',
    borderClass: 'border-red-200',
  },
  YELLOW: {
    label: 'Yellow',
    description: 'Partial / inconsistent / incomplete / weak reliability',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    dotClass: 'bg-amber-500',
    borderClass: 'border-amber-200',
  },
  LIGHT_GREEN: {
    label: 'Light Green',
    description: 'Functioning but not fully institutionalized',
    bgClass: 'bg-emerald-50',
    textClass: 'text-emerald-700',
    dotClass: 'bg-emerald-400',
    borderClass: 'border-emerald-200',
  },
  DARK_GREEN: {
    label: 'Dark Green',
    description: 'Strong / consistent / institutionalized / best-practice',
    bgClass: 'bg-green-50',
    textClass: 'text-green-800',
    dotClass: 'bg-green-600',
    borderClass: 'border-green-300',
  },
  NOT_SCORED: {
    label: 'Not Scored',
    description: 'Descriptive section, not scored',
    bgClass: 'bg-gray-50',
    textClass: 'text-gray-500',
    dotClass: 'bg-gray-400',
    borderClass: 'border-gray-200',
  },
};

export const ACTION_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
};

export const ACTION_PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  VERIFIED: 'Verified',
  APPROVED: 'Approved',
  PAID: 'Paid',
  RECONCILED: 'Reconciled',
};

export const MOBILE_NETWORKS: Record<string, string> = {
  MTN: 'MTN Uganda',
  AIRTEL: 'Airtel Uganda',
  OTHER: 'Other',
};

export const PAYMENT_CATEGORIES: Record<string, string> = {
  TRANSPORT: 'Transport',
  PER_DIEM: 'Per Diem',
  FACILITATION: 'Facilitation',
  OTHER: 'Other',
};

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  NATIONAL_ADMIN: 'National Admin',
  DISTRICT_SUPERVISOR: 'District Supervisor',
  FIELD_ASSESSOR: 'Field Assessor',
  FINANCE_OFFICER: 'Finance Officer',
  VIEWER: 'Viewer',
};

export const USER_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended',
};

export const ASSESSMENT_SECTIONS = [
  { number: 1, title: 'ANC / Maternity / PNC Registers', paradigm: 'MATURITY_LADDER' },
  { number: 2, title: 'Patient / Beneficiary Records', paradigm: 'MATURITY_LADDER' },
  { number: 3, title: 'Triple Elimination Testing', paradigm: 'PERCENTAGE_BASED' },
  { number: 4, title: 'Triple Elimination Linkage to Treatment', paradigm: 'PERCENTAGE_BASED' },
  { number: 5, title: 'ART in PMTCT Facilities / Quality of Services', paradigm: 'COMPOSITE' },
  { number: 6, title: 'Patient Tracking (HIV+ Pregnant Women)', paradigm: 'MATURITY_LADDER' },
  { number: 7, title: 'Adherence Support', paradigm: 'MATURITY_LADDER' },
  { number: 8, title: 'Facility Linkage to Community Care & Support', paradigm: 'MATURITY_LADDER' },
  { number: 9, title: 'STI Screening & Management', paradigm: 'COUNT_BASED' },
  { number: 10, title: 'Early Infant Diagnosis (EID)', paradigm: 'COMPOSITE' },
  { number: 11, title: 'CTX for HIV-Exposed Infants', paradigm: 'COUNT_BASED' },
  { number: 12, title: 'Tracking HIV-Exposed Infants', paradigm: 'MATURITY_LADDER' },
  { number: 13, title: 'Enrolment of HIV-Infected Infants into ART', paradigm: 'COUNT_BASED' },
  { number: 14, title: 'HEI / EID Registers', paradigm: 'MATURITY_LADDER' },
  { number: 15, title: 'Supply Chain Reliability', paradigm: 'COMPOSITE' },
  { number: 16, title: 'Human Resources & Service Delivery Points', paradigm: 'DESCRIPTIVE' },
] as const;

export const ITEMS_PER_PAGE = 20;
