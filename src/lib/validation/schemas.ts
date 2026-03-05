import { z } from 'zod';

// ============================================================
// ENUM VALUES
// ============================================================

const UserRole = [
  'SUPER_ADMIN',
  'NATIONAL_ADMIN',
  'DISTRICT_SUPERVISOR',
  'FIELD_ASSESSOR',
  'FINANCE_OFFICER',
  'VIEWER',
] as const;

const FacilityLevel = [
  'HC_II',
  'HC_III',
  'HC_IV',
  'GENERAL_HOSPITAL',
  'REGIONAL_REFERRAL',
  'NATIONAL_REFERRAL',
] as const;

const OwnershipType = ['GOVERNMENT', 'PNFP', 'PRIVATE'] as const;

const TeamType = ['CENTRAL', 'DISTRICT', 'FACILITY', 'PARTNER', 'OTHER'] as const;

const AttendanceStatus = ['PRESENT', 'PARTIAL', 'ABSENT'] as const;

const ActionPriority = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;

const MobileNetwork = ['MTN', 'AIRTEL', 'OTHER'] as const;

const PaymentCategory = ['TRANSPORT', 'PER_DIEM', 'FACILITATION', 'OTHER'] as const;

// ============================================================
// SHARED VALIDATORS
// ============================================================

const ugandaPhoneRegex = /^(0[3,4,7,8][0-9]{8}|\+256[3,4,7,8][0-9]{8})$/;

const ugandaPhone = z
  .string()
  .regex(ugandaPhoneRegex, 'Invalid Uganda phone number')
  .or(z.literal(''));

const optionalUgandaPhone = z
  .string()
  .regex(ugandaPhoneRegex, 'Invalid Uganda phone number')
  .or(z.literal(''))
  .optional()
  .nullable();

// ============================================================
// 1. LOGIN SCHEMA
// ============================================================

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ============================================================
// 2. USER SCHEMAS
// ============================================================

export const createUserSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(UserRole, {
    message: 'Invalid user role',
  }),
  districtId: z.string().optional().nullable(),
  regionId: z.string().optional().nullable(),
  phone: optionalUgandaPhone,
  organization: z.string().optional().nullable(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  id: z.string().min(1, 'User ID is required'),
  name: z.string().min(1, 'Name cannot be empty').optional(),
  email: z.string().email('Invalid email format').optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .optional(),
  role: z.enum(UserRole).optional(),
  districtId: z.string().optional().nullable(),
  regionId: z.string().optional().nullable(),
  phone: optionalUgandaPhone,
  organization: z.string().optional().nullable(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ============================================================
// 3. FACILITY SCHEMA
// ============================================================

export const facilitySchema = z.object({
  name: z
    .string()
    .min(1, 'Facility name is required'),
  level: z.enum(FacilityLevel, {
    message: 'Invalid facility level',
  }),
  ownership: z.enum(OwnershipType, {
    message: 'Invalid ownership type',
  }),
  districtId: z
    .string()
    .min(1, 'District is required'),
  subcounty: z.string().optional().nullable(),
  implementingPartner: z.string().optional().nullable(),
  inChargeName: z.string().optional().nullable(),
  inChargePhone: optionalUgandaPhone,
});

export type FacilityInput = z.infer<typeof facilitySchema>;

// ============================================================
// 4. VISIT SCHEMA
// ============================================================

export const visitSchema = z.object({
  facilityId: z
    .string()
    .min(1, 'Facility is required'),
  visitDate: z.coerce.date({
    message: 'Invalid date',
  }),
  activityName: z.string().optional().nullable(),
  mentorshipCycle: z.string().optional().nullable(),
  reportingPeriod: z.string().optional().nullable(),
  facilityInCharge: z.string().optional().nullable(),
  inChargePhone: optionalUgandaPhone,
  notes: z.string().max(2000, 'Notes cannot exceed 2000 characters').optional().nullable(),
});

export type VisitInput = z.infer<typeof visitSchema>;

// ============================================================
// 5. PARTICIPANT SCHEMA
// ============================================================

export const participantSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required'),
  role: z.string().optional().nullable(),
  cadre: z.string().optional().nullable(),
  teamType: z.enum(TeamType, {
    message: 'Invalid team type',
  }),
  organization: z.string().optional().nullable(),
  phone: optionalUgandaPhone,
  attendanceStatus: z.enum(AttendanceStatus, {
    message: 'Invalid attendance status',
  }),
  remarks: z.string().max(500, 'Remarks cannot exceed 500 characters').optional().nullable(),
});

export type ParticipantInput = z.infer<typeof participantSchema>;

// ============================================================
// 6. ACTION PLAN SCHEMA
// ============================================================

export const actionPlanSchema = z.object({
  actionItem: z
    .string()
    .min(1, 'Action item is required')
    .max(500, 'Action item cannot exceed 500 characters'),
  priority: z.enum(ActionPriority, {
    message: 'Invalid priority level',
  }),
  assignedToId: z.string().optional().nullable(),
  ownerOrg: z.string().optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  progressNotes: z
    .string()
    .max(1000, 'Progress notes cannot exceed 1000 characters')
    .optional()
    .nullable(),
});

export type ActionPlanInput = z.infer<typeof actionPlanSchema>;

// ============================================================
// 7. NAMES REGISTRY SCHEMA
// ============================================================

export const namesRegistrySchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required'),
  role: z.string().optional().nullable(),
  cadre: z.string().optional().nullable(),
  teamType: z.enum(TeamType, {
    message: 'Invalid team type',
  }),
  organization: z.string().optional().nullable(),
  phone: optionalUgandaPhone,
  network: z.enum(MobileNetwork).optional().nullable(),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional().nullable(),
});

export type NamesRegistryInput = z.infer<typeof namesRegistrySchema>;

// ============================================================
// 8. PAYMENT SCHEMA
// ============================================================

export const paymentSchema = z.object({
  paymentCategory: z.enum(PaymentCategory, {
    message: 'Invalid payment category',
  }),
  amount: z
    .number({ message: 'Amount must be a number' })
    .positive('Amount must be a positive number'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(ugandaPhoneRegex, 'Invalid Uganda phone number'),
  network: z.enum(MobileNetwork, {
    message: 'Invalid mobile network',
  }),
  transactionRef: z.string().optional().nullable(),
});

export type PaymentInput = z.infer<typeof paymentSchema>;
