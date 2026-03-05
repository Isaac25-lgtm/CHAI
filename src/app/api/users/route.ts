import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import { createUserSchema } from '@/lib/validation';

// ---------------------------------------------------------------------------
// GET /api/users — List users with filters & pagination
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.USERS_LIST);

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') ?? '';
    const role = searchParams.get('role') ?? '';
    const status = searchParams.get('status') ?? '';
    const district = searchParams.get('district') ?? '';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)),
    );

    // Build where clause
    const where: Record<string, unknown> = {};

    // Apply RBAC scope filter
    const scope = getScopeFilter(user);
    if (scope?.districtId) {
      where.districtId = scope.districtId;
    } else if (scope?.regionId) {
      where.regionId = scope.regionId;
    }

    // Search by name or email
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filter by role
    if (role) {
      where.role = role;
    }

    // Filter by status
    if (status) {
      where.status = status;
    }

    // Filter by district
    if (district) {
      where.districtId = district;
    }

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
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
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.user.count({ where }),
    ]);

    return NextResponse.json({
      data: users,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/users]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/users — Create a new user
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.USERS_CREATE);

    const body = await request.json();
    const parsed = createUserSchema.parse(body);

    // Check for duplicate email
    const existing = await db.user.findUnique({
      where: { email: parsed.email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 },
      );
    }

    // Hash password
    const passwordHash = await hash(parsed.password, 12);

    // Create user
    const newUser = await db.user.create({
      data: {
        name: parsed.name,
        email: parsed.email,
        passwordHash,
        role: parsed.role,
        regionId: parsed.regionId ?? null,
        districtId: parsed.districtId ?? null,
        phone: parsed.phone ?? null,
        organization: parsed.organization ?? null,
      },
      select: {
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
      },
    });

    // Audit log
    await createAuditLog({
      userId: user.id,
      action: 'CREATE',
      entity: 'USER',
      entityId: newUser.id,
      after: {
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        districtId: newUser.districtId,
        regionId: newUser.regionId,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Zod validation error
    if (error && typeof error === 'object' && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation failed', details: (error as { issues: unknown }).issues },
        { status: 422 },
      );
    }
    console.error('[POST /api/users]', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
