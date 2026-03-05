import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter } from '@/lib/rbac';

// ---------------------------------------------------------------------------
// GET /api/facilities/districts — all districts grouped by region
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.FACILITIES_LIST);

    const scope = getScopeFilter(user);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (scope?.districtId) {
      where.id = scope.districtId;
    } else if (scope?.regionId) {
      where.regionId = scope.regionId;
    }

    const districts = await db.district.findMany({
      where,
      include: {
        region: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Group by region
    const grouped: Record<string, {
      regionId: string;
      regionName: string;
      districts: { id: string; name: string; code: string | null }[];
    }> = {};

    for (const d of districts) {
      const regionId = d.region.id;
      if (!grouped[regionId]) {
        grouped[regionId] = {
          regionId,
          regionName: d.region.name,
          districts: [],
        };
      }
      grouped[regionId].districts.push({
        id: d.id,
        name: d.name,
        code: d.code,
      });
    }

    // Return as array of region groups sorted by region name
    const data = Object.values(grouped).sort((a, b) =>
      a.regionName.localeCompare(b.regionName)
    );

    // Also provide a flat list for simple dropdowns
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flat = districts.map((d: any) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      regionId: d.region.id,
      regionName: d.region.name,
    }));

    return NextResponse.json({ grouped: data, flat });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/facilities/districts]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
