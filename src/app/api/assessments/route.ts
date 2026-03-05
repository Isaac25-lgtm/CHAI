import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import type { AssessmentStatus } from '@/types';

// ---------------------------------------------------------------------------
// GET /api/assessments — list assessments with filters + pagination
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.ASSESSMENTS_LIST);

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') as AssessmentStatus | null;
    const visitId = searchParams.get('visitId');
    const facilityId = searchParams.get('facilityId');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    // Build scope filter for district-restricted users
    const scope = getScopeFilter(user);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      archivedAt: null,
    };

    // Scope: district-level restriction
    if (scope?.districtId) {
      where.visit = { facility: { districtId: scope.districtId } };
    } else if (scope?.regionId) {
      where.visit = { facility: { district: { regionId: scope.regionId } } };
    }

    if (visitId) {
      where.visitId = visitId;
    }

    if (facilityId) {
      where.visit = { ...where.visit, facilityId };
    }

    if (status) {
      const validStatuses: AssessmentStatus[] = ['DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'REVIEWED', 'ARCHIVED'];
      if (validStatuses.includes(status)) {
        where.status = status;
      }
    }

    if (dateFrom) {
      where.startedAt = { ...(where.startedAt || {}), gte: new Date(dateFrom) };
    }
    if (dateTo) {
      where.startedAt = { ...(where.startedAt || {}), lte: new Date(dateTo + 'T23:59:59.999Z') };
    }

    const [assessments, total] = await Promise.all([
      db.assessment.findMany({
        where,
        include: {
          visit: {
            include: {
              facility: {
                include: {
                  district: {
                    include: { region: true },
                  },
                },
              },
            },
          },
          submittedBy: {
            select: { id: true, name: true, email: true },
          },
          domainScores: {
            select: {
              sectionId: true,
              percentage: true,
              colorStatus: true,
              rawScore: true,
              maxScore: true,
              section: { select: { title: true, sectionNumber: true } },
            },
            orderBy: { section: { sectionNumber: 'asc' } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.assessment.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = assessments.map((a: any) => ({
      id: a.id,
      visitId: a.visitId,
      visitNumber: a.visit.visitNumber,
      facilityName: a.visit.facility.name,
      districtName: a.visit.facility.district.name,
      regionName: a.visit.facility.district.region.name,
      status: a.status,
      completionPct: a.completionPct,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      submittedBy: a.submittedBy,
      domainScores: a.domainScores,
    }));

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
    console.error('[GET /api/assessments]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/assessments — create a new assessment for a visit
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.ASSESSMENTS_CREATE);

    const body = await request.json();
    const { visitId } = body;

    if (!visitId || typeof visitId !== 'string') {
      return NextResponse.json(
        { error: 'visitId is required' },
        { status: 400 },
      );
    }

    // Verify visit exists and is SUBMITTED
    const visit = await db.visit.findUnique({
      where: { id: visitId },
      include: {
        facility: true,
        assessments: {
          where: { archivedAt: null },
          select: { id: true, status: true },
        },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    if (visit.status !== 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Assessments can only be created for submitted visits' },
        { status: 400 },
      );
    }

    // Check if an active assessment already exists
    const existingActive = visit.assessments.find(
      (a: { id: string; status: string }) => a.status !== 'ARCHIVED',
    );
    if (existingActive) {
      return NextResponse.json(
        { error: 'An active assessment already exists for this visit', assessmentId: existingActive.id },
        { status: 409 },
      );
    }

    // Create assessment with DRAFT status
    const assessment = await db.assessment.create({
      data: {
        visitId,
        submittedById: user.id,
        status: 'DRAFT',
        startedAt: new Date(),
        completionPct: 0,
      },
      include: {
        visit: {
          include: {
            facility: {
              include: {
                district: { include: { region: true } },
              },
            },
          },
        },
        submittedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Audit log (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'CREATE',
      entity: 'ASSESSMENT',
      entityId: assessment.id,
      after: {
        visitId,
        visitNumber: assessment.visit.visitNumber,
        facilityName: assessment.visit.facility.name,
      },
    }).catch((err) => console.error('[AUDIT] Failed to log assessment creation:', err));

    return NextResponse.json(assessment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[POST /api/assessments]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
