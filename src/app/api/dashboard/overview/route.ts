import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter } from '@/lib/rbac';

// ---------------------------------------------------------------------------
// GET /api/dashboard/overview — aggregated dashboard KPIs, charts, trends
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.DASHBOARD_OVERVIEW);

    const scope = getScopeFilter(user);

    // Scope-aware facility filter fragment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const facilityScope: any = scope?.districtId
      ? { facility: { districtId: scope.districtId } }
      : scope?.regionId
        ? { facility: { district: { regionId: scope.regionId } } }
        : {};

    // Today boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Base where for submitted/reviewed visits
    const submittedWhere = {
      archivedAt: null,
      status: { in: ['SUBMITTED', 'REVIEWED'] as const },
      ...facilityScope,
    };

    // --- All queries in parallel ---
    const [
      facilitiesAssessed,
      submissionsToday,
      draftsPending,
      openActions,
      overdueActions,
      summaryAgg,
      problemDomains,
      recentVisits,
    ] = await Promise.all([
      // 1. Count distinct facilities with submitted visits
      db.visit.findMany({
        where: submittedWhere,
        select: { facilityId: true },
        distinct: ['facilityId'],
      }).then((rows: { facilityId: string }[]) => rows.length),

      // 2. Submissions today
      db.visit.count({
        where: {
          ...submittedWhere,
          submittedAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      // 3. Drafts pending
      db.visit.count({
        where: { archivedAt: null, status: 'DRAFT', ...facilityScope },
      }),

      // 4. Open actions
      db.actionPlan.count({
        where: {
          archivedAt: null,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          ...(scope?.districtId
            ? { visit: { facility: { districtId: scope.districtId } } }
            : scope?.regionId
              ? { visit: { facility: { district: { regionId: scope.regionId } } } }
              : {}),
        },
      }),

      // 5. Overdue actions
      db.actionPlan.count({
        where: {
          archivedAt: null,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueDate: { lt: new Date() },
          ...(scope?.districtId
            ? { visit: { facility: { districtId: scope.districtId } } }
            : scope?.regionId
              ? { visit: { facility: { district: { regionId: scope.regionId } } } }
              : {}),
        },
      }),

      // 6. Aggregate visit summaries (color counts + completion)
      db.visitSummary.aggregate({
        where: {
          visit: submittedWhere,
        },
        _sum: {
          redCount: true,
          yellowCount: true,
          lightGreenCount: true,
          darkGreenCount: true,
          completionPct: true,
        },
        _count: { id: true },
      }),

      // 7. Top problem domains (grouped)
      db.domainScore.groupBy({
        by: ['sectionId'],
        where: {
          colorStatus: { in: ['RED', 'YELLOW'] },
          ...(scope?.districtId
            ? { assessment: { visit: { facility: { districtId: scope.districtId } } } }
            : scope?.regionId
              ? { assessment: { visit: { facility: { district: { regionId: scope.regionId } } } } }
              : {}),
        },
        _count: { id: true },
      }),

      // 8. Recent visits for trend + district chart (lightweight select)
      db.visit.findMany({
        where: submittedWhere,
        select: {
          visitDate: true,
          facility: {
            select: {
              district: { select: { id: true, name: true } },
            },
          },
          visitSummary: {
            select: { completionPct: true },
          },
        },
      }),
    ]);

    // --- Compute KPIs from aggregates ---
    const totalRedFindings = summaryAgg._sum.redCount ?? 0;
    const totalYellowFindings = summaryAgg._sum.yellowCount ?? 0;
    const totalLightGreenFindings = summaryAgg._sum.lightGreenCount ?? 0;
    const totalDarkGreenFindings = summaryAgg._sum.darkGreenCount ?? 0;

    const totalGreen = totalLightGreenFindings + totalDarkGreenFindings;
    const totalFindings = totalRedFindings + totalYellowFindings + totalGreen;
    const avgPerformance = totalFindings > 0
      ? Math.round((totalGreen / totalFindings) * 100)
      : 0;

    // --- Submissions by district ---
    const districtCounts: Record<string, { name: string; count: number }> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const visit of recentVisits as any[]) {
      const dId = visit.facility.district.id;
      const dName = visit.facility.district.name;
      if (!districtCounts[dId]) {
        districtCounts[dId] = { name: dName, count: 0 };
      }
      districtCounts[dId].count++;
    }
    const submissionsByDistrict = Object.values(districtCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // --- Color distribution ---
    const colorDistribution = {
      RED: totalRedFindings,
      YELLOW: totalYellowFindings,
      LIGHT_GREEN: totalLightGreenFindings,
      DARK_GREEN: totalDarkGreenFindings,
    };

    // --- Top problem domains ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sectionIds = problemDomains.map((d: any) => d.sectionId);
    const sections = sectionIds.length > 0
      ? await db.assessmentSection.findMany({
          where: { id: { in: sectionIds } },
          select: { id: true, title: true, sectionNumber: true },
        })
      : [];

    const sectionMap = new Map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sections as any[]).map((s) => [s.id, s]),
    );
    const topProblemDomains = problemDomains
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((d: any) => ({
        sectionId: d.sectionId,
        sectionTitle: sectionMap.get(d.sectionId)?.title ?? 'Unknown',
        sectionNumber: sectionMap.get(d.sectionId)?.sectionNumber ?? 0,
        count: d._count.id,
      }))
      .sort((a: { count: number }, b: { count: number }) => b.count - a.count)
      .slice(0, 10);

    // --- Trend data (last 30 days) ---
    const trendMap: Record<string, { totalScore: number; count: number; submissions: number }> = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const visit of recentVisits as any[]) {
      if (new Date(visit.visitDate) < thirtyDaysAgo) continue;
      const dateStr = new Date(visit.visitDate).toISOString().split('T')[0];
      if (!trendMap[dateStr]) {
        trendMap[dateStr] = { totalScore: 0, count: 0, submissions: 0 };
      }
      trendMap[dateStr].submissions++;
      if (visit.visitSummary) {
        trendMap[dateStr].totalScore += visit.visitSummary.completionPct;
        trendMap[dateStr].count++;
      }
    }

    const trendData = Object.entries(trendMap)
      .map(([date, d]) => ({
        date,
        avgScore: d.count > 0 ? Math.round(d.totalScore / d.count) : 0,
        submissions: d.submissions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      facilitiesAssessed,
      submissionsToday,
      draftsPending,
      totalRedFindings,
      totalYellowFindings,
      avgPerformance,
      openActions,
      overdueActions,
      submissionsByDistrict,
      colorDistribution,
      topProblemDomains,
      trendData,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/dashboard/overview]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
