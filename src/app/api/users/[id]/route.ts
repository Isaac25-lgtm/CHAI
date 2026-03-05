import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import { updateUserSchema } from '@/lib/validation';

const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  phone: true,
  title: true,
  organization: true,
  regionId: true,
  districtId: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  region: { select: { id: true, name: true } },
  district: { select: { id: true, name: true } },
} as const;

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// GET /api/users/[id] — Get single user
// ---------------------------------------------------------------------------

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const currentUser = await requireAuth();
    requirePermission(currentUser, Permission.USERS_LIST);

    const { id } = await context.params;

    const user = await db.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/users/[id]]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/users/[id] — Update user
// ---------------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const currentUser = await requireAuth();
    requirePermission(currentUser, Permission.USERS_UPDATE);

    const { id } = await context.params;
    const body = await request.json();

    // Extract status separately (not in updateUserSchema)
    const statusValue = body.status as string | undefined;
    const validStatuses = ['ACTIVE', 'INACTIVE', 'SUSPENDED'];
    if (statusValue && !validStatuses.includes(statusValue)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 422 },
      );
    }

    // Validate the rest of the payload with zod
    const parsed = updateUserSchema.parse({ ...body, id });

    // Check if the user exists
    const existingUser = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        regionId: true,
        districtId: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Role change requires elevated permission
    if (parsed.role && parsed.role !== existingUser.role) {
      requirePermission(currentUser, Permission.USERS_MANAGE_ROLES);
    }

    // Build the update data (exclude id and undefined values)
    const { id: _id, ...updateFields } = parsed;
    const updateData: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updateFields)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    // Include status in update data if provided
    if (statusValue) {
      updateData.status = statusValue;
    }

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    });

    // Audit log for role changes
    if (parsed.role && parsed.role !== existingUser.role) {
      await createAuditLog({
        userId: currentUser.id,
        action: 'ROLE_CHANGE',
        entity: 'USER',
        entityId: id,
        before: { role: existingUser.role },
        after: { role: parsed.role },
      });
    }

    // Audit log for status changes
    if (statusValue && statusValue !== existingUser.status) {
      await createAuditLog({
        userId: currentUser.id,
        action: 'STATUS_CHANGE',
        entity: 'USER',
        entityId: id,
        before: { status: existingUser.status },
        after: { status: statusValue },
      });
    }

    // General update audit log (if not already covered by role/status change)
    const isRoleChange = parsed.role && parsed.role !== existingUser.role;
    const isStatusChange = statusValue && statusValue !== existingUser.status;
    if (!isRoleChange && !isStatusChange) {
      await createAuditLog({
        userId: currentUser.id,
        action: 'UPDATE',
        entity: 'USER',
        entityId: id,
        before: {
          name: existingUser.name,
          email: existingUser.email,
          regionId: existingUser.regionId,
          districtId: existingUser.districtId,
        },
        after: updateData,
      });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation failed', details: (error as { issues: unknown }).issues },
        { status: 422 },
      );
    }
    console.error('[PATCH /api/users/[id]]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/users/[id] — Soft-delete (set status to INACTIVE)
// ---------------------------------------------------------------------------

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const currentUser = await requireAuth();
    requirePermission(currentUser, Permission.USERS_DELETE);

    const { id } = await context.params;

    // Prevent self-deletion
    if (id === currentUser.id) {
      return NextResponse.json(
        { error: 'You cannot deactivate your own account' },
        { status: 400 },
      );
    }

    const existingUser = await db.user.findUnique({
      where: { id },
      select: { id: true, status: true, name: true, email: true },
    });

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Soft-delete: set status to INACTIVE
    await db.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    // Audit log
    await createAuditLog({
      userId: currentUser.id,
      action: 'STATUS_CHANGE',
      entity: 'USER',
      entityId: id,
      before: { status: existingUser.status },
      after: { status: 'INACTIVE' },
      metadata: { reason: 'User deactivated (soft-delete)' },
    });

    return NextResponse.json({ message: 'User deactivated successfully' });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[DELETE /api/users/[id]]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
