/**
 * CHAI PMTCT System - Derived Analytics Computation
 *
 * Functions to compute and update derived summary tables (VisitSummary,
 * DistrictAggregate). These are called after assessment submissions and
 * significant data changes to keep pre-aggregated views up to date.
 */

import { db } from './index';
import type { ColorStatus } from '@/types';

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

/**
 * Returns the current period string, e.g. "2026-Q1".
 */
export function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

/**
 * Derives period from a date.
 */
function getPeriodForDate(date: Date): string {
  const year = date.getFullYear();
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

// ---------------------------------------------------------------------------
// updateVisitSummary
// ---------------------------------------------------------------------------

/**
 * Reads all domain scores for the visit's assessment, computes summary
 * metrics, and upserts the VisitSummary record.
 *
 * Should be called after assessment scoring/submission.
 */
export async function updateVisitSummary(visitId: string): Promise<void> {
  // Find the latest assessment for this visit
  const assessment = await db.assessment.findFirst({
    where: { visitId },
    orderBy: { createdAt: 'desc' },
    include: {
      domainScores: {
        include: {
          section: {
            select: { title: true, sectionNumber: true },
          },
        },
      },
    },
  });

  if (!assessment) {
    // No assessment found; upsert an empty summary
    await db.visitSummary.upsert({
      where: { visitId },
      create: {
        visitId,
        overallStatus: 'NOT_SCORED',
        redCount: 0,
        yellowCount: 0,
        lightGreenCount: 0,
        darkGreenCount: 0,
        totalScored: 0,
        completionPct: 0,
        criticalFlags: null,
        topRedDomains: null,
        computedAt: new Date(),
      },
      update: {
        overallStatus: 'NOT_SCORED',
        redCount: 0,
        yellowCount: 0,
        lightGreenCount: 0,
        darkGreenCount: 0,
        totalScored: 0,
        completionPct: 0,
        criticalFlags: null,
        topRedDomains: null,
        computedAt: new Date(),
      },
    });
    return;
  }

  const scores = assessment.domainScores;

  // Count by color status
  let redCount = 0;
  let yellowCount = 0;
  let lightGreenCount = 0;
  let darkGreenCount = 0;
  const criticalFlags: string[] = [];
  const redDomains: string[] = [];

  for (const score of scores) {
    switch (score.colorStatus) {
      case 'RED':
        redCount++;
        redDomains.push(score.section.title);
        break;
      case 'YELLOW':
        yellowCount++;
        break;
      case 'LIGHT_GREEN':
        lightGreenCount++;
        break;
      case 'DARK_GREEN':
        darkGreenCount++;
        break;
      default:
        break;
    }

    // Parse critical flags from each domain score
    if (score.criticalFlags) {
      try {
        const flags = JSON.parse(score.criticalFlags) as string[];
        criticalFlags.push(...flags);
      } catch {
        // If not JSON, treat as a single flag
        criticalFlags.push(score.criticalFlags);
      }
    }
  }

  const totalScored = redCount + yellowCount + lightGreenCount + darkGreenCount;

  // Determine overall status
  let overallStatus: ColorStatus = 'NOT_SCORED';
  if (totalScored > 0) {
    if (redCount > 0) {
      overallStatus = 'RED';
    } else if (yellowCount > 0) {
      overallStatus = 'YELLOW';
    } else if (lightGreenCount >= darkGreenCount) {
      overallStatus = 'LIGHT_GREEN';
    } else {
      overallStatus = 'DARK_GREEN';
    }
  }

  await db.visitSummary.upsert({
    where: { visitId },
    create: {
      visitId,
      overallStatus,
      redCount,
      yellowCount,
      lightGreenCount,
      darkGreenCount,
      totalScored,
      completionPct: assessment.completionPct,
      criticalFlags: criticalFlags.length > 0 ? JSON.stringify(criticalFlags) : null,
      topRedDomains: redDomains.length > 0 ? JSON.stringify(redDomains) : null,
      computedAt: new Date(),
    },
    update: {
      overallStatus,
      redCount,
      yellowCount,
      lightGreenCount,
      darkGreenCount,
      totalScored,
      completionPct: assessment.completionPct,
      criticalFlags: criticalFlags.length > 0 ? JSON.stringify(criticalFlags) : null,
      topRedDomains: redDomains.length > 0 ? JSON.stringify(redDomains) : null,
      computedAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// updateDistrictAggregates
// ---------------------------------------------------------------------------

/**
 * Aggregates all visits in the district for the given period. Counts
 * facilities assessed, visit totals, color findings, action plan statuses,
 * names entries, and payment statuses. Upserts a DistrictAggregate record.
 *
 * Should be called after significant data changes (visit submission,
 * action plan status change, payment status change, etc.).
 */
export async function updateDistrictAggregates(
  districtId: string,
  period?: string,
): Promise<void> {
  const targetPeriod = period ?? getCurrentPeriod();

  // Parse period to determine date range
  const { startDate, endDate } = parsePeriodRange(targetPeriod);

  // Use a transaction to ensure consistent reads
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await db.$transaction(async (tx: any) => {
    // 1. Count facilities assessed and total visits
    const visits = await tx.visit.findMany({
      where: {
        facility: { districtId },
        visitDate: { gte: startDate, lte: endDate },
        status: { in: ['SUBMITTED', 'REVIEWED'] },
        archivedAt: null,
      },
      select: {
        id: true,
        facilityId: true,
        visitSummary: {
          select: {
            redCount: true,
            yellowCount: true,
            lightGreenCount: true,
            darkGreenCount: true,
            completionPct: true,
          },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueFacilities = new Set(visits.map((v: any) => v.facilityId));
    const totalVisits = visits.length;
    const facilitiesAssessed = uniqueFacilities.size;

    // Aggregate color findings from visit summaries
    let totalRedFindings = 0;
    let totalYellowFindings = 0;
    let totalGreenFindings = 0;
    let totalCompletionPct = 0;
    let summariesCounted = 0;

    for (const visit of visits) {
      if (visit.visitSummary) {
        totalRedFindings += visit.visitSummary.redCount;
        totalYellowFindings += visit.visitSummary.yellowCount;
        totalGreenFindings += visit.visitSummary.lightGreenCount + visit.visitSummary.darkGreenCount;
        totalCompletionPct += visit.visitSummary.completionPct;
        summariesCounted++;
      }
    }

    const avgCompletionPct = summariesCounted > 0
      ? Math.round((totalCompletionPct / summariesCounted) * 100) / 100
      : 0;

    // Identify top red domains across all visits
    const domainRedCounts: Record<string, number> = {};
    for (const visit of visits) {
      // Fetch domain scores for red sections
      const redScores = await tx.domainScore.findMany({
        where: {
          assessment: { visitId: visit.id },
          colorStatus: 'RED',
        },
        select: {
          section: { select: { title: true } },
        },
      });

      for (const score of redScores) {
        const title = score.section.title;
        domainRedCounts[title] = (domainRedCounts[title] ?? 0) + 1;
      }
    }

    const topRedDomains = Object.entries(domainRedCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([title, count]) => ({ title, count }));

    // 2. Count action plan statuses for the district
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visitIds = visits.map((v: any) => v.id);

    const [openActions, overdueActions, completedActions] = await Promise.all([
      tx.actionPlan.count({
        where: {
          visitId: { in: visitIds },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          archivedAt: null,
        },
      }),
      tx.actionPlan.count({
        where: {
          visitId: { in: visitIds },
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueDate: { lt: new Date() },
          archivedAt: null,
        },
      }),
      tx.actionPlan.count({
        where: {
          visitId: { in: visitIds },
          status: 'COMPLETED',
          archivedAt: null,
        },
      }),
    ]);

    // 3. Count names entries for the district visits
    const namesEntered = await tx.namesRegistryEntry.count({
      where: {
        visitId: { in: visitIds },
        archivedAt: null,
      },
    });

    // 4. Count payments by status
    const [paymentsPending, paymentsApproved, paymentsPaid] = await Promise.all([
      tx.paymentRecord.count({
        where: {
          namesEntry: { visitId: { in: visitIds } },
          status: { in: ['DRAFT', 'SUBMITTED', 'VERIFIED'] },
        },
      }),
      tx.paymentRecord.count({
        where: {
          namesEntry: { visitId: { in: visitIds } },
          status: 'APPROVED',
        },
      }),
      tx.paymentRecord.count({
        where: {
          namesEntry: { visitId: { in: visitIds } },
          status: { in: ['PAID', 'RECONCILED'] },
        },
      }),
    ]);

    // Upsert district aggregate
    await tx.districtAggregate.upsert({
      where: {
        districtId_period: { districtId, period: targetPeriod },
      },
      create: {
        districtId,
        period: targetPeriod,
        facilitiesAssessed,
        totalVisits,
        avgCompletionPct,
        totalRedFindings,
        totalYellowFindings,
        totalGreenFindings,
        topRedDomains: topRedDomains.length > 0 ? JSON.stringify(topRedDomains) : null,
        openActions,
        overdueActions,
        completedActions,
        namesEntered,
        paymentsPending,
        paymentsApproved,
        paymentsPaid,
        computedAt: new Date(),
      },
      update: {
        facilitiesAssessed,
        totalVisits,
        avgCompletionPct,
        totalRedFindings,
        totalYellowFindings,
        totalGreenFindings,
        topRedDomains: topRedDomains.length > 0 ? JSON.stringify(topRedDomains) : null,
        openActions,
        overdueActions,
        completedActions,
        namesEntered,
        paymentsPending,
        paymentsApproved,
        paymentsPaid,
        computedAt: new Date(),
      },
    });
  });
}

// ---------------------------------------------------------------------------
// refreshAllAggregates
// ---------------------------------------------------------------------------

/**
 * Refreshes all district aggregates for the current period.
 * Intended for admin use or scheduled job execution.
 */
export async function refreshAllAggregates(): Promise<void> {
  const period = getCurrentPeriod();

  const districts = await db.district.findMany({
    select: { id: true },
  });

  // Process districts sequentially to avoid overwhelming the database
  for (const district of districts) {
    try {
      await updateDistrictAggregates(district.id, period);
    } catch (error) {
      console.error(
        `[DERIVED] Failed to update aggregates for district ${district.id}:`,
        error,
      );
      // Continue with other districts even if one fails
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parses a period string like "2026-Q1" into start and end dates.
 */
function parsePeriodRange(period: string): { startDate: Date; endDate: Date } {
  const match = period.match(/^(\d{4})-Q(\d)$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const quarter = parseInt(match[2], 10);
    const startMonth = (quarter - 1) * 3;
    const startDate = new Date(year, startMonth, 1);
    const endDate = new Date(year, startMonth + 3, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  // Fallback: try "YYYY-MM" format
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = parseInt(monthMatch[1], 10);
    const month = parseInt(monthMatch[2], 10) - 1;
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
    return { startDate, endDate };
  }

  // Default to current quarter
  const now = new Date();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
  const startMonth = (currentQuarter - 1) * 3;
  const startDate = new Date(now.getFullYear(), startMonth, 1);
  const endDate = new Date(now.getFullYear(), startMonth + 3, 0, 23, 59, 59, 999);
  return { startDate, endDate };
}
