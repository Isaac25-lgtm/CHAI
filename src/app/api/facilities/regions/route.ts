import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission } from '@/lib/rbac';

// ---------------------------------------------------------------------------
// GET /api/facilities/regions — all regions for dropdowns
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.FACILITIES_LIST);

    const regions = await db.region.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: { districts: true },
        },
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = regions.map((r: any) => ({
      id: r.id,
      name: r.name,
      code: r.code,
      districtCount: r._count.districts,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/facilities/regions]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
