import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter, canAccessDistrict } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import { z } from 'zod';

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/actions/[id] — get single action plan with full context
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.ACTIONS_LIST);

    const { id } = await context.params;

    const action = await db.actionPlan.findUnique({
      where: { id },
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
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true, organization: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!action) {
      return NextResponse.json({ error: 'Action plan not found' }, { status: 404 });
    }

    // Check district access
    const scope = getScopeFilter(user);
    if (scope?.districtId && !canAccessDistrict(user, action.visit.facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch status change history from audit logs
    const statusHistory = await db.auditLog.findMany({
      where: {
        entity: 'ACTION_PLAN',
        entityId: id,
        action: { in: ['CREATE', 'UPDATE', 'STATUS_CHANGE'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        before: true,
        after: true,
        createdAt: true,
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      ...action,
      isOverdue: action.dueDate && new Date(action.dueDate) < new Date() && ['OPEN', 'IN_PROGRESS'].includes(action.status),
      statusHistory,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/actions/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/actions/[id] — update action plan
// ---------------------------------------------------------------------------

const updateActionSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  actionItem: z.string().min(1).max(500).optional(),
  progressNotes: z.string().max(1000).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  ownerOrg: z.string().optional().nullable(),
  evidenceUrl: z.string().url('Invalid URL').optional().nullable(),
});

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.ACTIONS_UPDATE);

    const { id } = await context.params;

    // Fetch existing action
    const existing = await db.actionPlan.findUnique({
      where: { id },
      include: {
        visit: {
          include: { facility: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Action plan not found' }, { status: 404 });
    }

    // Check district access
    if (!canAccessDistrict(user, existing.visit.facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cannot update archived or cancelled actions
    if (existing.archivedAt) {
      return NextResponse.json(
        { error: 'Cannot update archived action plans' },
        { status: 400 },
      );
    }

    const body = await request.json();
    const parsed = updateActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Verify assigned user exists if provided
    if (data.assignedToId) {
      const assignee = await db.user.findUnique({ where: { id: data.assignedToId } });
      if (!assignee) {
        return NextResponse.json({ error: 'Assigned user not found' }, { status: 400 });
      }
    }

    // Build update payload
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.actionItem !== undefined) updateData.actionItem = data.actionItem;
    if (data.progressNotes !== undefined) updateData.progressNotes = data.progressNotes;
    if (data.dueDate !== undefined) updateData.dueDate = data.dueDate;
    if (data.assignedToId !== undefined) updateData.assignedToId = data.assignedToId;
    if (data.ownerOrg !== undefined) updateData.ownerOrg = data.ownerOrg;
    if (data.evidenceUrl !== undefined) updateData.evidenceUrl = data.evidenceUrl;

    // Handle status transitions
    if (data.status === 'COMPLETED' && existing.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    } else if (data.status && data.status !== 'COMPLETED' && existing.completedAt) {
      // Re-opening a completed action: clear completedAt
      updateData.completedAt = null;
    }

    const updated = await db.actionPlan.update({
      where: { id },
      data: updateData,
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
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Determine audit action type
    const auditAction = data.status && data.status !== existing.status ? 'STATUS_CHANGE' : 'UPDATE';

    // Audit log (non-blocking)
    createAuditLog({
      userId: user.id,
      action: auditAction,
      entity: 'ACTION_PLAN',
      entityId: id,
      before: {
        status: existing.status,
        priority: existing.priority,
        dueDate: existing.dueDate?.toISOString() ?? null,
        progressNotes: existing.progressNotes,
        assignedToId: existing.assignedToId,
      },
      after: {
        status: updated.status,
        priority: updated.priority,
        dueDate: updated.dueDate?.toISOString() ?? null,
        progressNotes: updated.progressNotes,
        assignedToId: updated.assignedToId,
        ...(data.status === 'COMPLETED' ? { completedAt: updated.completedAt?.toISOString() } : {}),
      },
    }).catch((err) => console.error('[AUDIT] Failed to log action update:', err));

    return NextResponse.json({
      ...updated,
      isOverdue: updated.dueDate && new Date(updated.dueDate) < new Date() && ['OPEN', 'IN_PROGRESS'].includes(updated.status),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[PATCH /api/actions/[id]]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
