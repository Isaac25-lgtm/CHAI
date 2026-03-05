import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, canAccessDistrict } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/visits/[id]/submit — submit a draft visit
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.VISITS_SUBMIT);

    const { id } = await context.params;

    const visit = await db.visit.findUnique({
      where: { id },
      include: {
        facility: true,
        participants: { select: { id: true } },
      },
    });

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    if (visit.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft visits can be submitted' },
        { status: 400 },
      );
    }

    if (!canAccessDistrict(user, visit.facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Validate required fields for submission
    const errors: string[] = [];

    if (!visit.facilityId) {
      errors.push('Facility is required');
    }
    if (!visit.visitDate) {
      errors.push('Visit date is required');
    }
    if (visit.participants.length === 0) {
      errors.push('At least one participant is required');
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Visit cannot be submitted', details: errors },
        { status: 400 },
      );
    }

    // Submit the visit
    const now = new Date();
    const updated = await db.visit.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: now,
      },
      include: {
        facility: {
          include: {
            district: { include: { region: true } },
          },
        },
        participants: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Audit log (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'SUBMIT',
      entity: 'VISIT',
      entityId: id,
      before: { status: 'DRAFT' },
      after: {
        status: 'SUBMITTED',
        submittedAt: now.toISOString(),
        participantCount: visit.participants.length,
      },
    }).catch((err) => console.error('[AUDIT] Failed to log visit submission:', err));

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[POST /api/visits/[id]/submit]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
