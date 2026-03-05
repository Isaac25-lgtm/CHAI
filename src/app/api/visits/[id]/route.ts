import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter, canAccessDistrict } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import { visitSchema, participantSchema } from '@/lib/validation';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/visits/[id] — get visit detail
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.VISITS_LIST);

    const { id } = await context.params;

    const visit = await db.visit.findUnique({
      where: { id },
      include: {
        facility: {
          include: {
            district: {
              include: { region: true },
            },
          },
        },
        participants: {
          orderBy: [{ teamType: 'asc' }, { fullName: 'asc' }],
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        assessments: {
          select: {
            id: true,
            status: true,
            completionPct: true,
            submittedAt: true,
            domainScores: {
              select: {
                sectionId: true,
                percentage: true,
                colorStatus: true,
                section: { select: { title: true, sectionNumber: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        actionPlans: {
          select: {
            id: true,
            actionItem: true,
            priority: true,
            status: true,
            dueDate: true,
            assignedTo: { select: { name: true } },
          },
          where: { archivedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        visitSummary: true,
      },
    });

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Check district access
    if (!canAccessDistrict(user, visit.facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(visit);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/visits/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/visits/[id] — update a draft visit
// ---------------------------------------------------------------------------

const updateVisitSchema = visitSchema.partial().extend({
  participants: z.array(participantSchema).optional(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.VISITS_UPDATE);

    const { id } = await context.params;

    // Fetch existing visit
    const existing = await db.visit.findUnique({
      where: { id },
      include: {
        facility: true,
        participants: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft visits can be edited' },
        { status: 400 },
      );
    }

    // Check district access
    if (!canAccessDistrict(user, existing.facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateVisitSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { participants, ...visitData } = parsed.data;

    // If facilityId changed, verify facility exists
    if (visitData.facilityId && visitData.facilityId !== existing.facilityId) {
      const facility = await db.facility.findUnique({ where: { id: visitData.facilityId } });
      if (!facility) {
        return NextResponse.json({ error: 'Facility not found' }, { status: 400 });
      }
    }

    // Update visit and replace participants in a transaction
    const visit = await db.$transaction(async (tx: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Update visit fields
      const updated = await tx.visit.update({
        where: { id },
        data: {
          ...(visitData.facilityId && { facilityId: visitData.facilityId }),
          ...(visitData.visitDate && { visitDate: visitData.visitDate }),
          ...(visitData.activityName !== undefined && { activityName: visitData.activityName ?? null }),
          ...(visitData.mentorshipCycle !== undefined && { mentorshipCycle: visitData.mentorshipCycle ?? null }),
          ...(visitData.reportingPeriod !== undefined && { reportingPeriod: visitData.reportingPeriod ?? null }),
          ...(visitData.facilityInCharge !== undefined && { facilityInCharge: visitData.facilityInCharge ?? null }),
          ...(visitData.inChargePhone !== undefined && { inChargePhone: visitData.inChargePhone ?? null }),
          ...(visitData.notes !== undefined && { notes: visitData.notes ?? null }),
        },
      });

      // Replace all participants if provided
      if (participants !== undefined) {
        await tx.visitParticipant.deleteMany({ where: { visitId: id } });

        if (participants.length > 0) {
          await tx.visitParticipant.createMany({
            data: participants.map((p) => ({
              visitId: id,
              fullName: p.fullName,
              role: p.role ?? null,
              cadre: p.cadre ?? null,
              teamType: p.teamType,
              organization: p.organization ?? null,
              phone: p.phone ?? null,
              attendanceStatus: p.attendanceStatus,
              remarks: p.remarks ?? null,
            })),
          });
        }
      }

      return tx.visit.findUnique({
        where: { id },
        include: {
          facility: {
            include: {
              district: { include: { region: true } },
            },
          },
          participants: {
            orderBy: [{ teamType: 'asc' }, { fullName: 'asc' }],
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });

    // Audit log (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'UPDATE',
      entity: 'VISIT',
      entityId: id,
      before: {
        facilityId: existing.facilityId,
        visitDate: existing.visitDate.toISOString(),
        participantCount: existing.participants.length,
      },
      after: {
        facilityId: visit?.facilityId,
        visitDate: visit?.visitDate.toISOString(),
        participantCount: visit?.participants.length,
      },
    }).catch((err) => console.error('[AUDIT] Failed to log visit update:', err));

    return NextResponse.json(visit);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[PATCH /api/visits/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/visits/[id] — soft delete (archive) a draft visit
// ---------------------------------------------------------------------------

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.VISITS_UPDATE);

    const { id } = await context.params;

    const existing = await db.visit.findUnique({
      where: { id },
      include: { facility: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft visits can be deleted' },
        { status: 400 },
      );
    }

    if (!canAccessDistrict(user, existing.facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete by archiving
    await db.visit.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    // Audit log (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'DELETE',
      entity: 'VISIT',
      entityId: id,
      before: { status: existing.status },
      after: { status: 'ARCHIVED' },
    }).catch((err) => console.error('[AUDIT] Failed to log visit deletion:', err));

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[DELETE /api/visits/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
