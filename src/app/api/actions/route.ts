import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter, canAccessDistrict } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import { actionPlanSchema } from '@/lib/validation';
import { z } from 'zod';
import type { ActionStatus, ActionPriority } from '@/types';

// ---------------------------------------------------------------------------
// GET /api/actions — list action plans with filters + pagination
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.ACTIONS_LIST);

    const { searchParams } = request.nextUrl;
    const visitId = searchParams.get('visitId');
    const status = searchParams.get('status') as ActionStatus | null;
    const priority = searchParams.get('priority') as ActionPriority | null;
    const districtId = searchParams.get('districtId');
    const assignedToId = searchParams.get('assignedToId');
    const overdue = searchParams.get('overdue');
    const sectionNumber = searchParams.get('sectionNumber');
    const search = searchParams.get('search') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    // Build scope filter for district-restricted users
    const scope = getScopeFilter(user);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      archivedAt: null,
    };

    // Scope: district-level restriction via visit -> facility
    if (scope?.districtId) {
      where.visit = { facility: { districtId: scope.districtId } };
    } else if (scope?.regionId) {
      where.visit = { facility: { district: { regionId: scope.regionId } } };
    }

    // Explicit filters
    if (visitId) {
      where.visitId = visitId;
    }

    if (status) {
      const validStatuses: ActionStatus[] = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE', 'CANCELLED'];
      if (validStatuses.includes(status)) {
        where.status = status;
      }
    }

    if (priority) {
      const validPriorities: ActionPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      if (validPriorities.includes(priority)) {
        where.priority = priority;
      }
    }

    if (districtId) {
      where.visit = {
        ...(where.visit || {}),
        facility: {
          ...(where.visit?.facility || {}),
          districtId,
        },
      };
    }

    if (assignedToId) {
      where.assignedToId = assignedToId;
    }

    if (sectionNumber) {
      const num = parseInt(sectionNumber, 10);
      if (!isNaN(num)) {
        where.sectionNumber = num;
      }
    }

    // Overdue flag: status is OPEN or IN_PROGRESS and dueDate < now
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = { in: ['OPEN', 'IN_PROGRESS'] };
    }

    if (search) {
      where.OR = [
        { actionItem: { contains: search, mode: 'insensitive' } },
        { domainTitle: { contains: search, mode: 'insensitive' } },
        { findingSummary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [actions, total] = await Promise.all([
      db.actionPlan.findMany({
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
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.actionPlan.count({ where }),
    ]);

    // Also compute KPI counts using the same scope filter (but without status/priority)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kpiWhere: any = { archivedAt: null };
    if (scope?.districtId) {
      kpiWhere.visit = { facility: { districtId: scope.districtId } };
    } else if (scope?.regionId) {
      kpiWhere.visit = { facility: { district: { regionId: scope.regionId } } };
    }

    const now = new Date();
    const [openCount, overdueCount, inProgressCount, completedCount] = await Promise.all([
      db.actionPlan.count({ where: { ...kpiWhere, status: 'OPEN' } }),
      db.actionPlan.count({
        where: {
          ...kpiWhere,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueDate: { lt: now },
        },
      }),
      db.actionPlan.count({ where: { ...kpiWhere, status: 'IN_PROGRESS' } }),
      db.actionPlan.count({ where: { ...kpiWhere, status: 'COMPLETED' } }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = actions.map((a: any) => ({
      id: a.id,
      visitId: a.visitId,
      visitNumber: a.visit.visitNumber,
      facilityName: a.visit.facility.name,
      facilityId: a.visit.facilityId,
      districtName: a.visit.facility.district.name,
      districtId: a.visit.facility.districtId,
      regionName: a.visit.facility.district.region.name,
      sectionNumber: a.sectionNumber,
      domainTitle: a.domainTitle,
      findingColor: a.findingColor,
      findingSummary: a.findingSummary,
      actionItem: a.actionItem,
      priority: a.priority,
      status: a.status,
      dueDate: a.dueDate,
      isOverdue: a.dueDate && new Date(a.dueDate) < now && ['OPEN', 'IN_PROGRESS'].includes(a.status),
      assignedTo: a.assignedTo,
      createdBy: a.createdBy,
      ownerOrg: a.ownerOrg,
      progressNotes: a.progressNotes,
      completedAt: a.completedAt,
      evidenceUrl: a.evidenceUrl,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    }));

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      kpis: {
        open: openCount,
        overdue: overdueCount,
        inProgress: inProgressCount,
        completed: completedCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/actions]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/actions — create a new action plan item
// ---------------------------------------------------------------------------

const createActionSchema = actionPlanSchema.extend({
  visitId: z
    .string({ message: 'Visit is required' })
    .min(1, 'Visit is required'),
  sectionNumber: z.number().int().optional().nullable(),
  domainTitle: z.string().optional().nullable(),
  findingColor: z.enum(['RED', 'YELLOW', 'LIGHT_GREEN', 'DARK_GREEN', 'NOT_SCORED']).optional().nullable(),
  findingSummary: z.string().max(1000, 'Finding summary cannot exceed 1000 characters').optional().nullable(),
  evidenceUrl: z.string().url('Invalid URL').optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.ACTIONS_CREATE);

    const body = await request.json();
    const parsed = createActionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;

    // Verify visit exists
    const visit = await db.visit.findUnique({
      where: { id: data.visitId },
      include: { facility: true },
    });
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 400 });
    }

    // Scope check
    if (!canAccessDistrict(user, visit.facility.districtId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify assigned user exists if provided
    if (data.assignedToId) {
      const assignee = await db.user.findUnique({ where: { id: data.assignedToId } });
      if (!assignee) {
        return NextResponse.json({ error: 'Assigned user not found' }, { status: 400 });
      }
    }

    const action = await db.actionPlan.create({
      data: {
        visitId: data.visitId,
        sectionNumber: data.sectionNumber ?? null,
        domainTitle: data.domainTitle ?? null,
        findingColor: data.findingColor ?? null,
        findingSummary: data.findingSummary ?? null,
        actionItem: data.actionItem,
        priority: data.priority,
        assignedToId: data.assignedToId ?? null,
        createdById: user.id,
        ownerOrg: data.ownerOrg ?? null,
        dueDate: data.dueDate ?? null,
        status: 'OPEN',
        progressNotes: data.progressNotes ?? null,
        evidenceUrl: data.evidenceUrl ?? null,
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
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Create audit log (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'CREATE',
      entity: 'ACTION_PLAN',
      entityId: action.id,
      after: {
        actionItem: action.actionItem,
        visitId: action.visitId,
        priority: action.priority,
        status: action.status,
        sectionNumber: action.sectionNumber,
      },
    }).catch((err) => console.error('[AUDIT] Failed to log action creation:', err));

    return NextResponse.json(action, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[POST /api/actions]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
