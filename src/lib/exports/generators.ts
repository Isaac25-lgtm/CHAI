/**
 * CHAI PMTCT System - Export Data Generators
 *
 * Each function queries the database with proper scope filtering based on
 * the user's role and returns an array of flat row objects suitable for
 * Excel/CSV generation.
 */

import { db } from '@/lib/db';
import { getScopeFilter } from '@/lib/rbac';
import type { SessionUser } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

/** Formats a Date to a human-readable string, returns empty string for nulls. */
function fmtDate(d: Date | null | undefined): string {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

function fmtDateTime(d: Date | null | undefined): string {
  if (!d) return '';
  return new Date(d).toISOString().replace('T', ' ').slice(0, 19);
}

/**
 * Builds a Prisma `where` clause for facility-scoped entities based on the
 * user's geographic scope and optional filter params.
 */
function buildFacilityWhere(
  filters: Record<string, string>,
  user: SessionUser,
  facilityPath = 'facility',
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  const scope = getScopeFilter(user);

  // Scope restriction
  if (scope?.districtId) {
    if (facilityPath === 'facility') {
      where.facility = { districtId: scope.districtId };
    } else {
      where[facilityPath] = { districtId: scope.districtId };
    }
  } else if (scope?.regionId) {
    if (facilityPath === 'facility') {
      where.facility = { district: { regionId: scope.regionId } };
    } else {
      where[facilityPath] = { district: { regionId: scope.regionId } };
    }
  }

  // Common filters
  if (filters.districtId) {
    where.facility = { ...where.facility, districtId: filters.districtId };
  }
  if (filters.facilityId) {
    where.facilityId = filters.facilityId;
  }
  if (filters.dateFrom) {
    where.visitDate = { ...(where.visitDate || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.visitDate = {
      ...(where.visitDate || {}),
      lte: new Date(filters.dateTo + 'T23:59:59.999Z'),
    };
  }
  if (filters.status) {
    where.status = filters.status;
  }

  return where;
}

/**
 * Builds a visit-level where clause from filters + scope.
 */
function buildVisitWhere(filters: Record<string, string>, user: SessionUser) {
  return buildFacilityWhere(filters, user, 'facility');
}

// ---------------------------------------------------------------------------
// 1. Raw Assessment Export
// ---------------------------------------------------------------------------

export async function generateRawAssessmentExport(
  filters: Record<string, string>,
  user: SessionUser,
): Promise<Row[]> {
  const visitWhere = buildVisitWhere(filters, user);

  const responses = await db.assessmentResponse.findMany({
    where: {
      assessment: {
        visit: visitWhere,
      },
    },
    include: {
      question: {
        select: {
          questionCode: true,
          questionText: true,
          responseType: true,
          section: {
            select: { sectionNumber: true, title: true },
          },
        },
      },
      assessment: {
        select: {
          id: true,
          visit: {
            select: {
              visitNumber: true,
              visitDate: true,
              facility: {
                select: {
                  name: true,
                  district: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { assessment: { visit: { visitDate: 'desc' } } },
      { question: { section: { sectionNumber: 'asc' } } },
      { question: { sortOrder: 'asc' } },
    ],
  });

  return responses.map((r) => ({
    'Visit #': r.assessment.visit.visitNumber,
    'Date': fmtDate(r.assessment.visit.visitDate),
    'Facility': r.assessment.visit.facility.name,
    'District': r.assessment.visit.facility.district.name,
    'Section #': r.question.section.sectionNumber,
    'Section': r.question.section.title,
    'Question Code': r.question.questionCode,
    'Question': r.question.questionText,
    'Response Type': r.question.responseType,
    'Response Value': r.value ?? '',
    'Numeric Value': r.numericValue ?? '',
    'Evidence Notes': r.evidenceNotes ?? '',
  }));
}

// ---------------------------------------------------------------------------
// 2. Analyzed Assessment Export
// ---------------------------------------------------------------------------

export async function generateAnalyzedAssessmentExport(
  filters: Record<string, string>,
  user: SessionUser,
): Promise<Row[]> {
  const visitWhere = buildVisitWhere(filters, user);

  const scores = await db.domainScore.findMany({
    where: {
      assessment: {
        visit: visitWhere,
      },
    },
    include: {
      section: {
        select: { sectionNumber: true, title: true },
      },
      assessment: {
        select: {
          id: true,
          status: true,
          visit: {
            select: {
              visitNumber: true,
              visitDate: true,
              facility: {
                select: {
                  name: true,
                  district: { select: { name: true } },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [
      { assessment: { visit: { visitDate: 'desc' } } },
      { section: { sectionNumber: 'asc' } },
    ],
  });

  return scores.map((s) => {
    let criticalFlags = '';
    if (s.criticalFlags) {
      try {
        const parsed = JSON.parse(s.criticalFlags);
        criticalFlags = Array.isArray(parsed) ? parsed.join('; ') : String(s.criticalFlags);
      } catch {
        criticalFlags = String(s.criticalFlags);
      }
    }

    return {
      'Visit #': s.assessment.visit.visitNumber,
      'Date': fmtDate(s.assessment.visit.visitDate),
      'Facility': s.assessment.visit.facility.name,
      'District': s.assessment.visit.facility.district.name,
      'Assessment Status': s.assessment.status,
      'Section #': s.section.sectionNumber,
      'Section': s.section.title,
      'Raw Score': s.rawScore ?? '',
      'Max Score': s.maxScore ?? '',
      'Percentage': s.percentage != null ? `${s.percentage.toFixed(1)}%` : '',
      'Color Status': s.colorStatus,
      'Critical Flags': criticalFlags,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. Facility Summary Export
// ---------------------------------------------------------------------------

export async function generateFacilitySummaryExport(
  filters: Record<string, string>,
  user: SessionUser,
): Promise<Row[]> {
  const scope = getScopeFilter(user);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const facilityWhere: any = { isActive: true };
  if (scope?.districtId) {
    facilityWhere.districtId = scope.districtId;
  } else if (scope?.regionId) {
    facilityWhere.district = { regionId: scope.regionId };
  }
  if (filters.districtId) {
    facilityWhere.districtId = filters.districtId;
  }
  if (filters.facilityLevel) {
    facilityWhere.level = filters.facilityLevel;
  }

  const facilities = await db.facility.findMany({
    where: facilityWhere,
    include: {
      district: {
        select: { name: true, region: { select: { name: true } } },
      },
      visits: {
        orderBy: { visitDate: 'desc' },
        take: 1,
        select: {
          visitNumber: true,
          visitDate: true,
          status: true,
          visitSummary: {
            select: {
              overallStatus: true,
              redCount: true,
              yellowCount: true,
              lightGreenCount: true,
              darkGreenCount: true,
              totalScored: true,
              completionPct: true,
            },
          },
        },
      },
    },
    orderBy: [
      { district: { name: 'asc' } },
      { name: 'asc' },
    ],
  });

  return facilities.map((f) => {
    const lastVisit = f.visits[0];
    const summary = lastVisit?.visitSummary;

    return {
      'Facility': f.name,
      'Facility Code': f.code ?? '',
      'Level': f.level,
      'Ownership': f.ownership,
      'District': f.district.name,
      'Region': f.district.region.name,
      'Subcounty': f.subcounty ?? '',
      'Last Visit #': lastVisit?.visitNumber ?? '',
      'Last Visit Date': lastVisit ? fmtDate(lastVisit.visitDate) : '',
      'Visit Status': lastVisit?.status ?? '',
      'Overall Status': summary?.overallStatus ?? 'NOT_SCORED',
      'RED Count': summary?.redCount ?? 0,
      'YELLOW Count': summary?.yellowCount ?? 0,
      'LIGHT GREEN Count': summary?.lightGreenCount ?? 0,
      'DARK GREEN Count': summary?.darkGreenCount ?? 0,
      'Total Scored': summary?.totalScored ?? 0,
      'Completion %': summary?.completionPct != null ? `${summary.completionPct.toFixed(1)}%` : '',
    };
  });
}

// ---------------------------------------------------------------------------
// 4. District Summary Export
// ---------------------------------------------------------------------------

export async function generateDistrictSummaryExport(
  filters: Record<string, string>,
  user: SessionUser,
): Promise<Row[]> {
  const scope = getScopeFilter(user);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const districtWhere: any = {};
  if (scope?.districtId) {
    districtWhere.id = scope.districtId;
  } else if (scope?.regionId) {
    districtWhere.regionId = scope.regionId;
  }
  if (filters.districtId) {
    districtWhere.id = filters.districtId;
  }
  if (filters.regionId) {
    districtWhere.regionId = filters.regionId;
  }

  const districts = await db.district.findMany({
    where: districtWhere,
    include: {
      region: { select: { name: true } },
      facilities: {
        where: { isActive: true },
        select: { id: true },
      },
      districtAggregates: {
        orderBy: { period: 'desc' },
        take: 1,
      },
    },
    orderBy: { name: 'asc' },
  });

  return districts.map((d) => {
    const agg = d.districtAggregates[0];
    let topRedDomains = '';
    if (agg?.topRedDomains) {
      try {
        const parsed = JSON.parse(agg.topRedDomains);
        topRedDomains = Array.isArray(parsed) ? parsed.join('; ') : String(agg.topRedDomains);
      } catch {
        topRedDomains = String(agg.topRedDomains);
      }
    }

    return {
      'District': d.name,
      'District Code': d.code ?? '',
      'Region': d.region.name,
      'Active Facilities': d.facilities.length,
      'Period': agg?.period ?? '',
      'Facilities Assessed': agg?.facilitiesAssessed ?? 0,
      'Total Visits': agg?.totalVisits ?? 0,
      'Avg Completion %': agg?.avgCompletionPct != null ? `${agg.avgCompletionPct.toFixed(1)}%` : '',
      'Total RED Findings': agg?.totalRedFindings ?? 0,
      'Total YELLOW Findings': agg?.totalYellowFindings ?? 0,
      'Total GREEN Findings': agg?.totalGreenFindings ?? 0,
      'Top RED Domains': topRedDomains,
      'Open Actions': agg?.openActions ?? 0,
      'Overdue Actions': agg?.overdueActions ?? 0,
      'Completed Actions': agg?.completedActions ?? 0,
      'Names Entered': agg?.namesEntered ?? 0,
      'Payments Pending': agg?.paymentsPending ?? 0,
      'Payments Approved': agg?.paymentsApproved ?? 0,
      'Payments Paid': agg?.paymentsPaid ?? 0,
    };
  });
}

// ---------------------------------------------------------------------------
// 5. Action Plan Export
// ---------------------------------------------------------------------------

export async function generateActionPlanExport(
  filters: Record<string, string>,
  user: SessionUser,
): Promise<Row[]> {
  const scope = getScopeFilter(user);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (scope?.districtId) {
    where.visit = { facility: { districtId: scope.districtId } };
  } else if (scope?.regionId) {
    where.visit = { facility: { district: { regionId: scope.regionId } } };
  }
  if (filters.districtId) {
    where.visit = {
      ...where.visit,
      facility: { ...(where.visit?.facility || {}), districtId: filters.districtId },
    };
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.priority) {
    where.priority = filters.priority;
  }
  if (filters.dateFrom) {
    where.dueDate = { ...(where.dueDate || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.dueDate = {
      ...(where.dueDate || {}),
      lte: new Date(filters.dateTo + 'T23:59:59.999Z'),
    };
  }

  const actions = await db.actionPlan.findMany({
    where,
    include: {
      visit: {
        select: {
          visitNumber: true,
          visitDate: true,
          facility: {
            select: {
              name: true,
              district: { select: { name: true } },
            },
          },
        },
      },
      assignedTo: {
        select: { name: true, email: true },
      },
      createdBy: {
        select: { name: true },
      },
    },
    orderBy: [
      { priority: 'asc' },
      { dueDate: 'asc' },
    ],
  });

  return actions.map((a) => ({
    'Action Item': a.actionItem,
    'Visit #': a.visit.visitNumber,
    'Visit Date': fmtDate(a.visit.visitDate),
    'Facility': a.visit.facility.name,
    'District': a.visit.facility.district.name,
    'Domain': a.domainTitle ?? '',
    'Finding Color': a.findingColor ?? '',
    'Finding Summary': a.findingSummary ?? '',
    'Priority': a.priority,
    'Status': a.status,
    'Due Date': fmtDate(a.dueDate),
    'Assigned To': a.assignedTo?.name ?? '',
    'Owner Organization': a.ownerOrg ?? '',
    'Created By': a.createdBy.name,
    'Progress Notes': a.progressNotes ?? '',
    'Completed At': fmtDate(a.completedAt),
    'Created At': fmtDateTime(a.createdAt),
  }));
}

// ---------------------------------------------------------------------------
// 6. Names Registry Export
// ---------------------------------------------------------------------------

export async function generateNamesRegistryExport(
  filters: Record<string, string>,
  user: SessionUser,
): Promise<Row[]> {
  const scope = getScopeFilter(user);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (scope?.districtId) {
    where.visit = { facility: { districtId: scope.districtId } };
  } else if (scope?.regionId) {
    where.visit = { facility: { district: { regionId: scope.regionId } } };
  }
  if (filters.districtId) {
    where.visit = {
      ...where.visit,
      facility: { ...(where.visit?.facility || {}), districtId: filters.districtId },
    };
  }
  if (filters.verificationStatus) {
    where.verificationStatus = filters.verificationStatus;
  }
  if (filters.approvalStatus) {
    where.approvalStatus = filters.approvalStatus;
  }
  if (filters.eligibility) {
    where.eligibility = filters.eligibility;
  }
  if (filters.teamType) {
    where.teamType = filters.teamType;
  }

  const entries = await db.namesRegistryEntry.findMany({
    where,
    include: {
      visit: {
        select: {
          visitNumber: true,
          visitDate: true,
          facility: {
            select: {
              name: true,
              district: { select: { name: true } },
            },
          },
        },
      },
      paymentRecord: {
        select: { status: true, amount: true },
      },
      verifiedBy: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: [
      { createdAt: 'desc' },
    ],
  });

  return entries.map((e) => ({
    'Full Name': e.fullName,
    'Role': e.role ?? '',
    'Cadre': e.cadre ?? '',
    'Team Type': e.teamType,
    'Organization': e.organization ?? '',
    'District': e.districtName ?? e.visit.facility.district.name,
    'Facility': e.facilityName ?? e.visit.facility.name,
    'Visit #': e.visit.visitNumber,
    'Visit Date': fmtDate(e.visit.visitDate),
    'Phone': e.phone ?? '',
    'Network': e.network ?? '',
    'Eligibility': e.eligibility,
    'Verification Status': e.verificationStatus,
    'Verified By': e.verifiedBy?.name ?? '',
    'Verified At': fmtDateTime(e.verifiedAt),
    'Approval Status': e.approvalStatus,
    'Approved By': e.approvedBy?.name ?? '',
    'Approved At': fmtDateTime(e.approvedAt),
    'Payment Status': e.paymentRecord?.status ?? 'NO_RECORD',
    'Payment Amount': e.paymentRecord?.amount ?? '',
    'Is Duplicate': e.isDuplicate ? 'Yes' : 'No',
    'Notes': e.notes ?? '',
    'Created At': fmtDateTime(e.createdAt),
  }));
}

// ---------------------------------------------------------------------------
// 7. Payment Export
// ---------------------------------------------------------------------------

export async function generatePaymentExport(
  filters: Record<string, string>,
  user: SessionUser,
): Promise<Row[]> {
  const scope = getScopeFilter(user);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (scope?.districtId) {
    where.namesEntry = { visit: { facility: { districtId: scope.districtId } } };
  } else if (scope?.regionId) {
    where.namesEntry = { visit: { facility: { district: { regionId: scope.regionId } } } };
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.network) {
    where.network = filters.network;
  }
  if (filters.paymentCategory) {
    where.paymentCategory = filters.paymentCategory;
  }
  if (filters.dateFrom) {
    where.createdAt = { ...(where.createdAt || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.createdAt = {
      ...(where.createdAt || {}),
      lte: new Date(filters.dateTo + 'T23:59:59.999Z'),
    };
  }

  const payments = await db.paymentRecord.findMany({
    where,
    include: {
      namesEntry: {
        select: {
          fullName: true,
          role: true,
          teamType: true,
          districtName: true,
          facilityName: true,
          phone: true,
          network: true,
          eligibility: true,
          verificationStatus: true,
          approvalStatus: true,
          visit: {
            select: {
              visitNumber: true,
              visitDate: true,
              facility: {
                select: {
                  name: true,
                  district: { select: { name: true } },
                },
              },
            },
          },
        },
      },
      approvedBy: { select: { name: true } },
      paidBy: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return payments.map((p) => ({
    'Full Name': p.namesEntry.fullName,
    'Role': p.namesEntry.role ?? '',
    'Team Type': p.namesEntry.teamType,
    'District': p.namesEntry.districtName ?? p.namesEntry.visit.facility.district.name,
    'Facility': p.namesEntry.facilityName ?? p.namesEntry.visit.facility.name,
    'Visit #': p.namesEntry.visit.visitNumber,
    'Visit Date': fmtDate(p.namesEntry.visit.visitDate),
    'Phone': p.phone ?? p.namesEntry.phone ?? '',
    'Network': p.network ?? p.namesEntry.network ?? '',
    'Payment Category': p.paymentCategory,
    'Amount': p.amount ?? '',
    'Currency': p.currency,
    'Status': p.status,
    'Transaction Ref': p.transactionRef ?? '',
    'Approved By': p.approvedBy?.name ?? '',
    'Approved At': fmtDateTime(p.approvedAt),
    'Paid By': p.paidBy?.name ?? '',
    'Paid At': fmtDateTime(p.paidAt),
    'Reconciled At': fmtDateTime(p.reconciledAt),
    'Reconcile Note': p.reconcileNote ?? '',
    'Rejection Reason': p.rejectionReason ?? '',
    'Created At': fmtDateTime(p.createdAt),
  }));
}

// ---------------------------------------------------------------------------
// 8. Data Quality Export
// ---------------------------------------------------------------------------

export async function generateDataQualityExport(
  filters: Record<string, string>,
  user: SessionUser,
): Promise<Row[]> {
  const scope = getScopeFilter(user);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  // DataQualityFlag has a visitId field we can use for scoping
  if (scope?.districtId || scope?.regionId || filters.districtId) {
    // Get visit IDs in scope to filter by
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visitWhere: any = {};
    if (scope?.districtId) {
      visitWhere.facility = { districtId: scope.districtId };
    } else if (scope?.regionId) {
      visitWhere.facility = { district: { regionId: scope.regionId } };
    }
    if (filters.districtId) {
      visitWhere.facility = { ...(visitWhere.facility || {}), districtId: filters.districtId };
    }

    const visitIds = await db.visit.findMany({
      where: visitWhere,
      select: { id: true },
    });

    where.visitId = { in: visitIds.map((v) => v.id) };
  }

  if (filters.severity) {
    where.severity = filters.severity;
  }
  if (filters.flagType) {
    where.flagType = filters.flagType;
  }
  if (filters.isResolved === 'true') {
    where.isResolved = true;
  } else if (filters.isResolved === 'false') {
    where.isResolved = false;
  }

  const flags = await db.dataQualityFlag.findMany({
    where,
    orderBy: [
      { severity: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  return flags.map((f) => ({
    'Entity Type': f.entityType,
    'Entity ID': f.entityId ?? '',
    'Visit ID': f.visitId ?? '',
    'Flag Type': f.flagType,
    'Severity': f.severity,
    'Description': f.description,
    'Field Name': f.fieldName ?? '',
    'Current Value': f.currentValue ?? '',
    'Suggested Fix': f.suggestedFix ?? '',
    'Is Resolved': f.isResolved ? 'Yes' : 'No',
    'Resolved At': fmtDateTime(f.resolvedAt),
    'Resolve Note': f.resolveNote ?? '',
    'Created At': fmtDateTime(f.createdAt),
  }));
}

// ---------------------------------------------------------------------------
// 9. Audit Log Export
// ---------------------------------------------------------------------------

export async function generateAuditLogExport(
  filters: Record<string, string>,
  user: SessionUser,
): Promise<Row[]> {
  // Audit log is admin-only; scope filter not applied since only admins can access
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};

  if (filters.action) {
    where.action = filters.action;
  }
  if (filters.entity) {
    where.entity = filters.entity;
  }
  if (filters.userId) {
    where.userId = filters.userId;
  }
  if (filters.dateFrom) {
    where.createdAt = { ...(where.createdAt || {}), gte: new Date(filters.dateFrom) };
  }
  if (filters.dateTo) {
    where.createdAt = {
      ...(where.createdAt || {}),
      lte: new Date(filters.dateTo + 'T23:59:59.999Z'),
    };
  }

  const logs = await db.auditLog.findMany({
    where,
    include: {
      user: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10000, // Cap at 10k rows for export safety
  });

  return logs.map((log) => {
    let details = '';
    if (log.metadata) {
      try {
        details = JSON.stringify(JSON.parse(log.metadata), null, 0);
      } catch {
        details = String(log.metadata);
      }
    }

    return {
      'Timestamp': fmtDateTime(log.createdAt),
      'User': log.user?.name ?? 'System',
      'User Email': log.user?.email ?? '',
      'Action': log.action,
      'Entity': log.entity,
      'Entity ID': log.entityId ?? '',
      'Details': details,
      'IP Address': log.ipAddress ?? '',
    };
  });
}
