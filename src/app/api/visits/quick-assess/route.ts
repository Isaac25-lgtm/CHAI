import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, canAccessDistrict } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import { generateVisitNumber } from '@/lib/db/visit-number';

// ---------------------------------------------------------------------------
// POST /api/visits/quick-assess — create visit + assessment in one step
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.VISITS_CREATE);
    requirePermission(user, Permission.ASSESSMENTS_CREATE);

    const body = await request.json();
    const { facilityId } = body;

    if (!facilityId || typeof facilityId !== 'string') {
      return NextResponse.json({ error: 'facilityId is required' }, { status: 400 });
    }

    // Verify facility exists
    const facility = await db.facility.findUnique({
      where: { id: facilityId },
      include: { district: true },
    });
    if (!facility) {
      return NextResponse.json({ error: 'Facility not found' }, { status: 404 });
    }

    // Scope check
    if (!canAccessDistrict(user, facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create visit as DRAFT + assessment in a transaction
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await db.$transaction(async (tx: any) => {
      const visitNumber = await generateVisitNumber(tx);
      const now = new Date();

      const visit = await tx.visit.create({
        data: {
          visitNumber,
          facilityId,
          visitDate: now,
          activityName: 'PMTCT Mentorship Assessment',
          createdById: user.id,
          status: 'DRAFT',
        },
      });

      const assessment = await tx.assessment.create({
        data: {
          visitId: visit.id,
          submittedById: user.id,
          status: 'DRAFT',
          startedAt: now,
          completionPct: 0,
        },
      });

      return { visit, assessment };
    });

    // Audit logs (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'CREATE',
      entity: 'VISIT',
      entityId: result.visit.id,
      after: {
        visitNumber: result.visit.visitNumber,
        facilityId,
        quickAssess: true,
      },
    }).catch((err) => console.error('[AUDIT] quick-assess visit:', err));

    createAuditLog({
      userId: user.id,
      action: 'CREATE',
      entity: 'ASSESSMENT',
      entityId: result.assessment.id,
      after: {
        visitId: result.visit.id,
        visitNumber: result.visit.visitNumber,
        quickAssess: true,
      },
    }).catch((err) => console.error('[AUDIT] quick-assess assessment:', err));

    return NextResponse.json({
      visitId: result.visit.id,
      assessmentId: result.assessment.id,
      visitNumber: result.visit.visitNumber,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[POST /api/visits/quick-assess]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
