import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, isSuperuser, isOwnRecord } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';

// ---------------------------------------------------------------------------
// POST /api/names-registry/import-from-visit — bulk import participants
// ---------------------------------------------------------------------------

const importSchema = z.object({
  visitId: z.string().min(1, 'Visit ID is required'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.NAMES_CREATE);

    const body = await request.json();
    const parsed = importSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { visitId } = parsed.data;

    // Fetch visit with participants and facility info
    const visit = await db.visit.findUnique({
      where: { id: visitId },
      include: {
        facility: {
          include: {
            district: true,
          },
        },
        participants: true,
      },
    });

    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 404 });
    }

    // Assessors can only import from their own visits
    if (!isSuperuser(user) && !isOwnRecord(user, visit.createdById)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (visit.participants.length === 0) {
      return NextResponse.json(
        { error: 'Visit has no participants to import', created: 0 },
        { status: 400 },
      );
    }

    // Find already-imported participant IDs to skip
    const existingEntries = await db.namesRegistryEntry.findMany({
      where: {
        visitId,
        participantId: { not: null },
      },
      select: { participantId: true },
    });
    const importedParticipantIds = new Set(existingEntries.map((e: { participantId: string | null }) => e.participantId));

    // Filter participants not yet imported
    const toImport = visit.participants.filter(
      (p: any) => !importedParticipantIds.has(p.id), // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    if (toImport.length === 0) {
      return NextResponse.json({
        message: 'All participants from this visit have already been imported',
        created: 0,
        skipped: visit.participants.length,
      });
    }

    // Bulk create names registry entries
    const createdEntries = await db.$transaction(
      toImport.map((p: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
        db.namesRegistryEntry.create({
          data: {
            visitId,
            participantId: p.id,
            fullName: p.fullName,
            role: p.role,
            cadre: p.cadre,
            teamType: p.teamType,
            organization: p.organization,
            phone: p.phone,
            districtName: visit.facility.district.name,
            facilityName: visit.facility.name,
            eligibility: 'PENDING_REVIEW',
            createdById: user.id,
          },
        }),
      ),
    );

    // Audit log (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'CREATE',
      entity: 'NAMES_ENTRY',
      entityId: visitId,
      after: {
        action: 'bulk_import_from_visit',
        visitId,
        visitNumber: visit.visitNumber,
        participantsImported: createdEntries.length,
        participantsSkipped: importedParticipantIds.size,
      },
    }).catch((err) => console.error('[AUDIT] Failed to log bulk import:', err));

    return NextResponse.json({
      message: `Successfully imported ${createdEntries.length} participant(s)`,
      created: createdEntries.length,
      skipped: importedParticipantIds.size,
      total: visit.participants.length,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[POST /api/names-registry/import-from-visit]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
