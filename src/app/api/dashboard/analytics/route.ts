import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter } from '@/lib/rbac';

// ---------------------------------------------------------------------------
// GET /api/dashboard/analytics — domain breakdown, heatmap, facility ranking
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.DASHBOARD_ANALYTICS);

    const { searchParams } = request.nextUrl;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const district = searchParams.get('district');

    const scope = getScopeFilter(user);

    // Build base scope for domain scores
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const domainWhere: any = {
      assessment: {
        status: { in: ['SUBMITTED', 'REVIEWED'] },
        visit: {
          archivedAt: null,
          status: { in: ['SUBMITTED', 'REVIEWED'] },
        },
      },
    };

    if (scope?.districtId) {
      domainWhere.assessment.visit.facility = { districtId: scope.districtId };
    } else if (scope?.regionId) {
      domainWhere.assessment.visit.facility = { district: { regionId: scope.regionId } };
    }

    if (dateFrom) {
      domainWhere.assessment.visit.visitDate = {
        ...(domainWhere.assessment.visit.visitDate || {}),
        gte: new Date(dateFrom),
      };
    }
    if (dateTo) {
      domainWhere.assessment.visit.visitDate = {
        ...(domainWhere.assessment.visit.visitDate || {}),
        lte: new Date(dateTo + 'T23:59:59.999Z'),
      };
    }
    if (district) {
      domainWhere.assessment.visit.facility = {
        ...(domainWhere.assessment.visit.facility || {}),
        districtId: district,
      };
    }

    // --- 1. Domain Breakdown: section -> color counts ---
    const domainScores = await db.domainScore.findMany({
      where: domainWhere,
      select: {
        sectionId: true,
        colorStatus: true,
        section: {
          select: { sectionNumber: true, title: true },
        },
      },
    });

    // Build domain breakdown
    const domainBreakdownMap: Record<string, {
      sectionNumber: number;
      title: string;
      RED: number;
      YELLOW: number;
      LIGHT_GREEN: number;
      DARK_GREEN: number;
      NOT_SCORED: number;
      total: number;
    }> = {};

    for (const score of domainScores) {
      const key = score.sectionId;
      if (!domainBreakdownMap[key]) {
        domainBreakdownMap[key] = {
          sectionNumber: score.section.sectionNumber,
          title: score.section.title,
          RED: 0,
          YELLOW: 0,
          LIGHT_GREEN: 0,
          DARK_GREEN: 0,
          NOT_SCORED: 0,
          total: 0,
        };
      }
      (domainBreakdownMap[key] as unknown as Record<string, number>)[score.colorStatus]++;
      domainBreakdownMap[key].total++;
    }

    const domainBreakdown = Object.values(domainBreakdownMap)
      .sort((a, b) => a.sectionNumber - b.sectionNumber);

    // --- 2. District x Domain Heatmap ---
    // Fetch domain scores with district info
    const heatmapScores = await db.domainScore.findMany({
      where: domainWhere,
      select: {
        sectionId: true,
        colorStatus: true,
        percentage: true,
        section: {
          select: { sectionNumber: true, title: true },
        },
        assessment: {
          select: {
            visit: {
              select: {
                facility: {
                  select: {
                    district: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Build heatmap: district -> section -> dominant color
    const heatmapData: Record<string, Record<string, {
      colorCounts: Record<string, number>;
      avgPct: number;
      total: number;
      totalPct: number;
    }>> = {};

    const allSections: Record<string, { number: number; title: string }> = {};

    for (const score of heatmapScores) {
      const districtId = score.assessment.visit.facility.district.id;
      const districtName = score.assessment.visit.facility.district.name;
      const sectionKey = `S${score.section.sectionNumber}`;

      allSections[sectionKey] = { number: score.section.sectionNumber, title: score.section.title };

      const dKey = `${districtId}|${districtName}`;
      if (!heatmapData[dKey]) {
        heatmapData[dKey] = {};
      }
      if (!heatmapData[dKey][sectionKey]) {
        heatmapData[dKey][sectionKey] = { colorCounts: {}, avgPct: 0, total: 0, totalPct: 0 };
      }

      const cell = heatmapData[dKey][sectionKey];
      cell.colorCounts[score.colorStatus] = (cell.colorCounts[score.colorStatus] ?? 0) + 1;
      cell.totalPct += score.percentage ?? 0;
      cell.total++;
    }

    // Convert to final format
    const districtHeatmap = Object.entries(heatmapData).map(([dKey, sections]) => {
      const [districtId, districtName] = dKey.split('|');
      const sectionResults: Record<string, { dominantColor: string; avgPct: number }> = {};

      for (const [sKey, cell] of Object.entries(sections)) {
        // Determine dominant color
        let dominantColor = 'NOT_SCORED';
        let maxCount = 0;
        for (const [color, count] of Object.entries(cell.colorCounts)) {
          if (count > maxCount) {
            maxCount = count;
            dominantColor = color;
          }
        }
        sectionResults[sKey] = {
          dominantColor,
          avgPct: cell.total > 0 ? Math.round(cell.totalPct / cell.total) : 0,
        };
      }

      return { districtId, districtName, sections: sectionResults };
    });

    const sectionsList = Object.entries(allSections)
      .sort((a, b) => a[1].number - b[1].number)
      .map(([key, val]) => ({ key, ...val }));

    // --- 3. Facility Comparison ---
    // Build visit where for facility comparison
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
    if (dateFrom) {
      visitWhere.visitDate = { ...(visitWhere.visitDate || {}), gte: new Date(dateFrom) };
    }
    if (dateTo) {
      visitWhere.visitDate = { ...(visitWhere.visitDate || {}), lte: new Date(dateTo + 'T23:59:59.999Z') };
    }
    if (district) {
      visitWhere.facility = { ...(visitWhere.facility || {}), districtId: district };
    }

    const facilityVisits = await db.visit.findMany({
      where: visitWhere,
      select: {
        facilityId: true,
        facility: {
          select: {
            name: true,
            level: true,
            district: { select: { name: true } },
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
    });

    // Aggregate by facility
    const facilityMap: Record<string, {
      name: string;
      level: string;
      district: string;
      visits: number;
      totalGreen: number;
      totalFindings: number;
      totalCompletion: number;
      summaryCount: number;
      redCount: number;
    }> = {};

    for (const v of facilityVisits) {
      if (!facilityMap[v.facilityId]) {
        facilityMap[v.facilityId] = {
          name: v.facility.name,
          level: v.facility.level,
          district: v.facility.district.name,
          visits: 0,
          totalGreen: 0,
          totalFindings: 0,
          totalCompletion: 0,
          summaryCount: 0,
          redCount: 0,
        };
      }
      const f = facilityMap[v.facilityId];
      f.visits++;
      if (v.visitSummary) {
        const green = v.visitSummary.lightGreenCount + v.visitSummary.darkGreenCount;
        const total = v.visitSummary.redCount + v.visitSummary.yellowCount + green;
        f.totalGreen += green;
        f.totalFindings += total;
        f.totalCompletion += v.visitSummary.completionPct;
        f.summaryCount++;
        f.redCount += v.visitSummary.redCount;
      }
    }

    const facilityComparison = Object.entries(facilityMap)
      .map(([id, f]) => ({
        facilityId: id,
        name: f.name,
        level: f.level,
        district: f.district,
        visits: f.visits,
        performancePct: f.totalFindings > 0 ? Math.round((f.totalGreen / f.totalFindings) * 100) : 0,
        avgCompletion: f.summaryCount > 0 ? Math.round(f.totalCompletion / f.summaryCount) : 0,
        redCount: f.redCount,
      }))
      .sort((a, b) => b.performancePct - a.performancePct)
      .slice(0, 50);

    // --- 4. Trend data (last 90 days) ---
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const trendVisits = await db.visit.findMany({
      where: {
        ...visitWhere,
        visitDate: { gte: ninetyDaysAgo },
      },
      select: {
        visitDate: true,
        visitSummary: {
          select: { completionPct: true },
        },
      },
      orderBy: { visitDate: 'asc' },
    });

    const trendMap: Record<string, { totalScore: number; count: number; submissions: number }> = {};
    for (const v of trendVisits) {
      const week = getWeekKey(new Date(v.visitDate));
      if (!trendMap[week]) {
        trendMap[week] = { totalScore: 0, count: 0, submissions: 0 };
      }
      trendMap[week].submissions++;
      if (v.visitSummary) {
        trendMap[week].totalScore += v.visitSummary.completionPct;
        trendMap[week].count++;
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
      domainBreakdown,
      districtHeatmap,
      sections: sectionsList,
      facilityComparison,
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
    console.error('[GET /api/dashboard/analytics]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Returns ISO week key like "2026-W10" */
function getWeekKey(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}
