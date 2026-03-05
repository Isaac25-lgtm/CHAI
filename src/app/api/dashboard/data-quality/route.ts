import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter } from '@/lib/rbac';
import type { DataQualitySeverity, DataQualityType } from '@/types';

// ---------------------------------------------------------------------------
// GET /api/dashboard/data-quality — paginated data quality flags
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.DATA_QUALITY_VIEW);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));
    const severity = searchParams.get('severity') as DataQualitySeverity | null;
    const flagType = searchParams.get('type') as DataQualityType | null;
    const resolved = searchParams.get('resolved');

    const scope = getScopeFilter(user);

    // Build where clause
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Severity filter
    if (severity) {
      where.severity = severity;
    }

    // Type filter
    if (flagType) {
      where.flagType = flagType;
    }

    // Resolved filter
    if (resolved === 'true') {
      where.isResolved = true;
    } else if (resolved === 'false') {
      where.isResolved = false;
    }

    // Scope filter: we need to join through visit -> facility -> district
    // DataQualityFlag has visitId, so we filter on the visit's facility district
    if (scope?.districtId) {
      // Get visit IDs in scope
      const scopedVisits = await db.visit.findMany({
        where: {
          facility: { districtId: scope.districtId },
          archivedAt: null,
        },
        select: { id: true },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where.visitId = { in: scopedVisits.map((v: any) => v.id) };
    } else if (scope?.regionId) {
      const scopedVisits = await db.visit.findMany({
        where: {
          facility: { district: { regionId: scope.regionId } },
          archivedAt: null,
        },
        select: { id: true },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      where.visitId = { in: scopedVisits.map((v: any) => v.id) };
    }

    // Build a base scope where (without filter overrides) for KPI counts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const scopeOnly: any = {};
    if (where.visitId) scopeOnly.visitId = where.visitId;

    // KPI counts (all in scope, not filtered by severity/type/resolved)
    const [totalIssues, highSeverity, unresolved, resolvedCount, flags, totalFiltered] = await Promise.all([
      db.dataQualityFlag.count({ where: scopeOnly }),
      db.dataQualityFlag.count({ where: { ...scopeOnly, severity: 'HIGH' } }),
      db.dataQualityFlag.count({ where: { ...scopeOnly, isResolved: false } }),
      db.dataQualityFlag.count({ where: { ...scopeOnly, isResolved: true } }),
      // Paginated filtered list
      db.dataQualityFlag.findMany({
        where,
        orderBy: [
          { severity: 'asc' }, // HIGH first
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.dataQualityFlag.count({ where }),
    ]);

    // Fetch visit/facility info for each flag
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visitIds = [...new Set(flags.map((f: any) => f.visitId).filter(Boolean))] as string[];
    const visits = visitIds.length > 0
      ? await db.visit.findMany({
          where: { id: { in: visitIds } },
          select: {
            id: true,
            visitNumber: true,
            facility: {
              select: { name: true, district: { select: { name: true } } },
            },
          },
        })
      : [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visitMap: Map<string, any> = new Map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      visits.map((v: any) => [v.id, v]),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = flags.map((f: any) => {
      const visit = f.visitId ? visitMap.get(f.visitId) : null;
      return {
        id: f.id,
        flagType: f.flagType,
        severity: f.severity,
        description: f.description,
        fieldName: f.fieldName,
        currentValue: f.currentValue,
        suggestedFix: f.suggestedFix,
        isResolved: f.isResolved,
        resolvedAt: f.resolvedAt,
        createdAt: f.createdAt,
        visitId: f.visitId,
        visitNumber: visit?.visitNumber ?? null,
        facilityName: visit?.facility?.name ?? null,
        districtName: visit?.facility?.district?.name ?? null,
      };
    });

    return NextResponse.json({
      kpis: {
        totalIssues,
        highSeverity,
        unresolved,
        resolved: resolvedCount,
      },
      data,
      total: totalFiltered,
      page,
      pageSize,
      totalPages: Math.ceil(totalFiltered / pageSize),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/dashboard/data-quality]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
