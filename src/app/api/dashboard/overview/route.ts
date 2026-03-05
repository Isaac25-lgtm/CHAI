import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter } from '@/lib/rbac';

// ---------------------------------------------------------------------------
// GET /api/dashboard/overview — aggregated dashboard KPIs, charts, trends
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.DASHBOARD_OVERVIEW);

    const scope = getScopeFilter(user);

    // Build base where clause for visits (scope-aware)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visitWhere: any = {
      archivedAt: null,
      status: { in: ['SUBMITTED', 'REVIEWED'] },
    };

    if (scope?.districtId) {
      visitWhere.facility = { districtId: scope.districtId };
    } else if (scope?.regionId) {
      visitWhere.facility = { district: { regionId: scope.regionId } };
    }

    // Today boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Draft visits where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const draftWhere: any = {
      archivedAt: null,
      status: 'DRAFT',
    };
    if (scope?.districtId) {
      draftWhere.facility = { districtId: scope.districtId };
    } else if (scope?.regionId) {
      draftWhere.facility = { district: { regionId: scope.regionId } };
    }

    // --- Parallel KPI queries ---
    const [
      allSubmittedVisits,
      submissionsToday,
      draftsPending,
      openActions,
      overdueActions,
    ] = await Promise.all([
      // All submitted visits with summaries
      db.visit.findMany({
        where: visitWhere,
        select: {
          id: true,
          facilityId: true,
          visitDate: true,
          facility: {
            select: {
              districtId: true,
              district: { select: { id: true, name: true } },
            },
          },
          visitSummary: {
            select: {
              overallStatus: true,
              redCount: true,
              yellowCount: true,
              lightGreenCount: true,
              darkGreenCount: true,
              completionPct: true,
            },
          },
        },
      }),

      // Submissions today
      db.visit.count({
        where: {
          ...visitWhere,
          submittedAt: { gte: todayStart, lte: todayEnd },
        },
      }),

      // Drafts pending
      db.visit.count({ where: draftWhere }),

      // Open actions
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

      // Overdue actions
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
    ]);

    // --- Compute KPIs from fetched visits ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniqueFacilities = new Set(allSubmittedVisits.map((v: any) => v.facilityId));
    const facilitiesAssessed = uniqueFacilities.size;

    let totalRedFindings = 0;
    let totalYellowFindings = 0;
    let totalLightGreenFindings = 0;
    let totalDarkGreenFindings = 0;
    let totalCompletionPct = 0;
    let summariesCounted = 0;

    for (const visit of allSubmittedVisits) {
      if (visit.visitSummary) {
        totalRedFindings += visit.visitSummary.redCount;
        totalYellowFindings += visit.visitSummary.yellowCount;
        totalLightGreenFindings += visit.visitSummary.lightGreenCount;
        totalDarkGreenFindings += visit.visitSummary.darkGreenCount;
        totalCompletionPct += visit.visitSummary.completionPct;
        summariesCounted++;
      }
    }

    const totalGreen = totalLightGreenFindings + totalDarkGreenFindings;
    const totalFindings = totalRedFindings + totalYellowFindings + totalGreen;
    const avgPerformance = totalFindings > 0
      ? Math.round((totalGreen / totalFindings) * 100)
      : 0;

    // --- Submissions by district ---
    const districtCounts: Record<string, { name: string; count: number }> = {};
    for (const visit of allSubmittedVisits) {
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

    // --- Top problem domains (RED + YELLOW counts per section) ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const domainScopeWhere: any = {};
    if (scope?.districtId) {
      domainScopeWhere.assessment = { visit: { facility: { districtId: scope.districtId } } };
    } else if (scope?.regionId) {
      domainScopeWhere.assessment = { visit: { facility: { district: { regionId: scope.regionId } } } };
    }

    const problemDomains = await db.domainScore.groupBy({
      by: ['sectionId'],
      where: {
        colorStatus: { in: ['RED', 'YELLOW'] },
        ...domainScopeWhere,
      },
      _count: { id: true },
    });

    // Fetch section titles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sectionIds = problemDomains.map((d: any) => d.sectionId);
    const sections = sectionIds.length > 0
      ? await db.assessmentSection.findMany({
          where: { id: { in: sectionIds } },
          select: { id: true, title: true, sectionNumber: true },
        })
      : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sectionMap: Map<string, { id: string; title: string; sectionNumber: number }> = new Map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      sections.map((s: any) => [s.id, s]),
    );
    const topProblemDomains = problemDomains
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((d: any) => ({
        sectionId: d.sectionId,
        sectionTitle: sectionMap.get(d.sectionId)?.title ?? 'Unknown',
        sectionNumber: sectionMap.get(d.sectionId)?.sectionNumber ?? 0,
        count: d._count.id,
      }))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 10);

    // --- Trend data (last 30 days, grouped by date) ---
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentVisits = allSubmittedVisits.filter(
      (v: any) => new Date(v.visitDate) >= thirtyDaysAgo,
    );

    const trendMap: Record<string, { totalScore: number; count: number; submissions: number }> = {};
    for (const visit of recentVisits) {
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
      .map(([date, data]) => ({
        date,
        avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
        submissions: data.submissions,
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
