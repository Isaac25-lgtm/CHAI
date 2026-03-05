import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, hasPermission } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import type { AuditAction } from '@/generated/prisma/enums';

// ---------------------------------------------------------------------------
// GET /api/names-registry/[id] — single entry with visit + payment
// ---------------------------------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.NAMES_LIST);

    const { id } = await params;

    const entry = await db.namesRegistryEntry.findUnique({
      where: { id },
      include: {
        visit: {
          select: {
            id: true,
            visitNumber: true,
            visitDate: true,
            activityName: true,
            facility: {
              select: {
                id: true,
                name: true,
                level: true,
                district: {
                  select: { id: true, name: true, region: { select: { name: true } } },
                },
              },
            },
          },
        },
        paymentRecord: true,
        createdBy: { select: { id: true, name: true, email: true } },
        verifiedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    if (!entry) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    return NextResponse.json(entry);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/names-registry/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/names-registry/[id] — update entry fields
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const existing = await db.namesRegistryEntry.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
    }

    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};
    let auditAction: AuditAction = 'UPDATE';

    // Handle verification status change
    if (body.verificationStatus && body.verificationStatus !== existing.verificationStatus) {
      requirePermission(user, Permission.NAMES_VERIFY);
      updateData.verificationStatus = body.verificationStatus;
      updateData.verifiedById = user.id;
      updateData.verifiedAt = new Date();
      auditAction = 'VERIFY';
    }

    // Handle approval status change
    if (body.approvalStatus && body.approvalStatus !== existing.approvalStatus) {
      requirePermission(user, Permission.NAMES_APPROVE);
      updateData.approvalStatus = body.approvalStatus;
      updateData.approvedById = user.id;
      updateData.approvedAt = new Date();
      auditAction = body.approvalStatus === 'APPROVED' ? 'APPROVE' : body.approvalStatus === 'REJECTED' ? 'REJECT' : 'STATUS_CHANGE';
    }

    // Handle eligibility change
    if (body.eligibility && body.eligibility !== existing.eligibility) {
      // Requires at least verify permission to change eligibility
      if (!hasPermission(user, Permission.NAMES_VERIFY)) {
        requirePermission(user, Permission.NAMES_APPROVE);
      }
      updateData.eligibility = body.eligibility;
    }

    // Handle regular field updates
    const regularFields = ['fullName', 'role', 'cadre', 'teamType', 'organization', 'phone', 'network', 'notes', 'districtName', 'facilityName'] as const;
    for (const field of regularFields) {
      if (body[field] !== undefined && body[field] !== existing[field]) {
        // Regular field updates need at minimum NAMES_CREATE permission
        if (!hasPermission(user, Permission.NAMES_CREATE) && !hasPermission(user, Permission.NAMES_VERIFY)) {
          return NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 });
        }
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    const updated = await db.namesRegistryEntry.update({
      where: { id },
      data: updateData,
      include: {
        visit: { select: { visitNumber: true } },
        paymentRecord: { select: { id: true, status: true } },
        verifiedBy: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
    });

    // Build before/after for audit
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    for (const key of Object.keys(updateData)) {
      before[key] = (existing as Record<string, unknown>)[key];
      after[key] = updateData[key];
    }

    createAuditLog({
      userId: user.id,
      action: auditAction,
      entity: 'NAMES_ENTRY',
      entityId: id,
      before,
      after,
    }).catch((err) => console.error('[AUDIT] Failed to log names entry update:', err));

    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[PATCH /api/names-registry/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
