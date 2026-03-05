/**
 * CHAI PMTCT System - Audit Logs API
 *
 * GET /api/audit-logs — Paginated audit log listing with filters
 *
 * Requires audit.view permission (SUPER_ADMIN, NATIONAL_ADMIN).
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission } from '@/lib/rbac';

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.AUDIT_VIEW);

    const { searchParams } = request.nextUrl;

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)),
    );

    // Filters
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const entity = searchParams.get('entity');
    const search = searchParams.get('search') ?? '';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (dateFrom) {
      where.createdAt = {
        ...(where.createdAt || {}),
        gte: new Date(dateFrom),
      };
    }
    if (dateTo) {
      where.createdAt = {
        ...(where.createdAt || {}),
        lte: new Date(dateTo + 'T23:59:59.999Z'),
      };
    }
    if (userId) {
      where.userId = userId;
    }
    if (action) {
      // Validate against known AuditAction values
      const validActions = [
        'CREATE', 'UPDATE', 'DELETE', 'SUBMIT', 'APPROVE', 'REJECT',
        'VERIFY', 'MARK_PAID', 'RECONCILE', 'EXPORT', 'LOGIN', 'LOGOUT',
        'ROLE_CHANGE', 'STATUS_CHANGE', 'UNLOCK', 'REOPEN',
      ];
      if (validActions.includes(action)) {
        where.action = action;
      }
    }
    if (entity) {
      const validEntities = [
        'USER', 'VISIT', 'ASSESSMENT', 'RESPONSE', 'ACTION_PLAN',
        'NAMES_ENTRY', 'PAYMENT', 'FACILITY', 'EXPORT', 'SYSTEM',
      ];
      if (validEntities.includes(entity)) {
        where.entity = entity;
      }
    }
    if (search) {
      where.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { entityId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      data: logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    if (
      message === 'Unauthorized' ||
      message === 'Authentication required'
    ) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/audit-logs]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
