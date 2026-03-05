import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, canAccessFacility } from '@/lib/rbac';
import type { FacilityLevel, OwnershipType } from '@/types';

// ---------------------------------------------------------------------------
// GET /api/facilities/[id] — single facility with details
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.FACILITIES_LIST);

    const { id } = await params;

    const facility = await db.facility.findUnique({
      where: { id },
      include: {
        district: {
          include: { region: true },
        },
        visits: {
          orderBy: { visitDate: 'desc' },
          take: 10,
          select: {
            id: true,
            visitNumber: true,
            visitDate: true,
            status: true,
            createdBy: {
              select: { id: true, name: true },
            },
            visitSummary: {
              select: { overallStatus: true, completionPct: true },
            },
          },
        },
      },
    });

    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    // District-scope check
    if (!canAccessFacility(user, facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Count total visits
    const totalVisits = await db.visit.count({
      where: { facilityId: id },
    });

    // Count action plans linked to this facility's visits
    const actionPlans = await db.actionPlan.findMany({
      where: {
        visit: { facilityId: id },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        actionItem: true,
        priority: true,
        status: true,
        dueDate: true,
        findingColor: true,
        domainTitle: true,
        assignedTo: {
          select: { id: true, name: true },
        },
        visit: {
          select: { visitNumber: true, visitDate: true },
        },
        createdAt: true,
      },
    });

    // Determine latest overall status from most recent visit
    const latestVisit = facility.visits[0] ?? null;
    const latestOverallStatus = latestVisit?.visitSummary?.overallStatus ?? null;
    const lastVisitDate = latestVisit?.visitDate ?? null;

    return NextResponse.json({
      facility: {
        id: facility.id,
        name: facility.name,
        code: facility.code,
        level: facility.level,
        ownership: facility.ownership,
        districtId: facility.districtId,
        districtName: facility.district.name,
        regionId: facility.district.regionId,
        regionName: facility.district.region.name,
        subcounty: facility.subcounty,
        parish: facility.parish,
        village: facility.village,
        implementingPartner: facility.implementingPartner,
        inChargeName: facility.inChargeName,
        inChargePhone: facility.inChargePhone,
        inChargeEmail: facility.inChargeEmail,
        latitude: facility.latitude,
        longitude: facility.longitude,
        isActive: facility.isActive,
        createdAt: facility.createdAt,
        updatedAt: facility.updatedAt,
      },
      stats: {
        totalVisits,
        lastVisitDate,
        latestOverallStatus,
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recentVisits: facility.visits.map((v: any) => ({
        id: v.id,
        visitNumber: v.visitNumber,
        visitDate: v.visitDate,
        status: v.status,
        overallStatus: v.visitSummary?.overallStatus ?? null,
        completionPct: v.visitSummary?.completionPct ?? null,
        assessorName: v.createdBy.name,
        assessorId: v.createdBy.id,
      })),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      actionPlans: actionPlans.map((a: any) => ({
        id: a.id,
        actionItem: a.actionItem,
        priority: a.priority,
        status: a.status,
        dueDate: a.dueDate,
        findingColor: a.findingColor,
        domainTitle: a.domainTitle,
        assignedToName: a.assignedTo?.name ?? null,
        visitNumber: a.visit.visitNumber,
        visitDate: a.visit.visitDate,
        createdAt: a.createdAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/facilities/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/facilities/[id] — update facility metadata
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.FACILITIES_UPDATE);

    const { id } = await params;

    const existing = await db.facility.findUnique({
      where: { id },
      select: { id: true, districtId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    if (!canAccessFacility(user, existing.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    const validLevels: FacilityLevel[] = [
      'HC_II', 'HC_III', 'HC_IV', 'GENERAL_HOSPITAL', 'REGIONAL_REFERRAL', 'NATIONAL_REFERRAL',
    ];
    const validOwnerships: OwnershipType[] = ['GOVERNMENT', 'PNFP', 'PRIVATE'];

    // Build update data — only include provided fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
        return NextResponse.json({ error: 'Facility name cannot be empty' }, { status: 400 });
      }
      data.name = body.name.trim();
    }

    if (body.code !== undefined) {
      if (body.code) {
        const existingCode = await db.facility.findUnique({ where: { code: body.code } });
        if (existingCode && existingCode.id !== id) {
          return NextResponse.json({ error: 'Facility code already exists' }, { status: 409 });
        }
      }
      data.code = body.code?.trim() || null;
    }

    if (body.level !== undefined) {
      if (!validLevels.includes(body.level)) {
        return NextResponse.json({ error: 'Invalid facility level' }, { status: 400 });
      }
      data.level = body.level;
    }

    if (body.ownership !== undefined) {
      if (!validOwnerships.includes(body.ownership)) {
        return NextResponse.json({ error: 'Invalid ownership type' }, { status: 400 });
      }
      data.ownership = body.ownership;
    }

    if (body.districtId !== undefined) {
      const district = await db.district.findUnique({ where: { id: body.districtId } });
      if (!district) {
        return NextResponse.json({ error: 'District not found' }, { status: 400 });
      }
      data.districtId = body.districtId;
    }

    // Optional text fields
    const textFields = [
      'subcounty', 'parish', 'village', 'implementingPartner',
      'inChargeName', 'inChargePhone', 'inChargeEmail',
    ] as const;

    for (const field of textFields) {
      if (body[field] !== undefined) {
        data[field] = body[field]?.trim() || null;
      }
    }

    // GPS coordinates
    if (body.latitude !== undefined) {
      data.latitude = body.latitude != null ? parseFloat(body.latitude) : null;
    }
    if (body.longitude !== undefined) {
      data.longitude = body.longitude != null ? parseFloat(body.longitude) : null;
    }

    // Active status
    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    const updated = await db.facility.update({
      where: { id },
      data,
      include: {
        district: { include: { region: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[PATCH /api/facilities/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
