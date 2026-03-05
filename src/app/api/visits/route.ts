import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter, canAccessDistrict } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import { generateVisitNumber } from '@/lib/db/visit-number';
import { visitSchema, participantSchema } from '@/lib/validation';
import { z } from 'zod';
import type { VisitStatus } from '@/types';

// ---------------------------------------------------------------------------
// GET /api/visits — list visits with filters + pagination
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.VISITS_LIST);

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') ?? '';
    const facilityId = searchParams.get('facilityId');
    const status = searchParams.get('status') as VisitStatus | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    // Build scope filter for district-restricted users
    const scope = getScopeFilter(user);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      archivedAt: null, // Exclude soft-deleted
    };

    // Scope: district-level restriction
    if (scope?.districtId) {
      where.facility = { districtId: scope.districtId };
    } else if (scope?.regionId) {
      where.facility = { district: { regionId: scope.regionId } };
    }

    // Explicit filters
    if (facilityId) {
      where.facilityId = facilityId;
    }

    if (status) {
      const validStatuses: VisitStatus[] = ['DRAFT', 'SUBMITTED', 'REVIEWED', 'ARCHIVED'];
      if (validStatuses.includes(status)) {
        where.status = status;
      }
    }

    if (dateFrom) {
      where.visitDate = { ...(where.visitDate || {}), gte: new Date(dateFrom) };
    }
    if (dateTo) {
      where.visitDate = { ...(where.visitDate || {}), lte: new Date(dateTo + 'T23:59:59.999Z') };
    }

    if (search) {
      where.OR = [
        { visitNumber: { contains: search, mode: 'insensitive' } },
        { activityName: { contains: search, mode: 'insensitive' } },
        { facilityInCharge: { contains: search, mode: 'insensitive' } },
        { facility: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [visits, total] = await Promise.all([
      db.visit.findMany({
        where,
        include: {
          facility: {
            include: {
              district: {
                include: { region: true },
              },
            },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          participants: {
            select: { id: true, teamType: true },
          },
          assessments: {
            select: { id: true, status: true },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { visitDate: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.visit.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = visits.map((v: any) => {
      const latestAssessment = v.assessments[0] ?? null;
      return {
        id: v.id,
        visitNumber: v.visitNumber,
        facilityId: v.facilityId,
        facilityName: v.facility.name,
        districtName: v.facility.district.name,
        districtId: v.facility.districtId,
        regionName: v.facility.district.region.name,
        status: v.status,
        visitDate: v.visitDate,
        activityName: v.activityName,
        mentorshipCycle: v.mentorshipCycle,
        reportingPeriod: v.reportingPeriod,
        facilityInCharge: v.facilityInCharge,
        participantCount: v.participants.length,
        centralTeamCount: v.participants.filter((p: any) => p.teamType === 'CENTRAL').length,
        facilityTeamCount: v.participants.filter((p: any) => p.teamType === 'FACILITY').length,
        assessmentStatus: latestAssessment?.status ?? null,
        assessmentId: latestAssessment?.id ?? null,
        createdBy: v.createdBy,
        submittedAt: v.submittedAt,
        createdAt: v.createdAt,
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
    console.error('[GET /api/visits]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/visits — create a new visit with participants
// ---------------------------------------------------------------------------

const createVisitSchema = visitSchema.extend({
  participants: z.array(participantSchema).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.VISITS_CREATE);

    const body = await request.json();
    const parsed = createVisitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { participants, ...visitData } = parsed.data;

    // Verify facility exists
    const facility = await db.facility.findUnique({
      where: { id: visitData.facilityId },
      include: { district: true },
    });
    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 400 });
    }

    // Scope check: ensure user can access this facility's district
    if (!canAccessDistrict(user, facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden: you cannot create visits for this facility' }, { status: 403 });
    }

    // Create visit with participants in a transaction
    const visit = await db.$transaction(async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Generate visit number inside transaction to prevent race conditions
      const visitNumber = await generateVisitNumber(tx);

      const created = await tx.visit.create({
        data: {
          visitNumber,
          facilityId: visitData.facilityId,
          visitDate: visitData.visitDate,
          activityName: visitData.activityName ?? null,
          mentorshipCycle: visitData.mentorshipCycle ?? null,
          reportingPeriod: visitData.reportingPeriod ?? null,
          facilityInCharge: visitData.facilityInCharge ?? null,
          inChargePhone: visitData.inChargePhone ?? null,
          notes: visitData.notes ?? null,
          createdById: user.id,
          status: 'DRAFT',
          participants: {
            create: participants.map((p) => ({
              fullName: p.fullName,
              role: p.role ?? null,
              cadre: p.cadre ?? null,
              teamType: p.teamType,
              organization: p.organization ?? null,
              phone: p.phone ?? null,
              attendanceStatus: p.attendanceStatus,
              remarks: p.remarks ?? null,
            })),
          },
        },
        include: {
          facility: {
            include: {
              district: {
                include: { region: true },
              },
            },
          },
          participants: true,
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return created;
    });

    // Create audit log (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'CREATE',
      entity: 'VISIT',
      entityId: visit.id,
      after: {
        visitNumber: visit.visitNumber,
        facilityId: visit.facilityId,
        visitDate: visit.visitDate.toISOString(),
        participantCount: visit.participants.length,
      },
    }).catch((err) => console.error('[AUDIT] Failed to log visit creation:', err));

    return NextResponse.json(visit, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[POST /api/visits]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
