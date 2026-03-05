import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter } from '@/lib/rbac';
import type { FacilityLevel, OwnershipType } from '@/types';

// ---------------------------------------------------------------------------
// GET /api/facilities — list facilities with filters + pagination
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.FACILITIES_LIST);

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') ?? '';
    const districtId = searchParams.get('districtId');
    const level = searchParams.get('level') as FacilityLevel | null;
    const ownership = searchParams.get('ownership') as OwnershipType | null;
    const isActiveParam = searchParams.get('isActive');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    // Build scope filter for district-restricted users
    const scope = getScopeFilter(user);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    // Scope: district-level restriction
    if (scope?.districtId) {
      where.districtId = scope.districtId;
    } else if (scope?.regionId) {
      where.district = { regionId: scope.regionId };
    }

    // Explicit filters
    if (districtId) {
      where.districtId = districtId;
    }

    if (level) {
      where.level = level;
    }

    if (ownership) {
      where.ownership = ownership;
    }

    if (isActiveParam !== null) {
      where.isActive = isActiveParam === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { inChargeName: { contains: search, mode: 'insensitive' } },
        { implementingPartner: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [facilities, total] = await Promise.all([
      db.facility.findMany({
        where,
        include: {
          district: {
            include: {
              region: true,
            },
          },
          visits: {
            orderBy: { visitDate: 'desc' },
            take: 1,
            select: {
              visitDate: true,
              visitSummary: {
                select: { overallStatus: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.facility.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = facilities.map((f: any) => {
      const lastVisit = f.visits[0] ?? null;
      return {
        id: f.id,
        name: f.name,
        code: f.code,
        level: f.level,
        ownership: f.ownership,
        districtId: f.districtId,
        districtName: f.district.name,
        regionName: f.district.region.name,
        regionId: f.district.regionId,
        inChargeName: f.inChargeName,
        inChargePhone: f.inChargePhone,
        implementingPartner: f.implementingPartner,
        isActive: f.isActive,
        lastVisitDate: lastVisit?.visitDate ?? null,
        lastOverallStatus: lastVisit?.visitSummary?.overallStatus ?? null,
      };
    });

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[GET /api/facilities]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/facilities — create a new facility
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.FACILITIES_CREATE);

    const body = await request.json();

    const {
      name,
      code,
      level,
      ownership,
      districtId,
      subcounty,
      parish,
      village,
      implementingPartner,
      inChargeName,
      inChargePhone,
      inChargeEmail,
      latitude,
      longitude,
    } = body;

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Facility name is required' }, { status: 400 });
    }

    if (!level) {
      return NextResponse.json({ error: 'Facility level is required' }, { status: 400 });
    }

    const validLevels: FacilityLevel[] = [
      'HC_II', 'HC_III', 'HC_IV', 'GENERAL_HOSPITAL', 'REGIONAL_REFERRAL', 'NATIONAL_REFERRAL',
    ];
    if (!validLevels.includes(level)) {
      return NextResponse.json({ error: 'Invalid facility level' }, { status: 400 });
    }

    if (!districtId || typeof districtId !== 'string') {
      return NextResponse.json({ error: 'District is required' }, { status: 400 });
    }

    // Verify district exists
    const district = await db.district.findUnique({ where: { id: districtId } });
    if (!district) {
      return NextResponse.json({ error: 'District not found' }, { status: 400 });
    }

    // Check for duplicate code
    if (code) {
      const existingCode = await db.facility.findUnique({ where: { code } });
      if (existingCode) {
        return NextResponse.json({ error: 'Facility code already exists' }, { status: 409 });
      }
    }

    const validOwnerships: OwnershipType[] = ['GOVERNMENT', 'PNFP', 'PRIVATE'];
    const facilityOwnership = ownership && validOwnerships.includes(ownership)
      ? ownership
      : 'GOVERNMENT';

    const facility = await db.facility.create({
      data: {
        name: name.trim(),
        code: code?.trim() || null,
        level,
        ownership: facilityOwnership,
        districtId,
        subcounty: subcounty?.trim() || null,
        parish: parish?.trim() || null,
        village: village?.trim() || null,
        implementingPartner: implementingPartner?.trim() || null,
        inChargeName: inChargeName?.trim() || null,
        inChargePhone: inChargePhone?.trim() || null,
        inChargeEmail: inChargeEmail?.trim() || null,
        latitude: latitude != null ? parseFloat(latitude) : null,
        longitude: longitude != null ? parseFloat(longitude) : null,
      },
      include: {
        district: {
          include: { region: true },
        },
      },
    });

    return NextResponse.json(facility, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[POST /api/facilities]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
