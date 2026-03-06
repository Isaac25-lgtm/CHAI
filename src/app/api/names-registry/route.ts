import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth/session';
import { requirePermission, Permission, getScopeFilter, isSuperuser, isOwnRecord } from '@/lib/rbac';
import { createAuditLog } from '@/lib/db/audit';
import { namesRegistrySchema } from '@/lib/validation';

// ---------------------------------------------------------------------------
// GET /api/names-registry — list entries with filters + pagination
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.NAMES_LIST);

    const { searchParams } = request.nextUrl;
    const search = searchParams.get('search') ?? '';
    const visitId = searchParams.get('visitId');
    const teamType = searchParams.get('teamType');
    const verificationStatus = searchParams.get('verificationStatus');
    const approvalStatus = searchParams.get('approvalStatus');
    const eligibility = searchParams.get('eligibility');
    const duplicatesOnly = searchParams.get('duplicatesOnly') === 'true';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

    // Build scope filter for district-restricted users
    const scope = getScopeFilter(user);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      archivedAt: null,
    };

    // Scope: district-level restriction via visit.facility
    if (scope?.districtId) {
      where.visit = { facility: { districtId: scope.districtId } };
    } else if (scope?.regionId) {
      where.visit = { facility: { district: { regionId: scope.regionId } } };
    }

    // Explicit filters
    if (visitId) {
      where.visitId = visitId;
    }

    if (teamType) {
      const validTeamTypes = ['CENTRAL', 'DISTRICT', 'FACILITY', 'PARTNER', 'OTHER'];
      if (validTeamTypes.includes(teamType)) {
        where.teamType = teamType;
      }
    }

    if (verificationStatus) {
      const validStatuses = ['UNVERIFIED', 'VERIFIED', 'FLAGGED', 'REJECTED'];
      if (validStatuses.includes(verificationStatus)) {
        where.verificationStatus = verificationStatus;
      }
    }

    if (approvalStatus) {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'ON_HOLD'];
      if (validStatuses.includes(approvalStatus)) {
        where.approvalStatus = approvalStatus;
      }
    }

    if (eligibility) {
      const validStatuses = ['ELIGIBLE', 'INELIGIBLE', 'PENDING_REVIEW'];
      if (validStatuses.includes(eligibility)) {
        where.eligibility = eligibility;
      }
    }

    if (duplicatesOnly) {
      where.isDuplicate = true;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [entries, total] = await Promise.all([
      db.namesRegistryEntry.findMany({
        where,
        include: {
          visit: {
            select: {
              id: true,
              visitNumber: true,
              visitDate: true,
              facility: {
                select: {
                  name: true,
                  district: { select: { name: true } },
                },
              },
            },
          },
          paymentRecord: {
            select: {
              id: true,
              status: true,
              amount: true,
              paymentCategory: true,
            },
          },
          createdBy: {
            select: { id: true, name: true },
          },
          verifiedBy: {
            select: { id: true, name: true },
          },
          approvedBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.namesRegistryEntry.count({ where }),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = entries.map((e: any) => ({
      id: e.id,
      visitId: e.visitId,
      visitNumber: e.visit.visitNumber,
      visitDate: e.visit.visitDate,
      participantId: e.participantId,
      fullName: e.fullName,
      role: e.role,
      cadre: e.cadre,
      teamType: e.teamType,
      organization: e.organization,
      districtName: e.districtName ?? e.visit.facility.district.name,
      facilityName: e.facilityName ?? e.visit.facility.name,
      phone: e.phone,
      network: e.network,
      eligibility: e.eligibility,
      verificationStatus: e.verificationStatus,
      verifiedBy: e.verifiedBy,
      verifiedAt: e.verifiedAt,
      approvalStatus: e.approvalStatus,
      approvedBy: e.approvedBy,
      approvedAt: e.approvedAt,
      notes: e.notes,
      isDuplicate: e.isDuplicate,
      duplicateOfId: e.duplicateOfId,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
      paymentRecord: e.paymentRecord,
    }));

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
    console.error('[GET /api/names-registry]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/names-registry — create a new entry
// ---------------------------------------------------------------------------

const createNamesEntrySchema = namesRegistrySchema.extend({
  visitId: z.string().min(1, 'Visit ID is required'),
  districtName: z.string().optional().nullable(),
  facilityName: z.string().optional().nullable(),
  eligibility: z.enum(['ELIGIBLE', 'INELIGIBLE', 'PENDING_REVIEW']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requirePermission(user, Permission.NAMES_CREATE);

    const body = await request.json();
    const parsed = createNamesEntrySchema.safeParse(body);

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
      include: { facility: { include: { district: true } } },
    });
    if (!visit) {
      return NextResponse.json({ error: 'Visit not found' }, { status: 400 });
    }

    // Assessors can only write to their own visits
    if (!isSuperuser(user) && !isOwnRecord(user, visit.createdById)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Duplicate check: same name+phone in same visit, and across visits
    const duplicateChecks = [];

    if (data.phone) {
      // Same name + phone in same visit
      duplicateChecks.push(
        db.namesRegistryEntry.findFirst({
          where: {
            visitId: data.visitId,
            fullName: data.fullName,
            phone: data.phone,
            archivedAt: null,
          },
          select: { id: true },
        }),
      );

      // Same name + phone across visits
      duplicateChecks.push(
        db.namesRegistryEntry.findFirst({
          where: {
            NOT: { visitId: data.visitId },
            fullName: data.fullName,
            phone: data.phone,
            archivedAt: null,
          },
          select: { id: true },
        }),
      );
    } else {
      duplicateChecks.push(Promise.resolve(null), Promise.resolve(null));
    }

    const [sameVisitDuplicate, crossVisitDuplicate] = await Promise.all(duplicateChecks);

    const isDuplicate = !!(sameVisitDuplicate || crossVisitDuplicate);
    const duplicateOfId = sameVisitDuplicate?.id ?? crossVisitDuplicate?.id ?? null;

    const entry = await db.namesRegistryEntry.create({
      data: {
        visitId: data.visitId,
        fullName: data.fullName,
        role: data.role ?? null,
        cadre: data.cadre ?? null,
        teamType: data.teamType,
        organization: data.organization ?? null,
        districtName: data.districtName ?? visit.facility.district.name,
        facilityName: data.facilityName ?? visit.facility.name,
        phone: data.phone ?? null,
        network: data.network ?? null,
        eligibility: data.eligibility ?? 'PENDING_REVIEW',
        notes: data.notes ?? null,
        isDuplicate,
        duplicateOfId,
        createdById: user.id,
      },
      include: {
        visit: { select: { visitNumber: true } },
      },
    });

    // Audit log (non-blocking)
    createAuditLog({
      userId: user.id,
      action: 'CREATE',
      entity: 'NAMES_ENTRY',
      entityId: entry.id,
      after: {
        fullName: entry.fullName,
        visitId: entry.visitId,
        phone: entry.phone,
        isDuplicate: entry.isDuplicate,
      },
    }).catch((err) => console.error('[AUDIT] Failed to log names entry creation:', err));

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    if (message === 'Unauthorized' || message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (message.startsWith('Forbidden')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    console.error('[POST /api/names-registry]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
