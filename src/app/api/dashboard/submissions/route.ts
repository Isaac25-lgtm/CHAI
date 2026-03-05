import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter } from '@/lib/rbac';
import type { ColorStatus, VisitStatus } from '@/types';

// ---------------------------------------------------------------------------
// GET /api/dashboard/submissions — paginated live submissions feed
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.DASHBOARD_LIVE_SUBMISSIONS);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const district = searchParams.get('district');
    const facilityLevel = searchParams.get('facilityLevel');
    const colorStatus = searchParams.get('colorStatus') as ColorStatus | null;

    const scope = getScopeFilter(user);

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      archivedAt: null,
      status: { in: ['SUBMITTED', 'REVIEWED'] as VisitStatus[] },
    };

    // Scope filter
    if (scope?.districtId) {
      where.facility = { districtId: scope.districtId };
    } else if (scope?.regionId) {
      where.facility = { district: { regionId: scope.regionId } };
    }

    // Date range filter
    if (dateFrom) {
      where.visitDate = { ...(where.visitDate || {}), gte: new Date(dateFrom) };
    }
    if (dateTo) {
      where.visitDate = { ...(where.visitDate || {}), lte: new Date(dateTo + 'T23:59:59.999Z') };
    }

    // District filter (explicit)
    if (district) {
      where.facility = { ...(where.facility || {}), districtId: district };
    }

    // Facility level filter
    if (facilityLevel) {
      where.facility = { ...(where.facility || {}), level: facilityLevel };
    }

    // Color status filter (applied on visitSummary)
    if (colorStatus) {
      where.visitSummary = { overallStatus: colorStatus };
    }

    const [visits, total] = await Promise.all([
      db.visit.findMany({
        where,
        include: {
          facility: {
            include: {
              district: { select: { id: true, name: true } },
            },
          },
          createdBy: {
            select: { id: true, name: true },
          },
          visitSummary: {
            select: {
              overallStatus: true,
              redCount: true,
              yellowCount: true,
              lightGreenCount: true,
              darkGreenCount: true,
              completionPct: true,
              criticalFlags: true,
            },
          },
        },
        orderBy: { submittedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.visit.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = visits.map((v: any) => {
      let criticalFlags: string[] = [];
      if (v.visitSummary?.criticalFlags) {
        try {
          criticalFlags = JSON.parse(v.visitSummary.criticalFlags);
        } catch {
          criticalFlags = [];
        }
      }

      return {
        visitId: v.id,
        visitNumber: v.visitNumber,
        timestamp: v.submittedAt ?? v.updatedAt,
        district: v.facility.district.name,
        districtId: v.facility.district.id,
        facility: v.facility.name,
        facilityLevel: v.facility.level,
        submittedBy: v.createdBy.name,
        completionStatus: v.status,
        overallColor: v.visitSummary?.overallStatus ?? 'NOT_SCORED',
        redCount: v.visitSummary?.redCount ?? 0,
        yellowCount: v.visitSummary?.yellowCount ?? 0,
        completionPct: v.visitSummary?.completionPct ?? 0,
        criticalFlags,
      };
    });

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/dashboard/submissions]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
